interface CandidateRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export class CandidatesService {
  private records: CandidateRecord[] = [];

  async listCandidates() {
    return this.records;
  }
}
