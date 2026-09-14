import React from 'react'

interface IconProps {
  size?: number
  className?: string
}

export default function ChevronDownIcon({ size = 20, className = '' }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7.5L10 12.5L15 7.5"/>
    </svg>
  )
}
