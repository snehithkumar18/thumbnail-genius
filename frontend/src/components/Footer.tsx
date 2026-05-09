import { Zap } from "lucide-react";

const Footer = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="border-t border-border py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary fill-primary" />
            <span className="font-heading font-bold text-foreground">Thumbly</span>
            <span className="text-muted-foreground text-sm ml-2">AI thumbnails that get clicks</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap justify-center">
            {[
              { label: "Features", action: () => scrollTo("features") },
              { label: "Pricing", action: () => scrollTo("pricing") },
              { label: "Blog", action: () => {} },
              { label: "Contact", action: () => {} },
              { label: "Privacy", action: () => {} },
              { label: "Terms", action: () => {} },
            ].map((link) => (
              <button
                key={link.label}
                onClick={link.action}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Made with ❤️ in India 🇮🇳</p>
          <p className="text-sm text-muted-foreground">© 2025 Thumbly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
