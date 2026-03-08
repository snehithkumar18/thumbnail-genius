import { motion } from "framer-motion";
import { MessageSquare, Sparkles, Rocket } from "lucide-react";

const steps = [
  { icon: MessageSquare, title: "Describe your thumbnail", desc: "Type what you want in plain English" },
  { icon: Sparkles, title: "AI generates in seconds", desc: "Our AI creates multiple options instantly" },
  { icon: Rocket, title: "Download and upload", desc: "Pick your favorite and upload to YouTube" },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            How it works
          </h2>
          <p className="text-muted-foreground">Three steps. That's it.</p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px border-t-2 border-dashed border-border -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="relative z-10 mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 md:top-auto md:-right-auto md:left-1/2 md:-translate-x-1/2 md:-top-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center z-20">
                  {i + 1}
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
