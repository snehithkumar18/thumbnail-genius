import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { TrendingUp, Users, Zap, Award } from "lucide-react";

const stats = [
  {
    icon: TrendingUp,
    value: 48,
    suffix: "%",
    label: "Average CTR Increase",
    subtext: "Across 14,000+ A/B packaging tests",
  },
  {
    icon: Zap,
    value: 3,
    suffix: "s",
    label: "Instant AI Turnaround",
    subtext: "From script idea to 4K viral render",
  },
  {
    icon: Users,
    value: 50,
    suffix: "k+",
    label: "Creators & Media Brands",
    subtext: "From Solo YouTubers to 10M+ channels",
  },
  {
    icon: Award,
    value: 120,
    suffix: "M+",
    label: "Monthly Views Generated",
    subtext: "Powered by Thumbly packaged videos",
  },
];

const StatsCounter = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="py-24 relative overflow-hidden bg-white border-y border-[#EAE5F5]"
    >
      {/* Background glow accents */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-[#8B47FF]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#8B47FF]/10 border border-[#8B47FF]/20 text-[#8B47FF] mb-4">
            🚀 PROVEN AT SCALE
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#0F0A1E] tracking-tight">
            The data behind the <span className="bg-gradient-to-r from-[#8B47FF] via-[#A855F7] to-[#00B4D8] bg-clip-text text-transparent">algorithm wins</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative rounded-2xl p-6 bg-white border border-[#EAE5F5] hover:border-[#8B47FF]/40 transition-all duration-300 hover:-translate-y-1 group shadow-[0_8px_24px_rgba(15,10,30,0.05)]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#8B47FF]/10 border border-[#8B47FF]/20 flex items-center justify-center text-[#8B47FF] mb-4 group-hover:scale-110 group-hover:bg-[#8B47FF] group-hover:text-white transition-all">
                  <Icon className="w-5 h-5 transition-colors" />
                </div>
                <div className="text-4xl sm:text-5xl font-display font-extrabold text-[#0F0A1E] mb-2 tracking-tight">
                  {inView ? (
                    <CountUp
                      end={stat.value}
                      duration={2.2}
                      separator=","
                      suffix={stat.suffix}
                    />
                  ) : (
                    `0${stat.suffix}`
                  )}
                </div>
                <h3 className="text-base font-bold text-[#0F0A1E] mb-1">{stat.label}</h3>
                <p className="text-xs text-[#524B66] leading-relaxed">{stat.subtext}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
