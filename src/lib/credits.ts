export const CREDIT_COSTS = {
  FAST_GENERATE: 1,
  PRO_GENERATE: 2,
  TEXT_THUMBNAIL: 2,
  SHORTS_COVER: 2,
  RECREATE_URL: 3,
  AI_EDIT: 1,
  FACE_SWAP: 3,
  BATCH_PER_IMAGE: 2,
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
  basic: { credits: 100, brandKits: 1, batchSize: 0, savedFaces: 1, rolloverMax: 50 },
  creator: { credits: 200, brandKits: 3, batchSize: 5, savedFaces: 3, rolloverMax: 100 },
  pro: { credits: 350, brandKits: 5, batchSize: 10, savedFaces: 5, rolloverMax: 350 },
  studio: { credits: 600, brandKits: 10, batchSize: 20, savedFaces: 10, rolloverMax: 999999 },
};

export const TOPUP_PACKS = [
  { id: 'topup_starter', credits: 30, priceUsd: 2, priceInr: 166, label: 'Starter Pack', badge: 'Best way to start 🎯' },
  { id: 'topup_boost', credits: 80, priceUsd: 5, priceInr: 415, label: 'Boost Pack', badge: null },
  { id: 'topup_power', credits: 200, priceUsd: 12, priceInr: 996, label: 'Power Pack', badge: null },
] as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyUsd: 8, monthlyInr: 664,
    annualUsd: 77, annualInr: 6374,
    credits: 100,
    rollover: 50,
    features: [
      { text: 'FLUX.2 Pro + Ideogram models', included: true },
      { text: 'No watermark', included: true },
      { text: '1 Brand Kit', included: true },
      { text: '1 saved face for Face Swap', included: true },
      { text: 'Shorts generator', included: true },
      { text: 'Title generator (unlimited)', included: true },
      { text: 'No batch generation', included: false },
      { text: 'No A/B testing', included: false },
      { text: 'No thumbnail scorer', included: false },
    ],
    cta: 'Start Basic',
    popular: false,
  },
  {
    id: 'creator',
    name: 'Creator',
    monthlyUsd: 15, monthlyInr: 1245,
    annualUsd: 144, annualInr: 11952,
    credits: 200,
    rollover: 100,
    features: [
      { text: 'All models', included: true },
      { text: 'No watermark', included: true },
      { text: '3 Brand Kits', included: true },
      { text: '3 saved faces', included: true },
      { text: 'Batch generate (up to 5)', included: true },
      { text: 'A/B thumbnail testing', included: true },
      { text: 'Thumbnail scorer', included: true },
      { text: 'Multi-language thumbnails', included: true },
      { text: 'No priority queue', included: false },
      { text: 'No API access', included: false },
    ],
    cta: 'Start Creating',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyUsd: 25, monthlyInr: 2075,
    annualUsd: 240, annualInr: 19920,
    credits: 350,
    rollover: 350,
    features: [
      { text: 'All models + PRIORITY queue', included: true },
      { text: 'No watermark', included: true },
      { text: '5 Brand Kits', included: true },
      { text: '5 saved faces', included: true },
      { text: 'Batch generate (up to 10)', included: true },
      { text: 'A/B testing + Thumbnail scorer', included: true },
      { text: 'Multi-language', included: true },
      { text: 'Priority email support', included: true },
      { text: 'No API access', included: false },
    ],
    cta: 'Go Pro',
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    monthlyUsd: 40, monthlyInr: 3320,
    annualUsd: 384, annualInr: 31872,
    credits: 600,
    rollover: 999999,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Fastest priority queue', included: true },
      { text: '10 Brand Kits', included: true },
      { text: '10 saved faces', included: true },
      { text: 'Batch generate (up to 20)', included: true },
      { text: 'API access for automation', included: true },
      { text: 'Dedicated support channel', included: true },
    ],
    cta: 'Go Studio',
    popular: false,
  },
] as const;

export const CREDIT_COST_TABLE = [
  { emoji: '⚡', action: 'Fast Generate (Schnell)', cost: '1 credit' },
  { emoji: '✨', action: 'Pro Generate (FLUX.2 Ultra)', cost: '2 credits' },
  { emoji: '📝', action: 'Text Thumbnail (Ideogram)', cost: '2 credits' },
  { emoji: '📱', action: 'Shorts Cover', cost: '2 credits' },
  { emoji: '🔁', action: 'Recreate from YouTube URL', cost: '3 credits' },
  { emoji: '✏️', action: 'AI Edit (Kontext)', cost: '1 credit' },
  { emoji: '🧑', action: 'Face Swap', cost: '3 credits' },
  { emoji: '📊', action: 'Thumbnail Scorer', cost: '1 credit' },
  { emoji: '🔤', action: 'Title Generator', cost: 'FREE' },
];
