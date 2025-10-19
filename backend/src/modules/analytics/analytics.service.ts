import {
  AnalyticsSummaryPeriod,
  AnalyticsSummaryResponse,
  AnalyticsTimeGranularity,
  AnalyticsTimeSeriesResponse,
  AnalyticsInterviewersResponse,
  AnalyticsInterviewerStats,
  AnalyticsInterviewerTimelinePoint
} from './analytics.types.js';
import {
  AnalyticsRepository,
  AssignmentSnapshot,
  EvaluationFormSnapshot,
  EvaluationSnapshot
} from './analytics.repository.js';
import {
  addDaysUtc,
  addMonthsUtc,
  getFiscalYearStartUtc,
  iteratePeriods,
  parseIsoDate,
  startOfDayUtc,
  startOfMonthUtc
} from './analytics.utils.js';

const FISCAL_YEAR_START_MONTH = Number(process.env.FISCAL_YEAR_START_MONTH ?? '1');

const FEMALE_GENDER_TOKENS = new Set([
  'female',
  'f',
  'woman',
  'женщина',
  'женский',
  'ж'
]);

const normalizeEndExclusive = (end: Date): Date => addDaysUtc(end, 1);

const isFemaleGender = (value?: string): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return FEMALE_GENDER_TOKENS.has(normalized);
};

const ensureStartBeforeEnd = (start: Date, end: Date): { start: Date; end: Date } => {
  if (start > end) {
    return { start: end, end: start };
  }
  return { start, end };
};

const resolveDecisionDate = (record: EvaluationSnapshot): Date => {
  return parseIsoDate(record.updatedAt, new Date(record.updatedAt));
};

const resolveProcessDate = (record: EvaluationSnapshot): Date => {
  const fallback = parseIsoDate(record.createdAt, new Date(record.createdAt));
  if (record.processStartedAt) {
    return parseIsoDate(record.processStartedAt, fallback);
  }
  return fallback;
};

const resolveAcceptanceDate = (record: EvaluationSnapshot, decisionDate: Date): Date => {
  if (record.offerAcceptedAt) {
    return parseIsoDate(record.offerAcceptedAt, decisionDate);
  }
  return decisionDate;
};

const buildAssignmentKey = (evaluationId: string, slotId: string): string => `${evaluationId}:${slotId}`;

const resolveFormEventDate = (
  form: EvaluationFormSnapshot,
  assignment: AssignmentSnapshot | undefined,
  evaluation: EvaluationSnapshot
): Date => {
  if (form.submittedAt) {
    return parseIsoDate(form.submittedAt, new Date(form.submittedAt));
  }
  if (assignment?.invitationSentAt) {
    return parseIsoDate(assignment.invitationSentAt, new Date(assignment.invitationSentAt));
  }
  return parseIsoDate(evaluation.updatedAt, new Date(evaluation.updatedAt));
};

export class AnalyticsService {
  constructor(private readonly repository = new AnalyticsRepository()) {}

  private resolveSummaryRange(period: AnalyticsSummaryPeriod, now: Date) {
    const today = startOfDayUtc(now);
    const monthStart = startOfMonthUtc(today);
    if (period === 'rolling-3-month') {
      const start = startOfMonthUtc(addMonthsUtc(monthStart, -2));
      return { periodStart: start, periodEnd: today, queryStart: start, queryEnd: normalizeEndExclusive(today) };
    }
    if (period === 'rolling-12-month') {
      const start = startOfMonthUtc(addMonthsUtc(monthStart, -11));
      return { periodStart: start, periodEnd: today, queryStart: start, queryEnd: normalizeEndExclusive(today) };
    }
    const fiscalStart = getFiscalYearStartUtc(today, FISCAL_YEAR_START_MONTH);
    return { periodStart: fiscalStart, periodEnd: today, queryStart: fiscalStart, queryEnd: normalizeEndExclusive(today) };
  }

