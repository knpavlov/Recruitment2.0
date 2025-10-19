import { useMemo } from 'react';
import { useCandidatesState, useEvaluationsState } from '../../../app/state/AppStateContext';
import { buildAnalyticsDataset } from '../services/analyticsTransform';

export const useAnalyticsDataset = () => {
  const { list: candidates } = useCandidatesState();
  const { list: evaluations } = useEvaluationsState();

  return useMemo(() => buildAnalyticsDataset(candidates, evaluations), [candidates, evaluations]);
};
