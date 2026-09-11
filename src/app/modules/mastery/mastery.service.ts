import { prisma } from "../../shared/prisma.js";
import ApiError from "../../errors/api.error.js";
import httpStatus from "http-status";
import {
  TestType,
  TemplateStatus,
  TemplateEntityType,
  Prisma,
} from "@prisma/client";

// ────────────────────────────────────────────────
// Types (config v2 — subject-based)
// ────────────────────────────────────────────────

type DifficultyMix = {
  EASY?: number;
  MEDIUM?: number;
  HARD?: number;
};

export type TemplateSectionV2 = {
  subjectId: string;
  subjectName?: string;
  count: number;
  difficulty?: DifficultyMix;
  categoryIds?: string[];
  topicIds?: string[];
  questionTypes?: string[];
};

export type TestTemplateConfigV2 = {
  version: 2;
  selectionMode: "SMART" | "RANDOM" | "NEVER_SEEN_ONLY" | "WRONG_ONLY";
  policyName?: string;
  sections: TemplateSectionV2[];
  fallback?: {
    allowPartial: boolean;
    minQuestionsRatio: number;
  };
};

export type CreateTemplateInput = {
  name: string;
  nameHi?: string;
  slug: string;
  description?: string;
  testType?: TestType;
  durationMinutes: number;
  isFree?: boolean;
  examTag?: string;
  isFeatured?: boolean;
  order?: number;
  status?: TemplateStatus;
  /** subject-based sections */
  sections: TemplateSectionV2[];
  selectionMode?: TestTemplateConfigV2["selectionMode"];
  policyName?: string;
  allowPartial?: boolean;
  minQuestionsRatio?: number;
};

export type UpdateTemplateInput = Partial<
  Omit<CreateTemplateInput, "slug">
> & { slug?: string };

// ────────────────────────────────────────────────
// Defaults — only policy (no fake subject template)
// ────────────────────────────────────────────────

const DEFAULT_POLICY = {
  name: "default",
  cooldownDays: 14,
  maxShowInWindow: 2,
  windowDays: 30,
  weightNeverSeen: 100,
  weightWrong: 40,
  weightLowMastery: 20,
  weightOverShown: -50,
  wrongBoostDays: 21,
  isDefault: true,
};

function buildConfigV2(
  sections: TemplateSectionV2[],
  opts?: {
    selectionMode?: TestTemplateConfigV2["selectionMode"];
    policyName?: string;
    allowPartial?: boolean;
    minQuestionsRatio?: number;
  }
): TestTemplateConfigV2 {
  return {
    version: 2,
    selectionMode: opts?.selectionMode ?? "SMART",
    policyName: opts?.policyName ?? "default",
    sections,
    fallback: {
      allowPartial: opts?.allowPartial ?? true,
      minQuestionsRatio: opts?.minQuestionsRatio ?? 0.6,
    },
  };
}

function totalFromSections(sections: TemplateSectionV2[]) {
  return sections.reduce((sum, s) => sum + (s.count || 0), 0);
}

