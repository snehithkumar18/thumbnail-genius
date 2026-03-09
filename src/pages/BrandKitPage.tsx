import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Check, Trash2, Upload, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PLAN_LIMITS } from "@/lib/credits";

const FONT_STYLES = [
  { id: "bold-sans", label: "BOLD SANS", preview: "font-bold tracking-tight" },
  { id: "condensed", label: "CONDENSED", preview: "font-bold tracking-tighter" },
  { id: "serif", label: "SERIF", preview: "font-serif font-bold" },
  { id: "display", label: "DISPLAY", preview: "font-bold text-lg tracking-wide" },
  { id: "handwritten", label: "HAND", preview: "italic font-medium" },
];

const FRAME_STYLES = [
  { id: "none", label: "None", desc: "No frame" },
  { id: "thick-border", label: "Thick Border", desc: "Bold colored border" },
  { id: "corner-badge", label: "Corner Badge", desc: "Logo in corner" },
  { id: "bottom-bar", label: "Bottom Bar", desc: "Color bar at bottom" },
  { id: "gradient-overlay", label: "Gradient", desc: "Color gradient overlay" },
  { id: "neon-glow", label: "Neon Glow", desc: "Glowing border effect" },
];

const STYLE_OPTIONS = ["Realistic", "Cinematic", "Bold Graphic", "Minimal"];

