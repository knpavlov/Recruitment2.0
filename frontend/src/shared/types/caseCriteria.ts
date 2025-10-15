export interface CaseCriterion {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseCriteriaSet {
  version: number;
  items: CaseCriterion[];
}

export interface CaseCriterionDraft {
  id?: string | null;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
}
