interface NoriaMarkProps {
  size?: number
  className?: string
  animated?: boolean
}

export function NoriaMark({ size = 40, className = '', animated = false }: NoriaMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NORIA"
      className={`${animated ? 'noria-animated' : ''} ${className}`}
    >
      <defs>
        <linearGradient id="noria-grad" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#F5A623" />
          <stop offset="0.35" stopColor="#F2701D" />
          <stop offset="0.7" stopColor="#1E6BFF" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#noria-grad)"
        d="M50 2 C50 28 72 50 98 50 C72 50 50 72 50 98 C50 72 28 50 2 50 C28 50 50 28 50 2 Z"
      />
    </svg>
  )
}

export default NoriaMark