async function assertSubjectsExist(sections: TemplateSectionV2[]) {
  if (!sections?.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one subject section is required"
    );
  }

  for (const section of sections) {
    if (!section.subjectId?.trim()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "subjectId is required in each section");
    }
    if (!section.count || section.count < 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid question count for subject ${section.subjectId}`
      );
    }

    const subject = await prisma.subject.findUnique({
      where: { id: section.subjectId },
      select: { id: true, name: true },
    });
    if (!subject) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Subject not found: ${section.subjectId}`
      );
    }
    // fill snapshot name if missing
    if (!section.subjectName) {
      section.subjectName = subject.name;
    }

    // optional category/topic checks
    if (section.categoryIds?.length) {
      const count = await prisma.category.count({
        where: {
          id: { in: section.categoryIds },
          subjectId: section.subjectId,
        },
      });
      if (count !== section.categoryIds.length) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid categoryIds for subject ${subject.name}`
        );
      }
    }
    if (section.topicIds?.length) {
      const topics = await prisma.topic.findMany({
        where: { id: { in: section.topicIds } },
        select: { id: true, category: { select: { subjectId: true } } },
      });
      if (topics.length !== section.topicIds.length) {
        throw new ApiError(httpStatus.BAD_REQUEST, "One or more topicIds are invalid");
      }
      const invalid = topics.some(
        (t) => t.category.subjectId !== section.subjectId
      );
      if (invalid) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `topicIds must belong to subject ${subject.name}`
        );
      }
    }
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0980-\u09FF-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────

/** Only ensures GenerationPolicy — templates are created by admin with real subjects */
const ensureDefaults = async () => {
  const policy = await prisma.generationPolicy.upsert({
    where: { name: DEFAULT_POLICY.name },
    create: DEFAULT_POLICY,
    update: {},
  });

  return {
    policy: {
      id: policy.id,
      name: policy.name,
      cooldownDays: policy.cooldownDays,
      maxShowInWindow: policy.maxShowInWindow,
      windowDays: policy.windowDays,
    },
    message:
      "Default generation policy ready. Create templates from Admin by selecting subjects.",
  };
};

const getSetupStatus = async () => {
  const [policy, templates, subjectCount, questionCount] = await Promise.all([
    prisma.generationPolicy.findFirst({ where: { isDefault: true } }),
    prisma.testTemplate.findMany({
      where: { status: { not: TemplateStatus.ARCHIVED } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        totalQuestions: true,
        durationMinutes: true,
        examTag: true,
        isFeatured: true,
        config: true,
      },
    }),
    prisma.subject.count({ where: { isActive: true } }),
    prisma.question.count({ where: { isActive: true, deletedAt: null } }),
  ]);

  return {
    ready: Boolean(policy),
    policy: policy
      ? {
          id: policy.id,
          name: policy.name,
          cooldownDays: policy.cooldownDays,
          maxShowInWindow: policy.maxShowInWindow,
          windowDays: policy.windowDays,
        }
      : null,
    content: {
      subjects: subjectCount,
      questions: questionCount,
      canCreateTemplate: subjectCount > 0,
    },
    templates,
  };
};

// ── Templates CRUD (subject-based) ─────────────

const listTemplates = async (onlyActive = false) => {
  return prisma.testTemplate.findMany({
    where: onlyActive
      ? { status: TemplateStatus.ACTIVE }
      : { status: { not: TemplateStatus.ARCHIVED } },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
  });
};

const getTemplateBySlug = async (slug: string) => {
  const template = await prisma.testTemplate.findUnique({ where: { slug } });
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, "Template not found");
  }
  return template;
};

const getTemplateById = async (id: string) => {
  const template = await prisma.testTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, "Template not found");
  }
  return template;
};

const createTemplate = async (payload: CreateTemplateInput) => {
  const sections = payload.sections || [];
  await assertSubjectsExist(sections);

  const slug = slugify(payload.slug || payload.name);
  if (!slug) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid slug");
  }

  const exists = await prisma.testTemplate.findUnique({ where: { slug } });
  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, "Template slug already exists");
  }

  if (!payload.durationMinutes || payload.durationMinutes < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "durationMinutes is required");
  }

  const config = buildConfigV2(sections, {
    selectionMode: payload.selectionMode,
    policyName: payload.policyName,
    allowPartial: payload.allowPartial,
    minQuestionsRatio: payload.minQuestionsRatio,
  });

  const totalQuestions = totalFromSections(sections);

  return prisma.testTemplate.create({
    data: {
      name: payload.name.trim(),
      nameHi: payload.nameHi,
      slug,
      description: payload.description,
      testType: payload.testType ?? TestType.PRACTICE,
      status: payload.status ?? TemplateStatus.ACTIVE,
      totalQuestions,
      durationMinutes: payload.durationMinutes,
      isFree: payload.isFree ?? true,
      examTag: payload.examTag,
      isFeatured: payload.isFeatured ?? false,
      order: payload.order ?? 0,
      config: config as unknown as Prisma.InputJsonValue,
    },
  });
};

const updateTemplate = async (id: string, payload: UpdateTemplateInput) => {
  const existing = await prisma.testTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Template not found");
  }

  let config = existing.config as unknown as TestTemplateConfigV2;
  let totalQuestions = existing.totalQuestions;

  if (payload.sections) {
    await assertSubjectsExist(payload.sections);
    config = buildConfigV2(payload.sections, {
      selectionMode:
        payload.selectionMode ?? config?.selectionMode ?? "SMART",
      policyName: payload.policyName ?? config?.policyName ?? "default",
      allowPartial:
        payload.allowPartial ?? config?.fallback?.allowPartial ?? true,
      minQuestionsRatio:
        payload.minQuestionsRatio ??
        config?.fallback?.minQuestionsRatio ??
        0.6,
    });
    totalQuestions = totalFromSections(payload.sections);
  } else if (
    payload.selectionMode ||
    payload.policyName ||
    payload.allowPartial !== undefined ||
    payload.minQuestionsRatio !== undefined
  ) {
    const sections = config?.sections ?? [];
    config = buildConfigV2(sections, {
      selectionMode: payload.selectionMode ?? config?.selectionMode,
      policyName: payload.policyName ?? config?.policyName,
      allowPartial: payload.allowPartial ?? config?.fallback?.allowPartial,
      minQuestionsRatio:
        payload.minQuestionsRatio ?? config?.fallback?.minQuestionsRatio,
    });
  }

  let slug = existing.slug;
  if (payload.slug && payload.slug !== existing.slug) {
    slug = slugify(payload.slug);
    const clash = await prisma.testTemplate.findUnique({ where: { slug } });
    if (clash) {
      throw new ApiError(httpStatus.CONFLICT, "Template slug already exists");
    }
  }

  return prisma.testTemplate.update({
    where: { id },
    data: {
      name: payload.name?.trim() ?? undefined,
      nameHi: payload.nameHi,
      slug,
      description: payload.description,
      testType: payload.testType,
      status: payload.status,
      durationMinutes: payload.durationMinutes,
      isFree: payload.isFree,
      examTag: payload.examTag,
      isFeatured: payload.isFeatured,
      order: payload.order,
      totalQuestions,
      config: config as unknown as Prisma.InputJsonValue,
    },
  });
};

const archiveTemplate = async (id: string) => {
  const existing = await prisma.testTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Template not found");
  }

  return prisma.testTemplate.update({
    where: { id },
    data: { status: TemplateStatus.ARCHIVED },
  });
};

// ── Optional: keep taxonomy map helpers (not required for v2) ─

const listTaxonomyMaps = async () => {
  return prisma.taxonomyMap.findMany({ orderBy: { key: "asc" } });
};

const linkTaxonomyMap = async (
  key: string,
  payload: { entityId: string; entityType?: TemplateEntityType }
) => {
  const existing = await prisma.taxonomyMap.findUnique({ where: { key } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Taxonomy map not found");
  }
  if (!payload.entityId?.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "entityId is required");
  }

  const type = payload.entityType ?? existing.entityType;
  if (type === "SUBJECT") {
    const s = await prisma.subject.findUnique({
      where: { id: payload.entityId },
    });
    if (!s) throw new ApiError(httpStatus.BAD_REQUEST, "Subject not found");
  } else if (type === "CATEGORY") {
    const c = await prisma.category.findUnique({
      where: { id: payload.entityId },
    });
    if (!c) throw new ApiError(httpStatus.BAD_REQUEST, "Category not found");
  } else if (type === "TOPIC") {
    const t = await prisma.topic.findUnique({
      where: { id: payload.entityId },
    });
    if (!t) throw new ApiError(httpStatus.BAD_REQUEST, "Topic not found");
  }

  return prisma.taxonomyMap.update({
    where: { key },
    data: {
      entityId: payload.entityId,
      ...(payload.entityType ? { entityType: payload.entityType } : {}),
    },
  });
};

const unlinkTaxonomyMap = async (key: string) => {
  const existing = await prisma.taxonomyMap.findUnique({ where: { key } });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Taxonomy map not found");
  }
  return prisma.taxonomyMap.update({
    where: { key },
    data: { entityId: null },
  });
};

const createTaxonomyMap = async (payload: {
  key: string;
  label: string;
  labelHi?: string;
  entityType: TemplateEntityType;
  entityId?: string;
  defaultWeight?: number;
}) => {
  const key = payload.key.trim().toLowerCase().replace(/\s+/g, "-");
  if (!key) {
    throw new ApiError(httpStatus.BAD_REQUEST, "key is required");
  }
  const exists = await prisma.taxonomyMap.findUnique({ where: { key } });
  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, "Taxonomy map key already exists");
  }
  return prisma.taxonomyMap.create({
    data: {
      key,
      label: payload.label,
      labelHi: payload.labelHi,
      entityType: payload.entityType,
      entityId: payload.entityId,
      defaultWeight: payload.defaultWeight ?? 1,
    },
  });
};


// ── Generate test from template (SMART) ─────────────────

type GenerateResult = {
  testId: string;
  attemptId: string;
  totalQuestions: number;
  durationMinutes: number;
  sectionResult: Record<string, number>;
};

const generateFromTemplate = async (
  userId: string,
  slug: string
): Promise<GenerateResult> => {
  const template = await prisma.testTemplate.findUnique({ where: { slug } });
  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, "Template not found");
  }
  if (template.status !== TemplateStatus.ACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Template is not active");
  }

  const config = template.config as unknown as TestTemplateConfigV2;
  if (!config?.sections?.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Template has no sections");
  }

  const policy =
    (await prisma.generationPolicy.findFirst({
      where: config.policyName
        ? { name: config.policyName }
        : { isDefault: true },
    })) ??
    (await prisma.generationPolicy.findFirst());

  if (!policy) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No generation policy found. Run setup/defaults first."
    );
  }

  const selectionMode = config.selectionMode ?? "SMART";
  const allowPartial = config.fallback?.allowPartial ?? true;
  const minRatio = config.fallback?.minQuestionsRatio ?? 0.6;

  const now = new Date();
  const cooldownUntil = new Date(
    now.getTime() - policy.cooldownDays * 24 * 60 * 60 * 1000
  );
  const wrongBoostSince = new Date(
    now.getTime() - policy.wrongBoostDays * 24 * 60 * 60 * 1000
  );
  const windowSince = new Date(
    now.getTime() - policy.windowDays * 24 * 60 * 60 * 1000
  );

  const selectedIds: string[] = [];
  const sectionResult: Record<string, number> = {};
  const usedSet = new Set<string>();

  for (const section of config.sections) {
    const where: Prisma.QuestionWhereInput = {
      isActive: true,
      deletedAt: null,
      subjectId: section.subjectId,
      ...(section.categoryIds?.length
        ? { categoryId: { in: section.categoryIds } }
        : {}),
      ...(section.topicIds?.length
        ? { topicId: { in: section.topicIds } }
        : {}),
      ...(section.questionTypes?.length
        ? { questionType: { in: section.questionTypes as any } }
        : {}),
      id: { notIn: [...usedSet] },
    };

    // difficulty mix: if provided, pick per difficulty; else any
    const need = section.count;
    let picked: string[] = [];

    if (section.difficulty && Object.keys(section.difficulty).length > 0) {
      for (const [diff, cnt] of Object.entries(section.difficulty)) {
        if (!cnt || cnt < 1) continue;
        const ids = await pickQuestions({
          where: { ...where, difficulty: diff as any },
          userId,
          limit: cnt,
          selectionMode,
          policy,
          cooldownUntil,
          wrongBoostSince,
          windowSince,
          excludeIds: usedSet,
        });
        picked.push(...ids);
        ids.forEach((id) => usedSet.add(id));
      }
      // fill remaining if mix under-delivered
      const remaining = need - picked.length;
      if (remaining > 0) {
        const more = await pickQuestions({
          where,
          userId,
          limit: remaining,
          selectionMode,
          policy,
          cooldownUntil,
          wrongBoostSince,
          windowSince,
          excludeIds: usedSet,
        });
        picked.push(...more);
        more.forEach((id) => usedSet.add(id));
      }
    } else {
      picked = await pickQuestions({
        where,
        userId,
        limit: need,
        selectionMode,
        policy,
        cooldownUntil,
        wrongBoostSince,
        windowSince,
        excludeIds: usedSet,
      });
      picked.forEach((id) => usedSet.add(id));
    }

    sectionResult[section.subjectId] = picked.length;
    selectedIds.push(...picked);
  }

  const requested = totalFromSections(config.sections);
  const got = selectedIds.length;

  if (got === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No questions available for this template"
    );
  }

  if (!allowPartial && got < requested) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough questions (need ${requested}, got ${got})`
    );
  }

  if (allowPartial && got / requested < minRatio) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Too few questions (need at least ${Math.ceil(requested * minRatio)}, got ${got})`
    );
  }

  // Create Test + questions + Attempt + log in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        title: template.name,
        titleHi: template.nameHi,
        slug: `${template.slug}-${Date.now()}`,
        description: template.description,
        testType: template.testType,
        durationMinutes: template.durationMinutes,
        totalMarks: got, // 1 mark each default; adjust if needed
        totalQuestions: got,
        isFree: template.isFree,
        isActive: true,
        subjectId: template.subjectId,
      },
    });

    await tx.testQuestion.createMany({
      data: selectedIds.map((questionId, index) => ({
        testId: test.id,
        questionId,
        order: index + 1,
        marks: 1,
      })),
    });

    const attempt = await tx.testAttempt.create({
      data: {
        userId,
        testId: test.id,
        status: "IN_PROGRESS",
      },
    });

    // bump user question stats (shown)
    for (const qid of selectedIds) {
      await tx.userQuestionStat.upsert({
        where: {
          userId_questionId: { userId, questionId: qid },
        },
        create: {
          userId,
          questionId: qid,
          timesShown: 1,
          lastShownAt: now,
          cooldownUntil: new Date(
            now.getTime() + policy.cooldownDays * 24 * 60 * 60 * 1000
          ),
          masteryLevel: 1,
        },
        update: {
          timesShown: { increment: 1 },
          lastShownAt: now,
          cooldownUntil: new Date(
            now.getTime() + policy.cooldownDays * 24 * 60 * 60 * 1000
          ),
        },
      });
    }

    await tx.testGenerationLog.create({
      data: {
        userId,
        templateId: template.id,
        testId: test.id,
        params: {
          selectionMode,
          policyName: policy.name,
          cooldownDays: policy.cooldownDays,
          sections: config.sections,
        } as any,
        sectionResult: sectionResult as any,
        questionIds: selectedIds,
        success: true,
      },
    });

    return {
      testId: test.id,
      attemptId: attempt.id,
      totalQuestions: got,
      durationMinutes: template.durationMinutes,
      sectionResult,
    };
  });

  return result;
};

// ── Internal picker ──────────────────────────────

async function pickQuestions(opts: {
  where: Prisma.QuestionWhereInput;
  userId: string;
  limit: number;
  selectionMode: TestTemplateConfigV2["selectionMode"];
  policy: {
    weightNeverSeen: number;
    weightWrong: number;
    weightLowMastery: number;
    weightOverShown: number;
    maxShowInWindow: number;
  };
  cooldownUntil: Date;
  wrongBoostSince: Date;
  windowSince: Date;
  excludeIds: Set<string>;
}): Promise<string[]> {
  const {
    where,
    userId,
    limit,
    selectionMode,
    policy,
    cooldownUntil,
    wrongBoostSince,
    windowSince,
    excludeIds,
  } = opts;

  if (limit <= 0) return [];

  // Candidate pool (cap for performance)
  const candidates = await prisma.question.findMany({
    where: {
      ...where,
      id: {
        notIn: [...excludeIds],
        ...(where.id && typeof where.id === "object"
          ? (where.id as any)
          : {}),
      },
    },
    select: { id: true, difficulty: true },
    take: 400,
  });

  if (!candidates.length) return [];

  const ids = candidates.map((c) => c.id);

  const stats = await prisma.userQuestionStat.findMany({
    where: { userId, questionId: { in: ids } },
  });
  const statMap = new Map(stats.map((s) => [s.questionId, s]));

  const now = new Date();

  type Scored = { id: string; score: number };
  const scored: Scored[] = [];

  for (const q of candidates) {
    const st = statMap.get(q.id);

    // cooldown filter
    if (st?.cooldownUntil && st.cooldownUntil > now) continue;

    // window over-show filter
    if (
      st &&
      st.timesShown >= policy.maxShowInWindow &&
      st.lastShownAt &&
      st.lastShownAt > windowSince
    ) {
      // still allow with heavy penalty in SMART; hard skip in NEVER_SEEN
      if (selectionMode === "NEVER_SEEN_ONLY") continue;
    }

    if (selectionMode === "NEVER_SEEN_ONLY") {
      if (st && st.timesShown > 0) continue;
      scored.push({ id: q.id, score: Math.random() });
      continue;
    }

    if (selectionMode === "WRONG_ONLY") {
      if (!st || st.timesWrong === 0) continue;
      if (st.lastWrongAt && st.lastWrongAt < wrongBoostSince) continue;
      scored.push({ id: q.id, score: st.timesWrong + Math.random() });
      continue;
    }

    if (selectionMode === "RANDOM") {
      scored.push({ id: q.id, score: Math.random() });
      continue;
    }

    // SMART scoring
    let score = 0;
    if (!st || st.timesShown === 0) {
      score += policy.weightNeverSeen;
    } else {
      if (st.timesWrong > 0 && st.lastWrongAt && st.lastWrongAt >= wrongBoostSince) {
        score += policy.weightWrong;
      }
      if (st.masteryLevel <= 1) {
        score += policy.weightLowMastery;
      }
      if (st.timesShown >= policy.maxShowInWindow) {
        score += policy.weightOverShown;
      }
    }
    score += Math.random() * 5; // light jitter
    scored.push({ id: q.id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.id);
}



export const MasterySetupService = {
  ensureDefaults,
  getSetupStatus,
  listTemplates,
  getTemplateBySlug,
  getTemplateById,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  // optional legacy maps
  listTaxonomyMaps,
  linkTaxonomyMap,
  generateFromTemplate,
  unlinkTaxonomyMap,
  createTaxonomyMap,
};