# Technical Specification – Add Watermark

## 1. Overview

A photo watermarking tool designed for architectural photography professionals.

## What It Does

Add Watermark applies a professional diagonal watermark to your photos, protecting your work while maintaining visual appeal. Users can customize their watermark text from a personal list of saved texts. The default watermark text for new users is `<user_name> architecte`, derived from their account name.


### Core Features

**Upload an image to process watermark**
**Download the processed image**

**Custom Watermark Text**
Users can manage a personal list of watermark texts. A dropdown lets them pick which text to apply. They can add new texts and delete existing ones. When no saved texts exist, the default watermark is `<user_name> architecte` (derived from the user's `name` field).

**Diagonal Placement**
The watermark text runs elegantly from the bottom-left to the top-right corner of each photo, providing comprehensive coverage without obscuring key details.

**Semi-Transparent Overlay**
White text at 50% opacity ensures the watermark is clearly visible while remaining unobtrusive, preserving the impact of your architectural photography.

**Automatic Sizing**
The watermark scales proportionally to each photo's dimensions, ensuring consistent, professional results regardless of image size or resolution.

**Live Watermark Preview**
After uploading, a client-side preview renders the watermark as an SVG overlay on the first selected image — replicating the exact server-side formula (font size, angle, spacing). The preview updates instantly when the user changes the watermark text dropdown, requiring zero API calls.

**Batch Processing**
Process entire folders of photos at once, saving time when watermarking large project collections or portfolio archives.

**Original Quality Preservation**
High-quality JPEG output maintains the integrity of your original images, with minimal compression artifacts.

**Supported Formats:** PNG and JPEG input. Output is always high-quality JPEG or PNG depending on the input.

**User authentication (sign up, login, logout) via better-auth**

### Tech

- Next.js (App Router) + Bun runtime
- TypeScript
- TailwindCSS
- SQLite via Bun's SQLite client with raw SQL

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for uploading image and downloading output image and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (e.g., `data/app.db`) accessed via Bun's SQLite client
- **Auth:** better-auth integrated into Next.js (middleware + server helpers)

### 2.2 Application Layers

**Presentation layer**
- Next.js pages and components
- TailwindCSS for styling


**Data access layer**
- Raw SQL queries executed via Bun's SQLite client
- A small helper module for DB access

## 3. Functional Requirements

### 3.1 Authentication

Users can:
- Register (email + password, minimum validation)
- Log in / log out

Authentication state is accessible on server (for SSR) and on client (for protected UI).

### 3.2 Watermark Text Management

Users can:
- View their saved watermark texts in a dropdown selector
- Add a new watermark text to their personal list
- Delete an existing watermark text from their list
- When no saved texts exist, the default watermark text is `<user_name> architecte` (derived from the user's `name` field in the `user` table)


## 4. Non-Functional Requirements

**Reliability**
- Graceful handling of DB errors

**Maintainability**
- Type-safe APIs and DB types
- Modularized DB and auth helpers

**UX**
- Simple, minimal UI with keyboard-friendly editor

## 5. Data Model & Database Schema (SQLite)

### 5.1 Tables

#### better-auth Core Tables

better-auth manages its own tables for authentication. The following tables are required by better-auth:

**user**

```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each user (primary key) |
| name | TEXT | User's chosen display name |
| email | TEXT | User's email address for communication and login |
| emailVerified | INTEGER | Whether the user's email is verified (0 or 1) |
| image | TEXT | User's image URL (optional) |
| createdAt | TEXT | Timestamp of when the user account was created |
| updatedAt | TEXT | Timestamp of the last update to the user's information |

**session**

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each session (primary key) |
| userId | TEXT | The ID of the user (foreign key) |
| token | TEXT | The unique session token |
| expiresAt | TEXT | The time when the session expires |
| ipAddress | TEXT | The IP address of the device (optional) |
| userAgent | TEXT | The user agent information of the device (optional) |
| createdAt | TEXT | Timestamp of when the session was created |
| updatedAt | TEXT | Timestamp of when the session was updated |

**account**

```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  idToken TEXT,
  password TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each account (primary key) |
| userId | TEXT | The ID of the user (foreign key) |
| accountId | TEXT | The ID of the account as provided by SSO or equal to userId for credential accounts |
| providerId | TEXT | The ID of the provider (e.g., "credential", "google", "github") |
| accessToken | TEXT | The access token returned by the provider (optional) |
| refreshToken | TEXT | The refresh token returned by the provider (optional) |
| accessTokenExpiresAt | TEXT | The time when the access token expires (optional) |
| refreshTokenExpiresAt | TEXT | The time when the refresh token expires (optional) |
| scope | TEXT | The scope of the account returned by the provider (optional) |
| idToken | TEXT | The ID token returned from the provider (optional) |
| password | TEXT | The hashed password for email/password authentication (optional) |
| createdAt | TEXT | Timestamp of when the account was created |
| updatedAt | TEXT | Timestamp of when the account was updated |

**verification**

```sql
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each verification (primary key) |
| identifier | TEXT | The identifier for the verification request |
| value | TEXT | The value to be verified |
| expiresAt | TEXT | The time when the verification request expires |
| createdAt | TEXT | Timestamp of when the verification request was created |
| updatedAt | TEXT | Timestamp of when the verification request was updated |

#### Application Tables

**watermark_text**

```sql
CREATE TABLE watermark_text (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Unique identifier for each watermark text (primary key) |
| userId | TEXT | The ID of the user who owns this text (foreign key) |
| text | TEXT | The watermark text content |
| createdAt | TEXT | Timestamp of when the text was created |


## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize Bun SQLite client with DB file (`app.db`)
- Export helper functions such as:
  - `getDb()` – returns singleton DB connection
  - Utility wrappers for:
    - `query<T>(sql, params?): T[]`
    - `get<T>(sql, params?): T | undefined`
    - `run(sql, params?)`


## 7. API Design (Next.js Route Handlers)

### 7.1 Watermark Endpoint

`POST /api/watermark`

- Accepts `multipart/form-data` with one or more image files
- Accepts an optional `watermarkTextId` field; if absent, uses the default text (`<user_name> architecte`)
- Accepted MIME types: `image/png`, `image/jpeg`
- Max file size: **12 MB** per image
- Returns processed JPEG image(s) or PNG image(s)
- Requires authentication (session cookie)

### 7.2 Authentication Endpoint

`POST /api/auth/[...all]`

- better-auth catch-all route handler
- Handles sign-up, login, logout, and session management

### 7.3 Authentication Access

Implement a server helper from better-auth like `getCurrentUser()` or `getSession()`.

### 7.4 Watermark Texts Endpoint

`GET /api/watermark-texts`
- Returns the authenticated user's saved watermark texts
- Requires authentication (session cookie)

`POST /api/watermark-texts`
- Adds a new watermark text to the authenticated user's list
- Body: `{ "text": "..." }`
- Requires authentication (session cookie)

`DELETE /api/watermark-texts/:id`
- Deletes a watermark text by ID (must belong to the authenticated user)
- Requires authentication (session cookie)

## 8. File Storage

- Processed images are returned directly in the API response — **no server-side persistence**
- Uploaded files are held in memory only during processing and discarded immediately after

## 9. Image Processing

- **Library:** Sharp
- **Watermark algorithm:**
  - Diagonal text running bottom-left → top-right
  - Text color: white (`#FFFFFF`) at **50% opacity**
  - Font size proportional to image dimensions (scales automatically)
  - Default watermark text: `<user_name> architecte` (from the user's `name` field), or the user-selected text from their saved list
- Output format: JPEG (high quality)

## 10. Security

- **File size limit:** 12 MB per image, enforced server-side
- **Input validation:** verify MIME type (`image/png`, `image/jpeg`) before processing
- **Auth middleware:** `/api/watermark` requires a valid session — reject unauthenticated requests with 401
- **Rate limiting:** consider rate limiting per user to prevent abuse (future improvement)

## 11. UI Pages

- **Login** (`/login`) — email + password form
- **Sign Up** (`/signup`) — email + password + name form
- **Dashboard** (`/`) — protected page; watermark text dropdown selector (with add/delete management), upload area, live watermark preview (client-side SVG overlay on first image), file list showing name and size for each selected file, process button, download processed image(s)
- Basic layout: centered card-based UI, responsive, TailwindCSS styling

## 12. Development Workflow

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS
3. Integrate better-auth and session handling
4. Implement SQLite DB initialization and migrations (e.g. via a `scripts/init-db.ts` or manual `.sql`)
5. Build DB helpers and watermark processing module
6. Implement APIs
7. Build dashboard
8. Add polish (loading states, toast messages, error handling)

## secret creation

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"