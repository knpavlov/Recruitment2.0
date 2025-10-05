import { EvaluationsRepository } from './evaluations.repository.js';

export interface EvaluationRecord {
  id: string;
  candidateId?: string;
  roundNumber?: number;
}

export class EvaluationsService {
  constructor(private readonly repository: EvaluationsRepository) {}

  async listEvaluations() {
    return this.repository.listEvaluations();
  }
}
