import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ className, children }) => (
  <section
    className={cn(
      'rounded-xl border border-border bg-surface-panel p-6 shadow-panel',
      className
    )}
  >
    {children}
  </section>
);
