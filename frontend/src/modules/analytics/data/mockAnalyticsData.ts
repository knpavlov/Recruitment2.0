import { AnalyticsData, AnalyticsSnapshot, InterviewerSnapshot } from '../types';

const INTERVIEWERS = [
  { id: 'int-01', name: 'Анна Власова', email: 'anna.vlasova@example.com' },
  { id: 'int-02', name: 'Дмитрий Орлов', email: 'd.orlov@example.com' },
  { id: 'int-03', name: 'Мария Петрова', email: 'maria.petrova@example.com' },
  { id: 'int-04', name: 'Игорь Соколов', email: 'igor.sokolov@example.com' },
  { id: 'int-05', name: 'Екатерина Нестерова', email: 'katya.nesterova@example.com' }
];

const weeksBetween = (start: Date, count: number): Date[] => {
  const result: Date[] = [];
  for (let index = 0; index < count; index += 1) {
    const point = new Date(start);
    point.setDate(point.getDate() + index * 7);
    result.push(point);
  }
  return result;
};

const createRandomGenerator = (seedStart: number) => {
  let seed = seedStart;
  return () => {
    const x = Math.sin(seed) * 10000;
    seed += 1;
    return x - Math.floor(x);
  };
};

const generateTimeline = (): AnalyticsSnapshot[] => {
  const baseDate = new Date('2022-07-04T00:00:00.000Z');
  const weeks = weeksBetween(baseDate, 82);
  const random = createRandomGenerator(17);
  const timeline: AnalyticsSnapshot[] = [];

  for (const point of weeks) {
    const seasonFactor = 0.8 + Math.sin(point.getMonth() / 12) * 0.2;
    const resumeCount = Math.round(35 + random() * 25 * seasonFactor);
    const firstRound = Math.max(0, Math.round(resumeCount * (0.45 + random() * 0.12)));
    const secondRound = Math.max(0, Math.round(firstRound * (0.55 + random() * 0.18)));
    const offerCount = Math.max(0, Math.round(secondRound * (0.32 + random() * 0.18)));
    const offerAccepted = Math.min(offerCount, Math.round(offerCount * (0.6 + random() * 0.2)));
    const rejectCount = Math.max(0, Math.round(resumeCount * (0.28 + random() * 0.16)));
    const totalInterviews = firstRound + secondRound + Math.round(random() * 6);
    const femaleCandidates = Math.max(0, Math.round(resumeCount * (0.38 + random() * 0.18)));
    const scoreCount = Math.max(totalInterviews, 1);
    const caseScoreAvg = 3.1 + random() * 1.2;
    const fitScoreAvg = 3.2 + random() * 1.1;

    timeline.push({
      date: point.toISOString(),
      resumeCount,
      firstRoundCount: firstRound,
      secondRoundCount: secondRound,
      totalInterviewCount: totalInterviews,
      rejectCount,
      offerCount,
      offerAcceptedCount: offerAccepted,
      femaleCandidates,
      totalCandidates: resumeCount,
      caseScoreSum: caseScoreAvg * scoreCount,
      fitScoreSum: fitScoreAvg * scoreCount,
      scoreCount
    });
  }

  return timeline;
};

const generateInterviewerSnapshots = (timeline: AnalyticsSnapshot[]): InterviewerSnapshot[] => {
  const random = createRandomGenerator(211);
  const snapshots: InterviewerSnapshot[] = [];

  for (const entry of timeline) {
    for (const interviewer of INTERVIEWERS) {
      const interviews = Math.max(0, Math.round(random() * 5 - 0.5));
      if (interviews === 0) {
        continue;
      }
      const scoreCount = Math.max(1, interviews - Math.round(random()));
      const caseScoreAvg = 3 + random() * 1.3;
      const fitScoreAvg = 3 + random() * 1.2;
      const hireRecommendations = Math.round(interviews * (0.45 + random() * 0.2));
      const rejectRecommendations = Math.max(0, Math.round(interviews * (0.3 + random() * 0.2)));

      snapshots.push({
        date: entry.date,
        interviewerId: interviewer.id,
        interviewerName: interviewer.name,
        interviewerEmail: interviewer.email,
        interviews,
        caseScoreSum: caseScoreAvg * scoreCount,
        fitScoreSum: fitScoreAvg * scoreCount,
        scoreCount,
        hireRecommendations,
        rejectRecommendations
      });
    }
  }

  return snapshots;
};

const timeline = generateTimeline();
const interviewers = generateInterviewerSnapshots(timeline);

export const analyticsMockData: AnalyticsData = {
  timeline,
  interviewers,
  financialYearStartMonth: 4
};
