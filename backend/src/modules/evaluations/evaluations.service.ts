import { EvaluationsRepository } from './evaluations.repository.js';
import {
  EvaluationRecord,
  EvaluationWriteModel,
  InterviewSlotModel,
  InterviewStatusModel
} from './evaluations.types.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';
import { CandidatesRepository } from '../candidates/candidates.repository.js';
import { CasesRepository } from '../cases/cases.repository.js';
import { QuestionsRepository } from '../questions/questions.repository.js';
import { CandidateRecord } from '../candidates/candidates.types.js';
import { CaseFolder } from '../cases/cases.types.js';
import { FitQuestionRecord } from '../questions/questions.types.js';

export interface InterviewerAssignmentRecord {
  evaluationId: string;
  candidateId?: string;
  roundNumber?: number;
  processStatus: EvaluationRecord['processStatus'];
  processStartedAt?: string;
  updatedAt: string;
  interview: InterviewSlotModel;
  form: InterviewStatusModel;
  candidate?: CandidateRecord;
  caseFolder?: CaseFolder;
  fitQuestion?: FitQuestionRecord;
}

const readOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const readOptionalPositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const readOptionalIsoDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const readOptionalScore = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1 && value <= 5 ? value : undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) {
      return parsed;
    }
  }
  return undefined;
};

const sanitizeSlots = (value: unknown): EvaluationWriteModel['interviews'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('INVALID_INPUT');
    }
    const payload = entry as Record<string, unknown>;
    const id = readOptionalString(payload.id);
    if (!id) {
      throw new Error('INVALID_INPUT');
    }
    const interviewerName = readOptionalString(payload.interviewerName) ?? 'Interviewer';
    const interviewerEmail = readOptionalString(payload.interviewerEmail) ?? '';
    const caseFolderId = readOptionalString(payload.caseFolderId);
    const fitQuestionId = readOptionalString(payload.fitQuestionId);

    return {
      id,
      interviewerName,
      interviewerEmail,
      caseFolderId,
      fitQuestionId
    };
  });
};

const sanitizeForms = (
  value: unknown,
  allowedSlotIds: Set<string>
): EvaluationWriteModel['forms'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const forms: EvaluationWriteModel['forms'] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const payload = entry as Record<string, unknown>;
    const slotId = readOptionalString(payload.slotId);
    if (!slotId || !allowedSlotIds.has(slotId)) {
      continue;
    }
    const interviewerName = readOptionalString(payload.interviewerName) ?? 'Interviewer';
    const submitted = typeof payload.submitted === 'boolean' ? payload.submitted : false;
    const submittedAt = readOptionalIsoDate(payload.submittedAt);
    const notes = readOptionalString(payload.notes);
    const fitScore = readOptionalScore(payload.fitScore);
    const caseScore = readOptionalScore(payload.caseScore);

    forms.push({ slotId, interviewerName, submitted, submittedAt, notes, fitScore, caseScore });
  }
  return forms;
};

const ensurePositiveInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

const buildWriteModel = (payload: unknown): EvaluationWriteModel => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_INPUT');
  }

  const source = payload as Record<string, unknown>;
  const id = readOptionalString(source.id);
  if (!id) {
    throw new Error('INVALID_INPUT');
  }

  const interviews = sanitizeSlots(source.interviews);
  if (interviews.length === 0) {
    throw new Error('INVALID_INPUT');
  }

  const slotIds = new Set(interviews.map((slot) => slot.id));
  const forms = sanitizeForms(source.forms, slotIds);

  return {
    id,
    candidateId: readOptionalString(source.candidateId),
    roundNumber: readOptionalPositiveInteger(source.roundNumber),
    interviewCount: interviews.length,
    interviews,
    fitQuestionId: readOptionalString(source.fitQuestionId),
    forms
  };
};

const normalizeEmail = (value: string | undefined | null): string =>
  (value ?? '').trim().toLowerCase();

const buildDefaultForm = (slot: InterviewSlotModel): InterviewStatusModel => ({
  slotId: slot.id,
  interviewerName: slot.interviewerName || 'Interviewer',
  submitted: false
});

