import { Router } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsSummaryPeriod, AnalyticsTimeGranularity } from './analytics.types.js';
import {
  buildInterviewersExport,
  buildSummaryExport,
  buildTimeSeriesExport
} from './analytics.exporter.js';
import { addMonthsUtc, startOfDayUtc } from './analytics.utils.js';

const summaryPeriods: AnalyticsSummaryPeriod[] = [
  'rolling-3-month',
  'fiscal-year-to-date',
  'rolling-12-month'
];

const granularities: AnalyticsTimeGranularity[] = ['week', 'month', 'quarter'];

const ensureSummaryPeriod = (value: string | undefined): AnalyticsSummaryPeriod => {
  if (value && summaryPeriods.includes(value as AnalyticsSummaryPeriod)) {
    return value as AnalyticsSummaryPeriod;
  }
  return 'rolling-3-month';
};

const ensureGranularity = (value: string | undefined): AnalyticsTimeGranularity => {
  if (value && granularities.includes(value as AnalyticsTimeGranularity)) {
    return value as AnalyticsTimeGranularity;
  }
  return 'month';
};

const resolveDefaultStart = (granularity: AnalyticsTimeGranularity, end: Date): Date => {
  const endOfDay = startOfDayUtc(end);
  if (granularity === 'week') {
    return addMonthsUtc(endOfDay, -3);
  }
  if (granularity === 'quarter') {
    return addMonthsUtc(endOfDay, -18);
  }
  return addMonthsUtc(endOfDay, -11);
};

const service = new AnalyticsService();

export const analyticsRouter = Router();

analyticsRouter.get('/summary', async (req, res, next) => {
  try {
    const period = ensureSummaryPeriod(req.query.period as string | undefined);
    const payload = await service.getSummary(period);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/summary/export', async (req, res, next) => {
  try {
    const period = ensureSummaryPeriod(req.query.period as string | undefined);
    const payload = await service.getSummary(period);
    const buffer = buildSummaryExport(payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-summary.csv"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/time-series', async (req, res, next) => {
  try {
    const granularity = ensureGranularity(req.query.granularity as string | undefined);
    const now = new Date();
    const end = (req.query.end as string | undefined) ?? now.toISOString();
    const start =
      (req.query.start as string | undefined) ?? resolveDefaultStart(granularity, now).toISOString();
    const payload = await service.getTimeSeries(start, end, granularity);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/time-series/export', async (req, res, next) => {
  try {
    const granularity = ensureGranularity(req.query.granularity as string | undefined);
    const now = new Date();
    const end = (req.query.end as string | undefined) ?? now.toISOString();
    const start =
      (req.query.start as string | undefined) ?? resolveDefaultStart(granularity, now).toISOString();
    const payload = await service.getTimeSeries(start, end, granularity);
    const buffer = buildTimeSeriesExport(payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-time-series.csv"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/interviewers', async (req, res, next) => {
  try {
    const granularity = ensureGranularity(req.query.granularity as string | undefined);
    const now = new Date();
    const end = (req.query.end as string | undefined) ?? now.toISOString();
    const start =
      (req.query.start as string | undefined) ?? resolveDefaultStart(granularity, now).toISOString();
    const payload = await service.getInterviewers(start, end, granularity);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/interviewers/export', async (req, res, next) => {
  try {
    const granularity = ensureGranularity(req.query.granularity as string | undefined);
    const now = new Date();
    const end = (req.query.end as string | undefined) ?? now.toISOString();
    const start =
      (req.query.start as string | undefined) ?? resolveDefaultStart(granularity, now).toISOString();
    const payload = await service.getInterviewers(start, end, granularity);
    const buffer = buildInterviewersExport(payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-interviewers.csv"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});
