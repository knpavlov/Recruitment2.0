import assert from 'node:assert/strict';
import test from 'node:test';
import { EvaluationWorkflowService } from '../modules/evaluations/evaluationWorkflow.service.js';
import type { EvaluationsRepository } from '../modules/evaluations/evaluations.repository.js';
import type {
  EvaluationRecord,
  InterviewAssignmentRecord
} from '../modules/evaluations/evaluations.types.js';

class StubEvaluationsRepository {
  constructor(private readonly assignments: InterviewAssignmentRecord[], private readonly evaluation: EvaluationRecord) {}

  async listAssignmentsByEmail(_email: string): Promise<InterviewAssignmentRecord[]> {
    return this.assignments;
  }

  async findEvaluation(id: string): Promise<EvaluationRecord | null> {
    return id === this.evaluation.id ? this.evaluation : null;
  }

  // Unused in these tests
  // eslint-disable-next-line class-methods-use-this
  async listAssignmentsForEvaluation(): Promise<InterviewAssignmentRecord[]> {
    return [];
  }
}

const buildEvaluationRecord = (): EvaluationRecord => ({
  id: 'eval-1',
  candidateId: 'cand-1',
  roundNumber: 3,
  interviewCount: 1,
  interviews: [],
  fitQuestionId: 'fit-1',
  version: 1,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-02T00:00:00.000Z',
  forms: [
    {
      slotId: 'slot-current',
      interviewerName: 'Active interviewer',
      submitted: false
    }
  ],
  processStatus: 'in-progress',
  processStartedAt: '2023-01-01T00:00:00.000Z',
  roundHistory: [
    {
      roundNumber: 2,
      interviewCount: 1,
      interviews: [],
      forms: [
        {
          slotId: 'slot-archived',
          interviewerName: 'Archived interviewer',
          submitted: true,
          submittedAt: '2023-01-01T01:00:00.000Z'
        }
      ],
      fitQuestionId: 'fit-1',
      processStatus: 'completed',
      processStartedAt: '2023-01-01T00:00:00.000Z',
      completedAt: '2023-01-01T02:00:00.000Z',
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  ],
  invitationState: { hasInvitations: false, hasPendingChanges: false }
});

test('EvaluationWorkflowService returns archived assignment with snapshot data', async () => {
  const assignment: InterviewAssignmentRecord = {
    id: 'assignment-1',
    evaluationId: 'eval-1',
    slotId: 'slot-archived',
    interviewerEmail: 'interviewer@example.com',
    interviewerName: 'Archived interviewer',
    caseFolderId: 'case-1',
    fitQuestionId: 'fit-1',
    invitationSentAt: '2023-01-01T00:00:00.000Z',
    createdAt: '2023-01-01T00:00:00.000Z',
    roundNumber: 2,
    isActive: false,
    archivedAt: '2023-01-03T00:00:00.000Z'
  };

  const repository = new StubEvaluationsRepository([assignment], buildEvaluationRecord()) as unknown as EvaluationsRepository;

  const service = new EvaluationWorkflowService(
    repository,
    { ensureUserAccount: async () => {} } as any,
    { getCandidate: async () => ({ id: 'cand-1', firstName: 'Иван', lastName: 'Иванов' }) } as any,
    {
      getFolder: async () => ({
        id: 'case-1',
        name: 'Case',
        evaluationCriteria: [],
        files: [],
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z'
      })
    } as any,
    {
      getQuestion: async () => ({
        id: 'fit-1',
        shortTitle: 'Fit',
        content: '',
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z'
      })
    } as any
  );

  const result = await service.listAssignmentsForInterviewer('interviewer@example.com');
  assert.equal(result.length, 1);
  const view = result[0];
  assert.equal(view.assignmentId, 'assignment-1');
  assert.equal(view.isActive, false);
  assert.equal(view.roundNumber, 2);
  assert.equal(view.evaluationProcessStatus, 'completed');
  assert.ok(view.form);
  assert.equal(view.form?.slotId, 'slot-archived');
  assert.equal(view.form?.submitted, true);
});
