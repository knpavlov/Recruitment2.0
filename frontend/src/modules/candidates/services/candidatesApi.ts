import { apiRequest } from '../../../shared/api/httpClient';
import { CandidateProfile, CandidateResume } from '../../../shared/types/candidate';

const normalizeIso = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
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

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const normalizePractice = (
  value: unknown
): CandidateProfile['targetPractice'] | undefined => {
  const raw = normalizeString(value)?.trim();
  if (!raw) {
    return undefined;
  }
  const allowed: CandidateProfile['targetPractice'][] = ['PI', 'PEPI', 'ET', 'Tax', 'Restructuring'];
  return allowed.includes(raw as CandidateProfile['targetPractice'])
    ? (raw as CandidateProfile['targetPractice'])
    : undefined;
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
    dataUrl?: unknown;
    uploadedAt?: unknown;
    textContent?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const fileName = normalizeString(payload.fileName)?.trim();
  const mimeType = normalizeString(payload.mimeType)?.trim() ?? 'application/octet-stream';
  const size = normalizeNumber(payload.size) ?? 0;
  const dataUrl = normalizeString(payload.dataUrl) ?? '';
  const uploadedAt = normalizeIso(payload.uploadedAt);
  const textContent = normalizeString(payload.textContent);

  if (!id || !fileName || !uploadedAt) {
    return undefined;
  }

  return {
    id,
    fileName,
    mimeType,
    size,
    uploadedAt,
    dataUrl,
    textContent: textContent ?? undefined
  };
};

const normalizeCandidate = (value: unknown): CandidateProfile | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Partial<CandidateProfile> & {
    id?: unknown;
    version?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    gender?: unknown;
    age?: unknown;
    city?: unknown;
    desiredPosition?: unknown;
    targetPractice?: unknown;
    targetOffice?: unknown;
    phone?: unknown;
    email?: unknown;
    experienceSummary?: unknown;
    totalExperienceYears?: unknown;
    consultingExperienceYears?: unknown;
    consultingCompanies?: unknown;
    lastCompany?: unknown;
    lastPosition?: unknown;
    lastDuration?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    resume?: unknown;
  };

  const id = normalizeString(payload.id)?.trim();
  const version = normalizeNumber(payload.version);
  const firstName = normalizeString(payload.firstName);
  const lastName = normalizeString(payload.lastName);
  const createdAt = normalizeIso(payload.createdAt);
  const updatedAt = normalizeIso(payload.updatedAt);

  if (!id || version === undefined || !firstName || !lastName || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    version,
    firstName,
    lastName,
    gender: normalizeString(payload.gender) ?? undefined,
    age: normalizeNumber(payload.age),
    city: normalizeString(payload.city) ?? '',
    desiredPosition: normalizeString(payload.desiredPosition) ?? '',
    targetPractice: normalizePractice(payload.targetPractice),
    targetOffice: normalizeString(payload.targetOffice) ?? '',
    phone: normalizeString(payload.phone) ?? '',
    email: normalizeString(payload.email) ?? '',
    experienceSummary: normalizeString(payload.experienceSummary) ?? '',
    totalExperienceYears: normalizeNumber(payload.totalExperienceYears),
    consultingExperienceYears: normalizeNumber(payload.consultingExperienceYears),
    consultingCompanies: normalizeString(payload.consultingCompanies) ?? '',
    lastCompany: normalizeString(payload.lastCompany) ?? '',
    lastPosition: normalizeString(payload.lastPosition) ?? '',
    lastDuration: normalizeString(payload.lastDuration) ?? '',
    resume: normalizeResume(payload.resume),
    createdAt,
    updatedAt
  };
};

const ensureCandidate = (value: unknown): CandidateProfile => {
  const profile = normalizeCandidate(value);
  if (!profile) {
    throw new Error('Failed to parse the candidate payload.');
  }
  return profile;
};

const ensureCandidateList = (value: unknown): CandidateProfile[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeCandidate(item))
    .filter((profile): profile is CandidateProfile => Boolean(profile));
};

const serializeCandidate = (profile: CandidateProfile) => ({
  ...profile,
  gender: profile.gender ?? null,
  age: profile.age ?? null,
  targetPractice: profile.targetPractice ?? null,
  totalExperienceYears: profile.totalExperienceYears ?? null,
  consultingExperienceYears: profile.consultingExperienceYears ?? null,
  resume: profile.resume
    ? {
        ...profile.resume,
        textContent: profile.resume.textContent ?? null
      }
    : null
});

export const candidatesApi = {
  list: async () => ensureCandidateList(await apiRequest<unknown>('/candidates')),
  create: async (profile: CandidateProfile) =>
    ensureCandidate(
      await apiRequest<unknown>('/candidates', {
        method: 'POST',
        body: { profile: serializeCandidate(profile) }
      })
    ),
  update: async (id: string, profile: CandidateProfile, expectedVersion: number) =>
    ensureCandidate(
      await apiRequest<unknown>(`/candidates/${id}`, {
        method: 'PUT',
        body: { profile: serializeCandidate(profile), expectedVersion }
      })
    ),
  remove: async (id: string) =>
    apiRequest<{ id?: unknown }>(`/candidates/${id}`, {
      method: 'DELETE'
    }).then((result) => {
      const identifier = typeof result.id === 'string' ? result.id : id;
      return identifier;
    })
};
