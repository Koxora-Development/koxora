// The approved Koxora mark. Kept identical to packages/ui/src/assets/logo.svg
// so the website, the studio and the application icon stay one brand.
export function Mark({ id = 'brand' }: { id?: string }) {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-gradient`}
          x1="5"
          y1="4"
          x2="63"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#BBA4FF" />
          <stop offset=".55" stopColor="#967FFF" />
          <stop offset="1" stopColor="#59DEEC" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="#1B1B35" />
      <path
        d="M17 14v36M47 14 17 44m15-17 15 23"
        stroke={`url(#${id}-gradient)`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="14" r="4" fill="#65E5EE" />
    </svg>
  );
}
