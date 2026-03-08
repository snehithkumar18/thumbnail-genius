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
    <section id="pricing" className="py-24 relative" ref={ref}>
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(16_100%_50%/0.05),transparent_70%)]" />

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
              className="bg-card border border-border rounded-2xl p-6 relative flex flex-col group hover:-translate-y-2 hover:border-primary transition-all duration-300"
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
                    ? "bg-gradient-to-r from-primary to-[hsl(22,100%,52%)] text-primary-foreground hover:shadow-[0_0_30px_hsl(16_100%_50%/0.3)]"
                    : "border border-border text-foreground hover:border-primary hover:text-primary"
                }`}
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
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}
            >
              <motion.span
                layout
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground"
                animate={{ x: annual ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
              <motion.span
                className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gold text-gold-foreground font-bold inline-block"
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
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`bg-card border rounded-2xl p-6 relative flex flex-col group hover:-translate-y-2 transition-all duration-300 ${
                  plan.popular
                    ? "border-primary shadow-[0_0_40px_hsl(16_100%_50%/0.15)] scale-[1.02]"
                    : "border-border hover:border-primary"
                }`}
              >
                {plan.popular && (
                  <motion.div
                    className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-gold text-gold-foreground text-xs font-bold glow-gold"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ rotate: "-2deg" }}
                  >
                    ⭐ Most Popular
                  </motion.div>
                )}
                <h3 className="font-heading font-bold text-lg text-foreground">{plan.name}</h3>
                <div className="mt-4 mb-1">
                  <span className="text-4xl font-display font-bold text-foreground">
                    ${typeof displayPrice === "number" && displayPrice % 1 !== 0
                      ? displayPrice.toFixed(2)
                      : displayPrice}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                {annual && (
                  <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold w-fit">
                    Save ${plan.savingsUsd}/year
                  </span>
                )}
                <p className="text-xs text-muted-foreground mb-4">{plan.credits} credits/month</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm text-muted-foreground">
                      {f.included ? (
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onOpenAuth}
                  className={`w-full py-3 rounded-full font-bold text-sm transition-all duration-300 group-hover:shadow-lg ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-[hsl(22,100%,52%)] text-primary-foreground animate-breathing-glow"
                      : "border border-border text-foreground hover:border-primary hover:text-primary"
                  }`}
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
            <AccordionItem value="credits" className="border-border glass-card rounded-xl px-6">
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
                      className="flex justify-between py-1.5 text-sm border-b border-border/50 last:border-0"
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
