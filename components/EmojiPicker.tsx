import React, { useEffect, useState } from 'react';
import { EMOJIS, BASE_COLORS } from '../lib/types/identity';

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRandomPalette(): string[] {
  return shuffle(BASE_COLORS).slice(0, 16);
}

function getColorEmojiPairs(palette: string[]) {
  const shuffled = shuffle(EMOJIS);
  return palette.map((color, i) => ({
    color,
    emoji: shuffled[i % shuffled.length],
  }));
}

export interface EmojiPickerProps {
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onConfirm?: () => void;
}

export interface ColorEmojiPair {
  color: string;
  emoji: string;
}

export function EmojiPicker({ selectedIdx, onSelect, onConfirm }: EmojiPickerProps) {
  const [colorEmojiPairs, setColorEmojiPairs] = useState<ColorEmojiPair[]>([]);

  useEffect(() => {
    const pal = getRandomPalette();
    const pairs = getColorEmojiPairs(pal);
    setColorEmojiPairs(pairs);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-3 w-full my-1">
      {colorEmojiPairs.map(({ color, emoji }, i) => (
        <button
          key={color + emoji}
          type="button"
          aria-label={`${emoji} on ${color}`}
          tabIndex={0}
          className="flex flex-col items-center justify-center transition-all group outline-none"
          onClick={() => onSelect(i)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              onSelect(i);
              if (e.key === "Enter" && onConfirm) {
                onConfirm();
              }
            }
          }}
        >
          <span
            style={{
              backgroundColor: color,
              border: selectedIdx === i ? "3px solid #222" : "2px solid #e5e7eb",
              boxShadow: selectedIdx === i ? "0 0 0 2px #0369a1" : "none",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "100%",
              fontSize: "1.7rem",
            }}
            className="sm:w-10 sm:h-10"
          >
            <span className="select-none" style={{ lineHeight: 1 }}>{emoji}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
