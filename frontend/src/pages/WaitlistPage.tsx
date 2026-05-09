import { useState, useEffect, useRef, useCallback } from "react";
import "./WaitlistPage.css";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Zap, Check, ArrowRight, ChevronDown,
  Wand2, Layers, RefreshCw, Type, BarChart3, Palette,
  Image as ImageIcon, Users, Star, Play, MousePointerClick,
  ScanSearch, FileImage, TextCursorInput, Monitor
} from "lucide-react";

/* ─── Reusable Before / After Slider ─── */
interface SliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

const BeforeAfterSlider = ({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
}: SliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className="wl-comparison-container"
      onMouseDown={() => { dragging.current = true; }}
      onTouchStart={() => { dragging.current = true; }}
    >
      {/* After (full background) */}
      <img src={afterSrc} alt={afterAlt} className="wl-comparison-img" draggable={false} />
      {/* Before (clipped) */}
      <div className="wl-comparison-before" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        <img src={beforeSrc} alt={beforeAlt} className="wl-comparison-img" draggable={false} />
        <span className="wl-comparison-label wl-comparison-label--before">{beforeLabel}</span>
      </div>
      <span className="wl-comparison-label wl-comparison-label--after" style={{ right: 16 }}>{afterLabel}</span>
      {/* Slider handle */}
      <div className="wl-comparison-slider" style={{ left: `${sliderPos}%` }}>
        <div className="wl-comparison-line" />
        <div className="wl-comparison-handle">
          <MousePointerClick className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};

