export interface CaseCriterion {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
}

export interface CaseCriteriaResponse {
  version: number;
  items: CaseCriterion[];
}
