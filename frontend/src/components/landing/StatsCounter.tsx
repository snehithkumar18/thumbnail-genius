import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";

const stats = [
  { value: 47382, suffix: "+", label: "Thumbnails Generated" },
  { value: 12000, suffix: "+", label: "Active Creators" },
  { value: 4.9, suffix: "★", label: "Average Rating", decimals: 1 },
  { value: 3, suffix: "s", label: "Avg Generation Time" },
];

const StatsCounter = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section
      ref={ref}
      className="py-16 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0F0A1E 0%, #1A1035 100%)" }}
    >
      {/* Orb */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,71,255,0.25),transparent_70%)]" />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 relative z-10"
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(139,71,255,0.3)", border: "1px solid rgba(139,71,255,0.5)", color: "#C4A8FF" }}>
          ✨ Growing every hour
        </span>
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-2">
                {inView && (
                  <CountUp
                    end={stat.value}
                    duration={2.5}
                    separator=","
                    decimals={stat.decimals || 0}
                    suffix={stat.suffix}
                  />
                )}
              </div>
              <p className="text-sm md:text-base text-white/70">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
