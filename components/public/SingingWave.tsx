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
      <div className="singing-wave__glow singing-wave__glow--coral" />
      <div className="singing-wave__glow singing-wave__glow--pink" />
      <div className="singing-wave__glow singing-wave__glow--violet" />

      <svg
        className="singing-wave__lines"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
      >
        <g className="singing-wave__ribbon singing-wave__ribbon--one">
          <path className="singing-wave__line singing-wave__line--pink singing-wave__line--glow" d="M -80 160 C 110 90 170 34 350 92 S 600 198 780 120 S 1120 28 1520 110" />
          <path className="singing-wave__line singing-wave__line--pink" d="M -80 160 C 110 90 170 34 350 92 S 600 198 780 120 S 1120 28 1520 110" />
        </g>

        <g className="singing-wave__ribbon singing-wave__ribbon--two">
          <path className="singing-wave__line singing-wave__line--violet singing-wave__line--glow" d="M -80 80 C 130 150 260 190 430 118 S 690 20 860 92 S 1210 178 1520 62" />
          <path className="singing-wave__line singing-wave__line--violet" d="M -80 80 C 130 150 260 190 430 118 S 690 20 860 92 S 1210 178 1520 62" />
        </g>

        <g className="singing-wave__ribbon singing-wave__ribbon--three">
          <path className="singing-wave__line singing-wave__line--coral singing-wave__line--glow" d="M -60 188 C 160 150 230 50 420 76 S 700 154 910 138 S 1240 22 1510 142" />
          <path className="singing-wave__line singing-wave__line--coral" d="M -60 188 C 160 150 230 50 420 76 S 700 154 910 138 S 1240 22 1510 142" />
        </g>
      </svg>
    </div>
  );
}