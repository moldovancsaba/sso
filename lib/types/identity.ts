export interface Identity {
  gametag: string;
  emoji: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityDocument extends Identity {
  _id: string;
  tenantId: string;
}

export const EMOJIS = [
  "🐱", "🌈", "😎", "🌟", "🚀", "🦄", "🎩", "🍉", "🧊", "👾", "🦊", "🐸",
  "🧸", "🍕", "🌿", "🐙", "🧀", "🍩", "🐧", "🌺", "🐼", "🍪", "🐻", "🌵",
  "🪐", "🎸", "🐲", "🐼", "🎈", "🥑", "🦥", "🥨"
];

export const BASE_COLORS = [
  "#EF476F", "#FFD166", "#06D6A0", "#118AB2",
  "#FF8A5B", "#FFC93C", "#6BCB77", "#4D96FF",
  "#C36A2D", "#FFD23F", "#62B6CB", "#8A4FFF",
  "#E06D06", "#FFBE0B", "#26547C", "#06A77D",
  "#1A535C", "#FF6F59", "#F7B32B", "#3772FF"
];
