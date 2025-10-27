import { Buffer } from 'buffer';
import { QueryableClient, toUuid } from './demoData.shared.js';

// Тип ключей для фит-критериев
export type FitCriterionKey =
  | 'clientCommunication'
  | 'clientOwnership'
  | 'clientDrive'
  | 'leadershipDirection'
  | 'leadershipResilience'
  | 'leadershipGrowth'
  | 'collaborationAlignment'
  | 'collaborationCommunication';

// Тип ключей для критериев кейсов
export type CaseCriterionKey =
  | 'structure'
  | 'quant'
  | 'communication'
  | 'problemSolving'
  | 'insight'
  | 'rigor'
  | 'creativity'
  | 'synthesis'
  | 'clientImpact';

// Определение фит-критерия с текстом описания уровней
interface FitCriterionDefinition {
  id: string;
  slug: string;
  question: 'client-trust' | 'leadership' | 'collaboration';
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
}

// Определение глобального критерия кейса
interface CaseCriterionDefinition {
  id: string;
  slug: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
}

// Определение файла кейса
interface CaseFileSeed {
  key: string;
  fileName: string;
  mimeType: string;
  content: string;
}

// Определение критерия оценки внутри конкретной папки кейса
interface CaseEvaluationCriterionSeed {
  key: string;
  title: string;
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
}

// Описание папки кейса
interface CaseFolderSeed {
  key: 'infrastructure' | 'retail-pricing' | 'supply-chain' | 'digital-growth';
  name: string;
  files: CaseFileSeed[];
  evaluationCriteria: CaseEvaluationCriterionSeed[];
}

// Описание фит-вопроса
interface FitQuestionSeed {
  id: string;
  key: 'client-trust' | 'leadership' | 'collaboration';
  shortTitle: string;
  content: string;
  criteria: FitCriterionKey[];
}

// Каталог фит-критериев, общий для сидера
export const fitCriteriaCatalog: Record<FitCriterionKey, FitCriterionDefinition> = {
  clientCommunication: {
    id: 'd0779b32-2368-4e00-98b0-2524a06fb3a9',
    slug: 'listening',
    question: 'client-trust',
    title: 'Listening',
    ratings: {
      1: 'Misses key parts of the question and struggles to stay present in the dialogue.',
      2: 'Listens but often needs questions repeated or clarified.',
      3: 'Actively listens and checks understanding before responding.',
      4: 'Anticipates the interviewer’s follow-up questions and adjusts instantly.',
      5: 'Creates a trusted conversation, reflects nuances and elevates the discussion.'
    }
  },
  clientOwnership: {
    id: 'a8c4ea9d-98f9-426b-9d64-31e5642928fa',
    slug: 'influencing',
    question: 'client-trust',
    title: 'Influencing',
    ratings: {
      1: 'Struggles to change minds even with strong evidence.',
      2: 'Influences peers with preparation but loses senior stakeholders.',
      3: 'Builds alignment through clear storytelling and data.',
      4: 'Influences senior audiences and balances challenge with empathy.',
      5: 'Shapes the agenda, convinces sceptics and drives decisive action.'
    }
  },
  clientDrive: {
    id: 'a3b50c77-c8d4-4350-885b-a0f85b5f8c7d',
    slug: 'resilience',
    question: 'client-trust',
    title: 'Resilience',
    ratings: {
      1: 'Gives up quickly when facing setbacks or ambiguous feedback.',
      2: 'Recovers but needs substantial coaching to get back on track.',
      3: 'Handles push-back, reflects and continues progressing.',
      4: 'Uses adversity to improve plans and support the team.',
      5: 'Remains composed in crises and becomes a stabilising force for others.'
    }
  },
  leadershipDirection: {
    id: 'f21d0289-4a57-4da2-935f-263efd49557a',
    slug: 'ambition',
    question: 'leadership',
    title: 'Ambition',
    ratings: {
      1: 'Sets conservative goals and waits for direction.',
      2: 'Defines ambitions but hesitates to challenge the status quo.',
      3: 'Sets stretching yet realistic objectives for self and team.',
      4: 'Raises the bar, aligns stakeholders and secures commitment.',
      5: 'Inspires bold ambition and steers organisations to new heights.'
    }
  },
  leadershipResilience: {
    id: '71c5b77d-1133-4d2a-b35b-ebb111bc9cf6',
    slug: 'confidence',
    question: 'leadership',
    title: 'Confidence',
    ratings: {
      1: 'Shows visible doubt and retreats under pressure.',
      2: 'Confidence fluctuates and needs reassurance to proceed.',
      3: 'Projects steady confidence while remaining open to feedback.',
      4: 'Demonstrates calm authority and anchors teams during challenges.',
      5: 'Commands confidence from others and keeps momentum regardless of headwinds.'
    }
  },
  leadershipGrowth: {
    id: '5d5a54c0-47c2-45d8-b2a7-7ab17729ff6b',
    slug: 'impact',
    question: 'leadership',
    title: 'Impact',
    ratings: {
      1: 'Delivers limited outcomes and focuses on activity over results.',
      2: 'Achieves results with close sponsorship from leaders.',
      3: 'Delivers consistent impact across workstreams.',
      4: 'Drives significant change and measures results rigorously.',
      5: 'Transforms client trajectories and leaves lasting impact.'
    }
  },
  collaborationAlignment: {
    id: '5d55d2df-44bd-4417-8772-2cec023d3000',
    slug: 'leadership',
    question: 'collaboration',
    title: 'Leadership',
    ratings: {
      1: 'Struggles to coordinate the team and loses track of ownership.',
      2: 'Keeps work moving but lacks a clear leadership stance.',
      3: 'Provides direction and resolves basic conflicts.',
      4: 'Leads peers with clarity, shared accountability and momentum.',
      5: 'Galvanises teams, anticipates risks and maintains cohesion under pressure.'
    }
  },
  collaborationCommunication: {
    id: 'b3225937-cb29-69e7-a2e0-c3d308b86d6c',
    slug: 'executive-communication-clarity',
    question: 'collaboration',
    title: 'Executive communication clarity',
    ratings: {
      1: 'Leaves stakeholders confused about priorities and next steps.',
      2: 'Explains decisions yet misses the executive-level narrative.',
      3: 'Communicates clearly with most audiences and adapts messages.',
      4: 'Synthesises perspectives crisply and brings everyone along.',
      5: 'Communicates with board-level clarity and unlocks alignment quickly.'
    }
  }
};

