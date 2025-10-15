import { randomUUID } from 'crypto';
import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { EvaluationsRepository } from './evaluations.repository.js';
import {
  EvaluationRecord,
  EvaluationWriteModel,
  InterviewAssignmentModel,
  InterviewerAssignmentView,
  EvaluationCriterionScore,
  OfferRecommendationValue
} from './evaluations.types.js';
import { computeInvitationState } from './evaluationAssignments.utils.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { CandidatesService } from '../candidates/candidates.service.js';
import type { CasesService } from '../cases/cases.service.js';
import type { QuestionsService } from '../questions/questions.service.js';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const resolvePortalBaseUrl = (override?: string): string => {
  const candidates = [override, process.env.INTERVIEW_PORTAL_URL].map((value) => value?.trim()).filter(Boolean) as string[];
  for (const value of candidates) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        continue;
      }
      return parsed.toString().replace(/\/$/, '');
    } catch {
      continue;
    }
  }
  throw new Error('INVALID_PORTAL_URL');
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const buildPortalLink = (baseUrl: string, evaluationId: string, slotId: string) => {
  const url = new URL(baseUrl);
  url.searchParams.set('evaluation', evaluationId);
  url.searchParams.set('slot', slotId);
  return url.toString();
};

const buildWriteModelFromRecord = (record: EvaluationRecord): EvaluationWriteModel => ({
  id: record.id,
  candidateId: record.candidateId,
  roundNumber: record.roundNumber,
  interviewCount: record.interviewCount,
  interviews: record.interviews,
  fitQuestionId: record.fitQuestionId,
  forms: record.forms,
  processStatus: record.processStatus,
  processStartedAt: record.processStartedAt ?? null,
  roundHistory: record.roundHistory
});

const createEmptySlot = (): EvaluationRecord['interviews'][number] => ({
  id: randomUUID(),
  interviewerName: 'Interviewer',
  interviewerEmail: ''
});

const readScore = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const readCriteriaList = (value: unknown): EvaluationCriterionScore[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: EvaluationCriterionScore[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Record<string, unknown>;
    const criterionId = typeof payload.criterionId === 'string' ? payload.criterionId.trim() : '';
    if (!criterionId) {
      continue;
    }
    const scoreValue = readScore(payload.score);
    result.push({ criterionId, score: scoreValue });
  }
  return result;
};

const computeAverageFromCriteria = (criteria: EvaluationCriterionScore[]): number | undefined => {
  const numericScores = criteria
    .map((item) => (typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : null))
    .filter((value): value is number => value != null);
  if (!numericScores.length) {
    return undefined;
  }
  const sum = numericScores.reduce((total, current) => total + current, 0);
  return Math.round((sum / numericScores.length) * 10) / 10;
};

const readOfferRecommendation = (value: unknown): OfferRecommendationValue | undefined => {
  if (value === 'yes_priority' || value === 'yes_strong' || value === 'yes_keep_warm' || value === 'no_offer') {
    return value;
  }
  return undefined;
};

export class EvaluationWorkflowService {
  constructor(
    private readonly evaluations: EvaluationsRepository,
    private readonly accounts: AccountsService,
    private readonly candidates: CandidatesService,
    private readonly cases: CasesService,
    private readonly questions: QuestionsService,
    private readonly mailer = new MailerService()
  ) {}

  private async loadEvaluationWithState(id: string): Promise<EvaluationRecord> {
    const record = await this.evaluations.findEvaluation(id);
    if (!record) {
      throw new Error('NOT_FOUND');
    }
    const assignments = await this.evaluations.listAssignmentsForEvaluation(id);
    const invitationState = computeInvitationState(record, assignments);
    return { ...record, invitationState };
  }

  private buildAssignments(evaluation: EvaluationRecord): InterviewAssignmentModel[] {
    if (!evaluation.interviews.length) {
      throw new Error('INVALID_INPUT');
    }
    const assignments: InterviewAssignmentModel[] = [];
    for (const slot of evaluation.interviews) {
      const email = slot.interviewerEmail?.trim().toLowerCase() ?? '';
      const caseId = slot.caseFolderId?.trim() ?? '';
      const questionId = slot.fitQuestionId?.trim() ?? '';
      if (!email || !caseId || !questionId) {
        throw new Error('MISSING_ASSIGNMENT_DATA');
      }
      if (!this.isUuid(caseId) || !this.isUuid(questionId)) {
        throw new Error('INVALID_ASSIGNMENT_DATA');
      }
      assignments.push({
        slotId: slot.id,
        interviewerEmail: email,
        interviewerName: slot.interviewerName || 'Interviewer',
        caseFolderId: caseId,
        fitQuestionId: questionId
      });
    }
    return assignments;
  }

