import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const features = [
  { emoji: "⚡", title: "Text to Thumbnail", desc: "Type a prompt, get a viral thumbnail", from: "Canva" },
  { emoji: "🔁", title: "Recreate from YouTube URL", desc: "Paste any YouTube URL, recreate that style instantly", from: "Pikzels" },
  { emoji: "🧑", title: "Face Swap", desc: "Put your face in any thumbnail seamlessly", from: "Photoshop" },
  { emoji: "✏️", title: "AI Editor", desc: "Refine thumbnails with simple text instructions", from: "Figma" },
  { emoji: "📱", title: "Shorts Generator", desc: "9:16 vertical covers for YouTube Shorts", from: "Canva" },
  { emoji: "🌍", title: "Hindi & Multi-Language", desc: "Thumbnails with Hindi, Tamil, Spanish text", from: "Manual work" },
  { emoji: "📊", title: "A/B Thumbnail Testing", desc: "Test 2 thumbnails, see which one wins", from: "TubeBuddy" },
  { emoji: "🎨", title: "Auto Brand Kit", desc: "Apply your colors and fonts automatically", from: "Photoshop" },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || !spotlightRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    spotlightRef.current.style.left = `${e.clientX - rect.left - 100}px`;
    spotlightRef.current.style.top = `${e.clientY - rect.top - 100}px`;
    spotlightRef.current.style.opacity = "1";
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (spotlightRef.current) spotlightRef.current.style.opacity = "0";
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative bg-card border border-border rounded-2xl p-7 overflow-hidden group cursor-default transition-all duration-300 hover:-translate-y-2 hover:border-[#C4A8FF] hover:shadow-[0_20px_48px_rgba(139,71,255,0.16),0_0_40px_rgba(139,71,255,0.12)]"
      >
        {/* Spotlight */}
        <div ref={spotlightRef} className="card-spotlight opacity-0 transition-opacity duration-300" />

        {/* Bottom border glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
          style={{ background: "linear-gradient(90deg, #8B47FF, #6366F1, #4F46E5)" }}
        />

        <div className="relative z-10">
          <span className="text-4xl block mb-4 transition-transform duration-300 group-hover:-translate-y-1">
            {feature.emoji}
          </span>
          <h3 className="font-heading font-semibold text-foreground text-lg mb-2">
            {feature.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{feature.desc}</p>
          <p className="text-xs text-muted-foreground/60">
            Coming from {feature.from} →
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const FeaturesSection = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="features" className="py-24 relative bg-background" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-heading tracking-[4px] text-primary mb-4 uppercase">
            Everything you need
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
            One Tool.
            <br />
            <span className="gradient-text">Infinite Thumbnails.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
