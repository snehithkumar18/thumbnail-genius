import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Upload, Copy, Trash2, ExternalLink, Trophy, Image as ImageIcon, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useThumbnails } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerHeader } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { hapticFeedback } from "@/lib/utils";

const ABTesterPage = () => {
  const { user } = useAuth();
  const { data: thumbnails } = useThumbnails();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Create test state
  const [thumbA, setThumbA] = useState<string | null>(null);
  const [thumbB, setThumbB] = useState<string | null>(null);
  const [labelA, setLabelA] = useState("Thumbnail A");
  const [labelB, setLabelB] = useState("Thumbnail B");
  const [testTitle, setTestTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<"A" | "B" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // My tests
  const { data: myTests } = useQuery({
    queryKey: ["ab-tests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [viewingTest, setViewingTest] = useState<string | null>(null);

  const handleFileUpload = (side: "A" | "B") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (side === "A") setThumbA(url);
      else setThumbB(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectFromLibrary = (url: string) => {
    if (selectingFor === "A") setThumbA(url);
    else if (selectingFor === "B") setThumbB(url);
    setSelectingFor(null);
  };

  const handleCreateTest = async () => {
    if (!user || !thumbA || !thumbB) { toast.error("Select both thumbnails"); return; }
    setCreating(true);
    try {
      const shareId = nanoid(10);

      // If thumbnails are data URLs, upload them first
      const uploadIfNeeded = async (url: string) => {
        if (!url.startsWith("data:")) return url;
        const base64 = url.split(",")[1];
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const fileName = `${user.id}/ab-tests/${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage.from("thumbnails").upload(fileName, bytes, { contentType: "image/png" });
        if (error) throw error;
        const { data } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
        return data.publicUrl;
      };

      const urlA = await uploadIfNeeded(thumbA);
      const urlB = await uploadIfNeeded(thumbB);

      const { error } = await supabase.from("ab_tests").insert({
        user_id: user.id,
        title: testTitle || null,
        thumb_a_url: urlA,
        thumb_b_url: urlB,
        share_id: shareId,
      });

      if (error) throw error;
      setCreatedShareId(shareId);
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      const message = e instanceof Error ? e.message : "Failed to create test";
      toast.error(message);
    } finally {
      hapticFeedback("heavy");
      setCreating(false);
    }
  };

  const voteUrl = (shareId: string) => `${window.location.origin}/vote/${shareId}`;

  const handleCopyLink = (shareId: string) => {
    navigator.clipboard.writeText(voteUrl(shareId));
    setCopiedLink(true);
    toast.success("Link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteTest = async (testId: string) => {
    await supabase.from("ab_tests").delete().eq("id", testId);
    queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
    toast.success("Test deleted");
  };

  const handleShareWhatsApp = (shareId: string) => {
    const msg = encodeURIComponent(`Hey! Quick poll — which thumbnail would make you click? Vote here: ${voteUrl(shareId)}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleShareTwitter = (shareId: string) => {
    const msg = encodeURIComponent(`Which thumbnail would make you click? Vote here: ${voteUrl(shareId)}`);
    window.open(`https://twitter.com/intent/tweet?text=${msg}`, "_blank");
  };

  // Thumbnail selector component
  const ThumbSlot = ({ side, value, onClear }: { side: "A" | "B"; value: string | null; onClear: () => void }) => (
    <div className="flex-1 space-y-2">
      <label className="text-xs sm:text-sm font-medium text-foreground uppercase tracking-wider">{side === "A" ? labelA : labelB}</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-border aspect-video shadow-lg group">
          <img src={value} alt={`Thumb ${side}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <button 
            onClick={() => { hapticFeedback("medium"); onClear(); }} 
            className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full p-2 hover:bg-background shadow-lg border border-border"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>
      ) : (
        <div className="aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 bg-muted/30 hover:border-primary/30 transition-all hover:bg-muted/50">
          <div className="flex flex-col sm:flex-row gap-2 w-full px-4">
            <label className="cursor-pointer flex-1">
              <Button variant="outline" size="sm" className="w-full h-10 sm:h-8" asChild>
                <span><Upload className="h-3 w-3 mr-1" /> Upload</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(side)} />
            </label>
            <Button variant="outline" size="sm" className="flex-1 h-10 sm:h-8" onClick={() => { hapticFeedback("light"); setSelectingFor(side); }}>
              <ImageIcon className="h-3 w-3 mr-1" /> Library
            </Button>
          </div>
        </div>
      )}
      <Input
        value={side === "A" ? labelA : labelB}
        onChange={e => side === "A" ? setLabelA(e.target.value) : setLabelB(e.target.value)}
        className="bg-muted border-border text-sm h-11"
        placeholder={`Label ${side}`}
      />
    </div>
  );

  // Viewing a specific test result
  const viewTest = myTests?.find(t => t.id === viewingTest);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-1">🧪 A/B Thumbnail Tester</h1>
        <p className="text-muted-foreground">Get real votes on which thumbnail performs better before publishing your video</p>
      </div>

      {/* Create Test */}
      {!createdShareId && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Choose 2 thumbnails to test</h2>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <ThumbSlot side="A" value={thumbA} onClear={() => setThumbA(null)} />
            <div className="flex items-center justify-center -my-2 sm:my-0">
               <span className="text-muted-foreground font-black text-xs sm:text-base px-2 bg-card relative z-10">VS</span>
               <div className="absolute h-[1px] w-full bg-border sm:hidden" />
            </div>
            <ThumbSlot side="B" value={thumbB} onClear={() => setThumbB(null)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Test title (shown to voters)</label>
            <Input
              value={testTitle}
              onChange={e => setTestTitle(e.target.value)}
              placeholder="What is your video about?"
              className="bg-muted border-border"
            />
          </div>

          <Button
            onClick={handleCreateTest}
            disabled={!thumbA || !thumbB || creating}
            className="w-full bg-primary text-primary-foreground font-bold h-12"
          >
            {creating ? "Creating..." : "Create Vote Link"}
          </Button>
        </div>
      )}

      {/* Created - Share */}
      {createdShareId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h2 className="font-semibold text-foreground">Test Created!</h2>
          </div>

          <div className="flex gap-2">
            <Input value={voteUrl(createdShareId)} readOnly className="bg-muted border-border font-mono text-sm" />
            <Button onClick={() => handleCopyLink(createdShareId)} className="shrink-0">
              {copiedLink ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleShareTwitter(createdShareId)}>𝕏 Twitter</Button>
            <Button variant="outline" size="sm" onClick={() => handleShareWhatsApp(createdShareId)}>💬 WhatsApp</Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(voteUrl(createdShareId))}`, "_blank")}>✈️ Telegram</Button>
          </div>

          <Button variant="ghost" onClick={() => { setCreatedShareId(null); setThumbA(null); setThumbB(null); setTestTitle(""); }}>
            Create another test
          </Button>
        </motion.div>
      )}

      {/* Library selector */}
      {isMobile ? (
        <Drawer open={!!selectingFor} onOpenChange={(val) => !val && setSelectingFor(null)}>
          <DrawerContent className="focus-visible:outline-none max-h-[90vh]">
            <DrawerHeader className="border-b border-border">
              <DrawerTitle className="text-foreground text-left">Select Thumbnail for {selectingFor}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 grid grid-cols-2 gap-3 pb-12">
              {(thumbnails || []).filter(t => t.image_url).map(t => (
                <button key={t.id} onClick={() => { hapticFeedback("light"); handleSelectFromLibrary(t.image_url!); }}
                  className="rounded-xl overflow-hidden border-2 border-border active:border-primary transition-all shadow-sm">
                  <img src={t.image_url!} alt="" className="w-full aspect-video object-cover" />
                </button>
              ))}
              {(!thumbnails || thumbnails.length === 0) && (
                <p className="col-span-full text-center text-muted-foreground py-12">No thumbnails yet</p>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <AnimatePresence>
          {selectingFor && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/60 z-40" onClick={() => setSelectingFor(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                className="fixed inset-x-3 sm:inset-x-6 top-4 bottom-4 md:inset-x-[15%] md:top-[6%] md:bottom-[6%] bg-card border border-border rounded-2xl z-50 flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Select Thumbnail for {selectingFor}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectingFor(null)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(thumbnails || []).filter(t => t.image_url).map(t => (
                    <button key={t.id} onClick={() => handleSelectFromLibrary(t.image_url!)}
                      className="rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all">
                      <img src={t.image_url!} alt="" className="w-full aspect-video object-cover" />
                    </button>
                  ))}
                  {(!thumbnails || thumbnails.length === 0) && (
                    <p className="col-span-full text-center text-muted-foreground py-8">No thumbnails yet</p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* My Tests */}
      {myTests && myTests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">My Tests</h2>
          <div className="space-y-3">
            {myTests.map(test => {
              const totalVotes = test.votes_a + test.votes_b;
              const pctA = totalVotes > 0 ? Math.round((test.votes_a / totalVotes) * 100) : 50;
              const pctB = 100 - pctA;
              const winner = totalVotes >= 3 ? (test.votes_a > test.votes_b ? "A" : test.votes_b > test.votes_a ? "B" : null) : null;

              return (
                <div key={test.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex gap-2 shrink-0">
                      <img src={test.thumb_a_url} alt="A" className="w-16 h-10 rounded object-cover border border-border" />
                      <img src={test.thumb_b_url} alt="B" className="w-16 h-10 rounded object-cover border border-border" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{test.title || "Untitled test"}</p>
                      <p className="text-xs text-muted-foreground">{totalVotes} votes • {new Date(test.created_at).toLocaleDateString()}</p>

                      {totalVotes > 0 && (
                        <div className="mt-4 flex items-center gap-6">
                           <div className="h-24 w-24 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[{ name: labelA, value: test.votes_a }, { name: labelB, value: test.votes_b }]}
                                    innerRadius={25}
                                    outerRadius={40}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    <Cell fill="#8B47FF" />
                                    <Cell fill="#6366F1" />
                                  </Pie>
                                  <RechartsTooltip />
                                </PieChart>
                              </ResponsiveContainer>
                           </div>
                           <div className="flex-1 space-y-2">
                              <div className="flex justify-between text-xs font-semibold">
                                 <span className="text-[#8B47FF]">{labelA}: {pctA}%</span>
                                 <span className="text-[#6366F1]">{labelB}: {pctB}%</span>
                              </div>
                              <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted">
                                <div className="bg-[#8B47FF] transition-all" style={{ width: `${pctA}%` }} />
                                <div className="bg-[#6366F1] transition-all" style={{ width: `${pctB}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">
                                 {totalVotes < 10 ? "Needs more votes for statistical significance" : "Trends look clear!"}
                              </p>
                           </div>
                        </div>
                      )}

                      {/* Social Preview Mockup */}
                      <Collapsible className="w-full">
                        <CollapsibleTrigger asChild>
                           <Button variant="ghost" size="sm" className="mt-2 text-[10px] text-primary h-7 px-2 hover:bg-primary/5">
                              <ExternalLink className="h-3 w-3 mr-1" /> View Share Preview
                           </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-4 p-3 bg-muted/20 border border-border rounded-lg origin-left">
                             <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">WhatsApp/Twitter Preview</p>
                             <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm flex flex-col w-full max-w-sm">
                                <div className="aspect-video relative bg-slate-100 flex items-center justify-center">
                                   <img src={test.thumb_a_url} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
                                   <div className="relative z-10 flex gap-1 p-4">
                                       <img src={test.thumb_a_url} className="w-24 h-14 rounded border-2 border-white shadow-xl rotate-[-5deg]" />
                                       <img src={test.thumb_b_url} className="w-24 h-14 rounded border-2 border-white shadow-xl rotate-[5deg]" />
                                   </div>
                                </div>
                                <div className="p-3">
                                   <p className="text-[11px] font-bold text-slate-800">VOTE: {test.title || "Which thumbnail is better?"}</p>
                                   <p className="text-[9px] text-slate-400 mt-0.5">Thumbly.app/vote/{test.share_id}</p>
                                </div>
                             </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {winner && (
                        <Badge className="mt-3 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-bold py-1">
                          <Trophy className="h-3 w-3 mr-1.5" /> WINNER: {winner === 'A' ? labelA : labelB}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyLink(test.share_id!)}><Copy className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTest(test.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ABTesterPage;
