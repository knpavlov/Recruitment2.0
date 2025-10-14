// Глобальный критерий оценки кейса
export interface CaseCriterion {
  id: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  version: number;
  createdAt: string;
  updatedAt: string;
}
