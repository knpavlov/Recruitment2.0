import { apiRequest } from '../../../shared/api/httpClient';
import { InterviewAssignment } from '../../../shared/types/interviewer';
import { InterviewSlot, InterviewStatusRecord } from '../../../shared/types/evaluation';
import { CandidateProfile, CandidateResume } from '../../../shared/types/candidate';
import { CaseFolder, CaseFileRecord } from '../../../shared/types/caseLibrary';
import { FitQuestion, FitQuestionCriterion } from '../../../shared/types/fitQuestion';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const normalizeIsoString = (value: unknown): string | undefined => {
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

const normalizeSlot = (value: unknown): InterviewSlot | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewSlot> & {
    id?: unknown;
    interviewerName?: unknown;
    interviewerEmail?: unknown;
    caseFolderId?: unknown;
    fitQuestionId?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  if (!id) {
    return null;
  }

  return {
    id,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    interviewerEmail: normalizeString(payload.interviewerEmail) ?? '',
    caseFolderId: normalizeString(payload.caseFolderId)?.trim() || undefined,
    fitQuestionId: normalizeString(payload.fitQuestionId)?.trim() || undefined
  };
};

const normalizeForm = (value: unknown): InterviewStatusRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewStatusRecord> & {
    slotId?: unknown;
    interviewerName?: unknown;
    submitted?: unknown;
    submittedAt?: unknown;
    notes?: unknown;
    fitScore?: unknown;
    caseScore?: unknown;
  };

  const slotId = normalizeString(payload.slotId)?.trim();
  if (!slotId) {
    return null;
  }

  return {
    slotId,
    interviewerName: normalizeString(payload.interviewerName) ?? 'Interviewer',
    submitted: typeof payload.submitted === 'boolean' ? payload.submitted : false,
    submittedAt: normalizeIsoString(payload.submittedAt),
    notes: normalizeString(payload.notes) ?? undefined,
    fitScore: normalizeNumber(payload.fitScore),
    caseScore: normalizeNumber(payload.caseScore)
  };
};

const normalizeResume = (value: unknown): CandidateResume | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const payload = value as Partial<CandidateResume> & {
    id?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    size?: unknown;
    uploadedAt?: unknown;
    dataUrl?: unknown;
    textContent?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const fileName = normalizeString(payload.fileName)?.trim();
  const mimeType = normalizeString(payload.mimeType)?.trim();
  const size = normalizeNumber(payload.size);
  const uploadedAt = normalizeIsoString(payload.uploadedAt);
  const dataUrl = normalizeString(payload.dataUrl);

  if (!id || !fileName || !mimeType || !size || !uploadedAt || !dataUrl) {
    return undefined;
  }

  return {
    id,
    fileName,
    mimeType,
    size,
    uploadedAt,
    dataUrl,
    textContent: normalizeString(payload.textContent) ?? undefined
  };
};

const normalizeCandidate = (value: unknown): CandidateProfile | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const payload = value as Partial<CandidateProfile> & {
    id?: unknown;
    version?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const version = normalizeNumber(payload.version);
  const firstName = normalizeString(payload.firstName);
  const lastName = normalizeString(payload.lastName);
  const createdAt = normalizeIsoString(payload.createdAt);
  const updatedAt = normalizeIsoString(payload.updatedAt);

  if (!id || version === undefined || !firstName || !lastName || !createdAt || !updatedAt) {
    return undefined;
  }

  return {
    id,
    version,
    firstName,
    lastName,
    gender: normalizeString((payload as Record<string, unknown>).gender),
    age: normalizeNumber((payload as Record<string, unknown>).age),
    city: normalizeString((payload as Record<string, unknown>).city),
    desiredPosition: normalizeString((payload as Record<string, unknown>).desiredPosition),
    targetPractice: normalizeString((payload as Record<string, unknown>).targetPractice) as
      | CandidateProfile['targetPractice']
      | undefined,
    targetOffice: normalizeString((payload as Record<string, unknown>).targetOffice),
    phone: normalizeString((payload as Record<string, unknown>).phone),
    email: normalizeString((payload as Record<string, unknown>).email),
    experienceSummary: normalizeString((payload as Record<string, unknown>).experienceSummary),
    totalExperienceYears: normalizeNumber((payload as Record<string, unknown>).totalExperienceYears),
    consultingExperienceYears: normalizeNumber(
      (payload as Record<string, unknown>).consultingExperienceYears
    ),
    consultingCompanies: normalizeString((payload as Record<string, unknown>).consultingCompanies),
    lastCompany: normalizeString((payload as Record<string, unknown>).lastCompany),
    lastPosition: normalizeString((payload as Record<string, unknown>).lastPosition),
    lastDuration: normalizeString((payload as Record<string, unknown>).lastDuration),
    resume: normalizeResume((payload as Record<string, unknown>).resume),
    createdAt,
    updatedAt
  };
};

