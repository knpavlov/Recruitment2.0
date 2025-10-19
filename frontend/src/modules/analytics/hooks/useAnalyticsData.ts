import { useMemo } from 'react';
import { analyticsMockData } from '../data/mockAnalyticsData';
import { AnalyticsData } from '../types';

export const useAnalyticsData = (): AnalyticsData => {
  // В реальном проекте здесь будет загрузка данных через API и кэширование состояния.
  return useMemo(() => analyticsMockData, []);
};
