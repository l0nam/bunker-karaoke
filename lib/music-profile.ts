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
    "electronic",
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


export interface WaveColors {
  mainHueMin: number;
  mainHueRange: number;
  warmHueMin: number;
  warmHueRange: number;
  accentHueMin: number;
  accentHueRange: number;
}

const DEFAULT_WAVE_COLORS: WaveColors = {
  mainHueMin: 286,
  mainHueRange: 48,
  warmHueMin: 350,
  warmHueRange: 34,
  accentHueMin: 318,
  accentHueRange: 18,
};

const GENRE_WAVE_COLORS: {
  keywords: string[];
  colors: WaveColors;
}[] = [
  {
    keywords: ["hardbass", "hard bass", "hardstyle", "gabber", "hardcore"],
    colors: {
      mainHueMin: 0,
      mainHueRange: 16,
      warmHueMin: 24,
      warmHueRange: 18,
      accentHueMin: 178,
      accentHueRange: 22,
    },
  },
  {
    keywords: [
      "lyrical", "lyric", "ballad", "romantic", "slow",
      "лирика", "лирическая", "лирический", "баллада",
      "ambient", "classical", "soundtrack", "instrumental",
      "new age", "acoustic", "folk", "singer songwriter",
      "lullaby", "meditation", "easy listening",
    ],
    colors: {
      mainHueMin: 190,
      mainHueRange: 18,
      warmHueMin: 215,
      warmHueRange: 20,
      accentHueMin: 250,
      accentHueRange: 20,
    },
  },
  {
    keywords: [
      "techno", "trance", "house", "electronic", "electronica",
      "edm", "dance", "drum and bass", "drum bass", "dubstep", "rave",
    ],
    colors: {
      mainHueMin: 170,
      mainHueRange: 22,
      warmHueMin: 190,
      warmHueRange: 22,
      accentHueMin: 270,
      accentHueRange: 20,
    },
  },
  {
    keywords: [
      "rock", "metal", "punk", "grunge", "heavy metal",
      "death metal", "thrash metal", "metalcore", "hard rock",
    ],
    colors: {
      mainHueMin: 0,
      mainHueRange: 18,
      warmHueMin: 28,
      warmHueRange: 18,
      accentHueMin: 275,
      accentHueRange: 22,
    },
  },
  {
    keywords: [
      "hip hop", "rap", "r&b", "soul", "jazz", "funk",
      "reggae", "blues",
    ],
    colors: {
      mainHueMin: 265,
      mainHueRange: 22,
      warmHueMin: 315,
      warmHueRange: 22,
      accentHueMin: 185,
      accentHueRange: 18,
    },
  },
  {
    keywords: ["pop", "disco", "k-pop", "latin", "country", "alternative", "indie"],
    colors: {
      mainHueMin: 315,
      mainHueRange: 22,
      warmHueMin: 35,
      warmHueRange: 20,
      accentHueMin: 275,
      accentHueRange: 20,
    },
  },
];

/** Возвращает оттенки только для существующего анимированного переливания. */
export function getWaveColors(
  genre: string | null | undefined,
): WaveColors {
  if (!genre?.trim()) return DEFAULT_WAVE_COLORS;

  const normalized = normalizeGenre(genre);
  const match = GENRE_WAVE_COLORS.find(({ keywords }) =>
    keywords.some((keyword) =>
      normalized.includes(normalizeGenre(keyword)),
    ),
  );

  return match?.colors ?? DEFAULT_WAVE_COLORS;
}
