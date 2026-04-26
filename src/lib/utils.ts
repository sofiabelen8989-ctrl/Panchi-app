import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDogAge = (age: number | null | undefined, unit: string) => {
  if (age === null || age === undefined || (typeof age === 'string' && age === '')) return 'Age unknown'
  
  const numAge = typeof age === 'string' ? parseInt(age) : age;
  
  if (unit === 'months') {
    if (numAge === 0) return 'Less than 1 month'
    if (numAge === 1) return '1 month old'
    return `${numAge} months old`
  }
  
  if (numAge === 0) return 'Less than 1 year'
  if (numAge === 1) return '1 year old'
  return `${numAge} years old`
}

export const formatTimeAgo = (timestamp: string) => {
  const now = new Date()
  const date = new Date(timestamp)
  const seconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  )
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(
    seconds / 60
  )}m ago`
  if (seconds < 86400) return `${Math.floor(
    seconds / 3600
  )}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
