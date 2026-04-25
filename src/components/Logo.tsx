import { motion } from "motion/react";

export const DachshundLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 60"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Simple Stylized Dachshund */}
    {/* Body */}
    <rect x="25" y="30" width="45" height="15" rx="7" />
    {/* Legs */}
    <rect x="30" y="45" width="4" height="8" rx="2" />
    <rect x="62" y="45" width="4" height="8" rx="2" />
    {/* Tail */}
    <path d="M 70 35 Q 85 30 80 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    {/* Neck and Head */}
    <motion.g
      initial={{ rotate: -5 }}
      animate={{ rotate: 5 }}
      transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
      style={{ transformOrigin: "35px 35px" }}
    >
      <rect x="15" y="15" width="25" height="25" rx="8" />
      {/* Ear */}
      <rect x="10" y="18" width="12" height="18" rx="6" />
      {/* Nose */}
      <circle cx="15" cy="30" r="3" />
      {/* Eye */}
      <circle cx="30" cy="25" r="1.5" fill="white" />
    </motion.g>
  </svg>
);
