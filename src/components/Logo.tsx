import panchiLogo from '@/assets/panchi-logo.png';
import { cn } from '@/lib/utils';
import React from 'react';

export const DachshundLogo = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <img
    src={panchiLogo}
    alt="Panchi"
    className={cn("object-contain", className)}
    style={{ mixBlendMode: 'multiply', ...style }}
  />
);
