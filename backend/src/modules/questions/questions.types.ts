export type FitQuestionRatingKey = '1' | '2' | '3' | '4' | '5';

export type FitQuestionRatings = Partial<Record<FitQuestionRatingKey, string>>;

export interface FitQuestionCriterionRecord {
  id: string;
  title: string;
  ratings: FitQuestionRatings;
}

export interface FitQuestionRecord {
  id: string;
  shortTitle: string;
  content: string;
  criteria: FitQuestionCriterionRecord[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FitQuestionWriteModel {
  id: string;
  shortTitle: string;
  content: string;
  criteria: FitQuestionCriterionRecord[];
}
