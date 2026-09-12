import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star, CheckCircle2 } from "lucide-react";

const testimonials = [
  {
    name: "Cody R.",
    role: "Tech & Coding | 380K Subscribers",
    quote: "Our CTR literally jumped from 3.2% to 9.8% after switching to Thumbly's Recreate feature. Saved my team 15 hours a week in Photoshop.",
    tag: "+210% CTR",
    views: "2.4M views on first video",
    initials: "CR",
  },
  {
    name: "Elena Vance",
    role: "Storytelling & Documentary | 720K Subs",
    quote: "The Script-to-Thumbnail tool is scary good. I paste my finalized script and it already knows the dramatic climax and builds 4 high-contrast concepts.",
    tag: "Script Pipeline",
    views: "3.8M views",
    initials: "EV",
  },
  {
    name: "Aryan Patel",
    role: "Finance & Market Analysis | 190K Subs",
    quote: "Thumbly's Persona consistency is unmatched. My face renders seamlessly into hyper-expressive poses without looking like cheap AI plastic.",
    tag: "Face Persona",
    views: "890K views",
    initials: "AP",
  },
  {
    name: "Marcus Vance",
    role: "Gaming & IRL Challenges | 1.2M Subs",
    quote: "Used to pay $1,800/mo to thumbnail agencies who constantly missed deadlines. Now Thumbly creates 10 MrBeast-level variations in 15 seconds.",
    tag: "10x Cheaper",
    views: "5.1M views",
    initials: "MV",
  },
  {
    name: "Sophia Martinez",
    role: "Fitness & Nutrition | 340K Subs",
    quote: "The Thumbnail Score™ caught that my subject contrast was getting drowned on mobile devices. Fixed it in one click and gained 40k views in 24 hours.",
    tag: "Score™ Audit",
    views: "1.1M views",
    initials: "SM",
  },
  {
    name: "Devon Chen",
    role: "Automation & AI Creator | 115K Subs",
    quote: "The bold typography positioning is genuinely viral-grade. It doesn't put boring subtitles, it formats high-retention 3-word hooks that stop the scroll.",
    tag: "High-CTR Typography",
    views: "640K views",
    initials: "DC",
  },
];

const TestimonialCard = ({ t }: { t: typeof testimonials[0] }) => (
  <div className="shrink-0 w-84 sm:w-96 bg-[#0B0616] border border-white/10 rounded-2xl p-6 mx-3 group hover:border-[#8B47FF]/50 transition-all duration-300 hover:shadow-[0_12px_32px_rgba(139,71,255,0.15)] flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-tr from-[#8B47FF] to-[#00E5FF] text-white">
            {t.initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-white">{t.name}</p>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF]" />
            </div>
            <p className="text-xs text-white/50">{t.role}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#8B47FF]/15 border border-[#8B47FF]/30 text-[#C4A8FF]">
          {t.tag}
        </span>
      </div>

      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-[#00E5FF] text-[#00E5FF]" />
        ))}
      </div>

      <p className="text-sm text-white/80 leading-relaxed font-normal">
        "{t.quote}"
      </p>
    </div>

    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
      <span>Verified YouTube Partner</span>
      <span className="text-[#00E5FF]/80 font-medium">{t.views}</span>
    </div>
  </div>
);

const ScrollRow = ({ items, reverse = false }: { items: typeof testimonials; reverse?: boolean }) => {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
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
    <section className="py-24 overflow-hidden bg-[#070310] relative" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 relative z-10 mb-14 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#8B47FF]/15 border border-[#8B47FF]/30 text-[#C4A8FF] mb-4">
            ⭐ TRUSTED BY TOP CHANNELS
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight">
            Stop losing views to <span className="bg-gradient-to-r from-[#C4A8FF] via-[#8B47FF] to-[#00E5FF] bg-clip-text text-transparent">bad packaging</span>
          </h2>
          <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mt-3">
            See how top creators transformed their YouTube CTR and channel revenue with Thumbly's AI packaging studio.
          </p>
        </motion.div>
      </div>

      <div className="space-y-4">
        <ScrollRow items={testimonials.slice(0, 3)} />
        <ScrollRow items={testimonials.slice(3)} reverse />
      </div>
    </section>
  );
};

export default TestimonialsSection;
