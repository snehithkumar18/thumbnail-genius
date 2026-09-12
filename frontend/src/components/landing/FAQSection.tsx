import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "How does the Script-to-Thumbnail pipeline actually work?",
    a: "You paste your entire raw YouTube script or outline. Our Gemini 2.5 Pro architecture parses the highest-intensity hook, emotional climax, and viewer curiosity gap. It automatically writes production prompts with lighting, composition, and high-retention 3-word text placement, rendering 4 viral packaging options in seconds.",
  },
  {
    q: "Can I use my own face consistently without taking new photos?",
    a: "Yes! You upload 1-3 clear reference selfies into your Creator Persona vault once. Every time you generate thumbnails or recreate competitor layouts, Thumbly automatically injects your authentic face with matching scene lighting, angle, and facial expressions.",
  },
  {
    q: "How does the 'Recreate Competitor' tool work?",
    a: "Simply paste any public YouTube video link. Thumbly extracts the exact color harmony, focal depth, subject positioning, and typography strategy, then generates a fresh, copyright-safe version featuring your own brand colors and face.",
  },
  {
    q: "What makes Thumbly better than Midjourney or Canva?",
    a: "General AI tools don't understand YouTube packaging rules. They produce art, not click-through rate. Thumbly is specifically trained on 500k+ viral YouTube thumbnails: high subject contrast, readable mobile typography, rule of thirds, curiosity gaps, and algorithm compliance.",
  },
  {
    q: "Do credits expire, and can I cancel anytime?",
    a: "Top-up credits NEVER expire. Subscription credits refresh monthly with roll-over allowance. You can cancel your subscription in 1 click anytime directly from your dashboard with zero penalty.",
  },
  {
    q: "Do you support international creators and local payments?",
    a: "Yes! We support creators globally with cards, Apple Pay, Google Pay, and automatic local currency checkout (including UPI and Rupay for Indian creators). We also support multi-language text rendering in Hindi, Spanish, Portuguese, Japanese, and 20+ other languages.",
  },
];

const FAQItem = ({ faq, index }: { faq: typeof faqs[0]; index: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <div
        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
          open
            ? "border-[#8B47FF]/50 bg-[#0F0A1E]"
            : "border-white/10 bg-[#0B0616] hover:border-white/20"
        }`}
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
        >
          <span className="text-white font-semibold text-base sm:text-lg pr-4">{faq.q}</span>
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-[#C4A8FF]"
          >
            <Plus className="h-4 w-4" />
          </motion.div>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="px-6 pb-6 text-white/70 text-sm sm:text-base leading-relaxed">
                {faq.a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FAQSection = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-24 bg-[#070310] relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#8B47FF]/15 border border-[#8B47FF]/30 text-[#C4A8FF] mb-4">
            ❓ GOT QUESTIONS?
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight">
            Frequently Asked <span className="bg-gradient-to-r from-[#C4A8FF] via-[#8B47FF] to-[#00E5FF] bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base mt-3">
            Everything you need to know about viral packaging, script generation, and creator plans.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