  async getSummary(period: AnalyticsSummaryPeriod): Promise<AnalyticsSummaryResponse> {
    const now = new Date();
    const range = this.resolveSummaryRange(period, now);
    const evaluations = await this.repository.fetchEvaluations(range.queryStart, range.queryEnd);

    let candidateTotal = 0;
    let femaleTotal = 0;
    let offersTotal = 0;
    let acceptedOffers = 0;

    for (const evaluation of evaluations) {
      const processDate = resolveProcessDate(evaluation);
      if (processDate < range.periodStart || processDate > range.periodEnd) {
        // Кандидат вошёл в процесс вне выбранного периода
        // но мы всё равно учитываем оценку в других расчётах
      } else {
        candidateTotal += 1;
        if (isFemaleGender(evaluation.candidateGender)) {
          femaleTotal += 1;
        }
      }

      if (evaluation.decision === 'offer') {
        const decisionDate = resolveDecisionDate(evaluation);
        if (decisionDate >= range.periodStart && decisionDate <= range.periodEnd) {
          offersTotal += 1;
          if (evaluation.offerAccepted) {
            const acceptanceDate = resolveAcceptanceDate(evaluation, decisionDate);
            if (acceptanceDate >= range.periodStart && acceptanceDate <= range.periodEnd) {
              acceptedOffers += 1;
            }
          }
        }
      }
    }

    const femaleShare = candidateTotal > 0 ? femaleTotal / candidateTotal : null;
    const offerRate = candidateTotal > 0 ? offersTotal / candidateTotal : null;
    const offerAcceptanceRate = offersTotal > 0 ? acceptedOffers / offersTotal : null;

    return {
      period,
      periodStart: range.periodStart.toISOString(),
      periodEnd: range.periodEnd.toISOString(),
      metrics: {
        femaleShare: {
          value: femaleShare,
          numerator: femaleTotal,
          denominator: candidateTotal
        },
        offerAcceptanceRate: {
          value: offerAcceptanceRate,
          numerator: acceptedOffers,
          denominator: offersTotal
        },
        offerRate: {
          value: offerRate,
          numerator: offersTotal,
          denominator: candidateTotal
        }
      }
    } satisfies AnalyticsSummaryResponse;
  }

  private async loadEvaluationContext(rangeStart: Date, rangeEnd: Date) {
    const { start, end } = ensureStartBeforeEnd(rangeStart, rangeEnd);
    const queryEnd = normalizeEndExclusive(end);
    const evaluations = await this.repository.fetchEvaluations(start, queryEnd);
    const evaluationIds = evaluations.map((item) => item.id);
    const assignments = await this.repository.fetchAssignmentsByEvaluationIds(evaluationIds);
    const assignmentMap = new Map<string, AssignmentSnapshot>();
    for (const assignment of assignments) {
      assignmentMap.set(buildAssignmentKey(assignment.evaluationId, assignment.slotId), assignment);
    }
    return { evaluations, assignments, assignmentMap };
  }

  async getTimeSeries(
    startIso: string,
    endIso: string,
    granularity: AnalyticsTimeGranularity
  ): Promise<AnalyticsTimeSeriesResponse> {
    const now = new Date();
    const start = startOfDayUtc(parseIsoDate(startIso, now));
    const end = startOfDayUtc(parseIsoDate(endIso, now));
    const { start: rangeStart, end: rangeEnd } = ensureStartBeforeEnd(start, end);
    const queryEnd = normalizeEndExclusive(rangeEnd);

    const { evaluations, assignmentMap } = await this.loadEvaluationContext(rangeStart, rangeEnd);
    const candidates = await this.repository.fetchCandidates(rangeStart, queryEnd);

    const periods = iteratePeriods(rangeStart, rangeEnd, granularity);
    if (!periods.length) {
      return {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        granularity,
        points: []
      };
    }

    const aggregates = periods.map(() => ({
      resumes: 0,
      firstRound: 0,
      secondRound: 0,
      totalInterviews: 0,
      rejections: 0,
      offers: 0,
      caseScoreSum: 0,
      caseScoreCount: 0,
      fitScoreSum: 0,
      fitScoreCount: 0,
      femaleCount: 0,
      femaleTotal: 0
    }));

    const findPeriodIndex = (date: Date): number => {
      for (let index = 0; index < periods.length; index += 1) {
        const period = periods[index];
        if (date >= period.start && date <= period.end) {
          return index;
        }
      }
      return -1;
    };

    for (const candidate of candidates) {
      const createdAt = parseIsoDate(candidate.createdAt, rangeStart);
      if (createdAt < rangeStart || createdAt > rangeEnd) {
        continue;
      }
      const index = findPeriodIndex(createdAt);
      if (index === -1) {
        continue;
      }
      aggregates[index].resumes += 1;
    }

    for (const evaluation of evaluations) {
      const processDate = resolveProcessDate(evaluation);
      if (processDate >= rangeStart && processDate <= rangeEnd) {
        const index = findPeriodIndex(processDate);
        if (index !== -1) {
          aggregates[index].femaleTotal += 1;
          if (isFemaleGender(evaluation.candidateGender)) {
            aggregates[index].femaleCount += 1;
          }
        }
      }

      if (evaluation.decision === 'reject' || evaluation.decision === 'offer') {
        const decisionDate = resolveDecisionDate(evaluation);
        if (decisionDate >= rangeStart && decisionDate <= rangeEnd) {
          const index = findPeriodIndex(decisionDate);
          if (index !== -1) {
            if (evaluation.decision === 'reject') {
              aggregates[index].rejections += 1;
            } else {
              aggregates[index].offers += 1;
            }
          }
        }
      }

      for (const form of evaluation.forms) {
        if (!form.submitted) {
          continue;
        }
        const assignment = assignmentMap.get(buildAssignmentKey(evaluation.id, form.slotId));
        const eventDate = resolveFormEventDate(form, assignment, evaluation);
        if (eventDate < rangeStart || eventDate > rangeEnd) {
          continue;
        }
        const index = findPeriodIndex(eventDate);
        if (index === -1) {
          continue;
        }
        aggregates[index].totalInterviews += 1;
        if (assignment?.roundNumber === 1) {
          aggregates[index].firstRound += 1;
        } else if (assignment?.roundNumber === 2) {
          aggregates[index].secondRound += 1;
        }
        if (typeof form.caseScore === 'number' && Number.isFinite(form.caseScore)) {
          aggregates[index].caseScoreSum += form.caseScore;
          aggregates[index].caseScoreCount += 1;
        }
        if (typeof form.fitScore === 'number' && Number.isFinite(form.fitScore)) {
          aggregates[index].fitScoreSum += form.fitScore;
          aggregates[index].fitScoreCount += 1;
        }
      }
    }

    const points = periods.map((period, index) => ({
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      resumesReceived: aggregates[index].resumes,
      firstRoundInterviews: aggregates[index].firstRound,
      secondRoundInterviews: aggregates[index].secondRound,
      totalInterviews: aggregates[index].totalInterviews,
      rejections: aggregates[index].rejections,
      offers: aggregates[index].offers,
      averageCaseScore:
        aggregates[index].caseScoreCount > 0
          ? aggregates[index].caseScoreSum / aggregates[index].caseScoreCount
          : null,
      averageFitScore:
        aggregates[index].fitScoreCount > 0
          ? aggregates[index].fitScoreSum / aggregates[index].fitScoreCount
          : null,
      femaleShare:
        aggregates[index].femaleTotal > 0
          ? aggregates[index].femaleCount / aggregates[index].femaleTotal
          : null
    }));

    return {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      granularity,
      points
    } satisfies AnalyticsTimeSeriesResponse;
  }