export class EvaluationsService {
  constructor(
    private readonly repository: EvaluationsRepository,
    private readonly accounts = new AccountsService(new AccountsRepository()),
    private readonly mailer = new MailerService(),
    private readonly candidates = new CandidatesRepository(),
    private readonly cases = new CasesRepository(),
    private readonly questions = new QuestionsRepository()
  ) {}

  private ensureForms(evaluation: EvaluationRecord): InterviewStatusModel[] {
    const existing = new Map(evaluation.forms.map((form) => [form.slotId, form]));
    const synced: InterviewStatusModel[] = [];
    for (const slot of evaluation.interviews) {
      const current = existing.get(slot.id);
      if (current) {
        synced.push({
          ...current,
          interviewerName: slot.interviewerName || current.interviewerName || 'Interviewer'
        });
      } else {
        synced.push(buildDefaultForm(slot));
      }
    }
    return synced;
  }

  private async ensureUserAccount(email: string) {
    await this.accounts.ensureUserAccount(email);
  }

  private async resolveCandidate(
    candidateId: string | undefined,
    cache: Map<string, CandidateRecord | null>
  ): Promise<CandidateRecord | undefined> {
    if (!candidateId) {
      return undefined;
    }
    if (cache.has(candidateId)) {
      return cache.get(candidateId) ?? undefined;
    }
    const record = await this.candidates.findCandidate(candidateId);
    cache.set(candidateId, record);
    return record ?? undefined;
  }

  private async resolveCase(
    caseId: string | undefined,
    cache: Map<string, CaseFolder | null>
  ): Promise<CaseFolder | undefined> {
    if (!caseId) {
      return undefined;
    }
    if (cache.has(caseId)) {
      return cache.get(caseId) ?? undefined;
    }
    const record = await this.cases.findFolderById(caseId);
    cache.set(caseId, record);
    return record ?? undefined;
  }

  private async resolveFitQuestion(
    questionId: string | undefined,
    cache: Map<string, FitQuestionRecord | null>
  ): Promise<FitQuestionRecord | undefined> {
    if (!questionId) {
      return undefined;
    }
    if (cache.has(questionId)) {
      return cache.get(questionId) ?? undefined;
    }
    const record = await this.questions.findQuestion(questionId);
    cache.set(questionId, record);
    return record ?? undefined;
  }

  private buildAssignment(
    evaluation: EvaluationRecord,
    slot: InterviewSlotModel,
    form: InterviewStatusModel,
    resources: {
      candidate?: CandidateRecord;
      caseFolder?: CaseFolder;
      fitQuestion?: FitQuestionRecord;
    }
  ): InterviewerAssignmentRecord {
    return {
      evaluationId: evaluation.id,
      candidateId: evaluation.candidateId,
      roundNumber: evaluation.roundNumber,
      processStatus: evaluation.processStatus,
      processStartedAt: evaluation.processStartedAt,
      updatedAt: evaluation.updatedAt,
      interview: slot,
      form,
      ...resources
    };
  }

  async listEvaluations(): Promise<EvaluationRecord[]> {
    return this.repository.listEvaluations();
  }

  async createEvaluation(payload: unknown): Promise<EvaluationRecord> {
    const model = buildWriteModel(payload);
    return this.repository.createEvaluation(model);
  }

