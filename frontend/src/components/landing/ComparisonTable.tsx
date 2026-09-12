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
    <section className="py-24 bg-[#FAFAFE] relative border-t border-[#EAE5F5]" ref={ref}>
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#8B47FF]/10 border border-[#8B47FF]/20 text-[#8B47FF] mb-4">
            ⚖️ UNCOMPROMISING COMPARISON
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#0F0A1E] tracking-tight">
            Why Top Channels Choose <span className="bg-gradient-to-r from-[#8B47FF] via-[#A855F7] to-[#00B4D8] bg-clip-text text-transparent">Thumbly</span>
          </h2>
          <p className="text-[#524B66] text-sm sm:text-base mt-2">
            The only platform combining script reasoning, face consistency, and viral packaging.
          </p>
        </motion.div>

        <div className="bg-white rounded-2xl overflow-hidden border border-[#EAE5F5] shadow-[0_16px_40px_rgba(15,10,30,0.06)]">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 p-5 border-b border-[#EAE5F5] text-sm font-heading font-semibold bg-[#FAF9FD]">
            <div className="text-[#524B66]">Packaging Feature</div>
            <div className="text-center text-white rounded-lg py-1 bg-gradient-to-r from-[#8B47FF] to-[#6366F1] font-bold shadow-sm">Thumbly</div>
            <div className="text-center text-[#524B66]">Pikzels</div>
            <div className="text-center text-[#524B66]">Canva AI</div>
          </div>

          {rows.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-4 gap-4 p-4 items-center text-sm border-b border-[#EAE5F5] last:border-0 ${
                i % 2 === 0 ? "bg-white" : "bg-[#FAF9FD]"
              }`}
            >
              <div className="font-medium text-[#0F0A1E] text-xs sm:text-sm">{row.feature}</div>
              <div className="text-center bg-[#8B47FF]/5 py-1.5 rounded-lg border border-[#8B47FF]/20">
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
