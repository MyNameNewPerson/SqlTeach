import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pointer-events-auto min-w-0 rounded-lg border border-slate-800 bg-slate-950/70 shadow-xl shadow-black/10', className)} {...props} />
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'border-teal-400/40 bg-teal-400 text-slate-950 hover:bg-teal-300 active:bg-teal-500',
    secondary: 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 active:bg-slate-700',
    ghost: 'border-transparent bg-transparent text-slate-300 hover:bg-slate-900 hover:text-white active:bg-slate-800',
    danger: 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 active:bg-rose-500/30',
  }

  return (
    <button
      className={cn(
        'pointer-events-auto inline-flex min-h-10 max-w-full min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-sm font-semibold transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'teal' | 'amber' | 'rose' | 'blue'
}) {
  const tones = {
    slate: 'border-slate-700 bg-slate-900 text-slate-300',
    teal: 'border-teal-400/30 bg-teal-400/10 text-teal-200',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    blue: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  }

  return <span className={cn('inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium', tones[tone])}>{children}</span>
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${value}%` }} />
    </div>
  )
}

export function SqlCode({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-slate-800 bg-slate-950 p-4 text-left text-sm leading-6 text-slate-100 md:whitespace-pre md:break-normal">
      <code>{children}</code>
    </pre>
  )
}
