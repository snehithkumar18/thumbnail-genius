import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Check, X, Gem } from "lucide-react";
import CountUp from "react-countup";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TOPUP_PACKS, SUBSCRIPTION_PLANS, CREDIT_COST_TABLE } from "@/lib/credits";

interface PricingSectionProps {
  onOpenAuth: () => void;
}

const PricingSection = ({ onOpenAuth }: PricingSectionProps) => {
  const [annual, setAnnual] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="pricing" className="py-24 relative bg-background" ref={ref}>
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_center,rgba(139,71,255,0.06),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-heading tracking-[4px] text-primary mb-4 uppercase">
            Pricing
          </p>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-4">
            Start for $2. Scale when ready.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Pay only for what you use. Top-up credits never expire.
          </p>
        </motion.div>

        {/* Top-up packs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-16">
          {TOPUP_PACKS.map((pack, i) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 relative flex flex-col group hover:-translate-y-2 hover:border-[#C4A8FF] hover:shadow-[0_20px_48px_rgba(139,71,255,0.16)] transition-all duration-300"
            >
              {pack.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold whitespace-nowrap">
                  {pack.badge}
                </div>
              )}
              <h3 className="font-heading font-bold text-lg text-foreground">{pack.label}</h3>
              <div className="mt-2 mb-3">
                <span className="text-4xl font-display font-bold text-foreground">${pack.priceUsd}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <Gem className="h-4 w-4 text-secondary" />
                <span className="text-foreground font-medium">{pack.credits} credits</span>
              </div>
              <button
                onClick={onOpenAuth}
                className={`w-full mt-auto py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                  i === 0
                    ? "text-primary-foreground glow-purple"
                    : "border border-border text-foreground hover:border-primary hover:text-primary"
                }`}
                style={i === 0 ? { background: "linear-gradient(135deg, #8B47FF, #6366F1, #4F46E5)" } : {}}
              >
                {i === 0 ? `Try for $${pack.priceUsd}` : `Get ${pack.credits} Credits`}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Toggle */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-heading font-bold mb-6">Level Up With a Plan</h3>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: annual ? "linear-gradient(135deg, #8B47FF, #6366F1)" : "hsl(var(--border))" }}
            >
              <motion.span
                layout
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                animate={{ x: annual ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
              <motion.span
                className="ml-2 px-2 py-0.5 text-xs rounded-full font-bold inline-block"
                style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                animate={{ rotate: annual ? [0, -2, 2, 0] : 0 }}
                transition={{ duration: 0.4 }}
              >
                Save 20%
              </motion.span>
            </span>
          </div>
        </div>

        {/* Subscription plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const displayPrice = annual ? plan.annualPerMonthUsd : plan.monthlyUsd;
            const isPro = plan.popular;
            const isStudio = plan.id === "studio";
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl p-6 relative flex flex-col group hover:-translate-y-2 transition-all duration-300 ${
                  isPro
                    ? "text-white scale-[1.02] border-none shadow-[0_32px_64px_rgba(139,71,255,0.20),0_0_40px_rgba(139,71,255,0.25)]"
                    : isStudio
                    ? "text-white border border-[rgba(139,71,255,0.3)] shadow-[0_20px_48px_rgba(15,10,30,0.4)]"
                    : "bg-card border border-border hover:border-[#C4A8FF]"
                }`}
                style={
                  isPro
                    ? { background: "linear-gradient(135deg, #8B47FF, #6366F1, #4F46E5)" }
                    : isStudio
                    ? { background: "#0F0A1E" }
                    : plan.id === "creator"
                    ? { background: "#FAF7FF" }
                    : {}
                }
              >
                {isPro && (
                  <motion.div
                    className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style2={{ rotate: "-2deg" }}
                  >
                    ⭐ Most Popular
                  </motion.div>
                )}
                <h3 className={`font-heading font-bold text-lg ${isPro || isStudio ? "text-white" : "text-foreground"}`}>{plan.name}</h3>
                <div className="mt-4 mb-1">
                  <span className={`text-4xl font-display font-bold ${isPro || isStudio ? "text-white" : "text-foreground"}`}>
                    ${typeof displayPrice === "number" && displayPrice % 1 !== 0
                      ? displayPrice.toFixed(2)
                      : displayPrice}
                  </span>
                  <span className={`text-sm ${isPro || isStudio ? "text-white/70" : "text-muted-foreground"}`}>/month</span>
                </div>
                {annual && (
                  <span className={`inline-block mb-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${
                    isPro ? "bg-white/20 text-white" : isStudio ? "bg-[rgba(139,71,255,0.3)] text-[#C4A8FF]" : "bg-primary/10 text-primary"
                  }`}>
                    Save ${plan.savingsUsd}/year
                  </span>
                )}
                <p className={`text-xs mb-4 ${isPro || isStudio ? "text-white/70" : "text-muted-foreground"}`}>{plan.credits} credits/month</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f.text} className={`flex items-start gap-2 text-sm ${isPro || isStudio ? "text-white/80" : "text-muted-foreground"}`}>
                      {f.included ? (
                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isPro ? "text-white" : isStudio ? "text-[#C4A8FF]" : "text-primary"}`} />
                      ) : (
                        <X className={`h-4 w-4 mt-0.5 shrink-0 ${isPro ? "text-white/40" : "text-muted-foreground/40"}`} />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onOpenAuth}
                  className={`w-full py-3 rounded-full font-bold text-sm transition-all duration-300 group-hover:shadow-lg ${
                    isPro
                      ? "bg-white text-primary hover:bg-white/90"
                      : isStudio
                      ? "text-white glow-purple"
                      : "border border-border text-foreground hover:border-primary hover:text-primary"
                  }`}
                  style={isStudio ? { background: "linear-gradient(135deg, #8B47FF, #6366F1, #4F46E5)" } : {}}
                >
                  {plan.cta} →
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Credit costs */}
        <div className="max-w-2xl mx-auto mt-16">
          <Accordion type="single" collapsible>
            <AccordionItem value="credits" className="border-border bg-[#F8F7FF] rounded-xl px-6 border">
              <AccordionTrigger className="text-foreground font-heading font-semibold hover:no-underline">
                What does each action cost?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {CREDIT_COST_TABLE.map((c, i) => (
                    <motion.div
                      key={c.action}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex justify-between py-1.5 text-sm border-b border-border/50 last:border-0 hover:bg-muted/50 px-2 rounded"
                    >
                      <span className="text-muted-foreground">{c.emoji} {c.action}</span>
                      <span className={`font-medium ${c.cost.startsWith("FREE") ? "text-primary" : "text-foreground"}`}>
                        {c.cost}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
