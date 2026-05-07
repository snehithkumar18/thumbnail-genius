export const CREDIT_COSTS = {
  FAST_GENERATE: 0,
  PRO_GENERATE: 0,
  TEXT_THUMBNAIL: 0,
  SHORTS_COVER: 0,
  RECREATE_URL: 3,
  AI_EDIT: 1,
  FACE_SWAP: 1,
  BATCH_PER_IMAGE: 0,
  THUMBNAIL_SCORER: 1,
  TITLE_GENERATOR: 0,
} as const;

export type PlanType = 'none' | 'basic' | 'creator' | 'pro' | 'studio';

export const PLAN_LIMITS: Record<PlanType, {
  credits: number;
  brandKits: number;
  batchSize: number;
  savedFaces: number;
  rolloverMax: number;
}> = {
  none: { credits: 0, brandKits: 0, batchSize: 0, savedFaces: 0, rolloverMax: 0 },
  basic: { credits: 1800, brandKits: 1, batchSize: 0, savedFaces: 1, rolloverMax: 1800 },
  creator: { credits: 5000, brandKits: 3, batchSize: 10, savedFaces: 3, rolloverMax: 5000 },
  pro: { credits: 8000, brandKits: 5, batchSize: 15, savedFaces: 5, rolloverMax: 8000 },
  studio: { credits: 12000, brandKits: 10, batchSize: 20, savedFaces: 10, rolloverMax: 12000 },
};

export const TOPUP_PACKS = [
  { id: 'topup_mini', credits: 100, priceUsd: 1, priceInr: 94, label: 'Mini Pack', badge: '🎯 Best way to start' },
  { id: 'topup_standard', credits: 500, priceUsd: 5, priceInr: 470, label: 'Standard Pack', badge: null },
  { id: 'topup_mega', credits: 1000, priceUsd: 10, priceInr: 940, label: 'Mega Pack', badge: '🔥 Most popular top-up' },
] as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyUsd: 15, monthlyInr: 1410,
    annualUsd: 144, annualInr: 13536,
    annualPerMonthUsd: 12, annualPerMonthInr: 1128,
    savingsUsd: 36, savingsInr: 3384,
    credits: 1800,
    rollover: 1800,
    features: [
      { text: 'Unlocks Dev/Schnell models', included: true },
      { text: 'No watermark on downloads', included: true },
      { text: '1 Brand Kit', included: true },
      { text: '1 saved face for Face Swap', included: true },
      { text: 'Shorts cover generator', included: true },
      { text: 'Title generator (unlimited)', included: true },
      { text: 'Email support', included: true },
      { text: 'No batch generation', included: false },
      { text: 'No priority queue', included: false },
    ],
    cta: 'Start Basic',
    popular: false,
  },
  {
    id: 'creator',
    name: 'Creator',
    monthlyUsd: 39, monthlyInr: 3666,
    annualUsd: 374, annualInr: 35156,
    annualPerMonthUsd: 31.17, annualPerMonthInr: 2930,
    savingsUsd: 94, savingsInr: 8836,
    credits: 5000,
    rollover: 5000,
    features: [
      { text: 'All standard models', included: true },
      { text: 'No watermark', included: true },
      { text: 'Brand Kit saving', included: true },
      { text: 'Batch generation', included: true },
      { text: 'Priority queue', included: true },
      { text: 'Multi-language thumbnails', included: true },
      { text: 'Email support', included: true },
    ],
    cta: 'Start Creating',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyUsd: 59, monthlyInr: 5546,
    annualUsd: 566, annualInr: 53204,
    annualPerMonthUsd: 47.17, annualPerMonthInr: 4434,
    savingsUsd: 142, savingsInr: 13348,
    credits: 8000,
    rollover: 8000,
    features: [
      { text: 'Everything in Creator', included: true },
      { text: '8,000 credits/month', included: true },
      { text: '5 Brand Kits', included: true },
      { text: '5 saved faces', included: true },
      { text: 'Batch up to 15 images', included: true },
      { text: 'Priority queue', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Go Pro',
    popular: false,
  },
  {
    id: 'studio',
    name: 'Studio',
    monthlyUsd: 89, monthlyInr: 8366,
    annualUsd: 854, annualInr: 80276,
    annualPerMonthUsd: 71.17, annualPerMonthInr: 6700,
    savingsUsd: 214, savingsInr: 20116,
    credits: 12000,
    rollover: 12000,
    features: [
      { text: 'Everything in Creator', included: true },
      { text: 'Unlimited face swapping', included: true },
      { text: '4K upscaling', included: true },
      { text: 'Team access', included: true },
      { text: 'Fastest priority queue', included: true },
      { text: 'Dedicated support channel', included: true },
    ],
    cta: 'Go Studio',
    popular: false,
  },
] as const;

export const CREDIT_COST_TABLE = [
  { emoji: '⚡', action: 'Fast Generate (Schnell)', cost: 'FREE' },
  { emoji: '✨', action: 'Pro Generate (FLUX.2 Ultra)', cost: 'FREE' },
  { emoji: '📝', action: 'Text Thumbnail (Ideogram 3.0)', cost: 'FREE' },
  { emoji: '📱', action: 'Shorts Cover', cost: 'FREE' },
  { emoji: '🔁', action: 'Recreate from YouTube URL', cost: '3 credits' },
  { emoji: '✏️', action: 'AI Edit (Kontext)', cost: '1 credit' },
  { emoji: '🧑', action: 'Face Swap', cost: '1 credit' },
  { emoji: '📊', action: 'Thumbnail Scorer', cost: '1 credit' },
  { emoji: '🔤', action: 'Title Generator', cost: 'FREE ∞' },
];
