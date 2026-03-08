export const STYLE_PRESETS = [
  { id: "realistic", label: "Realistic", emoji: "📷" },
  { id: "cinematic", label: "Cinematic", emoji: "🎬" },
  { id: "bold graphic", label: "Bold Graphic", emoji: "🎨" },
  { id: "dark dramatic", label: "Dark Dramatic", emoji: "🌑" },
  { id: "minimal", label: "Minimal", emoji: "✨" },
  { id: "anime", label: "Anime", emoji: "🎌" },
  { id: "neon glow", label: "Neon Glow", emoji: "💡" },
  { id: "retro", label: "Retro", emoji: "📼" },
  { id: "luxury", label: "Luxury", emoji: "💎" },
] as const;

export const NICHE_TEMPLATES: Record<string, { label: string; prompts: string[] }> = {
  finance: {
    label: "Finance & Money",
    prompts: [
      "Shocked man in suit holding ₹10 lakh cash, office background, dramatic lighting",
      "Person pointing at upward red graph, wealth visualization background",
      "Before/after split thumbnail, rags to riches theme, dramatic transformation",
      "Hands holding gold bars and cryptocurrency coins, dark luxury background",
      "Person at desk surrounded by money rain, expression of disbelief",
    ],
  },
  tech: {
    label: "Tech & AI",
    prompts: [
      "Futuristic holographic screens floating, person in hoodie pointing, blue neon lighting",
      "Robot and human shaking hands, split between digital and real world",
      "Person looking shocked at glowing laptop screen, matrix-like code in background",
      "Close-up of advanced chip/processor with glowing circuits, cyberpunk aesthetic",
      "AI brain visualization with neural network connections, dark background with blue glow",
    ],
  },
  gaming: {
    label: "Gaming",
    prompts: [
      "Player with intense expression, explosion behind them, game controller visible, neon purple lighting",
      "Shocked reaction face with game footage background, dramatic color grading",
      "Epic battle scene with fantasy warriors, magical effects, dark cinematic",
      "Gaming setup with RGB lighting, person celebrating victory, screen showing win",
      "Split screen comparison of two game characters facing each other",
    ],
  },
  fitness: {
    label: "Fitness & Health",
    prompts: [
      "Dramatic fitness transformation, before and after split, gym background",
      "Athletic person doing intense workout, sweat droplets visible, dramatic lighting",
      "Healthy meal prep spread, colorful vegetables, clean aesthetic",
      "Person flexing muscles with shocked expression, gym mirror selfie style",
      "Running in rain, determined expression, cinematic dark and moody",
    ],
  },
  motivation: {
    label: "Motivation",
    prompts: [
      "Person standing on mountain peak at sunrise, arms raised in victory",
      "Close-up determined face, rain drops, dark dramatic lighting, intensity",
      "Two paths diverging, one dark one bright, conceptual motivational",
      "Person breaking through chains, freedom concept, dramatic back lighting",
      "Clock at 5 AM with person waking up energetically, discipline theme",
    ],
  },
  truecrime: {
    label: "True Crime",
    prompts: [
      "Dark alley with single street light, mysterious atmosphere, fog",
      "Evidence board with red string connections, detective investigation aesthetic",
      "Silhouette behind frosted glass door, eerie blue lighting, suspense",
      "Abandoned building at night, flashlight beam cutting through darkness",
      "Crime scene tape with blurred background, dramatic depth of field",
    ],
  },
  travel: {
    label: "Travel",
    prompts: [
      "Person standing at edge of breathtaking cliff overlooking ocean, golden hour",
      "Passport and boarding pass on world map, adventure flat lay, warm tones",
      "Street food market in Asia, vibrant colors, steam rising, bokeh lights",
      "Airplane window view of sunset above clouds, dreamy atmosphere",
      "Split screen comparing budget vs luxury travel, same destination",
    ],
  },
  cooking: {
    label: "Cooking",
    prompts: [
      "Dramatic food pour shot, cheese melting over burger, dark background, steam",
      "Chef's hands plating elegant dish, kitchen bokeh background, cinematic",
      "Before/after cooking transformation, raw ingredients to finished dish",
      "Street food preparation with flames, action shot, vibrant colors",
      "Overhead shot of colorful spice arrangement on dark surface, artistic",
    ],
  },
  education: {
    label: "Education",
    prompts: [
      "Person having lightbulb moment, illustrated idea sparks around head",
      "Book opening with knowledge flowing out as light, magical learning concept",
      "Whiteboard filled with mind map, person pointing excitedly",
      "Stack of books transforming into a rocket, growth through knowledge",
      "Split between confused face and enlightened face, learning journey",
    ],
  },
};

export const LOADING_MESSAGES = [
  { range: [0, 20], text: "Teaching AI what goes viral..." },
  { range: [20, 50], text: "Analyzing 1M+ YouTube thumbnails..." },
  { range: [50, 80], text: "Adding cinematic lighting..." },
  { range: [80, 99], text: "Rendering your masterpiece..." },
];
