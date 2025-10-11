import { EvaluationsRepository } from './evaluations.repository.js';
import {
  EvaluationRecord,
  EvaluationStatus,
  EvaluationWriteModel,
  InterviewStatusModel
} from './evaluations.types.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { CandidatesService } from '../candidates/candidates.service.js';
import { CasesService } from '../cases/cases.service.js';
import { QuestionsService } from '../questions/questions.service.js';
import { CandidateRecord } from '../candidates/candidates.types.js';
import { CaseFolder } from '../cases/cases.types.js';
import { FitQuestionRecord } from '../questions/questions.types.js';
import { MailerService, MAILER_NOT_CONFIGURED } from '../../shared/mailer.service.js';

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

const readOptionalStatus = (value: unknown): EvaluationStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  if (value === 'draft' || value === 'in-progress' || value === 'completed') {
    return value;
  }
  return undefined;
};

const readOptionalScore = (value: unknown): number | undefined => {
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
    const interviewerEmail = readOptionalString(payload.interviewerEmail) ?? '';
    const submitted = typeof payload.submitted === 'boolean' ? payload.submitted : false;
    const submittedAt = readOptionalIsoDate(payload.submittedAt);
    const fitScore = readOptionalScore(payload.fitScore);
    const caseScore = readOptionalScore(payload.caseScore);
    const notes = readOptionalString(payload.notes);

    forms.push({ slotId, interviewerName, interviewerEmail, submitted, submittedAt, fitScore, caseScore, notes });
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
    status: readOptionalStatus(source.status) ?? 'draft',
    processStartedAt: readOptionalIsoDate(source.processStartedAt),
    forms
  };
};

