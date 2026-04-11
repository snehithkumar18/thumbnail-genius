import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gem, CreditCard, User, Zap, Crown, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useNavigate } from "react-router-dom";
import { PLAN_LIMITS, TOPUP_PACKS, SUBSCRIPTION_PLANS, type PlanType } from "@/lib/credits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/utils";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();
  const { plan, hasSubscription, subscriptionCredits, topupCredits, rolloverCredits, totalCredits } = usePlanAccess();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const planLimits = PLAN_LIMITS[plan as PlanType] ?? PLAN_LIMITS.none;
  const currentPlanData = SUBSCRIPTION_PLANS.find(p => p.id === plan);

  const handleCheckout = async (productId: string) => {
    setLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { product_id: productId, user_email: user?.email, billing_country: 'US' },
      });
      if (error) throw error;
      if (data?.checkout_url) window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create checkout";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">⚙️ Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, billing, and preferences</p>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="bg-muted border border-border w-full h-auto p-1 grid grid-cols-2">
          <TabsTrigger value="profile" className="py-2.5" onClick={() => hapticFeedback("light")}><User className="h-4 w-4 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="billing" className="py-2.5" onClick={() => hapticFeedback("light")}><CreditCard className="h-4 w-4 mr-1.5" />Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Account Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-3 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground font-medium truncate">{user?.email ?? '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-3 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">Username</span>
                <span className="text-foreground font-medium">{profile?.username ?? '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-3 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">Channel</span>
                <span className="text-foreground font-medium">{profile?.youtube_channel_name ?? 'Not set'}</span>
              </div>
            </div>
          </div>
          <Button variant="destructive" onClick={signOut}>Sign Out</Button>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-6">
          {/* Current Plan */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                <Crown className="h-5 w-5 text-secondary" />
                Current Plan
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${hasSubscription ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {hasSubscription ? plan.toUpperCase() : 'PAY-AS-YOU-GO'}
              </span>
            </div>

            {hasSubscription ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Credits</span>
                  <span className="text-foreground font-medium">{subscriptionCredits} / {planLimits.credits}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((planLimits.credits - subscriptionCredits) / planLimits.credits) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rollover Credits</span>
                  <span className="text-foreground font-medium">{rolloverCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top-up Credits</span>
                  <span className="text-foreground font-medium">{topupCredits} <span className="text-xs text-muted-foreground">(never expire)</span></span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-foreground font-semibold">Total Available</span>
                  <span className="text-primary font-bold">{totalCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Reset</span>
                  <span className="text-foreground font-medium">
                    {credits?.monthly_reset_date ? new Date(credits.monthly_reset_date).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-1">You're on Pay-As-You-Go</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Gem className="h-4 w-4 text-secondary" />
                  <span className="text-foreground font-bold text-lg">{topupCredits} top-up credits</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">These never expire</p>
                <p className="text-sm text-muted-foreground">Want monthly credits instead?</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" className="h-12 text-base" onClick={() => { hapticFeedback("light"); navigate('/pricing'); }}>
              <Zap className="h-4 w-4 mr-2" />
              {hasSubscription ? 'Change Plan' : 'View Plans'}
            </Button>
            <Button variant="heroGhost" className="h-12 text-base border-primary/20" onClick={() => { hapticFeedback("light"); navigate('/pricing'); }}>
              <Gem className="h-4 w-4 mr-2" />
              Buy More Credits
            </Button>
          </div>

          {/* Top-up section */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold text-foreground mb-1">Need more credits? Buy anytime.</h3>
            <p className="text-xs text-muted-foreground mb-4">Credits stack with your subscription</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TOPUP_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleCheckout(pack.id)}
                  disabled={loading === pack.id}
                  className="glass-card rounded-lg p-4 text-left hover:border-primary/30 transition-colors"
                >
                  <p className="font-heading font-bold text-foreground">{pack.label}</p>
                  <p className="text-sm text-muted-foreground">{pack.credits} credits — ${pack.priceUsd}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Credit Usage */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Credit Usage</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used This Month</span>
                <span className="text-foreground font-medium">{credits?.credits_used_this_month ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifetime Used</span>
                <span className="text-foreground font-medium">{credits?.credits_used_total ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifetime Purchased</span>
                <span className="text-foreground font-medium">{credits?.lifetime_credits_purchased ?? 0}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
