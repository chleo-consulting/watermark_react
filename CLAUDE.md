# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev              # Start development server (http://localhost:3000)
bun run build        # Build for production
bun run lint         # Run ESLint
bun start            # Start production server
bun run db:init      # Initialize the database
./scripts/backup.sh  # Download a SQLite backup (requires BACKUP_SECRET & APP_URL)
```

## Environment Variables

- `BACKUP_SECRET` — Bearer token for `GET /api/admin/backup` (database download endpoint)

## Architecture

This is a Next.js 16 application using the App Router pattern with:

- **Package Manager**: Bun (bun.lock present)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS 4 with PostCSS
- **React**: Version 19
- **Deployment**: Railway (Railpack builder, config in `railpack.json`)

### Key Dependencies

- `better-auth` - Authentication library
- `better-sqlite3` - SQLite database
- `sharp` - Image processing (watermark rendering)
- `zod` - Schema validation

### Project Structure

- `app/` - Next.js App Router pages and layouts
- `app/globals.css` - Tailwind `@theme` custom color tokens
- `lib/` - Shared utilities (auth, db)
- `scripts/` - Database initialization
- `@/*` path alias maps to project root

### Design System

Custom color palette defined in `app/globals.css` via Tailwind CSS 4 `@theme` directive:

| Token | Role |
|---|---|
| `dark` | Body text, headings (`#2D2D2D`) |
| `navy` | Primary accent — buttons, links, avatar |
| `steel` | Secondary accent — focus rings, icons |
| `mist` | Borders, placeholders, subtle hints |
| `cream` | Page background, input backgrounds |

To change the palette, only edit `globals.css` — all components reference token names, not hex values.

### Layout

- **Header**: Sticky with `backdrop-blur`, app title left, user avatar + logout right
- **Dashboard**: 2-column grid (`320px` sidebar + `1fr` workspace) on `lg:`, stacks on mobile
- **Auth pages**: Centered card (`max-w-sm`)
