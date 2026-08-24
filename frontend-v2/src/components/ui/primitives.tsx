import type { ReactNode } from 'react'

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="glass-panel rounded-xl p-5 mb-6">
      <p className="font-label text-xs font-medium text-muted-fg mb-1">{kicker}</p>
      <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {children ? <p className="mt-2 max-w-2xl text-muted-fg text-sm leading-relaxed">{children}</p> : null}
    </header>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" role="status" aria-live="polite">
      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      {label ? <p className="font-label text-xs text-muted-fg">{label}</p> : <span className="sr-only">Loading</span>}
    </div>
  )
}

export function InlineError({ message }: { message: string }) {
  return (
    <p className="mt-3 text-sm text-error" role="alert">
      {message}
    </p>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-16 text-center text-muted-fg border border-dashed border-border rounded-lg">{children}</p>
}

export function Stat({ label, value, hint, highlight }: { label: string; value: ReactNode; hint?: ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl glass-panel p-4 ${highlight ? 'border-primary' : ''}`}>
      <p className="font-label text-[11px] font-medium text-muted-fg">{label}</p>
      <p className={`mt-1 font-headline text-2xl font-extrabold tracking-tight ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-fg">{hint}</p> : null}
    </div>
  )
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className="font-label text-[11px] font-medium text-muted-fg">
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full min-h-11 rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-fg focus:outline-none cursor-text'

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg bg-primary text-on-primary font-headline text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

export const btnGhost =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg border border-border bg-transparent text-foreground font-headline text-sm font-bold cursor-pointer hover:bg-muted transition-colors duration-200'

export function PosBadge({ pos }: { pos: string }) {
  return (
    <span className="inline-flex items-center font-label text-[10px] uppercase tracking-wide rounded border border-border px-1.5 py-0.5 text-muted-fg">
      {pos}
    </span>
  )
}

export function FdrBadge({ fdr, compact }: { fdr: number; compact?: boolean }) {
  const tone =
    fdr <= 2
      ? 'bg-secondary text-white dark:text-on-turf'
      : fdr === 3
        ? 'bg-muted text-foreground'
        : fdr === 4
          ? 'bg-primary text-on-primary'
          : 'bg-error text-white dark:text-on-danger'
  return (
    <span className={`inline-flex items-center justify-center font-label text-[10px] font-semibold rounded ${compact ? 'min-w-6 h-6' : 'px-2 py-0.5'} ${tone}`}>
      {compact ? fdr : `FDR ${fdr}`}
    </span>
  )
}

export function Delta({ value }: { value: number }) {
  const up = value > 0
  return (
    <span className={`font-label text-sm ${up ? 'text-secondary' : value < 0 ? 'text-error' : 'text-muted-fg'}`}>
      {up ? '+' : ''}
      {value}
    </span>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="rounded-xl glass-panel overflow-x-auto">{children}</div>
}

export const thClass = 'sticky top-0 bg-muted px-4 py-3 text-left font-label text-[11px] font-medium text-muted-fg border-b border-border'
export const tdClass = 'px-4 py-3 align-middle border-b border-border'
export const rowClass = 'hover:bg-muted/60'
