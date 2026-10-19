/**
 * App.tsx — TrustVault design system foundation demo
 *
 * This is a minimal demonstration of the design tokens and logo component.
 * It is NOT a functional dashboard. No fake data. No fake action buttons.
 *
 * This file will be replaced by the real application routing and layout
 * once authentication and core features are implemented.
 */

import TrustVaultLogo from './components/TrustVaultLogo'

// ── Colour token display helper ───────────────────────────────────────────────

interface SwatchProps {
  name: string
  hex: string
  cssVar: string
  usage: string
}

function Swatch({ name, hex, cssVar, usage }: SwatchProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-md border border-tv-border shrink-0 mt-0.5"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-tv-text leading-tight">{name}</p>
        <p className="text-xs text-tv-muted font-mono mt-0.5">{hex}</p>
        <p className="text-xs text-tv-muted font-mono">{cssVar}</p>
        <p className="text-xs text-tv-muted mt-1 leading-snug">{usage}</p>
      </div>
    </div>
  )
}

// ── Colour palette definition ─────────────────────────────────────────────────

const PALETTE: SwatchProps[] = [
  {
    name: 'Carbon Black',
    hex: '#101312',
    cssVar: '--color-tv-carbon',
    usage: 'Main application background',
  },
  {
    name: 'Dark Charcoal',
    hex: '#191F1C',
    cssVar: '--color-tv-charcoal',
    usage: 'Cards, sidebars, panels, dialogs',
  },
  {
    name: 'Electric Mint',
    hex: '#57F2B3',
    cssVar: '--color-tv-mint',
    usage: 'Primary buttons, selected nav, focus indicators',
  },
  {
    name: 'Soft Mint',
    hex: '#A2FFD6',
    cssVar: '--color-tv-mint-soft',
    usage: 'Secondary accents, decorative highlights',
  },
  {
    name: 'Off-white',
    hex: '#F3F7F4',
    cssVar: '--color-tv-text',
    usage: 'Primary text on dark surfaces',
  },
  {
    name: 'Muted Grey',
    hex: '#A4AEA8',
    cssVar: '--color-tv-muted',
    usage: 'Secondary text, descriptions, labels',
  },
  {
    name: 'Dark Grey-Green',
    hex: '#303A34',
    cssVar: '--color-tv-border',
    usage: 'Borders, dividers, subtle outlines',
  },
  {
    name: 'Soft Red',
    hex: '#FF6B75',
    cssVar: '--color-tv-error',
    usage: 'Errors, denied access, destructive actions',
  },
  {
    name: 'Warm Amber',
    hex: '#FFC66D',
    cssVar: '--color-tv-warning',
    usage: 'Warnings, actions requiring attention',
  },
]

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <div className="min-h-screen bg-tv-carbon text-tv-text font-sans">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <header className="border-b border-tv-border bg-tv-charcoal">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <TrustVaultLogo size={28} color="mint" aria-label="TrustVault" />
          <span className="text-sm font-semibold text-tv-text tracking-tight">
            TrustVault
          </span>
          <span className="ml-auto text-xs text-tv-muted">
            Design System Foundation
          </span>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="mb-16" aria-labelledby="hero-heading">
          <div className="flex items-center gap-5 mb-6">
            <TrustVaultLogo size={64} color="mint" aria-label="TrustVault logo — mint" />
            <TrustVaultLogo size={64} color="white" aria-label="TrustVault logo — off-white" />
          </div>
          <h1 id="hero-heading" className="text-3xl font-semibold text-tv-text mb-2">
            TrustVault
          </h1>
          <p className="text-tv-muted text-base">
            Secure Documents. Verified Access.
          </p>
          <p className="text-tv-muted text-sm mt-3 max-w-lg leading-relaxed">
            Enterprise document security and sharing platform. This page demonstrates
            the design system foundation. No functional screens exist yet — they will
            be built incrementally in subsequent tasks.
          </p>
        </section>

        <hr className="divider mb-12" />

        {/* ── Logo variants ──────────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="logo-heading">
          <p className="section-title mb-4" id="logo-heading">Logo variants</p>
          <div className="card">
            <div className="flex flex-wrap items-end gap-8">
              {/* Mint on dark — primary usage */}
              <div className="flex flex-col items-center gap-2">
                <TrustVaultLogo size={48} color="mint" />
                <span className="text-xs text-tv-muted">Mint / 48px</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <TrustVaultLogo size={32} color="mint" />
                <span className="text-xs text-tv-muted">Mint / 32px</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <TrustVaultLogo size={20} color="mint" />
                <span className="text-xs text-tv-muted">Mint / 20px</span>
              </div>
              {/* Off-white variant */}
              <div className="flex flex-col items-center gap-2">
                <TrustVaultLogo size={48} color="white" />
                <span className="text-xs text-tv-muted">White / 48px</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <TrustVaultLogo size={32} color="white" />
                <span className="text-xs text-tv-muted">White / 32px</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Colour palette ─────────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="palette-heading">
          <p className="section-title mb-4" id="palette-heading">Colour palette</p>
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PALETTE.map((swatch) => (
                <Swatch key={swatch.cssVar} {...swatch} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Typography ─────────────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="type-heading">
          <p className="section-title mb-4" id="type-heading">Typography — Inter</p>
          <div className="card space-y-3">
            <p className="text-3xl font-semibold text-tv-text">Heading 1 — Page Title</p>
            <p className="text-2xl font-semibold text-tv-text">Heading 2 — Section Title</p>
            <p className="text-xl font-semibold text-tv-text">Heading 3 — Subsection</p>
            <p className="text-lg font-medium text-tv-text">Heading 4 — Card Title</p>
            <hr className="divider" />
            <p className="text-base text-tv-text">
              Body text — primary. Used for most readable content across the interface.
            </p>
            <p className="text-sm text-tv-muted">
              Body text — secondary / muted. Used for descriptions, labels, and supporting detail.
            </p>
            <p className="text-xs text-tv-muted font-mono">
              Monospace — file paths, IDs, audit references, code snippets.
            </p>
          </div>
        </section>

        {/* ── Buttons ────────────────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="btn-heading">
          <p className="section-title mb-4" id="btn-heading">Buttons</p>
          <div className="card flex flex-wrap gap-3 items-center">
            <button type="button" className="btn-primary">Primary action</button>
            <button type="button" className="btn-secondary">Secondary</button>
            <button type="button" className="btn-danger">Destructive</button>
            <button type="button" className="btn-primary" disabled>Disabled</button>
          </div>
        </section>

        {/* ── Badges ─────────────────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="badge-heading">
          <p className="section-title mb-4" id="badge-heading">Status badges</p>
          <div className="card flex flex-wrap gap-3 items-center">
            <span className="badge badge-success">Verified</span>
            <span className="badge badge-error">Access Denied</span>
            <span className="badge badge-warning">Pending Review</span>
            <span className="badge badge-neutral">Inactive</span>
          </div>
          <p className="text-xs text-tv-muted mt-3">
            Note: these badges indicate design states only. Real status values
            will be driven by backend data in future tasks.
          </p>
        </section>

        {/* ── Form controls ──────────────────────────────────────────────── */}
        <section className="mb-12" aria-labelledby="form-heading">
          <p className="section-title mb-4" id="form-heading">Form controls</p>
          <div className="card max-w-sm space-y-4">
            <div>
              <label htmlFor="demo-input" className="form-label">Document name</label>
              <input
                id="demo-input"
                type="text"
                className="form-input"
                placeholder="e.g. Q4 Financial Report"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="demo-select" className="form-label">Access level</label>
              <select id="demo-select" className="form-input" disabled>
                <option>Read only</option>
                <option>Read and edit</option>
              </select>
            </div>
          </div>
        </section>

        <hr className="divider mb-8" />

        {/* ── Status note ────────────────────────────────────────────────── */}
        <section aria-labelledby="status-heading">
          <p className="section-title mb-3" id="status-heading">Implementation status</p>
          <div className="card max-w-2xl space-y-2">
            {[
              ['Design tokens', 'Complete'],
              ['Brand logo component', 'Complete'],
              ['Favicon', 'Complete'],
              ['Authentication', 'Not started'],
              ['Document management', 'Not started'],
              ['Audit logs', 'Not started'],
              ['Access management', 'Not started'],
            ].map(([feature, status]) => (
              <div key={feature} className="flex justify-between items-center py-1.5 border-b border-tv-border last:border-0">
                <span className="text-sm text-tv-text">{feature}</span>
                <span className={`badge ${
                  status === 'Complete'
                    ? 'badge-success'
                    : 'badge-neutral'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-tv-border mt-16">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center">
          <p className="text-xs text-tv-muted">
            TrustVault — Design System Foundation · Task 1
          </p>
        </div>
      </footer>

    </div>
  )
}

export default App