  private isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
  }

  private async ensureAccounts(assignments: InterviewAssignmentModel[]) {
    for (const assignment of assignments) {
      await this.accounts.ensureUserAccount(assignment.interviewerEmail);
    }
  }

  private async loadContext(assignments: InterviewAssignmentModel[], evaluation: EvaluationRecord) {
    const candidate = await this.loadCandidate(evaluation.candidateId);

    const uniqueCaseIds = Array.from(new Set(assignments.map((item) => item.caseFolderId)));
    const uniqueQuestionIds = Array.from(new Set(assignments.map((item) => item.fitQuestionId)));

    const caseMap = new Map<string, Awaited<ReturnType<CasesService['getFolder']>> | null>();
    for (const id of uniqueCaseIds) {
      const folder = await this.loadCaseFolder(id);
      caseMap.set(id, folder);
    }

    const questionMap = new Map<string, Awaited<ReturnType<QuestionsService['getQuestion']>> | null>();
    for (const id of uniqueQuestionIds) {
      const question = await this.loadFitQuestion(id);
      questionMap.set(id, question);
    }

    return { candidate, caseMap, questionMap };
  }

  private async loadCandidate(
    id: string | undefined
  ): Promise<Awaited<ReturnType<CandidatesService['getCandidate']>> | null> {
    if (!id) {
      return null;
    }
    try {
      return await this.candidates.getCandidate(id);
    } catch (error) {
      if (this.isMissingResourceError(error)) {
        console.warn('Не удалось загрузить кандидата для интервью', id, error);
        return null;
      }
      throw error;
    }
  }

  private async loadCaseFolder(
    id: string
  ): Promise<Awaited<ReturnType<CasesService['getFolder']>> | null> {
    try {
      return await this.cases.getFolder(id);
    } catch (error) {
      if (this.isMissingResourceError(error) || this.isInvalidUuidError(error)) {
        console.warn('Не удалось загрузить кейс для интервью', id, error);
        return null;
      }
      throw error;
    }
  }

  private async loadFitQuestion(
    id: string
  ): Promise<Awaited<ReturnType<QuestionsService['getQuestion']>> | null> {
    try {
      return await this.questions.getQuestion(id);
    } catch (error) {
      if (this.isMissingResourceError(error) || this.isInvalidUuidError(error)) {
        console.warn('Не удалось загрузить fit-вопрос для интервью', id, error);
        return null;
      }
      throw error;
    }
  }

  private isMissingResourceError(error: unknown): boolean {
    return error instanceof Error && (error.message === 'NOT_FOUND' || error.message === 'INVALID_INPUT');
  }

  private isInvalidUuidError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const withCode = error as { code?: unknown };
    if (withCode.code === '22P02') {
      return true;
    }
    return /invalid input syntax for type uuid/i.test(error.message);
  }

  private ensureContextResources(
    assignments: InterviewAssignmentModel[],
    context: {
      candidate: Awaited<ReturnType<CandidatesService['getCandidate']>> | null;
      caseMap: Map<string, Awaited<ReturnType<CasesService['getFolder']>> | null>;
      questionMap: Map<string, Awaited<ReturnType<QuestionsService['getQuestion']>> | null>;
    }
  ) {
    const missingCases = assignments.filter((assignment) => !context.caseMap.get(assignment.caseFolderId));
    const missingQuestions = assignments.filter((assignment) => !context.questionMap.get(assignment.fitQuestionId));
    if (missingCases.length > 0 || missingQuestions.length > 0) {
      throw new Error('INVALID_ASSIGNMENT_RESOURCES');
    }
  }

  private async deliverInvitations(
    assignments: InterviewAssignmentModel[],
    evaluation: EvaluationRecord,
    portalBaseUrl: string,
    context: {
      candidate: Awaited<ReturnType<CandidatesService['getCandidate']>> | null;
      caseMap: Map<string, Awaited<ReturnType<CasesService['getFolder']>> | null>;
      questionMap: Map<string, Awaited<ReturnType<QuestionsService['getQuestion']>> | null>;
    }
  ) {
    const candidateName = context.candidate
      ? `${context.candidate.lastName} ${context.candidate.firstName}`.trim() || context.candidate.id
      : 'candidate';

    for (const assignment of assignments) {
      const caseFolder = context.caseMap.get(assignment.caseFolderId);
      const question = context.questionMap.get(assignment.fitQuestionId);
      const link = buildPortalLink(portalBaseUrl, evaluation.id, assignment.slotId);
      await this.mailer.sendInterviewAssignment(assignment.interviewerEmail, {
        candidateName,
        interviewerName: assignment.interviewerName,
        caseTitle: caseFolder?.name ?? 'Case',
        fitQuestionTitle: question?.shortTitle ?? 'Fit question',
        link
      });
    }
  }

  async startProcess(id: string, options?: { portalBaseUrl?: string }) {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    await this.sendInvitations(trimmed, { scope: 'all', portalBaseUrl: options?.portalBaseUrl });
    return { id: trimmed };
  }

  async sendInvitations(
    id: string,
    options: { scope: 'all' | 'updated'; portalBaseUrl?: string }
  ): Promise<EvaluationRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }

    const evaluation = await this.loadEvaluationWithState(trimmed);
    const assignments = this.buildAssignments(evaluation);
    const existingAssignments = await this.evaluations.listAssignmentsForEvaluation(trimmed);

    const existingBySlot = new Map(existingAssignments.map((item) => [item.slotId, item]));
    const newSlotIds = new Set(assignments.map((assignment) => assignment.slotId));
    const changedSlotIds = new Set<string>();

    for (const assignment of assignments) {
      const existing = existingBySlot.get(assignment.slotId);
      if (!existing) {
        changedSlotIds.add(assignment.slotId);
        continue;
      }
      const sameEmail = normalizeEmail(existing.interviewerEmail) === assignment.interviewerEmail;
      const sameName = (existing.interviewerName ?? '').trim() === assignment.interviewerName.trim();
      const sameCase = (existing.caseFolderId ?? '') === assignment.caseFolderId;
      const sameQuestion = (existing.fitQuestionId ?? '') === assignment.fitQuestionId;
      if (!sameEmail || !sameName || !sameCase || !sameQuestion) {
        changedSlotIds.add(assignment.slotId);
      }
    }

    const removedSlots = existingAssignments.filter((item) => !newSlotIds.has(item.slotId));
    const structuralChange = removedSlots.length > 0;

    const scope: 'all' | 'updated' = evaluation.processStatus === 'draft' ? 'all' : options.scope;

    if (scope === 'updated' && changedSlotIds.size === 0 && !structuralChange) {
      return evaluation;
    }

    const refreshSlotIds =
      scope === 'all'
        ? assignments.map((assignment) => assignment.slotId)
        : Array.from(changedSlotIds);

    const assignmentsToSend =
      scope === 'all'
        ? assignments
        : assignments.filter((assignment) => changedSlotIds.has(assignment.slotId));

    if (assignmentsToSend.length > 0) {
      await this.ensureAccounts(assignmentsToSend);
      const context = await this.loadContext(assignmentsToSend, evaluation);
      this.ensureContextResources(assignmentsToSend, context);
      const portalBaseUrl = resolvePortalBaseUrl(options.portalBaseUrl);

      try {
        await this.deliverInvitations(assignmentsToSend, evaluation, portalBaseUrl, context);
      } catch (error) {
        if (error instanceof Error && error.message === MAILER_NOT_CONFIGURED) {
          throw new Error('MAILER_UNAVAILABLE');
        }
        throw error;
      }
    }

    try {
      await this.evaluations.storeAssignments(trimmed, assignments, {
        status: 'in-progress',
        refreshSlotIds,
        updateStartedAt: evaluation.processStatus === 'draft',
        roundNumber: evaluation.roundNumber ?? 1
      });
    } catch (error) {
      if (this.isInvalidUuidError(error)) {
        throw new Error('INVALID_ASSIGNMENT_RESOURCES');
      }
      throw error;
    }

    return this.loadEvaluationWithState(trimmed);
  }

  async advanceRound(id: string): Promise<EvaluationRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }

    const evaluation = await this.loadEvaluationWithState(trimmed);
    const allSubmitted = evaluation.forms.length > 0 && evaluation.forms.every((form) => form.submitted);
    if (!allSubmitted) {
      throw new Error('FORMS_PENDING');
    }

    const currentRound = evaluation.roundNumber ?? 1;
    const snapshotCreatedAt = evaluation.processStartedAt ?? evaluation.createdAt;
    const snapshot = {
      roundNumber: currentRound,
      interviewCount: evaluation.interviewCount,
      interviews: evaluation.interviews,
      forms: evaluation.forms,
      fitQuestionId: evaluation.fitQuestionId,
      processStatus: 'completed' as const,
      processStartedAt: evaluation.processStartedAt,
      completedAt: new Date().toISOString(),
      createdAt: snapshotCreatedAt
    };

    const filteredHistory = evaluation.roundHistory.filter((entry) => entry.roundNumber !== currentRound);

    const nextRoundNumber = currentRound + 1;
    const newSlots = [createEmptySlot()];
    const newForms = newSlots.map((slot) => ({
      slotId: slot.id,
      interviewerName: slot.interviewerName,
      submitted: false
    }));

    const writeModel = buildWriteModelFromRecord(evaluation);
    writeModel.roundNumber = nextRoundNumber;
    writeModel.interviewCount = newSlots.length;
    writeModel.interviews = newSlots;
    writeModel.forms = newForms;
    writeModel.fitQuestionId = undefined;
    writeModel.processStatus = 'draft';
    writeModel.processStartedAt = null;
    writeModel.roundHistory = [...filteredHistory, snapshot].sort((a, b) => a.roundNumber - b.roundNumber);

    const updated = await this.evaluations.updateEvaluation(writeModel, evaluation.version);
    if (updated === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!updated) {
      throw new Error('NOT_FOUND');
    }

    return this.loadEvaluationWithState(trimmed);
  }

  async listAssignmentsForInterviewer(email: string): Promise<InterviewerAssignmentView[]> {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return [];
    }
    const assignments = await this.evaluations.listAssignmentsByEmail(normalized);
    if (assignments.length === 0) {
      return [];
    }

    const evaluationMap = new Map<string, EvaluationRecord>();
    for (const assignment of assignments) {
      if (!evaluationMap.has(assignment.evaluationId)) {
        const record = await this.evaluations.findEvaluation(assignment.evaluationId);
        if (record) {
          evaluationMap.set(assignment.evaluationId, record);
        }
      }
    }

    const candidateMap = new Map<string, Awaited<ReturnType<CandidatesService['getCandidate']>> | null>();
    const caseMap = new Map<string, Awaited<ReturnType<CasesService['getFolder']>> | null>();
    const questionMap = new Map<string, Awaited<ReturnType<QuestionsService['getQuestion']>> | null>();

    for (const assignment of assignments) {
      const evaluation = evaluationMap.get(assignment.evaluationId);
      if (!evaluation) {
        continue;
      }
      if (evaluation.candidateId && !candidateMap.has(evaluation.candidateId)) {
        try {
          candidateMap.set(evaluation.candidateId, await this.candidates.getCandidate(evaluation.candidateId));
        } catch (error) {
          console.warn('Failed to load candidate', evaluation.candidateId, error);
          candidateMap.set(evaluation.candidateId, null);
        }
      }
      if (!caseMap.has(assignment.caseFolderId)) {
        try {
          caseMap.set(assignment.caseFolderId, await this.cases.getFolder(assignment.caseFolderId));
        } catch (error) {
          console.warn('Failed to load case folder', assignment.caseFolderId, error);
          caseMap.set(assignment.caseFolderId, null);
        }
      }
      if (!questionMap.has(assignment.fitQuestionId)) {
        try {
          questionMap.set(assignment.fitQuestionId, await this.questions.getQuestion(assignment.fitQuestionId));
        } catch (error) {
          console.warn('Failed to load fit question', assignment.fitQuestionId, error);
          questionMap.set(assignment.fitQuestionId, null);
        }
      }
    }

    return assignments.map((assignment) => {
      const evaluation = evaluationMap.get(assignment.evaluationId);
      const currentForm = evaluation?.forms.find((item) => item.slotId === assignment.slotId) ?? null;
      const snapshot = evaluation?.roundHistory.find(
        (entry) => entry.roundNumber === assignment.roundNumber
      );
      const historicalForm = snapshot?.forms.find((item) => item.slotId === assignment.slotId) ?? null;
      const form = currentForm ?? historicalForm;
      const candidate = evaluation?.candidateId ? candidateMap.get(evaluation.candidateId) ?? undefined : undefined;
      const processStatus =
        assignment.roundNumber === (evaluation?.roundNumber ?? assignment.roundNumber)
          ? evaluation?.processStatus ?? 'draft'
          : snapshot?.processStatus ?? 'completed';
      const evaluationUpdatedAt = snapshot?.completedAt ?? evaluation?.updatedAt ?? assignment.createdAt;
      return {
        evaluationId: assignment.evaluationId,
        slotId: assignment.slotId,
        interviewerEmail: assignment.interviewerEmail,
        interviewerName: assignment.interviewerName,
        invitationSentAt: assignment.invitationSentAt,
        roundNumber: assignment.roundNumber,
        evaluationUpdatedAt,
        evaluationProcessStatus: processStatus,
        candidate: candidate ?? undefined,
        caseFolder: caseMap.get(assignment.caseFolderId) ?? undefined,
        fitQuestion: questionMap.get(assignment.fitQuestionId) ?? undefined,
        form
      } satisfies InterviewerAssignmentView;
    });
  }

  async submitInterviewForm(
    evaluationId: string,
    slotId: string,
    email: string,
    payload: {
      submitted?: boolean;
      notes?: string;
      fitScore?: number | string;
      caseScore?: number | string;
      fitNotes?: string;
      caseNotes?: string;
      fitCriteria?: unknown;
      caseCriteria?: unknown;
      interestNotes?: string;
      issuesToTest?: string;
      offerRecommendation?: unknown;
    }
  ): Promise<EvaluationRecord> {
    const trimmedEvaluation = evaluationId.trim();
    const trimmedSlot = slotId.trim();
    if (!trimmedEvaluation || !trimmedSlot) {
      throw new Error('INVALID_INPUT');
    }
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('INVALID_INPUT');
    }
    const assignment = await this.evaluations.findAssignment(trimmedEvaluation, trimmedSlot);
    if (!assignment || normalizeEmail(assignment.interviewerEmail) !== normalizedEmail) {
      throw new Error('ACCESS_DENIED');
    }
    const evaluation = await this.evaluations.findEvaluation(trimmedEvaluation);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }

    const currentForm = evaluation.forms.find((form) => form.slotId === trimmedSlot);
    if (!currentForm) {
      throw new Error('NOT_FOUND');
    }
    if (currentForm.submitted) {
      throw new Error('FORM_ALREADY_SUBMITTED');
    }

    const submitted = payload.submitted === true;
    const submittedAt = submitted ? new Date().toISOString() : currentForm.submittedAt;
    const updatedForms = evaluation.forms.map((form) => {
      if (form.slotId !== trimmedSlot) {
        return form;
      }
      const nextFitCriteria = Array.isArray(payload.fitCriteria)
        ? readCriteriaList(payload.fitCriteria)
        : form.fitCriteria ?? [];
      const nextCaseCriteria = Array.isArray(payload.caseCriteria)
        ? readCriteriaList(payload.caseCriteria)
        : form.caseCriteria ?? [];
      const averageFitScore = computeAverageFromCriteria(nextFitCriteria);
      const averageCaseScore = computeAverageFromCriteria(nextCaseCriteria);
      const providedFitScore = readScore(payload.fitScore);
      const providedCaseScore = readScore(payload.caseScore);

      return {
        ...form,
        interviewerName: assignment.interviewerName,
        submitted,
        submittedAt,
        notes: typeof payload.notes === 'string' ? payload.notes : form.notes,
        fitScore: averageFitScore ?? providedFitScore ?? form.fitScore,
        caseScore: averageCaseScore ?? providedCaseScore ?? form.caseScore,
        fitNotes: typeof payload.fitNotes === 'string' ? payload.fitNotes : form.fitNotes,
        caseNotes: typeof payload.caseNotes === 'string' ? payload.caseNotes : form.caseNotes,
        fitCriteria: nextFitCriteria,
        caseCriteria: nextCaseCriteria,
        interestNotes:
          typeof payload.interestNotes === 'string' ? payload.interestNotes : form.interestNotes,
        issuesToTest: typeof payload.issuesToTest === 'string' ? payload.issuesToTest : form.issuesToTest,
        offerRecommendation:
          payload.offerRecommendation !== undefined
            ? readOfferRecommendation(payload.offerRecommendation) ?? form.offerRecommendation
            : form.offerRecommendation
      };
    });

    const allSubmitted = updatedForms.length > 0 && updatedForms.every((form) => form.submitted);
    const nextStatus = allSubmitted ? 'completed' : evaluation.processStatus;
    const writeModel = buildWriteModelFromRecord({
      ...evaluation,
      forms: updatedForms,
      processStatus: nextStatus
    });
    const result = await this.evaluations.updateEvaluation(writeModel, evaluation.version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }
}