const normalizeCaseFile = (value: unknown): CaseFileRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<CaseFileRecord> & {
    id?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    size?: unknown;
    uploadedAt?: unknown;
    dataUrl?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const fileName = normalizeString(payload.fileName)?.trim();
  const mimeType = normalizeString(payload.mimeType)?.trim();
  const size = normalizeNumber(payload.size);
  const uploadedAt = normalizeIsoString(payload.uploadedAt);
  const dataUrl = normalizeString(payload.dataUrl);

  if (!id || !fileName || !mimeType || !size || !uploadedAt || !dataUrl) {
    return null;
  }

  return { id, fileName, mimeType, size, uploadedAt, dataUrl };
};

const normalizeCaseFolder = (value: unknown): CaseFolder | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const payload = value as Partial<CaseFolder> & {
    id?: unknown;
    name?: unknown;
    version?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    files?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const name = normalizeString(payload.name)?.trim();
  const version = normalizeNumber(payload.version);
  const createdAt = normalizeIsoString(payload.createdAt);
  const updatedAt = normalizeIsoString(payload.updatedAt);

  if (!id || !name || version === undefined || !createdAt || !updatedAt) {
    return undefined;
  }

  const files = Array.isArray(payload.files)
    ? payload.files.map((item) => normalizeCaseFile(item)).filter((file): file is CaseFileRecord => Boolean(file))
    : [];

  return { id, name, version, createdAt, updatedAt, files };
};

const normalizeCriterion = (value: unknown): FitQuestionCriterion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<FitQuestionCriterion> & {
    id?: unknown;
    title?: unknown;
    ratings?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const title = normalizeString(payload.title)?.trim();
  if (!id || !title) {
    return null;
  }

  const ratingsSource =
    payload.ratings && typeof payload.ratings === 'object' ? (payload.ratings as Record<string, unknown>) : {};
  const ratings: FitQuestionCriterion['ratings'] = {};
  (['1', '2', '3', '4', '5'] as const).forEach((key) => {
    const normalized = normalizeString(ratingsSource[key]);
    if (normalized) {
      ratings[Number(key) as 1 | 2 | 3 | 4 | 5] = normalized;
    }
  });

  return { id, title, ratings };
};

const normalizeFitQuestion = (value: unknown): FitQuestion | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const payload = value as Partial<FitQuestion> & {
    id?: unknown;
    shortTitle?: unknown;
    content?: unknown;
    version?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    criteria?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const shortTitle = normalizeString(payload.shortTitle)?.trim();
  const content = normalizeString(payload.content);
  const version = normalizeNumber(payload.version);
  const createdAt = normalizeIsoString(payload.createdAt);
  const updatedAt = normalizeIsoString(payload.updatedAt);

  if (!id || !shortTitle || !content || version === undefined || !createdAt || !updatedAt) {
    return undefined;
  }

  const criteria = Array.isArray(payload.criteria)
    ? payload.criteria
        .map((item) => normalizeCriterion(item))
        .filter((criterion): criterion is FitQuestionCriterion => Boolean(criterion))
    : [];

  return { id, shortTitle, content, version, createdAt, updatedAt, criteria };
};

const normalizeAssignment = (value: unknown): InterviewAssignment | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as Partial<InterviewAssignment> & {
    evaluationId?: unknown;
    candidateId?: unknown;
    roundNumber?: unknown;
    processStatus?: unknown;
    processStartedAt?: unknown;
    updatedAt?: unknown;
    interview?: unknown;
    form?: unknown;
    candidate?: unknown;
    caseFolder?: unknown;
    fitQuestion?: unknown;
  };

  const evaluationId = normalizeString(payload.evaluationId)?.trim();
  const processStatus = normalizeString(payload.processStatus) as
    | InterviewAssignment['processStatus']
    | undefined;
  const updatedAt = normalizeIsoString(payload.updatedAt);

  const interview = normalizeSlot(payload.interview);
  const form = normalizeForm(payload.form);

  if (!evaluationId || !updatedAt || !interview || !form) {
    return null;
  }

  return {
    evaluationId,
    candidateId: normalizeString(payload.candidateId)?.trim() || undefined,
    roundNumber: normalizeNumber(payload.roundNumber),
    processStatus: processStatus ?? 'draft',
    processStartedAt: normalizeIsoString(payload.processStartedAt),
    updatedAt,
    interview,
    form,
    candidate: normalizeCandidate(payload.candidate),
    caseFolder: normalizeCaseFolder(payload.caseFolder),
    fitQuestion: normalizeFitQuestion(payload.fitQuestion)
  };
};

const ensureAssignments = (value: unknown): InterviewAssignment[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeAssignment(item))
    .filter((assignment): assignment is InterviewAssignment => Boolean(assignment));
};

const ensureAssignment = (value: unknown): InterviewAssignment => {
  const assignment = normalizeAssignment(value);
  if (!assignment) {
    throw new Error('Не удалось разобрать ответ сервера.');
  }
  return assignment;
};

export const interviewerApi = {
  list: async (email: string) =>
    ensureAssignments(
      await apiRequest<unknown>(`/evaluations/assignments?email=${encodeURIComponent(email)}`)
    ),
  submit: async (
    email: string,
    evaluationId: string,
    slotId: string,
    payload: { fitScore?: number; caseScore?: number; notes?: string; submit?: boolean }
  ) =>
    ensureAssignment(
      await apiRequest<unknown>(`/evaluations/assignments/${evaluationId}/${slotId}`, {
        method: 'POST',
        body: { email, ...payload }
      })
    )
};
