import { motion } from "framer-motion";

const productLinks = ["Generate", "Recreate", "Face Swap", "Editor", "Shorts", "Pricing"];
const companyLinks = ["About", "Blog", "Changelog", "Contact"];
const legalLinks = ["Privacy", "Terms", "Refund Policy"];

const socialIcons = [
  { label: "𝕏", color: "#fff" },
  { label: "📸", color: "#E1306C" },
  { label: "▶️", color: "#FF0000" },
  { label: "💬", color: "#5865F2" },
];

const floatingEmojis = ["🎨", "⚡", "📱", "🎯", "🔥"];

const LandingFooter = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="relative border-t border-primary/20 py-16 bg-background overflow-hidden">
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

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-1 mb-4">
              <span className="text-2xl font-display font-bold text-foreground">THUMB</span>
              <span className="text-2xl font-display font-bold text-primary">AI</span>
              <span className="text-lg">⚡</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The AI thumbnail generator for serious creators
            </p>
            <div className="flex gap-3">
              {socialIcons.map((s) => (
                <button
                  key={s.label}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-sm hover:scale-110 transition-transform"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm mb-4">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link}>
                  <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm mb-4">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link}>
                  <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold text-foreground text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link}>
                  <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Made with ❤️ in India 🇮🇳</p>
          <p className="text-sm text-muted-foreground">© 2025 ThumbAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
