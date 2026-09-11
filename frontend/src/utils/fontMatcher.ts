/**
 * Font Matcher — Closed-Set Classifier for YouTube Thumbnail Typography
 * 
 * Maps detected font style hints from Gemini Vision to the closest matching
 * Google Font from a curated shortlist of 25+ thumbnail-grade fonts.
 * 
 * Does NOT use third-party font-ID APIs. Uses heuristic matching only.
 */

export interface FontMatchResult {
  fontFamily: string;
  fontWeight: number;
  confidence: number; // 0..1
  displayName: string;
}

// Curated shortlist: fonts that actually appear in YouTube thumbnails
const THUMBNAIL_FONTS = [
  { family: "Impact, Arial Black, sans-serif", weight: 900, style: "impact", displayName: "Impact Classic" },
  { family: "'Bebas Neue', sans-serif", weight: 400, style: "condensed", displayName: "Bebas Neue" },
  { family: "'Anton', sans-serif", weight: 400, style: "bold_sans", displayName: "Anton" },
  { family: "'Montserrat', sans-serif", weight: 900, style: "bold_sans", displayName: "Montserrat Black" },
  { family: "'Oswald', sans-serif", weight: 700, style: "condensed", displayName: "Oswald Bold" },
  { family: "'Archivo Black', sans-serif", weight: 400, style: "bold_sans", displayName: "Archivo Black" },
  { family: "'Poppins', sans-serif", weight: 900, style: "rounded", displayName: "Poppins Black" },
  { family: "'Rubik', sans-serif", weight: 900, style: "rounded", displayName: "Rubik Black" },
  { family: "'Luckiest Guy', cursive", weight: 400, style: "rounded", displayName: "Luckiest Guy" },
  { family: "'Bangers', cursive", weight: 400, style: "script", displayName: "Bangers" },
  { family: "'Lilita One', sans-serif", weight: 400, style: "rounded", displayName: "Lilita One" },
  { family: "'Titan One', sans-serif", weight: 400, style: "rounded", displayName: "Titan One" },
  { family: "'Permanent Marker', cursive", weight: 400, style: "script", displayName: "Permanent Marker" },
  { family: "'Alfa Slab One', serif", weight: 400, style: "slab", displayName: "Alfa Slab One" },
  { family: "'Russo One', sans-serif", weight: 400, style: "bold_sans", displayName: "Russo One" },
  { family: "'Graduate', serif", weight: 400, style: "slab", displayName: "Graduate" },
  { family: "'Black Ops One', sans-serif", weight: 400, style: "bold_sans", displayName: "Black Ops One" },
  { family: "'Bungee', sans-serif", weight: 400, style: "bold_sans", displayName: "Bungee" },
  { family: "'Righteous', sans-serif", weight: 400, style: "rounded", displayName: "Righteous" },
  { family: "'Rubik Mono One', sans-serif", weight: 400, style: "bold_sans", displayName: "Rubik Mono One" },
  { family: "'Roboto Condensed', sans-serif", weight: 900, style: "condensed", displayName: "Roboto Condensed" },
  { family: "'Passion One', sans-serif", weight: 900, style: "bold_sans", displayName: "Passion One" },
  { family: "'Teko', sans-serif", weight: 700, style: "condensed", displayName: "Teko Bold" },
  { family: "'Bree Serif', serif", weight: 400, style: "bold_serif", displayName: "Bree Serif" },
  { family: "'Playfair Display', serif", weight: 900, style: "bold_serif", displayName: "Playfair Display" },
];

// Default safe fallback
const DEFAULT_FONT: FontMatchResult = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 900,
  confidence: 0.3,
  displayName: "Montserrat Black",
};

/**
 * Match detected font style hint to closest font from curated shortlist.
 * 
 * @param fontStyle - Hint from Gemini Vision: "bold_sans" | "bold_serif" | "condensed" | "script" | "impact" | "rounded" | "slab"
 * @param bboxAspect - Width/height ratio of the text bbox (narrow = condensed)
 * @returns Best matching font with confidence score
 */
export function matchFont(
  fontStyle?: string | null,
  bboxAspect?: number,
): FontMatchResult {
  if (!fontStyle) return DEFAULT_FONT;

  // Direct style match
  const styleMatches = THUMBNAIL_FONTS.filter(f => f.style === fontStyle);
  
  if (styleMatches.length > 0) {
    // If we have aspect ratio info, prefer condensed fonts for narrow text
    let best = styleMatches[0];
    if (bboxAspect !== undefined && bboxAspect < 0.5 && fontStyle !== "condensed") {
      const condensed = THUMBNAIL_FONTS.find(f => f.style === "condensed");
      if (condensed) best = condensed;
    }

    return {
      fontFamily: best.family,
      fontWeight: best.weight,
      confidence: 0.75,
      displayName: best.displayName,
    };
  }

  // Fuzzy fallback for unrecognized styles
  return DEFAULT_FONT;
}

/**
 * Get all available fonts for the font picker UI
 */
export function getAvailableFonts() {
  return THUMBNAIL_FONTS.map(f => ({
    fontFamily: f.family,
    fontWeight: f.weight,
    displayName: f.displayName,
    style: f.style,
  }));
}

/**
 * Load Google Fonts dynamically (call once on page load)
 */
export function loadThumbnailFonts() {
  const families = THUMBNAIL_FONTS
    .map(f => {
      const name = f.family.replace(/'/g, "").split(",")[0].trim();
      return `${name}:wght@${f.weight}`;
    })
    .join("&family=");

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
  
  if (!document.querySelector(`link[href="${link.href}"]`)) {
    document.head.appendChild(link);
  }
}
