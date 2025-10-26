
import { createHash } from 'crypto';
import { postgresPool } from '../shared/database/postgres.client.js';
import { runMigrations } from '../shared/database/migrations.js';

// Helper that produces a deterministic UUID derived from a string value
const toUuid = (value: string): string => {
  const hash = createHash('sha256').update(value).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};


interface DatabaseClient {
  query: <T = any>(query: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  release: () => void;
}

const referenceNow = new Date();

// Базовый час отправки формы, если он не задан явно
const BASE_FORM_SUBMISSION_HOUR = 11;
// Сдвиг между интервью по умолчанию, чтобы их метки не накладывались
const INTERVIEW_OFFSET_HOURS = 30;

// Returns a past date offset by the provided number of days and a fixed time of day
const daysAgo = (offset: number, hour = 10, minute = 0) => {
  const date = new Date(referenceNow.getTime());
  date.setUTCDate(date.getUTCDate() - offset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
};

const interviewerDirectory: Record<string, string> = {
  'knpavlov@gmail.com': 'Konstantin Pavlov',
  'kpavlov.me@gmail.com': 'Konstantin Pavlov (personal)',
  'konst-pavlov@mail.ru': 'Konstantin Pavlov (Mail.ru)',
  'kpavlov@alvarezandmarsal.com': 'Konstantin Pavlov (A&M)'
};

type CaseFolderKey =
  | 'infrastructure'
  | 'retail-pricing'
  | 'supply-chain'
  | 'digital-growth';

type FitQuestionKey = 'client-trust' | 'leadership' | 'collaboration';

interface CaseFolderReference {
  key: CaseFolderKey;
  name: string;
}

interface FitQuestionReference {
  key: FitQuestionKey;
  shortTitle: string;
}

const CASE_FOLDER_REFERENCES: CaseFolderReference[] = [
  { key: 'infrastructure', name: 'ANZ Infrastructure Rollout' },
  { key: 'retail-pricing', name: 'Retail Pricing Diagnostic' },
  { key: 'supply-chain', name: 'Supply Chain Reset - FMCG' },
  { key: 'digital-growth', name: 'Digital Growth Strategy' }
];

const FIT_QUESTION_REFERENCES: FitQuestionReference[] = [
  { key: 'client-trust', shortTitle: 'Building client trust' },
  { key: 'leadership', shortTitle: 'Leading through ambiguity' },
  { key: 'collaboration', shortTitle: 'Driving collaboration' }
];

interface CriterionSeed {
  criterionId: string;
  score?: number;
  notApplicable?: boolean;
}

interface InterviewSeed {
  slotId: string;
  interviewerEmail: keyof typeof interviewerDirectory;
  caseFolder: CaseFolderKey;
  fitQuestion: FitQuestionKey;
  invitationSentDaysAgo: number;
  submittedDaysAgo: number;
  submittedHour?: number;
  fitScore?: number;
  caseScore?: number;
  notes: string;
  fitNotes?: string;
  caseNotes?: string;
  interestNotes?: string;
  issuesToTest?: string;
  offerRecommendation?: 'yes_priority' | 'yes_strong' | 'yes_keep_warm' | 'no_offer';
  fitCriteria?: CriterionSeed[];
  caseCriteria?: CriterionSeed[];
}

interface RoundSeed {
  roundNumber: number;
  processStartedDaysAgo: number;
  completedDaysAgo: number;
  decision: 'offer' | 'accepted-offer' | 'reject' | 'progress';
  interviews: InterviewSeed[];
}

interface EvaluationSeed {
  decision: 'offer' | 'accepted-offer' | 'reject' | 'progress';
  rounds: RoundSeed[];
}

interface CandidateSeed {
  key: string;
  firstName: string;
  lastName: string;
  gender: 'female' | 'male';
  age: number;
  city: string;
  desiredPosition: string;
  targetPractice: string;
  targetOffice: string;
  phone: string;
  email: string;
  experienceSummary: string;
  totalExperienceYears: number;
  consultingExperienceYears: number;
  consultingCompanies: string;
  lastCompany: string;
  lastPosition: string;
  lastDuration: string;
  appliedDaysAgo: number;
  evaluation: EvaluationSeed;
}

const candidates: CandidateSeed[] = [
  {
    key: 'amelia-nguyen',
    firstName: 'Amelia',
    lastName: 'Nguyen',
    gender: 'female',
    age: 29,
    city: 'Sydney',
    desiredPosition: 'Senior Associate',
    targetPractice: 'Corporate Finance',
    targetOffice: 'Sydney',
    phone: '+61 415 203 884',
    email: 'amelia.nguyen@example.com',
    experienceSummary:
      'Has spent six years helping infrastructure and telecom clients evaluate investments and optimise CAPEX and has led project teams for the last two years.',
    totalExperienceYears: 6,
    consultingExperienceYears: 4,
    consultingCompanies: 'Deloitte Australia, KPMG Australia',
    lastCompany: 'Deloitte Australia',
    lastPosition: 'Manager, Strategy & Operations',
    lastDuration: '2 years',
    appliedDaysAgo: 55,
    evaluation: {
      decision: 'offer',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 50,
          completedDaysAgo: 44,
          decision: 'progress',
          interviews: [
            {
              slotId: 'amelia-r1-1',
              interviewerEmail: 'kpavlov@alvarezandmarsal.com',
              caseFolder: 'retail-pricing',
              fitQuestion: 'client-trust',
              invitationSentDaysAgo: 49,
              submittedDaysAgo: 45,
              fitScore: 4.5,
              caseScore: 4.2,
              notes:
                'Structured the financial model answer immediately without prompts, asked relevant regional sensitivity questions, and closed with a clear implementation plan.',
              fitNotes:
                'Gave a convincing example of managing client expectations on a pricing project and was transparent about where director-level support was needed.',
              caseNotes:
                'Suggested a three-cluster assortment segmentation and embraced pilot store testing, calculating the impact on basket size.',
              interestNotes: 'Open to travel across Australia and New Zealand with a preference for operations improvement engagements.',
              issuesToTest: 'Use round two to double-check depth of financial modelling and handling of conflicting stakeholders.',
              offerRecommendation: 'yes_strong',
              fitCriteria: [
                { criterionId: 'fit-communication', score: 5 },
                { criterionId: 'fit-leadership', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 4 },
                { criterionId: 'case-quant', score: 4 }
              ]
            },
            {
              slotId: 'amelia-r1-2',
              interviewerEmail: 'knpavlov@gmail.com',
              caseFolder: 'supply-chain',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 48,
              submittedDaysAgo: 44,
              fitScore: 4.2,
              caseScore: 4.4,
              notes:
                'Quickly highlighted supply-chain bottlenecks, prepared a stakeholder map in advance, and proposed a realistic roadmap that accounts for seasonality.',
              fitNotes: 'Strong story about standing up a cross-functional PMO for an energy client.',
              caseNotes: 'Comfortable with numbers, proactively asked for inventory turns and built the savings model without errors.',
              interestNotes: 'Keen on industrial clients and ready to support internal DEI initiatives.',
              offerRecommendation: 'yes_strong',
              fitCriteria: [
                { criterionId: 'fit-collaboration', score: 4 },
                { criterionId: 'fit-drive', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-problem-solving', score: 5 },
                { criterionId: 'case-communication', score: 4 }
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          processStartedDaysAgo: 14,
          completedDaysAgo: 6,
          decision: 'offer',
          interviews: [
            {
              slotId: 'amelia-r2-1',
              interviewerEmail: 'kpavlov.me@gmail.com',
              caseFolder: 'digital-growth',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 15,
              submittedDaysAgo: 6,
              submittedHour: 9,
              fitScore: 4.8,
              caseScore: 4.6,
              notes:
                'Showed mature strategic thinking in round two: prioritised digital channels immediately and outlined a roadmap with quick wins.',
              fitNotes: 'Compelling leadership example: took over a loss-making branch and stabilised the P&L in three months.',
              caseNotes: 'Estimated CAC and LTV correctly, spotted cannibalisation risk early, and suggested an A/B testing approach.',
              offerRecommendation: 'yes_priority',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 5 },
                { criterionId: 'fit-growth-mindset', score: 5 }
              ],
              caseCriteria: [
                { criterionId: 'case-insight', score: 5 },
                { criterionId: 'case-rigor', score: 4 }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    key: 'oliver-chen',
    firstName: 'Oliver',
    lastName: 'Chen',
    gender: 'male',
    age: 31,
    city: 'Melbourne',
    desiredPosition: 'Engagement Manager',
    targetPractice: 'Performance Improvement',
    targetOffice: 'Melbourne',
    phone: '+61 430 118 552',
    email: 'oliver.chen@example.com',
    experienceSummary:
      'Seven years in industrial operations transformations with hands-on experience building KPI systems and launching lean programmes.',
    totalExperienceYears: 7,
    consultingExperienceYears: 5,
    consultingCompanies: 'EY-Parthenon, Bain & Company',
    lastCompany: 'EY-Parthenon',
    lastPosition: 'Manager, Operations Excellence',
    lastDuration: '3 years',
    appliedDaysAgo: 47,
    evaluation: {
      decision: 'reject',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 42,
          completedDaysAgo: 38,
          decision: 'progress',
          interviews: [
            {
              slotId: 'oliver-r1-1',
              interviewerEmail: 'konst-pavlov@mail.ru',
              caseFolder: 'supply-chain',
              fitQuestion: 'client-trust',
              invitationSentDaysAgo: 41,
              submittedDaysAgo: 39,
              fitScore: 3.6,
              caseScore: 3.8,
              notes:
                'Maintained structure but drifted into detail. Understood warehouse constraints well and proposed a phased rollout plan.',
              fitNotes: 'Nickel mining client story sounded credible, though team roles could have been clearer.',
              caseNotes: 'Savings calculation was correct, yet the closing synthesis could link more explicitly to NPS impact.',
              offerRecommendation: 'yes_keep_warm',
              fitCriteria: [
                { criterionId: 'fit-ownership', score: 4 },
                { criterionId: 'fit-collaboration', score: 3 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 4 },
                { criterionId: 'case-creativity', score: 3 }
              ]
            },
            {
              slotId: 'oliver-r1-2',
              interviewerEmail: 'kpavlov@alvarezandmarsal.com',
              caseFolder: 'infrastructure',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 40,
              submittedDaysAgo: 38,
              fitScore: 2.8,
              caseScore: 3.2,
              notes:
                'Lost track on capital expenditure questions, confused project timelines, and did not validate contractor risks.',
              fitNotes: 'Complex client story was high level and did not unpack his individual contribution.',
              caseNotes: 'Made repeated calculation mistakes and had to recompute IRR twice.',
              issuesToTest: 'If he proceeds, focus on financial analytics depth and leadership evidence.',
              offerRecommendation: 'no_offer',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 2 },
                { criterionId: 'fit-communication', score: 3 }
              ],
              caseCriteria: [
                { criterionId: 'case-rigor', score: 2 },
                { criterionId: 'case-synthesis', score: 3 }
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          processStartedDaysAgo: 18,
          completedDaysAgo: 17,
          decision: 'reject',
          interviews: [
            {
              slotId: 'oliver-r2-1',
              interviewerEmail: 'knpavlov@gmail.com',
              caseFolder: 'retail-pricing',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 19,
              submittedDaysAgo: 17,
              fitScore: 2.5,
              caseScore: 2.8,
              notes:
                'Could not build the promotion economics, missed the margin impact, and abandoned the hypothesis without justification.',
              fitNotes: 'Gave a formal answer when asked about a failed initiative and avoided ownership.',
              caseNotes: 'Needed heavy steering on the calculations and did not tie conclusions back to data.',
              offerRecommendation: 'no_offer',
              fitCriteria: [
                { criterionId: 'fit-resilience', score: 2 },
                { criterionId: 'fit-drive', score: 2 }
              ],
              caseCriteria: [
                { criterionId: 'case-quant', score: 2 },
                { criterionId: 'case-communication', score: 3 }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    key: 'priya-raman',
    firstName: 'Priya',
    lastName: 'Raman',
    gender: 'female',
    age: 27,
    city: 'Brisbane',
    desiredPosition: 'Consultant',
    targetPractice: 'Private Equity',
    targetOffice: 'Brisbane',
    phone: '+61 402 772 915',
    email: 'priya.raman@example.com',
    experienceSummary:
      'Four years in commercial due diligence for PE and corporate buyers with strong market modelling and customer interview skills.',
    totalExperienceYears: 4,
    consultingExperienceYears: 4,
    consultingCompanies: 'Strategy&, PwC Deals',
    lastCompany: 'Strategy&',
    lastPosition: 'Senior Associate, Commercial Due Diligence',
    lastDuration: '1.5 years',
    appliedDaysAgo: 40,
    evaluation: {
      decision: 'progress',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 34,
          completedDaysAgo: 30,
          decision: 'progress',
          interviews: [
            {
              slotId: 'priya-r1-1',
              interviewerEmail: 'kpavlov@alvarezandmarsal.com',
              caseFolder: 'digital-growth',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 33,
              submittedDaysAgo: 31,
              fitScore: 4,
              caseScore: 3.9,
              notes:
                'Built a crisp view of the target market and quickly surfaced the growth drivers. Comfortable when referencing client examples.',
              fitNotes: 'Multifunctional team story was detailed and demonstrated awareness of political nuances.',
              caseNotes: 'Minor arithmetic slip but she caught and corrected it herself.',
              offerRecommendation: 'yes_keep_warm',
              fitCriteria: [
                { criterionId: 'fit-collaboration', score: 4 },
                { criterionId: 'fit-communication', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 4 },
                { criterionId: 'case-insight', score: 4 }
              ]
            },
            {
              slotId: 'priya-r1-2',
              interviewerEmail: 'konst-pavlov@mail.ru',
              caseFolder: 'retail-pricing',
              fitQuestion: 'client-trust',
              invitationSentDaysAgo: 32,
              submittedDaysAgo: 30,
              fitScore: 3.8,
              caseScore: 4,
              notes:
                'Calculated LTV across client segments and quickly framed churn hypotheses. Very sharp analytical accuracy.',
              fitNotes: 'Story about rebuilding investor trust was persuasive.',
              caseNotes: 'Delivered a strong final recommendation with a clear set of quick wins.',
              offerRecommendation: 'yes_strong',
              fitCriteria: [
                { criterionId: 'fit-ownership', score: 4 },
                { criterionId: 'fit-drive', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-quant', score: 4 },
                { criterionId: 'case-synthesis', score: 4 }
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          processStartedDaysAgo: 9,
          completedDaysAgo: 4,
          decision: 'progress',
          interviews: [
            {
              slotId: 'priya-r2-1',
              interviewerEmail: 'kpavlov.me@gmail.com',
              caseFolder: 'supply-chain',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 10,
              submittedDaysAgo: 4,
              fitScore: 4.2,
              caseScore: 4.1,
              notes:
                'Confident second round: Priya built a due diligence plan with concrete cut-off dates and thought through investment committee communications.',
              fitNotes: 'Demonstrated a mature approach to managing team workload and escalating risks.',
              caseNotes: 'Calculated the EBITDA bridge and proactively described commodity sensitivities.',
              offerRecommendation: 'yes_keep_warm',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 4 },
                { criterionId: 'fit-resilience', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-communication', score: 4 },
                { criterionId: 'case-rigor', score: 4 }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    key: 'ethan-wallace',
    firstName: 'Ethan',
    lastName: 'Wallace',
    gender: 'male',
    age: 35,
    city: 'Sydney',
    desiredPosition: 'Senior Manager',
    targetPractice: 'Restructuring',
    targetOffice: 'Sydney',
    phone: '+61 419 882 337',
    email: 'ethan.wallace@example.com',
    experienceSummary:
      'Ten years in restructuring mandates leading cash-flow stabilisation work and negotiating with creditor groups.',
    totalExperienceYears: 10,
    consultingExperienceYears: 7,
    consultingCompanies: 'Alvarez & Marsal, McKinsey & Company',
    lastCompany: 'Alvarez & Marsal',
    lastPosition: 'Director, Turnaround & Restructuring',
    lastDuration: '4 years',
    appliedDaysAgo: 52,
    evaluation: {
      decision: 'reject',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 46,
          completedDaysAgo: 43,
          decision: 'progress',
          interviews: [
            {
              slotId: 'ethan-r1-1',
              interviewerEmail: 'knpavlov@gmail.com',
              caseFolder: 'infrastructure',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 45,
              submittedDaysAgo: 44,
              fitScore: 3.5,
              caseScore: 3.7,
              notes:
                'Set up the structure but simplified the legal constraints too aggressively. Conversation flow was solid.',
              fitNotes: 'Bank negotiations example felt genuine but lacked metrics to show success.',
              caseNotes: 'Handled the liquidity calculation yet needed prompts for the step order.',
              offerRecommendation: 'yes_keep_warm',
              fitCriteria: [
                { criterionId: 'fit-communication', score: 3 },
                { criterionId: 'fit-leadership', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 4 },
                { criterionId: 'case-creativity', score: 3 }
              ]
            },
            {
              slotId: 'ethan-r1-2',
              interviewerEmail: 'kpavlov.me@gmail.com',
              caseFolder: 'supply-chain',
              fitQuestion: 'client-trust',
              invitationSentDaysAgo: 44,
              submittedDaysAgo: 43,
              fitScore: 3.2,
              caseScore: 3.3,
              notes:
                'Missed opportunities for quick working-capital stabilisation in the supply-chain case and focused on long-term levers.',
              fitNotes: 'Failed project story raised questions and he did not articulate the lessons learned.',
              caseNotes: 'Inventory reduction calculations required several corrections.',
              offerRecommendation: 'no_offer',
              fitCriteria: [
                { criterionId: 'fit-resilience', score: 3 },
                { criterionId: 'fit-drive', score: 3 }
              ],
              caseCriteria: [
                { criterionId: 'case-rigor', score: 3 },
                { criterionId: 'case-quant', score: 3 }
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          processStartedDaysAgo: 20,
          completedDaysAgo: 12,
          decision: 'reject',
          interviews: [
            {
              slotId: 'ethan-r2-1',
              interviewerEmail: 'konst-pavlov@mail.ru',
              caseFolder: 'digital-growth',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 21,
              submittedDaysAgo: 12,
              fitScore: 2.9,
              caseScore: 3,
              notes:
                'Final interview lacked depth on scenario planning and risk management questions.',
              fitNotes: 'Leadership examples felt tired and showed limited energy for team development.',
              caseNotes: 'Did not calculate the cash conversion cycle impact until prompted.',
              offerRecommendation: 'no_offer',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 3 },
                { criterionId: 'fit-communication', score: 3 }
              ],
              caseCriteria: [
                { criterionId: 'case-communication', score: 3 },
                { criterionId: 'case-insight', score: 3 }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    key: 'sofia-alvarez',
    firstName: 'Sofia',
    lastName: 'Alvarez',
    gender: 'female',
    age: 33,
    city: 'Melbourne',
    desiredPosition: 'Principal',
    targetPractice: 'Transactions & Strategy',
    targetOffice: 'Melbourne',
    phone: '+61 422 190 664',
    email: 'sofia.alvarez@example.com',
    experienceSummary:
      'Leads large energy-sector transactions and aligns legal, financial, and operational workstreams across M&A programmes.',
    totalExperienceYears: 11,
    consultingExperienceYears: 8,
    consultingCompanies: 'Strategy&, Oliver Wyman',
    lastCompany: 'Oliver Wyman',
    lastPosition: 'Principal, Energy Practice',
    lastDuration: '3 years',
    appliedDaysAgo: 44,
    evaluation: {
      decision: 'accepted-offer',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 37,
          completedDaysAgo: 34,
          decision: 'progress',
          interviews: [
            {
              slotId: 'sofia-r1-1',
              interviewerEmail: 'kpavlov@alvarezandmarsal.com',
              caseFolder: 'infrastructure',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 36,
              submittedDaysAgo: 34,
              fitScore: 4.6,
              caseScore: 4.5,
              notes:
                'Held the strategic line from the first question, ran her own sensitivity analysis, and proposed a regulator negotiation plan.',
              fitNotes: 'Powerful example of crisis leadership during a renewables transaction.',
              caseNotes: 'Exceptionally strong with the numbers and delivered a crisp synthesised recommendation.',
              offerRecommendation: 'yes_priority',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 5 },
                { criterionId: 'fit-collaboration', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-synthesis', score: 5 },
                { criterionId: 'case-quant', score: 4 }
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          processStartedDaysAgo: 11,
          completedDaysAgo: 3,
          decision: 'accepted-offer',
          interviews: [
            {
              slotId: 'sofia-r2-1',
              interviewerEmail: 'knpavlov@gmail.com',
              caseFolder: 'digital-growth',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 12,
              submittedDaysAgo: 4,
              fitScore: 4.7,
              caseScore: 4.4,
              notes:
                'Brought excellent ideas for integrating digital channels post-merger and mapped the change management approach with KPIs.',
              fitNotes: 'Impressive story about integrating teams across time zones.',
              caseNotes: 'Synthesis was sharp and she quickly estimated capex requirements and IT risks.',
              offerRecommendation: 'yes_priority',
              fitCriteria: [
                { criterionId: 'fit-collaboration', score: 5 },
                { criterionId: 'fit-communication', score: 5 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 4 },
                { criterionId: 'case-rigor', score: 4 }
              ]
            },
            {
              slotId: 'sofia-r2-2',
              interviewerEmail: 'kpavlov.me@gmail.com',
              caseFolder: 'retail-pricing',
              fitQuestion: 'client-trust',
              invitationSentDaysAgo: 11,
              submittedDaysAgo: 3,
              fitScore: 4.8,
              caseScore: 4.6,
              notes:
                'Outlined a step-by-step value creation plan in the final conversation and anchored it in real deal examples.',
              fitNotes: 'Earned the trust of a portfolio-company CEO within two months — standout story.',
              caseNotes: 'Built the financial model cleanly and identified the key value drivers independently.',
              offerRecommendation: 'yes_priority',
              fitCriteria: [
                { criterionId: 'fit-ownership', score: 5 },
                { criterionId: 'fit-drive', score: 5 }
              ],
              caseCriteria: [
                { criterionId: 'case-communication', score: 4 },
                { criterionId: 'case-insight', score: 5 }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    key: 'liam-oconnor',
    firstName: 'Liam',
    lastName: "O'Connor",
    gender: 'male',
    age: 28,
    city: 'Brisbane',
    desiredPosition: 'Senior Analyst',
    targetPractice: 'Performance Improvement',
    targetOffice: 'Brisbane',
    phone: '+61 408 555 196',
    email: 'liam.oconnor@example.com',
    experienceSummary:
      'Three years in operations consulting focused on warehouse optimisation and reducing logistics costs.',
    totalExperienceYears: 3,
    consultingExperienceYears: 3,
    consultingCompanies: 'Kearney',
    lastCompany: 'Kearney',
    lastPosition: 'Business Analyst',
    lastDuration: '2 years',
    appliedDaysAgo: 36,
    evaluation: {
      decision: 'reject',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 28,
          completedDaysAgo: 24,
          decision: 'reject',
          interviews: [
            {
              slotId: 'liam-r1-1',
              interviewerEmail: 'konst-pavlov@mail.ru',
              caseFolder: 'supply-chain',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 27,
              submittedDaysAgo: 25,
              fitScore: 2.9,
              caseScore: 3,
              notes:
                'Asked for prompts frequently and did not take the analysis through to a conclusion. Fit examples were overly generic.',
              fitNotes: 'Did not demonstrate initiative in difficult situations and leaned on his manager.',
              caseNotes: 'Misestimated savings and required assumption corrections.',
              offerRecommendation: 'no_offer',
              fitCriteria: [
                { criterionId: 'fit-drive', score: 2 },
                { criterionId: 'fit-communication', score: 3 }
              ],
              caseCriteria: [
                { criterionId: 'case-quant', score: 3 },
                { criterionId: 'case-synthesis', score: 2 }
              ]
            },
            {
              slotId: 'liam-r1-2',
              interviewerEmail: 'kpavlov@alvarezandmarsal.com',
              caseFolder: 'retail-pricing',
              fitQuestion: 'client-trust',
              invitationSentDaysAgo: 26,
              submittedDaysAgo: 24,
              fitScore: 2.7,
              caseScore: 2.8,
              notes:
                'Failed to link the sensitivity analysis to a final recommendation and the synthesis was vague.',
              fitNotes: 'Client conflict story was unconvincing and light on facts.',
              caseNotes: 'Forgot to include fixed costs, forcing a rebuild of the model.',
              offerRecommendation: 'no_offer',
              fitCriteria: [
                { criterionId: 'fit-ownership', score: 2 },
                { criterionId: 'fit-resilience', score: 3 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 2 },
                { criterionId: 'case-creativity', score: 2 }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    key: 'harper-smith',
    firstName: 'Harper',
    lastName: 'Smith',
    gender: 'female',
    age: 30,
    city: 'Sydney',
    desiredPosition: 'Engagement Manager',
    targetPractice: 'Digital Transformation',
    targetOffice: 'Sydney',
    phone: '+61 416 782 901',
    email: 'harper.smith@example.com',
    experienceSummary:
      'Eight years driving digital transformations for banks and insurers, launching agile portfolios and shaping design culture.',
    totalExperienceYears: 8,
    consultingExperienceYears: 6,
    consultingCompanies: 'Accenture Strategy, BCG',
    lastCompany: 'BCG',
    lastPosition: 'Project Leader, Digital Transformation',
    lastDuration: '3 years',
    appliedDaysAgo: 33,
    evaluation: {
      decision: 'offer',
      rounds: [
        {
          roundNumber: 1,
          processStartedDaysAgo: 27,
          completedDaysAgo: 22,
          decision: 'progress',
          interviews: [
            {
              slotId: 'harper-r1-1',
              interviewerEmail: 'kpavlov.me@gmail.com',
              caseFolder: 'digital-growth',
              fitQuestion: 'collaboration',
              invitationSentDaysAgo: 26,
              submittedDaysAgo: 23,
              fitScore: 4.3,
              caseScore: 4.1,
              notes:
                'Delivered a thorough diagnostic of the bank’s digital channels and proposed an 18-month release roadmap.',
              fitNotes: 'Great example about launching agile tribes and aligning with IT.',
              caseNotes: 'Quantified cross-sell impact and spotted cannibalisation risks.',
              offerRecommendation: 'yes_strong',
              fitCriteria: [
                { criterionId: 'fit-collaboration', score: 5 },
                { criterionId: 'fit-drive', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-insight', score: 4 },
                { criterionId: 'case-communication', score: 4 }
              ]
            },
            {
              slotId: 'harper-r1-2',
              interviewerEmail: 'konst-pavlov@mail.ru',
              caseFolder: 'supply-chain',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 25,
              submittedDaysAgo: 22,
              fitScore: 4.1,
              caseScore: 3.9,
              notes:
                'In the logistics case she mapped the process quickly and suggested digital monitoring solutions.',
              fitNotes: 'Explained leadership through an upskilling programme very well.',
              caseNotes: 'Maths was tidy and she confidently explained the SLA impact.',
              offerRecommendation: 'yes_keep_warm',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 4 },
                { criterionId: 'fit-communication', score: 4 }
              ],
              caseCriteria: [
                { criterionId: 'case-structure', score: 4 },
                { criterionId: 'case-rigor', score: 3 }
              ]
            }
          ]
        },
        {
          roundNumber: 2,
          processStartedDaysAgo: 8,
          completedDaysAgo: 2,
          decision: 'offer',
          interviews: [
            {
              slotId: 'harper-r2-1',
              interviewerEmail: 'knpavlov@gmail.com',
              caseFolder: 'digital-growth',
              fitQuestion: 'leadership',
              invitationSentDaysAgo: 9,
              submittedDaysAgo: 2,
              fitScore: 4.6,
              caseScore: 4.3,
              notes:
                'In the final interview she laid out a digital bank roadmap with clear KPIs and team structure.',
              fitNotes: 'Powerful example of scaling agile across the whole organisation.',
              caseNotes: 'Stayed focused on value capture and handled the maths confidently.',
              offerRecommendation: 'yes_priority',
              fitCriteria: [
                { criterionId: 'fit-leadership', score: 5 },
                { criterionId: 'fit-communication', score: 5 }
              ],
              caseCriteria: [
                { criterionId: 'case-communication', score: 4 },
                { criterionId: 'case-insight', score: 4 }
              ]
            }
          ]
        }
      ]
    }
  }
];

const computeChecksum = (
  email: string,
  name: string,
  caseFolderId: string,
  fitQuestionId: string
): string => {
  const hash = createHash('sha256');
  hash.update(email ?? '');
  hash.update('|');
  hash.update(name ?? '');
  hash.update('|');
  hash.update(caseFolderId);
  hash.update('|');
  hash.update(fitQuestionId);
  return hash.digest('hex');
};

const loadCaseFolderMap = async (client: DatabaseClient) => {
  const map = new Map<CaseFolderKey, string>();
  for (const reference of CASE_FOLDER_REFERENCES) {
    const result = await client.query<{ id: string }>(
      `SELECT id FROM case_folders WHERE name = $1 ORDER BY updated_at DESC LIMIT 1;`,
      [reference.name]
    );

    if (result.rows.length === 0) {
      throw new Error(`Case folder "${reference.name}" is missing. Create it manually before running the demo seed.`);
    }

    map.set(reference.key, result.rows[0].id);
  }
  return map;
};

const loadFitQuestionMap = async (client: DatabaseClient) => {
  const map = new Map<FitQuestionKey, string>();
  for (const reference of FIT_QUESTION_REFERENCES) {
    const result = await client.query<{ id: string }>(
      `SELECT id FROM fit_questions WHERE short_title = $1 ORDER BY version DESC LIMIT 1;`,
      [reference.shortTitle]
    );

    if (result.rows.length === 0) {
      throw new Error(
        `Fit question with short title "${reference.shortTitle}" is missing. Create it manually before running the demo seed.`
      );
    }

    map.set(reference.key, result.rows[0].id);
  }
  return map;
};

const ensureInterviewerAccounts = async (client: DatabaseClient) => {
  // Проверяем, что все интервьюеры уже имеют аккаунты в системе
  const emails = Object.keys(interviewerDirectory);
  const result = await client.query<{ email: string }>(
    `SELECT email FROM accounts WHERE email = ANY($1::text[]);`,
    [emails]
  );

  const existingEmails = new Set(result.rows.map((row) => row.email.toLowerCase()));
  const missingEmails = emails.filter((email) => !existingEmails.has(email.toLowerCase()));

  if (missingEmails.length > 0) {
    throw new Error(
      `Accounts missing for interviewer emails: ${missingEmails.join(
        ', '
      )}. Create the accounts before running the demo seed.`
    );
  }
};

const main = async () => {
  console.log('Running migrations...');
  await runMigrations();

  const client = await (postgresPool as unknown as { connect: () => Promise<DatabaseClient> }).connect();

  try {
    await client.query('BEGIN');

    console.log('Resolving existing case folders and fit questions...');
    const caseFolderMap = await loadCaseFolderMap(client);
    const fitQuestionMap = await loadFitQuestionMap(client);

    console.log('Validating interviewer accounts...');
    await ensureInterviewerAccounts(client);

    for (const candidate of candidates) {
      const candidateId = toUuid(`candidate:${candidate.key}`);
      const evaluationId = toUuid(`evaluation:${candidate.key}`);

      const candidateCreatedAt = daysAgo(candidate.appliedDaysAgo, 7, 45).toISOString();
      const candidateUpdatedAt = daysAgo(candidate.appliedDaysAgo - 1, 9, 0).toISOString();

      await client.query(
        `INSERT INTO candidates (
           id, first_name, last_name, gender, age, city, desired_position,
           target_practice, target_office, phone, email, experience_summary,
           total_experience_years, consulting_experience_years, consulting_companies,
           last_company, last_position, last_duration, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, $9, $10, $11, $12,
           $13, $14, $15,
           $16, $17, $18, $19, $20
         )
         ON CONFLICT (id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           gender = EXCLUDED.gender,
           age = EXCLUDED.age,
           city = EXCLUDED.city,
           desired_position = EXCLUDED.desired_position,
           target_practice = EXCLUDED.target_practice,
           target_office = EXCLUDED.target_office,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           experience_summary = EXCLUDED.experience_summary,
           total_experience_years = EXCLUDED.total_experience_years,
           consulting_experience_years = EXCLUDED.consulting_experience_years,
           consulting_companies = EXCLUDED.consulting_companies,
           last_company = EXCLUDED.last_company,
           last_position = EXCLUDED.last_position,
           last_duration = EXCLUDED.last_duration,
           updated_at = EXCLUDED.updated_at;`,
        [
          candidateId,
          candidate.firstName,
          candidate.lastName,
          candidate.gender,
          candidate.age,
          candidate.city,
          candidate.desiredPosition,
          candidate.targetPractice,
          candidate.targetOffice,
          candidate.phone,
          candidate.email,
          candidate.experienceSummary,
          candidate.totalExperienceYears,
          candidate.consultingExperienceYears,
          candidate.consultingCompanies,
          candidate.lastCompany,
          candidate.lastPosition,
          candidate.lastDuration,
          candidateCreatedAt,
          candidateUpdatedAt
        ]
      );

      const roundsPayload = candidate.evaluation.rounds.map((round) => {
        const processStartedAt = daysAgo(round.processStartedDaysAgo, 8, 30);
        const completedAt = daysAgo(round.completedDaysAgo, 13, 15);
        const createdAt = daysAgo(round.processStartedDaysAgo, 8, 0);

        const interviews = round.interviews.map((interview) => ({
          id: interview.slotId,
          interviewerName: interviewerDirectory[interview.interviewerEmail],
          interviewerEmail: interview.interviewerEmail,
          caseFolderId: caseFolderMap.get(interview.caseFolder)!,
          fitQuestionId: fitQuestionMap.get(interview.fitQuestion)!
        }));

        const forms = round.interviews.map((interview, index) => {
          const submissionHour =
            interview.submittedHour ?? BASE_FORM_SUBMISSION_HOUR + index * INTERVIEW_OFFSET_HOURS;
          const submittedAt = daysAgo(
            interview.submittedDaysAgo,
            submissionHour,
            index % 2 === 0 ? 20 : 45
          ).toISOString();
          return {
            slotId: interview.slotId,
            interviewerName: interviewerDirectory[interview.interviewerEmail],
            submitted: true,
            submittedAt,
            notes: interview.notes,
            fitScore: interview.fitScore,
            caseScore: interview.caseScore,
            fitNotes: interview.fitNotes,
            caseNotes: interview.caseNotes,
            interestNotes: interview.interestNotes,
            issuesToTest: interview.issuesToTest,
            offerRecommendation: interview.offerRecommendation,
            fitCriteria: interview.fitCriteria ?? [],
            caseCriteria: interview.caseCriteria ?? []
          };
        });

        return {
          roundNumber: round.roundNumber,
          interviewCount: round.interviews.length,
          interviews,
          forms,
          fitQuestionId: interviews[0]?.fitQuestionId,
          processStatus: 'completed',
          processStartedAt: processStartedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          createdAt: createdAt.toISOString(),
          decision: round.decision
        };
      });

      const totalInterviews = candidate.evaluation.rounds.reduce(
        (sum, round) => sum + round.interviews.length,
        0
      );

      const oldestRound = candidate.evaluation.rounds.reduce((oldest, round) =>
        round.processStartedDaysAgo > oldest.processStartedDaysAgo ? round : oldest
      );
      const latestRound = candidate.evaluation.rounds.reduce((latest, round) =>
        round.completedDaysAgo < latest.completedDaysAgo ? round : latest
      );
      const processStatus =
        candidate.evaluation.decision === 'progress' ? 'in-progress' : 'completed';

      const evaluationCreatedAt = daysAgo(oldestRound.processStartedDaysAgo + 1, 12, 0);
      const evaluationUpdatedAt = daysAgo(latestRound.completedDaysAgo, 15, 30);
      const evaluationProcessStartedAt = daysAgo(oldestRound.processStartedDaysAgo, 8, 30).toISOString();

      await client.query(
        `INSERT INTO evaluations (
           id, candidate_id, round_number, interview_count, interviews,
           version, created_at, updated_at, forms, process_status,
           process_started_at, round_history, decision
         ) VALUES (
           $1, $2, $3, $4, $5::jsonb,
           1, $6, $7, $8::jsonb, $9,
           $10, $11::jsonb, $12
         )
         ON CONFLICT (id) DO UPDATE SET
           candidate_id = EXCLUDED.candidate_id,
           round_number = EXCLUDED.round_number,
           interview_count = EXCLUDED.interview_count,
           interviews = EXCLUDED.interviews,
           updated_at = EXCLUDED.updated_at,
           forms = EXCLUDED.forms,
           process_status = EXCLUDED.process_status,
           process_started_at = EXCLUDED.process_started_at,
           round_history = EXCLUDED.round_history,
           decision = EXCLUDED.decision;`,
        [
          evaluationId,
          candidateId,
          Math.max(...candidate.evaluation.rounds.map((round) => round.roundNumber)),
          totalInterviews,
          JSON.stringify([]),
          evaluationCreatedAt.toISOString(),
          evaluationUpdatedAt.toISOString(),
          JSON.stringify([]),
          processStatus,
          evaluationProcessStartedAt,
          JSON.stringify(roundsPayload),
          candidate.evaluation.decision
        ]
      );

      await client.query(`DELETE FROM evaluation_assignments WHERE evaluation_id = $1;`, [evaluationId]);

      for (const round of candidate.evaluation.rounds) {
        for (const interview of round.interviews) {
          const assignmentId = toUuid(`assignment:${candidate.key}:${interview.slotId}`);
          const caseFolderId = caseFolderMap.get(interview.caseFolder)!;
          const fitQuestionId = fitQuestionMap.get(interview.fitQuestion)!;
          const interviewerName = interviewerDirectory[interview.interviewerEmail];
          const invitationSentAt = daysAgo(interview.invitationSentDaysAgo, 7, 15).toISOString();
          const checksum = computeChecksum(interview.interviewerEmail, interviewerName, caseFolderId, fitQuestionId);

          await client.query(
            `INSERT INTO evaluation_assignments (
               id, evaluation_id, slot_id, interviewer_email, interviewer_name,
               case_folder_id, fit_question_id, round_number, invitation_sent_at,
               created_at, details_checksum, last_sent_checksum, last_delivery_attempt_at
             ) VALUES (
               $1, $2, $3, $4, $5,
               $6, $7, $8, $9,
               $10, $11, $11, $9
             )
             ON CONFLICT (id) DO UPDATE SET
               interviewer_email = EXCLUDED.interviewer_email,
               interviewer_name = EXCLUDED.interviewer_name,
               case_folder_id = EXCLUDED.case_folder_id,
               fit_question_id = EXCLUDED.fit_question_id,
               round_number = EXCLUDED.round_number,
               invitation_sent_at = EXCLUDED.invitation_sent_at,
               details_checksum = EXCLUDED.details_checksum,
               last_sent_checksum = EXCLUDED.last_sent_checksum,
               last_delivery_attempt_at = EXCLUDED.last_delivery_attempt_at;`,
            [
              assignmentId,
              evaluationId,
              interview.slotId,
              interview.interviewerEmail,
              interviewerName,
              caseFolderId,
              fitQuestionId,
              round.roundNumber,
              invitationSentAt,
              invitationSentAt,
              checksum
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Demo data successfully loaded.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to load demo data:', error);
    throw error;
  } finally {
    client.release();
    await postgresPool.end();
  }
};

main()
  .then(() => {
    console.log('Done.');
  })
  .catch((error) => {
    console.error('Demo seed script failed:', error);
    process.exit(1);
  });
