import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Gem } from "lucide-react";
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

  return (
    <section id="pricing" className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Start for $2. No subscription required.
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
              className="glass-card rounded-2xl p-6 relative flex flex-col"
            >
              {pack.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold whitespace-nowrap">
                  {pack.badge}
                </div>
              )}
              <h3 className="font-heading font-bold text-lg text-foreground">{pack.label}</h3>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-heading font-extrabold text-foreground">${pack.priceUsd}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <Gem className="h-4 w-4 text-secondary" />
                <span className="text-foreground font-medium">{pack.credits} credits</span>
              </div>
              <Button variant={i === 0 ? "hero" : "heroGhost"} className="w-full mt-auto" onClick={onOpenAuth}>
                {i === 0 ? `Try for $${pack.priceUsd}` : `Get ${pack.credits} Credits`}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Subscription plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h3 className="text-2xl font-heading font-bold mb-2">Level Up With a Plan</h3>
          <p className="text-muted-foreground text-sm mb-6">Remove watermarks, unlock pro models, get fresh credits every month</p>

          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${annual ? "translate-x-6" : ""}`}
              />
            </button>
            <span className={`text-sm ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground font-semibold">
                Save 20%
              </span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const displayPrice = annual ? Math.round(plan.annualUsd / 12) : plan.monthlyUsd;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`glass-card rounded-2xl p-6 relative flex flex-col ${plan.popular ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold glow-gold">
                    ⭐ Most Popular
                  </div>
                )}
                <h3 className="font-heading font-bold text-lg text-foreground">{plan.name}</h3>
                <div className="mt-4 mb-1">
                  <span className="text-3xl font-heading font-extrabold text-foreground">${displayPrice}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
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

                <Button
                  variant={plan.popular ? "hero" : "heroGhost"}
                  className={`w-full ${plan.popular ? "animate-pulse-glow" : ""}`}
                  onClick={onOpenAuth}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Credit costs */}
        <div className="max-w-2xl mx-auto mt-16">
          <Accordion type="single" collapsible>
            <AccordionItem value="credits" className="border-border">
              <AccordionTrigger className="text-foreground font-heading font-semibold hover:no-underline">
                What does each action cost?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {CREDIT_COST_TABLE.map((c) => (
                    <div key={c.action} className="flex justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{c.emoji} {c.action}</span>
                      <span className={`font-medium ${c.cost === 'FREE' ? 'text-primary' : 'text-foreground'}`}>{c.cost}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mt-12 glass-card rounded-xl p-6 text-center"
        >
          <h3 className="font-heading font-bold text-foreground mb-2">Why ThumbAI vs others?</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Pikzels</p>
              <p className="text-foreground font-bold">$29/month</p>
            </div>
            <span className="text-muted-foreground">vs</span>
            <div>
              <p className="text-primary font-semibold">ThumbAI</p>
              <p className="text-foreground font-bold">Start at $2</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">3x more value, pay 70% less</p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
