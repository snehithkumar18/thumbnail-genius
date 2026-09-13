import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRATEGIES = [
  "curiosity_gap",
  "power_number",
  "how_to",
  "controversy",
  "emotional_trigger",
  "fomo",
] as const;

type Strategy = typeof STRATEGIES[number];

const buildFallbackTitles = (topic: string, audience: string, language: string, tone: string) => {
  const cleanTopic = topic.trim().replace(/\s+/g, " ").slice(0, 35);
  const softAudience = audience && audience !== "General" ? ` for ${audience}` : "";

  const templates: Record<Strategy, (t: string) => { title: string; why_it_works: string; emoji: string }> = {
    curiosity_gap: (t) => ({
      title: `I Tried ${t} & Regret Everything 😱`,
      why_it_works: "Creates an irresistible curiosity gap by teasing an unexpected payoff.",
      emoji: "😱",
    }),
    power_number: (t) => ({
      title: `7 ${t} Secrets Nobody Tells You 🔥`,
      why_it_works: "Numbered list promises fast, high-density value with insider secrets.",
      emoji: "🔥",
    }),
    how_to: (t) => ({
      title: `How to Master ${t} in 10 Min ⚡`,
      why_it_works: "Clear actionable promise with an ultra-fast timeframe.",
      emoji: "⚡",
    }),
    controversy: (t) => ({
      title: `Stop Doing ${t} Right Now 🛑`,
      why_it_works: "Direct warning triggers cognitive dissonance and urgent clicks.",
      emoji: "🛑",
    }),
    emotional_trigger: (t) => ({
      title: `The Harsh Truth About ${t} 💀`,
      why_it_works: "Emotional vulnerability and truth-seeking hook viewer empathy.",
      emoji: "💀",
    }),
    fomo: (t) => ({
      title: `Do THIS With ${t} Before It's Gone 🚨`,
      why_it_works: "Urgency and fear of missing out force immediate engagement.",
      emoji: "🚨",
    }),
  };

  const scoresByStrategy: Record<Strategy, number> = {
    curiosity_gap: 96,
    power_number: 94,
    how_to: 92,
    controversy: 95,
    emotional_trigger: 93,
    fomo: 97,
  };

  return STRATEGIES.map((strategy) => {
    const built = templates[strategy](cleanTopic || "This");
    return {
      title: built.title,
      strategy,
      ctr_score: scoresByStrategy[strategy],
      emoji: built.emoji,
      why_it_works: `${built.why_it_works} Optimized for ${language || "English"}.`,
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, category, audience, language, tone, script, mode } = await req.json();
    if (!topic && !script) {
      return new Response(JSON.stringify({ error: "Topic or script is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    // Differentiate between Script-to-Thumbnail (called by GeneratePage) and Script/Topic-to-Titles (called by TitleGeneratorPage)
    const isThumbnailMode = mode === "thumbnail" || (script && !mode && !topic && !category && !audience && !tone);

    if (isThumbnailMode) {
      if (!GEMINI_API_KEY && !GROQ_API_KEY) {
        return new Response(JSON.stringify({
          image_prompt: "Shocked man looking at a screen, high detail, dramatic lighting, YouTube thumbnail composition, 16:9 aspect ratio, eye-catching, professional photography quality, cinematic color grading, high contrast, sharp focus on subject, bokeh background",
          fallback: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `You are the world's best YouTube thumbnail strategist.
You have studied 50 million YouTube thumbnails and know
exactly what makes someone stop scrolling and click.

You will be given a raw video script or transcript.
Your job is to read every single line and find the ONE
moment that would make someone who has NEVER seen this
video desperately want to click on it.

WHAT MAKES A MOMENT CLICKABLE:
- A shocking number or statistic revealed
- An unexpected outcome nobody saw coming
- The highest emotional peak in the story
- A before/after transformation moment
- A secret or revelation being exposed
- The scariest or most dramatic sentence
- A controversial or bold statement
- A surprising failure or unexpected success

YOUR ANALYSIS PROCESS:
Step 1: Read the entire script
Step 2: List every potentially dramatic moment you find
Step 3: Rank them by how much a viewer who has NOT
        watched would be curious about it
Step 4: Pick the single highest ranked moment
Step 5: Extract the visual elements of that moment
Step 6: Build a complete image generation prompt

RULES FOR THE IMAGE PROMPT:
- If the script uses 'I' or 'me' → include a person
  with a specific facial expression matching the emotion
- Always specify lighting: dramatic, cinematic, overhead,
  rim light, neon, golden hour — pick what fits the emotion
- Always specify colors that amplify the emotion:
  RED = danger, loss, shock
  GOLD/YELLOW = money, success, wealth  
  DARK/BLUE = mystery, fear, serious
  GREEN = growth, health, nature
  BRIGHT/VIVID = energy, excitement, gaming
- Always specify composition: close-up face filling 70%
  of frame, rule of thirds, central subject, split screen
- TEXT OVERLAY REQUIREMENT: If text will boost CTR (almost always yes), you MUST explicitly embed hyper-detailed text rendering instructions directly in the image_prompt! Specify:
  1. Exact Wording in quotes (e.g. text reading "NOT ALONE?")
  2. Exact 2D Position (e.g. top-left corner, centered top, bottom right badge)
  3. Exact Colors & Effects (e.g. electric bright neon yellow with thick 3D black outline, white stroke, and drop shadow)
  4. Exact Font Style (e.g. ultra-bold heavy impact sans-serif font, viral MrBeast style typography)
  If multiple text elements are needed (e.g. main title + badge/number), specify both!
- If numbers are mentioned in the key moment, include
  them visually in the scene description or text
- Describe background as a specific real environment
  not just 'background' — city at night, modern office,
  empty warehouse, crowded street, etc
- PROMPT LENGTH & QUALITY REQUIREMENT: Focus 100% on maximum visual quality, clarity, and depth. Do NOT restrict or artificially cap prompt length — make the prompt dynamically flexible. Expand with as much rich detail as needed to describe every subject, facial micro-expression, ambient lighting, atmospheric particles, camera angle, 3D text placement, font typography, and background environment.
- Max 5 words for text overlay — make it punchy and
  incomplete so viewer NEEDS to watch to understand

EMOTION TO EXPRESSION MAPPING:
shock → eyes wide, mouth slightly open, hands on face
excitement → big smile, pointing at something off-camera
fear → looking over shoulder, eyes narrowed, tense jaw
triumph → fist pump, confident smile, chest out
disbelief → head tilted, squinting, one eyebrow raised
curiosity → leaning forward, chin resting on hand
anger → jaw clenched, eyebrows furrowed, staring directly
sadness → looking down, slumped shoulders, distant gaze

Return ONLY this exact JSON structure, nothing else,
no markdown, no explanation outside the JSON:

{
  "key_moment": "exact quote or paraphrase from script",
  "emotion": "single word emotion",
  "why_this_moment": "one sentence on why this gets clicks",
  "character_expression": "specific facial expression description",
  "dominant_color": "hex code of the dominant color",
  "image_prompt": "complete hyper-detailed photorealistic image generation prompt of flexible length tailored precisely to the visual complexity of the script — MUST INCLUDE explicit text rendering instructions with wording in quotes, font style, placement, colors, and 3D stroke outline for maximum viral clickability",
  "text_overlay": "max 5 words, punchy, creates curiosity gap",
  "category": "finance/tech/gaming/story/tutorial/motivation/education/drama"
}`;

      const userMessage = `Here is the complete video script. Read every line
carefully before deciding which moment is most clickable.

SCRIPT START:
${script}
SCRIPT END:

Remember: pick the moment that would make someone
who has NOT watched this video most desperately
want to click. Not the most important moment.
The most curiosity-inducing moment.`;

      let parsed: any = null;

      // 1. Try Gemini API first with model fallback chain
      if (GEMINI_API_KEY) {
        const geminiModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"];
        for (const model of geminiModels) {
          try {
            console.log(`[generate-titles] Analyzing script with Gemini API (${model})...`);
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemPrompt }]
                },
                contents: [
                  { role: "user", parts: [{ text: userMessage }] }
                ],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.7
                }
              })
            });

            if (response.ok) {
              const aiData = await response.json();
              const textContent = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (textContent) {
                parsed = JSON.parse(textContent);
                console.log(`[generate-titles] Gemini API (${model}) script analysis successful!`);
                break;
              }
            } else {
              console.warn(`[generate-titles] Gemini API (${model}) returned status ${response.status}`);
            }
          } catch (gErr) {
            console.warn(`[generate-titles] Gemini API (${model}) call failed:`, gErr);
          }
        }
      }

      // 2. Fallback to Groq API if Gemini is unavailable or failed
      if (!parsed && GROQ_API_KEY) {
        try {
          console.log("[generate-titles] Falling back to Groq API...");
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              temperature: 0.7,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
            }),
          });

          if (response.ok) {
            const aiData = await response.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            if (content) {
              parsed = JSON.parse(content);
              console.log("[generate-titles] Groq API script analysis successful!");
            }
          }
        } catch (qErr) {
          console.warn("[generate-titles] Groq API call failed:", qErr);
        }
      }

      if (!parsed) {
        return new Response(JSON.stringify({
          image_prompt: "Shocked man looking at a screen, high detail, dramatic lighting, YouTube thumbnail composition, 16:9 aspect ratio, eye-catching, professional photography quality, cinematic color grading, high contrast, sharp focus on subject, bokeh background, with bold text reading 'SHOCKING SECRET!' in bright yellow letters",
          fallback: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let finalImagePrompt = parsed.image_prompt || "";

      // Ensure explicit text overlay instructions are included in the prompt
      if (parsed.text_overlay && !finalImagePrompt.toLowerCase().includes(parsed.text_overlay.toLowerCase())) {
        finalImagePrompt += `, featuring bold high-contrast graphic text reading "${parsed.text_overlay}" positioned prominently at top-left with electric bright neon yellow fill, thick 3D black stroke outline, drop shadow, and ultra-crisp heavy impact typography`;
      }

      // Post-Processing Step 1: Quality suffix injection
      finalImagePrompt += ", YouTube thumbnail composition, 16:9 aspect ratio, eye-catching, professional photography quality, cinematic color grading, high contrast, sharp focus on subject, bokeh background";

      // Post-Processing Step 2: Category routing style modifiers
      const cat = (parsed.category || "").toLowerCase();
      if (cat === "finance") {
        finalImagePrompt += ", wealth visualization, luxury aesthetic, gold and dark color palette";
      } else if (cat === "tech") {
        finalImagePrompt += ", futuristic holographic elements, blue neon lighting, digital environment";
      } else if (cat === "gaming") {
        finalImagePrompt += ", vivid saturated colors, dramatic action, gaming aesthetic, explosive energy";
      } else if (cat === "motivation") {
        finalImagePrompt += ", sunrise or golden hour lighting, epic wide angle, inspirational energy";
      } else if (cat === "drama" || cat === "story") {
        finalImagePrompt += ", dark dramatic lighting, high contrast, emotional atmosphere, cinematic quality";
      } else if (cat === "education") {
        finalImagePrompt += ", clean bright lighting, clear subject, professional and trustworthy aesthetic";
      } else if (cat === "tutorial") {
        finalImagePrompt += ", step-by-step visual cues, clean background, instructional composition";
      }

      return new Response(JSON.stringify({ 
        image_prompt: finalImagePrompt,
        key_moment: parsed.key_moment,
        emotion: parsed.emotion,
        text_overlay: parsed.text_overlay,
        reasoning: parsed.why_this_moment || parsed.reasoning,
        category: parsed.category,
        character_expression: parsed.character_expression,
        dominant_color: parsed.dominant_color,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // SCRIPT-TO-TITLE & TOPIC-TO-TITLE PIPELINE
    // ==========================================
    const inputContent = (script || topic || "").trim();

    const titleSystemPrompt = `You are the world's elite YouTube growth strategist, headline copywriter, and title engineer. You have studied over 100 million viral YouTube videos (MrBeast, Veritasium, Ali Abdaal, Dhruv Rathee, MagnatesMedia).

YOUR PRIMARY MISSION:
1. Carefully analyze the entire script or topic provided by the user.
2. Pinpoint the ONE single most dramatic, shocking, or curiosity-inducing moment ("viral_point" and "key_moment"). What is the exact revelation, twist, or tension peak that would make a complete stranger stop scrolling and click?
3. Generate exactly 6 distinct, ultra-clickable, SHORT YouTube titles based on that viral hook.

STRICT TITLE FORMATTING RULES:
- SHORT & PUNCHY: Each title MUST be short, crisp, and high-impact. Strictly between 3 and 8 words (under 50 characters, never exceed 60 characters).
- ABSOLUTELY NO PARAGRAPHS: NEVER generate explanations, full sentences of narration, or paragraph-length titles. A YouTube title is a sharp hook, NOT a summary.
- RELEVANT VIRAL EMOJIS: Include 1 or 2 relevant high-impact emojis (e.g. 🔥, 😱, 🤯, 💀, 💰, 🤫, 🚨, 🛑, ⚡, 📈) in every title that match the emotional trigger.
- PREDICTED CTR SCORE ABOVE 90%: Every single title MUST have a predicted ctr_score strictly between 91 and 98 (e.g. 92, 94, 95, 96, 97, 98) representing elite viral clickability. Never return anything below 91.
- STRATEGIES: Generate exactly one title for each of these 6 proven viral strategies:
  1. curiosity_gap (e.g. "I Tried This For 7 Days... 😱")
  2. power_number (e.g. "3 Secrets That Made $100K 💰")
  3. how_to (e.g. "How to 10X Faster (Step by Step) ⚡")
  4. controversy (e.g. "Stop Doing This Immediately 🛑")
  5. emotional_trigger (e.g. "The Brutal Truth I Hid For Years 💀")
  6. fomo (e.g. "Do This Before It Gets Banned 🚨")
- LANGUAGE & LOCALIZATION: If language is Hindi/Hinglish/Spanish/etc., craft culturally resonant titles using that language's viral YouTube phrasing.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN, NO PREAMBLE):
{
  "viral_point": "1 concise sentence explaining the psychological hook / viral core of the script",
  "key_moment": "The specific shocking revelation, twist, or quote from the script",
  "emotion": "Single word emotion (Shock, Urgency, Curiosity, Disbelief, Wealth, Triumph)",
  "titles": [
    {
      "title": "Short Punchy Title With Emoji 🔥",
      "strategy": "curiosity_gap",
      "ctr_score": 96,
      "emoji": "🔥",
      "why_it_works": "Creates an irresistible curiosity gap by teasing an unexpected payoff."
    }
  ]
}`;

    const titleUserPrompt = script
      ? `Full Video Script / Transcript:
---
${script}
---
Autonomous Task: Analyze the entire script to understand what the video is about. Automatically identify the niche, language, target audience, and the #1 viral climax/hook. Then generate 6 short titles (strictly 3-8 words, under 50 chars) with emojis and predicted CTR above 90.`
      : `Video Topic / Idea / Prompt:
"${topic}"
Autonomous Task: Understand what this video is about. Automatically determine the best viral angle and emotional climax. Generate 6 short, ultra-clickable titles (strictly 3-8 words, under 50 chars) with emojis and predicted CTR above 90.`;

    let titleData: any = null;

    // 1. Try Gemini API first with model fallback chain
    if (GEMINI_API_KEY) {
      const geminiModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"];
      for (const model of geminiModels) {
        try {
          console.log(`[generate-titles] Generating viral titles with Gemini API (${model})...`);
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: titleSystemPrompt }]
              },
              contents: [
                { role: "user", parts: [{ text: titleUserPrompt }] }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.75
              }
            })
          });

          if (response.ok) {
            const resJson = await response.json();
            const textContent = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (textContent) {
              titleData = JSON.parse(textContent);
              console.log(`[generate-titles] Gemini API (${model}) title generation successful!`);
              break;
            }
          } else {
            console.warn(`[generate-titles] Gemini API (${model}) returned status ${response.status}`);
          }
        } catch (gErr) {
          console.warn(`[generate-titles] Gemini API (${model}) call failed:`, gErr);
        }
      }
    }

    // 2. Try Groq API fallback
    if (!titleData && GROQ_API_KEY) {
      try {
        console.log("[generate-titles] Falling back to Groq API for title generation...");
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            temperature: 0.75,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: titleSystemPrompt },
              { role: "user", content: titleUserPrompt },
            ],
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          const content = resJson.choices?.[0]?.message?.content || "";
          if (content) {
            titleData = JSON.parse(content);
            console.log("[generate-titles] Groq API title generation successful!");
          }
        } else {
          console.warn(`[generate-titles] Groq API returned status ${response.status}`);
        }
      } catch (qErr) {
        console.warn("[generate-titles] Groq API call failed:", qErr);
      }
    }

    // Extract or build titles list
    let rawTitles = titleData?.titles;
    if (!rawTitles && Array.isArray(titleData)) {
      rawTitles = titleData;
    }

    if (!Array.isArray(rawTitles) || rawTitles.length === 0) {
      console.log("[generate-titles] Using fallback titles builder");
      const fallbackList = buildFallbackTitles(topic || script?.slice(0, 100) || "this video", audience || "General", language || "English", tone || "Shocking");
      return new Response(JSON.stringify({
        titles: fallbackList,
        viral_point: titleData?.viral_point || "High-intensity hook revealing an unexpected secret or dramatic outcome",
        key_moment: titleData?.key_moment || (script ? script.slice(0, 120) + "..." : topic),
        emotion: titleData?.emotion || "Shock",
        fallback: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce strict rules: Short titles (no paragraphs), valid emojis, and CTR scores strictly >= 91 (above 90)
    const strategyEmojiMap: Record<string, string> = {
      curiosity_gap: "😱",
      power_number: "💰",
      how_to: "⚡",
      controversy: "🛑",
      emotional_trigger: "💀",
      fomo: "🚨",
    };

    const cleanedTitles = rawTitles.map((item: any, idx: number) => {
      const strat = item.strategy || STRATEGIES[idx % STRATEGIES.length];
      const defaultEmoji = strategyEmojiMap[strat] || "🔥";
      const emoji = item.emoji || defaultEmoji;

      let cleanTitle = String(item.title || "").trim().replace(/^["']|["']$/g, "");

      // Strip long paragraph explanations or multi-sentence runs
      if (cleanTitle.length > 60) {
        const sentenceSplit = cleanTitle.split(/[.!?:\n]/);
        if (sentenceSplit[0] && sentenceSplit[0].length >= 15) {
          cleanTitle = sentenceSplit[0].trim();
        }
        if (cleanTitle.length > 55) {
          const words = cleanTitle.split(/\s+/);
          cleanTitle = words.slice(0, 8).join(" ");
        }
      }

      // Ensure title contains an emoji
      const hasEmoji = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}]/u.test(cleanTitle);
      if (!hasEmoji) {
        cleanTitle = `${cleanTitle} ${emoji}`;
      }

      // Strictly enforce CTR score above 90 (between 91 and 98)
      let score = Number(item.ctr_score);
      if (isNaN(score) || score < 91) {
        // Map to 91-98
        score = 92 + (idx % 7);
      }
      score = Math.max(91, Math.min(98, Math.round(score)));

      return {
        title: cleanTitle,
        strategy: strat,
        ctr_score: score,
        emoji: emoji,
        why_it_works: item.why_it_works || "Engineered with curiosity gap and psychological hook for maximum CTR.",
      };
    });

    return new Response(JSON.stringify({
      titles: cleanedTitles,
      viral_point: titleData?.viral_point || "A high-stakes revelation that triggers intense curiosity and immediate clicks",
      key_moment: titleData?.key_moment || (script ? script.slice(0, 100) + "..." : topic),
      emotion: titleData?.emotion || "Curiosity",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    console.error("generate-titles error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
