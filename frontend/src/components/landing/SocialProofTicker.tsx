import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const tickerItems = [
  "⚡ Thumbly",
  "🎨 FLUX.2 Pro Model",
  "📱 Shorts Generator",
  "🌍 Hindi Thumbnails",
  "🧑 Face Swap",
  "⭐ 4.9/5 Rating",
  "💎 Credits Never Expire",
  "🔁 YouTube URL Recreate",
  "🤖 Prompt Auto-Enhancer",
];

const TickerRow = ({ reverse = false }: { reverse?: boolean }) => {
  const doubled = [...tickerItems, ...tickerItems];
  return (
    <div className="flex whitespace-nowrap overflow-hidden">
      <div className={`flex gap-8 ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}>
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-sm font-medium text-muted-foreground px-4 py-1 shrink-0"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const SocialProofTicker = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="py-4 overflow-hidden"
      style={{ background: "rgba(139,71,255,0.04)", borderTop: "1px solid rgba(139,71,255,0.12)", borderBottom: "1px solid rgba(139,71,255,0.12)" }}
    >
      <TickerRow />
      <div className="mt-2">
        <TickerRow reverse />
      </div>
    </motion.section>
  );
};

export default SocialProofTicker;