const toWriteModel = (record: EvaluationRecord): EvaluationWriteModel => ({
  id: record.id,
  candidateId: record.candidateId,
  roundNumber: record.roundNumber,
  interviewCount: record.interviewCount,
  interviews: record.interviews,
  fitQuestionId: record.fitQuestionId,
  status: record.status,
  processStartedAt: record.processStartedAt,
  forms: record.forms
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const resolvePortalUrl = () => {
  const configured = process.env.INTERVIEW_PORTAL_URL?.trim();
  if (configured) {
    return configured;
  }
  const fallbackHost = process.env.APP_BASE_URL?.trim() || 'http://localhost:5173';
  return `${fallbackHost.replace(/\/?$/, '')}/interviewer`;
};

const isValidEmail = (email: string) => /.+@.+\..+/.test(email);

export interface InterviewerAssignment {
  evaluationId: string;
  slotId: string;
  interviewerName: string;
  interviewerEmail: string;
  evaluationStatus: EvaluationStatus;
  evaluationVersion: number;
  roundNumber?: number;
  processStartedAt?: string;
  candidate: CandidateRecord;
  caseFolder?: CaseFolder;
  fitQuestion?: FitQuestionRecord;
  form: InterviewStatusModel;
}

export class EvaluationsService {
  constructor(
    private readonly repository: EvaluationsRepository,
    private readonly accountsService: AccountsService,
    private readonly candidatesService: CandidatesService,
    private readonly casesService: CasesService,
    private readonly questionsService: QuestionsService,
    private readonly mailer = new MailerService()
  ) {}

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

  async startEvaluationProcess(id: string, expectedVersion: number): Promise<EvaluationRecord> {
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('INVALID_INPUT');
    }
    const version = ensurePositiveInteger(expectedVersion);
    if (version === null) {
      throw new Error('INVALID_INPUT');
    }

    const evaluation = await this.repository.findEvaluation(trimmedId);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }
    if (!evaluation.candidateId) {
      throw new Error('INVALID_SETUP');
    }
    if (evaluation.status !== 'draft') {
      throw new Error('ALREADY_STARTED');
    }

    const missingSlots = evaluation.interviews.filter((slot) => {
      const hasEmail = slot.interviewerEmail && isValidEmail(slot.interviewerEmail);
      const hasCase = Boolean(slot.caseFolderId);
      const hasQuestion = Boolean(slot.fitQuestionId);
      return !hasEmail || !hasCase || !hasQuestion;
    });
    if (missingSlots.length > 0) {
      throw new Error('INVALID_SETUP');
    }

    const preparedForms: InterviewStatusModel[] = evaluation.interviews.map((slot) => {
      const existing = evaluation.forms.find((form) => form.slotId === slot.id);
      return {
        slotId: slot.id,
        interviewerName: slot.interviewerName,
        interviewerEmail: slot.interviewerEmail,
        submitted: existing?.submitted ?? false,
        submittedAt: existing?.submittedAt,
        fitScore: existing?.fitScore,
        caseScore: existing?.caseScore,
        notes: existing?.notes
      } satisfies InterviewStatusModel;
    });

    const startedAt = new Date().toISOString();
    const writeModel: EvaluationWriteModel = {
      ...toWriteModel(evaluation),
      interviewCount: evaluation.interviews.length,
      status: 'in-progress',
      processStartedAt: startedAt,
      forms: preparedForms
    };

    const updateResult = await this.repository.updateEvaluation(writeModel, version);
    if (updateResult === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!updateResult) {
      throw new Error('NOT_FOUND');
    }

    const uniqueEmails = new Set(
      preparedForms
        .map((form) => form.interviewerEmail)
        .filter((email): email is string => Boolean(email))
        .map((email) => normalizeEmail(email))
    );

    for (const email of uniqueEmails) {
      await this.accountsService.ensureAccount(email);
    }

    const candidate = await this.candidatesService.getCandidate(evaluation.candidateId);
    const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim() || candidate.firstName;
    const portalUrl = resolvePortalUrl();

    for (const slot of evaluation.interviews) {
      const email = normalizeEmail(slot.interviewerEmail);
      try {
        await this.mailer.sendInterviewAssignment(email, {
          candidateName,
          roundNumber: evaluation.roundNumber ?? undefined,
          interviewerName: slot.interviewerName,
          portalUrl
        });
      } catch (error) {
        if (error instanceof Error && error.message === MAILER_NOT_CONFIGURED) {
          // Почтовая служба отключена — просто продолжаем, чтобы не прерывать процесс.
          continue;
        }
        throw error;
      }
    }

    return updateResult;
  }

  async listInterviewerAssignments(email: string): Promise<InterviewerAssignment[]> {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return [];
    }
    const evaluations = await this.repository.listEvaluations();
    const relevant = evaluations.filter((evaluation) =>
      evaluation.interviews.some((slot) => normalizeEmail(slot.interviewerEmail) === normalized)
    );
    if (!relevant.length) {
      return [];
    }

    const candidateCache = new Map<string, CandidateRecord>();
    const caseCache = new Map<string, CaseFolder | undefined>();
    const questionCache = new Map<string, FitQuestionRecord | undefined>();

    const assignments: InterviewerAssignment[] = [];
    for (const evaluation of relevant) {
      if (!evaluation.candidateId) {
        continue;
      }
      let candidate = candidateCache.get(evaluation.candidateId);
      if (!candidate) {
        try {
          candidate = await this.candidatesService.getCandidate(evaluation.candidateId);
          candidateCache.set(evaluation.candidateId, candidate);
        } catch (error) {
          continue;
        }
      }
      for (const slot of evaluation.interviews) {
        if (normalizeEmail(slot.interviewerEmail) !== normalized) {
          continue;
        }
        let caseFolder: CaseFolder | undefined = undefined;
        if (slot.caseFolderId) {
          if (caseCache.has(slot.caseFolderId)) {
            caseFolder = caseCache.get(slot.caseFolderId);
          } else {
            try {
              caseFolder = await this.casesService.getFolder(slot.caseFolderId);
            } catch (error) {
              caseFolder = undefined;
            }
            caseCache.set(slot.caseFolderId, caseFolder);
          }
        }
        let fitQuestion: FitQuestionRecord | undefined = undefined;
        if (slot.fitQuestionId) {
          if (questionCache.has(slot.fitQuestionId)) {
            fitQuestion = questionCache.get(slot.fitQuestionId);
          } else {
            try {
              fitQuestion = await this.questionsService.getQuestion(slot.fitQuestionId);
            } catch (error) {
              fitQuestion = undefined;
            }
            questionCache.set(slot.fitQuestionId, fitQuestion);
          }
        }
        const form =
          evaluation.forms.find((item) => item.slotId === slot.id) ??
          ({
            slotId: slot.id,
            interviewerName: slot.interviewerName,
            interviewerEmail: slot.interviewerEmail,
            submitted: false
          } as InterviewStatusModel);
        assignments.push({
          evaluationId: evaluation.id,
          slotId: slot.id,
          interviewerName: slot.interviewerName,
          interviewerEmail: slot.interviewerEmail,
          evaluationStatus: evaluation.status,
          evaluationVersion: evaluation.version,
          roundNumber: evaluation.roundNumber ?? undefined,
          processStartedAt: evaluation.processStartedAt,
          candidate,
          caseFolder,
          fitQuestion,
          form
        });
      }
    }

    assignments.sort((a, b) => {
      const dateA = a.processStartedAt ? Date.parse(a.processStartedAt) : 0;
      const dateB = b.processStartedAt ? Date.parse(b.processStartedAt) : 0;
      return dateB - dateA;
    });

    return assignments;
  }

  async submitInterviewerForm(
    evaluationId: string,
    slotId: string,
    email: string,
    payload: unknown,
    expectedVersion: number
  ): Promise<EvaluationRecord> {
    const trimmedEvaluationId = evaluationId.trim();
    const trimmedSlotId = slotId.trim();
    if (!trimmedEvaluationId || !trimmedSlotId) {
      throw new Error('INVALID_INPUT');
    }
    const version = ensurePositiveInteger(expectedVersion);
    if (version === null) {
      throw new Error('INVALID_INPUT');
    }
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('INVALID_INPUT');
    }

    const evaluation = await this.repository.findEvaluation(trimmedEvaluationId);
    if (!evaluation) {
      throw new Error('NOT_FOUND');
    }

    const slot = evaluation.interviews.find(
      (item) => item.id === trimmedSlotId && normalizeEmail(item.interviewerEmail) === normalizedEmail
    );
    if (!slot) {
      throw new Error('NOT_FOUND');
    }

    if (evaluation.status === 'draft') {
      throw new Error('PROCESS_NOT_STARTED');
    }

    const formPayload = (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const fitScore = readOptionalScore(formPayload.fitScore);
    const caseScore = readOptionalScore(formPayload.caseScore);
    const notes = readOptionalString(formPayload.notes);
    const submittedFlag = typeof formPayload.submitted === 'boolean' ? formPayload.submitted : false;

    const currentForms = evaluation.forms.length ? [...evaluation.forms] : evaluation.interviews.map((item) => ({
        slotId: item.id,
        interviewerName: item.interviewerName,
        interviewerEmail: item.interviewerEmail,
        submitted: false
      } as InterviewStatusModel));

    const targetIndex = currentForms.findIndex((item) => item.slotId === trimmedSlotId);
    if (targetIndex === -1) {
      currentForms.push({
        slotId: trimmedSlotId,
        interviewerName: slot.interviewerName,
        interviewerEmail: slot.interviewerEmail,
        submitted: submittedFlag,
        submittedAt: submittedFlag ? new Date().toISOString() : undefined,
        fitScore,
        caseScore,
        notes
      });
    } else {
      const existing = currentForms[targetIndex];
      const shouldSubmit = submittedFlag || existing.submitted;
      currentForms[targetIndex] = {
        slotId: trimmedSlotId,
        interviewerName: slot.interviewerName,
        interviewerEmail: slot.interviewerEmail,
        submitted: shouldSubmit,
        submittedAt: shouldSubmit ? existing.submittedAt ?? new Date().toISOString() : undefined,
        fitScore: fitScore ?? existing.fitScore,
        caseScore: caseScore ?? existing.caseScore,
        notes: notes ?? existing.notes
      } satisfies InterviewStatusModel;
    }

    const allSubmitted = currentForms.every((form) => form.submitted);
    const writeModel: EvaluationWriteModel = {
      ...toWriteModel(evaluation),
      interviewCount: evaluation.interviews.length,
      status: allSubmitted ? 'completed' : evaluation.status,
      forms: currentForms
    };

    const updateResult = await this.repository.updateEvaluation(writeModel, version);
    if (updateResult === 'version-conflict') {
      throw new Error('VERSION_CONFLICT');
    }
    if (!updateResult) {
      throw new Error('NOT_FOUND');
    }
    return updateResult;
  }
}
