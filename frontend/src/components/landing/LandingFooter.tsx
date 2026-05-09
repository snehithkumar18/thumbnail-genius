import { motion } from "framer-motion";

const productLinks = ["Generate", "Recreate", "Face Swap", "Editor", "Shorts", "Pricing"];
const companyLinks = ["About", "Blog", "Changelog", "Contact"];
const legalLinks = ["Privacy", "Terms", "Refund Policy"];

const socialIcons = [
  { label: "𝕏", hoverColor: "#1DA1F2" },
  { label: "📸", hoverColor: "#E1306C" },
  { label: "▶️", hoverColor: "#FF0000" },
  { label: "💬", hoverColor: "#5865F2" },
];

const floatingEmojis = ["🎨", "⚡", "📱", "🎯", "🔥"];

const LandingFooter = () => {
  return (
    <footer className="relative py-12 sm:py-16 overflow-hidden" style={{ background: "#0F0A1E", borderTop: "1px solid rgba(139,71,255,0.2)" }}>
      {/* Floating emojis background */}
      {floatingEmojis.map((emoji, i) => (
        <div
          key={i}
          className="absolute text-4xl opacity-[0.04] animate-float-gentle select-none pointer-events-none"
          style={{
            left: `${15 + i * 20}%`,
            top: `${10 + (i % 3) * 30}%`,
            animationDelay: `${i * 0.7}s`,
          }}
        >
          {emoji}
        </div>
      ))}

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-1 mb-4">
              <span className="text-2xl font-display font-bold text-white">THUMB</span>
              <span className="text-2xl font-display font-bold" style={{ color: "#C4A8FF" }}>AI</span>
              <span className="text-lg">⚡</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              The AI thumbnail generator for serious creators
            </p>
            <div className="flex gap-3">
              {socialIcons.map((s) => (
                <button
                  key={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,71,255,0.2)", color: "rgba(255,255,255,0.4)" }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>Product</h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link}>
                  <button className="text-sm transition-colors hover:text-[#C4A8FF]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link}>
                  <button className="text-sm transition-colors hover:text-[#C4A8FF]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold text-sm mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link}>
                  <button className="text-sm transition-colors hover:text-[#C4A8FF]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(139,71,255,0.15)" }}>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Made with ❤️ in India 🇮🇳</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>© 2025 Thumbly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
