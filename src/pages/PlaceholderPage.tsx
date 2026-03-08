import { motion } from "framer-motion";

interface PlaceholderPageProps {
  title: string;
  emoji: string;
}

const PlaceholderPage = ({ title, emoji }: PlaceholderPageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-[60vh] text-center"
    >
      <span className="text-6xl mb-4">{emoji}</span>
      <h2 className="text-2xl font-heading font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground">Coming soon — this feature is under development.</p>
    </motion.div>
  );
};

export default PlaceholderPage;
