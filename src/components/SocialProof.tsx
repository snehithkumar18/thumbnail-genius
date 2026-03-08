import { motion } from "framer-motion";
import { Star } from "lucide-react";

const SocialProof = () => {
  return (
    <section className="py-16 border-y border-border bg-background/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-center gap-8"
        >
          <p className="text-muted-foreground font-medium text-sm">
            Trusted by <span className="text-foreground font-bold">12,000+</span> YouTube creators
          </p>

          <div className="flex -space-x-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-primary/40 to-secondary/40"
                style={{ zIndex: 6 - i }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
            ))}
            <span className="text-sm text-foreground font-semibold ml-1">4.9/5 rating</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProof;
