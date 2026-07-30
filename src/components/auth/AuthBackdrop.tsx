import { PiggyBank, TrendingUp, Wallet } from 'lucide-react'

export function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-500/10" />
      <div className="absolute -right-16 -bottom-32 h-96 w-96 rounded-full bg-brand-300/15 blur-3xl dark:bg-brand-600/10" />
      <Wallet className="absolute top-16 right-[8%] h-24 w-24 -rotate-12 text-brand-500/10 dark:text-brand-400/10" />
      <TrendingUp className="absolute bottom-24 left-[8%] h-20 w-20 rotate-6 text-brand-500/10 dark:text-brand-400/10" />
      <PiggyBank className="absolute right-[15%] bottom-1/3 hidden h-16 w-16 rotate-12 text-brand-500/10 md:block dark:text-brand-400/10" />
    </div>
  )
}
