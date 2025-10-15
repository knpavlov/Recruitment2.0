export interface CaseCriterionRecord {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  orderIndex: number;
  updatedAt: string;
}

export interface CaseCriterionWriteModel {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  orderIndex: number;
}

export interface CaseCriteriaStateRecord {
  version: number;
  updatedAt: string;
}
