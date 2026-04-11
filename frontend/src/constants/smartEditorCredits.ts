export const SMART_EDITOR_CREDITS = {
  AUTO_DETECT: 0,        // FREE - detection is the hook
  REPLACE_TEXT: 5,       // 5 credits per text replacement
  REPLACE_BACKGROUND: 6, // 6 credits per bg replacement
  REPLACE_PERSON: 7,     // 7 credits per person/face replacement
  REPLACE_OBJECT: 6,     // 6 credits per object replacement
  UPSCALE_4K: 2,         // 2 credits for 4K export
} as const;

export const SMART_EDITOR_API_COSTS_USD = {
  AUTO_DETECT: 0.006,    // EVF-SAM2 + BiRefNet
  REPLACE_TEXT: 0.046,   // FLUX.1 Kontext
  REPLACE_BACKGROUND: 0.056,
  REPLACE_PERSON: 0.064, // HY-WU face swap
  REPLACE_OBJECT: 0.046,
  UPSCALE_4K: 0.002,
} as const;

// 1 credit = ₹5.20 = ~$0.063
// Margin per action = ~83-85%
