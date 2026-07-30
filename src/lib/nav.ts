import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Landmark,
  CalendarClock,
  Settings,
  MoreHorizontal,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', to: '/', icon: LayoutDashboard },
  { label: 'Movs', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Deudas', to: '/debts', icon: Landmark },
  { label: 'Suscripciones', to: '/subscriptions', icon: CalendarClock },
  { label: 'Más', to: '/more', icon: MoreHorizontal },
]

export const SIDEBAR_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transacciones', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Categorías', to: '/categories', icon: Tags },
  { label: 'Deudas', to: '/debts', icon: Landmark },
  { label: 'Suscripciones', to: '/subscriptions', icon: CalendarClock },
  { label: 'Configuración', to: '/settings', icon: Settings },
]
