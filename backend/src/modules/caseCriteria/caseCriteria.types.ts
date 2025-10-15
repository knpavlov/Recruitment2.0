export interface CaseCriterionRecord {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseCriterionWriteModel {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  position: number;
}

export interface CaseCriteriaSet {
  version: number;
  items: CaseCriterionRecord[];
}
