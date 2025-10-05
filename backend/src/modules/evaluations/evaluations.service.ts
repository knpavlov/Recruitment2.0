interface EvaluationRecord {
  id: string;
  candidateId?: string;
  roundNumber?: number;
}

export class EvaluationsService {
  private records: EvaluationRecord[] = [];

  async listEvaluations() {
    return this.records;
  }
}
