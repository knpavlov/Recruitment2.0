import { EvaluationsService } from './evaluations.service.js';
import { EvaluationsRepository } from './evaluations.repository.js';

const repository = new EvaluationsRepository();
export const evaluationsService = new EvaluationsService(repository);
