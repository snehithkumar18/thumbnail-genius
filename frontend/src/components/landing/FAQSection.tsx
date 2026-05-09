import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "Is there a free trial?",
    a: "We don't offer a free trial, but our $2 Starter Pack lets you generate 30 thumbnails with no commitment. It's the best way to see the quality yourself.",
  },
  {
    q: "Do credits expire?",
    a: "Top-up credits never expire. Subscription credits refresh monthly, and unused ones roll over based on your plan limit.",
  },
  {
    q: "Can I use Thumbly for Hindi/regional language thumbnails?",
    a: "Yes! Thumbly supports Hindi, Tamil, Telugu, Spanish, Portuguese, and 20+ other languages. Our AI handles text rendering in multiple scripts beautifully.",
  },
  {
    q: "Which AI model gives the best results?",
    a: "FLUX.2 Pro gives the best photorealistic results. Ideogram is great for text-heavy thumbnails. The Schnell model is fastest but slightly lower quality.",
  },
  {
    q: "Can I cancel my plan anytime?",
    a: "Absolutely. Cancel anytime from your account settings. You'll keep access until the end of your billing period. Top-up credits stay forever.",
  },
  {
    q: "Do you support UPI and Indian cards?",
    a: "Yes — UPI, all Indian debit/credit cards, and international cards all work. Indian users see INR pricing automatically.",
  },
];

const FAQItem = ({ faq, index }: { faq: typeof faqs[0]; index: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <div
        className={`glass-card rounded-xl overflow-hidden transition-all duration-300 group ${
          open ? "border-l-2 border-l-primary bg-card/80" : "hover:border-l-2 hover:border-l-primary/50"
        }`}
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <span className="text-foreground font-medium pr-4">{faq.q}</span>
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
          </motion.div>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <p className="px-6 pb-6 text-muted-foreground text-sm leading-relaxed">
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
    <section className="py-16 sm:py-20 lg:py-24" ref={ref}>
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-4">
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