const BrandKitPage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const planType = (credits?.plan_type ?? "free") as keyof typeof PLAN_LIMITS;
  const maxKits = PLAN_LIMITS[planType]?.brandKits ?? 0;

  const { data: brandKits, refetch } = useQuery({
    queryKey: ["brand-kits", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [activeKitId, setActiveKitId] = useState<string | null>(null);
  const [kitName, setKitName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#8B47FF");
  const [secondaryColor, setSecondaryColor] = useState("#F59E0B");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [fontStyle, setFontStyle] = useState("bold-sans");
  const [frameStyle, setFrameStyle] = useState("none");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Load kit data when selecting
  useEffect(() => {
    if (activeKitId && brandKits) {
      const kit = brandKits.find((k) => k.id === activeKitId);
      if (kit) {
        setKitName(kit.kit_name);
        setPrimaryColor(kit.primary_color || "#8B47FF");
        setSecondaryColor(kit.secondary_color || "#F59E0B");
        setTextColor(kit.text_color || "#FFFFFF");
        setFontStyle(kit.font_style || "bold-sans");
        setFrameStyle(kit.frame_style || "none");
        setLogoUrl(kit.logo_url);
      }
    }
  }, [activeKitId, brandKits]);

  // Auto-select first kit
  useEffect(() => {
    if (brandKits && brandKits.length > 0 && !activeKitId) {
      setActiveKitId(brandKits[0].id);
    }
  }, [brandKits, activeKitId]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const detectColorsFromLogo = () => {
    if (!logoUrl) {
      toast.error("Upload a logo first");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      // Simple dominant color extraction
      const colorMap: Record<string, number> = {};
      for (let i = 0; i < imageData.length; i += 16) {
        const r = Math.round(imageData[i] / 32) * 32;
        const g = Math.round(imageData[i + 1] / 32) * 32;
        const b = Math.round(imageData[i + 2] / 32) * 32;
        const a = imageData[i + 3];
        if (a < 128) continue; // skip transparent
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }
      
      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
      if (sorted.length >= 1) {
        const [r, g, b] = sorted[0][0].split(",").map(Number);
        setPrimaryColor(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`);
      }
      if (sorted.length >= 2) {
        const [r, g, b] = sorted[1][0].split(",").map(Number);
        setSecondaryColor(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`);
      }
      toast.success("Colors detected from logo!");
    };
    img.src = logoUrl;
  };

  const saveKit = async () => {
    if (!user || !kitName.trim()) {
      toast.error("Please enter a kit name");
      return;
    }
    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload logo if new file
      if (logoFile) {
        const path = `brand-logos/${user.id}/${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage
          .from("thumbnails")
          .upload(path, logoFile, { contentType: logoFile.type });
        if (error) throw error;
        const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
        finalLogoUrl = data.publicUrl;
      }

      const kitData = {
        user_id: user.id,
        kit_name: kitName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        text_color: textColor,
        font_style: fontStyle,
        frame_style: frameStyle,
        logo_url: finalLogoUrl,
      };

      if (activeKitId) {
        const { error } = await supabase
          .from("brand_kits")
          .update(kitData)
          .eq("id", activeKitId);
        if (error) throw error;
        toast.success("Brand kit updated!");
      } else {
        const { error } = await supabase.from("brand_kits").insert(kitData);
        if (error) throw error;
        toast.success("Brand kit created!");
      }

      setLogoFile(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const setAsActive = async (kitId: string) => {
    if (!user) return;
    // Deactivate all
    await supabase.from("brand_kits").update({ is_active: false }).eq("user_id", user.id);
    // Activate selected
    await supabase.from("brand_kits").update({ is_active: true }).eq("id", kitId);
    refetch();
    toast.success("Brand kit activated!");
  };

  const deleteKit = async (kitId: string) => {
    if (!user) return;
    await supabase.from("brand_kits").delete().eq("id", kitId).eq("user_id", user.id);
    if (activeKitId === kitId) setActiveKitId(null);
    refetch();
    toast.success("Brand kit deleted");
  };

  const createNewKit = () => {
    setActiveKitId(null);
    setKitName("");
    setPrimaryColor("#8B47FF");
    setSecondaryColor("#F59E0B");
    setTextColor("#FFFFFF");
    setFontStyle("bold-sans");
    setFrameStyle("none");
    setLogoUrl(null);
    setLogoFile(null);
  };

  const activeKit = brandKits?.find((k) => k.id === activeKitId);
  const isActiveKit = activeKit?.is_active;

  if (maxKits === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🎨 Brand Kit</h1>
          <p className="text-muted-foreground mt-1">Your branding applied automatically to every thumbnail</p>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <Palette className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Upgrade to unlock Brand Kits</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Brand Kits let you save your colors, logo, and style preferences so every thumbnail matches your channel identity.
            </p>
            <Button className="bg-primary text-primary-foreground">Upgrade to Creator</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">🎨 Brand Kit</h1>
        <p className="text-muted-foreground mt-1">Your branding applied automatically to every thumbnail</p>
      </div>

      {/* Kit tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {brandKits?.map((kit) => (
          <button
            key={kit.id}
            onClick={() => setActiveKitId(kit.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              activeKitId === kit.id
                ? "bg-primary/10 text-primary ring-1 ring-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {kit.kit_name}
            {kit.is_active && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5">
                Active
              </Badge>
            )}
          </button>
        ))}
        {(brandKits?.length ?? 0) < maxKits && (
          <button
            onClick={createNewKit}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" /> New Kit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-border bg-card">
            <CardContent className="p-5 space-y-5">
              {/* Kit name */}
              <div className="space-y-2">
                <Label className="text-foreground">Kit Name</Label>
                <Input
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  placeholder="e.g. My YouTube Channel"
                  className="bg-muted border-border"
                />
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-foreground">Logo</Label>
                {logoUrl ? (
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: primaryColor + "30" }}
                    >
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setLogoUrl(null); setLogoFile(null); }}
                    >
                      <X className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Upload PNG (transparency supported)</p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Colors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Color Palette</Label>
                  {logoUrl && (
                    <Button variant="ghost" size="sm" onClick={detectColorsFromLogo} className="text-xs text-primary">
                      <Palette className="w-3 h-3 mr-1" /> Detect from logo
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Primary", value: primaryColor, set: setPrimaryColor },
                    { label: "Secondary", value: secondaryColor, set: setSecondaryColor },
                    { label: "Text", value: textColor, set: setTextColor },
                  ].map((c) => (
                    <div key={c.label} className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{c.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={c.value}
                          onChange={(e) => c.set(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <Input
                          value={c.value}
                          onChange={(e) => c.set(e.target.value)}
                          className="bg-muted border-border text-xs h-8 font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font */}
              <div className="space-y-2">
                <Label className="text-foreground">Font Style</Label>
                <div className="grid grid-cols-5 gap-2">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontStyle(f.id)}
                      className={`py-3 px-2 rounded-lg text-center transition-all ${
                        fontStyle === f.id
                          ? "bg-primary/10 ring-1 ring-primary text-primary"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className={`text-xs ${f.preview}`}>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame */}
              <div className="space-y-2">
                <Label className="text-foreground">Frame / Border Style</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FRAME_STYLES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrameStyle(f.id)}
                      className={`py-3 px-3 rounded-lg text-left transition-all ${
                        frameStyle === f.id
                          ? "bg-primary/10 ring-1 ring-primary"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <span className={`text-xs font-medium ${frameStyle === f.id ? "text-primary" : "text-foreground"}`}>
                        {f.label}
                      </span>
                      <br />
                      <span className="text-[10px] text-muted-foreground">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button onClick={saveKit} disabled={saving} className="flex-1 bg-primary text-primary-foreground">
                  {saving ? "Saving..." : activeKitId ? "Update Brand Kit" : "Save Brand Kit"}
                </Button>
                {activeKitId && !isActiveKit && (
                  <Button
                    variant="outline"
                    onClick={() => setAsActive(activeKitId)}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Check className="w-4 h-4 mr-1" /> Set Active
                  </Button>
                )}
                {activeKitId && (
                  <Button
                    variant="outline"
                    onClick={() => deleteKit(activeKitId)}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>

              {/* Mockup thumbnails */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative aspect-video rounded-lg overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}20)`,
                    border: frameStyle === "thick-border" ? `3px solid ${primaryColor}` : undefined,
                    boxShadow: frameStyle === "neon-glow" ? `0 0 15px ${primaryColor}60, inset 0 0 15px ${primaryColor}20` : undefined,
                  }}
                >
                  {/* Gradient overlay */}
                  {frameStyle === "gradient-overlay" && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${primaryColor}80, transparent)`,
                      }}
                    />
                  )}
                  {/* Bottom bar */}
                  {frameStyle === "bottom-bar" && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                  {/* Corner badge */}
                  {frameStyle === "corner-badge" && logoUrl && (
                    <div className="absolute top-2 right-2 w-8 h-8">
                      <img src={logoUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {/* Text preview */}
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <span
                      className={`text-lg ${FONT_STYLES.find((f) => f.id === fontStyle)?.preview || "font-bold"}`}
                      style={{ color: textColor }}
                    >
                      {i === 1 ? "SAMPLE TEXT" : i === 2 ? "YOUR BRAND" : "TITLE HERE"}
                    </span>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-muted-foreground text-center">
                Preview shows approximate styling
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandKitPage;
