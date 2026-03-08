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
    label: "💰 Finance & Money",
    prompts: [
      "Indian man in business suit, shocked expression, holding multiple ₹500 notes spread as fan, modern office background, dramatic overhead lighting, deep red and gold color palette, cinematic DOF",
      "Split screen: left side worn old wallet on wooden desk, right side luxury watch and cash, arrow pointing right, dark dramatic lighting, wealth transformation theme",
      "Person pointing at giant glowing upward chart, numbers and stats floating around them, blue financial data visualization background, confident expression",
      "Crashed stock chart in background, worried face in foreground, urgent red color scheme, crisis thumbnail style",
      "Luxury lifestyle montage: sports car, mansion, gold bars, person smiling confidently in center, wealthy aesthetic",
      "Hand receiving money from phone screen, digital payment glow effect, modern flat lay, gold and green accents",
    ],
  },
  gaming: {
    label: "🎮 Gaming",
    prompts: [
      "Intense gamer face close-up, headset on, RGB lighting reflection on face, dark background, battle-ready expression",
      "Game character in epic pose, explosion and particle effects behind them, cinematic game poster style",
      "Before/after gaming setup: old laptop vs triple monitor setup, glowing comparison, upgrade theme",
      "Shocked reaction face, hands on cheeks, game screenshot visible on screen in background, comedic style",
      "Top-down aerial view gaming peripherals flat lay, RGB keyboard mouse headset, dark desk, perfect symmetry",
      "Player character falling/dying with RIP overlay, dramatic lighting, humor + tragedy thumbnail style",
    ],
  },
  fitness: {
    label: "💪 Fitness & Health",
    prompts: [
      "Muscular person doing dramatic pose, gym background, sweat drops visible, high contrast black and white with red accent, powerful masculine energy",
      "Before/after body transformation side by side, same person different physique, inspiring framing",
      "Healthy meal prep flat lay, colorful vegetables protein and supplements, clean white marble background",
      "Person running through explosion or dramatic background, superhero energy, determination on face",
      "Tired person starting at start, energetic person at finish line, journey thumbnail composition",
      "Scale showing shocking number with person reacting, weight loss / gain narrative, clean minimal style",
    ],
  },
  tech: {
    label: "🤖 Tech & AI",
    prompts: [
      "Person in dark hoodie, face partially lit by blue holographic screens, matrix-style data streams, futuristic hacker aesthetic",
      "Robot hand and human hand reaching toward each other, AI collaboration theme, dramatic purple and blue lighting",
      "Laptop exploding with features/apps pouring out, product reveal style, colorful digital chaos",
      "Side by side AI vs human comparison, half robot face half human face, identity theme",
      "Person absolutely stunned looking at phone screen, bright light from screen illuminating face, dark room, secret knowledge theme",
      "Futuristic city at night, single person walking, giant holographic AI UI in sky above them, cyberpunk color palette",
    ],
  },
  travel: {
    label: "✈️ Travel",
    prompts: [
      "Person arms wide open on mountain peak at golden hour, dramatic landscape, adventure and freedom energy",
      "Passport and boarding pass on map, wanderlust flat lay, earthy travel aesthetic, cozy planning vibe",
      "Shocked tourist face in front of iconic landmark, pure amazement expression, travel surprise thumbnail",
      "Street food close-up, steam rising, exotic location blur in background, travel foodie style",
      "Airplane wing over dramatic clouds and sunset, window seat view, peaceful travel aesthetic",
      "Hidden beach secret cove, crystal blue water, 'This place is REAL' discovery thumbnail style",
    ],
  },
  cooking: {
    label: "🍕 Food & Cooking",
    prompts: [
      "Dramatic cheese pull, mozzarella stretching 5 inches, dark moody background, food porn lighting, micro detail focus",
      "Recipe ingredients flat lay, birds eye view, colorful and organized, recipe thumbnail style",
      "Chef reacting dramatically to tasting food, kiss fingers gesture, restaurant kitchen background",
      "Massive food challenge portion vs tiny person, scale comparison comedy, eating challenge thumbnail",
      "Step-by-step cooking collage, 4-panel grid in one image, tutorial thumbnail style, clean kitchen background",
      "Healthy vs unhealthy food comparison, same item made two ways side by side, food transformation theme",
    ],
  },
  motivation: {
    label: "💡 Motivation",
    prompts: [
      "Lone person at desk at 3am working, city lights through window, hustle grind aesthetic, dark room blue light",
      "Sunrise over mountain with person silhouette, inspirational composition, golden hour colors",
      "Rejection letter being torn up, determination face, comeback story thumbnail energy",
      "Person holding their own photo from years ago, glow up transformation, pride expression",
      "Clock with money falling out of it, time = money concept visualization, wake-up call thumbnail",
      "Empty vs full comparison: empty notebook vs filled notebook, progress visualization, study motivation",
    ],
  },
  truecrime: {
    label: "😱 True Crime",
    prompts: [
      "Dark mysterious figure in shadow, red and black dramatic lighting, crime documentary poster style",
      "Evidence board with string connecting clues, conspiracy theory aesthetic, dark office background",
      "News headline newspaper dramatic close-up, black and white with red headline text, breaking news thumbnail style",
      "Empty crime scene tape in abandoned location, eerie atmospheric lighting, mystery thumbnail",
      "Split face portrait: normal person on left, dark criminal reveal on right, Jekyll Hyde style",
      "Phone with disturbing text messages visible, dark thriller aesthetic, suspense thumbnail",
    ],
  },
  education: {
    label: "📚 Education",
    prompts: [
      "Brain exploding with colorful knowledge particles, learning visualization, vibrant educational style",
      "Person confidently writing on whiteboard, teaching moment, knowledge sharing aesthetic",
      "Confused vs enlightened face, before/after learning, aha moment visualization",
      "Giant glowing book opening with light pouring out, magical knowledge theme, fantasy meets education",
      "Study setup flat lay: books notes coffee highlighter, productive desk aesthetic, warm cozy lighting",
      "Graduation cap being thrown but showing the real cost/student debt reality, educational truth thumbnail",
    ],
  },
};

export const LOADING_MESSAGES = [
  { range: [0, 20], text: "Teaching AI what goes viral..." },
  { range: [20, 50], text: "Analyzing 1M+ YouTube thumbnails..." },
  { range: [50, 80], text: "Adding cinematic lighting..." },
  { range: [80, 99], text: "Rendering your masterpiece..." },
];

export type PromptLibraryItem = {
  id: string;
  category: string;
  categoryIcon: string;
  prompt: string;
  style: string;
  format: '16:9' | '9:16';
  quality: number; // 1-5
};

// Build prompt library from NICHE_TEMPLATES
export const PROMPT_LIBRARY: PromptLibraryItem[] = Object.entries(NICHE_TEMPLATES).flatMap(
  ([key, val]) => {
    const icon = val.label.split(' ')[0]; // emoji
    const styles = ['Realistic', 'Cinematic', 'Bold', 'Dark Dramatic', 'Minimal', 'Cinematic'];
    return val.prompts.map((p, i) => ({
      id: `${key}_${i}`,
      category: key,
      categoryIcon: icon,
      prompt: p,
      style: styles[i % styles.length],
      format: '16:9' as const,
      quality: Math.min(5, 3 + Math.floor(Math.random() * 3)),
    }));
  }
);