/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const duration = 2000;
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─── Main Page ─── */
const WaitlistPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(247);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const { error } = await supabase.from("waitlist").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp_number: whatsapp.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg("You're already on the list! 🎉");
          setStatus("error");
        } else {
          setErrorMsg("Something went wrong. Please try again.");
          setStatus("error");
        }
        return;
      }

      setStatus("success");
      setWaitlistCount((c) => c + 1);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  const features = [
    { icon: Wand2, title: "AI Thumbnail Generation", desc: "Describe your thumbnail and let AI create it in seconds" },
    { icon: Users, title: "AI Face Swap", desc: "Put your face into any thumbnail seamlessly" },
    { icon: Layers, title: "Smart Editor", desc: "Detect & replace faces, text, images, backgrounds with one click" },
    { icon: RefreshCw, title: "Recreate from URL", desc: "Paste any YouTube URL and recreate that exact style" },
    { icon: Type, title: "Title Generator", desc: "AI-powered titles that boost your CTR" },
    { icon: BarChart3, title: "A/B Testing", desc: "Test two thumbnails and see which one wins" },
    { icon: Palette, title: "Brand Kit", desc: "Save your colors, fonts, and logo for consistency" },
    { icon: ImageIcon, title: "Background Removal", desc: "Remove backgrounds instantly with AI precision" },
  ];

  /* Smart Editor detection capabilities */
  const detectionCapabilities = [
    { icon: Users, label: "Faces", color: "#a78bfa" },
    { icon: TextCursorInput, label: "Text", color: "#f59e0b" },
    { icon: FileImage, label: "Images & PNGs", color: "#3b82f6" },
    { icon: Monitor, label: "Screenshots", color: "#22c55e" },
    { icon: ImageIcon, label: "Backgrounds", color: "#ec4899" },
    { icon: ScanSearch, label: "Any Element", color: "#f97316" },
  ];

  return (
    <div className="wl-page">
      {/* ─── Navbar ─── */}
      <nav className="wl-nav">
        <div className="wl-nav-inner">
          <div className="wl-logo">
            <span className="wl-logo-text">THUMB</span>
            <span className="wl-logo-accent">AI</span>
            <span className="wl-logo-bolt">⚡</span>
          </div>
          <button onClick={scrollToForm} className="wl-nav-cta">
            Join Waitlist <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="wl-hero">
        <div className="wl-hero-bg">
          <img src="/waitlist/hero-bg.png" alt="" className="wl-hero-bg-img" />
          <div className="wl-hero-overlay" />
        </div>

        {/* Floating particles */}
        <div className="wl-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="wl-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="wl-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="wl-hero-badge"
          >
            <span className="wl-badge-dot" />
            <span>🚀 Launching Soon — Be the First to Try</span>
          </motion.div>

          <motion.h1
            className="wl-hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            The Ultimate <span className="wl-gradient-text">AI Co-Pilot</span>
            <br />
            for YouTube Creators
          </motion.h1>

          <motion.p
            className="wl-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Generate viral thumbnails, swap faces, A/B test — all in one tool.
            <br className="wl-hide-mobile" />
            No Photoshop. No design skills. Just results.
          </motion.p>

          <motion.div
            className="wl-hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <button onClick={scrollToForm} className="wl-cta-primary">
              <Sparkles className="w-5 h-5" />
              Join the Waitlist — It's Free
            </button>
            <a href="#showcase" className="wl-cta-secondary">
              See What's Coming <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>

          <motion.div
            className="wl-hero-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="wl-stat">
              <span className="wl-stat-number"><AnimatedCounter target={waitlistCount} suffix="+" /></span>
              <span className="wl-stat-label">on the waitlist</span>
            </div>
            <div className="wl-stat-divider" />
            <div className="wl-stat">
              <div className="wl-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="wl-stat-label">Early testers love it</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Showcase: Smart Editor ─── */}
      <section id="showcase" className="wl-showcase">
        <div className="wl-section-inner">
          <motion.div
            className="wl-section-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="wl-section-tag">⭐ Star Feature</span>
            <h2 className="wl-section-title">
              Meet the <span className="wl-gradient-text">Smart Editor</span>
            </h2>
            <p className="wl-section-desc">
              An AI-powered editor that automatically detects and lets you replace
              <strong> every element</strong> in your thumbnail — faces, text, images,
              screenshots, PNGs, logos, and backgrounds. Click any element, tell the AI what you want, done.
            </p>
          </motion.div>

          {/* Detection capabilities pills */}
          <motion.div
            className="wl-detect-pills"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {detectionCapabilities.map((cap, i) => (
              <motion.div
                key={cap.label}
                className="wl-detect-pill"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08 }}
                style={{ borderColor: `${cap.color}40` }}
              >
                <cap.icon className="w-4 h-4" style={{ color: cap.color }} />
                <span style={{ color: cap.color }}>{cap.label}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="wl-showcase-visual"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Browser frame */}
            <div className="wl-browser-frame">
              <div className="wl-browser-bar">
                <div className="wl-browser-dots">
                  <span className="wl-dot wl-dot--red" />
                  <span className="wl-dot wl-dot--yellow" />
                  <span className="wl-dot wl-dot--green" />
                </div>
                <div className="wl-browser-url">
                  <span>thumbai.app/dashboard/smart-editor</span>
                </div>
              </div>
              <div className="wl-browser-content">
                <img src="/waitlist/smart-editor.png" alt="ThumbAI Smart Editor — detects faces, text, images, screenshots, PNGs, backgrounds" className="wl-showcase-img" />
                {/* Video placeholder overlay */}
                <div className="wl-video-overlay">
                  <div className="wl-play-btn">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                  <span className="wl-video-text">Watch Demo (Coming Soon)</span>
                </div>
              </div>
            </div>

            {/* Floating capability cards */}
            <motion.div
              className="wl-float-card wl-float-card--left"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <ScanSearch className="w-5 h-5 text-purple-400" />
              <div>
                <p className="wl-float-title">Auto-Detect Everything</p>
                <p className="wl-float-desc">Faces, text, images, PNGs, screenshots</p>
              </div>
            </motion.div>

            <motion.div
              className="wl-float-card wl-float-card--right"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <Wand2 className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="wl-float-title">AI Replace & Generate</p>
                <p className="wl-float-desc">Swap any element with AI</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Face Swap Comparison ─── */}
      <section className="wl-comparison-section">
        <div className="wl-section-inner">
          <motion.div
            className="wl-section-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="wl-section-tag">🧑 Face Swap</span>
            <h2 className="wl-section-title">
              Same Outfit. Same Scene. <span className="wl-gradient-text">Different Face.</span>
            </h2>
            <p className="wl-section-desc">
              Seamlessly swap faces while keeping the exact same clothes, pose, and background.
              Drag the slider to see the magic.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <BeforeAfterSlider
              beforeSrc="/waitlist/faceswap-before.png"
              afterSrc="/waitlist/faceswap-after.png"
              beforeAlt="Original face"
              afterAlt="Swapped face"
              beforeLabel="ORIGINAL"
              afterLabel="FACE SWAPPED"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Smart Editor: Layers Visual ─── */}
      <section className="wl-comparison-section wl-comparison-section--alt">
        <div className="wl-section-inner">
          <motion.div
            className="wl-section-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="wl-section-tag">🧩 Layer-by-Layer Control</span>
            <h2 className="wl-section-title">
              Every Element. <span className="wl-gradient-text">Detected & Editable.</span>
            </h2>
            <p className="wl-section-desc">
              The Smart Editor breaks your thumbnail into individual layers — faces, text,
              images, logos, PNGs, screenshots, and backgrounds. Click any layer to replace,
              edit, or regenerate it with AI.
            </p>
          </motion.div>

          <motion.div
            className="wl-layers-visual"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="wl-layers-frame">
              <img src="/waitlist/smart-editor-layers.png" alt="Smart Editor exploded 3D layers view — showing face, text, image, and background as separate editable layers" className="wl-layers-img" />
            </div>

            {/* Layer labels floating */}
            <motion.div
              className="wl-layer-label wl-layer-label--1"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <span className="wl-layer-dot" style={{ background: "#a78bfa" }} />
              <span>Face Layer</span>
            </motion.div>
            <motion.div
              className="wl-layer-label wl-layer-label--2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.65 }}
            >
              <span className="wl-layer-dot" style={{ background: "#f59e0b" }} />
              <span>Text Layer</span>
            </motion.div>
            <motion.div
              className="wl-layer-label wl-layer-label--3"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <span className="wl-layer-dot" style={{ background: "#3b82f6" }} />
              <span>Image / PNG</span>
            </motion.div>
            <motion.div
              className="wl-layer-label wl-layer-label--4"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.95 }}
            >
              <span className="wl-layer-dot" style={{ background: "#22c55e" }} />
              <span>Background</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Background Removal Comparison ─── */}
      <section className="wl-comparison-section">
        <div className="wl-section-inner">
          <motion.div
            className="wl-section-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="wl-section-tag">✂️ Background Removal</span>
            <h2 className="wl-section-title">
              Messy Background? <span className="wl-gradient-text">Gone in One Click.</span>
            </h2>
            <p className="wl-section-desc">
              Instantly remove any background with AI precision. Get a clean cutout
              ready to drop into any thumbnail.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <BeforeAfterSlider
              beforeSrc="/waitlist/bgremoval-before.png"
              afterSrc="/waitlist/bgremoval-after.png"
              beforeAlt="Photo with messy background"
              afterAlt="Background removed cleanly"
              beforeLabel="WITH BACKGROUND"
              afterLabel="REMOVED"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Thumbnail Generation Comparison ─── */}
      <section className="wl-comparison-section wl-comparison-section--alt">
        <div className="wl-section-inner">
          <motion.div
            className="wl-section-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="wl-section-tag">✨ Full AI Generation</span>
            <h2 className="wl-section-title">
              From Raw Photo to <span className="wl-gradient-text">Viral Thumbnail</span>
            </h2>
            <p className="wl-section-desc">
              Drag the slider to see the complete AI transformation. One prompt is all it takes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <BeforeAfterSlider
              beforeSrc="/waitlist/before.png"
              afterSrc="/waitlist/after.png"
              beforeAlt="Original photo"
              afterAlt="AI-generated thumbnail"
              beforeLabel="RAW PHOTO"
              afterLabel="AI GENERATED"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="wl-features">
        <div className="wl-section-inner">
          <motion.div
            className="wl-section-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="wl-section-tag">🔥 Packed with Power</span>
            <h2 className="wl-section-title">
              Everything You Need. <span className="wl-gradient-text">One Platform.</span>
            </h2>
          </motion.div>

          <div className="wl-features-grid">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="wl-feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="wl-feature-icon">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="wl-feature-title">{f.title}</h3>
                <p className="wl-feature-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Waitlist Form ─── */}
      <section className="wl-form-section" ref={formRef}>
        <div className="wl-section-inner">
          <motion.div
            className="wl-form-card"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="wl-form-glow" />

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="wl-form-success"
                >
                  <div className="wl-success-check">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="wl-success-title">You're on the list! 🎉</h3>
                  <p className="wl-success-desc">
                    We'll notify you on WhatsApp as soon as we launch.
                    <br />
                    Get ready to create viral thumbnails.
                  </p>
                  <div className="wl-success-position">
                    <span className="wl-success-number">#{waitlistCount}</span>
                    <span className="wl-success-label">Your position</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" exit={{ opacity: 0 }}>
                  <div className="wl-form-header">
                    <Zap className="w-8 h-8 text-purple-400" />
                    <h2 className="wl-form-title">Join the Waitlist</h2>
                    <p className="wl-form-desc">
                      Be among the first to experience the future of YouTube thumbnails.
                      Early members get exclusive perks.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="wl-form">
                    <div className="wl-input-group">
                      <label htmlFor="wl-name" className="wl-label">Your Name</label>
                      <input
                        id="wl-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="wl-input"
                        required
                      />
                    </div>
                    <div className="wl-input-group">
                      <label htmlFor="wl-email" className="wl-label">Email Address</label>
                      <input
                        id="wl-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="wl-input"
                        required
                      />
                    </div>
                    <div className="wl-input-group">
                      <label htmlFor="wl-whatsapp" className="wl-label">
                        WhatsApp Number <span className="wl-optional">(optional)</span>
                      </label>
                      <input
                        id="wl-whatsapp"
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="wl-input"
                      />
                    </div>

                    {errorMsg && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="wl-error"
                      >
                        {errorMsg}
                      </motion.p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="wl-submit-btn"
                    >
                      {status === "loading" ? (
                        <span className="wl-spinner" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Join the Waitlist
                        </>
                      )}
                    </button>

                    <p className="wl-privacy">
                      🔒 No spam. We respect your privacy.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="wl-footer">
        <div className="wl-footer-inner">
          <div className="wl-logo">
            <span className="wl-logo-text">THUMB</span>
            <span className="wl-logo-accent">AI</span>
            <span className="wl-logo-bolt">⚡</span>
          </div>
          <p className="wl-footer-text">
            © {new Date().getFullYear()} ThumbAI. The AI-powered thumbnail platform for YouTube creators.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default WaitlistPage;
