import { QuestionsRepository } from './questions.repository.js';

export interface QuestionRecord {
  id: string;
  title: string;
  category?: string;
  difficulty?: string;
}

export class QuestionsService {
  constructor(private readonly repository: QuestionsRepository) {}

  async listQuestions() {
    return this.repository.listQuestions();
  }
}