// Каталог критериев кейса
export const caseCriteriaCatalog: Record<CaseCriterionKey, CaseCriterionDefinition> = {
  structure: {
    id: toUuid('case-criterion:structure'),
    slug: 'case-structure',
    title: 'Problem structure & logic',
    ratings: {
      1: 'Unstructured thinking without a hypothesis.',
      2: 'Basic framework that misses major components.',
      3: 'Reasonable structure with minor gaps.',
      4: 'Clear, MECE structure with relevant detail.',
      5: 'Elegant structure that drives the discussion and adapts dynamically.'
    }
  },
  quant: {
    id: toUuid('case-criterion:quant'),
    slug: 'case-quant',
    title: 'Quantitative rigour',
    ratings: {
      1: 'Frequent math errors and incorrect units.',
      2: 'Needs guidance to complete calculations.',
      3: 'Accurate maths with minor slips.',
      4: 'Fast, precise calculations with useful cross-checks.',
      5: 'Outstanding quant skills, stress-tests numbers independently.'
    }
  },
  communication: {
    id: toUuid('case-criterion:communication'),
    slug: 'case-communication',
    title: 'Communication & presence',
    ratings: {
      1: 'Disorganised messaging and confusing takeaway.',
      2: 'Understands points but fails to communicate them clearly.',
      3: 'Communicates core ideas clearly with prompts.',
      4: 'Confident communicator with concise messaging.',
      5: 'Executive-level storytelling that inspires confidence.'
    }
  },
  problemSolving: {
    id: toUuid('case-criterion:problem-solving'),
    slug: 'case-problem-solving',
    title: 'Problem solving creativity',
    ratings: {
      1: 'Relies on surface-level ideas and struggles to progress.',
      2: 'Generates ideas but lacks depth and prioritisation.',
      3: 'Produces relevant hypotheses with interviewer guidance.',
      4: 'Develops creative, actionable ideas and tests them logically.',
      5: 'Consistently reframes the problem and unlocks new insights.'
    }
  },
  insight: {
    id: toUuid('case-criterion:insight'),
    slug: 'case-insight',
    title: 'Insight generation',
    ratings: {
      1: 'Misses key signals and draws incorrect conclusions.',
      2: 'Needs extensive steering to reach useful insights.',
      3: 'Identifies the main drivers with help.',
      4: 'Extracts nuanced insights independently.',
      5: 'Connects disparate data points into compelling narratives.'
    }
  },
  rigor: {
    id: toUuid('case-criterion:rigor'),
    slug: 'case-rigor',
    title: 'Rigor & attention to detail',
    ratings: {
      1: 'Inaccurate assumptions and frequent mistakes.',
      2: 'Catches some errors but overlooks important checks.',
      3: 'Reasonably thorough with occasional gaps.',
      4: 'Methodical, double-checks work and validates assumptions.',
      5: 'Highly reliable, stress-tests every step and documents logic.'
    }
  },
  creativity: {
    id: toUuid('case-criterion:creativity'),
    slug: 'case-creativity',
    title: 'Creativity & adaptability',
    ratings: {
      1: 'Repeats textbook answers without tailoring.',
      2: 'Adapts slowly when faced with new information.',
      3: 'Adjusts approach with some prompting.',
      4: 'Quickly pivots and introduces fresh perspectives.',
      5: 'Combines creativity with practicality, inspiring client confidence.'
    }
  },
  synthesis: {
    id: toUuid('case-criterion:synthesis'),
    slug: 'case-synthesis',
    title: 'Synthesis & recommendation',
    ratings: {
      1: 'Cannot form a coherent recommendation.',
      2: 'Summarises facts without implications.',
      3: 'Provides a reasonable recommendation with coaching.',
      4: 'Delivers clear takeaways anchored in evidence.',
      5: 'Persuasive, executive-ready synthesis with next steps.'
    }
  },
  clientImpact: {
    id: toUuid('case-criterion:client-impact'),
    slug: 'case-client-impact',
    title: 'Focus on client impact',
    ratings: {
      1: 'Ignores the client context and priorities.',
      2: 'Understands impact but fails to integrate it in answers.',
      3: 'Connects analysis to impact with support.',
      4: 'Consistently grounds discussion in client value.',
      5: 'Shapes the case around measurable client outcomes.'
    }
  }
};

