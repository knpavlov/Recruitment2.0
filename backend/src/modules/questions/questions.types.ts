export interface QuestionCriterionRecord {
  id: string;
  questionId: string;
  name: string;
  position: number;
  score1?: string;
  score2?: string;
  score3?: string;
  score4?: string;
  score5?: string;
}

export interface QuestionRecord {
  id: string;
  shortTitle: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  criteria: QuestionCriterionRecord[];
}

export interface QuestionCriterionWriteModel {
  id: string;
  questionId: string;
  name: string;
  position: number;
  score1?: string;
  score2?: string;
  score3?: string;
  score4?: string;
  score5?: string;
}

export interface QuestionWriteModel {
  id: string;
  shortTitle: string;
  content: string;
  criteria: QuestionCriterionWriteModel[];
}
