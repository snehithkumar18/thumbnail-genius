import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Zap, Gem, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TOPUP_PACKS, SUBSCRIPTION_PLANS, CREDIT_COST_TABLE } from "@/lib/credits";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/utils";

const faqs = [
  { q: "Is there a free trial?", a: "We don't offer a free trial, but our $1 Mini Pack lets you test quality risk-free. Best way to judge the results yourself." },
  { q: "Do credits expire?", a: "Top-up credits never expire, ever. Subscription credits refresh monthly — unused ones roll over based on your plan's rollover limit." },
  { q: "Can I stack top-up credits with a subscription?", a: "Yes. Top-up credits are used after your monthly subscription credits run out. They stack perfectly." },
  { q: "What happens to my credits if I cancel?", a: "Your subscription credits stop at end of billing period. Top-up credits stay forever — they're yours." },
  { q: "Which plan should I start with?", a: "Try the $1 Mini Pack first. If you're generating regularly, Basic at $15/mo gives far better value." },
  { q: "Do you support UPI and Indian cards?", a: "Yes — UPI, all Indian debit/credit cards, and international cards all work. Indian users see INR pricing automatically." },
];

const competitors = [
  { feature: 'Entry price', Thumbly: '$1', pikzels: '$29/mo', canva: '$15/mo' },
  { feature: 'Monthly plan', Thumbly: 'From $15', pikzels: 'From $29', canva: 'From $15' },
  { feature: 'Credits', Thumbly: '1800 (Basic)', pikzels: 'Limited', canva: 'Limited' },
  { feature: 'Hindi thumbnails', Thumbly: '✅', pikzels: '❌', canva: '❌' },
  { feature: 'Face swap', Thumbly: '✅', pikzels: '✅', canva: '❌' },
  { feature: 'Credits expire', Thumbly: '❌ Never', pikzels: '✅ Monthly', canva: '✅ Monthly' },
];

