import { CaseEvaluationCriterion } from '../../shared/types/caseLibrary';
import { generateId } from '../../shared/ui/generateId';

export const normalizeForCompare = (criterion: CaseEvaluationCriterion) => {
  const trimmedTitle = criterion.title.trim();
  const normalizedRatings = [1, 2, 3, 4, 5].map((score) =>
    (criterion.ratings[score as 1 | 2 | 3 | 4 | 5] ?? '').trim()
  );
  return { id: criterion.id.trim(), title: trimmedTitle, ratings: normalizedRatings };
};

export const serializeCriteria = (criteria: CaseEvaluationCriterion[]) =>
  JSON.stringify(criteria.map((item) => normalizeForCompare(item)));

export const cloneCriterion = (criterion: CaseEvaluationCriterion): CaseEvaluationCriterion => ({
  id: criterion.id,
  title: criterion.title,
  ratings: { ...criterion.ratings }
});

export const createEmptyCriterion = (): CaseEvaluationCriterion => ({
  id: generateId(),
  title: '',
  ratings: {}
});
