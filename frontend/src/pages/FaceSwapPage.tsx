import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hapticFeedback } from "@/lib/utils";
import { Upload, Camera, Check, AlertTriangle, ArrowRight, Download, Heart, Pencil, RefreshCw, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits, useThumbnails } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

const LOADING_MESSAGES = [
  "Analyzing facial structure...",
  "Mapping key features...",
  "Blending seamlessly...",
  "Adjusting lighting...",
  "Almost ready!",
];

const FaceSwapPage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { data: thumbnails } = useThumbnails();
  const queryClient = useQueryClient();

  // Face management
  const [uploadingFace, setUploadingFace] = useState(false);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceLabel, setFaceLabel] = useState("");
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // helper: upload temp file and analyze for face bbox (calls local AI detect)
  const analyzeAndCropPreview = useCallback(async (fileOrUrl: File | string) => {
    try {
      let imageUrl: string | null = null;
      // If a File was passed, upload it to storage temporarily
      if (fileOrUrl instanceof File) {
        const tempPath = `${user?.id || 'anon'}/temp/${crypto.randomUUID()}.png`;
        const { error: uploadError } = await supabase.storage.from('thumbnails').upload(tempPath, fileOrUrl, { contentType: fileOrUrl.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('thumbnails').getPublicUrl(tempPath);
        imageUrl = data.publicUrl;
      } else {
        imageUrl = fileOrUrl;
      }

      if (!imageUrl) return;

      // Call local AI detect directly for fast preview (no auth needed)
      const aiBase = (import.meta as any).env?.VITE_SMART_EDITOR_AI_BASE || 'http://localhost:8000';
      const resp = await fetch(`${aiBase}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, max_dim: 1024 }),
      });
      if (!resp.ok) {
        setFaceDetected(false);
        return;
      }
      const json = await resp.json();
      const layers = json?.layers || [];

      // Prefer a person/face layer; otherwise fall back to largest bbox
      let faceLayer = layers.find((l: any) => l.type === 'person' || l.type === 'face' || (l.label && l.label.toLowerCase().includes('face')));
      if (!faceLayer && layers.length > 0) {
        faceLayer = layers.reduce((a: any, b: any) => (a.bbox && b.bbox && a.bbox[2] * a.bbox[3] > b.bbox[2] * b.bbox[3] ? a : b));
      }

      if (!faceLayer || !faceLayer.bbox) {
        setFaceDetected(false);
        return;
      }

      // bbox returned is [x,y,w,h] in original image coords
      const [x, y, w, h] = faceLayer.bbox.map((n: number) => Number(n));
      // Fetch image and crop around bbox with padding
      const imgResp = await fetch(imageUrl);
      const blob = await imgResp.blob();
      const imgBitmap = await createImageBitmap(blob);

      const pad = 0.45; // add padding around face
      const cx = Math.max(0, x - w * pad);
      const cy = Math.max(0, y - h * pad);
      const cw = Math.min(imgBitmap.width - cx, w * (1 + pad * 2));
      const ch = Math.min(imgBitmap.height - cy, h * (1 + pad * 2));

      const canvas = document.createElement('canvas');
      const targetSize = 512; // high-quality preview
      canvas.width = targetSize;
      canvas.height = Math.round((ch / cw) * targetSize);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(imgBitmap, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      setFacePreview(dataUrl);
      setFaceDetected(true);
    } catch (err) {
      console.error('Preview analysis failed', err);
      setFaceDetected(false);
    }
  }, [user]);

  // Target
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [customTarget, setCustomTarget] = useState<string | null>(null);
  const [customTargetFile, setCustomTargetFile] = useState<File | null>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  // Swap
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [swapStrength, setSwapStrength] = useState(90);
  const [swapping, setSwapping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [showZeroCredits, setShowZeroCredits] = useState(false);
  const [formatFilter, setFormatFilter] = useState("all");
  const bypassCredits = (import.meta as any).env?.VITE_BYPASS_CREDITS === "true";

  // Fetch saved faces
  const { data: savedFaces, refetch: refetchFaces } = useQuery({
    queryKey: ["faces", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("faces")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const maxFaces = credits?.plan_type === "free" ? 1 : 3;
  const canAddFace = (savedFaces?.length ?? 0) < maxFaces;

  useEffect(() => {
    if (savedFaces && savedFaces.length > 0 && !selectedFaceId) {
      setSelectedFaceId(savedFaces[0].id);
    }
  }, [savedFaces, selectedFaceId]);

  // When a saved face is selected, generate a better preview centered on the face
  useEffect(() => {
    if (!selectedFaceId || !savedFaces) return;
    const face = savedFaces.find((f: any) => f.id === selectedFaceId);
    if (!face) return;
    setFacePreview(face.face_url);
    setFaceDetected(null);
    // analyze remote URL and crop
    analyzeAndCropPreview(face.face_url);
  }, [selectedFaceId, savedFaces, analyzeAndCropPreview]);

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setFaceFile(file);
    const url = URL.createObjectURL(file);
    setFacePreview(url); // immediate preview while analysis runs
    setFaceDetected(null);
    // analyze and crop for better face-centered preview
    analyzeAndCropPreview(file);
  };

  const saveFace = async () => {
    if (!user || !faceFile) return;
    setUploadingFace(true);
    try {
      const faceId = crypto.randomUUID();
      const path = `${user.id}/faces/${faceId}.png`;
      const { error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(path, faceFile, { contentType: faceFile.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(path);
      let processedFaceUrl = urlData.publicUrl;

      try {
        const { data: bgData, error: bgError } = await supabase.functions.invoke("remove-background", {
          body: { image_url: urlData.publicUrl },
        });
        if (!bgError && bgData?.image_url) {
          processedFaceUrl = bgData.image_url;
        }
      } catch {
        // Fall back to original upload if background removal is unavailable.
      }

      const { error: insertError } = await supabase.from("faces").insert({
        user_id: user.id,
        face_url: processedFaceUrl,
        label: faceLabel || "My Face",
      });
      if (insertError) throw insertError;

      toast.success("Face saved successfully!");
      hapticFeedback("heavy");
      setFacePreview(null);
      setFaceFile(null);
      setFaceLabel("");
      setFaceDetected(null);
      refetchFaces();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save face";
      toast.error(message);
    } finally {
      setUploadingFace(false);
    }
  };

  const deleteFace = async (id: string) => {
    if (!user) return;
    await supabase.from("faces").delete().eq("id", id).eq("user_id", user.id);
    refetchFaces();
    if (selectedFaceId === id) setSelectedFaceId(null);
    toast.success("Face removed");
  };

  const handleCustomTargetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomTargetFile(file);
    setCustomTarget(URL.createObjectURL(file));
    setSelectedTarget(null);
  };

  const activeFaceUrl = savedFaces?.find((f) => f.id === selectedFaceId)?.face_url;
  const activeTargetUrl = selectedTarget || customTarget;

  const handleSwap = async () => {
    if (!user || !activeFaceUrl || !activeTargetUrl) return;
    if (!bypassCredits && (credits?.credits_remaining ?? 0) < 1) {
      setShowZeroCredits(true);
      return;
    }

    setSwapping(true);
    setProgress(0);
    setResult(null);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 95));
    }, 800);

    try {
      let targetUrl = activeTargetUrl;

      // Upload custom target if it's a blob
      if (customTargetFile && activeTargetUrl === customTarget) {
        const path = `${user.id}/targets/${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage
          .from("thumbnails")
          .upload(path, customTargetFile, { contentType: customTargetFile.type });
        if (error) throw error;
        const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
        targetUrl = data.publicUrl;
      }

      // Call smart-editor-service (Node) which proxies to Python AI
      const editorBase = import.meta.env.VITE_SMART_EDITOR_API_BASE || "http://localhost:3001";

      // include current user's access token so smart-editor-service can authenticate
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(`${editorBase}/face-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          face_url: activeFaceUrl,
          target_url: targetUrl,
          swap_strength: swapStrength,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => null);
        throw new Error(`Editor error: ${resp.status} ${text || ""}`);
      }

      const data = await resp.json();
      if (data?.error) throw new Error(data.error);

      // smart-editor-ai returns `image_base64` (and backend returns image_url).
      // Support both for testing: prefer `image_url`, otherwise construct data URL from base64.
      const imageUrl = data.image_url || (data.image_base64 ? `data:image/png;base64,${data.image_base64}` : null);
      setResult(imageUrl);
      setResultId(data.thumbnail_id || null);
      setProgress(100);
      hapticFeedback("heavy");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Face swap failed";
      toast.error(message);
    } finally {
      clearInterval(interval);
      setSwapping(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    (async () => {
      try {
        let finalUrl = result;
        if (credits?.plan_type === "studio") {
          const { data: upscaleData, error: upscaleError } = await supabase.functions.invoke("upscale-image", {
            body: { image_url: result },
          });
          if (!upscaleError && upscaleData?.image_url) {
            finalUrl = upscaleData.image_url;
            toast.success("4K upscale applied");
          }
        }

        const resp = await fetch(finalUrl);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `faceswap-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        toast.error("Download failed");
      }
    })();
  };

  const filteredThumbnails = thumbnails?.filter((t) => {
    if (formatFilter === "all") return true;
    return t.format_type === formatFilter;
  });

  const needsSetup = !savedFaces || savedFaces.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">🧑 Face Swap</h1>
          <Badge className="bg-primary/20 text-primary border-primary/30">1 credit</Badge>
        </div>
        <p className="text-muted-foreground mt-1">Put your face in any AI-generated thumbnail</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT — Controls */}
        <div className="space-y-6">
          {/* Step 1: Face Setup */}
          <Card className="border-border bg-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Step 1</span>
                  My Faces
                </h2>
                <span className="text-xs text-muted-foreground">{savedFaces?.length ?? 0}/{maxFaces} saved</span>
              </div>

              {/* Saved faces */}
              {savedFaces && savedFaces.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {savedFaces.map((face) => (
                    <div
                      key={face.id}
                      onClick={() => { hapticFeedback("light"); setSelectedFaceId(face.id); }}
                      className={`relative cursor-pointer rounded-xl p-1 transition-all ${
                        selectedFaceId === face.id
                          ? "ring-2 ring-primary bg-primary/10"
                          : "ring-1 ring-border hover:ring-muted-foreground"
                      }`}
                    >
                      <img
                        src={face.face_url}
                        alt={face.label || "Face"}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                      />
                      <p className="text-[10px] sm:text-xs text-center mt-1 text-muted-foreground truncate w-16 sm:w-20">
                        {face.label || "Face"}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); hapticFeedback("medium"); deleteFace(face.id); }}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-[12px] shadow-lg border border-background"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new face */}
              {canAddFace && (
                <div className="space-y-3">
                  {facePreview ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary">
                          <img src={facePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1">
                          {faceDetected ? (
                            <p className="text-sm text-green-400 flex items-center gap-1">
                              <Check className="w-4 h-4" /> Face detected
                            </p>
                          ) : (
                            <p className="text-sm text-yellow-400 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" /> No clear face found
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>✓ Use a clear front-facing photo</p>
                        <p>✓ Good lighting, no sunglasses</p>
                        <p>✓ Plain background works best</p>
                      </div>
                      <Input
                        placeholder="Name this face (e.g. My Main Photo)"
                        value={faceLabel}
                        onChange={(e) => setFaceLabel(e.target.value)}
                        className="bg-muted border-border"
                      />
                      <Button onClick={saveFace} disabled={uploadingFace} className="w-full">
                        {uploadingFace ? "Saving..." : "Save Face"}
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => faceInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden group"
                    >
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drop a photo or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP</p>
                      
                      {/* Laser Scanner animation decorative */}
                      <motion.div 
                        initial={{ top: '-10%' }}
                        animate={{ top: '110%' }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-x-0 h-0.5 bg-primary/20 shadow-[0_0_10px_#8B47FF] z-0 pointer-events-none opacity-0 group-hover:opacity-100"
                      />
                    </div>
                  )}
                  <input
                    ref={faceInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFaceUpload}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Target */}
          <Card className="border-border bg-card">
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Step 2</span>
                Select Target Thumbnail
              </h2>

              <Tabs defaultValue="my" className="w-full">
                <TabsList className="w-full bg-muted">
                  <TabsTrigger value="my" className="flex-1">My Thumbnails</TabsTrigger>
                  <TabsTrigger value="custom" className="flex-1">Upload Custom</TabsTrigger>
                </TabsList>

                <TabsContent value="my" className="space-y-3">
                  <div className="flex gap-2">
                    {["all", "16:9", "9:16"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormatFilter(f)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${
                          formatFilter === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f === "all" ? "All" : f}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filteredThumbnails?.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { hapticFeedback("light"); setSelectedTarget(t.image_url); setCustomTarget(null); }}
                        className={`cursor-pointer rounded-lg overflow-hidden transition-all ${
                          selectedTarget === t.image_url
                            ? "ring-2 ring-secondary"
                            : "ring-1 ring-border hover:ring-muted-foreground"
                        }`}
                      >
                        <img
                          src={t.image_url || "/placeholder.svg"}
                          alt=""
                          className={`w-full object-cover ${t.format_type === "9:16" ? "h-32 sm:h-24" : "h-20 sm:h-16"}`}
                        />
                      </div>
                    ))}
                    {(!filteredThumbnails || filteredThumbnails.length === 0) && (
                      <p className="col-span-full text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-xl">
                        No thumbnails yet. Generate some first!
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="custom">
                  {customTarget ? (
                    <div className="space-y-2">
                      <img src={customTarget} alt="Custom" className="w-full rounded-lg max-h-48 object-contain" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setCustomTarget(null); setCustomTargetFile(null); }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => targetInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Upload any image</p>
                    </div>
                  )}
                  <input
                    ref={targetInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomTargetUpload}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Step 3: Configure */}
          {selectedFaceId && activeTargetUrl && !result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border bg-card">
                <CardContent className="p-5 space-y-5">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Step 3</span>
                    Configure & Swap
                  </h2>

                  {/* Preview */}
                  <div className="flex items-center gap-4 justify-center">
                    <div className="text-center">
                      <img
                        src={activeFaceUrl || ""}
                        alt="Face"
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Your Face</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-primary" />
                    <div className="text-center">
                      <img
                        src={activeTargetUrl}
                        alt="Target"
                        className="w-28 h-16 rounded-lg object-cover ring-2 ring-secondary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Target</p>
                    </div>
                  </div>


                  <Button
                    onClick={handleSwap}
                    disabled={swapping}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-bold"
                  >
                    {swapping ? "Swapping..." : "Apply Face Swap — 1 credit"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* RIGHT — Preview */}
        <div className="space-y-4">
          <Card className="border-border bg-card min-h-[400px] flex items-center justify-center">
            <CardContent className="p-6 w-full">
              {swapping ? (
                <div className="space-y-4 text-center">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img src={activeTargetUrl} className="w-full h-full object-cover opacity-50 backdrop-blur-sm" />
                       <motion.div 
                        initial={{ top: '-5%' }}
                        animate={{ top: '105%' }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute inset-x-0 h-1 bg-[#8B47FF] shadow-[0_0_20px_#8B47FF] z-10"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8B47FF]/5 to-transparent animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <motion.div
                        className="bg-primary h-2 rounded-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">
                      {LOADING_MESSAGES[Math.min(Math.floor(progress / 20), LOADING_MESSAGES.length - 1)]}
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <BeforeAfterSlider 
                    beforeImage={activeTargetUrl || ""} 
                    afterImage={result} 
                    className="aspect-video w-full shadow-2xl"
                  />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={downloadResult}>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setResult(null); setResultId(null); }}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Try Another
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!resultId || !user) return;
                        await supabase.from("thumbnails").update({ is_favorite: true }).eq("id", resultId);
                        toast.success("Added to favorites!");
                      }}
                    >
                      <Heart className="w-4 h-4 mr-1" /> Favorite
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground">Select a face and target to start</p>
                  <p className="text-xs text-muted-foreground/60">
                    Tip: Front-facing photos with good lighting work best
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ZeroCreditsModal open={showZeroCredits} onClose={() => setShowZeroCredits(false)} />
    </div>
  );
};

export default FaceSwapPage;
