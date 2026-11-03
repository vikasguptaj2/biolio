/**
 * Biolio Atelier Edition Design System Tokens & Brand Configurations
 * Rooted in the editorial aesthetic: Ink (#211B29), Tangerine (#F36B3F), Warm White (#FFF9F2), Lilac (#C9B5F4)
 */

export const BRAND = {
  name: "Biolio",
  tagline: "Your whole world. One little link.",
  domain: "biolio.site",
  colors: {
    ink: "#211b29",
    ink2: "#3a3040",
    muted: "#7c727e",
    paper: "#fffdf8",
    canvas: "#f4efe7",
    warm: "#fff9f2",
    line: "#e5dcd1",
    line2: "#eee6dc",
    orange: "#f36b3f", // Tangerine brand accent
    orange2: "#ff946f",
    soft: "#fce8df",
    lilac: "#c9b5f4",
    lilac2: "#f0eafa",
    green: "#277a67",
    greenbg: "#e4f1eb",
    yellow: "#997027",
    yellowbg: "#f8efd9",
  },
  fonts: {
    editorial: "'Playfair Display', serif",
    display: "'Manrope', sans-serif",
    body: "'DM Sans', sans-serif",
  },
} as const;

export interface BiolioTemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  theme: {
    bg: string;
    cardBg: string;
    text: string;
    mutedText: string;
    accent: string;
    buttonBg: string;
    buttonText: string;
    border: string;
    fontHeading: string;
    fontBody: string;
    avatarRadius: string;
    cardRadius: string;
  };
}

export const BIOLIO_TEMPLATES: Record<string, BiolioTemplateConfig> = {
  "atelier-editorial": {
    id: "atelier-editorial",
    name: "Atelier Editorial",
    description: "Refined editorial layout with Playfair Display and warm linen tones.",
    category: "Writers & High Fashion",
    theme: {
      bg: "#f4efe7",
      cardBg: "#fffdf8",
      text: "#211b29",
      mutedText: "#7c727e",
      accent: "#f36b3f",
      buttonBg: "#f36b3f",
      buttonText: "#ffffff",
      border: "#e5dcd1",
      fontHeading: "'Playfair Display', serif",
      fontBody: "'DM Sans', sans-serif",
      avatarRadius: "9999px",
      cardRadius: "8px",
    },
  },
  "obsidian-noir": {
    id: "obsidian-noir",
    name: "Obsidian Noir",
    description: "Dark luxury aesthetic with deep inks, lilac glow, and high-contrast typography.",
    category: "Creators & Tech Founders",
    theme: {
      bg: "#16131b",
      cardBg: "#211b29",
      text: "#fdfcfe",
      mutedText: "#9e94a3",
      accent: "#c9b5f4",
      buttonBg: "#c9b5f4",
      buttonText: "#211b29",
      border: "#342b3d",
      fontHeading: "'Manrope', sans-serif",
      fontBody: "'DM Sans', sans-serif",
      avatarRadius: "16px",
      cardRadius: "12px",
    },
  },
  "sage-botanical": {
    id: "sage-botanical",
    name: "Sage Botanical",
    description: "Earthy organic tones with calming forest hues and delicate serif accents.",
    category: "Wellness & Skincare",
    theme: {
      bg: "#f2f5f3",
      cardBg: "#ffffff",
      text: "#1c2e27",
      mutedText: "#60746c",
      accent: "#277a67",
      buttonBg: "#277a67",
      buttonText: "#ffffff",
      border: "#d9e4de",
      fontHeading: "'Playfair Display', serif",
      fontBody: "'DM Sans', sans-serif",
      avatarRadius: "9999px",
      cardRadius: "16px",
    },
  },
  "studio-minimal": {
    id: "studio-minimal",
    name: "Studio Minimal",
    description: "Swiss architectural minimalism with crisp lines and vivid tangerine pops.",
    category: "Photographers & Designers",
    theme: {
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      text: "#111111",
      mutedText: "#666666",
      accent: "#f36b3f",
      buttonBg: "#111111",
      buttonText: "#ffffff",
      border: "#e5e5e5",
      fontHeading: "'Manrope', sans-serif",
      fontBody: "'DM Sans', sans-serif",
      avatarRadius: "8px",
      cardRadius: "4px",
    },
  },
  "sunset-amber": {
    id: "sunset-amber",
    name: "Sunset Amber",
    description: "Rich terracotta warmth, glowing peach accents, and warm sun-drenched feel.",
    category: "Culinary & Lifestyle",
    theme: {
      bg: "#fcf5ee",
      cardBg: "#ffffff",
      text: "#331f18",
      mutedText: "#876c62",
      accent: "#e0633b",
      buttonBg: "#e0633b",
      buttonText: "#ffffff",
      border: "#ecd8cb",
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Manrope', sans-serif",
      avatarRadius: "24px",
      cardRadius: "16px",
    },
  },
  "tokyo-cyber": {
    id: "tokyo-cyber",
    name: "Tokyo Cyber",
    description: "Vibrant neon violet on dark obsidian for stream setups and music artists.",
    category: "Music & Gaming",
    theme: {
      bg: "#0d0b12",
      cardBg: "#1a1622",
      text: "#ffffff",
      mutedText: "#a097b0",
      accent: "#9d65ff",
      buttonBg: "#9d65ff",
      buttonText: "#ffffff",
      border: "#2f283d",
      fontHeading: "'Manrope', sans-serif",
      fontBody: "'DM Sans', sans-serif",
      avatarRadius: "14px",
      cardRadius: "14px",
    },
  },
};

