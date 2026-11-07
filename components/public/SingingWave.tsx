"use client";

type Props = {
  active: boolean;
};

const ROOT_STYLE: CSSProperties = {
  position: "fixed",
  zIndex: 20,
  left: 0,
  right: 0,
  bottom: 0,
  height: "clamp(8rem, 24vh, 14rem)",
  overflow: "hidden",
  pointerEvents: "none",
  isolation: "isolate",
  WebkitMaskImage:
    "linear-gradient(to top, #000 0%, #000 38%, transparent 100%)",
  maskImage:
    "linear-gradient(to top, #000 0%, #000 38%, transparent 100%)",
};

const LINE_STYLE = {
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SingingWave({ active }: Props) {
  return (
    <div
      className="singing-wave"
      data-active={active ? "true" : "false"}
      aria-hidden="true"
      style={{
        ...ROOT_STYLE,
        opacity: active ? 1 : 0,
        visibility: active ? "visible" : "hidden",
        transform: active ? "translate3d(0, 0, 0)" : "translate3d(0, 24px, 0)",
        transition: "opacity 900ms ease, transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), visibility 900ms",
      }}
    >
      <div className="singing-wave__glow singing-wave__glow--coral" />
      <div className="singing-wave__glow singing-wave__glow--pink" />
      <div className="singing-wave__glow singing-wave__glow--violet" />

      <svg
        className="singing-wave__lines"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        <g className="singing-wave__ribbon singing-wave__ribbon--one">
          <path
            d="M -80 160 C 110 90 170 34 350 92 S 600 198 780 120 S 1120 28 1520 110"
            {...LINE_STYLE}
            stroke="#f472b6"
            strokeWidth="19"
            opacity="0.24"
            style={{ filter: "blur(9px)" }}
          />
          <path
            d="M -80 160 C 110 90 170 34 350 92 S 600 198 780 120 S 1120 28 1520 110"
            {...LINE_STYLE}
            stroke="#f472b6"
            strokeWidth="2.5"
          />
        </g>

        <g className="singing-wave__ribbon singing-wave__ribbon--two">
          <path
            d="M -80 80 C 130 150 260 190 430 118 S 690 20 860 92 S 1210 178 1520 62"
            {...LINE_STYLE}
            stroke="#c084fc"
            strokeWidth="19"
            opacity="0.24"
            style={{ filter: "blur(9px)" }}
          />
          <path
            d="M -80 80 C 130 150 260 190 430 118 S 690 20 860 92 S 1210 178 1520 62"
            {...LINE_STYLE}
            stroke="#c084fc"
            strokeWidth="2.5"
          />
        </g>

        <g className="singing-wave__ribbon singing-wave__ribbon--three">
          <path
            d="M -60 188 C 160 150 230 50 420 76 S 700 154 910 138 S 1240 22 1510 142"
            {...LINE_STYLE}
            stroke="#fb7185"
            strokeWidth="19"
            opacity="0.24"
            style={{ filter: "blur(9px)" }}
          />
          <path
            d="M -60 188 C 160 150 230 50 420 76 S 700 154 910 138 S 1240 22 1510 142"
            {...LINE_STYLE}
            stroke="#fb7185"
            strokeWidth="2.5"
          />
        </g>
      </svg>
    </div>
  );
}