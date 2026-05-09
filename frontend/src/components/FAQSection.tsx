import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    q: "Can I use both a subscription and top-up credits?",
    a: "Yes! Top-up credits stack with your subscription and are used after your monthly credits run out.",
  },
  {
    q: "Can I use Thumbly for Hindi/regional language thumbnails?",
    a: "Yes! Thumbly supports Hindi, Tamil, Telugu, Spanish, Portuguese, and 20+ other languages. Our AI handles text rendering in multiple scripts beautifully.",
  },
  {
    q: "Which AI model gives the best results?",
    a: "FLUX.2 Pro gives the best photorealistic results. Ideogram is great for text-heavy thumbnails. The Schnell model is fastest but slightly lower quality. Basic and above plans get access to all pro models.",
  },
  {
    q: "Which plan should I start with?",
    a: "Try the $2 Starter Pack first. If you're generating more than 15–20 thumbnails a month, Basic at $10/mo is instantly better value.",
  },
  {
    q: "Can I cancel my plan anytime?",
    a: "Absolutely. You can cancel anytime from your account settings. You'll keep access until the end of your billing period. Top-up credits stay forever.",
  },
  {
    q: "Do you support UPI and Indian cards?",
    a: "Yes — UPI, all Indian debit/credit cards, and international cards all work. Indian users see INR pricing automatically.",
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
