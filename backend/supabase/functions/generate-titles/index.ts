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
  const cleanTopic = topic.trim().replace(/\s+/g, " ");
  const softAudience = audience && audience !== "General" ? ` for ${audience}` : "";
  const toneHint = tone ? ` (${tone})` : "";

  const templates: Record<Strategy, (t: string) => { title: string; why_it_works: string; emoji: string }> = {
    curiosity_gap: (t) => ({
      title: `I tried ${t} and this happened`,
      why_it_works: "Creates a curiosity gap by promising a surprising payoff.",
      emoji: "😮",
    }),
    power_number: (t) => ({
      title: `7 lessons I learned from ${t}`,
      why_it_works: "Numbered structure improves clarity and click intent.",
      emoji: "📈",
    }),
    how_to: (t) => ({
      title: `How to win at ${t}${softAudience}`,
      why_it_works: "How-to framing promises practical value quickly.",
      emoji: "🛠️",
    }),
    controversy: (t) => ({
      title: `Everyone is wrong about ${t}`,
      why_it_works: "Contrarian angle triggers debate and strong reactions.",
      emoji: "⚡",
    }),
    emotional_trigger: (t) => ({
      title: `${t} changed the way I think${toneHint}`,
      why_it_works: "Emotional framing builds personal connection and intrigue.",
      emoji: "❤️",
    }),
    fomo: (t) => ({
      title: `Do this before ${t} gets too competitive`,
      why_it_works: "Urgency and fear-of-missing-out increase immediate clicks.",
      emoji: "🚀",
    }),
  };

  const scoresByStrategy: Record<Strategy, number> = {
    curiosity_gap: 82,
    power_number: 79,
    how_to: 77,
    controversy: 75,
    emotional_trigger: 80,
    fomo: 81,
  };

  return STRATEGIES.map((strategy) => {
    const built = templates[strategy](cleanTopic || "this topic");
    return {
      title: built.title,
      strategy,
      ctr_score: scoresByStrategy[strategy],
      emoji: built.emoji,
      why_it_works: `${built.why_it_works} Language: ${language || "English"}.`,
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, category, audience, language, tone, script } = await req.json();
    if (!topic && !script) {
      return new Response(JSON.stringify({ error: "Topic or script is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (script) {
      if (!GROQ_API_KEY) {
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
- If numbers are mentioned in the key moment, include
  them visually in the scene description
- Describe background as a specific real environment
  not just 'background' — city at night, modern office,
  empty warehouse, crowded street, etc
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
  "image_prompt": "complete detailed image generation prompt ready to send directly to an AI image generator — minimum 80 words",
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

      if (!response.ok) {
        throw new Error(`Groq API returned ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);

      let finalImagePrompt = parsed.image_prompt || "";

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

    if (!GROQ_API_KEY) {
      const titles = buildFallbackTitles(topic, audience || "General", language || "English", tone || "Curious");
      return new Response(JSON.stringify({ titles, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a top YouTube growth strategist with deep knowledge of what titles go viral. Generate 6 distinct YouTube video title options. Each must use a different CTR technique from: curiosity_gap, power_number, how_to, controversy, emotional_trigger, fomo.

Respond ONLY as a JSON array with no markdown, no preamble, no code fences:
[{"title": "...", "strategy": "curiosity_gap", "ctr_score": 82, "emoji": "🔥", "why_it_works": "..."}]

Rules:
- ctr_score should be a realistic number between 55-95
- Each title should be unique and use a different strategy
- Titles should be optimized for maximum click-through rate
- If language is Hindi or regional, generate titles in that language using correct script
- Keep titles under 60 characters when possible`;

    const userPrompt = `Topic: ${topic}
Category: ${category || "General"}
Audience: ${audience || "General"}
Language: ${language || "English"}
Tone: ${tone || "Curious"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      const titles = buildFallbackTitles(topic, audience || "General", language || "English", tone || "Curious");
      return new Response(JSON.stringify({ titles, fallback: true, provider_status: response.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let titles;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        titles = JSON.parse(jsonMatch[0]);
      } else {
        titles = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse titles:", content);
      titles = buildFallbackTitles(topic, audience || "General", language || "English", tone || "Curious");
    }

    return new Response(JSON.stringify({ titles }), {
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
