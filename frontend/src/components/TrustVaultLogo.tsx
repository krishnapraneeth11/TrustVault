/**
 * TrustVaultLogo — Official brand mark component
 *
 * Renders the TrustVault SVG logo as inline JSX so that `currentColor`
 * correctly inherits the parent's CSS `color` property for theme-aware
 * colouring (Electric Mint or Off-white).
 *
 * SVG mask IDs are namespaced with React's useId() to prevent collisions
 * when multiple logo instances appear on the same page.
 *
 * Usage:
 *   <TrustVaultLogo size={40} color="mint" />
 *   <TrustVaultLogo size={24} color="white" className="opacity-80" />
 */

import { useId } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type LogoColor = 'mint' | 'white' | 'current'

interface TrustVaultLogoProps {
  /** Width and height in pixels (logo is square). Default: 40 */
  size?: number
  /**
   * Colour variant:
   *  - 'mint'    → Electric Mint (#57F2B3) — for use on dark backgrounds
   *  - 'white'   → Off-white (#F3F7F4) — for monochrome or light contexts
   *  - 'current' → inherits CSS `color` from the parent element
   * Default: 'mint'
   */
  color?: LogoColor
  /** Additional CSS class names applied to the root <svg> element. */
  className?: string
  /** Accessible label. Defaults to "TrustVault". */
  'aria-label'?: string
}

// ── Colour map ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<LogoColor, string> = {
  mint:    '#57F2B3',
  white:   '#F3F7F4',
  current: 'currentColor',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TrustVaultLogo({
  size = 40,
  color = 'mint',
  className = '',
  'aria-label': ariaLabel = 'TrustVault',
}: TrustVaultLogoProps) {
  /**
   * useId() produces a stable, unique string per component instance.
   * We use it to namespace the SVG mask IDs so that multiple <TrustVaultLogo>
   * elements on the same page never share mask IDs, which would break
   * the transparent gap and keyhole effects.
   */
  const uid = useId()
  const gapId    = `tvGap-${uid}`
  const keyholeId = `tvKeyhole-${uid}`

  const fill = COLOR_MAP[color]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 420"
      width={size}
      height={size}
      color={fill}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>TrustVault</title>
      <desc>
        A monitor screen with a verified check badge inside it and a padlock
        replacing its top-right corner.
      </desc>

      <defs>
        {/*
          Cuts a real, transparent gap in the monitor frame around the padlock,
          so the lock is not merely painted on top of the frame.
        */}
        <mask id={gapId} maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="420">
          <rect width="420" height="420" fill="#fff" />
          <rect x="250" y="0" width="170" height="222" fill="#000" />
        </mask>

        {/* Punches the keyhole out of the padlock body. */}
        <mask id={keyholeId} maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="420">
          <rect width="420" height="420" fill="#fff" />
          <rect x="322" y="134" width="26" height="46" rx="13" fill="#000" />
        </mask>
      </defs>

      {/*
        Everything paints with currentColor.
        The `color` prop on the <svg> sets the CSS color property,
        which is then inherited by all currentColor references below.
      */}
      <g fill="currentColor">
        {/* 1. Monitor frame — mask removes its top-right corner for the padlock */}
        <rect
          mask={`url(#${gapId})`}
          x="16" y="16"
          width="388" height="290"
          rx="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinejoin="round"
        />

        {/* 2. Stand: flared neck + flat base with rounded ends */}
        <path d="M140 300 H280 L289 392 H131 Z" />
        <rect x="91" y="391" width="238" height="29" rx="14" />

        {/* 3. Verified badge: ring broken at upper right… */}
        <path
          d="M152.9 105 A67 67 0 1 0 194.7 150.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="30"
          strokeLinecap="round"
        />
        {/* …with the check's long arm reaching into that break */}
        <path
          d="M88 178 L120 210 L180 146"
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 4. Padlock: shackle, then a solid body with a transparent keyhole */}
        <path
          d="M295 100 V60 A40 40 0 0 1 375 60 V100"
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="round"
        />
        <rect
          mask={`url(#${keyholeId})`}
          x="252" y="94"
          width="168" height="126"
          rx="30"
        />
      </g>
    </svg>
  )
}

export default TrustVaultLogo
