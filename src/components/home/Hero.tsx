import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <img 
        src="/assets/bannes/fixos/hero.svg" 
        alt="Atacado Express Hero" 
        className="w-full h-auto rounded-md shadow-sm"
      />
    </motion.section>
  );
}
