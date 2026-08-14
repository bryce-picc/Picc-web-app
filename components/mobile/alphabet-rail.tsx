'use client';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

interface AlphabetRailProps {
  onSelect: (letter: string) => void;
  layout?: 'overlay' | 'gutter';
}

export function AlphabetRail({ onSelect, layout = 'overlay' }: AlphabetRailProps) {
  return (
    <nav
      aria-label="Jump to account letter"
      className={
        layout === 'gutter'
          ? 'sticky top-[150px] flex max-h-[calc(100dvh-250px)] w-7 flex-col items-center justify-between self-start rounded-full bg-white/90 py-1 text-[12px] font-semibold text-[#1e6fc7] shadow-[0_2px_10px_rgba(24,33,45,0.08)]'
          : 'absolute right-1 top-[260px] z-[1200] flex w-6 flex-col items-center gap-0.5 text-[14px] font-semibold text-[#1e88e5]'
      }
    >
      {LETTERS.map((letter) => (
        <button key={letter} type="button" onClick={() => onSelect(letter)} className="grid min-h-4 w-full place-items-center rounded-full leading-none hover:bg-[#eaf2fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#276fd3]">
          {letter}
        </button>
      ))}
    </nav>
  );
}
