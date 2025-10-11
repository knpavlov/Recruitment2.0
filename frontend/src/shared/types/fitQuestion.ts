export interface FitQuestionCriterion {
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

export interface FitQuestion {
  id: string;
  version: number;
  shortTitle: string;
  content: string;
  criteria: FitQuestionCriterion[];
  createdAt: string;
  updatedAt: string;
}
