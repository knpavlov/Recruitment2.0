import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { EvaluationsRepository } from './evaluations.repository.js';
import {
  EvaluationRecord,
  EvaluationWriteModel,
  InterviewAssignmentModel,
  InterviewerAssignmentView,
  OfferRecommendation
} from './evaluations.types.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { CandidatesService } from '../candidates/candidates.service.js';
import type { CasesService } from '../cases/cases.service.js';
import type { QuestionsService } from '../questions/questions.service.js';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const resolvePortalBaseUrl = (): string => {
  const raw = process.env.INTERVIEW_PORTAL_URL?.trim();
  if (!raw) {
    throw new Error('INVALID_PORTAL_URL');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('INVALID_PORTAL_URL');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  ) {
    throw new Error('INVALID_PORTAL_URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('INVALID_PORTAL_URL');
  }
  return parsed.toString().replace(/\/$/, '');
};

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
  processStatus: record.processStatus
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

const sanitizeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeCriteria = (value: unknown): Record<string, number> | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const ratings: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawKey !== 'string') {
      continue;
    }
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    const score = readScore(rawValue);
    if (typeof score === 'number') {
      ratings[key] = score;
    }
  }
  return Object.keys(ratings).length ? ratings : undefined;
};

const sanitizeRecommendation = (value: unknown): OfferRecommendation | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim() as OfferRecommendation;
  return ['yes-priority', 'yes-strong', 'yes-keep-warm', 'no'].includes(normalized)
    ? normalized
    : undefined;
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

  private async ensureAccounts(assignments: InterviewAssignmentModel[]) {
    for (const assignment of assignments) {
      await this.accounts.ensureUserAccount(assignment.interviewerEmail);
    }
  }

  private async loadContext(assignments: InterviewAssignmentModel[], evaluation: EvaluationRecord) {
    const candidate = evaluation.candidateId ? await this.candidates.getCandidate(evaluation.candidateId) : null;

    const uniqueCaseIds = Array.from(new Set(assignments.map((item) => item.caseFolderId)));
    const uniqueQuestionIds = Array.from(new Set(assignments.map((item) => item.fitQuestionId)));

    const caseMap = new Map<string, Awaited<ReturnType<CasesService['getFolder']>> | null>();
    for (const id of uniqueCaseIds) {
      caseMap.set(id, await this.cases.getFolder(id));
    }

    const questionMap = new Map<string, Awaited<ReturnType<QuestionsService['getQuestion']>> | null>();
    for (const id of uniqueQuestionIds) {
      questionMap.set(id, await this.questions.getQuestion(id));
    }

    return { candidate, caseMap, questionMap };
  }

  private async sendInvitations(
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

  async startProcess(id: string) {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const evaluation = await this.evaluations.findEvaluation(trimmed);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }
    if (evaluation.processStatus !== 'draft') {
      throw new Error('PROCESS_ALREADY_STARTED');
    }

    const assignments = this.buildAssignments(evaluation);
    await this.ensureAccounts(assignments);
    const context = await this.loadContext(assignments, evaluation);
    const portalBaseUrl = resolvePortalBaseUrl();

    try {
      await this.sendInvitations(assignments, evaluation, portalBaseUrl, context);
    } catch (error) {
      if (error instanceof Error && error.message === MAILER_NOT_CONFIGURED) {
        throw new Error('MAILER_UNAVAILABLE');
      }
      throw error;
    }

    await this.evaluations.replaceAssignments(trimmed, assignments, 'in-progress');
    return { id: trimmed };
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
      const form = evaluation?.forms.find((item) => item.slotId === assignment.slotId) ?? null;
      const candidate = evaluation?.candidateId ? candidateMap.get(evaluation.candidateId) ?? undefined : undefined;
      return {
        evaluationId: assignment.evaluationId,
        slotId: assignment.slotId,
        interviewerEmail: assignment.interviewerEmail,
        interviewerName: assignment.interviewerName,
        invitationSentAt: assignment.invitationSentAt,
        evaluationUpdatedAt: evaluation?.updatedAt ?? assignment.createdAt,
        evaluationProcessStatus: evaluation?.processStatus ?? 'draft',
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
      fitCriteria?: Record<string, unknown>;
      caseCriteria?: Record<string, unknown>;
      interestLevel?: string;
      issuesToTest?: string;
      summary?: string;
      offerRecommendation?: string;
      offerRecommendationNotes?: string;
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

    const payloadRecord = payload as Record<string, unknown>;
    const has = (key: string) => Object.prototype.hasOwnProperty.call(payloadRecord, key);

    const submitted = payload.submitted === true;
    const submittedAt = submitted ? new Date().toISOString() : currentForm.submittedAt;
    const updatedForms = evaluation.forms.map((form) => {
      if (form.slotId !== trimmedSlot) {
        return form;
      }
      return {
        ...form,
        interviewerName: assignment.interviewerName,
        submitted,
        submittedAt,
        notes: has('notes') ? (typeof payload.notes === 'string' ? payload.notes : undefined) : form.notes,
        fitScore: has('fitScore') ? readScore(payload.fitScore) : form.fitScore,
        caseScore: has('caseScore') ? readScore(payload.caseScore) : form.caseScore,
        fitNotes: has('fitNotes') ? (typeof payload.fitNotes === 'string' ? payload.fitNotes : undefined) : form.fitNotes,
        caseNotes: has('caseNotes') ? (typeof payload.caseNotes === 'string' ? payload.caseNotes : undefined) : form.caseNotes,
        fitCriteria: has('fitCriteria') ? sanitizeCriteria(payload.fitCriteria) : form.fitCriteria,
        caseCriteria: has('caseCriteria') ? sanitizeCriteria(payload.caseCriteria) : form.caseCriteria,
        interestLevel: has('interestLevel') ? sanitizeText(payload.interestLevel) : form.interestLevel,
        issuesToTest: has('issuesToTest') ? sanitizeText(payload.issuesToTest) : form.issuesToTest,
        summary: has('summary') ? sanitizeText(payload.summary) : form.summary,
        offerRecommendation: has('offerRecommendation')
          ? sanitizeRecommendation(payload.offerRecommendation)
          : form.offerRecommendation,
        offerRecommendationNotes: has('offerRecommendationNotes')
          ? sanitizeText(payload.offerRecommendationNotes)
          : form.offerRecommendationNotes
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
