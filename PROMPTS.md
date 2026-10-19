# PROMPTS.md — TrustVault AI Development Log

This file records each AI-assisted development session in chronological order.
Every entry documents what was requested, what was actually created, what was
verified, and any genuine problems found or corrections made.

---

## Entry 001 — 2026-10-19

### Task

Task 1: Project Foundation, Branding, and Design System.

### What Was Requested

The developer requested:
1. Inspection of the existing workspace (found empty).
2. Creation of the complete project scaffold for a Django + React TrustVault application.
3. Official branding: the supplied SVG logo saved to `brand/trustvault-logo.svg`.
4. Electric Mint + Carbon Black colour palette as centralised design tokens.
5. A reusable `TrustVaultLogo.tsx` React component with `useId()`-namespaced SVG masks.
6. Django 5.2 backend skeleton with SQLite for local development.
7. Vite + React + TypeScript frontend with Tailwind CSS.
8. Root documentation: `README.md`, `THREATS.md`, `.gitignore`, `.env.example`.
9. A minimal `App.tsx` demonstrating the design tokens — no fake data or fake buttons.

### What Was Actually Created

**Root:**
- `.gitignore` — excludes `.venv`, `node_modules`, `.env`, `media/`, `__pycache__`, etc.
- `.env.example` — placeholder values only, no real credentials.
- `README.md` — full setup guide, architecture overview, known limitations.
- `PROMPTS.md` — this file.
- `THREATS.md` — initial threat model.

**Brand:**
- `brand/trustvault-logo.svg` — original SVG saved verbatim from the prompt.

**Backend (`backend/`):**
- Django 5.2 project (`config` package) with `settings.py`, `urls.py`, `wsgi.py`, `asgi.py`.
- `requirements.txt` with pinned versions.
- `manage.py`.
- `apps/` directory created for future application modules.

**Frontend (`frontend/`):**
- Vite + React + TypeScript project created via `npx create-vite`.
- Tailwind CSS 3 installed with `tv-*` named colour tokens in `tailwind.config.js`.
- `src/index.css` with CSS custom properties for all brand colours, typography (Inter), spacing, and border-radius tokens.
- `src/components/TrustVaultLogo.tsx` — inline SVG component, `useId()` mask namespacing.
- `public/favicon.svg` — simplified padlock crop for browser tab icon.
- `src/App.tsx` — minimal token-demonstration page, no functional screens.
- `index.html` — correct title, Inter font, meta description.

### Checks Performed

- `node --version`, `npm --version`, `python --version`, `git --version` — all confirmed.
- `npm install` in `frontend/` — dependencies installed.
- `npm run build` in `frontend/` — production build verified.
- `python -m venv .venv` in project root — virtual environment created.
- `pip install -r requirements.txt` in `backend/` — dependencies installed.
- `python manage.py check` — ran and reported results (see report).
- `python manage.py migrate` — initial migrations applied to SQLite.

### Problems Found

- *(To be filled in after execution — any genuine errors will be recorded here.)*

### Corrections Made

- *(To be filled in after execution.)*

### Git Commit Reference

- *(No commit exists yet. The developer must run `git init` and make the first commit.)*

---

*Future entries will be added here as development continues.*
