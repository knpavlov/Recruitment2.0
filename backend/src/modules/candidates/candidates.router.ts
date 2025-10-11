import { Router, Response } from 'express';
import { candidatesService } from './candidates.module.js';
import type { CandidateResumeRecord, CandidateUpsertInput } from './candidates.service.js';

const router = Router();

const handleError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    res.status(500).json({ code: 'unknown', message: 'Unexpected error.' });
    return;
  }

  switch (error.message) {
    case 'INVALID_INPUT':
      res.status(400).json({ code: 'invalid-input', message: 'Invalid candidate data.' });
      return;
    case 'VERSION_CONFLICT':
      res.status(409).json({ code: 'version-conflict', message: 'Candidate version is outdated.' });
      return;
    case 'NOT_FOUND':
      res.status(404).json({ code: 'not-found', message: 'Candidate not found.' });
      return;
    default:
      res.status(500).json({ code: 'unknown', message: 'Failed to process the request.' });
  }
};

const readString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const readIsoString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
};

const parseResume = (payload: unknown): CandidateResumeRecord | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const fileName = readString(record.fileName)?.trim();
  const dataUrl = readString(record.dataUrl)?.trim();

  if (!fileName || !dataUrl) {
    return null;
  }

  const resume: CandidateResumeRecord = {
    id: readString(record.id)?.trim(),
    fileName,
    mimeType: readString(record.mimeType) ?? undefined,
    size: readNumber(record.size),
    dataUrl,
    uploadedAt: readIsoString(record.uploadedAt) ?? undefined,
    textContent: readString(record.textContent) ?? undefined
  };

  return resume;
};

const parseCandidateInput = (payload: unknown): CandidateUpsertInput => {
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  const resume = parseResume(source.resume);

  return {
    id: readString(source.id)?.trim(),
    firstName: readString(source.firstName) ?? '',
    lastName: readString(source.lastName) ?? '',
    gender: readString(source.gender)?.trim() || undefined,
    age: readNumber(source.age),
    city: readString(source.city)?.trim() || undefined,
    desiredPosition: readString(source.desiredPosition)?.trim() || undefined,
    phone: readString(source.phone)?.trim() || undefined,
    email: readString(source.email)?.trim() || undefined,
    experienceSummary: readString(source.experienceSummary) ?? undefined,
    totalExperienceYears: readNumber(source.totalExperienceYears),
    consultingExperienceYears: readNumber(source.consultingExperienceYears),
    consultingCompanies: readString(source.consultingCompanies) ?? undefined,
    lastCompany: readString(source.lastCompany) ?? undefined,
    lastPosition: readString(source.lastPosition) ?? undefined,
    lastDuration: readString(source.lastDuration) ?? undefined,
    resume
  };
};

router.get('/', async (_req, res) => {
  const candidates = await candidatesService.listCandidates();
  res.json(candidates);
});

router.post('/', async (req, res) => {
  try {
    const candidate = await candidatesService.createCandidate(parseCandidateInput(req.body));
    res.status(201).json(candidate);
  } catch (error) {
    handleError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  const { expectedVersion } = req.body as { expectedVersion?: unknown };
  const version = readNumber(expectedVersion);

  if (typeof version !== 'number') {
    res.status(400).json({ code: 'invalid-input', message: 'Provide the expected version.' });
    return;
  }

  try {
    const candidate = await candidatesService.updateCandidate(
      req.params.id,
      parseCandidateInput(req.body),
      version
    );
    res.json(candidate);
  } catch (error) {
    handleError(error, res);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = await candidatesService.deleteCandidate(req.params.id);
    res.json({ id });
  } catch (error) {
    handleError(error, res);
  }
});

export { router as candidatesRouter };
