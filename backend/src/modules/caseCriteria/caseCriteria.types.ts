export interface CaseCriterionRecord {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  createdAt: string;
  updatedAt: string;
}

export interface CaseCriteriaSet {
  version: number;
  updatedAt: string;
  criteria: CaseCriterionRecord[];
}

export interface CaseCriterionWriteModel {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  order: number;
}
