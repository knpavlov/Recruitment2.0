import { apiRequest } from '../../../shared/api/httpClient';
import { CandidateProfile, CandidateResume } from '../../../shared/types/candidate';

type CandidatePayload = Partial<CandidateProfile> & {
  id?: unknown;
  version?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  gender?: unknown;
  age?: unknown;
  city?: unknown;
  desiredPosition?: unknown;
  phone?: unknown;
  email?: unknown;
  experienceSummary?: unknown;
  totalExperienceYears?: unknown;
  consultingExperienceYears?: unknown;
  consultingCompanies?: unknown;
  lastCompany?: unknown;
  lastPosition?: unknown;
  lastDuration?: unknown;
  resume?: unknown;
};

type CandidateResumePayload = Partial<CandidateResume> & {
  id?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  size?: unknown;
  dataUrl?: unknown;
  uploadedAt?: unknown;
  textContent?: unknown;
};

const normalizeIso = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  return null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeResume = (payload: unknown): CandidateResume | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as CandidateResumePayload;
  const fileName = typeof record.fileName === 'string' && record.fileName.trim() ? record.fileName : null;
  const dataUrl = typeof record.dataUrl === 'string' && record.dataUrl.trim() ? record.dataUrl : null;

  if (!fileName || !dataUrl) {
    return undefined;
  }

  const uploadedAt = normalizeIso(record.uploadedAt);
  const size = normalizeNumber(record.size) ?? 0;

  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id : fileName,
    fileName,
    mimeType: typeof record.mimeType === 'string' && record.mimeType.trim() ? record.mimeType : 'application/octet-stream',
    size,
    dataUrl,
    uploadedAt: uploadedAt ?? new Date().toISOString(),
    textContent: typeof record.textContent === 'string' ? record.textContent : undefined
  };
};

const normalizeCandidate = (payload: unknown): CandidateProfile | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as CandidatePayload;
  const id = typeof record.id === 'string' && record.id.trim() ? record.id : null;
  const firstName = typeof record.firstName === 'string' ? record.firstName : null;
  const lastName = typeof record.lastName === 'string' ? record.lastName : null;
  const version = normalizeNumber(record.version);
  const createdAt = normalizeIso(record.createdAt);
  const updatedAt = normalizeIso(record.updatedAt);

  if (!id || !firstName || !lastName || version === null || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    version,
    firstName,
    lastName,
    gender: typeof record.gender === 'string' ? record.gender : undefined,
    age: normalizeNumber(record.age) ?? undefined,
    city: typeof record.city === 'string' ? record.city : undefined,
    desiredPosition: typeof record.desiredPosition === 'string' ? record.desiredPosition : undefined,
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
    experienceSummary: typeof record.experienceSummary === 'string' ? record.experienceSummary : undefined,
    totalExperienceYears: normalizeNumber(record.totalExperienceYears) ?? undefined,
    consultingExperienceYears: normalizeNumber(record.consultingExperienceYears) ?? undefined,
    consultingCompanies: typeof record.consultingCompanies === 'string' ? record.consultingCompanies : undefined,
    lastCompany: typeof record.lastCompany === 'string' ? record.lastCompany : undefined,
    lastPosition: typeof record.lastPosition === 'string' ? record.lastPosition : undefined,
    lastDuration: typeof record.lastDuration === 'string' ? record.lastDuration : undefined,
    resume: normalizeResume(record.resume),
    createdAt,
    updatedAt
  };
};

const ensureCandidateList = (value: unknown): CandidateProfile[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeCandidate(item))
    .filter((candidate): candidate is CandidateProfile => Boolean(candidate));
};

const ensureCandidate = (value: unknown): CandidateProfile => {
  const candidate = normalizeCandidate(value);
  if (!candidate) {
    throw new Error('Failed to parse the candidate payload.');
  }
  return candidate;
};

const serializeNumber = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const serializeResume = (resume: CandidateResume | undefined) => {
  if (!resume) {
    return null;
  }
  return {
    id: resume.id,
    fileName: resume.fileName,
    mimeType: resume.mimeType,
    size: serializeNumber(resume.size) ?? 0,
    dataUrl: resume.dataUrl,
    uploadedAt: resume.uploadedAt,
    textContent: resume.textContent
  };
};

const serializeProfile = (profile: CandidateProfile) => ({
  id: profile.id,
  firstName: profile.firstName,
  lastName: profile.lastName,
  gender: profile.gender,
  age: serializeNumber(profile.age),
  city: profile.city,
  desiredPosition: profile.desiredPosition,
  phone: profile.phone,
  email: profile.email,
  experienceSummary: profile.experienceSummary,
  totalExperienceYears: serializeNumber(profile.totalExperienceYears),
  consultingExperienceYears: serializeNumber(profile.consultingExperienceYears),
  consultingCompanies: profile.consultingCompanies,
  lastCompany: profile.lastCompany,
  lastPosition: profile.lastPosition,
  lastDuration: profile.lastDuration,
  resume: serializeResume(profile.resume)
});

export const candidatesApi = {
  list: async () => ensureCandidateList(await apiRequest<unknown>('/candidates')),
  create: async (profile: CandidateProfile) =>
    ensureCandidate(
      await apiRequest<unknown>('/candidates', {
        method: 'POST',
        body: serializeProfile(profile)
      })
    ),
  update: async (id: string, profile: CandidateProfile, expectedVersion: number) =>
    ensureCandidate(
      await apiRequest<unknown>(`/candidates/${id}`, {
        method: 'PUT',
        body: { ...serializeProfile(profile), expectedVersion }
      })
    ),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/candidates/${id}`, {
      method: 'DELETE'
    }).then((result) => {
      const identifier = typeof result.id === 'string' ? result.id : id;
      return { id: identifier };
    })
};
