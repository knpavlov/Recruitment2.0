import { EvaluationConfig, InterviewSlot, InterviewStatusRecord } from '../../../shared/types/evaluation';
import { generateId } from '../../../shared/ui/generateId';

// Создание слота интервьюера выведено в отдельную функцию, чтобы переиспользовать её в разных сценариях.
export const createInterviewSlot = (): InterviewSlot => ({
  id: generateId(),
  interviewerName: '',
  interviewerEmail: ''
});

// Создание черновой формы для интервьюера вынесено в отдельную функцию для централизации логики.
export const createStatusRecord = (slot: InterviewSlot): InterviewStatusRecord => ({
  slotId: slot.id,
  interviewerName: slot.interviewerName || 'Interviewer',
  submitted: false
});

// Унифицированный фабричный метод для подготовки пустой конфигурации оценки.
export const createEmptyEvaluationConfig = (
  options: Partial<Pick<EvaluationConfig, 'candidateId' | 'roundNumber'>> = {}
): EvaluationConfig => {
  const interviews = [createInterviewSlot()];
  const nowIso = new Date().toISOString();
  return {
    id: generateId(),
    candidateId: options.candidateId,
    roundNumber: options.roundNumber ?? 1,
    interviewCount: interviews.length,
    interviews,
    fitQuestionId: undefined,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    forms: interviews.map((slot) => createStatusRecord(slot)),
    processStatus: 'draft'
  };
};

// Подготовка конфигурации для следующего раунда на основе предыдущего.
export const createNextRoundConfig = (
  source: EvaluationConfig
): EvaluationConfig =>
  createEmptyEvaluationConfig({
    candidateId: source.candidateId,
    roundNumber: (source.roundNumber ?? 1) + 1
  });
