import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const getFingerprint = (): string => {
  let fp = localStorage.getItem("thumbai_fp");
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem("thumbai_fp", fp);
  }
  return fp;
};

type TestData = {
  id: string;
  title: string | null;
  thumb_a_url: string;
  thumb_b_url: string;
  votes_a: number;
  votes_b: number;
};

const VotePage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [votedChoice, setVotedChoice] = useState<"a" | "b" | null>(null);
  const [liveVotesA, setLiveVotesA] = useState(0);
  const [liveVotesB, setLiveVotesB] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!shareId) { setError("Invalid link"); setLoading(false); return; }

      const { data, error: fetchErr } = await supabase
        .from("ab_tests")
        .select("id, title, thumb_a_url, thumb_b_url, votes_a, votes_b")
        .eq("share_id", shareId)
        .single();

      if (fetchErr || !data) { setError("Test not found"); setLoading(false); return; }

      setTest(data);
      setLiveVotesA(data.votes_a);
      setLiveVotesB(data.votes_b);

      // Check if already voted
      const fp = getFingerprint();
      const { data: existingVote } = await supabase
        .from("ab_votes")
        .select("choice")
        .eq("test_id", data.id)
        .eq("voter_fingerprint", fp)
        .maybeSingle();

      if (existingVote) {
        setVoted(true);
        setVotedChoice(existingVote.choice as "a" | "b");
      }

      setLoading(false);
    };
    load();
  }, [shareId]);

  const handleVote = async (choice: "a" | "b") => {
    if (!test || voted) return;
    const fp = getFingerprint();

    // Insert vote
    const { error: voteErr } = await supabase.from("ab_votes").insert({
      test_id: test.id,
      voter_fingerprint: fp,
      choice,
    });

    if (voteErr) {
      if (voteErr.message?.includes("duplicate")) {
        setVoted(true);
        return;
      }
      return;
    }

    // Update counts
    const field = choice === "a" ? "votes_a" : "votes_b";
    const newVal = choice === "a" ? liveVotesA + 1 : liveVotesB + 1;
    await supabase.from("ab_tests").update({ [field]: newVal }).eq("id", test.id);

    if (choice === "a") setLiveVotesA(v => v + 1);
    else setLiveVotesB(v => v + 1);

    setVoted(true);
    setVotedChoice(choice);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const totalVotes = liveVotesA + liveVotesB;
  const pctA = totalVotes > 0 ? Math.round((liveVotesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{error || "Test not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, x: Math.random() * window.innerWidth, opacity: 1 }}
              animate={{ y: window.innerHeight + 20, opacity: 0, rotate: Math.random() * 720 }}
              transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.5 }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: ["hsl(16, 100%, 50%)", "hsl(51, 100%, 50%)", "#22c55e", "#3b82f6", "#a855f7"][i % 5] }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-end p-4">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Zap className="h-4 w-4 text-primary fill-primary" />
          <span className="text-sm font-semibold">ThumbAI</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 max-w-3xl mx-auto w-full">
        <h1 className="text-xl md:text-2xl font-heading font-bold text-foreground text-center mb-2">
          Which thumbnail would make you click?
        </h1>
        {test.title && <p className="text-muted-foreground text-sm mb-8 text-center">{test.title}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
          {/* Thumb A */}
          <div className="space-y-3">
            <div className={`rounded-xl overflow-hidden border-2 transition-all ${votedChoice === "a" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
              <img src={test.thumb_a_url} alt="Thumbnail A" className="w-full aspect-video object-cover" />
            </div>
            {!voted ? (
              <Button onClick={() => handleVote("a")} className="w-full bg-primary text-primary-foreground font-semibold">
                I'd click this →
              </Button>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium flex items-center gap-1">
                    {votedChoice === "a" && <CheckCircle className="h-3.5 w-3.5 text-primary" />} A
                  </span>
                  <span className="text-foreground font-semibold">{pctA}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pctA}%` }} transition={{ duration: 1 }}
                    className="h-full bg-primary rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Thumb B */}
          <div className="space-y-3">
            <div className={`rounded-xl overflow-hidden border-2 transition-all ${votedChoice === "b" ? "border-secondary ring-2 ring-secondary/30" : "border-border"}`}>
              <img src={test.thumb_b_url} alt="Thumbnail B" className="w-full aspect-video object-cover" />
            </div>
            {!voted ? (
              <Button onClick={() => handleVote("b")} className="w-full bg-secondary text-secondary-foreground font-semibold">
                I'd click this →
              </Button>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium flex items-center gap-1">
                    {votedChoice === "b" && <CheckCircle className="h-3.5 w-3.5 text-secondary" />} B
                  </span>
                  <span className="text-foreground font-semibold">{pctB}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pctB}%` }} transition={{ duration: 1 }}
                    className="h-full bg-secondary rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {voted && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">{totalVotes} total vote{totalVotes !== 1 ? "s" : ""}</p>
            <div className="bg-card border border-border rounded-xl p-4 max-w-sm mx-auto">
              <p className="text-sm text-foreground font-medium mb-2">Want to make your own thumbnails?</p>
              <Button onClick={() => window.open("/", "_blank")} className="bg-primary text-primary-foreground">
                <Zap className="h-4 w-4 mr-1" /> Try ThumbAI Free →
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VotePage;