// Хелпер для получения data URL из текстового содержимого
const buildDataUrl = (content: string, mimeType: string) => {
  const buffer = Buffer.from(content, 'utf8');
  const base64 = buffer.toString('base64');
  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    size: buffer.byteLength
  };
};

// Описания папок кейсов с файлами и критериями
export const caseFolderSeeds: CaseFolderSeed[] = [
  {
    key: 'infrastructure',
    name: 'Aircraft Leasing',
    files: [
      {
        key: 'brief',
        fileName: 'Interview Case Study_Aircraft Leasing.pdf',
        mimeType: 'application/pdf',
        content:
          'Aircraft Leasing — Case background: evaluate a mid-life fleet renewal, assess lease versus buy economics and propose a transition plan for domestic routes.'
      },
      {
        key: 'dataset',
        fileName: 'Interview Case Study_Aircraft Leasing.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content:
          'Quarter,Aircraft,LeaseRateUSD,Utilisation\nQ1,Fleet A,480000,0.86\nQ2,Fleet B,515000,0.82\nQ3,Fleet A,470000,0.88'
      }
    ],
    evaluationCriteria: [
      {
        key: 'aircraft-structure',
        title: 'Structuring the fleet transition',
        ratings: {
          1: 'Lacks a coherent plan to phase aircraft and routes.',
          3: 'Outlines a phased plan but omits key dependencies.',
          5: 'Provides a confident, milestone-based plan covering crew, maintenance and customer impact.'
        }
      },
      {
        key: 'aircraft-financials',
        title: 'Financial modelling depth',
        ratings: {
          1: 'Misses core lease drivers and misinterprets cash impact.',
          3: 'Covers the core drivers with minor slips.',
          5: 'Builds a full P&L and cash view with sensitivities on utilisation and residual value.'
        }
      },
      {
        key: 'aircraft-communication',
        title: 'Executive communication',
        ratings: {
          1: 'Communicates findings without linking to stakeholder concerns.',
          3: 'Summarises outcomes clearly with prompts.',
          5: 'Delivers a confident executive pitch with clear recommendations and next steps.'
        }
      }
    ]
  },
  {
    key: 'retail-pricing',
    name: 'Iceberg',
    files: [
      {
        key: 'brief',
        fileName: 'Interview Case Study_Iceberg.pdf',
        mimeType: 'application/pdf',
        content:
          'Iceberg case: turnaround a loss-making cold chain business, stabilise operations and recommend priority initiatives.'
      },
      {
        key: 'dataset',
        fileName: 'Interview Case Study_Iceberg.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content:
          'Site,CapacityUtilisation,OTIF,CostPerTonne\nMelbourne,0.71,0.83,188\nSydney,0.64,0.74,203\nBrisbane,0.78,0.87,176'
      }
    ],
    evaluationCriteria: [
      {
        key: 'iceberg-diagnosis',
        title: 'Issue diagnosis',
        ratings: {
          1: 'Focuses on symptoms instead of root causes.',
          3: 'Identifies the main drivers with limited quantification.',
          5: 'Builds a fact base that separates structural issues from execution noise.'
        }
      },
      {
        key: 'iceberg-change',
        title: 'Change leadership',
        ratings: {
          1: 'Recommends tactical fixes without owner alignment.',
          3: 'Proposes sensible initiatives but lacks phasing and governance.',
          5: 'Outlines a credible roadmap with owners, KPIs and risk mitigations.'
        }
      }
    ]
  },
  {
    key: 'supply-chain',
    name: 'Project Blue',
    files: [
      {
        key: 'brief',
        fileName: 'Interview Case Study_Project Blue.pdf',
        mimeType: 'application/pdf',
        content:
          'Project Blue: design a post-merger integration approach for a diversified services group, prioritising synergy capture and culture integration.'
      },
      {
        key: 'dataset',
        fileName: '20250220 9AM AML Case Study_Project Blue.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content:
          'BusinessUnit,RevenueAUDm,SynergyPotential,Confidence\nCorporate Services,420,35,0.7\nOperations,760,48,0.6\nTechnology,310,22,0.8'
      }
    ],
    evaluationCriteria: [
      {
        key: 'blue-synergies',
        title: 'Synergy logic',
        ratings: {
          1: 'Lists synergies without linking to drivers or timeline.',
          3: 'Quantifies major levers but lacks clear phasing.',
          5: 'Builds a robust synergy case with sequencing, enablers and risks.'
        }
      },
      {
        key: 'blue-governance',
        title: 'Integration governance',
        ratings: {
          1: 'Ignores leadership cadence and ownership.',
          3: 'Assigns accountabilities but lacks cadence.',
          5: 'Defines governance, decision rights and escalation rhythm.'
        }
      },
      {
        key: 'blue-culture',
        title: 'Culture integration',
        ratings: {
          1: 'Overlooks cultural friction between legacy teams.',
          3: 'Acknowledges cultural risks but lacks mitigation.',
          5: 'Anticipates cultural hotspots and outlines concrete interventions.'
        }
      }
    ]
  },
  {
    key: 'digital-growth',
    name: 'Project Box',
    files: [
      {
        key: 'brief',
        fileName: 'Interview Case Study_Project Box.pdf',
        mimeType: 'application/pdf',
        content:
          'Project Box: evaluate a logistics start-up seeking Series B funding, stress-test the growth plan and recommend investor next steps.'
      },
      {
        key: 'dataset',
        fileName: 'Project Box Financials.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content:
          'Month,Deliveries,UnitCost,AverageBasket\nJan,18000,14.6,52\nFeb,19600,14.2,55\nMar,21400,13.8,57'
      }
    ],
    evaluationCriteria: [
      {
        key: 'box-strategy',
        title: 'Growth strategy clarity',
        ratings: {
          1: 'Suggests a list of initiatives without strategic logic.',
          3: 'Articulates a strategy with partial prioritisation.',
          5: 'Frames a crisp strategy with milestones, economics and risk guards.'
        }
      },
      {
        key: 'box-economics',
        title: 'Unit economics insight',
        ratings: {
          1: 'Misreads cost drivers and misses margin pressure.',
          3: 'Understands the base case with some prompting.',
          5: 'Derives insights from cohorts and stress-tests profitability confidently.'
        }
      }
    ]
  }
];

