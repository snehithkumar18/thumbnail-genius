import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartEditor, Layer } from '@/hooks/useSmartEditor';
import { Sparkles, UploadCloud, Layers, Eye, EyeOff, Lock, LockOpen, CheckCircle2, RotateCcw, Download, CopyX, Search, Image as ImageIcon, Type, Sparkle, User, LayoutGrid, X, ArrowLeft, HelpCircle, Youtube, FolderOpen, ChevronUp, ChevronDown, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useCredits, useThumbnails } from '@/hooks/useSupabaseData';
import { EditorCanvas } from '@/components/SmartEditor/EditorCanvas';
import { HistoryStrip } from '@/components/SmartEditor/HistoryStrip';
import { CreditsBadge } from '@/components/CreditsBadge';
import { FeatureTour } from '@/components/SmartEditor/FeatureTour';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hapticFeedback } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

export default function SmartEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editor = useSmartEditor();
  const { plan } = usePlanAccess();
  const { data: creditsData } = useCredits();
  const { data: myThumbs = [] } = useThumbnails();

  const [inputUrl, setInputUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'describe' | 'pick'>('pick');
  const [replaceInstruction, setReplaceInstruction] = useState('');
  const [selectedBgStyle, setSelectedBgStyle] = useState('');
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'edited'>('edited');
  const [showThumbModal, setShowThumbModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [thumbSearch, setThumbSearch] = useState('');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'layers' | 'edit'>('layers');
  
  const currentCredits = creditsData?.credits_remaining ?? 0;
  const filteredMyThumbs = myThumbs.filter(t => t.prompt?.toLowerCase().includes(thumbSearch.toLowerCase()) || !thumbSearch);

    const isLockedPlan = false;


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

    // Load from URL params on mount
  useEffect(() => {
    const thumbId = searchParams.get('thumbnail_id');
    const imgUrl = searchParams.get('image_url');
    if (thumbId && !editor.sessionId) {
      if (imgUrl) {
                      editor.initSession(imgUrl, 'from_thumbnail', thumbId).then((sessionId) => {
                          if (!sessionId) return;
                          runDetectWithWorker(sessionId, imgUrl);
                      });
      }
    } else if (imgUrl && !editor.sessionId) {
                  editor.initSession(imgUrl, 'from_url').then((sessionId) => {
                      if (!sessionId) return;
                      runDetectWithWorker(sessionId, imgUrl);
                  });
    }
  }, [searchParams]);

  const handleUrlLoad = async () => {
    if (!inputUrl) return;
        const normalizedUrl = await normalizeInputImageUrl(inputUrl.trim());
        const sessionId = await editor.initSession(normalizedUrl, 'from_url');
        if (!sessionId) return;
        await runDetectWithWorker(sessionId, normalizedUrl);
  };

  const selectedLayer = editor.layers.find(l => l.id === editor.selectedLayerId);

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
          
          {/* Top Controls */}
          {editor.currentImageUrl && (
            <div className="h-12 lg:h-14 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between px-3 lg:px-4 shrink-0 transition-all z-10 gap-2">
                <div className="flex items-center bg-muted p-0.5 rounded-full text-[10px] lg:text-xs">
                    <button 
                        className={`px-2 lg:px-3 py-1 rounded-full transition-all ${viewMode === 'original' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setViewMode('original')}
                    >
                        Original
                    </button>
                    <button 
                        className={`px-2 lg:px-3 py-1 rounded-full transition-all ${viewMode === 'edited' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setViewMode('edited')}
                    >
                        Edited
                    </button>
                </div>

                <div className="flex items-center gap-1 lg:gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => runDetectWithWorker(editor.sessionId || undefined, editor.currentImageUrl || undefined, true)}
                        disabled={editor.isDetecting || !editor.currentImageUrl}
                        title="Scan layers"
                    >
                        <Search className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.undoLastEdit()} disabled={editor.editHistory.length <= 1}>
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.downloadFinal()}>
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
          )}

                    {/* Canvas Area */}
                    <div className="flex-1 relative flex items-center justify-center px-3 sm:px-4 lg:px-6 py-3 lg:py-4 min-h-0">
                            {editor.isDetecting && (
                                <div className="absolute inset-0 z-30 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                    <div className="h-10 w-10 border-4 border-[#8B47FF] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-medium text-[#8B47FF]">Scanning for layers...</p>
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
                          onLayerClick={editor.selectLayer}
                          viewMode={viewMode}
                          isReplacing={editor.isReplacing}
                          isDetecting={editor.isDetecting}
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
                                      <Button onClick={handleUrlLoad} disabled={!inputUrl} className="w-full bg-[#8B47FF] hover:bg-[#7236d6]">Load Thumbnail</Button>
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
                              {selectedLayer.type === 'person' && "👤 Replace Person"}
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
                                     className="text-lg font-bold min-h-[100px] border-[#8B47FF]/50 focus-visible:ring-[#8B47FF]" 
                                     placeholder="Type your new text here..."
                                     value={replaceInstruction || selectedLayer.originalContent || ''}
                                     onChange={e => setReplaceInstruction(e.target.value)}
                                  />
                               </div>
                               <div className="bg-primary/5 p-3 rounded text-xs text-primary font-medium flex items-start gap-2">
                                  <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div>Our AI will mathematically extract the exact font family, weight, kerning, color, rotation and shadow drops to perfectly match the original aesthetic.</div>
                               </div>
                             </>
                         )}

                         {selectedLayer.type === 'person' && (
                             <>
                               <div className="flex bg-muted rounded p-1 mb-2">
                                  <button className={`flex-1 py-1.5 text-xs font-medium rounded ${activeTab === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('upload')}>📸 Upload Photo</button>
                                  <button className={`flex-1 py-1.5 text-xs font-medium rounded ${activeTab === 'describe' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setActiveTab('describe')}>✍️ Describe</button>
                               </div>

                               {activeTab === 'upload' && (
                                  <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition bg-background">
                                      <User className="h-12 w-12 text-primary/20 mb-3" />
                                      <p className="text-sm font-medium">Drop your photo here</p>
                                      <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Face should be clearly visible</p>
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
                             disabled={editor.isReplacing || (!replaceInstruction && activeTab !== 'upload')}
                             onClick={() => {
                                 hapticFeedback(30);
                                 const typeMap: Record<string, string> = {
                                     'text': 'replace_text',
                                     'person': 'replace_person',
                                     'background': 'replace_background',
                                     'object': 'replace_object'
                                 };
                                 let finalInstruction = replaceInstruction;
                                 if (selectedLayer.type === 'text') {
                                     finalInstruction = `Change the text '${selectedLayer.originalContent}' to '${replaceInstruction}', keep exactly same style.`;
                                 }
                                 editor.replaceLayer(selectedLayer.id, typeMap[selectedLayer.type] || 'replace_object', finalInstruction);
                             }}
                          >
                             {editor.isReplacing ? (
                                 <><RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Replacing...</>
                             ) : (
                                 <>✨ Replace {selectedLayer.type.charAt(0).toUpperCase() + selectedLayer.type.slice(1)} — {selectedLayer.type === 'text' ? '5' : (selectedLayer.type === 'person' ? '7' : '6')} credits</>
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
                         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => editor.downloadFinal()}>
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
                        
                        <TabsContent value="layers" className="flex-1 overflow-y-auto p-4 focus-visible:ring-0">
                             <div className="grid grid-cols-1 gap-2">
                                {editor.layers.map(layer => (
                                    <div 
                                        key={layer.id}
                                        onClick={() => { editor.selectLayer(layer.id); }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${editor.selectedLayerId === layer.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                                    >
                                        <div className="h-10 w-10 flex items-center justify-center bg-background rounded-lg border">
                                            {layer.type === 'text' && <Type className="h-5 w-5" />}
                                            {layer.type === 'person' && <User className="h-5 w-5" />}
                                            {layer.type === 'object' && <CopyX className="h-5 w-5" />}
                                            {layer.type === 'background' && <ImageIcon className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold">{layer.label}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{layer.type}</p>
                                        </div>
                                        {editor.selectedLayerId === layer.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </div>
                                ))}
                                                                {editor.layers.length === 0 && editor.currentImageUrl && (
                                                                    <div className="flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
                                                                        <Layers className="h-6 w-6 mb-2" />
                                                                        <p className="text-xs mb-2">No layers detected yet.</p>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => runDetectWithWorker(editor.sessionId || undefined, editor.currentImageUrl || undefined, true)}
                                                                        >
                                                                            Scan Again
                                                                        </Button>
                                                                    </div>
                                                                )}
                             </div>
                        </TabsContent>

                        <TabsContent value="edit" className="flex-1 overflow-y-auto p-4 focus-visible:ring-0">
                             {/* Re-use the right column logic here but condensed for mobile */}
                             {!selectedLayer ? (
                                <div className="h-40 flex flex-col items-center justify-center text-center">
                                    <p className="text-sm text-muted-foreground">Select a layer first</p>
                                </div>
                             ) : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold">Edit {selectedLayer.label}</h3>
                                    {/* ... Simplified Inputs ... */}
                                    {selectedLayer.type === 'text' && (
                                        <Textarea 
                                            className="text-lg font-bold min-h-[80px]" 
                                            placeholder="Enter new text..."
                                            value={replaceInstruction || selectedLayer.originalContent || ''}
                                            onChange={e => setReplaceInstruction(e.target.value)}
                                        />
                                    )}
                                    {/* (Rest of types simplified) */}
                                    <Button className="w-full h-12 bg-primary" onClick={() => {
                                        const typeMap: Record<Layer['type'], 'replace_text' | 'replace_person' | 'replace_background' | 'replace_object'> = {
                                            text: 'replace_text',
                                            person: 'replace_person',
                                            background: 'replace_background',
                                            object: 'replace_object'
                                        };
                                        editor.replaceLayer(selectedLayer.id, typeMap[selectedLayer.type], replaceInstruction);
                                        setIsMobileSheetOpen(false);
                                    }} disabled={editor.isReplacing}>
                                         {editor.isReplacing ? 'Replacing...' : `Generate & Replace (${selectedLayer.type === 'text' ? 5 : (selectedLayer.type === 'person' ? 7 : 6)} Credits)`}
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
