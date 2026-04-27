'use client';

import { useEffect, useRef, useState } from 'react';

export default function Quote() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="quote-section"
      className="relative w-full bg-[#09090b] overflow-hidden"
    >
      {/* Top/bottom gradient lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00FFA3]/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00FFA3]/20 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,163,0.04)_0%,transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 sm:px-10 py-24 sm:py-32 max-w-3xl mx-auto">

        {/* Quote mark */}
        <span
          aria-hidden="true"
          className="select-none leading-none text-[#00FFA3] mb-[-1.5rem] sm:mb-[-2rem] transition-all duration-1000"
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 'clamp(5rem, 10vw, 8rem)',
            opacity: visible ? 0.15 : 0,
            transform: `translateY(${visible ? 0 : -30}px)`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          &ldquo;
        </span>

        {/* Quote text */}
        <blockquote
          className="text-center transition-all duration-1000"
          style={{
            opacity: visible ? 1 : 0,
            transform: `translateY(${visible ? 0 : 30}px)`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0.2s',
          }}
        >
          <p
            className="text-lg sm:text-2xl md:text-[1.7rem] text-zinc-300 italic leading-[1.7] sm:leading-[1.8]"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            &ldquo;To change a bad habit, you must make the consequences of the behavior immediate and costly.&rdquo;
          </p>
        </blockquote>

        {/* Attribution */}
        <div
          className="mt-8 sm:mt-10 flex flex-col items-center gap-3 transition-all duration-1000"
          style={{
            opacity: visible ? 1 : 0,
            transform: `translateY(${visible ? 0 : 20}px)`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: '0.45s',
          }}
        >
          {/* Expanding dash */}
          <span
            className="block h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#00FFA3]/50 to-transparent transition-all duration-[1.2s]"
            style={{
              width: visible ? '3rem' : '0rem',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: '0.6s',
            }}
          />
          <cite className="not-italic text-sm sm:text-base font-semibold tracking-[0.2em] uppercase text-[#00FFA3]/80">
            James Clear
          </cite>
          <span className="text-xs sm:text-sm text-zinc-500 tracking-[0.25em] uppercase font-medium">
            Atomic Habits
          </span>
        </div>
      </div>
    </section>
  );
}
