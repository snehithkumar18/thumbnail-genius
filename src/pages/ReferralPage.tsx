import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Users, Check, ExternalLink, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

const ReferralPage = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = `https://thumbai.app/r/${referralCode}`;
  const whatsappMessage = encodeURIComponent(
    `Hey! I've been using ThumbAI to make AI thumbnails for my YouTube channel. It's amazing — try it here: ${referralLink}\nYou get ₹100 off your first plan and I get bonus credits! 🔥`
  );

  useEffect(() => {
    if (!user) return;
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;
    setLoading(true);

    // Get or create referral code from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Use username-based code or generate one
    const code = profile?.username
      ? `${profile.username.toLowerCase().replace(/\s+/g, "")}-${user.id.slice(0, 6)}`
      : `ref-${user.id.slice(0, 8)}`;
    setReferralCode(code);

    // Load referrals
    const { data: refs } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    setReferrals(refs ?? []);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter((r) => r.status === "completed").length;
  const totalCreditsEarned = referrals.reduce((sum, r) => sum + (r.credits_awarded || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">🎁 Refer & Earn Credits</h1>
        <p className="text-muted-foreground text-sm">Give ₹100 off to friends, get 50 credits when they upgrade</p>
      </div>

      {/* Referral Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading font-semibold text-foreground mb-4">Your Referral Link</h3>
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-background border-border text-foreground text-sm font-mono"
          />
          <Button variant="hero" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground"
            onClick={() => window.open(`https://wa.me/?text=${whatsappMessage}`, "_blank")}
          >
            <MessageCircle className="h-4 w-4 mr-1.5 text-green-500" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground"
            onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Check out ThumbAI for AI YouTube thumbnails! 🔥")}`, "_blank")}
          >
            <Send className="h-4 w-4 mr-1.5 text-blue-500" /> Telegram
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground"
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've been using ThumbAI to make AI thumbnails for YouTube — it's incredible! Try it here: ${referralLink}`)}`, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" /> Twitter/X
          </Button>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading font-semibold text-foreground mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", icon: Copy, title: "Share your link", desc: "Send your unique referral link to friends" },
            { step: "2", icon: Users, title: "Friend signs up & buys", desc: "They get ₹100 off their first plan" },
            { step: "3", icon: Gift, title: "You earn 50 credits", desc: "Credits added instantly to your account" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-heading font-bold">{s.step}</span>
              </div>
              <h4 className="font-medium text-foreground text-sm mb-1">{s.title}</h4>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: "Total Referrals", value: totalReferrals },
          { label: "Successful", value: successfulReferrals },
          { label: "Credits Earned", value: totalCreditsEarned },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Referrals table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading font-semibold text-foreground mb-4">Your Referrals</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No referrals yet. Share your link to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">
                    {ref.referee_id ? `${ref.referee_id.slice(0, 4)}***${ref.referee_id.slice(-4)}` : "Pending"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ref.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={ref.status === "completed" ? "default" : "outline"}
                    className={`text-xs ${ref.status === "completed" ? "" : "border-border"}`}
                  >
                    {ref.status === "completed" ? "✅ Upgraded" : ref.status === "signed_up" ? "👤 Signed up" : "⏳ Pending"}
                  </Badge>
                  {ref.credits_awarded > 0 && (
                    <span className="text-xs text-primary font-medium">+{ref.credits_awarded} credits</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReferralPage;
