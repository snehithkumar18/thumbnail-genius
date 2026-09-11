import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartEditor, Layer } from '@/hooks/useSmartEditor';
import { Sparkles, UploadCloud, Layers, Eye, EyeOff, Lock, LockOpen, CheckCircle2, RotateCcw, Download, Copy, CopyX, Search, Image as ImageIcon, Type, Sparkle, User, LayoutGrid, X, ArrowLeft, HelpCircle, Youtube, FolderOpen, ChevronUp, ChevronDown, Twitter, Plus, Trash2, Palette, Wand2, SlidersHorizontal, Bold, MousePointerClick, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useCredits, useThumbnails } from '@/hooks/useSupabaseData';
import { EditorCanvas, TextOverlay } from '@/components/SmartEditor/EditorCanvas';
import { TEXT_PRESET_COLORS } from '@/utils/editorConstants';
import { HistoryStrip } from '@/components/SmartEditor/HistoryStrip';
import { CreditsBadge } from '@/components/CreditsBadge';
import { FeatureTour } from '@/components/SmartEditor/FeatureTour';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hapticFeedback } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { loadThumbnailFonts } from '@/utils/fontMatcher';

const BACKGROUND_STYLES = [
  { id: 'city_night', label: '🌃 City Night', desc: 'Dark city skyline at night with lights' },
  { id: 'sunset', label: '🌅 Sunset', desc: 'Warm orange gradient sunset' },
  { id: 'corporate', label: '💼 Corporate', desc: 'Clean modern office workspace' },
  { id: 'nature', label: '🌿 Nature', desc: 'Lush green forest outdoors' },
  { id: 'dramatic', label: '🔥 Dramatic', desc: 'Dark moody atmosphere with smoke' },
  { id: 'electric', label: '⚡ Electric', desc: 'Neon cyberpunk street' },
  { id: 'luxury', label: '💰 Luxury', desc: 'Premium gold and marble background' },
  { id: 'studio', label: '🏠 Studio', desc: 'Plain colored studio backdrop' },
  { id: 'ocean', label: '🌊 Ocean', desc: 'Calm beach and water scene' },
  { id: 'space', label: '🚀 Space', desc: 'Vast cosmos with stars' },
  { id: 'gradient', label: '🎭 Gradient', desc: 'Smooth purple to pink gradient' },
  { id: 'black', label: '⬛ Pure Black', desc: 'Solid black background' },
];

const AVAILABLE_FONTS = [
  { id: 'Impact, Arial Black, sans-serif', label: 'Impact (Classic)' },
  { id: 'Luckiest Guy, cursive', label: 'Luckiest Guy (MrBeast)' },
  { id: 'Bebas Neue, sans-serif', label: 'Bebas Neue (Viral)' },
  { id: 'Anton, sans-serif', label: 'Anton (Heavy Bold)' },
  { id: 'Bangers, cursive', label: 'Bangers (Comic)' },
  { id: 'Montserrat, sans-serif', label: 'Montserrat Black' },
  { id: 'Lilita One, sans-serif', label: 'Lilita One (Rounded)' },
  { id: 'Oswald, sans-serif', label: 'Oswald (Condensed)' },
  { id: 'Rubik Mono One, sans-serif', label: 'Rubik Mono (Wide)' },
  { id: 'Titan One, sans-serif', label: 'Titan One (Fat)' },
  { id: 'Permanent Marker, cursive', label: 'Permanent Marker' },
  { id: 'Alfa Slab One, serif', label: 'Alfa Slab One' },
  { id: 'Russo One, sans-serif', label: 'Russo One' },
  { id: 'Graduate, serif', label: 'Graduate' },
];

