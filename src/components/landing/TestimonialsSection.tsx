import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Rahul S.", role: "Finance Creator | 280K subs", quote: "ThumbAI replaced my designer. I generate 10 thumbnails in the time it took to make 1.", category: "Finance", initials: "RS" },
  { name: "Sarah K.", role: "Gaming Creator | 150K subs", quote: "The face swap feature is insane. My CTR went from 4% to 11% in one month.", category: "Gaming", initials: "SK" },
  { name: "Amit P.", role: "Tech Reviewer | 90K subs", quote: "Hindi text on thumbnails was impossible before. ThumbAI nails it every time.", category: "Tech", initials: "AP" },
  { name: "Maria G.", role: "Fitness Creator | 200K subs", quote: "I was paying $29/mo for Pikzels. ThumbAI is better and costs a fraction.", category: "Fitness", initials: "MG" },
  { name: "David L.", role: "Travel Vlogger | 75K subs", quote: "The recreate-from-URL feature is magic. I recreate top creators' styles instantly.", category: "Travel", initials: "DL" },
  { name: "Priya M.", role: "Education Creator | 120K subs", quote: "A/B testing my thumbnails helped me understand what works. Game changer.", category: "Education", initials: "PM" },
];

const TestimonialCard = ({ t }: { t: typeof testimonials[0] }) => (
  <div className="shrink-0 w-80 bg-card border border-border rounded-2xl p-6 mx-3 group hover:border-[#C4A8FF] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(139,71,255,0.12)]">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary" style={{ background: "linear-gradient(135deg, #F0E8FF, #EDE9FE)" }}>
        {t.initials}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{t.name}</p>
        <p className="text-xs text-muted-foreground">{t.role}</p>
      </div>
    </div>
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-secondary text-secondary" />
      ))}
    </div>
    <p className="text-sm text-muted-foreground italic leading-relaxed">"{t.quote}"</p>
    <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
      {t.category}
    </span>
  </div>
);

const ScrollRow = ({ items, reverse = false }: { items: typeof testimonials; reverse?: boolean }) => {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <div className={`flex ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}>
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-24 overflow-hidden" ref={ref} style={{ background: "#F8F7FF" }}>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-6xl font-display font-bold">
          Creators love <span className="gradient-text">ThumbAI</span>
        </h2>
      </motion.div>

      <div className="space-y-4">
        <ScrollRow items={testimonials.slice(0, 3)} />
        <ScrollRow items={testimonials.slice(3)} reverse />
      </div>
    </section>
  );
};

export default TestimonialsSection;
