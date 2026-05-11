'use client';

/**
 * Ticker component that displays a continuous scrolling strip of text.
 * Uses CSS animation for smooth performance.
 */
export default function Ticker() {
  const items = [
    "COMMITMENT CREATES ACCOUNTABILITY",
    "STAKING CREATES SKIN IN THE GAME",
    "AI VALIDATES YOUR DAILY PROOF",
    "SLASH FUNDS GLOBAL CHARITIES",
    "HABITS BECOME ON-CHAIN IDENTITY",
    "YOUR STAKE GENERATES DEFI YIELD",
  ];

  // Double the items to ensure seamless loop
  const tickerItems = [...items, ...items];

  return (
    <div className="w-full bg-secondary/5 border-y border-secondary/10 overflow-hidden py-3 whitespace-nowrap">
      <div className="inline-block animate-ticker">
        {tickerItems.map((item, idx) => (
          <span key={idx} className="inline-flex items-center gap-2 mx-10 text-[10px] sm:text-xs font-mono font-medium text-secondary tracking-widest uppercase">
            <span className="w-1 h-1 rounded-full bg-primary" />
            {item}
          </span>
        ))}
      </div>
      <style jsx global>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
