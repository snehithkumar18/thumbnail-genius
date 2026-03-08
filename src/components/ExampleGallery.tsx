import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import thumbGaming from "@/assets/thumb-gaming.jpg";
import thumbFinance from "@/assets/thumb-finance.jpg";
import thumbTech from "@/assets/thumb-tech.jpg";
import thumbFitness from "@/assets/thumb-fitness.jpg";

const categories = ["Finance", "Gaming", "Tech", "Fitness"] as const;
type Category = typeof categories[number];

const baseExamples: { img: string; category: Category; prompt: string }[] = [
  { img: thumbFinance, category: "Finance", prompt: "Shocked face looking at stock charts going up" },
  { img: thumbGaming, category: "Gaming", prompt: "Epic gaming battle scene with neon glow" },
  { img: thumbTech, category: "Tech", prompt: "Futuristic laptop with holographic display" },
  { img: thumbFitness, category: "Fitness", prompt: "Dramatic transformation before and after" },
  { img: thumbFinance, category: "Finance", prompt: "Crypto portfolio hitting $1M milestone" },
  { img: thumbGaming, category: "Gaming", prompt: "Minecraft castle at sunset with dramatic lighting" },
  { img: thumbTech, category: "Tech", prompt: "iPhone 16 unboxing with cinematic lighting" },
  { img: thumbFitness, category: "Fitness", prompt: "30 day workout challenge results" },
  { img: thumbFinance, category: "Finance", prompt: "Passive income strategy breakdown" },
  { img: thumbGaming, category: "Gaming", prompt: "Fortnite victory royale celebration" },
  { img: thumbTech, category: "Tech", prompt: "AI robot assistant demo showcase" },
  { img: thumbFitness, category: "Fitness", prompt: "Morning routine of a bodybuilder" },
];

const ExampleGallery = () => {
  const [visible, setVisible] = useState(8);

  return (
    <section id="examples" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Real thumbnails made with <span className="gradient-text">ThumbAI</span>
          </h2>
        </motion.div>

        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {baseExamples.slice(0, visible).map((ex, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.1 }}
              className="break-inside-avoid group relative rounded-xl overflow-hidden border border-border cursor-pointer"
            >
              <img src={ex.img} alt={ex.prompt} className="w-full aspect-video object-cover" loading="lazy" />
              <div className="absolute top-2 left-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/80 text-primary-foreground">
                  {ex.category}
                </span>
              </div>
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                <p className="text-sm text-foreground text-center font-medium">"{ex.prompt}"</p>
              </div>
            </motion.div>
          ))}
        </div>

        {visible < baseExamples.length && (
          <div className="text-center mt-10">
            <Button variant="heroGhost" onClick={() => setVisible(baseExamples.length)}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExampleGallery;
