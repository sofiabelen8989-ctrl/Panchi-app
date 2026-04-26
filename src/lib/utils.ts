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
