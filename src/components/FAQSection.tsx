import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is a credit and how does it work?",
    a: "Each credit lets you generate one thumbnail. Different features cost different amounts — a basic text-to-thumbnail costs 1 credit, while face swap or URL recreate costs 2 credits. Credits refresh monthly on your billing date.",
  },
  {
    q: "Do unused credits expire?",
    a: "On the Free plan, credits reset each month. On Creator and Pro plans, unused credits roll over (up to your monthly limit). Studio plan has unlimited rollover.",
  },
  {
    q: "Can I use ThumbAI for Hindi/regional language thumbnails?",
    a: "Yes! ThumbAI supports Hindi, Tamil, Telugu, Spanish, Portuguese, and 20+ other languages. Our AI handles text rendering in multiple scripts beautifully.",
  },
  {
    q: "Is there a free plan? What are its limits?",
    a: "Yes! The free plan gives you 20 credits/month with fast generation. You get access to Shorts generator and unlimited title generation. Downloads include a small watermark.",
  },
  {
    q: "Which AI model gives the best results?",
    a: "FLUX.2 Pro gives the best photorealistic results. Ideogram is great for text-heavy thumbnails. The Schnell model is fastest but slightly lower quality. Pro and Studio plans get access to all models.",
  },
  {
    q: "Can I cancel my plan anytime?",
    a: "Absolutely. You can cancel anytime from your account settings. You'll keep access until the end of your billing period. No questions asked.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Frequently asked questions
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <AccordionItem value={`faq-${i}`} className="glass-card rounded-xl px-6 border-border">
                <AccordionTrigger className="text-foreground font-medium hover:no-underline text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
