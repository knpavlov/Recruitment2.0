import { seedDemoData, SeedDemoDataResult } from '../../scripts/seedDemoData.js';

// Сервис отвечает за запуск сидера и предотвращает параллельные прогоны
export class DemoDataService {
  private running = false;

  async triggerSeed(): Promise<SeedDemoDataResult> {
    if (this.running) {
      throw new Error('IN_PROGRESS');
    }

    this.running = true;

    try {
      return await seedDemoData({ runMigrations: true });
    } finally {
      this.running = false;
    }
  }
}

export const demoDataService = new DemoDataService();
