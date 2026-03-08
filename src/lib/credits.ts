export const CREDIT_COSTS = {
  FAST_GENERATE: 1,
  PRO_GENERATE: 2,
  TEXT_THUMBNAIL: 2,
  SHORTS_COVER: 2,
  RECREATE_URL: 3,
  AI_EDIT: 1,
  FACE_SWAP: 3,
  BATCH_PER_IMAGE: 2, // 1.5 rounded up
  THUMBNAIL_SCORER: 1,
  TITLE_GENERATOR: 0,
} as const;

export const PLAN_LIMITS = {
  free: { credits: 20, brandKits: 0, batchSize: 1 },
  creator: { credits: 150, brandKits: 1, batchSize: 1 },
  pro: { credits: 400, brandKits: 3, batchSize: 5 },
  studio: { credits: 1000, brandKits: 10, batchSize: 20 },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
