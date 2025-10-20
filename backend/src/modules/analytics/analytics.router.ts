import { Router } from 'express';
import { analyticsService } from './analytics.module.js';
import type { SummaryPeriodKey, TimelineGrouping } from './analytics.types.js';

const router = Router();

const summaryPeriods: SummaryPeriodKey[] = ['rolling_3', 'fytd', 'rolling_12'];
const timelineGroupings: TimelineGrouping[] = ['week', 'month', 'quarter'];

const resolveSummaryPeriod = (value: unknown): SummaryPeriodKey => {
  if (typeof value !== 'string') {
    return 'rolling_3';
  }
  const normalized = value.trim() as SummaryPeriodKey;
  return summaryPeriods.includes(normalized) ? normalized : 'rolling_3';
};

const resolveGrouping = (value: unknown): TimelineGrouping => {
  if (typeof value !== 'string') {
    return 'month';
  }
  const normalized = value.trim() as TimelineGrouping;
  return timelineGroupings.includes(normalized) ? normalized : 'month';
};

const normalizeIds = (value: unknown): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
  }
  return undefined;
};

router.get('/summary', async (req, res) => {
  try {
    const period = resolveSummaryPeriod(req.query.period);
    const summary = await analyticsService.getSummary(period);
    res.json(summary);
  } catch (error) {
    console.error('Failed to load analytics summary:', error);
    res.status(500).json({ code: 'analytics-error', message: 'Unable to load summary metrics.' });
  }
});

router.get('/timeline', async (req, res) => {
  try {
    const groupBy = resolveGrouping(req.query.groupBy);
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const timeline = await analyticsService.getTimeline(groupBy, { from, to });
    res.json(timeline);
  } catch (error) {
    console.error('Failed to load analytics timeline:', error);
    res.status(500).json({ code: 'analytics-error', message: 'Unable to load timeline data.' });
  }
});

router.get('/interviewers', async (req, res) => {
  try {
    const groupBy = resolveGrouping(req.query.groupBy);
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const interviewerIds = normalizeIds(req.query.interviewers);
    const stats = await analyticsService.getInterviewerStats(groupBy, { from, to, interviewerIds });
    res.json(stats);
  } catch (error) {
    console.error('Failed to load interviewer analytics:', error);
    res.status(500).json({ code: 'analytics-error', message: 'Unable to load interviewer statistics.' });
  }
});

router.get('/export/:dataset', async (req, res) => {
  const dataset = req.params.dataset;
  const groupBy = resolveGrouping(req.query.groupBy);
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  const interviewerIds = normalizeIds(req.query.interviewers);

  try {
    switch (dataset) {
      case 'summary': {
        const period = resolveSummaryPeriod(req.query.period);
        const csv = await analyticsService.exportSummary(period);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-summary.csv"');
        res.send(`\uFEFF${csv}`);
        return;
      }
      case 'timeline': {
        const csv = await analyticsService.exportTimeline(groupBy, { from, to });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-timeline.csv"');
        res.send(`\uFEFF${csv}`);
        return;
      }
      case 'interviewers': {
        const csv = await analyticsService.exportInterviewers(groupBy, { from, to, interviewerIds });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-interviewers.csv"');
        res.send(`\uFEFF${csv}`);
        return;
      }
      default:
        res.status(404).json({ code: 'not-found', message: 'Unknown export type.' });
    }
  } catch (error) {
    console.error('Failed to export analytics dataset:', error);
    res.status(500).json({ code: 'analytics-error', message: 'Failed to prepare export file.' });
  }
});

export { router as analyticsRouter };
