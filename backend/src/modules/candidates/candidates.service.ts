import { CandidatesRepository } from './candidates.repository.js';

export interface CandidateRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export class CandidatesService {
  constructor(private readonly repository: CandidatesRepository) {}

  async listCandidates() {
    return this.repository.listCandidates();
  }
}
