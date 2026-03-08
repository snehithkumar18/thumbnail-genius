import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PricingSectionProps {
  onOpenAuth: () => void;
}

const plans = [
  {
    name: "Free",
    price: { monthly: "₹0", annual: "₹0" },
    sub: "",
    features: [
      "20 credits/month",
      "Fast generation only (Schnell)",
      "YouTube Shorts generator",
      "Watermark on downloads",
      "Title generator (unlimited)",
    ],
    cta: "Start Free",
    variant: "heroGhost" as const,
    popular: false,
  },
  {
    name: "Creator",
    price: { monthly: "₹399", annual: "₹319" },
    sub: "$5/mo",
    features: [
      "150 credits/month",
      "Rollover unused credits (up to 150)",
      "FLUX.2 Pro + Ideogram models",
      "Face swap feature",
      "1 Brand Kit",
      "A/B thumbnail testing",
      "No watermark",
    ],
    cta: "Start Creating",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: "₹799", annual: "₹639" },
    sub: "$10/mo",
    features: [
      "400 credits/month",
      "Rollover unused credits (up to 400)",
      "All models + priority generation",
      "3 Brand Kits",
      "Batch generate (up to 5)",
      "Thumbnail scorer",
      "Multi-language thumbnails",
      "Priority support",
    ],
    cta: "Go Pro",
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Studio",
    price: { monthly: "₹1,499", annual: "₹1,199" },
    sub: "$18/mo",
    features: [
      "1,000 credits/month",
      "Unlimited credit rollover",
      "All models + fastest priority",
      "10 Brand Kits",
      "Batch generate (up to 20)",
      "API access for automation",
      "Dedicated support",
    ],
    cta: "Go Studio",
    variant: "heroGhost" as const,
    popular: false,
  },
];

const creditCosts = [
  { action: "Text to Thumbnail", cost: "1 credit" },
  { action: "Face Swap", cost: "2 credits" },
  { action: "URL Recreate", cost: "2 credits" },
  { action: "AI Edit", cost: "1 credit" },
  { action: "Batch Generate (5)", cost: "5 credits" },
  { action: "A/B Test", cost: "2 credits" },
];

const topups = [
  { credits: 50, price: "₹149" },
  { credits: 150, price: "₹349" },
  { credits: 500, price: "₹999" },
];

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
            Simple, creator-friendly pricing
          </h2>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${
                  annual ? "translate-x-6" : ""
                }`}
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
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-6 relative flex flex-col ${
                plan.popular ? "border-primary/50 ring-1 ring-primary/20" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold glow-gold">
                  Most Popular
                </div>
              )}
              <h3 className="font-heading font-bold text-lg text-foreground">{plan.name}</h3>
              <div className="mt-4 mb-1">
                <span className="text-3xl font-heading font-extrabold text-foreground">
                  {annual ? plan.price.annual : plan.price.monthly}
                </span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              {plan.sub && <p className="text-xs text-muted-foreground mb-4">{plan.sub}</p>}
              {!plan.sub && <div className="mb-4" />}

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.variant}
                className={`w-full ${plan.popular ? "animate-pulse-glow" : ""}`}
                onClick={onOpenAuth}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Credit costs & top-ups */}
        <div className="max-w-2xl mx-auto mt-16">
          <Accordion type="single" collapsible>
            <AccordionItem value="credits" className="border-border">
              <AccordionTrigger className="text-foreground font-heading font-semibold hover:no-underline">
                What costs what?
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {creditCosts.map((c) => (
                    <div key={c.action} className="flex justify-between py-1 text-sm">
                      <span className="text-muted-foreground">{c.action}</span>
                      <span className="text-foreground font-medium">{c.cost}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Need more credits? Buy top-ups anytime
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {topups.map((t) => (
                <div
                  key={t.credits}
                  className="glass-card rounded-xl px-5 py-3 text-center cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <div className="text-foreground font-bold">{t.credits} cr</div>
                  <div className="text-sm text-muted-foreground">{t.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