// Описание фит-вопросов с привязкой к критериям
export const fitQuestionSeeds: FitQuestionSeed[] = [
  {
    id: '0c073434-6aa2-4344-88b0-79e284b7ed9f',
    key: 'client-trust',
    shortTitle: 'Client trust',
    content:
      'Describe a moment when you earned the trust of a cautious client executive. Outline your approach and the outcome for the client.',
    criteria: ['clientCommunication', 'clientOwnership', 'clientDrive']
  },
  {
    id: 'a83dfe1e-9339-4a68-8da0-68fdd553aac8',
    key: 'leadership',
    shortTitle: 'Leadership judgement',
    content:
      'Talk us through a situation where you had to rally a team and set a new direction. What options did you weigh and what impact did you achieve?',
    criteria: ['leadershipDirection', 'leadershipResilience', 'leadershipGrowth']
  },
  {
    id: '31255397-cb29-69e7-a2e0-c3d308b86d6c',
    key: 'collaboration',
    shortTitle: 'Executive communication',
    content:
      'Share an example of leading a complex stakeholder group where communication was the differentiator. How did you keep everyone aligned?',
    criteria: ['collaborationAlignment', 'collaborationCommunication']
  }
];

export const caseFolderReferences = caseFolderSeeds.map((folder) => ({ key: folder.key, name: folder.name }));
export const fitQuestionReferences = fitQuestionSeeds.map((question) => ({ key: question.key, shortTitle: question.shortTitle }));

