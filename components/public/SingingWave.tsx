"use client";

type Props = {
  active: boolean;
};

export function SingingWave({ active }: Props) {
  return (
    <div
      className="singing-wave"
      data-active={active ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="singing-wave__background" />
      <div className="singing-wave__glow singing-wave__glow--orange" />
      <div className="singing-wave__glow singing-wave__glow--magenta" />
      <div className="singing-wave__glow singing-wave__glow--violet" />

      <svg
        className="singing-wave__svg"
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="singing-wave-pink" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.05" />
            <stop offset="24%" stopColor="#f472b6" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#e879f9" stopOpacity="0.9" />
            <stop offset="82%" stopColor="#c084fc" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="singing-wave-warm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.05" />
            <stop offset="32%" stopColor="#fb7185" stopOpacity="0.9" />
            <stop offset="58%" stopColor="#f97316" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="singing-wave-purple" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.05" />
            <stop offset="48%" stopColor="#d946ef" stopOpacity="0.9" />
            <stop offset="78%" stopColor="#8b5cf6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <g className="singing-wave__ribbon singing-wave__ribbon--one">
          <path d="M -80 205 C 110 150 165 26 350 66 S 625 260 800 160 S 1135 16 1520 92" fill="none" stroke="url(#singing-wave-pink)" strokeWidth="34" opacity="0.34" className="singing-wave__blur" />
          <path d="M -80 205 C 110 150 165 26 350 66 S 625 260 800 160 S 1135 16 1520 92" fill="none" stroke="url(#singing-wave-pink)" strokeWidth="2.5" />
        </g>

        <g className="singing-wave__ribbon singing-wave__ribbon--two">
          <path d="M -80 95 C 130 175 250 280 445 205 S 700 14 885 94 S 1190 270 1520 166" fill="none" stroke="url(#singing-wave-purple)" strokeWidth="40" opacity="0.3" className="singing-wave__blur" />
          <path d="M -80 95 C 130 175 250 280 445 205 S 700 14 885 94 S 1190 270 1520 166" fill="none" stroke="url(#singing-wave-purple)" strokeWidth="2.5" />
        </g>

        <g className="singing-wave__ribbon singing-wave__ribbon--three">
          <path d="M -80 260 C 140 220 245 92 430 120 S 715 245 920 174 S 1220 76 1520 126" fill="none" stroke="url(#singing-wave-warm)" strokeWidth="32" opacity="0.25" className="singing-wave__blur" />
          <path d="M -80 260 C 140 220 245 92 430 120 S 715 245 920 174 S 1220 76 1520 126" fill="none" stroke="url(#singing-wave-warm)" strokeWidth="2" />
        </g>
      </svg>
      <div className="singing-wave__tint" />
    </div>
  );
}