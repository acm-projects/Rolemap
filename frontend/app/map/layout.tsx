'use client';

import { useEffect } from 'react';

export default function MapLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('map-no-scroll');
    return () => {
      html.classList.remove('map-no-scroll');
    };
  }, []);

  return <>{children}</>;
}
