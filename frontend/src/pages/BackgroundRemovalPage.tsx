import { useEffect, useRef, useState } from "react";
import { preload, removeBackground } from "@imgly/background-removal";
import { ImageIcon, Download, Wand2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const BackgroundRemovalPage = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ key: string; current: number; total: number } | null>(null);
  const preloadedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [sourceUrl, resultUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const handleRemoveBackground = async () => {
    if (!sourceFile) return;
    setProcessing(true);
    setDownloadInfo(null);
    try {
      const config = {
        device: "cpu" as const,
        output: { format: "image/png" as const },
        progress: (key: string, current: number, total: number) => {
          setDownloadInfo({ key, current, total });
        },
      };

      if (!preloadedRef.current) {
        await preload(config);
        preloadedRef.current = true;
      }

      const result = await removeBackground(sourceFile, config);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(result));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Background removal failed";
      toast.error(message);
    } finally {
      setProcessing(false);
      setDownloadInfo(null);
    }
  };

  const handleClear = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setSourceFile(null);
    setSourceUrl(null);
    setResultUrl(null);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `background-removed-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">🧼 Background Removal</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Remove the background in your browser. No API keys required.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Upload an image</Label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/80"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative rounded-xl border border-border bg-muted/30 p-4 min-h-[240px] flex items-center justify-center overflow-hidden">
              {sourceUrl ? (
                <img src={sourceUrl} alt="Original" className="max-h-[320px] w-full object-contain" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  <p className="text-sm">Original image preview</p>
                </div>
              )}
              {processing && sourceUrl && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[shimmer_1.4s_infinite]" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-3 text-primary">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Removing background...</p>
                      {downloadInfo && downloadInfo.total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Downloading {downloadInfo.key}: {Math.round((downloadInfo.current / downloadInfo.total) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative rounded-xl border border-border bg-muted/30 p-4 min-h-[240px] flex items-center justify-center overflow-hidden">
              {resultUrl ? (
                <img src={resultUrl} alt="Background removed" className="max-h-[320px] w-full object-contain" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  <p className="text-sm">Result preview</p>
                </div>
              )}
              {processing && !resultUrl && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="relative z-10 flex flex-col items-center gap-3 text-primary">
                    <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <p className="text-sm font-medium">Generating result...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleRemoveBackground}
              disabled={!sourceFile || processing}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {processing ? "Removing..." : "Remove Background"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!resultUrl}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={!sourceFile && !resultUrl}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Large images may take longer. Results are generated locally in your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundRemovalPage;