const PricingPage = () => {
  const [currency, setCurrency] = useState<'usd' | 'inr'>('usd');
  const [annual, setAnnual] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz?.includes('Kolkata') || tz?.includes('Calcutta') || tz?.includes('Asia/Colombo')) {
        setCurrency('inr');
      }
    } catch {
      setCurrency('usd');
    }
  }, []);

  const openAuth = (tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const handleCheckout = async (productId: string) => {
    if (!user) {
      openAuth("signup");
      return;
    }
    setLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          product_id: productId,
          user_email: user.email,
          billing_country: currency === 'inr' ? 'IN' : 'US',
        },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create checkout session";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const sym = currency === 'inr' ? '₹' : '$';

  return (
    <div className="min-h-screen-d bg-background overflow-x-hidden">
      <Navbar onOpenAuth={openAuth} />

      <section className="pt-32 pb-16">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-heading font-extrabold mb-4"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto"
          >
            Pay only for what you use. Start with $1 — no subscription needed.
          </motion.p>

          <div className="flex items-center justify-center gap-3 mb-12">
            <button
              onClick={() => { hapticFeedback("light"); setCurrency('usd'); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${currency === 'usd' ? 'bg-primary border-primary text-primary-foreground shadow-lg' : 'bg-muted border-transparent text-muted-foreground'}`}
            >
              $ USD
            </button>
            <button
              onClick={() => { hapticFeedback("light"); setCurrency('inr'); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${currency === 'inr' ? 'bg-primary border-primary text-primary-foreground shadow-lg' : 'bg-muted border-transparent text-muted-foreground'}`}
            >
              ₹ INR
            </button>
          </div>
        </div>
      </section>

      {/* Section 1 — Top-up packs */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">🚀 Start Without a Subscription</h2>
            <p className="text-muted-foreground">Buy credits once. They never expire. Stack with any subscription.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TOPUP_PACKS.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 relative flex flex-col"
              >
                {pack.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold whitespace-nowrap">
                    {pack.badge}
                  </div>
                )}
                <h3 className="font-heading font-bold text-lg text-foreground mb-1">{pack.label}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-heading font-extrabold text-foreground">
                    {sym}{currency === 'inr' ? pack.priceInr : pack.priceUsd}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Gem className="h-4 w-4 text-secondary" />
                  <span className="text-foreground font-semibold">{pack.credits} credits</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1 text-sm">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ~{pack.credits} fast thumbnails
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ~{Math.floor(pack.credits / 2)} Shorts covers
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Unlimited title generation
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                    Watermark on downloads
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                    Fast model only (Schnell)
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mb-3">No subscription. No commitment.</p>
                <Button
                  variant={i === 0 ? "outline" : "heroGhost"}
                  className={`w-full h-11 ${i !== 0 ? 'border-primary/20' : ''}`}
                  onClick={() => { hapticFeedback("medium"); handleCheckout(pack.id); }}
                  disabled={loading === pack.id}
                >
                  {loading === pack.id ? 'Redirecting...' : i === 0 ? `Try for ${sym}${currency === 'inr' ? pack.priceInr : pack.priceUsd}` : `Get ${pack.credits} Credits`}
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ⚡ Top-up credits never expire and stack on top of any subscription plan
          </p>
        </div>
      </section>

      {/* Section 2 — Subscriptions */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">Level Up With a Plan</h2>
            <p className="text-muted-foreground mb-6">Remove watermarks, unlock pro models, get fresh credits every month.</p>

            <div className="flex items-center justify-center gap-4 bg-muted/40 p-2 rounded-full w-fit mx-auto border border-border">
              <span className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors cursor-pointer ${!annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`} onClick={() => { hapticFeedback("light"); setAnnual(false); }}>
                Monthly
              </span>
              <button
                onClick={() => { hapticFeedback("medium"); setAnnual(!annual); }}
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${annual ? 'translate-x-6' : ''}`} />
              </button>
              <span className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-2 ${annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`} onClick={() => { hapticFeedback("light"); setAnnual(true); }}>
                Annual
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-500 font-bold uppercase tracking-tight">
                  -20%
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {SUBSCRIPTION_PLANS.map((plan, i) => {
              const monthlyPrice = currency === 'inr' ? plan.monthlyInr : plan.monthlyUsd;
              const annualTotal = currency === 'inr' ? plan.annualInr : plan.annualUsd;
              const annualPerMonth = currency === 'inr' ? plan.annualPerMonthInr : plan.annualPerMonthUsd;
              const savings = currency === 'inr' ? plan.savingsInr : plan.savingsUsd;
              const displayPrice = annual ? annualPerMonth : monthlyPrice;
              const productId = `${plan.id}_${annual ? 'annual' : 'monthly'}`;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass-card rounded-2xl p-6 relative flex flex-col ${plan.popular ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold glow-gold whitespace-nowrap">
                      ⭐ Most Popular
                    </div>
                  )}
                  <h3 className="font-heading font-bold text-lg text-foreground">{plan.name}</h3>
                  <div className="mt-4 mb-1">
                    <span className="text-3xl font-heading font-extrabold text-foreground">
                      {sym}{typeof displayPrice === 'number' && displayPrice % 1 !== 0 ? displayPrice.toFixed(2) : displayPrice.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  {annual && (
                    <div className="mb-1">
                      <p className="text-xs text-muted-foreground">
                        {sym}{annualTotal.toLocaleString()}/year
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        Save {sym}{savings.toLocaleString()}/year
                      </span>
                    </div>
                  )}
                  {!annual && (
                    <p className="text-xs text-muted-foreground mb-1">
                      or {sym}{annualPerMonth % 1 !== 0 ? annualPerMonth.toFixed(2) : annualPerMonth}/mo billed annually
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mb-4">
                    <Gem className="h-3.5 w-3.5 text-secondary" />
                    <span className="text-sm text-muted-foreground">{plan.credits} credits/month</span>
                    <span className="text-xs text-muted-foreground">• Rollover up to {plan.rollover === 999999 ? '∞' : plan.rollover}</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
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
                    variant={plan.popular ? 'hero' : plan.id === 'creator' ? 'outline' : 'heroGhost'}
                    className={`w-full ${plan.popular ? 'animate-pulse-glow' : ''}`}
                    onClick={() => handleCheckout(productId)}
                    disabled={loading === productId}
                  >
                    {loading === productId ? 'Redirecting...' : plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3 — Credit costs */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Accordion type="single" collapsible>
            <AccordionItem value="credits" className="border-border">
              <AccordionTrigger className="text-foreground font-heading font-semibold hover:no-underline text-lg">
                What does each action cost?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {CREDIT_COST_TABLE.map((c) => (
                    <div key={c.action} className="flex justify-between py-2 text-sm border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">
                        {c.emoji} {c.action}
                      </span>
                      <span className={`font-medium ${c.cost.startsWith('FREE') ? 'text-primary' : 'text-foreground'}`}>{c.cost}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Section 4 — Competitor comparison */}
      <section className="py-16 bg-muted/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-8">Why Thumbly vs others?</h2>
          <div className="glass-card rounded-2xl overflow-hidden border-border bg-card/50">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-xs sm:text-sm min-w-[420px]">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left p-3 sm:p-5 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Feature</th>
                    <th className="p-3 sm:p-5 text-primary font-heading font-black text-sm sm:text-base italic">Thumbly</th>
                    <th className="p-3 sm:p-5 text-muted-foreground font-medium opacity-50">Pikzels</th>
                    <th className="p-3 sm:p-5 text-muted-foreground font-medium opacity-50">Canva AI</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((row) => (
                    <tr key={row.feature} className="border-b border-border/40 hover:bg-primary/5 transition-colors group">
                      <td className="p-3 sm:p-5 text-foreground font-medium group-hover:text-primary transition-colors">{row.feature}</td>
                      <td className="p-3 sm:p-5 text-center text-foreground font-bold bg-primary/5">{row.Thumbly}</td>
                      <td className="p-3 sm:p-5 text-center text-muted-foreground/60">{row.pikzels}</td>
                      <td className="p-3 sm:p-5 text-center text-muted-foreground/60">{row.canva}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 bg-primary/5 text-center">
               <p className="text-primary font-bold text-sm">You get more, pay less, and keep your credits forever.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-10">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl px-6 border-border">
                <AccordionTrigger className="text-foreground font-medium hover:no-underline text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
};

export default PricingPage;
