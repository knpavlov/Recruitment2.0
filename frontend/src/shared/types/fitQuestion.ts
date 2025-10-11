export type FitQuestionRatingKey = '1' | '2' | '3' | '4' | '5';

export type FitQuestionRatings = Partial<Record<FitQuestionRatingKey, string>>;

export interface FitQuestionCriterion {
  id: string;
  title: string;
  ratings: FitQuestionRatings;
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
