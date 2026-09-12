import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, UserCircle2, Repeat, Target, Type, ArrowRight, CheckCircle2, Zap } from "lucide-react";
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
      "Tailored style routing for Finance, Gaming, Tech, Drama & Tutorials",
    ],
    preview: {
      tag: "Gemini 2.5 Pro Pipeline",
      image: "/feature-script-to-thumb.jpg",
      inputSample: "Raw Video Script (2,150 words)...",
      outputTitle: "Auto-extracted Climax: T-Rex Rampage Escape",
      outputOverlay: "T-REX RAMPAGE! (EPIC ESCAPE)",
      score: "98/100 Virality",
    },
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
      "Automatic matching of skin tone, lighting angle, and 3D head rotation",
      "Preserves original facial expressions (shock, disbelief, triumph)",
    ],
    preview: {
      tag: "Persona Vault Engine",
      image: "/waitlist/faceswap-after.png",
      inputSample: "1 Profile Reference Photo",
      outputTitle: "Seamlessly placed into 4K YouTube scene with matching rim lighting",
      outputOverlay: "AUTHENTIC EXPRESSION PRESERVED",
      score: "100% Studio Consistency",
    },
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
    preview: {
      tag: "Viral Reverse-Engineer",
      image: "/thumb-celine-dept.jpg",
      inputSample: "youtube.com/watch?v=CelineDeptChallenge",
      outputTitle: "Extracted Composition & Color Chemistry",
      outputOverlay: "INSANE NEON TARGET CHALLENGE!",
      score: "Tested Format (6.4M Views)",
    },
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
    preview: {
      tag: "AI Heatmap & Contrast Audit",
      image: "/thumb-mrbeast-train.jpg",
      inputSample: "Uploaded Thumbnail Draft",
      outputTitle: "Attention Audit: Subject Contrast 96%, Mobile Eye-Tracking 98%",
      outputOverlay: "VIRALITY SCORE: 98/100",
      score: "Top 1% Packaging",
    },
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
    preview: {
      tag: "Curiosity Loop Title Engine",
      image: "/thumb-indian-mystery.jpg",
      inputSample: "Topic: Opening 10,000 mystery gift boxes",
      outputTitle: "Hook: '10,000 Glowing Boxes Opened! (Hacker's Mega Challenge)'",
      outputOverlay: "HIGH RETENTION 3-WORD HOOK",
      score: "92 CTR Score",
    },
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
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeFeature.badge}
                </span>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {activeFeature.title}
                </h3>

                <p className="text-base text-muted-foreground leading-relaxed">
                  {activeFeature.subtitle}
                </p>

                <div className="space-y-3 pt-2">
                  {activeFeature.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />
                      <span className="text-sm text-foreground/90 font-medium leading-normal">{h}</span>
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

              {/* Right Column: Interactive Visual Showcase Card */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-border/90 bg-[#0F081D] p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-border/50">
                    <span className="font-mono text-muted-foreground uppercase font-bold tracking-wider">
                      {activeFeature.preview.tag}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-bold text-[11px]">
                      {activeFeature.preview.score}
                    </span>
                  </div>

                  {/* Simulated Visual Window */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-border/60 flex flex-col justify-end p-4 shadow-inner group">
                    {/* Real preview image */}
                    {activeFeature.preview.image && (
                      <img
                        src={activeFeature.preview.image}
                        alt={activeFeature.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 pointer-events-none" />

                    <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-200 border border-white/10">
                      Input: {activeFeature.preview.inputSample}
                    </div>

                    <div className="relative z-10 space-y-1">
                      <p className="text-base sm:text-lg font-black text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] uppercase">
                        "{activeFeature.preview.outputOverlay}"
                      </p>
                      <p className="text-xs text-zinc-200 font-semibold drop-shadow">
                        {activeFeature.preview.outputTitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/70 text-center font-medium">
                    ⚡ Fast 10-15s generation • High CTR tested • 100% Commercial Rights
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
