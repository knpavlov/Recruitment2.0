import assert from 'node:assert/strict';
import test from 'node:test';
import { CasesService } from '../modules/cases/cases.service.js';
import type { CasesRepository } from '../modules/cases/cases.repository.js';
import type { CaseEvaluationCriterion } from '../modules/cases/cases.types.js';

class StubCasesRepository {
  public lastPayload: {
    folderId: string;
    criterion: { id: string; title: string; ratings: CaseEvaluationCriterion['ratings'] };
  } | null = null;

  async createCriterion(
    folderId: string,
    criterion: { id: string; title: string; ratings: CaseEvaluationCriterion['ratings'] }
  ): Promise<CaseEvaluationCriterion | null> {
    this.lastPayload = { folderId, criterion };
    return { id: criterion.id, title: criterion.title, ratings: criterion.ratings };
  }
}

test('CasesService.createCriterion trims payload before persisting', async () => {
  const repository = new StubCasesRepository();
  const service = new CasesService(repository as unknown as CasesRepository);

  const result = await service.createCriterion(' folder-1 ', {
    id: ' crit-1 ',
    title: '  Проблемное структурирование  ',
    ratings: {
      1: '  слабое описание  ',
      2: '   ',
      3: '  хорошее описание '
    }
  });

  assert.ok(repository.lastPayload);
  assert.equal(repository.lastPayload?.folderId, 'folder-1');
  assert.equal(repository.lastPayload?.criterion.title, 'Проблемное структурирование');
  assert.deepEqual(repository.lastPayload?.criterion.ratings, {
    1: 'слабое описание',
    3: 'хорошее описание'
  });

  assert.equal(result.id.trim(), 'crit-1');
  assert.equal(result.title, 'Проблемное структурирование');
  assert.deepEqual(result.ratings, {
    1: 'слабое описание',
    3: 'хорошее описание'
  });
});

test('CasesService.createCriterion rejects blank titles', async () => {
  const repository = new StubCasesRepository();
  const service = new CasesService(repository as unknown as CasesRepository);

  await assert.rejects(
    () => service.createCriterion('folder', { id: 'id', title: '   ', ratings: {} }),
    /INVALID_INPUT/
  );
});