export default function SmartEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editor = useSmartEditor();
  const { plan, canUseSmartEditor } = usePlanAccess();
  const { data: creditsData } = useCredits();
  const { data: myThumbs = [] } = useThumbnails();

  const [inputUrl, setInputUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'describe' | 'pick'>('pick');
  const [replaceInstruction, setReplaceInstruction] = useState('');
  const [selectedBgStyle, setSelectedBgStyle] = useState('');
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [showThumbModal, setShowThumbModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [thumbSearch, setThumbSearch] = useState('');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'layers' | 'edit'>('layers');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Canva-Style Interactive Text Overlays State
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const canvasStageRef = useRef<any>(null);

  // Load Google thumbnail fonts on mount
  useEffect(() => {
    loadThumbnailFonts();
  }, []);

  // Parse text from URL params on mount
  useEffect(() => {
    const urlText = searchParams.get('text');
    if (urlText && textOverlays.length === 0) {
      const newId = crypto.randomUUID();
      setTextOverlays([{
        id: newId,
        text: urlText,
        x: 640, // centered horizontally on 1280 canvas
        y: 540, // lower third of 720 canvas
        fontSize: 72,
        colorPreset: 'yellow',
        fontFamily: 'Impact, Arial Black, sans-serif',
      }]);
      setSelectedTextId(newId);
    }
  }, [searchParams]);

  // High-Resolution 2K/4K Canvas Export
  const downloadWithTextOverlays = () => {
    const stage = canvasStageRef.current;
    if (stage) {
      // Export at pixelRatio 2.5 for crystal-clear broadcast 1920x1080/2K quality
      const dataURL = stage.toDataURL({ pixelRatio: 2.5 });
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `Thumbly-CanvaEdit-${Date.now()}.png`;
      a.click();
      toast.success('High-resolution thumbnail downloaded!');
    } else {
      editor.downloadFinal();
    }
  };

  const handleAddTextOverlay = (presetText = 'NEW TEXT', presetFont = 'Impact, Arial Black, sans-serif') => {
    const newId = crypto.randomUUID();
    const newOverlay: TextOverlay = {
      id: newId,
      text: presetText,
      x: 340 + Math.random() * 200,
      y: 260 + Math.random() * 150,
      fontSize: 72,
      colorPreset: 'yellow',
      fontFamily: presetFont,
      isBold: true,
      shadowBlur: 8,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
    };
    setTextOverlays(prev => [...prev, newOverlay]);
    setSelectedTextId(newId);
    toast.success('Text element added to canvas');
  };

  const handleDuplicateTextOverlay = (id: string) => {
    const target = textOverlays.find(t => t.id === id);
    if (!target) return;
    const newId = crypto.randomUUID();
    const duplicate: TextOverlay = {
      ...target,
      id: newId,
      x: Math.min(1100, target.x + 30),
      y: Math.min(650, target.y + 30),
    };
    setTextOverlays(prev => [...prev, duplicate]);
    setSelectedTextId(newId);
    toast.success('Text element duplicated');
  };

  const handleUpdateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handleTextOverlayMove = (id: string, x: number, y: number) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
  };

  // One-Click Canva "Grab All Text" (Promotes OCR text layers into live vector canvas text)
  const handleGrabAllText = () => {
    const textLayers = editor.layers.filter(l => l.type === 'text');
    if (textLayers.length === 0) {
      toast.info('No text detected in this thumbnail to grab.');
      return;
    }

    const newOverlays: TextOverlay[] = [];
    textLayers.forEach(l => {
      const detectedText = l.originalContent || l.label || 'TEXT';
      const bbox = l.boundingBox || { x: 0.2, y: 0.3, w: 0.4, h: 0.1 };
      
      // Convert normalized [0..1] bbox to 1280x720 canvas coordinates
      const canvasX = Math.round((bbox.x <= 1.0 ? bbox.x * 1280 : bbox.x));
      const canvasY = Math.round((bbox.y <= 1.0 ? bbox.y * 720 : bbox.y));
      const canvasH = (bbox.h <= 1.0 ? bbox.h * 720 : bbox.h);
      const approxFontSize = Math.max(24, Math.min(130, Math.round(canvasH * 0.85)));

      newOverlays.push({
        id: crypto.randomUUID(),
        text: detectedText,
        x: canvasX,
        y: canvasY,
        fontSize: approxFontSize,
        colorPreset: 'custom',
        textColor: l.textColor || '#FFFFFF',
        fontFamily: l.fontFamily || 'Impact, Arial Black, sans-serif',
        isBold: true,
        strokeColor: l.hasStroke ? '#000000' : undefined,
        strokeWidth: l.hasStroke ? Math.max(2, approxFontSize * 0.08) : 0,
        shadowBlur: 8,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
      });
    });

    setTextOverlays(prev => [...prev, ...newOverlays]);
    if (newOverlays.length > 0) {
      setSelectedTextId(newOverlays[0].id);
    }
    toast.success(`✨ Grabbed ${newOverlays.length} text element(s) into editable canvas text!`);
  };

  const [personUploadUrl, setPersonUploadUrl] = useState<string | null>(null);
  const [personUploadPreview, setPersonUploadPreview] = useState<string | null>(null);
  const [isUploadingPerson, setIsUploadingPerson] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [overlayCoords, setOverlayCoords] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [personSwapMode, setPersonSwapMode] = useState<'full_person' | 'face_only'>('full_person');

  // Auto-switch person swap mode based on layer type
  useEffect(() => {
    const selected = editor.layers.find(l => l.id === editor.selectedLayerId);
    if (selected?.type === 'face') {
      setPersonSwapMode('face_only');
    } else if (selected?.type === 'person') {
      setPersonSwapMode('full_person');
    }
  }, [editor.selectedLayerId, editor.layers]);

  // Initialize/Reset overlay coordinates while preserving original aspect ratio of uploaded photo
  useEffect(() => {
    const selected = editor.layers.find(l => l.id === editor.selectedLayerId);
    if (selected && (selected.type === 'person' || selected.type === 'face') && personUploadPreview && selected.boundingBox) {
      const img = new window.Image();
      img.onload = () => {
        const bbox = selected.boundingBox!;
        // Bounding box coords in 0..1280, 0..720 space
        const bboxX = bbox.x <= 1 ? bbox.x * 1280 : bbox.x;
        const bboxY = bbox.y <= 1 ? bbox.y * 720 : bbox.y;
        const bboxW = bbox.w <= 1 ? bbox.w * 1280 : bbox.w;
        const bboxH = bbox.h <= 1 ? bbox.h * 720 : bbox.h;

        const imgAspect = img.width / Math.max(1, img.height);
        // Height matches original person height or at least 85% of canvas height (612px)
        const targetH = Math.max(bboxH, 500);
        const targetW = Math.round(targetH * imgAspect);

        // Align bottom-center of uploaded person cutout with bottom-center of target bounding box
        const centerX = bboxX + bboxW / 2;
        const bottomY = bboxY + bboxH;

        let targetX = Math.round(centerX - targetW / 2);
        let targetY = Math.round(bottomY - targetH);

        // Ensure targetY aligns with bottom of canvas if person is grounded
        if (bottomY >= 680) {
          targetY = 720 - targetH;
        }

        setOverlayCoords({
          x: targetX,
          y: targetY,
          w: targetW,
          h: targetH
        });
      };
      img.src = personUploadPreview;
    } else {
      setOverlayCoords(null);
    }
  }, [editor.selectedLayerId, personUploadPreview, personUploadUrl, editor.layers]);

  useEffect(() => {
    setPersonUploadUrl(null);
    if (personUploadPreview) {
      URL.revokeObjectURL(personUploadPreview);
      setPersonUploadPreview(null);
    }
    const selected = editor.layers.find(l => l.id === editor.selectedLayerId);
    if (selected?.type === 'person' || selected?.type === 'object' || selected?.type === 'face') {
      setActiveTab('upload');
      setReplaceInstruction('');
    } else if (selected?.type === 'background') {
      setActiveTab('pick');
      setReplaceInstruction('');
    }
  }, [editor.selectedLayerId]);
  
  const currentCredits = creditsData?.credits_remaining ?? 0;
  const filteredMyThumbs = myThumbs.filter(t => t.prompt?.toLowerCase().includes(thumbSearch.toLowerCase()) || !thumbSearch);
  const bypassCredits = (import.meta as any).env?.VITE_BYPASS_CREDITS === "true";
  const isLockedPlan = !canUseSmartEditor && !bypassCredits;


    const uploadSmartEditorImage = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return null;
        }

        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            toast.error('Please sign in again');
            return null;
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${userData.user.id}/smart-editor/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from('thumbnails')
            .upload(path, file, { contentType: file.type });

        if (uploadError) {
            toast.error(uploadError.message || 'Failed to upload image');
            return null;
        }

        try {
            const { data: signedData, error: signedError } = await supabase.storage
                .from('thumbnails')
                .createSignedUrl(path, 60 * 60);
            if (!signedError && signedData?.signedUrl) {
                return signedData.signedUrl;
            }
        } catch {
            // Fall back to public URL below.
        }

        const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
        return data.publicUrl || null;
    };

    const handlePersonPhotoFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }
        setIsUploadingPerson(true);
        try {
            const objectUrl = URL.createObjectURL(file);
            setPersonUploadPreview(objectUrl);
            
            const url = await uploadSmartEditorImage(file);
            if (url) {
                setPersonUploadUrl(url);
                toast.success("Photo uploaded successfully");
            } else {
                setPersonUploadPreview(null);
                URL.revokeObjectURL(objectUrl);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload photo");
            setPersonUploadPreview(null);
        } finally {
            setIsUploadingPerson(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            await handlePersonPhotoFile(file);
        }
    };

    const extractYoutubeThumbnail = (rawUrl: string) => {
        try {
            const url = new URL(rawUrl);
            const host = url.hostname.replace('www.', '');
            let videoId = '';

            if (host === 'youtu.be') {
                videoId = url.pathname.replace('/', '');
            } else if (host === 'youtube.com' || host === 'm.youtube.com') {
                if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
                if (url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/')[2] || '';
            }

            if (!videoId) return null;
            return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
        } catch {
            return null;
        }
    };

    const normalizeInputImageUrl = async (rawUrl: string) => {
        const youtubeThumb = extractYoutubeThumbnail(rawUrl);
        if (!youtubeThumb) return rawUrl;

        try {
            const head = await fetch(youtubeThumb, { method: 'HEAD' });
            if (head.ok) return youtubeThumb;
        } catch {
            // Ignore and fall back.
        }

        const fallback = youtubeThumb.replace('/maxresdefault.jpg', '/hqdefault.jpg');
        return fallback;
    };

    const runDetectWithWorker = async (
        sessionId?: string,
        imageUrl?: string,
        force?: boolean
    ) => {
        await editor.detectLayers({
            sessionId,
            imageUrl,
            force,
        });
    };

  const [showAllBoxes, setShowAllBoxes] = useState(false);
  const prevIsDetectingRef = useRef(false);

  // When AI detection finishes scanning, light up ALL element boxes first!
  useEffect(() => {
    if (prevIsDetectingRef.current && !editor.isDetecting && editor.layers.length > 0) {
      setShowAllBoxes(true);
      editor.selectLayer(null as any);
    }
    prevIsDetectingRef.current = editor.isDetecting;
  }, [editor.isDetecting, editor.layers]);

  const handleStartFresh = () => {
    editor.reset();
    setTextOverlays([]);
    setSelectedTextId(null);
    setInputUrl('');
    setPersonUploadUrl(null);
    if (personUploadPreview) {
      URL.revokeObjectURL(personUploadPreview);
      setPersonUploadPreview(null);
    }
    setShowAllBoxes(false);
    navigate('/smart-editor', { replace: true });
    toast.success('Started a fresh editing session!');
  };

  const handleLayerClick = (layerId: string) => {
    setShowAllBoxes(false);
    if (!layerId) {
      editor.selectLayer(null as any);
      setSelectedTextId(null);
    } else {
      editor.selectLayer(layerId);
      setSelectedTextId(null);
    }
  };

  // Load from URL params on mount or reset when tab is refreshed
  useEffect(() => {
    const thumbId = searchParams.get('thumbnail_id');
    const imgUrl = searchParams.get('image_url');
    if (thumbId && !editor.sessionId) {
      if (imgUrl) {
        editor.initSession(imgUrl, 'from_thumbnail', thumbId).then((sessionId) => {
          if (!sessionId) return;
          runDetectWithWorker(sessionId, imgUrl);
          navigate('/smart-editor', { replace: true });
        });
      }
    } else if (imgUrl && !editor.sessionId) {
      editor.initSession(imgUrl, 'from_url').then((sessionId) => {
        if (!sessionId) return;
        runDetectWithWorker(sessionId, imgUrl);
        navigate('/smart-editor', { replace: true });
      });
    } else if (!imgUrl && !thumbId) {
      // Clear previous in-memory session when browser tab is refreshed
      editor.reset();
      setTextOverlays([]);
      setSelectedTextId(null);
      setShowAllBoxes(false);
    }
  }, []);

  const handleUrlLoad = async () => {
    if (!inputUrl) return;
    setIsLoadingUrl(true);
    try {
        const normalizedUrl = await normalizeInputImageUrl(inputUrl.trim());
        const sessionId = await editor.initSession(normalizedUrl, 'from_url');
        if (!sessionId) return;
        await runDetectWithWorker(sessionId, normalizedUrl);
    } finally {
        setIsLoadingUrl(false);
    }
  };

  const [textFontFamily, setTextFontFamily] = useState('Impact, Arial Black, sans-serif');
  const [textFillColor, setTextFillColor] = useState('#FFFFFF');
  const [textHasStroke, setTextHasStroke] = useState(true);

  const selectedLayer = editor.layers.find(l => l.id === editor.selectedLayerId);

  useEffect(() => {
    if (selectedLayer && selectedLayer.type === 'text') {
      setReplaceInstruction(selectedLayer.replacementText || selectedLayer.originalContent || '');
      setTextFillColor(selectedLayer.textColor || '#FFFFFF');
      if (selectedLayer.fontFamily) setTextFontFamily(selectedLayer.fontFamily);
      if (selectedLayer.hasStroke !== undefined) setTextHasStroke(selectedLayer.hasStroke);
    }
  }, [selectedLayer?.id, selectedLayer?.textColor, selectedLayer?.fontFamily, selectedLayer?.replacementText]);

    return (
        <div className="flex flex-col min-h-screen-d overflow-x-hidden bg-background">
      
      {/* -------------------- STEP 7: FEATURE TOUR -------------------- */}
      <FeatureTour />

      {/* -------------------- STEP 4: HEADER -------------------- */}
      <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 shrink-0 z-50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-muted h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-[13px] sm:text-sm font-bold font-sans text-[#0F0A1E] flex items-center gap-2 truncate">
                       <Sparkles className="h-4 w-4 text-[#8B47FF]" /> ✨ Smart Thumbnail Editor
                  </h1>
                  {editor.sessionId && editor.currentImageUrl && (
                      <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border">
                          <div className="w-6 h-[14px] rounded bg-muted overflow-hidden border border-border">
                              <img src={editor.currentImageUrl} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
                              Editing: Session {editor.sessionId.slice(0, 8)}
                          </span>
                      </div>
                  )}
              </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
              {/* Refresh / Start Fresh Button */}
              {editor.sessionId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleStartFresh}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:bg-muted border-border"
                  title="Start a new thumbnail session"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#8B47FF]" />
                  <span className="hidden sm:inline">Start Fresh</span>
                </Button>
              )}

              {/* STEP 8: CREDIT DEDUCTION CHIP */}
              <CreditsBadge balance={currentCredits} />

              <div className="h-6 w-px bg-border hidden sm:block" />
              
              <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <HelpCircle className="h-4 w-4" />
                        <span className="text-xs">Help</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                          <DialogTitle>Quick Editor Tour</DialogTitle>
                          <DialogDescription className="sr-only">Steps to get started with the Smart Editor.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                          {[
                            { step: 1, text: "Upload or select any thumbnail (even competitors!)", icon: <UploadCloud className="h-5 w-5" /> },
                            { step: 2, text: "AI detects all layers (text, people, objects) automatically", icon: <Layers className="h-5 w-5" /> },
                            { step: 3, text: "Click any element in the canvas to replace it with AI", icon: <Sparkle className="h-5 w-5" /> },
                            { step: 4, text: "Download your winning thumbnail in HD or 4K", icon: <Download className="h-5 w-5" /> }
                          ].map(item => (
                              <div key={item.step} className="flex gap-4 items-start">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">{item.step}</div>
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                          {item.icon}
                                          <span className="font-semibold text-sm">Step {item.step}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{item.text}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <Button onClick={() => setShowHelpModal(false)} className="bg-[#8B47FF] hover:bg-[#7236d6]">Got it!</Button>
                  </DialogContent>
              </Dialog>
          </div>
      </header>

    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
      
        {/* -------------------- LEFT COLUMN: LAYERS (Desktop) -------------------- */}
        <div id="tour-layers" className="hidden lg:flex w-[240px] border-r border-border bg-card flex-col shrink-0 h-full min-h-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0F0A1E]" />
              <h2 className="font-semibold text-[14px] text-[#0F0A1E] font-sans">🎨 Layers</h2>
            </div>
            <span className="bg-[#8B47FF]/10 text-[#8B47FF] text-xs px-2 py-0.5 rounded-full font-medium">
              {editor.layers.length} layers
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {editor.isDetecting ? (
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#8B47FF] animate-pulse">Scanning for layers...</span>
                 </div>
                 <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                    <motion.div 
                      initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-full bg-[#8B47FF] w-1/2 rounded-full"
                    />
                 </div>
                 {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 border border-border rounded-lg animate-pulse">
                       <div className="h-8 w-8 bg-muted rounded" />
                       <div className="h-4 bg-muted w-1/2 rounded" />
                    </div>
                 ))}
               </div>
            ) : editor.layers.length > 0 ? (
               <AnimatePresence>
                  {editor.layers.map(layer => (
                    <motion.div
                      key={layer.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${editor.selectedLayerId === layer.id ? 'border-l-4 border-l-[#8B47FF] border-y-border border-r-border bg-[#F8F7FF]' : 'border-transparent hover:border-border hover:shadow-sm'}`}
                      onClick={() => { hapticFeedback(5); editor.selectLayer(layer.id); }}
                      onMouseEnter={() => setHoveredLayerId(layer.id)}
                      onMouseLeave={() => setHoveredLayerId(null)}
                    >
                      <div className="flex items-center justify-center h-8 w-8 bg-background rounded border border-border">
                         {layer.type === 'text' && <Type className="h-4 w-4 text-muted-foreground" />}
                         {layer.type === 'person' && <User className="h-4 w-4 text-muted-foreground" />}
                         {layer.type === 'object' && <CopyX className="h-4 w-4 text-muted-foreground" />}
                         {layer.type === 'background' && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium truncate">{layer.label}</p>
                         <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] uppercase text-muted-foreground bg-muted px-1 rounded">{layer.type}</span>
                            {layer.isEdited && <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded flex items-center gap-0.5"><CheckCircle2 className="h-2 w-2" /> Edited</span>}
                         </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                         <button className="p-1 hover:bg-muted rounded text-muted-foreground"><Eye className="h-3 w-3" /></button>
                         <button className="p-1 hover:bg-muted rounded text-muted-foreground"><LockOpen className="h-3 w-3" /></button>
                      </div>
                    </motion.div>
                  ))}
               </AnimatePresence>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-50 space-y-2">
                    <Layers className="h-8 w-8 mb-2" />
                    <p className="text-xs">No layers detected yet.</p>
                                        {editor.currentImageUrl && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => runDetectWithWorker(editor.sessionId || undefined, editor.currentImageUrl || undefined, true)}
                                            >
                                                Scan Again
                                            </Button>
                                        )}
                </div>
            )}
          </div>

          {editor.layers.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Credits used this session:</span>
                      <span className="font-medium text-foreground">{editor.creditsUsed}</span>
                  </p>
              </div>
          )}
        </div>

        {/* -------------------- CENTER COLUMN: CANVAS -------------------- */}
        <div id="tour-canvas" className="flex-1 flex flex-col relative bg-muted/10 h-full min-w-0 pb-16 lg:pb-0 min-h-0">
          
          {/* Clean, Professional Top Action Bar */}
          {editor.currentImageUrl && (
            <div className="h-12 lg:h-14 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between px-3 lg:px-4 shrink-0 transition-all z-10 gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-muted/80 text-[11px] font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[#8B47FF]" />
                  {editor.layers.length > 0 ? `${editor.layers.length} Elements Detected` : 'Smart Editor'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-[#8B47FF]/30 text-[#8B47FF] hover:bg-[#8B47FF]/10 gap-1.5"
                  onClick={handleGrabAllText}
                  title="Make all detected thumbnail text editable like Canva"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Grab Text
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5"
                  onClick={() => handleAddTextOverlay()}
                  title="Add new text overlay"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Text
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => runDetectWithWorker(editor.sessionId || undefined, editor.currentImageUrl || undefined, true)}
                  disabled={editor.isDetecting || !editor.currentImageUrl}
                  title="Rescan layers"
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.undoLastEdit()}
                  disabled={editor.editHistory.length <= 1}
                  title="Undo last edit"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold bg-[#8B47FF] hover:bg-[#7236d6] text-white shadow-sm gap-1.5"
                  onClick={downloadWithTextOverlays}
                  title="Download High-Resolution Thumbnail"
                >
                  <Download className="h-3.5 w-3.5" /> Download HD
                </Button>
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="flex-1 relative flex items-center justify-center px-3 sm:px-4 lg:px-6 py-3 lg:py-4 min-h-0">
            {editor.isDetecting && (
              <div className="absolute inset-0 z-30 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 border-4 border-[#8B47FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-[#8B47FF]">Detecting elements...</p>
              </div>
            )}
              
            {editor.currentImageUrl ? (
              <>
                {/* Locking UI for non-premium users */}
                {isLockedPlan && (
                  <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 pointer-events-auto">
                    <Lock className="h-12 w-12 text-[#8B47FF] mb-4" />
                    <h3 className="font-bold text-lg mb-2">This feature requires Basic plan or higher</h3>
                    <p className="text-sm text-muted-foreground mb-4">Upgrade to unlock full Smart Editor access — from $10/month</p>
                    <Button className="bg-[#8B47FF] hover:bg-[#7236d6]" onClick={() => navigate('/pricing')}>Upgrade Now</Button>
                  </div>
                )}

                <EditorCanvas 
                  currentImageUrl={editor.currentImageUrl}
                  originalImageUrl={editor.originalImageUrl || editor.currentImageUrl}
                  layers={editor.layers}
                  selectedLayerId={editor.selectedLayerId}
                  onLayerClick={handleLayerClick}
                  isReplacing={editor.isReplacing}
                  isDetecting={editor.isDetecting}
                  showAllBoxes={showAllBoxes}
                  textOverlays={textOverlays}
                  selectedTextId={selectedTextId}
                  personOverlay={
                    personUploadPreview && overlayCoords
                      ? {
                          previewUrl: personUploadPreview,
                          coords: overlayCoords,
                          onMove: (newCoords) => setOverlayCoords(newCoords),
                        }
                      : null
                  }
                  onSelectText={setSelectedTextId}
                  onTextOverlayMove={handleTextOverlayMove}
                  onUpdateTextOverlay={handleUpdateTextOverlay}
                  onDeleteTextOverlay={handleDeleteTextOverlay}
                  onUpdateLayerText={async (layerId, text) => {
                    setReplaceInstruction(text);
                    const targetLayer = editor.layers.find(l => l.id === layerId);
                    await editor.replaceTextVector(layerId, text, {
                      fontFamily: targetLayer?.fontFamily || textFontFamily,
                      textColor: targetLayer?.textColor || textFillColor,
                      hasStroke: targetLayer?.hasStroke !== undefined ? targetLayer.hasStroke : textHasStroke,
                    });
                  }}
                  stageRef={canvasStageRef}
                />
              </>
            ) : (

                  /* STEP 5: EMPTY STATE */
                  <div className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-700">
                      <div className="relative w-64 h-40 mb-8 flex items-center justify-center">
                          <div className="absolute w-full h-full bg-muted border-2 border-dashed border-border rounded-xl" />
                          <motion.div 
                             animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
                             transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                             className="absolute -top-4 -right-4 w-32 h-20 bg-background border border-border rounded-lg shadow-xl"
                          />
                          <motion.div 
                             animate={{ y: [0, 10, 0], opacity: [0.2, 0.5, 0.2], scale: [1, 0.9, 1] }}
                             transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                             className="absolute -bottom-6 -left-4 w-24 h-16 bg-background border border-border rounded-lg shadow-lg"
                          />
                          <UploadCloud id="tour-upload" className="h-16 w-16 text-[#8B47FF] opacity-40 relative z-10" />
                      </div>

                      <h2 className="text-2xl font-bold text-[#0F0A1E] mb-2 font-sans">Upload Any Thumbnail to Get Started</h2>
                      <p className="text-sm text-muted-foreground max-w-md mb-10">
                          AI will automatically detect every element — text, people, objects, and background.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
                          <label className="cursor-pointer group">
                               <input type="file" className="hidden" onChange={async (e) => {
                                   const file = e.target.files?.[0];
                                   if (!file) return;
                                   const uploadedUrl = await uploadSmartEditorImage(file);
                                   if (!uploadedUrl) return;
                                   const sessionId = await editor.initSession(uploadedUrl, 'upload');
                                   if (!sessionId) return;
                                   await runDetectWithWorker(sessionId, uploadedUrl);
                               }} />
                                         <div className="p-6 bg-card border border-border rounded-2xl hover:border-[#8B47FF] hover:shadow-xl hover:shadow-[#8B47FF]/5 transition-all text-center h-full flex flex-col items-center">
                                  <UploadCloud className="h-8 w-8 text-[#8B47FF] mb-3 group-hover:scale-110 transition-transform" />
                                  <h3 className="font-semibold text-sm mb-1">Upload Image</h3>
                                  <p className="text-[10px] text-muted-foreground">Select local file</p>
                               </div>
                          </label>

                          <Dialog>
                              <DialogTrigger asChild>
                                <div className="p-6 bg-card border border-border rounded-2xl hover:border-[#8B47FF] hover:shadow-xl hover:shadow-[#8B47FF]/5 transition-all text-center h-full flex flex-col items-center cursor-pointer group">
                                  <Youtube className="h-8 w-8 text-[#8B47FF] mb-3 group-hover:scale-110 transition-transform" />
                                  <h3 className="font-semibold text-sm mb-1">Paste URL</h3>
                                  <p className="text-[10px] text-muted-foreground">YouTube link</p>
                                </div>
                              </DialogTrigger>
                              <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Load from YouTube</DialogTitle>
                                                                        <DialogDescription className="sr-only">Paste a YouTube URL to load a thumbnail.</DialogDescription>
                                                                    </DialogHeader>
                                  <div className="space-y-4 py-4">
                                      <Input placeholder="https://youtube.com/watch?v=..." value={inputUrl} onChange={e => setInputUrl(e.target.value)} />
                                      <Button onClick={handleUrlLoad} disabled={!inputUrl || isLoadingUrl} className="w-full bg-[#8B47FF] hover:bg-[#7236d6]">
                                          {isLoadingUrl ? (
                                              <><div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading...</>
                                          ) : "Load Thumbnail"}
                                      </Button>
                                  </div>
                              </DialogContent>
                          </Dialog>

                          <div onClick={() => setShowThumbModal(true)} className="p-6 bg-card border border-border rounded-2xl hover:border-[#8B47FF] hover:shadow-xl hover:shadow-[#8B47FF]/5 transition-all text-center h-full flex flex-col items-center cursor-pointer group">
                              <ImageIcon className="h-8 w-8 text-[#8B47FF] mb-3 group-hover:scale-110 transition-transform" />
                              <h3 className="font-semibold text-sm mb-1">My Thumbnails</h3>
                              <p className="text-[10px] text-muted-foreground">Previously generated</p>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* Bottom Edit History (Desktop only) */}
          {editor.editHistory.length > 0 && (
            <div className="hidden lg:flex h-28 bg-card border-t border-border shrink-0 flex-col p-0 z-10 transition-all">
                <HistoryStrip 
                    history={editor.editHistory}
                    currentIndex={editor.editHistory.length - 1} // latest
                    onRestore={editor.restoreToVersion}
                />
            </div>
          )}
        </div>

        {/* -------------------- RIGHT COLUMN: EDIT CONTROLS (Desktop) -------------------- */}
        <div 
          id="tour-controls"
          className="hidden lg:flex w-[320px] border-l border-border bg-card flex-col shrink-0 h-full relative min-h-0"
        >
          <div className="flex-1 overflow-y-auto w-full p-4">
              {!selectedLayer ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-70">
                     <Sparkle className="h-16 w-16 text-[#8B47FF] mb-4" />
                     <h3 className="font-semibold text-lg text-foreground">Click any element to edit</h3>
                     <p className="text-sm text-muted-foreground mt-2">Or select a layer from the panel on the left.</p>
                  </div>
              ) : (
                  <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                          <h3 className="font-bold flex items-center gap-2">
                              {selectedLayer.type === 'text' && "📝 Edit Text"}
                              {(selectedLayer.type === 'person' || selectedLayer.type === 'face') && "👤 Replace Person / Face"}
                              {selectedLayer.type === 'background' && "🌆 Replace Background"}
                              {selectedLayer.type === 'object' && `🎭 Replace Object: ${selectedLayer.label}`}
                          </h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => editor.selectLayer(null)}>
                              <X className="h-4 w-4" />
                          </Button>
                      </div>

                      {/* Content Based on Type */}
                      <div className="flex-1 flex flex-col gap-5">
                         {selectedLayer.type === 'text' && (
                             <>
                               <div>
                                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Current Text</label>
                                  <div className="text-2xl font-bold bg-muted/50 p-4 rounded border border-border flex items-center justify-center text-center">
                                      {selectedLayer.originalContent?.toUpperCase() || "I MADE $1M"}
                                  </div>
                               </div>
                               <div>
                                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block flex items-center justify-between">
                                     <span>New Text</span>
                                     <button 
                                       onClick={() => setReplaceInstruction(`Translate this to Hindi: "${selectedLayer.originalContent}"`)}
                                       className="text-primary normal-case text-[10px] hover:underline"
                                     >
                                       Try translating: Hindi
                                     </button>
                                  </label>
                                  <Textarea 
                                     className="text-lg font-bold min-h-[70px] border-[#8B47FF]/50 focus-visible:ring-[#8B47FF]" 
                                     placeholder="Type your new text here..."
                                     value={replaceInstruction}
                                     onChange={e => setReplaceInstruction(e.target.value)}
                                   />
                                </div>

                                {/* Canva-Style Typography Controls */}
                                <div className="space-y-3 pt-2 border-t border-border/50">
                                  <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Font Family</label>
                                    <Select 
                                      value={textFontFamily} 
                                      onValueChange={(val) => {
                                        setTextFontFamily(val);
                                        if (selectedLayer.isEdited) {
                                          editor.updateLayer(selectedLayer.id, { fontFamily: val });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Font" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AVAILABLE_FONTS.map(f => (
                                          <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                                            {f.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Text Color</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {['#FFD600', '#FFFFFF', '#00E5FF', '#FF6D00', '#FF4081', '#00E676', '#FF3333', '#8B47FF'].map(c => (
                                        <button
                                          key={c}
                                          type="button"
                                          className={`w-7 h-7 rounded-full border-2 transition-transform ${textFillColor === c ? 'scale-110 border-white ring-2 ring-primary shadow-md' : 'border-transparent hover:scale-105'}`}
                                          style={{ backgroundColor: c }}
                                          onClick={() => {
                                            setTextFillColor(c);
                                            if (selectedLayer.isEdited) {
                                              editor.updateLayer(selectedLayer.id, { textColor: c });
                                            }
                                          }}
                                        />
                                      ))}
                                      <input 
                                        type="color" 
                                        value={textFillColor} 
                                        onChange={e => {
                                          setTextFillColor(e.target.value);
                                          if (selectedLayer.isEdited) {
                                            editor.updateLayer(selectedLayer.id, { textColor: e.target.value });
                                          }
                                        }}
                                        className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent" 
                                        title="Custom Color"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">High-Contrast Outline</span>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const nextVal = !textHasStroke;
                                        setTextHasStroke(nextVal);
                                        if (selectedLayer.isEdited) {
                                          editor.updateLayer(selectedLayer.id, { hasStroke: nextVal });
                                        }
                                      }}
                                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${textHasStroke ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                                    >
                                      {textHasStroke ? '✓ Outline On' : 'Outline Off'}
                                    </button>
                                  </div>
                                </div>

                                <div className="bg-primary/5 p-3 rounded text-xs text-primary font-medium flex items-start gap-2">
                                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div>Our AI will mathematically extract the exact font family, weight, kerning, color, rotation and shadow drops to perfectly match the original aesthetic.</div>
                               </div>
                             </>
                         )}

                          {(selectedLayer.type === 'person' || selectedLayer.type === 'face') && (
                             <>
                               <div className="flex bg-muted rounded p-1 mb-2">
                                  <button className={`flex-1 py-1.5 text-xs font-medium rounded ${activeTab === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('upload')}>📸 Upload Photo</button>
                                  <button className={`flex-1 py-1.5 text-xs font-medium rounded ${activeTab === 'describe' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('describe')}>✍️ Describe</button>
                               </div>

                               {activeTab === 'upload' && (
                                   <div className="space-y-4">
                                       <div className="flex bg-muted/70 p-1 rounded-lg gap-1 border border-border/60">
                                          <button
                                              type="button"
                                              onClick={() => setPersonSwapMode('full_person')}
                                              className={`flex-1 py-1.5 px-2 rounded-md font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${personSwapMode === 'full_person' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                          >
                                              👤 Whole Person
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => setPersonSwapMode('face_only')}
                                              className={`flex-1 py-1.5 px-2 rounded-md font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${personSwapMode === 'face_only' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                          >
                                              🎭 Face Only
                                          </button>
                                       </div>
                                       <p className="text-[11px] text-muted-foreground">
                                          {personSwapMode === 'full_person'
                                              ? '✨ Replaces complete person with your photo in pose. Background is erased and lighting matched.'
                                              : '✨ Keeps thumbnail person body & pose, swapping only the face with InsightFace.'}
                                       </p>
                                      <input 
                                          type="file" 
                                          accept="image/*" 
                                          id="person-photo-upload" 
                                          className="hidden" 
                                          onChange={e => {
                                              const file = e.target.files?.[0];
                                              if (file) handlePersonPhotoFile(file);
                                          }}
                                      />
                                      {!personUploadPreview ? (
                                          <label 
                                              htmlFor="person-photo-upload"
                                              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${isDragging ? 'border-[#8B47FF] bg-[#8B47FF]/5' : 'border-border hover:bg-muted/50'} bg-background`}
                                              onDragOver={handleDragOver}
                                              onDragLeave={handleDragLeave}
                                              onDrop={handleDrop}
                                          >
                                              {isUploadingPerson ? (
                                                  <div className="flex flex-col items-center justify-center">
                                                      <RotateCcw className="h-8 w-8 text-primary animate-spin mb-3" />
                                                      <p className="text-sm font-medium">Uploading photo...</p>
                                                  </div>
                                              ) : (
                                                  <>
                                                      <UploadCloud className="h-12 w-12 text-primary/40 mb-3" />
                                                      <p className="text-sm font-medium">Click or drag photo here</p>
                                                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Face should be clearly visible</p>
                                                  </>
                                              )}
                                          </label>
                                      ) : (
                                          <div className="border border-border rounded-xl p-4 bg-muted/30 relative flex flex-col items-center justify-center group space-y-3">
                                               <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border bg-black/5">
                                                   <img src={personUploadPreview} className="w-full h-full object-contain" alt="Upload preview" />
                                                   {isUploadingPerson && (
                                                       <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                                           <RotateCcw className="h-8 w-8 text-white animate-spin" />
                                                       </div>
                                                   )}
                                               </div>

                                               {/* Fine-tune Position & Size Controls */}
                                               {overlayCoords && (
                                                   <div className="w-full border-t border-border pt-3 space-y-2">
                                                       <div className="flex items-center justify-between">
                                                           <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                                               🎯 Position & Size Controls
                                                           </span>
                                                           <Button
                                                               variant="ghost"
                                                               size="sm"
                                                               className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                                                               onClick={() => {
                                                                   const selected = editor.layers.find(l => l.id === editor.selectedLayerId);
                                                                   if (selected?.boundingBox && personUploadPreview) {
                                                                       const bbox = selected.boundingBox;
                                                                       const bx = bbox.x <= 1 ? bbox.x * 1280 : bbox.x;
                                                                       const by = bbox.y <= 1 ? bbox.y * 720 : bbox.y;
                                                                       const bw = bbox.w <= 1 ? bbox.w * 1280 : bbox.w;
                                                                       const bh = bbox.h <= 1 ? bbox.h * 720 : bbox.h;

                                                                       const img = new window.Image();
                                                                       img.onload = () => {
                                                                           const imgAspect = img.width / Math.max(1, img.height);
                                                                           const targetH = Math.max(bh, 500);
                                                                           const targetW = Math.round(targetH * imgAspect);
                                                                           const centerX = bx + bw / 2;
                                                                           const bottomY = by + bh;
                                                                           setOverlayCoords({
                                                                               x: Math.round(centerX - targetW / 2),
                                                                               y: Math.round(bottomY >= 680 ? 720 - targetH : bottomY - targetH),
                                                                               w: targetW,
                                                                               h: targetH,
                                                                           });
                                                                       };
                                                                       img.src = personUploadPreview;
                                                                   }
                                                               }}
                                                           >
                                                               Auto-Center
                                                           </Button>
                                                       </div>

                                                       <p className="text-[10px] text-muted-foreground">
                                                           💡 Drag/resize photo on canvas or adjust below:
                                                       </p>

                                                       {/* Horizontal Position (X) */}
                                                       <div className="space-y-1">
                                                           <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                                               <span>Horizontal Position (X)</span>
                                                               <span>{overlayCoords.x}px</span>
                                                           </div>
                                                           <input
                                                               type="range"
                                                               min={0}
                                                               max={1280}
                                                               value={overlayCoords.x}
                                                               onChange={(e) => setOverlayCoords({ ...overlayCoords, x: parseInt(e.target.value) })}
                                                               className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#8B47FF]"
                                                           />
                                                       </div>

                                                       {/* Vertical Position (Y) */}
                                                       <div className="space-y-1">
                                                           <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                                               <span>Vertical Position (Y)</span>
                                                               <span>{overlayCoords.y}px</span>
                                                           </div>
                                                           <input
                                                               type="range"
                                                               min={0}
                                                               max={720}
                                                               value={overlayCoords.y}
                                                               onChange={(e) => setOverlayCoords({ ...overlayCoords, y: parseInt(e.target.value) })}
                                                               className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#8B47FF]"
                                                           />
                                                       </div>

                                                       {/* Height / Scale */}
                                                       <div className="space-y-1">
                                                           <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                                               <span>Height / Scale</span>
                                                               <span>{overlayCoords.h}px</span>
                                                           </div>
                                                           <input
                                                               type="range"
                                                               min={100}
                                                               max={720}
                                                               value={overlayCoords.h}
                                                               onChange={(e) => {
                                                                   const newH = parseInt(e.target.value);
                                                                   const ratio = overlayCoords.w / Math.max(1, overlayCoords.h);
                                                                   const newW = Math.round(newH * ratio);
                                                                   setOverlayCoords({ ...overlayCoords, w: newW, h: newH });
                                                               }}
                                                               className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#8B47FF]"
                                                           />
                                                       </div>
                                                   </div>
                                               )}

                                               <div className="flex w-full justify-between items-center mt-3 border-t border-border/50 pt-2">
                                                   <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[150px]">
                                                       {personUploadUrl ? "✓ Uploaded to Cloud" : "Uploading..."}
                                                   </span>
                                                   <Button 
                                                       variant="ghost" 
                                                       size="sm" 
                                                       className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                                       onClick={() => {
                                                           setPersonUploadUrl(null);
                                                           if (personUploadPreview) {
                                                               URL.revokeObjectURL(personUploadPreview);
                                                               setPersonUploadPreview(null);
                                                           }
                                                           setOverlayCoords(null);
                                                       }}
                                                   >
                                                       <X className="h-3.5 w-3.5 mr-1" /> Remove
                                                   </Button>
                                               </div>
                                           </div>
                                      )}
                                  </div>
                               )}

                               {activeTab === 'describe' && (
                                  <div>
                                      <Textarea 
                                          className="text-sm min-h-[100px]" 
                                          placeholder="Describe the person you want..."
                                          value={replaceInstruction}
                                          onChange={e => setReplaceInstruction(e.target.value)}
                                      />
                                  </div>
                               )}
                             </>
                         )}

                         {selectedLayer.type === 'background' && (
                             <>
                               <div className="flex bg-muted rounded p-1 mb-2">
                                  <button className={`flex-1 py-1 text-[11px] font-medium rounded ${activeTab === 'pick' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('pick')}>🎨 Pick Style</button>
                                  <button className={`flex-1 py-1 text-[11px] font-medium rounded ${activeTab === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('upload')}>📸 Upload</button>
                                  <button className={`flex-1 py-1 text-[11px] font-medium rounded ${activeTab === 'describe' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('describe')}>✍️ Describe</button>
                               </div>

                               {activeTab === 'pick' && (
                                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                      {BACKGROUND_STYLES.map(style => (
                                          <div 
                                              key={style.id} 
                                              className={`h-16 rounded border-2 cursor-pointer flex items-end p-1.5 text-xs font-medium text-white shadow-sm relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-800 ${selectedBgStyle === style.id ? 'border-[#8B47FF] ring-2 ring-[#8B47FF]/20' : 'border-transparent'}`}
                                              onClick={() => { setSelectedBgStyle(style.id); setReplaceInstruction(style.desc); }}
                                          >
                                              <div className="absolute inset-0 bg-black/20" />
                                              <span className="relative z-10 truncate w-full shadow-sm">{style.label}</span>
                                          </div>
                                      ))}
                                  </div>
                               )}
                               
                               {activeTab === 'describe' && (
                                   <Textarea className="text-sm min-h-[100px]" placeholder="Mumbai city at night..." value={replaceInstruction} onChange={e => setReplaceInstruction(e.target.value)} />
                               )}
                             </>
                         )}

                         {selectedLayer.type === 'object' && (
                             <Textarea className="text-sm min-h-[100px]" placeholder="What should replace this? e.g. iPhone 15 Pro..." value={replaceInstruction} onChange={e => setReplaceInstruction(e.target.value)} />
                         )}
                      </div>

                      {/* Action Button Segment */}
                      <div className="mt-auto pt-6">
                          <Button 
                             className="w-full h-12 text-sm font-semibold shadow-md bg-[#8B47FF] hover:bg-[#7236d6] transition-all"
                             disabled={editor.isReplacing || isUploadingPerson || (!replaceInstruction && activeTab !== 'upload') || ((selectedLayer.type === 'person' || selectedLayer.type === 'face') && activeTab === 'upload' && !personUploadUrl)}
                             onClick={async () => {
                                 hapticFeedback(30);
                                 const typeMap: Record<string, string> = {
                                     'text': 'replace_text',
                                     'person': 'replace_person',
                                     'face': 'replace_person',
                                     'background': 'replace_background',
                                     'object': 'replace_object'
                                 };
                                 
                                 if ((selectedLayer.type === 'person' || selectedLayer.type === 'face') && activeTab === 'upload') {
                                      if (!personUploadUrl) {
                                          toast.error("Please upload a photo first");
                                          return;
                                      }
                                      const finalEditType = (selectedLayer.type === 'face' || personSwapMode === 'face_only') ? 'face_swap' : 'replace_person';
                                      const promptDesc = finalEditType === 'face_swap' ? 'Swap face with uploaded photo' : 'Replace person with uploaded photo';
                                      await editor.replaceLayer(selectedLayer.id, finalEditType, promptDesc, personUploadUrl, overlayCoords);
                                      setPersonUploadUrl(null);
                                      if (personUploadPreview) {
                                          URL.revokeObjectURL(personUploadPreview);
                                          setPersonUploadPreview(null);
                                      }
                                      setOverlayCoords(null);
                                  } else if (selectedLayer.type === 'text') {
                                       await editor.replaceTextVector(selectedLayer.id, replaceInstruction, {
                                           fontFamily: textFontFamily,
                                           textColor: textFillColor,
                                           hasStroke: textHasStroke,
                                       });
                                  } else {
                                      await editor.replaceLayer(selectedLayer.id, typeMap[selectedLayer.type] || 'replace_object', replaceInstruction);
                                  }
                             }}
                          >
                             {editor.isReplacing ? (
                                 <><RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Replacing...</>
                             ) : (
                                 <>✨ {selectedLayer.type === 'text' ? 'Update Text (Vector Crisp)' : (selectedLayer.type === 'person' || selectedLayer.type === 'face') ? (personSwapMode === 'face_only' ? 'Swap Face (Photorealistic)' : 'Replace Whole Person (Cutout & Blend)') : `Replace ${selectedLayer.type.charAt(0).toUpperCase() + selectedLayer.type.slice(1)}`} — {selectedLayer.type === 'text' ? '5' : ((selectedLayer.type === 'person' || selectedLayer.type === 'face') ? '7' : '6')} credits</>
                             )}
                          </Button>
                          
                          {currentCredits < 5 && (
                             <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-600 font-medium">
                                 Low credits! Top up to continue.
                             </div>
                          )}

                          <p className="text-center text-[10px] text-muted-foreground mt-2 inline-flex items-center justify-center w-full gap-1">
                             You have {currentCredits} credits remaining
                          </p>
                      </div>
                  </div>
              )}
          </div>
        </div>

                {/* -------------------- MOBILE DRAWER -------------------- */}
        {editor.sessionId && (
            <Drawer open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <div className="fixed bottom-0 inset-x-0 lg:hidden p-3 bg-background border-t border-border z-30 flex items-center justify-between safe-bottom">
                    <DrawerTrigger asChild>
                        <Button variant="hero" size="sm" className="flex-1">
                            <Sparkles className="h-3.5 w-3.5 mr-2" />
                            {selectedLayer ? `Edit ${selectedLayer.label}` : 'Open Tools'}
                        </Button>
                    </DrawerTrigger>
                    <div className="flex items-center gap-2 ml-3">
                         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => editor.undoLastEdit()} disabled={editor.editHistory.length <= 1}>
                            <RotateCcw className="h-4 w-4" />
                         </Button>
                         <Button variant="outline" size="icon" className="h-9 w-9" onClick={downloadWithTextOverlays}>
                            <Download className="h-4 w-4" />
                         </Button>
                    </div>
                </div>

                <DrawerContent className="max-h-[85vh] p-0">
                    <div className="mx-auto w-12 h-1.5 rounded-full bg-muted my-3" />
                    <Tabs defaultValue={selectedLayer ? 'edit' : 'layers'} className="w-full flex flex-col h-full overflow-hidden">
                        <TabsList className="grid grid-cols-2 mx-4 gap-2 bg-muted p-1 rounded-xl">
                            <TabsTrigger value="layers" className="text-xs font-bold">📚 Layers</TabsTrigger>
                            <TabsTrigger value="edit" className="text-xs font-bold">✨ Edit</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="layers" className="p-4 flex-1 overflow-y-auto max-h-[60vh] space-y-2">
                             {editor.layers.map(layer => (
                                 <div 
                                     key={layer.id} 
                                     className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${editor.selectedLayerId === layer.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                                     onClick={() => { editor.selectLayer(layer.id); }}
                                 >
                                     <div className="flex items-center gap-3">
                                         <div className="p-2 rounded bg-muted">
                                             {layer.type === 'text' && <Type className="h-4 w-4 text-primary" />}
                                             {layer.type === 'person' && <User className="h-4 w-4 text-primary" />}
                                             {layer.type === 'object' && <Sparkle className="h-4 w-4 text-primary" />}
                                             {layer.type === 'background' && <LayoutGrid className="h-4 w-4 text-primary" />}
                                         </div>
                                         <div>
                                             <p className="text-sm font-semibold">{layer.label}</p>
                                             <p className="text-[10px] text-muted-foreground capitalize">{layer.type}</p>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                        </TabsContent>

                        <TabsContent value="edit" className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
                             {selectedLayer && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{selectedLayer.type} Element</span>
                                    </div>
                                    {selectedLayer.type === 'text' && (
                                        <Textarea 
                                            className="text-sm font-bold min-h-[80px]" 
                                            placeholder="New text..." 
                                            value={replaceInstruction} 
                                            onChange={e => setReplaceInstruction(e.target.value)} 
                                        />
                                    )}
                                    {(selectedLayer.type === 'person' || selectedLayer.type === 'face' || selectedLayer.type === 'object') && (
                                        <>
                                            <div className="flex bg-muted rounded p-1 mb-2">
                                                <button className={`flex-1 py-1 text-xs font-medium rounded ${activeTab === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('upload')}>📸 Photo</button>
                                                <button className={`flex-1 py-1 text-xs font-medium rounded ${activeTab === 'describe' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('describe')}>✍️ Describe</button>
                                            </div>
                                            {activeTab === 'upload' && (
                                                <div className="space-y-2">
                                                    <div className="flex bg-muted/70 p-1 rounded gap-1 border text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPersonSwapMode('full_person')}
                                                            className={`flex-1 py-1 text-[11px] rounded font-medium ${personSwapMode === 'full_person' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                                                        >
                                                            👤 Whole Person
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPersonSwapMode('face_only')}
                                                            className={`flex-1 py-1 text-[11px] rounded font-medium ${personSwapMode === 'face_only' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                                                        >
                                                            🎭 Face Only
                                                        </button>
                                                    </div>
                                                    <input type="file" accept="image/*" id="mobile-person-photo-upload" className="hidden" onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handlePersonPhotoFile(file);
                                                    }} />
                                                    {!personUploadPreview ? (
                                                        <label htmlFor="mobile-person-photo-upload" className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-background">
                                                            <UploadCloud className="h-6 w-6 text-primary mb-1" />
                                                            <p className="text-xs font-medium">Upload photo</p>
                                                        </label>
                                                    ) : (
                                                        <div className="relative rounded overflow-hidden aspect-video border bg-black/5">
                                                            <img src={personUploadPreview} className="w-full h-full object-contain" alt="Preview" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {activeTab === 'describe' && (
                                                <Textarea className="text-xs min-h-[85px]" placeholder="Describe person..." value={replaceInstruction} onChange={e => setReplaceInstruction(e.target.value)} />
                                            )}
                                        </>
                                    )}
                                    {selectedLayer.type === 'background' && (
                                        <>
                                            <div className="flex bg-muted rounded p-1 mb-2">
                                                <button className={`flex-1 py-1 text-[11px] font-medium rounded ${activeTab === 'pick' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('pick')}>🎨 Style</button>
                                                <button className={`flex-1 py-1 text-[11px] font-medium rounded ${activeTab === 'describe' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('describe')}>✍️ Describe</button>
                                            </div>
                                            {activeTab === 'pick' && (
                                                <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto">
                                                    {BACKGROUND_STYLES.map(style => (
                                                        <div key={style.id} className={`p-1.5 rounded border text-[10px] font-medium bg-muted cursor-pointer ${selectedBgStyle === style.id ? 'border-primary bg-primary/10' : ''}`} onClick={() => { setSelectedBgStyle(style.id); setReplaceInstruction(style.desc); }}>
                                                            {style.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {activeTab === 'describe' && (
                                                <Textarea className="text-xs min-h-[85px]" placeholder="Describe background..." value={replaceInstruction} onChange={e => setReplaceInstruction(e.target.value)} />
                                            )}
                                        </>
                                    )}
                                    {selectedLayer.type === 'object' && (
                                        <Textarea className="text-sm min-h-[80px]" placeholder="What should replace this? e.g. iPhone 15 Pro..." value={replaceInstruction} onChange={e => setReplaceInstruction(e.target.value)} />
                                    )}
                                    <Button 
                                        className="w-full h-12 bg-primary mt-2" 
                                        onClick={async () => {
                                            const typeMap: Record<string, string> = {
                                                text: 'replace_text',
                                                person: 'replace_person',
                                                face: 'face_swap',
                                                background: 'replace_background',
                                                object: 'replace_object'
                                            };
                                            
                                            if ((selectedLayer.type === 'person' || selectedLayer.type === 'face') && activeTab === 'upload') {
                                                if (!personUploadUrl) {
                                                    toast.error("Please upload a photo first");
                                                    return;
                                                }
                                                const finalEditType = (selectedLayer.type === 'face' || personSwapMode === 'face_only') ? 'face_swap' : 'replace_person';
                                                const promptDesc = finalEditType === 'face_swap' ? 'Swap face with uploaded photo' : 'Replace person with uploaded photo';
                                                await editor.replaceLayer(selectedLayer.id, finalEditType, promptDesc, personUploadUrl, overlayCoords);
                                                setPersonUploadUrl(null);
                                                if (personUploadPreview) {
                                                    URL.revokeObjectURL(personUploadPreview);
                                                    setPersonUploadPreview(null);
                                                }
                                                setOverlayCoords(null);
                                            } else if (selectedLayer.type === 'text') {
                                                await editor.replaceTextVector(selectedLayer.id, replaceInstruction, {
                                                    fontFamily: textFontFamily,
                                                    textColor: textFillColor,
                                                    hasStroke: textHasStroke,
                                                });
                                            } else {
                                                await editor.replaceLayer(selectedLayer.id, typeMap[selectedLayer.type] || 'replace_object', replaceInstruction);
                                            }
                                            setIsMobileSheetOpen(false);
                                        }} 
                                        disabled={editor.isReplacing || isUploadingPerson || (!replaceInstruction && activeTab !== 'upload') || ((selectedLayer.type === 'person' || selectedLayer.type === 'face') && activeTab === 'upload' && !personUploadUrl)}
                                    >
                                        {editor.isReplacing ? 'Replacing...' : `${selectedLayer.type === 'text' ? 'Update Text' : (selectedLayer.type === 'person' || selectedLayer.type === 'face') ? (personSwapMode === 'face_only' ? 'Swap Face' : 'Replace Whole Person') : 'Replace'} (${selectedLayer.type === 'text' ? 5 : ((selectedLayer.type === 'person' || selectedLayer.type === 'face') ? 7 : 6)} Credits)`}
                                    </Button>
                                </div>
                             )}
                        </TabsContent>
                    </Tabs>
                </DrawerContent>
            </Drawer>
        )}
      </div>

      {/* -------------------- STEP 5: MY THUMBNAILS MODAL -------------------- */}
      <Dialog open={showThumbModal} onOpenChange={setShowThumbModal}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-4 sm:p-6 border-b border-border">
                  <div className="flex items-center justify-between gap-4">
                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" /> My Thumbnails
                      </DialogTitle>
                                            <Input 
                                                placeholder="Search..." 
                                                value={thumbSearch}
                                                onChange={e => setThumbSearch(e.target.value)}
                                                className="w-full sm:w-64 h-9" 
                                            />
                  </div>
                  <DialogDescription className="sr-only">Select a thumbnail to load into the editor.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {filteredMyThumbs.map(thumb => (
                          <div 
                            key={thumb.id} 
                            onClick={() => {
                                editor.initSession(thumb.image_url!, 'from_thumbnail', thumb.id).then(() => editor.detectLayers());
                                setShowThumbModal(false);
                            }}
                            className="group relative aspect-video rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition-all"
                          >
                               <img src={thumb.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                               <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <div className="bg-white text-primary text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">Select →</div>
                               </div>
                          </div>
                      ))}
                  </div>
              </div>
          </DialogContent>
      </Dialog>

    </div>
  );
}
