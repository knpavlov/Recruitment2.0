import { apiRequest } from '../../../shared/api/httpClient';

export interface DemoSeedSummary {
  candidatesProcessed: number;
  evaluationsProcessed: number;
  interviewsProcessed: number;
}

interface DemoSeedResponse {
  status: 'ok';
  summary: DemoSeedSummary;
}

export const demoDataApi = {
  seed: async (email: string) =>
    apiRequest<DemoSeedResponse>('/demo/seed', {
      method: 'POST',
      body: { email }
    })
};
