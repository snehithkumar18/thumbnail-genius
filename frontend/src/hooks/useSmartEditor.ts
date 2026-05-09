import { useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSmartEditorStore, type SmartLayer } from "@/stores/smartEditorStore";

export type Layer = SmartLayer;

const DEFAULT_API_BASE = "http://localhost:3001";
const DETECT_POLL_MS = 1200;
const REPLACE_POLL_MS = 1500;

const buildWorker = () => new Worker(new URL("../workers/smartEditorWorker.ts", import.meta.url), { type: "module" });

const mapLayer = (layer: any): SmartLayer => {
  const bbox = Array.isArray(layer?.bbox)
    ? { x: layer.bbox[0], y: layer.bbox[1], w: layer.bbox[2], h: layer.bbox[3] }
    : layer?.bbox || null;

  return {
    id: layer?.id || crypto.randomUUID(),
    type: layer?.type || "object",
    label: layer?.label || "Layer",
    originalContent: layer?.content || undefined,
    maskUrl: layer?.mask || null,
    boundingBox: bbox,
    isVisible: true,
    isLocked: false,
    isEdited: false,
  };
};

export function useSmartEditor() {
  const state = useSmartEditorStore();
  const workerRef = useRef<Worker | null>(null);

  const apiBase = useMemo(() => {
    return (import.meta as any).env?.VITE_SMART_EDITOR_API_BASE || DEFAULT_API_BASE;
  }, []);

  const updateState = state.setState;

  const initSession = async (imageUrl: string, sourceType: "upload" | "from_thumbnail" | "from_url", thumbnailId?: string) => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) throw new Error("User not authenticated");

      const { data: session, error } = await supabase
        .from("smart_editor_sessions")
        .insert({
          user_id: userData.user.id,
          original_image_url: imageUrl,
          current_image_url: imageUrl,
          source_type: sourceType,
          thumbnail_id: thumbnailId || null,
          layers_data: [],
          edit_history: [],
        })
        .select()
        .single();

      if (error || !session) throw new Error(error?.message || "Failed to initialize session");

      updateState({
        sessionId: session.id,
        originalImageUrl: imageUrl,
        currentImageUrl: imageUrl,
        layers: [],
        selectedLayerId: null,
        isDetecting: false,
        isReplacing: false,
        editHistory: [imageUrl],
        creditsUsed: 0,
        isSaving: false,
      });

      return session.id;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initialize smart editor session";
      toast.error(message);
      console.error(err);
      return null;
    }
  };

  const getWorker = () => {
    if (!workerRef.current) workerRef.current = buildWorker();
    return workerRef.current;
  };

  const computeImageHash = async (imageUrl: string) => {
    const worker = getWorker();
    return new Promise<{ hash: string }>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        worker.removeEventListener("message", onMessage);
        if (event.data?.error) reject(new Error(event.data.error));
        else resolve({ hash: event.data.hash });
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ imageUrl });
    });
  };

  const pollJob = async (queue: "detect" | "replace", jobId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Session expired. Please sign in again");

    const pollMs = queue === "detect" ? DETECT_POLL_MS : REPLACE_POLL_MS;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const resp = await fetch(`${apiBase}/smart-editor/jobs/${queue}/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to check job status (${resp.status}): ${errText || "No details"}`);
      }
      const data = await resp.json();
      if (data.status === "completed") return data.result;
      if (data.status === "failed") {
        const reason = data.failedReason || data.error || data.message || "Unknown failure";
        throw new Error(`${queue === "detect" ? "Detection" : "Edit"} failed: ${reason}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    throw new Error(`${queue === "detect" ? "Detection" : "Edit"} job timed out`);
  };

  const detectLayers = async (overrides?: { sessionId?: string; imageUrl?: string; force?: boolean }) => {
    const sessionId = overrides?.sessionId ?? state.sessionId;
    const imageUrl = overrides?.imageUrl ?? state.currentImageUrl;
    if (!sessionId || !imageUrl) return;

    updateState({ isDetecting: true });

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) throw new Error("Please sign in again to use Smart Editor");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again");

      const { hash } = await computeImageHash(imageUrl);
      const cachedResp = await fetch(`${apiBase}/smart-editor/layers/${hash}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cachedResp.ok && !overrides?.force) {
        const cached = await cachedResp.json();
        const layers = (cached.layers || []).map(mapLayer);
        updateState({ layers });
        toast.success("Layers loaded from cache");
        return;
      }

      const detectResp = await fetch(`${apiBase}/smart-editor/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          image_hash: hash,
          session_id: sessionId,
          user_id: userData.user.id,
        }),
      });

      if (!detectResp.ok) {
        const text = await detectResp.text();
        throw new Error(text || "Detection failed");
      }

      const detectData = await detectResp.json();
      const jobId = detectData.job_id;
      if (!jobId) throw new Error("Detection did not return a job id");

      const result = await pollJob("detect", String(jobId));
      const layers = (result?.layers || []).map(mapLayer);

      if (!layers.length) {
        toast.warning("No layers detected. Try a clearer image.");
        updateState({ layers: [] });
        return;
      }

      updateState({ layers });
      toast.success("Image components detected successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Detection failed";
      toast.error(message);
      console.error(err);
    } finally {
      updateState({ isDetecting: false });
    }
  };

  const createMaskFromBbox = async (imageUrl: string, bbox: { x: number; y: number; w: number; h: number }) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image for mask"));
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("Failed to create mask"));
        else resolve(blob);
      }, "image/png");
    });
  };

  const uploadMask = async (blob: Blob) => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData?.user) throw new Error("Please sign in again");

    const path = `${userData.user.id}/smart-editor/masks/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("smart_editor")
      .upload(path, blob, { contentType: "image/png" });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("smart_editor").getPublicUrl(path);
    return data.publicUrl;
  };

  const replaceLayer = async (layerId: string, editType: string, instruction: string) => {
    if (!state.sessionId || !state.currentImageUrl) return;

    updateState({ isReplacing: true });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Please sign in again");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again");

      const layer = state.layers.find((l) => l.id === layerId);
      if (!layer?.boundingBox) throw new Error("Layer mask unavailable");

      let maskUrl = layer.maskUrl;
      if (!maskUrl) {
        const maskBlob = await createMaskFromBbox(state.currentImageUrl, layer.boundingBox);
        maskUrl = await uploadMask(maskBlob);
      }

      const replaceResp = await fetch(`${apiBase}/smart-editor/replace`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_url: state.currentImageUrl,
          mask_url: maskUrl,
          prompt: instruction,
          edit_type: editType,
          session_id: state.sessionId,
          user_id: userData.user.id,
          layer_id: layerId,
        }),
      });

      if (!replaceResp.ok) {
        const text = await replaceResp.text();
        throw new Error(`Replacement failed (${replaceResp.status}): ${text || "No details"}`);
      }

      const replaceData = await replaceResp.json();
      const jobId = replaceData.job_id;
      if (!jobId) throw new Error("Replacement did not return a job id");

      const result = await pollJob("replace", String(jobId));
      const resultUrl = result?.image_url;
      if (!resultUrl) throw new Error("Replacement returned no image");

      const originalImage = state.currentImageUrl;
      updateState({
        currentImageUrl: resultUrl,
        editHistory: [...state.editHistory, originalImage],
        layers: state.layers.map((l) => (l.id === layerId ? { ...l, isEdited: true, maskUrl } : l)),
        creditsUsed: state.creditsUsed + (editType === "replace_text" ? 5 : editType === "replace_person" ? 7 : 6),
      });
      toast.success("Edit applied successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Replacement failed";
      toast.error(message);
      console.error(err);
    } finally {
      updateState({ isReplacing: false });
    }
  };

  const selectLayer = (layerId: string) => updateState({ selectedLayerId: layerId });

  const undoLastEdit = () => {
    if (state.editHistory.length > 1) {
      const history = [...state.editHistory];
      const previousImage = history.pop();
      updateState({
        currentImageUrl: previousImage || state.originalImageUrl,
        editHistory: history,
      });
      toast.info("Undo successful");
    } else {
      toast.warning("No further edits to undo");
    }
  };

  const restoreToVersion = (index: number) => {
    if (index >= 0 && index < state.editHistory.length) {
      const newHistory = state.editHistory.slice(0, index + 1);
      updateState({
        currentImageUrl: state.editHistory[index],
        editHistory: newHistory,
      });
      toast.success("Restored to previous version");
    }
  };

  const downloadFinal = async () => {
    if (!state.currentImageUrl) return;
    try {
      const resp = await fetch(state.currentImageUrl);
      const blob = await resp.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Thumbly-edit-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error("Download failed");
    }
  };

  return {
    ...state,
    initSession,
    detectLayers,
    selectLayer,
    replaceLayer,
    undoLastEdit,
    restoreToVersion,
    downloadFinal,
  };
}
