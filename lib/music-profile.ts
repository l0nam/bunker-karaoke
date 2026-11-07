export type WaveMood = "calm" | "balanced" | "energetic";

const GENRE_GROUPS: Record<WaveMood, string[]> = {
  calm: [
    "ambient",
    "classical",
    "soundtrack",
    "instrumental",
    "new age",
    "acoustic",
    "folk",
    "singer/songwriter",
    "singer songwriter",
    "lullaby",
    "meditation",
    "easy listening",
  ],
  balanced: [
    "pop",
    "rock",
    "alternative",
    "indie",
    "r&b",
    "soul",
    "jazz",
    "blues",
    "country",
    "reggae",
    "hip-hop",
    "hip hop",
    "rap",
    "funk",
    "k-pop",
    "electronica",
    "metal",
    "latin",
    "world",
    "disco",
  ],
  energetic: [
    "dance",
    "edm",
    "house",
    "techno",
    "trance",
    "drum & bass",
    "drum and bass",
    "drum'n'bass",
    "dubstep",
    "hardstyle",
    "hardcore",
    "big room",
    "electro house",
    "dance & electronic",
    "punk",
    "punk rock",
    "heavy metal",
    "death metal",
    "thrash metal",
    "metalcore",
    "hard rock",
  ],
};

function normalizeGenre(genre: string): string {
  return genre
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

/**
 * Genre is a weak signal, not a measurement of the song's actual tempo or mood.
 * Unknown genres deliberately fall back to calm rather than aggressive flashing.
 */
export function getWaveMood(genre: string | null | undefined): WaveMood {
  if (!genre?.trim()) return "calm";

  const normalized = normalizeGenre(genre);

  for (const keyword of GENRE_GROUPS.energetic) {
    if (normalized.includes(normalizeGenre(keyword))) return "energetic";
  }

  for (const keyword of GENRE_GROUPS.calm) {
    if (normalized.includes(normalizeGenre(keyword))) return "calm";
  }

  for (const keyword of GENRE_GROUPS.balanced) {
    if (normalized.includes(normalizeGenre(keyword))) return "balanced";
  }

  return "calm";
}
