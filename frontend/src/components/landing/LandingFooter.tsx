import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

const productLinks = [
  "Script to Thumbnail",
  "Recreate Competitor",
  "Creator Persona Vault",
  "Thumbnail Score™",
  "High-CTR Titles",
  "Pricing Plans",
];

const resourceLinks = [
  "Thumbnail Design Guide",
  "YouTube Packaging Blog",
  "A/B Testing Best Practices",
  "Creator Community",
];

const companyLinks = ["About Us", "Changelog", "Careers", "Contact Support"];
const legalLinks = ["Privacy Policy", "Terms of Service", "Refund Policy"];

const LandingFooter = () => {
  return (
    <footer className="relative py-16 bg-[#040108] border-t border-white/10 overflow-hidden text-white/70 text-sm">
      {/* Glow orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#8B47FF]/50 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B47FF] to-[#00E5FF] flex items-center justify-center text-white font-black text-sm">
                ⚡
              </div>
              <span className="text-xl font-display font-black tracking-tight text-white">
                THUMB<span className="text-[#C4A8FF]">LY</span>
              </span>
            </div>
            <p className="text-white/50 text-sm mb-6 max-w-sm leading-relaxed">
              The AI YouTube packaging studio built for high-growth creators, media agencies, and viral video teams.
            </p>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
              <span className="text-xs text-white/60">Systems operational • AI models online</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase text-xs">Capabilities</h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link}>
                  <a href="#features" className="hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase text-xs">Resources</h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link}>
                  <a href="#examples" className="hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase text-xs">Company & Legal</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link}>
                  <a href="#faq" className="hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
              {legalLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-white/40 hover:text-white/80 transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Thumbly Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Built for Creators Worldwide 🌍</span>
            <span>Obsidian Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
