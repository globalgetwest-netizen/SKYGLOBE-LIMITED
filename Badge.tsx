'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-white rounded-card p-6 shadow-card border border-border',
        hover && 'hover:shadow-card-hover transition-shadow',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export default Card
