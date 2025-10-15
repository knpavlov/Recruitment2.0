export interface CaseCriterion {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
}

export interface CaseCriteriaSet {
  version: number;
  updatedAt: string;
  criteria: CaseCriterion[];
}
