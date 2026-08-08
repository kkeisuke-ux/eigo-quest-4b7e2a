// 共通UIコンポーネント。
import type { ReactNode } from 'react'
import { navigate, useAppState, type Route } from '../state/store'
import { expToNext } from '../game/logic'
import { getSpecies } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { getOwned, getProfile } from '../storage/repo'
import { SoundButton } from './SoundButton'

/** コイン・スター・バディレベルの常設表示（全画面のTopBarに出る。仕様追加 2026-08-08） */
export function StatusChips() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const p = await getProfile(profileId)
    if (!p) return null
    const buddy = p.buddyId != null ? ((await getOwned(p.buddyId)) ?? null) : null
    return {
      coins: p.coins,
      stars: p.stars,
      buddy: buddy && getSpecies(buddy.speciesId) ? { speciesId: buddy.speciesId, stage: buddy.stage, level: buddy.level } : null,
    }
  }, [profileId])
  if (!data) return null
  return (
    <span className="status-chips">
      <CoinBadge coins={data.coins} />
      <StarBadge stars={data.stars} />
      {data.buddy && (
        <span className="badge buddy-chip">
          <CharacterSprite speciesId={data.buddy.speciesId} stage={data.buddy.stage} size={22} />
          <span>だんかい{data.buddy.stage + 1}</span>
        </span>
      )}
    </span>
  )
}

export function TopBar({ title, back, right }: { title: string; back?: Route; right?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <button className="btn btn-ghost btn-back" onClick={() => navigate(back)}>
          ← もどる
        </button>
      ) : (
        <span className="btn-back-space" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {right}
        <StatusChips />
        <SoundButton />
      </div>
    </header>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`card ${onClick ? 'card-tap' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: () => void }) {
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#f2c33c" stroke="#d9a520" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.2" fill="none" stroke="#d9a520" strokeWidth="1.6" />
    </svg>
  )
}

export function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.3l-5.8 3 1.1-6.4L2.6 9.3l6.5-.9z"
        fill="#f7d154"
        stroke="#d9a520"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CoinBadge({ coins }: { coins: number }) {
  return (
    <span className="badge">
      <CoinIcon />
      <span>{coins}</span>
    </span>
  )
}

export function StarBadge({ stars }: { stars: number }) {
  return (
    <span className="badge">
      <StarIcon />
      <span>{stars}</span>
    </span>
  )
}

export function Toasts() {
  const toasts = useAppState((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function LoadingView({ label = 'よみこみちゅう…' }: { label?: string }) {
  return <div className="loading-view">{label}</div>
}

export type WordChipState = 'none' | 'practiced' | 'mastered' | 'unknown'

export function WordChip({ text, state = 'none', onClick }: { text: string; state?: WordChipState; onClick?: () => void }) {
  return (
    <span className={`word-chip chip-${state} ${onClick ? 'chip-tap' : ''}`} onClick={onClick}>
      {text}
    </span>
  )
}

/** つぎの進化までのEXPバー（レベル=進化段階モデル） */
export function ExpBar({ stage, exp }: { stage: number; exp: number }) {
  const need = expToNext(stage)
  const pct = Math.min(100, Math.round((exp / need) * 100))
  return (
    <div className="expbar" title={`${exp}/${need}`}>
      <div className="expbar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title">{children}</h2>
}
