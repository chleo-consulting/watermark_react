# Add Watermark

A photo watermarking tool for architectural photography professionals. Upload images, apply customizable diagonal watermarks, and download the results.

## Features

- Diagonal semi-transparent watermark overlay (white, 50% opacity)
- Custom watermark text management (add, delete, select from saved list)
- Automatic font sizing proportional to image dimensions
- Batch processing for multiple images
- PNG and JPEG support with original quality preservation
- User authentication (sign up, login, logout)

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Runtime:** Bun
- **Styling:** Tailwind CSS 4
- **Database:** SQLite (via better-sqlite3)
- **Auth:** better-auth
- **Image Processing:** Sharp
- **Deployment:** Railway (Railpack builder)

## Getting Started

```bash
bun install              # Install dependencies
bun run db:init          # Initialize the database
bun dev                  # Start dev server on http://localhost:3000
```

## Production

```bash
bun run build            # Build for production
bun start                # Start production server
```
