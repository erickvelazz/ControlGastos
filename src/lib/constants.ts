import type { CategoryType } from '@/types/database'

interface DefaultCategory {
  name: string
  type: CategoryType
  color: string
  icon: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Comida', type: 'expense', color: '#f59e0b', icon: 'UtensilsCrossed' },
  { name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'Car' },
  { name: 'Hogar', type: 'expense', color: '#8b5cf6', icon: 'Home' },
  { name: 'Entretenimiento', type: 'expense', color: '#ec4899', icon: 'Gamepad2' },
  { name: 'Salud', type: 'expense', color: '#ef4444', icon: 'HeartPulse' },
  { name: 'Suscripciones', type: 'expense', color: '#06b6d4', icon: 'Repeat' },
  { name: 'Ropa', type: 'expense', color: '#a855f7', icon: 'Shirt' },
  { name: 'Salario', type: 'income', color: '#10b981', icon: 'Wallet' },
  { name: 'Freelance', type: 'income', color: '#22c55e', icon: 'Laptop' },
]
