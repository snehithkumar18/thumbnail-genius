import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, FileText, UserCircle2, Repeat, Target, Type, ArrowRight, 
  CheckCircle2, Zap, Eye, Check, ShieldCheck, Flame, Layers, Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturesSectionProps {
  onOpenAuth?: () => void;
}

const PIKZELS_STYLE_FEATURES = [
  {
    id: "script",
    badge: "Intelligence Layer",
    title: "Script-to-Thumbnail",
    subtitle: "Turn 2,000+ word video transcripts into ready-to-test viral thumbnails in seconds.",
    icon: FileText,
    accent: "#8B47FF",
    highlights: [
      "Gemini AI reads every line to pinpoint the single most clickable moment",
      "Automatic curiosity-gap 3D text overlay generation",
      "Tailored style routing for Extreme Challenges, Gaming, Tech, Finance & IRL",
    ],
  },
  {
    id: "persona",
    badge: "Smart Face Integration",
    title: "Creator Persona Face Swap",
    subtitle: "Your actual face in every thumbnail — without photo shoots, cameras, or awkward poses.",
    icon: UserCircle2,
    accent: "#00E5FF",
    highlights: [
      "Upload your face once to your profile; reuse it across every thumbnail",
      "Exact same person, gender, and facial features — 100% photographic realism",
      "Automatic matching of skin tone, 45° key lighting, and 3D head rotation",
    ],
  },
  {
    id: "recreate",
    badge: "Competitor Remake",
    title: "Recreate What Already Works",
    subtitle: "Paste any YouTube link. Thumbly extracts the visual DNA so you can iterate on proven viral packaging.",
    icon: Repeat,
    accent: "#F5A623",
    highlights: [
      "Analyze competitor thumbnail composition, font sizing, and color grading",
      "Recreate the exact format customized with your face and brand colors",
      "Eliminate design guesswork with validated viral formats",
    ],
  },
  {
    id: "score",
    badge: "Data-Backed Analytics",
    title: "Thumbly Score™ & One-Click Fix",
    subtitle: "Upload your thumbnail & title to get data-backed diagnostics across Virality, Clarity, Emotion & Curiosity.",
    icon: Target,
    accent: "#10B981",
    highlights: [
      "Granular 1-100 rating with visual heatmap attention simulation",
      "Instant One-Click Fix™ to boost weak contrast, bad fonts, or cluttered backgrounds",
      "Never publish a video with a blind spot again",
    ],
  },
  {
    id: "titles",
    badge: "Psychological CTR Hooks",
    title: "Click-Optimized Titles",
    subtitle: "Brief Thumbly on your topic. Get high-CTR curiosity gap and power-number titles designed to match your thumbnail.",
    icon: Type,
    accent: "#EC4899",
    highlights: [
      "6 viral title variations per generation (Curiosity Gap, Power Number, FOMO, Controversy)",
      "Multi-language support for Hindi, Hinglish, Spanish, Tamil & 20+ languages",
      "Designed specifically to complete the curiosity loop opened by the thumbnail",
    ],
  },
];

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onOpenAuth }) => {
  const [activeTab, setActiveTab] = useState(0);
  const activeFeature = PIKZELS_STYLE_FEATURES[activeTab];

  return (
    <section id="features" className="py-20 lg:py-28 relative bg-white border-t border-[#EAE5F5]">
      {/* Background radial glow */}
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-[#8B47FF]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-[3px] text-[#8B47FF] mb-3">
            The Complete Packaging Toolkit
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F0A1E] tracking-tight mb-5">
            You Fixed The Flops. <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8B47FF] via-[#A855F7] to-[#00B4D8]">
              Now Create The Winners.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-[#524B66]">
            Everything you need to create, test & scale high-converting YouTube packaging effortlessly.
          </p>
        </div>

        {/* Interactive Tabs Bar */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {PIKZELS_STYLE_FEATURES.map((feat, idx) => {
            const isSelected = idx === activeTab;
            const Icon = feat.icon;
            return (
              <button
                key={feat.id}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 select-none cursor-pointer ${
                  isSelected
                    ? "bg-[#8B47FF] text-white shadow-[0_4px_16px_rgba(139,71,255,0.35)]"
                    : "text-[#524B66] hover:text-[#0F0A1E] hover:bg-[#F0EDF8] bg-white border border-[#EAE5F5]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{feat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Showcase Box */}
        <div className="rounded-3xl border border-[#EAE5F5] bg-[#FAF9FD] p-6 sm:p-10 shadow-xl overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              {/* Left Column: Feature Details */}
              <div className="lg:col-span-6 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#8B47FF]/10 border border-[#8B47FF]/20 text-[#8B47FF]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeFeature.badge}
                </span>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F0A1E] tracking-tight">
                  {activeFeature.title}
                </h3>

                <p className="text-base text-[#524B66] leading-relaxed">
                  {activeFeature.subtitle}
                </p>

                <div className="space-y-3 pt-2">
                  {activeFeature.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#8B47FF] shrink-0 mt-1" />
                      <span className="text-sm text-[#0F0A1E] font-medium leading-normal">{h}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Button
                    variant="hero"
                    onClick={onOpenAuth}
                    className="rounded-full px-6 font-semibold gap-2 shadow-[0_0_25px_rgba(139,71,255,0.35)]"
                  >
                    Try {activeFeature.title} Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right Column: Dedicated Visual Feature Explainer Card */}
              <div className="lg:col-span-6">
                <FeatureVisualCard featureId={activeFeature.id} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

// Dedicated Visual Explainer Card that visually demonstrates the exact mechanics of each feature
function FeatureVisualCard({ featureId }: { featureId: string }) {
  switch (featureId) {
    case "script":
      return <ScriptToThumbnailVisual />;
    case "persona":
      return <PersonaFaceSwapVisual />;
    case "recreate":
      return <RecreateCompetitorVisual />;
    case "score":
      return <ThumblyScoreVisual />;
    case "titles":
      return <ClickOptimizedTitlesVisual />;
    default:
      return <ScriptToThumbnailVisual />;
  }
}

// 1. Script-to-Thumbnail Visual Explainer
function ScriptToThumbnailVisual() {
  return (
    <div className="rounded-2xl border border-[#2D1B54] bg-[#0E0720] p-4 sm:p-5 shadow-2xl text-white space-y-3.5">
      {/* Script Intake Simulation */}
      <div className="rounded-xl bg-[#170C36] border border-[#39206A] p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-[#00E5FF] font-semibold">
            <FileText className="h-3.5 w-3.5" />
            <span>Raw Transcript Input (2,150 words)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#8B47FF]/30 text-[#C4A8FF] font-mono text-[10px] font-bold">
            Gemini 2.5 Pro Parser
          </span>
        </div>
        <p className="text-xs text-zinc-300 font-mono leading-relaxed line-clamp-2">
          "...we launched a 120-ton Canadian Pacific freight locomotive at full speed directly into a 20-foot solid brick wall to see if anything on earth could stop it..."
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="bg-[#8B47FF]/30 text-white text-[10px] font-semibold px-2 py-0.5 rounded border border-[#8B47FF]/50">
            ⚡ Climax: Locomotive Impact
          </span>
          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/40">
            🧱 Obstacle: Brick Wall
          </span>
          <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-cyan-500/40">
            😱 Emotion: Disbelief
          </span>
        </div>
      </div>

      {/* AI Conversion Flow Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#A855F7] tracking-wider uppercase">
        <Zap className="h-3.5 w-3.5 fill-[#A855F7]" />
        <span>Auto-Synthesized Into High-CTR YouTube Thumbnail</span>
      </div>

      {/* Resulting 4K Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/20 shadow-inner group">
        <img
          src="/hero-thumb-train.jpg"
          alt="Script to Thumbnail Result"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

        {/* Visual Mapping Annotations */}
        <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-amber-300 border border-amber-400/40 flex items-center gap-1">
          <Scan className="h-3 w-3" />
          <span>Extracted Conflict: Brick Destruction</span>
        </div>

        <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
          <Scan className="h-3 w-3" />
          <span>99% Eye Fixation: Shock Face</span>
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-black text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] uppercase">
            "CAN BRICK STOP TRAIN?!"
          </span>
          <span className="bg-[#8B47FF] text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
            98 Virality Score
          </span>
        </div>
      </div>
    </div>
  );
}

// 2. Creator Persona Face Swap Visual Explainer (Same Person, Same Gender, Ultra Realistic)
function PersonaFaceSwapVisual() {
  return (
    <div className="rounded-2xl border border-[#2D1B54] bg-[#0E0720] p-4 sm:p-5 shadow-2xl text-white space-y-3.5">
      <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-[#00E5FF] font-bold">
          <UserCircle2 className="h-4 w-4" />
          <span>Facial Consistency & Studio Rim-Lighting</span>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
          100% Photographic Realism
        </span>
      </div>

      {/* Side-by-Side Comparison of the Exact Same Person */}
      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/20 shadow-inner group">
        <img
          src="/feature-persona-showcase.jpg"
          alt="Creator Persona Before and After"
          className="w-full h-full object-cover"
        />

        {/* Badges Over Left & Right Panels */}
        <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-cyan-300 border border-cyan-400/40">
          1. Raw Upload (Plain Wall)
        </div>
        <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-[#A855F7] border border-[#A855F7]/40">
          2. YouTube Thumbnail Integration
        </div>
      </div>

      {/* Validation Checklist proving realism & consistency */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1">
        <div className="flex items-center gap-1.5 bg-[#170C36] p-2 rounded-lg border border-[#39206A]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>Same person & natural facial expression</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#170C36] p-2 rounded-lg border border-[#39206A]">
          <Check className="h-3.5 w-3.5 text-[#00E5FF] shrink-0" />
          <span>Dynamic 45° studio rim lighting matched</span>
        </div>
      </div>
    </div>
  );
}

// 3. Recreate What Already Works Visual Explainer
function RecreateCompetitorVisual() {
  return (
    <div className="rounded-2xl border border-[#2D1B54] bg-[#0E0720] p-4 sm:p-5 shadow-2xl text-white space-y-3.5">
      {/* Competitor URL Ingestion */}
      <div className="rounded-xl bg-[#170C36] border border-[#39206A] p-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Repeat className="h-4 w-4 text-[#F5A623] shrink-0" />
          <span className="font-mono text-xs text-zinc-200 truncate">
            https://youtube.com/watch?v=MrBeastXRonaldo
          </span>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded shrink-0">
          ✓ Packaging Deconstructed
        </span>
      </div>

      {/* Reverse Engineered Thumbnail Display */}
      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/20 shadow-inner group">
        <img
          src="/feature-recreate-showcase.jpg"
          alt="Competitor Remake Showcase"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
          Validated Viral Packaging
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className="text-xs font-bold text-yellow-300 drop-shadow">
            CHALLENGE: CHAMPION VS STREAMER
          </span>
          <span className="bg-[#8B47FF] text-white text-[10px] font-bold px-2 py-0.5 rounded">
            Proven Viral Formula
          </span>
        </div>
      </div>

      {/* Layer Stack Explanation */}
      <div className="space-y-1.5 text-xs text-zinc-300 pt-0.5">
        <div className="flex items-center justify-between text-[11px] bg-[#170C36] px-2.5 py-1.5 rounded border border-[#39206A]">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Layers className="h-3.5 w-3.5 text-[#F5A623]" />
            <span>Layer 1: Cyan vs Orange High-Complementary Split</span>
          </span>
          <span className="text-emerald-400 font-bold text-[10px]">+58% CTR</span>
        </div>
        <div className="flex items-center justify-between text-[11px] bg-[#170C36] px-2.5 py-1.5 rounded border border-[#39206A]">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Layers className="h-3.5 w-3.5 text-[#00E5FF]" />
            <span>Layer 2: 50/50 Dual Celebrity Focal Framing</span>
          </span>
          <span className="text-cyan-300 font-bold text-[10px]">Rule of Halves</span>
        </div>
      </div>
    </div>
  );
}

// 4. Thumbly Score™ & Heatmap Visual Explainer
function ThumblyScoreVisual() {
  return (
    <div className="rounded-2xl border border-[#2D1B54] bg-[#0E0720] p-4 sm:p-5 shadow-2xl text-white space-y-3.5">
      {/* Score Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Eye className="h-4 w-4" />
          <span>Eye-Tracking Attention Heatmap Audit</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-extrabold border border-emerald-500/30">
          98/100 (Top 1% Virality)
        </span>
      </div>

      {/* Heatmap Attention Simulation on Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/20 shadow-inner group">
        <img
          src="/hero-thumb-train.jpg"
          alt="Heatmap Attention Audit"
          className="w-full h-full object-cover"
        />

        {/* Heatmap Attention Hotspots */}
        {/* Hotspot 1: Face (Extreme Red/Orange Concentric Glow) */}
        <div className="absolute top-[28%] right-[12%] -translate-y-1/2 w-28 h-28 rounded-full bg-red-500/40 blur-xl pointer-events-none animate-pulse" />
        <div className="absolute top-[28%] right-[16%] -translate-y-1/2 w-14 h-14 rounded-full border-2 border-red-500 bg-red-500/30 flex items-center justify-center">
          <span className="text-[10px] font-extrabold text-white bg-red-600 px-1 py-0.5 rounded shadow">
            99% Gaze
          </span>
        </div>

        {/* Hotspot 2: Train Collision (Amber Glow) */}
        <div className="absolute top-[45%] left-[28%] -translate-y-1/2 w-32 h-32 rounded-full bg-amber-500/35 blur-xl pointer-events-none" />
        <div className="absolute top-[45%] left-[30%] -translate-y-1/2 w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-500/30 flex items-center justify-center">
          <span className="text-[10px] font-extrabold text-white bg-amber-600 px-1 py-0.5 rounded shadow">
            94% Gaze
          </span>
        </div>

        {/* Mobile Safe Zone Guideline */}
        <div className="absolute inset-3 border border-dashed border-white/40 rounded-lg pointer-events-none flex items-end justify-start p-1.5">
          <span className="text-[9px] font-mono text-zinc-300 bg-black/70 px-1.5 py-0.5 rounded">
            Mobile Safe Zone
          </span>
        </div>
      </div>

      {/* Diagnostics Meters */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
        <div className="bg-[#170C36] p-2 rounded-lg border border-[#39206A]">
          <p className="text-zinc-400">Emotion Intensity</p>
          <p className="text-sm font-black text-emerald-400">97 / 100</p>
        </div>
        <div className="bg-[#170C36] p-2 rounded-lg border border-[#39206A]">
          <p className="text-zinc-400">Subject Contrast</p>
          <p className="text-sm font-black text-cyan-400">96 / 100</p>
        </div>
        <div className="bg-[#170C36] p-2 rounded-lg border border-[#39206A]">
          <p className="text-zinc-400">Mobile 1.5" Test</p>
          <p className="text-sm font-black text-yellow-400">PASSED</p>
        </div>
      </div>
    </div>
  );
}

// 5. Click-Optimized Titles Visual Explainer (Curiosity Loop)
function ClickOptimizedTitlesVisual() {
  return (
    <div className="rounded-2xl border border-[#2D1B54] bg-[#0E0720] p-4 sm:p-5 shadow-2xl text-white space-y-3.5">
      {/* Curiosity Loop Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-[#EC4899] font-bold">
          <Type className="h-4 w-4" />
          <span>Curiosity Loop Title Pairing</span>
        </div>
        <span className="text-[10px] font-mono text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-full font-bold border border-pink-500/30">
          Paired With Thumbnail
        </span>
      </div>

      {/* Packaging Hook Thumbnail */}
      <div className="relative aspect-[21/9] rounded-xl overflow-hidden border border-white/20 shadow-inner group">
        <img
          src="/feature-titles-contrast.jpg"
          alt="Visual Hook for Title Generation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-1.5 left-2.5 text-[11px] font-bold text-yellow-300">
          Visual Hook: $1 Camping Cot vs $1,000,000 Hotel Suite
        </div>
      </div>

      {/* Generated Title Variations with Retention Scores */}
      <div className="space-y-1.5 text-xs">
        <div className="p-2 rounded-lg bg-[#170C36] border border-[#8B47FF]/40 flex items-center justify-between gap-2">
          <div className="space-y-0.5 truncate">
            <span className="text-[9px] font-bold uppercase text-[#C4A8FF] tracking-wider block">
              Curiosity Gap Hook (Recommended)
            </span>
            <p className="font-semibold text-white truncate text-xs">
              "I Slept In A $1 Camping Cot vs $1,000,000 Luxury Suite!"
            </p>
          </div>
          <span className="bg-[#8B47FF] text-white text-[10px] font-extrabold px-2 py-1 rounded shrink-0 flex items-center gap-1">
            <Flame className="h-3 w-3 fill-white" />
            98 CTR
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#170C36] border border-[#39206A] flex items-center justify-between gap-2">
          <div className="space-y-0.5 truncate">
            <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider block">
              High-Stakes Superlative Hook
            </span>
            <p className="font-semibold text-zinc-200 truncate text-xs">
              "The Most Expensive Luxury Hotel Suite In The World..."
            </p>
          </div>
          <span className="bg-white/10 text-zinc-300 text-[10px] font-extrabold px-2 py-1 rounded shrink-0">
            95 CTR
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#170C36] border border-[#39206A] flex items-center justify-between gap-2">
          <div className="space-y-0.5 truncate">
            <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider block">
              Proven YouTube Pattern
            </span>
            <p className="font-semibold text-zinc-200 truncate text-xs">
              "$1 vs $1,000,000 Hotel Suite!"
            </p>
          </div>
          <span className="bg-white/10 text-zinc-300 text-[10px] font-extrabold px-2 py-1 rounded shrink-0">
            97 CTR
          </span>
        </div>
      </div>
    </div>
  );
}

export default FeaturesSection;
