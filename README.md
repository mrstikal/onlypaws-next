# OnlyPaws

OnlyPaws is a production-style demo and reference implementation showcasing a non-trivial, end-to-end **Next.js (App Router) + React + TypeScript** application.
It includes realistic architecture and tooling (API route handlers, services, validation, database access via Prisma, tests) and user-facing features like premium-tier gating and scalable threaded discussions.
Some parts are intentionally simplified for fast onboarding and demo use.

The repo is designed to be **easy to boot locally without running migrations/seeders** (and without needing to set up external API keys). Instead, it uses **Docker + a PostgreSQL dump** to provide a ready-to-use dataset.

---

## Core Domain (Conceptually)

- **Pets**: profiles users can follow/like; pets publish posts
- **Posts**: media-first feed entries; can be free or premium-tier locked
- **Likes**: polymorphic likes for pets/posts/comments
- **Follows**: follow relationships for pets
- **Subscriptions/Tiers**: viewer tier determines access to premium content (demo-oriented)

### Relationships (at a glance)

- A **User** can have many **Pets**.
- A **Pet** can have many **Posts**.
- A **Post** can have many **Comments** (threaded / nested replies).
- A **User** can **follow** many **Pets** (and a Pet can be followed by many Users).
- A **User** can **like** **Pets**, **Posts**, and **Comments** (polymorphic likes).
- A **User** has a **Tier** (or effective tier) that controls access to **premium Posts**.

---

## Highlights

- **Premium content gating (tier-based)**  
  Posts can be marked premium and **locked** unless the viewer meets the required tier (demo upgrade flow included).

- **Threaded comments at scale**  
  Supports **nested replies**, built for deep threads and large volumes with sensible safety limits (depth + max nodes).

- **Deterministic infinite scroll for root comments**  
  Root comment pages can be loaded incrementally while keeping a stable, deduplicated list on the client side.

- **Spam-resistant interactions**  
  Likes, follows, and commenting routes are protected with **rate limiting** (where applicable).

- **CMS-style back office foundations**  
  Includes a `/cms` area for managing content and workflows (demo-oriented, can be extended).

- **High test coverage (this repo’s main selling point)**  
  This project intentionally puts a lot of effort into **route-level unit/integration tests** (Vitest) that cover:
    - validation and error handling (400/401/403/404/422),
    - auth/session behavior (including cookie handling),
    - business rules (premium gating, “no liking your own content”, follow/unfollow toggles),
    - Prisma interactions (mocked) and transaction boundaries.

  In addition, **Playwright E2E** tests are available for end-to-end confidence.

---

## Tech Stack

**App / Runtime**
- Node.js (LTS recommended)
- Next.js (App Router) + React + TypeScript
- Tailwind CSS

**Database**
- PostgreSQL (primary DB)
- Prisma (ORM / query layer)

**Testing**
- Vitest (unit/integration) with coverage support
- Playwright (E2E)
- Test artifacts/reports are produced into repo folders (e.g. Playwright HTML report)

**Tooling**
- ESLint (Next.js config)
- TypeScript (typechecking)

---

## Getting Started (Local, zero-migration setup)

### Prerequisites

- Node.js + npm
- Docker Desktop (or compatible Docker runtime)

### 1) Install dependencies

    npm install

### 2) Configure environment

Create `.env` from the example(s):

    copy .env.example .env

Then fill in values for your local setup (database URL, etc.).

> Use placeholders for secrets and keep them out of Git.

#### Default local DB credentials (dev-only)

  Docker Compose ships with **dev-only defaults** so you can boot the demo instantly. You can override these in `.env`.

  - **App DB**
    - user: `onlypaws`
    - password: `change-me`
    - database: `onlypaws_next`
    - port: `5436`
  - **E2E DB (isolated, recommended for Playwright)**
    - user: `onlypaws`
    - password: `change-me-e2e`
    - database: `onlypaws_next_e2e`
    - port: `5437`

  > E2E tests create test users/comments. Run them against the isolated E2E DB to keep the demo dataset clean.

  #### Resetting the database (re-import the dump)

  If you need to reimport demo data, delete the DB volume and start again:

      docker compose down -v
      docker compose up -d

  #### Resetting the E2E database only

  If you only want to wipe Playwright test data:

      docker compose down -v postgres_e2e
      docker compose up -d postgres_e2e

### 4) Start the app

    npm run dev

Open the app in your browser (Next.js will print the local URL).

---

## Testing & Code Quality

> This project is test-forward. If you change behavior, update/add tests alongside it.

### Unit/Integration tests (Vitest)

Run tests:

    npx vitest

Run with coverage:

    npx vitest --coverage

### E2E tests (Playwright)

Install browsers (first time only):

    npx playwright install

Run E2E:

    npx playwright test

View the HTML report:

    npx playwright show-report

### Linting (ESLint)

    npm run lint

### Typechecking (TypeScript)

If a typecheck script exists in `package.json`, run it; otherwise:

    npx tsc -p tsconfig.json --noEmit

---

## Project Structure (Orientation)

- `src/app` — Next.js App Router pages, layouts, and route handlers (`/api/...`)
- `src/app/api` — API endpoints (auth, pets, posts, comments, CMS actions)
- `src/lib` — shared infrastructure (Prisma client, auth/session helpers, etc.)
- `src/components` — UI components
- `prisma/` — Prisma schema and related configuration
- `e2e/` — Playwright tests
- `test/` and `test-results/` — unit/integration tests and artifacts (project conventions)

---

## Admin / CMS

This project includes a demo-oriented **CMS area**.

### Access

- CMS URL: `/cms`

> For security reasons, this repository does **not** ship with default credentials in the README.
> Create admins locally via your preferred workflow (seed, SQL import in the demo dump, or custom scripts).
> Use superadmin role in the users table for newly created superadmin.

---

## Security & Operational Considerations

- Interaction endpoints implement **authorization boundaries** (e.g., “staff cannot perform user actions”, “cannot like own content”, etc.).
- Session handling is cookie-based (httpOnly), and routes validate inputs carefully.
- Database interactions are centralized through Prisma for consistency.

---

## Roadmap Ideas (Easy Wins)

- Real subscription lifecycle (billing, tier history, renewals)
- Real-time comment updates (WebSockets)
- Moderation tools (reporting, soft deletes, shadow bans)
- Media processing pipeline (thumbnails, optimized formats)

---

## Contributing

PRs and issues are welcome. If you add a feature, please include:
- tests (where sensible),
- keep lint/typecheck clean,
- and keep UI interactions accessible and keyboard-friendly.

---

## License

This repository is provided as-is. If you plan to open-source it, pick a license (e.g., MIT) and add a `LICENSE` file.