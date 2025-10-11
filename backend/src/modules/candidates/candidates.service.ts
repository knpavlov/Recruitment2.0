import { randomUUID } from 'crypto';
import { CandidatesRepository } from './candidates.repository.js';

export interface CandidateResumeRecord {
  id?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  dataUrl?: string;
  uploadedAt?: string;
  textContent?: string;
}

export interface CandidateUpsertInput {
  id?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  age?: number;
  city?: string;
  desiredPosition?: string;
  phone?: string;
  email?: string;
  experienceSummary?: string;
  totalExperienceYears?: number;
  consultingExperienceYears?: number;
  consultingCompanies?: string;
  lastCompany?: string;
  lastPosition?: string;
  lastDuration?: string;
  resume?: CandidateResumeRecord | null;
}

export interface CandidateRecord {
  id: string;
  version: number;
  firstName: string;
  lastName: string;
  gender?: string;
  age?: number;
  city?: string;
  desiredPosition?: string;
  phone?: string;
  email?: string;
  experienceSummary?: string;
  totalExperienceYears?: number;
  consultingExperienceYears?: number;
  consultingCompanies?: string;
  lastCompany?: string;
  lastPosition?: string;
  lastDuration?: string;
  resume?: CandidateResumeRecord;
  createdAt: string;
  updatedAt: string;
}

const ensureName = (value: string) => value.trim();

export class CandidatesService {
  constructor(private readonly repository: CandidatesRepository) {}

  async listCandidates() {
    return this.repository.listCandidates();
  }

  async createCandidate(input: CandidateUpsertInput) {
    const firstName = ensureName(input.firstName);
    const lastName = ensureName(input.lastName);

    if (!firstName || !lastName) {
      throw new Error('INVALID_INPUT');
    }

    const id = input.id && input.id.trim() ? input.id : randomUUID();

    return this.repository.createCandidate(id, { ...input, firstName, lastName });
  }

  async updateCandidate(id: string, input: CandidateUpsertInput, expectedVersion: number) {
    const firstName = ensureName(input.firstName);
    const lastName = ensureName(input.lastName);

    if (!firstName || !lastName) {
      throw new Error('INVALID_INPUT');
    }

    const updated = await this.repository.updateCandidate(id, { ...input, firstName, lastName }, expectedVersion);
    if (!updated) {
      const existing = await this.repository.findCandidate(id);
      if (!existing) {
        throw new Error('NOT_FOUND');
      }
      throw new Error('VERSION_CONFLICT');
    }
    return updated;
  }

  async deleteCandidate(id: string) {
    const deleted = await this.repository.deleteCandidate(id);
    if (!deleted) {
      throw new Error('NOT_FOUND');
    }
    return id;
  }
}