const toNullable = (value: string | undefined) => (value ? value : null);

const applyRatings = (
  ratings: Partial<Record<1 | 2 | 3 | 4 | 5, string>>
): [string | null, string | null, string | null, string | null, string | null] => [
  toNullable(ratings[1]),
  toNullable(ratings[2]),
  toNullable(ratings[3]),
  toNullable(ratings[4]),
  toNullable(ratings[5])
];

// Готовим или обновляем папки кейсов, файлы и критерии
export const ensureCaseLibraryAssets = async (
  client: QueryableClient,
  logInfo: (message: string) => void
) => {
  for (const folder of caseFolderSeeds) {
    const existingFolder = await client.query<{ id: string }>(
      `SELECT id FROM case_folders WHERE name = $1 ORDER BY updated_at DESC LIMIT 1;`,
      [folder.name]
    );
    const folderId = existingFolder.rows[0]?.id ?? toUuid(`case-folder:${folder.key}`);
    await client.query(
      `INSERT INTO case_folders (id, name, version, created_at, updated_at)
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = NOW(),
         version = case_folders.version + 1;`,
      [folderId, folder.name]
    );

    const fileIds: string[] = [];
    for (const file of folder.files) {
      const existingFile = await client.query<{ id: string }>(
        `SELECT id FROM case_files WHERE folder_id = $1 AND file_name = $2 ORDER BY uploaded_at DESC LIMIT 1;`,
        [folderId, file.fileName]
      );
      const fileId = existingFile.rows[0]?.id ?? toUuid(`case-file:${folder.key}:${file.key}`);
      const { dataUrl, size } = buildDataUrl(file.content, file.mimeType);
      fileIds.push(fileId);
      await client.query(
        `INSERT INTO case_files (id, folder_id, file_name, mime_type, file_size, data_url, uploaded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           file_name = EXCLUDED.file_name,
           mime_type = EXCLUDED.mime_type,
           file_size = EXCLUDED.file_size,
           data_url = EXCLUDED.data_url,
           uploaded_at = NOW();`,
        [fileId, folderId, file.fileName, file.mimeType, size, dataUrl]
      );
    }

    await client.query(
      `DELETE FROM case_files WHERE folder_id = $1 AND id <> ALL($2::uuid[]);`,
      [folderId, fileIds]
    );

    const evaluationCriterionIds: string[] = [];
    for (const criterion of folder.evaluationCriteria) {
      const existingCriterion = await client.query<{ id: string }>(
        `SELECT id FROM case_evaluation_criteria WHERE folder_id = $1 AND title = $2 ORDER BY created_at DESC LIMIT 1;`,
        [folderId, criterion.title]
      );
      const criterionId = existingCriterion.rows[0]?.id ?? toUuid(`case-folder:${folder.key}:criterion:${criterion.key}`);
      const [r1, r2, r3, r4, r5] = applyRatings(criterion.ratings);
      evaluationCriterionIds.push(criterionId);
      await client.query(
        `INSERT INTO case_evaluation_criteria (id, folder_id, title, rating_1, rating_2, rating_3, rating_4, rating_5, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           rating_1 = EXCLUDED.rating_1,
           rating_2 = EXCLUDED.rating_2,
           rating_3 = EXCLUDED.rating_3,
           rating_4 = EXCLUDED.rating_4,
           rating_5 = EXCLUDED.rating_5;`,
        [criterionId, folderId, criterion.title, r1, r2, r3, r4, r5]
      );
    }

    await client.query(
      `DELETE FROM case_evaluation_criteria WHERE folder_id = $1 AND id <> ALL($2::uuid[]);`,
      [folderId, evaluationCriterionIds]
    );

    logInfo(`Case folder "${folder.name}" синхронизирована.`);
  }
};

