import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/nav'

const MORE_PATHS = ['/more', '/categories', '/settings']

export function BottomNav() {
  const { pathname } = useLocation()

  const isItemActive = (to: string): boolean => {
    if (to === '/') return pathname === '/'
    if (to === '/more') return MORE_PATHS.some((path) => pathname.startsWith(path))
    return pathname.startsWith(to)
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = isItemActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors duration-200',
                isActive ? 'text-brand-600' : 'text-muted-foreground',
              )}
            >
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span
                  className={cn(
                    'absolute inset-0 rounded-full transition-all duration-200',
                    isActive ? 'scale-100 bg-brand-500/15 opacity-100' : 'scale-75 opacity-0',
                  )}
                />
                <item.icon className="relative h-5 w-5" />
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
