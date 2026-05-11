'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * RotatingQuotes component that carousels through behavioral science quotes.
 */
export default function RotatingQuotes() {
  const quotes = [
    {
      category: 'ON IDENTITY',
      text: "Every action you take is a vote for the type of person you wish to become. No single instance will transform your beliefs, but as the votes build up, so does the evidence of your new identity.",
      author: 'James Clear — Atomic Habits',
      mirror: 'What does your on-chain history say about who you are?',
      color: 'secondary',
    },
    {
      category: 'ON CONSISTENCY',
      text: "You do not rise to the level of your goals. You fall to the level of your systems.",
      author: 'James Clear — Atomic Habits',
      mirror: 'Atomx is the system. Your commitment is the proof. The chain doesn\'t lie.',
      color: 'primary',
    },
    {
      category: 'ON STAKES',
      text: "The more immediate and certain the pain, the faster we learn. The more distant the consequences, the easier it is to ignore them.",
      author: 'James Clear — Atomic Habits',
      mirror: 'Your staked USDT makes the consequence immediate. That\'s the whole point.',
      color: 'tertiary',
    },
    {
      category: 'ON STARTING SMALL',
      text: "Habits are the compound interest of self-improvement. The same way money multiplies through compound interest, the effects of your habits multiply as you repeat them.",
      author: 'James Clear — Atomic Habits',
      mirror: 'Day 1 feels small. Day 30 feels like a different life.',
      color: 'secondary',
    },
  ];

  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const DURATION = 6000;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % quotes.length);
    setProgress(0);
  }, [quotes.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + quotes.length) % quotes.length);
    setProgress(0);
  }, [quotes.length]);

  useEffect(() => {
    if (isPaused) return;
    const interval = 50;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + (interval / DURATION) * 100;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  return (
    <div 
      className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <span className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-muted-foreground uppercase mb-12 block">
        // WORDS THAT HIT DIFFERENT
      </span>

      <div className="relative min-h-[400px] flex items-center justify-center">
        {quotes.map((quote, idx) => (
          <div 
            key={idx}
            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
              idx === current ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
            }`}
          >
            <div className={`px-4 py-1.5 rounded-full border mb-8 text-[10px] font-mono tracking-widest uppercase ${
              quote.color === 'primary' ? 'bg-primary/5 border-primary/20 text-primary' : 
              quote.color === 'secondary' ? 'bg-secondary/5 border-secondary/20 text-secondary' : 
              'bg-tertiary/5 border-tertiary/20 text-tertiary'
            }`}>
              {quote.category}
            </div>

            <blockquote className="relative mb-8">
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-8xl text-white/5 font-playfair pointer-events-none select-none">&ldquo;</span>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold font-playfair tracking-tight leading-snug">
                {quote.text}
              </p>
            </blockquote>

            <cite className="not-italic font-mono text-[11px] text-muted-foreground tracking-widest uppercase mb-10 block">
              {quote.author}
            </cite>

            <div className={`px-6 py-4 rounded-r-xl border-l-2 bg-surface-container/50 text-left max-w-md italic text-sm text-muted-foreground leading-relaxed ${
              quote.color === 'primary' ? 'border-primary' : 
              quote.color === 'secondary' ? 'border-secondary' : 
              'border-tertiary'
            }`}>
              {quote.mirror}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-16 flex items-center justify-center gap-6">
        <button onClick={prev} className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="w-32 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-secondary transition-all duration-50 linear" style={{ width: `${progress}%` }} />
        </div>

        <button onClick={next} className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-6 flex justify-center gap-2">
        {quotes.map((_, idx) => (
          <button 
            key={idx}
            onClick={() => { setCurrent(idx); setProgress(0); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${idx === current ? 'w-6 bg-secondary' : 'w-1.5 bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  );
}