  async updateEvaluation(
    id: string,
    payload: unknown,
    expectedVersion: number
  ): Promise<EvaluationRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }

    const version = ensurePositiveInteger(expectedVersion);
    if (version === null) {
      throw new Error('INVALID_INPUT');
    }

    const model = buildWriteModel(payload);
    model.id = trimmed;

    const result = await this.repository.updateEvaluation(model, version);
    if (result === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  async deleteEvaluation(id: string): Promise<string> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }
    const deleted = await this.repository.deleteEvaluation(trimmed);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
    return trimmed;
  }

  async startProcess(id: string): Promise<EvaluationRecord> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error('INVALID_INPUT');
    }

    const evaluation = await this.repository.findEvaluation(trimmed);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }

    if (evaluation.processStatus === 'active') {
      throw new Error('PROCESS_ALREADY_STARTED');
    }

    if (!evaluation.candidateId || evaluation.interviews.length === 0) {
      throw new Error('INCOMPLETE_SETUP');
    }

    const candidate = await this.candidates.findCandidate(evaluation.candidateId);
    if (!candidate) {
      throw new Error('INCOMPLETE_SETUP');
    }

    const forms = this.ensureForms(evaluation);
    const formsIndex = new Map(forms.map((form) => [form.slotId, form]));

    const caseCache = new Map<string, CaseFolder | null>();
    const questionCache = new Map<string, FitQuestionRecord | null>();

    for (const slot of evaluation.interviews) {
      const email = normalizeEmail(slot.interviewerEmail);
      const fitQuestionId = slot.fitQuestionId ?? evaluation.fitQuestionId;
      if (!slot.interviewerName.trim() || !email || !slot.caseFolderId || !fitQuestionId) {
        throw new Error('INCOMPLETE_SETUP');
      }
      const form = formsIndex.get(slot.id) ?? buildDefaultForm(slot);
      formsIndex.set(slot.id, form);
      await this.ensureUserAccount(email);

      const caseFolder = await this.resolveCase(slot.caseFolderId, caseCache);
      const fitQuestion = await this.resolveFitQuestion(fitQuestionId, questionCache);
      if (!caseFolder || !fitQuestion) {
        throw new Error('INCOMPLETE_SETUP');
      }

      const portalUrl = process.env.INTERVIEWER_PORTAL_URL?.trim();
      const separator = portalUrl && portalUrl.includes('?') ? '&' : '?';
      const assignmentLink = portalUrl
        ? `${portalUrl}${separator}evaluation=${encodeURIComponent(evaluation.id)}&slot=${encodeURIComponent(slot.id)}`
        : null;

      try {
        await this.mailer.sendInterviewAssignment(email, {
          interviewerName: slot.interviewerName,
          candidateName: `${candidate.lastName} ${candidate.firstName}`.trim() || 'Candidate',
          roundLabel: evaluation.roundNumber ? `Раунд ${evaluation.roundNumber}` : 'Интервью',
          caseTitle: caseFolder?.name ?? 'Кейс',
          fitQuestionTitle: fitQuestion?.shortTitle ?? 'Фит-вопрос',
          link: assignmentLink
        });
      } catch (error) {
        if (error instanceof Error && error.message === MAILER_NOT_CONFIGURED) {
          throw new Error('MAILER_UNAVAILABLE');
        }
        throw error;
      }
    }

    const normalizedForms = Array.from(formsIndex.values()).map((form) => ({
      slotId: form.slotId,
      interviewerName: form.interviewerName,
      submitted: false,
      submittedAt: undefined,
      notes: undefined,
      fitScore: undefined,
      caseScore: undefined
    }));

    const updated = await this.repository.markProcessStarted(evaluation.id, normalizedForms);
    if (!updated) {
      throw new Error('NOT_FOUND');
    }
    return updated;
  }

  async listAssignments(email: string): Promise<InterviewerAssignmentRecord[]> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('INVALID_INPUT');
    }

    const evaluations = await this.repository.listEvaluations();
    const candidateCache = new Map<string, CandidateRecord | null>();
    const caseCache = new Map<string, CaseFolder | null>();
    const questionCache = new Map<string, FitQuestionRecord | null>();
    const assignments: InterviewerAssignmentRecord[] = [];

    for (const evaluation of evaluations) {
      if (evaluation.processStatus === 'draft') {
        continue;
      }
      const forms = this.ensureForms(evaluation);
      const formIndex = new Map(forms.map((form) => [form.slotId, form]));

      for (const slot of evaluation.interviews) {
        const slotEmail = normalizeEmail(slot.interviewerEmail);
        if (slotEmail !== normalizedEmail) {
          continue;
        }
        const form = formIndex.get(slot.id) ?? buildDefaultForm(slot);
        const candidate = await this.resolveCandidate(evaluation.candidateId, candidateCache);
        const fitQuestion = await this.resolveFitQuestion(
          slot.fitQuestionId ?? evaluation.fitQuestionId,
          questionCache
        );
        const caseResource = slot.caseFolderId
          ? await this.resolveCase(slot.caseFolderId, caseCache)
          : undefined;

        assignments.push(
          this.buildAssignment(evaluation, slot, form, {
            candidate,
            caseFolder: caseResource,
            fitQuestion
          })
        );
      }
    }

    assignments.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return assignments;
  }

  async submitAssignment(
    email: string,
    evaluationId: string,
    slotId: string,
    payload: { fitScore?: number; caseScore?: number; notes?: string; submit?: boolean }
  ): Promise<InterviewerAssignmentRecord> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('INVALID_INPUT');
    }

    const trimmedEvaluation = evaluationId.trim();
    if (!trimmedEvaluation) {
      throw new Error('INVALID_INPUT');
    }

    const evaluation = await this.repository.findEvaluation(trimmedEvaluation);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }

    if (evaluation.processStatus === 'draft') {
      throw new Error('ACCESS_DENIED');
    }

    const forms = this.ensureForms(evaluation);
    const formIndex = new Map(forms.map((form) => [form.slotId, form]));
    const slot = evaluation.interviews.find((item) => item.id === slotId);
    if (!slot) {
      throw new Error('NOT_FOUND');
    }

    if (normalizeEmail(slot.interviewerEmail) !== normalizedEmail) {
      throw new Error('ACCESS_DENIED');
    }

    const currentForm = formIndex.get(slot.id) ?? buildDefaultForm(slot);

    const hasFitScore = Object.prototype.hasOwnProperty.call(payload, 'fitScore');
    const hasCaseScore = Object.prototype.hasOwnProperty.call(payload, 'caseScore');
    const hasNotes = Object.prototype.hasOwnProperty.call(payload, 'notes');
    const hasSubmit = Object.prototype.hasOwnProperty.call(payload, 'submit');

    const nextFitScore = hasFitScore
      ? payload.fitScore != null && payload.fitScore >= 1 && payload.fitScore <= 5
        ? payload.fitScore
        : undefined
      : currentForm.fitScore;
    const nextCaseScore = hasCaseScore
      ? payload.caseScore != null && payload.caseScore >= 1 && payload.caseScore <= 5
        ? payload.caseScore
        : undefined
      : currentForm.caseScore;
    const nextNotes = hasNotes
      ? typeof payload.notes === 'string'
        ? payload.notes.trim() || undefined
        : undefined
      : currentForm.notes;
    const shouldSubmit = hasSubmit ? Boolean(payload.submit) : currentForm.submitted;

    const nextForm: InterviewStatusModel = {
      ...currentForm,
      interviewerName: slot.interviewerName || currentForm.interviewerName,
      fitScore: nextFitScore,
      caseScore: nextCaseScore,
      notes: nextNotes,
      submitted: shouldSubmit,
      submittedAt: shouldSubmit ? currentForm.submittedAt ?? new Date().toISOString() : currentForm.submittedAt
    };

    formIndex.set(slot.id, nextForm);
    const updatedForms = Array.from(formIndex.values());
    const updatedEvaluation = await this.repository.updateForms(evaluation.id, updatedForms);
    if (!updatedEvaluation) {
      throw new Error('NOT_FOUND');
    }

    const candidateCache = new Map<string, CandidateRecord | null>();
    const caseCache = new Map<string, CaseFolder | null>();
    const questionCache = new Map<string, FitQuestionRecord | null>();

    const candidate = await this.resolveCandidate(updatedEvaluation.candidateId, candidateCache);
    const caseFolder = await this.resolveCase(slot.caseFolderId, caseCache);
    const fitQuestion = await this.resolveFitQuestion(
      slot.fitQuestionId ?? updatedEvaluation.fitQuestionId,
      questionCache
    );

    const refreshedForms = this.ensureForms(updatedEvaluation);
    const refreshedForm =
      refreshedForms.find((form) => form.slotId === slot.id) ?? buildDefaultForm(slot);

    return this.buildAssignment(updatedEvaluation, slot, refreshedForm, {
      candidate,
      caseFolder,
      fitQuestion
    });
  }
}
