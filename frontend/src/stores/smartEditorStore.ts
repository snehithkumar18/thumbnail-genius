import { create } from "zustand";

export type LayerType = "text" | "person" | "object" | "background";

export interface SmartLayer {
  id: string;
  type: LayerType;
  label: string;
  originalContent?: string;
  maskUrl?: string | null;
  boundingBox?: { x: number; y: number; w: number; h: number } | null;
  isVisible: boolean;
  isLocked: boolean;
  isEdited: boolean;
  replacementUrl?: string | null;
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
