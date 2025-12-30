'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const router = useRouter()
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }
  
  return (
    <Link 
      href="/" 
      className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className} cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={(e) => {
        e.preventDefault()
        router.push('/')
      }}
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses[size]} text-blue-600`}
      >
        {/* Simple city/building icon */}
        <path 
          d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v0M9 13v0M9 17v0M15 13v0M15 17v0" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  )
}

