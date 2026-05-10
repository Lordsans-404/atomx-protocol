'use client';

import { useLayoutEffect } from 'react';

interface PageShellWidthProps {
  value: string;
}

export default function PageShellWidth({ value }: PageShellWidthProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--page-shell-max-width');

    root.style.setProperty('--page-shell-max-width', value);

    return () => {
      if (previous) {
        root.style.setProperty('--page-shell-max-width', previous);
      } else {
        root.style.removeProperty('--page-shell-max-width');
      }
    };
  }, [value]);

  return null;
}
