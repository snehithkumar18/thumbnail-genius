import { motion } from "framer-motion";
import { Zap, RefreshCw, User, Pencil, Smartphone, Globe, BarChart3, Palette } from "lucide-react";

const features = [
  { icon: Zap, emoji: "⚡", title: "Text to Thumbnail", desc: "Type a prompt, get a viral thumbnail" },
  { icon: RefreshCw, emoji: "🔁", title: "Recreate Anything", desc: "Paste any YouTube URL, recreate that style" },
  { icon: User, emoji: "🧑", title: "Face Swap", desc: "Put your face in any thumbnail" },
  { icon: Pencil, emoji: "✏️", title: "AI Editor", desc: "Refine thumbnails with simple text instructions" },
  { icon: Smartphone, emoji: "📱", title: "Shorts Generator", desc: "9:16 vertical covers for YouTube Shorts" },
  { icon: Globe, emoji: "🌍", title: "Multi-Language", desc: "Thumbnails with Hindi, Tamil, Spanish text" },
  { icon: BarChart3, emoji: "📊", title: "A/B Tester", desc: "Test 2 thumbnails, see which one wins" },
  { icon: Palette, emoji: "🎨", title: "Brand Kit", desc: "Apply your colors and fonts automatically" },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 tab:mb-16"
        >
          <h2 className="text-heading-1 mb-4">
            Everything you need to <br className="tab:hidden" />
            <span className="gradient-text">dominate</span> thumbnails
          </h2>
          <p className="text-body text-muted-foreground max-w-xl mx-auto">
            Powerful AI tools designed for YouTube creators who want more clicks.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group cursor-default"
            >
              <div className="text-3xl mb-4 transform group-hover:scale-110 transition-transform">{f.emoji}</div>
              <h3 className="text-heading-3 mb-2 group-hover:text-primary transition-colors">
                {f.title}
              </h3>
              <p className="text-small text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
