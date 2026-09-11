import { create } from "zustand";

export type LayerType = "text" | "person" | "object" | "background";

export interface SmartLayer {
  id: string;
  type: LayerType;
  label: string;
  originalContent?: string;
  maskUrl?: string | null;
  /** Bounding box in normalized [0..1] float coordinates. (0,0) = top-left, (1,1) = bottom-right. */
  boundingBox?: { x: number; y: number; w: number; h: number } | null;
  isVisible: boolean;
  isLocked: boolean;
  isEdited: boolean;
  replacementUrl?: string | null;
  // ─── Vector text fields (Phase 1b) ───
  /** New text content to render as vector overlay (replaces originalContent visually) */
  replacementText?: string | null;
  /** URL of the image with original text erased (clean background) */
  erasedBackgroundUrl?: string | null;
  /** Font style hint from detection: "bold_sans" | "bold_serif" | "condensed" | "script" | "impact" | "rounded" | "slab" */
  fontStyle?: string | null;
  /** Detected text fill color as hex string */
  textColor?: string | null;
  /** Whether detected text has a visible stroke/outline */
  hasStroke?: boolean;
  /** Matched font family for vector rendering */
  fontFamily?: string | null;
  /** Calculated font size for vector rendering (in normalized 0..1 of image height) */
  fontSizeNorm?: number | null;
}


interface SmartEditorState {
  sessionId: string | null;
  originalImageUrl: string | null;
  currentImageUrl: string | null;
  layers: SmartLayer[];
  selectedLayerId: string | null;
  isDetecting: boolean;
  isReplacing: boolean;
  editHistory: string[];
  creditsUsed: number;
  isSaving: boolean;
  setState: (partial: Partial<SmartEditorState>) => void;
  reset: () => void;
}

const initialState: Omit<SmartEditorState, "setState" | "reset"> = {
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
};

export const useSmartEditorStore = create<SmartEditorState>((set) => ({
  ...initialState,
  setState: (partial) => set((state) => ({ ...state, ...partial })),
  reset: () => set(() => ({ ...initialState })),
}));