  async getInterviewers(
    startIso: string,
    endIso: string,
    granularity: AnalyticsTimeGranularity
  ): Promise<AnalyticsInterviewersResponse> {
    const now = new Date();
    const start = startOfDayUtc(parseIsoDate(startIso, now));
    const end = startOfDayUtc(parseIsoDate(endIso, now));
    const { start: rangeStart, end: rangeEnd } = ensureStartBeforeEnd(start, end);

    const { evaluations, assignmentMap } = await this.loadEvaluationContext(rangeStart, rangeEnd);
    const periods = iteratePeriods(rangeStart, rangeEnd, granularity);

    if (!periods.length) {
      return {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        granularity,
        interviewers: [],
        availableInterviewers: []
      };
    }

    const findPeriodIndex = (date: Date): number => {
      for (let index = 0; index < periods.length; index += 1) {
        const period = periods[index];
        if (date >= period.start && date <= period.end) {
          return index;
        }
      }
      return -1;
    };

    interface InterviewerAggregate {
      interviewerEmail?: string;
      interviewerName: string;
      interviews: number;
      caseScoreSum: number;
      caseScoreCount: number;
      fitScoreSum: number;
      fitScoreCount: number;
      hireRecommendations: number;
      rejectRecommendations: number;
      otherRecommendations: number;
      timeline: Map<number, {
        interviews: number;
        caseScoreSum: number;
        caseScoreCount: number;
        fitScoreSum: number;
        fitScoreCount: number;
        hireRecommendations: number;
        rejectRecommendations: number;
        otherRecommendations: number;
      }>;
    }

    const aggregates = new Map<string, InterviewerAggregate>();

    const getAggregate = (email: string | undefined, name: string): InterviewerAggregate => {
      const key = (email ?? name).toLowerCase();
      let aggregate = aggregates.get(key);
      if (!aggregate) {
        aggregate = {
          interviewerEmail: email,
          interviewerName: name,
          interviews: 0,
          caseScoreSum: 0,
          caseScoreCount: 0,
          fitScoreSum: 0,
          fitScoreCount: 0,
          hireRecommendations: 0,
          rejectRecommendations: 0,
          otherRecommendations: 0,
          timeline: new Map()
        };
        aggregates.set(key, aggregate);
      }
      return aggregate;
    };

    const updateTimeline = (aggregate: InterviewerAggregate, index: number, updater: (bucket: {
      interviews: number;
      caseScoreSum: number;
      caseScoreCount: number;
      fitScoreSum: number;
      fitScoreCount: number;
      hireRecommendations: number;
      rejectRecommendations: number;
      otherRecommendations: number;
    }) => void) => {
      let bucket = aggregate.timeline.get(index);
      if (!bucket) {
        bucket = {
          interviews: 0,
          caseScoreSum: 0,
          caseScoreCount: 0,
          fitScoreSum: 0,
          fitScoreCount: 0,
          hireRecommendations: 0,
          rejectRecommendations: 0,
          otherRecommendations: 0
        };
        aggregate.timeline.set(index, bucket);
      }
      updater(bucket);
    };

    for (const evaluation of evaluations) {
      for (const form of evaluation.forms) {
        if (!form.submitted) {
          continue;
        }
        const assignment = assignmentMap.get(buildAssignmentKey(evaluation.id, form.slotId));
        const interviewerName = assignment?.interviewerName ?? form.interviewerName;
        const interviewerEmail = assignment?.interviewerEmail ?? form.interviewerEmail;
        const eventDate = resolveFormEventDate(form, assignment, evaluation);
        if (eventDate < rangeStart || eventDate > rangeEnd) {
          continue;
        }
        const periodIndex = findPeriodIndex(eventDate);
        if (periodIndex === -1) {
          continue;
        }
        const aggregate = getAggregate(interviewerEmail, interviewerName);
        aggregate.interviews += 1;
        if (typeof form.caseScore === 'number' && Number.isFinite(form.caseScore)) {
          aggregate.caseScoreSum += form.caseScore;
          aggregate.caseScoreCount += 1;
        }
        if (typeof form.fitScore === 'number' && Number.isFinite(form.fitScore)) {
          aggregate.fitScoreSum += form.fitScore;
          aggregate.fitScoreCount += 1;
        }
        if (form.offerRecommendation === 'no_offer') {
          aggregate.rejectRecommendations += 1;
        } else if (typeof form.offerRecommendation === 'string' && form.offerRecommendation.startsWith('yes_')) {
          aggregate.hireRecommendations += 1;
        } else {
          aggregate.otherRecommendations += 1;
        }

        updateTimeline(aggregate, periodIndex, (bucket) => {
          bucket.interviews += 1;
          if (typeof form.caseScore === 'number' && Number.isFinite(form.caseScore)) {
            bucket.caseScoreSum += form.caseScore;
            bucket.caseScoreCount += 1;
          }
          if (typeof form.fitScore === 'number' && Number.isFinite(form.fitScore)) {
            bucket.fitScoreSum += form.fitScore;
            bucket.fitScoreCount += 1;
          }
          if (form.offerRecommendation === 'no_offer') {
            bucket.rejectRecommendations += 1;
          } else if (
            typeof form.offerRecommendation === 'string' &&
            form.offerRecommendation.startsWith('yes_')
          ) {
            bucket.hireRecommendations += 1;
          } else {
            bucket.otherRecommendations += 1;
          }
        });
      }
    }

    const interviewers: AnalyticsInterviewerStats[] = Array.from(aggregates.values())
      .map((aggregate) => {
        const timeline: AnalyticsInterviewerTimelinePoint[] = Array.from(aggregate.timeline.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([index, bucket]) => ({
            periodStart: periods[index].start.toISOString(),
            periodEnd: periods[index].end.toISOString(),
            interviews: bucket.interviews,
            averageCaseScore:
              bucket.caseScoreCount > 0 ? bucket.caseScoreSum / bucket.caseScoreCount : null,
            averageFitScore:
              bucket.fitScoreCount > 0 ? bucket.fitScoreSum / bucket.fitScoreCount : null,
            hireRecommendations: bucket.hireRecommendations,
            rejectRecommendations: bucket.rejectRecommendations,
            otherRecommendations: bucket.otherRecommendations
          }));

        return {
          interviewerEmail: aggregate.interviewerEmail,
          interviewerName: aggregate.interviewerName,
          interviews: aggregate.interviews,
          averageCaseScore:
            aggregate.caseScoreCount > 0 ? aggregate.caseScoreSum / aggregate.caseScoreCount : null,
          averageFitScore:
            aggregate.fitScoreCount > 0 ? aggregate.fitScoreSum / aggregate.fitScoreCount : null,
          hireRecommendations: aggregate.hireRecommendations,
          rejectRecommendations: aggregate.rejectRecommendations,
          otherRecommendations: aggregate.otherRecommendations,
          timeline
        } satisfies AnalyticsInterviewerStats;
      })
      .sort((a, b) => b.interviews - a.interviews || a.interviewerName.localeCompare(b.interviewerName));

    const availableInterviewers = interviewers
      .map((item) => ({ interviewerEmail: item.interviewerEmail, interviewerName: item.interviewerName }))
      .sort((a, b) => a.interviewerName.localeCompare(b.interviewerName));

    return {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      granularity,
      interviewers,
      availableInterviewers
    } satisfies AnalyticsInterviewersResponse;
  }
}