// Готовим каталог фит-вопросов и их критериев
export const ensureFitQuestionAssets = async (
  client: QueryableClient,
  logInfo: (message: string) => void
) => {
  for (const question of fitQuestionSeeds) {
    const existingQuestion = await client.query<{ id: string }>(
      `SELECT id FROM fit_questions WHERE id = $1 OR short_title = $2 ORDER BY updated_at DESC LIMIT 1;`,
      [question.id, question.shortTitle]
    );
    const questionId = existingQuestion.rows[0]?.id ?? question.id;
    await client.query(
      `INSERT INTO fit_questions (id, short_title, content, version, created_at, updated_at)
       VALUES ($1, $2, $3, 1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         short_title = EXCLUDED.short_title,
         content = EXCLUDED.content,
         updated_at = NOW(),
         version = fit_questions.version + 1;`,
      [questionId, question.shortTitle, question.content]
    );

    const criterionIds: string[] = [];
    for (const key of question.criteria) {
      const definition = fitCriteriaCatalog[key];
      if (!definition) {
        throw new Error(`Unknown fit criterion key: ${key}`);
      }
      if (definition.question !== question.key) {
        throw new Error(`Fit criterion ${definition.slug} назначен на неверный вопрос.`);
      }
      const existingCriterion = await client.query<{ id: string }>(
        `SELECT id FROM fit_question_criteria WHERE id = $1 OR (question_id = $2 AND title = $3) ORDER BY created_at DESC LIMIT 1;`,
        [definition.id, questionId, definition.title]
      );
      const criterionId = existingCriterion.rows[0]?.id ?? definition.id;
      const [r1, r2, r3, r4, r5] = applyRatings(definition.ratings);
      criterionIds.push(criterionId);
      await client.query(
        `INSERT INTO fit_question_criteria (id, question_id, title, rating_1, rating_2, rating_3, rating_4, rating_5, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           rating_1 = EXCLUDED.rating_1,
           rating_2 = EXCLUDED.rating_2,
           rating_3 = EXCLUDED.rating_3,
           rating_4 = EXCLUDED.rating_4,
           rating_5 = EXCLUDED.rating_5;`,
        [criterionId, questionId, definition.title, r1, r2, r3, r4, r5]
      );
    }

    await client.query(
      `DELETE FROM fit_question_criteria WHERE question_id = $1 AND id <> ALL($2::uuid[]);`,
      [questionId, criterionIds]
    );

    logInfo(`Fit question "${question.shortTitle}" синхронизирован.`);
  }
};

// Восстанавливаем глобальные критерии кейсов
export const ensureCaseCriteriaCatalog = async (
  client: QueryableClient,
  logInfo: (message: string) => void
) => {
  const criterionIds: string[] = [];
  for (const definition of Object.values(caseCriteriaCatalog)) {
    const [r1, r2, r3, r4, r5] = applyRatings(definition.ratings);
    criterionIds.push(definition.id);
    await client.query(
      `INSERT INTO case_criteria (id, title, rating_1, rating_2, rating_3, rating_4, rating_5, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         rating_1 = EXCLUDED.rating_1,
         rating_2 = EXCLUDED.rating_2,
         rating_3 = EXCLUDED.rating_3,
         rating_4 = EXCLUDED.rating_4,
         rating_5 = EXCLUDED.rating_5,
         updated_at = NOW(),
         version = case_criteria.version + 1;`,
      [definition.id, definition.title, r1, r2, r3, r4, r5]
    );
  }

  await client.query(
    `DELETE FROM case_criteria WHERE id <> ALL($1::uuid[]) AND title SIMILAR TO 'Problem%|Quant%|Communication%|Insight%|Rigor%|Creativity%|Synthesis%|Client%';`,
    [criterionIds]
  );

  logInfo('Case criteria catalog синхронизирован.');
};
