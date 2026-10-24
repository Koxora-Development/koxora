// Schematic drawings, never screenshots. The collaboration drawing is always
// rendered with a visible concept badge by its caller.
export function LocalFirstVisual() {
  return (
    <svg
      className="figure-art"
      viewBox="0 0 400 300"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="lf-stroke"
          x1="0"
          y1="0"
          x2="400"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#BBA4FF" />
          <stop offset="1" stopColor="#59DEEC" />
        </linearGradient>
      </defs>
      <rect
        x="70"
        y="60"
        width="260"
        height="160"
        rx="14"
        className="art-panel"
      />
      <rect
        x="70"
        y="60"
        width="260"
        height="30"
        rx="14"
        className="art-panel-head"
      />
      <rect
        x="150"
        y="225"
        width="100"
        height="10"
        rx="5"
        className="art-panel"
      />
      <path d="M110 150h60M110 170h90" className="art-line" />
      <rect
        x="104"
        y="112"
        width="74"
        height="26"
        rx="6"
        stroke="url(#lf-stroke)"
        strokeWidth="2"
      />
      <rect
        x="226"
        y="112"
        width="74"
        height="26"
        rx="6"
        stroke="url(#lf-stroke)"
        strokeWidth="2"
      />
      <path d="M178 125h48" stroke="url(#lf-stroke)" strokeWidth="2" />
      <rect
        x="226"
        y="160"
        width="74"
        height="26"
        rx="6"
        stroke="url(#lf-stroke)"
        strokeWidth="2"
      />
      <path d="M141 138v22h85" className="art-line" />
      <g className="art-cloud">
        <path
          d="M318 44a16 16 0 0 1 1.6-31.9A21 21 0 0 1 360 18a13.5 13.5 0 0 1-2 26z"
          strokeWidth="2"
        />
        <path d="M312 10l54 44" strokeWidth="2" />
      </g>
    </svg>
  );
}
export function CollaborationConcept() {
  return (
    <svg
      className="figure-art"
      viewBox="0 0 400 300"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="cc-stroke"
          x1="0"
          y1="0"
          x2="400"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#BBA4FF" />
          <stop offset="1" stopColor="#59DEEC" />
        </linearGradient>
      </defs>
      <rect
        x="24"
        y="96"
        width="96"
        height="70"
        rx="10"
        className="art-panel"
      />
      <rect
        x="152"
        y="40"
        width="96"
        height="70"
        rx="10"
        className="art-panel"
      />
      <rect
        x="280"
        y="96"
        width="96"
        height="70"
        rx="10"
        className="art-panel"
      />
      <path
        d="M44 120h40M44 136h56M172 64h40M172 80h56M300 120h40M300 136h56"
        className="art-line"
      />
      <rect
        x="140"
        y="214"
        width="120"
        height="54"
        rx="12"
        stroke="url(#cc-stroke)"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <path d="M164 236h72M164 250h48" className="art-line" />
      <path
        d="M72 170v30q0 14 14 14h54M200 112v88M328 170v30q0 14-14 14h-54"
        stroke="url(#cc-stroke)"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
    </svg>
  );
}
