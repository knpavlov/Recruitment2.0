import { aggregateInterviewerGraphBuckets } from '../utils/interviewerGraph';
import type { InterviewerStatsResponse } from '../types/analytics';

const formatCell = (value: number, precision: number, available: boolean) => {
  if (!available || !Number.isFinite(value)) {
    return '';
  }
  return value.toFixed(precision);
};

const triggerCsvDownload = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

export const downloadInterviewerGraphReport = (data: InterviewerStatsResponse) => {
  // Сборка CSV строится на готовых агрегатах, чтобы формат совпадал с отчётом по временной шкале
  const aggregates = aggregateInterviewerGraphBuckets(data);
  const header = [
    'bucket_start',
    'avg_interviews_per_interviewer',
    'avg_hire_share',
    'avg_case_score',
    'avg_fit_score'
  ];
  const lines = [header.join(',')];

  aggregates.forEach((bucket) => {
    const row = [
      bucket.bucket,
      formatCell(bucket.interviews, 2, bucket.interviewerCount > 0),
      formatCell(bucket.hireShare, 4, bucket.hireShareSamples > 0),
      formatCell(bucket.caseScore, 2, bucket.caseScoreSamples > 0),
      formatCell(bucket.fitScore, 2, bucket.fitScoreSamples > 0)
    ];
    lines.push(row.join(','));
  });

  triggerCsvDownload(lines.join('\n'), 'analytics-interviewer-graph.csv');
};
