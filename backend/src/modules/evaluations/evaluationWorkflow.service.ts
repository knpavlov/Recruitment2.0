import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { EvaluationsRepository } from './evaluations.repository.js';
import {
  EvaluationRecord,
  EvaluationWriteModel,
  InterviewAssignmentModel,
  InterviewerAssignmentView
} from './evaluations.types.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { CandidatesService } from '../candidates/candidates.service.js';
import type { CasesService } from '../cases/cases.service.js';
import type { QuestionsService } from '../questions/questions.service.js';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const readPortalBaseUrl = (): URL => {
  const raw = process.env.INTERVIEW_PORTAL_URL?.trim();
  if (!raw) {
    throw new Error('PORTAL_URL_MISSING');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('PORTAL_URL_INVALID');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('127.') ||
    parsed.protocol !== 'https:'
  ) {
    throw new Error('PORTAL_URL_INVALID');
  }

  return parsed;
};

const resolvePortalLink = (baseUrl: URL, evaluationId: string, slotId: string, email: string) => {
  const url = new URL(baseUrl.toString());
  url.searchParams.set('evaluation', evaluationId);
  url.searchParams.set('slot', slotId);
  url.searchParams.set('email', email);
  return url.toString();
};

const buildWriteModelFromRecord = (record: EvaluationRecord): EvaluationWriteModel => ({
  id: record.id,
  candidateId: record.candidateId,
  roundNumber: record.roundNumber,
  interviewCount: record.interviewCount,
  interviews: record.interviews,
  fitQuestionId: record.fitQuestionId,
  forms: record.forms
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
    baseUrl: URL,
    assignments: InterviewAssignmentModel[],
    evaluation: EvaluationRecord,
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
      const link = resolvePortalLink(baseUrl, evaluation.id, assignment.slotId, assignment.interviewerEmail);
      await this.mailer.sendInterviewAssignment(assignment.interviewerEmail, {
        candidateName,
        interviewerName: assignment.interviewerName,
        caseTitle: caseFolder?.name ?? 'Case',
        fitQuestionTitle: question?.shortTitle ?? 'Fit question',
        link
      });
    }
  }

  private async ensureFormPlaceholders(evaluation: EvaluationRecord): Promise<EvaluationRecord> {
    const updatedForms = evaluation.interviews.map((slot) => {
      const existing = evaluation.forms.find((form) => form.slotId === slot.id);
      if (existing) {
        if (existing.interviewerName !== slot.interviewerName) {
          return { ...existing, interviewerName: slot.interviewerName };
        }
        return existing;
      }
      return {
        slotId: slot.id,
        interviewerName: slot.interviewerName,
        submitted: false
      } satisfies EvaluationRecord['forms'][number];
    });

    const hasDifferences =
      updatedForms.length !== evaluation.forms.length ||
      updatedForms.some((form, index) => {
        const original = evaluation.forms[index];
        return !original || original.slotId !== form.slotId || original.interviewerName !== form.interviewerName;
      });

    if (!hasDifferences) {
      return evaluation;
    }

    const writeModel = buildWriteModelFromRecord({ ...evaluation, forms: updatedForms });
    const result = await this.evaluations.updateEvaluation(writeModel, evaluation.version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  async startProcess(id: string) {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    let evaluation = await this.evaluations.findEvaluation(trimmed);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }
    if (evaluation.processStatus !== 'draft') {
      throw new Error('PROCESS_ALREADY_STARTED');
    }

    const assignments = this.buildAssignments(evaluation);
    await this.ensureAccounts(assignments);
    const context = await this.loadContext(assignments, evaluation);
    evaluation = await this.ensureFormPlaceholders(evaluation);

    const portalBaseUrl = readPortalBaseUrl();

    try {
      await this.sendInvitations(portalBaseUrl, assignments, evaluation, context);
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

    const formsBySlot = new Map<string, EvaluationRecord['forms'][number]>();
    for (const form of evaluation.forms) {
      formsBySlot.set(form.slotId, form);
    }

    const existing = formsBySlot.get(trimmedSlot);

    if (existing?.submitted) {
      throw new Error('FORM_ALREADY_SUBMITTED');
    }

    const nextSubmitted = typeof payload.submitted === 'boolean' ? payload.submitted : false;

    const nextForm: EvaluationRecord['forms'][number] = {
      slotId: trimmedSlot,
      interviewerName: assignment.interviewerName,
      submitted: nextSubmitted,
      submittedAt:
        nextSubmitted
          ? existing?.submittedAt ?? new Date().toISOString()
          : existing?.submittedAt,
      notes: typeof payload.notes === 'string' ? payload.notes : existing?.notes,
      fitScore: readScore(payload.fitScore) ?? existing?.fitScore,
      caseScore: readScore(payload.caseScore) ?? existing?.caseScore,
      fitNotes: typeof payload.fitNotes === 'string' ? payload.fitNotes : existing?.fitNotes,
      caseNotes: typeof payload.caseNotes === 'string' ? payload.caseNotes : existing?.caseNotes
    };

    formsBySlot.set(trimmedSlot, nextForm);

    const updatedForms = evaluation.interviews
      .map((slot) => formsBySlot.get(slot.id) ?? {
        slotId: slot.id,
        interviewerName: slot.interviewerName,
        submitted: false
      })
      .concat(
        Array.from(formsBySlot.entries())
          .filter(([slot]) => !evaluation.interviews.some((item) => item.id === slot))
          .map(([, form]) => form)
      );

    const writeModel = buildWriteModelFromRecord({ ...evaluation, forms: updatedForms });
    const result = await this.evaluations.updateEvaluation(writeModel, evaluation.version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    const allSubmitted = result.interviews.every((slot) =>
      result.forms.some((form) => form.slotId === slot.id && form.submitted)
    );

    if (allSubmitted && result.processStatus !== 'completed') {
      const completed = await this.evaluations.updateProcessStatus(result.id, 'completed');
      if (completed) {
        return completed;
      }
    }

    return result;
  }
}
