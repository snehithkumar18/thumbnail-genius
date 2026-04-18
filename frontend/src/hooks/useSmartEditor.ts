import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectTextInImage } from '@/utils/detectText';
import type { TextLayer } from '@/utils/detectText';
import type { Worker } from 'tesseract.js';
import { toast } from 'sonner';

export interface Layer {
  id: string;
  type: 'text' | 'person' | 'object' | 'background';
  label: string;
  originalContent?: string;
  maskUrl?: string;
  boundingBox?: { x: number; y: number; w: number; h: number };
  thumbnailUrl?: string;
  isVisible: boolean;
  isLocked: boolean;
  isEdited: boolean;
  replacementUrl?: string;
}

type BackendLayer = {
  type: Layer['type'];
  label: string;
  mask_url?: string;
  bbox?: Layer['boundingBox'];
};

interface EditorState {
  sessionId: string | null;
  originalImageUrl: string | null;
  currentImageUrl: string | null;
  layers: Layer[];
  selectedLayerId: string | null;
  isDetecting: boolean;
  isReplacing: boolean;
  editHistory: string[];
  creditsUsed: number;
  isSaving: boolean;
}

export function useSmartEditor() {
  const [state, setState] = useState<EditorState>({
    sessionId: null,
    originalImageUrl: null,
    currentImageUrl: null,
    layers: [],
    selectedLayerId: null,
    isDetecting: false,
    isReplacing: false,
    editHistory: [],
    creditsUsed: 0,
    isSaving: false,
  });

  const updateState = (updates: Partial<EditorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const initSession = async (imageUrl: string, sourceType: 'upload' | 'from_thumbnail' | 'from_url', thumbnailId?: string) => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) throw new Error('User not authenticated');

      const { data: session, error } = await supabase.from('smart_editor_sessions').insert({
        user_id: userData.user.id,
        original_image_url: imageUrl,
        current_image_url: imageUrl,
        source_type: sourceType,
        thumbnail_id: thumbnailId || null,
        layers_data: [],
        edit_history: [],
      }).select().single();

      if (error || !session) throw new Error(error?.message || 'Failed to initialize session');

      setState({
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
      const message = err instanceof Error ? err.message : 'Failed to initialize smart editor session';
      toast.error(message);
      console.error(err);
      return null;
    }
  };

  const detectLayers = async (
    worker?: Worker,
    overrides?: { sessionId?: string; imageUrl?: string; force?: boolean }
  ) => {
    const sessionId = overrides?.sessionId ?? state.sessionId;
    const imageUrl = overrides?.imageUrl ?? state.currentImageUrl;
    if (!sessionId || !imageUrl) return;

    // STEP 10: SAM2 Result Caching
    const canUseLocalCache = !imageUrl.startsWith("data:");
    const cacheKey = canUseLocalCache ? `sam2_${imageUrl}` : null;
    const cachedData = cacheKey ? localStorage.getItem(cacheKey) : null;
    if (cachedData && !overrides?.force) {
        try {
            const { layers, timestamp } = JSON.parse(cachedData);
            const isFresh = Date.now() - timestamp < 24 * 60 * 60 * 1000;
        if (isFresh && Array.isArray(layers) && layers.length > 0) {
                updateState({ layers });
                toast.success('Layers loaded from cache (Instant ✨)');
                return;
            }
        } catch (e: unknown) {
          console.error("Cache parse error", e);
        }
    }

    updateState({ isDetecting: true });
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Please sign in again to use Smart Editor');
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Session expired. Please sign in again');
      }

      const decodeJwtHeader = (token: string) => {
        try {
          const header = token.split('.')[0];
          const base64 = header.replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
          return JSON.parse(atob(padded));
        } catch {
          return null;
        }
      };

      const clearAuthStorage = () => {
        const purge = (storage: Storage) => {
          for (let i = storage.length - 1; i >= 0; i -= 1) {
            const key = storage.key(i);
            if (!key) continue;
            if (key.startsWith('sb-') || key.includes('supabase.auth')) {
              storage.removeItem(key);
            }
          }
        };
        purge(localStorage);
        purge(sessionStorage);
      };

      const tokenHeader = decodeJwtHeader(accessToken);
      if (tokenHeader?.alg && !['HS256', 'ES256'].includes(tokenHeader.alg)) {
        await supabase.auth.signOut();
        clearAuthStorage();
        throw new Error('Invalid auth token. Please refresh and sign in again');
      }
      
      // Parallel execution setup
      const backendPromise = supabase.functions.invoke('smart-editor-detect', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          image_url: imageUrl,
          session_id: sessionId,
          user_id: userData.user.id,
        },
      });

      // Load image for dimensions and Tesseract
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image dimensions'));
            img.src = imageUrl;
      });

      const [imgEl, backendResult] = await Promise.all([imageLoadPromise, backendPromise]);
      const { data: backendLayersData, error } = backendResult;
      
      // Run Tesseract text detection in parallel after getting dimensions
      // Wait, user instructions say: "After EVF-SAM2 and BiRefNet complete (Promise.all done)"
          const textLayersPromise = detectTextInImage(
            imageUrl,
          imgEl.naturalWidth,
          imgEl.naturalHeight,
          worker
        );

      if (error) throw new Error(error.message);

      const rawLayers: BackendLayer[] = Array.isArray(backendLayersData) ? backendLayersData : [];
      const sam2Layers: Layer[] = rawLayers.map((layer) => ({
        ...(layer.bbox && layer.bbox.w <= 1 && layer.bbox.h <= 1
          ? {
              boundingBox: {
                x: layer.bbox.x * imgEl.naturalWidth,
                y: layer.bbox.y * imgEl.naturalHeight,
                w: layer.bbox.w * imgEl.naturalWidth,
                h: layer.bbox.h * imgEl.naturalHeight,
              },
            }
          : { boundingBox: layer.bbox }),
        id: crypto.randomUUID(),
        type: layer.type,
        label: layer.label,
        maskUrl: layer.mask_url,
        isVisible: true,
        isLocked: false,
        isEdited: false,
      }));

      const backgroundLayer = sam2Layers.find(l => l.type === 'background') || null;

      // Merge text layers with SAM2 object layers
        let textLayers: TextLayer[] = [];
      try {
          textLayers = await textLayersPromise;
        } catch (err: unknown) {
          console.error("OCR detection failed:", err);
      }

      const scaleTextBoxIfNormalized = (bbox: TextLayer['boundingBox']) => {
        if (bbox.w <= 1 && bbox.h <= 1) {
          return {
            x: bbox.x * imgEl.naturalWidth,
            y: bbox.y * imgEl.naturalHeight,
            w: bbox.w * imgEl.naturalWidth,
            h: bbox.h * imgEl.naturalHeight,
          };
        }
        return bbox;
      };

      // Format text layers to match State Layer
      const formattedTextLayers: Layer[] = textLayers.map((l) => ({
          id: crypto.randomUUID(),
          type: 'text',
          label: l.label,
          originalContent: l.originalContent,
          boundingBox: scaleTextBoxIfNormalized(l.boundingBox),
          isVisible: true,
          isLocked: false,
          isEdited: false,
      }));

      const hasTextLayers = formattedTextLayers.length > 0;

      // Deduplicate: remove SAM2 "text" detections if Tesseract found better ones
      // Also separate out background to append at the end
      const filteredSam2 = sam2Layers.filter(l => (hasTextLayers ? l.type !== 'text' : true) && l.type !== 'background');
      
      const mergedLayers = [
        ...filteredSam2,
        ...formattedTextLayers,
        ...(backgroundLayer ? [backgroundLayer] : [])
      ];

      // Sort: text layers first (most common edit), then people, objects, background
      const sortedLayers = [
        ...mergedLayers.filter(l => l.type === 'text'),
        ...mergedLayers.filter(l => l.type === 'person'),
        ...mergedLayers.filter(l => l.type === 'object'),
        ...mergedLayers.filter(l => l.type === 'background'),
      ];

      if (!sortedLayers.length) {
        throw new Error('No layers detected. Try Scan again or use a clearer image.');
      }

      updateState({ layers: sortedLayers });

      // Cache for 24 hours
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify({
            layers: sortedLayers,
            timestamp: Date.now()
        }));
      }

      toast.success('Image components detected successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Detection failed';
      toast.error(message);
      console.error(err);
    } finally {
      updateState({ isDetecting: false });
    }
  };

  const selectLayer = (layerId: string) => updateState({ selectedLayerId: layerId });

  const replaceLayer = async (layerId: string, editType: string, instruction: string, replacementImageUrl?: string) => {
    if (!state.sessionId || !state.currentImageUrl) return;

    updateState({ isReplacing: true });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('smart-editor-replace', {
        body: {
          session_id: state.sessionId,
          layer_id: layerId, // layerId in local context, should map to DB ideally but using local for flexibility here
          edit_type: editType,
          current_image_url: state.currentImageUrl,
          instruction,
          replacement_image_url: replacementImageUrl,
          user_id: userData.user?.id
        }
      });

      if (error || !data?.result_image_url) throw new Error(error?.message || 'Replacement failed');

      const originalImage = state.currentImageUrl;
      
      updateState({
        currentImageUrl: data.result_image_url,
        editHistory: [...state.editHistory, originalImage],
        layers: state.layers.map(l => l.id === layerId ? { ...l, isEdited: true } : l),
        creditsUsed: state.creditsUsed + (editType === 'replace_text' ? 5 : (editType === 'replace_person' ? 7 : 6))
      });
      toast.success('Edit applied successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Replacement failed';
      toast.error(message);
      console.error(err);
    } finally {
      updateState({ isReplacing: false });
    }
  };

  const undoLastEdit = () => {
    if (state.editHistory.length > 1) {
      const history = [...state.editHistory];
      const previousImage = history.pop();
      updateState({
        currentImageUrl: previousImage || state.originalImageUrl,
        editHistory: history,
      });
      toast.info('Undo successful');
    } else {
      toast.warning('No further edits to undo');
    }
  };

  const restoreToVersion = (index: number) => {
    if (index >= 0 && index < state.editHistory.length) {
       const newHistory = state.editHistory.slice(0, index + 1);
       updateState({
           currentImageUrl: state.editHistory[index],
           editHistory: newHistory,
       });
       toast.success('Restored to previous version');
    }
  };

  const upscaleTo4K = async () => {
    if (!state.sessionId || !state.currentImageUrl) return;
    try {
        const { data: userData } = await supabase.auth.getUser();
        toast.loading('Upscaling image to 4K...', { id: 'upscale' });
        
        const { data, error } = await supabase.functions.invoke('smart-editor-upscale', {
            body: { session_id: state.sessionId, image_url: state.currentImageUrl, user_id: userData.user?.id }
        });

        toast.dismiss('upscale');
        if (error || !data?.url) throw new Error(error?.message || 'Upscaling failed');

        updateState({ currentImageUrl: data.url });
        toast.success('Successfully upscaled to 4K');
    } catch (err: unknown) {
      toast.dismiss('upscale');
      const message = err instanceof Error ? err.message : 'Upscaling failed';
      toast.error(message);
    }
  };

  const downloadFinal = () => {
    if (!state.currentImageUrl) return;
    const link = document.createElement('a');
    link.href = state.currentImageUrl;
    link.download = `thumbai-edit-${Date.now()}.png`;
    link.target = "_blank"; // If it's across origin, sometimes it requires opening in a new tab or fetching as blob
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveToMyThumbnails = async () => {
    if (!state.sessionId || !state.currentImageUrl) return;
    updateState({ isSaving: true });
    try {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.functions.invoke('smart-editor-save-session', {
            body: { session_id: state.sessionId, final_image_url: state.currentImageUrl, user_id: userData.user?.id }
        });
        
        if (error) throw new Error(error.message);
        toast.success('Session saved successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Saving failed';
      toast.error(message);
    } finally {
        updateState({ isSaving: false });
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
    upscaleTo4K,
    downloadFinal,
    saveToMyThumbnails
  };
}
