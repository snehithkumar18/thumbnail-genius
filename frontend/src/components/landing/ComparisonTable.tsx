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
    <section className="py-24" ref={ref} style={{ background: "#F8F7FF" }}>
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold">
            Why <span className="gradient-text">Thumbly</span>?
          </h2>
        </motion.div>

        <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-[0_4px_16px_rgba(15,10,30,0.06)]">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 p-5 border-b border-border text-sm font-heading font-semibold" style={{ background: "#F2F0FF" }}>
            <div className="text-muted-foreground">Feature</div>
            <div className="text-center text-primary-foreground rounded-lg py-1" style={{ background: "linear-gradient(135deg, #8B47FF, #6366F1)" }}>Thumbly</div>
            <div className="text-center text-muted-foreground">Pikzels</div>
            <div className="text-center text-muted-foreground">Canva AI</div>
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
