
export interface TextLayer {
  id: string;
  content: string;
  x: number; // percentage 0-1 relative to container
  y: number; // percentage 0-1 relative to container
  color: string;
  backgroundColor: string; // 'transparent' or hex
  fontSize: number; // relative scale factor
  maxWidth?: number; // percentage 0-1, max width of the text box
  fontFamily: string;
  rotation: number;
  textAlign?: 'left' | 'center' | 'right';
  outlineColor?: string;
  outlineWidth?: number;
  opacity?: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
}

export const COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EC4899', // Pink
];

export const FONTS = [
  'font-sans',
  'font-serif',
  'font-mono',
  'font-anton',
  'font-bebas',
  'font-lobster',
  'font-oswald',
  'font-poppins',
];

export const FONT_FAMILY_MAP: Record<string, string> = {
  'font-sans': 'Inter, sans-serif',
  'font-serif': 'Merriweather, serif',
  'font-mono': '"JetBrains Mono", monospace',
  'font-anton': 'Anton, sans-serif',
  'font-bebas': '"Bebas Neue", sans-serif',
  'font-lobster': 'Lobster, cursive',
  'font-oswald': 'Oswald, sans-serif',
  'font-poppins': 'Poppins, sans-serif',
};
