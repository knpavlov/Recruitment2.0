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
  | 'collaborationCommunication'
  | 'collaborationExecution';

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
  key: 'client-trust' | 'leadership' | 'collaboration';
  shortTitle: string;
  content: string;
  criteria: FitCriterionKey[];
}

// Каталог фит-критериев, общий для сидера
export const fitCriteriaCatalog: Record<FitCriterionKey, FitCriterionDefinition> = {
  clientCommunication: {
    id: toUuid('fit-criterion:client-communication'),
    slug: 'fit-client-communication',
    question: 'client-trust',
    title: 'Executive communication clarity',
    ratings: {
      1: 'Struggles to articulate thoughts and loses the interviewers with incomplete stories.',
      2: 'Communicates ideas but misses key context and does not adapt to the listener.',
      3: 'Explains situations clearly, though occasionally needs prompts to stay structured.',
      4: 'Presents crisp narratives with the right amount of detail and good pacing.',
      5: 'Commanding communication presence that inspires confidence and feels board ready.'
    }
  },
  clientOwnership: {
    id: toUuid('fit-criterion:client-ownership'),
    slug: 'fit-client-ownership',
    question: 'client-trust',
    title: 'Ownership of client outcomes',
    ratings: {
      1: 'Avoids accountability for client issues and blames circumstances or other teams.',
      2: 'Acknowledges responsibility but lacks concrete actions to resolve problems.',
      3: 'Takes ownership of deliverables and ensures issues are resolved eventually.',
      4: 'Proactively escalates risks, aligns stakeholders and closes gaps without prompting.',
      5: 'Treats client results as personal responsibility and consistently exceeds expectations.'
    }
  },
  clientDrive: {
    id: toUuid('fit-criterion:client-drive'),
    slug: 'fit-client-drive',
    question: 'client-trust',
    title: 'Drive to create client impact',
    ratings: {
      1: 'Shows limited energy and reacts to events rather than driving outcomes.',
      2: 'Motivated when directed but rarely generates momentum independently.',
      3: 'Keeps projects on track and responds well to challenges.',
      4: 'Pushes workstreams forward, rallies teams and keeps attention on measurable impact.',
      5: 'Creates step-change impact, mobilises leadership and elevates client ambition.'
    }
  },
  leadershipDirection: {
    id: toUuid('fit-criterion:leadership-direction'),
    slug: 'fit-leadership-direction',
    question: 'leadership',
    title: 'Setting direction under ambiguity',
    ratings: {
      1: 'Unable to describe how to create clarity and defaults to waiting for instructions.',
      2: 'Identifies issues yet hesitates to propose a way forward.',
      3: 'Forms a reasonable plan with guidance from senior leaders.',
      4: 'Defines direction, secures alignment and keeps the team focused despite uncertainty.',
      5: 'Thrives in ambiguity, reframes the mandate and inspires decisive action.'
    }
  },
  leadershipResilience: {
    id: toUuid('fit-criterion:leadership-resilience'),
    slug: 'fit-leadership-resilience',
    question: 'leadership',
    title: 'Personal resilience and poise',
    ratings: {
      1: 'Shuts down under pressure and avoids difficult conversations.',
      2: 'Handles setbacks but needs significant support to stay productive.',
      3: 'Stays composed and recovers after challenging moments.',
      4: 'Models calm behaviour, keeps morale high and learns from adversity.',
      5: 'Turns crises into opportunities, protects the team and sustains energy long term.'
    }
  },
  leadershipGrowth: {
    id: toUuid('fit-criterion:leadership-growth'),
    slug: 'fit-leadership-growth',
    question: 'leadership',
    title: 'Growth mindset',
    ratings: {
      1: 'Dismisses feedback and repeats the same mistakes.',
      2: 'Accepts coaching but applies it inconsistently.',
      3: 'Reflects on lessons learned and shows clear progress over time.',
      4: 'Actively seeks feedback and experiments with new approaches.',
      5: 'Continuously elevates performance and develops others through coaching.'
    }
  },
  collaborationAlignment: {
    id: toUuid('fit-criterion:collaboration-alignment'),
    slug: 'fit-collaboration-alignment',
    question: 'collaboration',
    title: 'Aligning stakeholders',
    ratings: {
      1: 'Fails to consider stakeholder needs and often creates friction.',
      2: 'Understands perspectives but struggles to reconcile conflicts.',
      3: 'Builds alignment with peers with occasional gaps.',
      4: 'Anticipates resistance, mediates disagreements and lands shared decisions.',
      5: 'Builds lasting coalitions and turns stakeholders into active champions.'
    }
  },
  collaborationCommunication: {
    id: toUuid('fit-criterion:collaboration-communication'),
    slug: 'fit-collaboration-communication',
    question: 'collaboration',
    title: 'Collaborative communication',
    ratings: {
      1: 'Communication is one-sided and ignores input from others.',
      2: 'Shares updates but does not adapt messages to the audience.',
      3: 'Communicates effectively with most stakeholders.',
      4: 'Listens actively, synthesises viewpoints and keeps the team aligned.',
      5: 'Creates an environment of psychological safety and open dialogue.'
    }
  },
  collaborationExecution: {
    id: toUuid('fit-criterion:collaboration-execution'),
    slug: 'fit-collaboration-execution',
    question: 'collaboration',
    title: 'Collaborative execution',
    ratings: {
      1: 'Works in silos and delivers incomplete outcomes.',
      2: 'Engages the team but struggles to share accountability.',
      3: 'Coordinates tasks with peers and meets expectations.',
      4: 'Breaks down work, assigns ownership and keeps everyone productive.',
      5: 'Elevates team output, balances workloads and develops others while executing.'
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
    name: 'ANZ Infrastructure Rollout',
    files: [
      {
        key: 'brief',
        fileName: '1. Executive brief.txt',
        mimeType: 'text/plain',
        content:
          'Client: Southern Grid. Objective: evaluate national fibre rollout. Provide investment thesis, phasing roadmap and risk assessment.'
      },
      {
        key: 'dataset',
        fileName: '2. Demand assumptions.csv',
        mimeType: 'text/csv',
        content: 'Segment,Households,BandwidthNeedMbps\nMetro,420000,500\nRegional,310000,200\nRemote,90000,120'
      }
    ],
    evaluationCriteria: [
      {
        key: 'infra-structure',
        title: 'Structuring the rollout approach',
        ratings: {
          1: 'Unstructured plan without phasing.',
          3: 'Reasonable structure with some gaps.',
          5: 'Clear, staged roadmap covering funding, supply and regulatory gates.'
        }
      },
      {
        key: 'infra-risk',
        title: 'Risk anticipation',
        ratings: {
          1: 'Ignores critical execution and regulatory risks.',
          3: 'Identifies a few risks but lacks mitigations.',
          5: 'Comprehensive risk register with practical mitigations.'
        }
      },
      {
        key: 'infra-impact',
        title: 'Impact on EBITDA & cash',
        ratings: {
          1: 'Cannot link rollout to financial impact.',
          3: 'Links major drivers with support.',
          5: 'Quantifies impact and understands funding implications.'
        }
      }
    ]
  },
  {
    key: 'retail-pricing',
    name: 'Retail Pricing Diagnostic',
    files: [
      {
        key: 'brief',
        fileName: '1. Client situation.txt',
        mimeType: 'text/plain',
        content:
          'Client: Coastal Home. Diagnose margin erosion, prioritise pricing levers and recommend pilot plan across three regions.'
      },
      {
        key: 'dataset',
        fileName: '2. Basket data.csv',
        mimeType: 'text/csv',
        content: 'Region,AvgBasketAUD,PromoShare\nSydney,118,0.22\nMelbourne,111,0.27\nBrisbane,96,0.19'
      }
    ],
    evaluationCriteria: [
      {
        key: 'pricing-analytics',
        title: 'Analytical depth',
        ratings: {
          1: 'Does not quantify price-volume trade-offs.',
          3: 'Quantifies impact with help.',
          5: 'Builds fact-based view with sensitivity checks.'
        }
      },
      {
        key: 'pricing-recommendation',
        title: 'Commercial recommendation',
        ratings: {
          1: 'Provides generic recommendation.',
          3: 'Offers reasonable actions with missing detail.',
          5: 'Articulates differentiated, testable actions linked to KPIs.'
        }
      }
    ]
  },
  {
    key: 'supply-chain',
    name: 'Supply Chain Reset - FMCG',
    files: [
      {
        key: 'brief',
        fileName: '1. Supply chain overview.txt',
        mimeType: 'text/plain',
        content:
          'Client: Pacific Pantry. Stabilise service levels, free working capital and redesign the replenishment cadence.'
      },
      {
        key: 'dataset',
        fileName: '2. Inventory turns.csv',
        mimeType: 'text/csv',
        content: 'Category,Turns,Target\nDry goods,5.1,8\nFresh,17.4,20\nFrozen,8.9,11'
      }
    ],
    evaluationCriteria: [
      {
        key: 'supply-diagnostics',
        title: 'Diagnostic approach',
        ratings: {
          1: 'Fails to identify root causes.',
          3: 'Builds a diagnostic with prompts.',
          5: 'Creates a structured diagnostic covering data, process and governance.'
        }
      },
      {
        key: 'supply-implementation',
        title: 'Implementation thinking',
        ratings: {
          1: 'Ignores change-management requirements.',
          3: 'Notes key actions without sequencing.',
          5: 'Outlines resourcing, milestones and KPIs for delivery.'
        }
      },
      {
        key: 'supply-finance',
        title: 'Working-capital impact',
        ratings: {
          1: 'Does not connect to cash impact.',
          3: 'Estimates impact directionally.',
          5: 'Quantifies cash release and timing confidently.'
        }
      }
    ]
  },
  {
    key: 'digital-growth',
    name: 'Digital Growth Strategy',
    files: [
      {
        key: 'brief',
        fileName: '1. CEO memo.txt',
        mimeType: 'text/plain',
        content:
          'Client: Horizon Insurance. Design a three-year digital growth plan covering acquisition, retention and channel mix.'
      },
      {
        key: 'dataset',
        fileName: '2. Channel metrics.csv',
        mimeType: 'text/csv',
        content: 'Channel,CAC,LTV,Conversion\nSearch,210,980,0.032\nAffiliates,250,870,0.024\nDirect,140,640,0.041'
      }
    ],
    evaluationCriteria: [
      {
        key: 'digital-strategy',
        title: 'Strategic coherence',
        ratings: {
          1: 'Collection of disconnected initiatives.',
          3: 'Strategy addresses key gaps but lacks prioritisation.',
          5: 'Clear sequencing with measurable milestones and economics.'
        }
      },
      {
        key: 'digital-analytics',
        title: 'Data & analytics literacy',
        ratings: {
          1: 'Misinterprets funnel metrics.',
          3: 'Reads metrics correctly with assistance.',
          5: 'Extracts nuanced insights and tests scenarios independently.'
        }
      }
    ]
  }
];

// Описание фит-вопросов с привязкой к критериям
export const fitQuestionSeeds: FitQuestionSeed[] = [
  {
    key: 'client-trust',
    shortTitle: 'Building client trust',
    content:
      'Tell us about a time you had to convince a skeptical client executive and earn the right to advise them. Focus on your actions and the outcomes.',
    criteria: ['clientCommunication', 'clientOwnership', 'clientDrive']
  },
  {
    key: 'leadership',
    shortTitle: 'Leading through ambiguity',
    content:
      'Describe a situation where the mandate was unclear and you had to create direction for the team. How did you motivate others and what changed as a result?',
    criteria: ['leadershipDirection', 'leadershipResilience', 'leadershipGrowth']
  },
  {
    key: 'collaboration',
    shortTitle: 'Driving collaboration',
    content:
      'Share an example of orchestrating a complex programme with multiple stakeholders. How did you keep everyone aligned and deliver the outcome?',
    criteria: ['collaborationAlignment', 'collaborationCommunication', 'collaborationExecution']
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
    const folderId = toUuid(`case-folder:${folder.key}`);
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
      const fileId = toUuid(`case-file:${folder.key}:${file.key}`);
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
      const criterionId = toUuid(`case-folder:${folder.key}:criterion:${criterion.key}`);
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
    const questionId = toUuid(`fit-question:${question.key}`);
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
      const criterionId = definition.id;
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
