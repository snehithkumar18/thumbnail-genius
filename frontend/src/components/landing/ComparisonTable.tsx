import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Check, X } from "lucide-react";

const rows = [
  { feature: "Text → Thumbnail", thumb: true, pikzels: true, canva: false },
  { feature: "YouTube URL Recreate", thumb: true, pikzels: true, canva: false },
  { feature: "Face Swap", thumb: true, pikzels: false, canva: false },
  { feature: "AI Editor", thumb: true, pikzels: false, canva: true },
  { feature: "Hindi / Multi-Language", thumb: true, pikzels: false, canva: false },
  { feature: "A/B Testing", thumb: true, pikzels: true, canva: false },
  { feature: "Shorts (9:16)", thumb: true, pikzels: false, canva: true },
  { feature: "Price", thumb: "From $2", pikzels: "$29/mo", canva: "$13/mo" },
];

const Cell = ({ value, highlight }: { value: boolean | string; highlight?: boolean }) => {
  if (typeof value === "string") {
    return (
      <span className={`font-bold text-sm ${highlight ? "text-primary" : "text-muted-foreground"}`}>
        {value}
      </span>
    );
  }
  return value ? (
    <Check className="h-5 w-5 text-emerald-500 mx-auto" />
  ) : (
    <X className="h-5 w-5 text-destructive/40 mx-auto" />
  );
};

const ComparisonTable = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className="py-24 bg-[#070310] relative" ref={ref}>
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#8B47FF]/15 border border-[#8B47FF]/30 text-[#C4A8FF] mb-4">
            ⚖️ UNCOMPROMISING COMPARISON
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight">
            Why Top Channels Choose <span className="bg-gradient-to-r from-[#C4A8FF] via-[#8B47FF] to-[#00E5FF] bg-clip-text text-transparent">Thumbly</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base mt-2">
            The only platform combining script reasoning, face consistency, and viral packaging.
          </p>
        </motion.div>

        <div className="bg-[#0B0616] rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 p-5 border-b border-white/10 text-sm font-heading font-semibold bg-[#0F0A1E]">
            <div className="text-white/60">Packaging Feature</div>
            <div className="text-center text-white rounded-lg py-1 bg-gradient-to-r from-[#8B47FF] to-[#6366F1] font-bold shadow-sm">Thumbly</div>
            <div className="text-center text-white/50">Pikzels</div>
            <div className="text-center text-white/50">Canva AI</div>
          </div>

          {rows.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              className={`grid grid-cols-4 gap-4 p-5 border-b border-border/50 last:border-0 text-sm ${
                row.feature === "Price" ? "bg-[#FAF7FF] border-l-[3px] border-l-primary" : ""
              }`}
            >
              <div className="text-foreground font-medium">{row.feature}</div>
              <div className="text-center">
                <Cell value={row.thumb} highlight />
              </div>
              <div className="text-center">
                <Cell value={row.pikzels} />
              </div>
              <div className="text-center">
                <Cell value={row.canva} />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10 text-3xl md:text-5xl font-display font-bold gradient-text"
        >
          You get 3× more. Pay 70% less.
        </motion.p>
      </div>
    </section>
  );
};

export default ComparisonTable;
