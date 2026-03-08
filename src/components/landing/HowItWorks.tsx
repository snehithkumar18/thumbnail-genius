import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useInView } from "react-intersection-observer";
import { MessageSquare, Sparkles, Rocket } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Describe It",
    desc: "Type what you want in plain English — or any language",
    visual: "prompt",
  },
  {
    icon: Sparkles,
    title: "AI Generates",
    desc: "Multiple options in seconds, powered by FLUX.2 Pro",
    visual: "generating",
  },
  {
    icon: Rocket,
    title: "Download & Go Viral",
    desc: "Pick your favorite and upload directly to YouTube",
    visual: "download",
  },
];

const StepVisual = ({ type }: { type: string }) => {
  if (type === "prompt") {
    return (
      <div className="glass-card rounded-xl p-4 w-full max-w-xs">
        <div className="text-xs text-muted-foreground mb-2">Your prompt</div>
        <div className="text-sm text-foreground font-mono">
          Shocked face reacting to stock charts
          <span className="text-primary animate-pulse">|</span>
        </div>
      </div>
    );
  }
  if (type === "generating") {
    return (
      <div className="w-full max-w-xs space-y-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="aspect-video rounded-lg bg-card shimmer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
      <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-primary/20 to-gold/20 border border-border" />
      <div className="flex gap-2">
        <span className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-full font-medium">
          ⬇️ Download
        </span>
        <span className="px-3 py-1.5 text-xs bg-card border border-border rounded-full text-foreground">
          ✏️ Edit
        </span>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className="py-24 bg-card/30" ref={ref}>
      <div className="container mx-auto px-4" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-heading tracking-[4px] text-primary mb-4 uppercase">
            How it works
          </p>
          <h2 className="text-4xl md:text-6xl font-display font-bold">
            Three steps.{" "}
            <span className="text-muted-foreground">That's it.</span>
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-16">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="flex flex-col md:flex-row items-center gap-8 md:gap-16"
            >
              <div className={`flex-1 text-center md:text-left ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-6xl font-display text-primary/20 font-bold mb-2">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
              <div className={`flex-1 flex justify-center ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <StepVisual type={step.visual} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
