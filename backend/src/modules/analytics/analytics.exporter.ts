import {
  AnalyticsInterviewersResponse,
  AnalyticsSummaryResponse,
  AnalyticsTimeSeriesResponse
} from './analytics.types.js';

const formatCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'number' ? String(value) : value;
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildCsv = (rows: Array<Array<string | number | null | undefined>>): Buffer => {
  const content = rows.map((row) => row.map((cell) => formatCell(cell)).join(',')).join('\n');
  return Buffer.from(content, 'utf-8');
};

export const buildSummaryExport = (summary: AnalyticsSummaryResponse): Buffer => {
  return buildCsv([
    ['Metric', 'Value', 'Numerator', 'Denominator'],
    ['Female share', summary.metrics.femaleShare.value, summary.metrics.femaleShare.numerator, summary.metrics.femaleShare.denominator],
    [
      'Offer acceptance rate',
      summary.metrics.offerAcceptanceRate.value,
      summary.metrics.offerAcceptanceRate.numerator,
      summary.metrics.offerAcceptanceRate.denominator
    ],
    ['Offer rate', summary.metrics.offerRate.value, summary.metrics.offerRate.numerator, summary.metrics.offerRate.denominator]
  ]);
};

export const buildTimeSeriesExport = (series: AnalyticsTimeSeriesResponse): Buffer => {
  const rows: Array<Array<string | number | null>> = [
    [
      'Period start',
      'Period end',
      'Resumes',
      'First round',
      'Second round',
      'Total interviews',
      'Rejections',
      'Offers',
      'Average case score',
      'Average fit score',
      'Female share'
    ]
  ];

  series.points.forEach((point) => {
    rows.push([
      point.periodStart,
      point.periodEnd,
      point.resumesReceived,
      point.firstRoundInterviews,
      point.secondRoundInterviews,
      point.totalInterviews,
      point.rejections,
      point.offers,
      point.averageCaseScore,
      point.averageFitScore,
      point.femaleShare
    ]);
  });

  return buildCsv(rows);
};

export const buildInterviewersExport = (data: AnalyticsInterviewersResponse): Buffer => {
  const rows: Array<Array<string | number | null>> = [
    [
      'Dataset',
      'Interviewer',
      'Email',
      'Period start',
      'Period end',
      'Interviews',
      'Average case score',
      'Average fit score',
      'Hire recommendations',
      'Reject recommendations',
      'Other recommendations'
    ]
  ];

  data.interviewers.forEach((item) => {
    rows.push([
      'total',
      item.interviewerName,
      item.interviewerEmail ?? null,
      null,
      null,
      item.interviews,
      item.averageCaseScore,
      item.averageFitScore,
      item.hireRecommendations,
      item.rejectRecommendations,
      item.otherRecommendations
    ]);

    item.timeline.forEach((point) => {
      rows.push([
        'timeline',
        item.interviewerName,
        item.interviewerEmail ?? null,
        point.periodStart,
        point.periodEnd,
        point.interviews,
        point.averageCaseScore,
        point.averageFitScore,
        point.hireRecommendations,
        point.rejectRecommendations,
        point.otherRecommendations
      ]);
    });
  });

  return buildCsv(rows);
};
