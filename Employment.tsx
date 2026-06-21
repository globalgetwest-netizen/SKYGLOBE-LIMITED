import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'primary' | 'gold' | 'success' | 'warning' | 'error'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface text-text border-border',
  primary: 'bg-primary/10 text-primary border-primary/20',
  gold: 'bg-gold/10 text-gold-dark border-gold/20',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-3 py-1 text-[13px] font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export default Badge
