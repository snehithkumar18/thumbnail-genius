import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gem, CreditCard, User, Zap, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useNavigate } from "react-router-dom";
import { PLAN_LIMITS, type PlanType } from "@/lib/credits";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();
  const { plan, hasSubscription, subscriptionCredits, topupCredits, rolloverCredits } = usePlanAccess();
  const navigate = useNavigate();

  const planLimits = PLAN_LIMITS[plan as PlanType] ?? PLAN_LIMITS.none;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">⚙️ Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, billing, and preferences</p>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-4 w-4 mr-1.5" />Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Account Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{user?.email ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="text-foreground">{profile?.username ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel</span>
                <span className="text-foreground">{profile?.youtube_channel_name ?? 'Not set'}</span>
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
                  <span className="text-muted-foreground">Subscription Credits</span>
                  <span className="text-foreground font-medium">{subscriptionCredits}/{planLimits.credits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rollover Credits</span>
                  <span className="text-foreground font-medium">{rolloverCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top-up Credits</span>
                  <span className="text-foreground font-medium">{topupCredits}</span>
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
                <p className="text-muted-foreground text-sm mb-1">You're on pay-as-you-go mode</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Gem className="h-4 w-4 text-secondary" />
                  <span className="text-foreground font-bold text-lg">{topupCredits} top-up credits</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Top-up credits never expire</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" onClick={() => navigate('/pricing')}>
              <Zap className="h-4 w-4 mr-2" />
              {hasSubscription ? 'Change Plan' : 'View Plans'}
            </Button>
            <Button variant="heroGhost" onClick={() => navigate('/pricing')}>
              <Gem className="h-4 w-4 mr-2" />
              Buy More Credits
            </Button>
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
