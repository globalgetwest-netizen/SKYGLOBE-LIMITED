interface SkyGlobeMarkProps {
  size?: number
  className?: string
}

export function SkyGlobeMark({ size = 40, className = '' }: SkyGlobeMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SkyGlobe"
      className={className}
    >
      <defs>
        <linearGradient id="sg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6D860" />
          <stop offset="0.5" stopColor="#C9A227" />
          <stop offset="1" stopColor="#8B6B14" />
        </linearGradient>
        <clipPath id="sg-clip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill="#0F2167" />
      <g clipPath="url(#sg-clip)" fill="none" stroke="#C9A227" strokeOpacity="0.28" strokeWidth="1">
        <line x1="4" y1="32" x2="96" y2="32" />
        <line x1="4" y1="50" x2="96" y2="50" />
        <line x1="4" y1="68" x2="96" y2="68" />
        <ellipse cx="50" cy="50" rx="15" ry="46" />
        <ellipse cx="50" cy="50" rx="32" ry="46" />
      </g>
      <path
        fill="url(#sg-gold)"
        d="M68 36c0-7.2-7.4-12-18-12-10.4 0-18 5.2-18 13.4 0 7.4 5.6 11.2 16.6 13.4l4 .8c5.4 1.1 7.4 2.4 7.4 5 0 3-3.2 5-8.2 5-5.6 0-9-2.2-9.4-6H30c.4 9 8 14.6 19.6 14.6 11.2 0 18.8-5.4 18.8-13.8 0-7.2-5-11-16-13.2l-4-.8c-5.6-1.1-8-2.4-8-5.2 0-2.9 3-4.8 7.6-4.8 5 0 8 2.1 8.4 5.6z"
      />
    </svg>
  )
}

export default SkyGlobeMark
