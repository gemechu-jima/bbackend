# 🎱 Bingo Backend — API & Database Reference

> **Stack**: Node.js · Express · Sequelize ORM  
> **Dev DB**: SQLite (auto, no setup needed)  
> **Prod DB**: MySQL / PostgreSQL (via `.env`)

---

## Quick Start

```bash
# Install dependencies
npm install

# Development (SQLite — no DB server needed)
npm run dev          # or: node src/server.js

# Seed sample data
node src/seed.js

# Production (MySQL/PostgreSQL — set .env first)
NODE_ENV=production node src/server.js
```

---

## Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` → SQLite, `production` → MySQL/PostgreSQL | `development` |
| `PORT` | HTTP port | `3000` |
| `JWT_SECRET` | JWT signing secret | — |
| `DB_HOST` | Production DB host | — |
| `DB_PORT` | Production DB port | `3306` |
| `DB_NAME` | Production DB name | — |
| `DB_USER` | Production DB username | — |
| `DB_PASSWORD` | Production DB password | — |
| `DB_DIALECT` | `mysql` or `postgres` | `mysql` |
| `BASE_URL` | Public URL for uploaded file links | `http://localhost:3000` |

---

## Database Schema

> All tables use `timestamps: true` (auto `created_at`, `updated_at`) and `underscored: true` (camelCase → snake_case columns).

---

### `users`

```
┌──────────────────────────────────────────────────────────────────┐
│                             users                                │
├──────────────────────────────────────────────────────────────────┤
│ • id            INTEGER        PK  AUTO_INCREMENT                │
│ • firstName     VARCHAR(100)   NOT NULL                          │
│ • lastName      VARCHAR(100)   NULL                              │
│ • phoneNumber   VARCHAR(30)    NOT NULL  UNIQUE                  │
│ • role          ENUM           NOT NULL  DEFAULT 'PLAYER'        │
│                 ('PLAYER', 'ADMIN')                              │
│ • password      VARCHAR(255)   NULL  (hashed, optional)          │
│ • createdAt     TIMESTAMP      auto                              │
│ • updatedAt     TIMESTAMP      auto                              │
└──────────────────────────────────────────────────────────────────┘
```

**Relationships:**
- `users.id` ← `game_numbers.userId`        (the PLAYER holding a number)
- `users.id` ← `game_numbers.createdById`   (the ADMIN who seeded/created numbers)
- `users.id` ← `game_numbers.confirmedById` (the ADMIN who last confirmed/rejected)
- `users.id` ← `games.createdBy`            (the ADMIN who created the game)
- `users.id` ← `payment_proofs.userId`      (the PLAYER who uploaded proof)
- `users.id` ← `payment_proofs.reviewedBy`  (the ADMIN who reviewed proof)

---

### `games`

```
┌──────────────────────────────────────────────────────────────────┐
│                             games                                │
├──────────────────────────────────────────────────────────────────┤
│ • id                  INTEGER   PK  AUTO_INCREMENT               │
│ • title               VARCHAR   NOT NULL                         │
│ • totalNumbers        INTEGER   NOT NULL  DEFAULT 50             │
│ • reservationMinutes  INTEGER   NOT NULL  DEFAULT 5              │
│   (how long a RESERVED number is held before it expires)         │
│ • numberPrice         DECIMAL   NOT NULL  DEFAULT 100.00         │
│ • prizeDistribution   JSON      NOT NULL                         │
│   { first, second, third, fourth, system }  (% split)           │
│ • status              ENUM      NOT NULL  DEFAULT 'PENDING'      │
│                       ('PENDING','ACTIVE','COMPLETED','CANCELLED')│
│ • createdBy           INTEGER   FK → users.id  (ADMIN)           │
│ • createdAt           TIMESTAMP auto                             │
│ • updatedAt           TIMESTAMP auto                             │
└──────────────────────────────────────────────────────────────────┘
```

---

### `game_numbers`  ⭐ Core Booking Table

This is the **single source of truth** for every number in every game.  
There is **no separate reservations table** — all lifecycle state lives here.

```
┌──────────────────────────────────────────────────────────────────┐
│                         game_numbers                             │
├──────────────────────────────────────────────────────────────────┤
│ • id             INTEGER    PK  AUTO_INCREMENT                   │
│ • gameId         INTEGER    NOT NULL  FK → games.id              │
│ • number         INTEGER    NOT NULL  (1 … totalNumbers)         │
│ • status         ENUM       NOT NULL  DEFAULT 'AVAILABLE'        │
│                  ('AVAILABLE', 'RESERVED', 'CONFIRMED')          │
│                                                                  │
│ ── Player tracking ──────────────────────────────────────────── │
│ • userId         INTEGER    NULL  FK → users.id                  │
│                  Set when player reserves the number.            │
│                  Cleared (→ NULL) if admin rejects payment.      │
│                                                                  │
│ ── Admin tracking ───────────────────────────────────────────── │
│ • createdById    INTEGER    NULL  FK → users.id  (ADMIN)         │
│                  The admin who seeded/generated this number       │
│                  when the game was created.                       │
│ • confirmedById  INTEGER    NULL  FK → users.id  (ADMIN)         │
│                  The admin who last confirmed payment (→ CONFIRMED)│
│                  or rejected payment (→ AVAILABLE).              │
│                  Identifies which of multiple admins acted.      │
│                                                                  │
│ ── Expiry ───────────────────────────────────────────────────── │
│ • expiresAt      TIMESTAMP  NULL                                 │
│                  Set to now + reservationMinutes when RESERVED.  │
│                  Cleared when CONFIRMED or expired back to AVAILABLE│
│                                                                  │
│ • createdAt      TIMESTAMP  auto                                 │
│ • updatedAt      TIMESTAMP  auto                                 │
├──────────────────────────────────────────────────────────────────┤
│ UNIQUE INDEX: (gameId, number)  — no duplicate numbers per game  │
└──────────────────────────────────────────────────────────────────┘
```

**Number lifecycle:**

```
                    Admin creates game
                           │
                    [AVAILABLE]  ← ─── Admin reject payment
                           │                     ▲
              Player reserves number             │
                           │                     │
                    [RESERVED] ──── expiresAt ───┘
                     (timed)
                           │
              Player uploads payment proof
                           │
                    [RESERVED]  (still, awaiting review)
                           │
              Admin verifies payment
                           │
                   [CONFIRMED] ✅
```

---

### `payment_proofs`

```
┌──────────────────────────────────────────────────────────────────┐
│                        payment_proofs                            │
├──────────────────────────────────────────────────────────────────┤
│ • id                   INTEGER    PK  AUTO_INCREMENT             │
│ • numberId             INTEGER    NOT NULL  FK → game_numbers.id │
│ • reservationId        INTEGER    NULL  (alias for numberId,      │
│                        kept for backward compatibility)          │
│ • userId               INTEGER    NULL  FK → users.id  (PLAYER)  │
│   (the player who uploaded this proof)                           │
│ • gameId               INTEGER    NULL  FK → games.id            │
│ • amount               DECIMAL    NOT NULL  DEFAULT 100.00       │
│ • provider             VARCHAR    NOT NULL  DEFAULT 'CBE'        │
│   (payment provider name, e.g. 'CBE', 'Telebirr', 'Awash')      │
│ • transactionReference VARCHAR    NULL  (bank/mobile ref number)  │
│ • proofUrl             VARCHAR    NULL  (uploaded screenshot URL) │
│ • status               ENUM       NOT NULL  DEFAULT 'UNDER_REVIEW'│
│                        ('UNDER_REVIEW', 'VERIFIED', 'REJECTED')  │
│ • reviewedBy           INTEGER    NULL  FK → users.id  (ADMIN)   │
│   (which admin reviewed/verified/rejected this proof)            │
│ • reviewedAt           TIMESTAMP  NULL  (when reviewed)          │
│ • reviewNote           TEXT       NULL  (rejection reason)       │
│ • createdAt            TIMESTAMP  auto                           │
│ • updatedAt            TIMESTAMP  auto                           │
└──────────────────────────────────────────────────────────────────┘
```

---

### `draws`

```
┌──────────────────────────────────────────────────────────────────┐
│                             draws                                │
├──────────────────────────────────────────────────────────────────┤
│ • id             INTEGER    PK  AUTO_INCREMENT                   │
│ • gameId         INTEGER    NOT NULL  FK → games.id              │
│ • drawnNumbers   JSON       NOT NULL  DEFAULT []                 │
│   (array of number values drawn so far, e.g. [5, 23, 41])       │
│ • winnerUserId   INTEGER    NULL  FK → users.id  (PLAYER)        │
│   (set when a winner is declared)                               │
│ • status         ENUM       NOT NULL  DEFAULT 'ONGOING'          │
│                  ('ONGOING', 'COMPLETED')                        │
│ • createdAt      TIMESTAMP  auto                                 │
│ • updatedAt      TIMESTAMP  auto                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

### `audit_events`

```
┌──────────────────────────────────────────────────────────────────┐
│                         audit_events                             │
├──────────────────────────────────────────────────────────────────┤
│ • id         INTEGER    PK  AUTO_INCREMENT                       │
│ • actorId    INTEGER    NULL  FK → users.id                      │
│   (which user performed the action; NULL = system)               │
│ • action     VARCHAR    NOT NULL                                 │
│   (e.g. 'PAYMENT_MISTAKE_REPORT', 'NUMBER_CANCELLED', etc.)     │
│ • reason     TEXT       NULL  (human-readable explanation)       │
│ • details    JSON       NULL  (extra data, e.g. { proofId: 7 }) │
│ • createdAt  TIMESTAMP  auto                                     │
│ • updatedAt  TIMESTAMP  auto                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Entity Relationship Overview

```
users ──────┬──────────────────────────────────────────────────────┐
            │  userId        (PLAYER holds number)                 │
            │  createdById   (ADMIN who seeded numbers)            │
            ├──> game_numbers <──── games (gameId)                 │
            │  confirmedById (ADMIN who confirmed/rejected)         │
            │                                                       │
            ├──> payment_proofs <── game_numbers (numberId)         │
            │    userId   (PLAYER who uploaded)                    │
            │    reviewedBy (ADMIN who verified)                   │
            │                                                       │
            ├──> games (createdBy = ADMIN)                         │
            │                                                       │
            └──> draws (winnerUserId = PLAYER)                     │
                 └── games (gameId)                                │
```

---

## API Endpoints

### Auth / Users — `/api/users`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/users/register` | Register a new user |
| `POST` | `/api/users/login` | Login → returns JWT |
| `GET` | `/api/users` | List all users (admin) |
| `GET` | `/api/users/:id` | Get user by ID |

---

### Games — `/api/games`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games` | List all games |
| `GET` | `/api/games/:id` | Get game by ID |
| `POST` | `/api/games` | Create game + auto-seed numbers (`createdById` tracked) |
| `PATCH` | `/api/games/:id/activate` | Activate game |
| `PATCH` | `/api/games/:id/close` | Close / complete game |
| `PATCH` | `/api/games/:id/cancel` | Cancel game |
| `DELETE` | `/api/games/:id` | Delete game |

---

### Numbers — `/api/numbers`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/numbers/reserve` | — | Player reserves a number |
| `GET` | `/api/numbers/me` | 🔐 JWT | Get my reserved/confirmed numbers |
| `GET` | `/api/numbers/user/:userId` | — | Numbers for a specific user |
| `GET` | `/api/numbers/game/:gameId/confirmed` | — | Confirmed numbers for a game |
| `GET` | `/api/numbers/game/:gameId/active` | — | Reserved (active) numbers for a game |
| `GET` | `/api/numbers/active/all` | — | All active numbers across all games |
| `GET` | `/api/numbers/:gameId` | — | All numbers for a game |
| `GET` | `/api/numbers/:gameId/summary` | — | Count summary (available/reserved/confirmed) |
| `PATCH` | `/api/numbers/:id/confirm` | 🔐 JWT | Admin confirms number → sets `confirmedById` |
| `PATCH` | `/api/numbers/:id/cancel` | 🔐 JWT | Admin cancels number → sets `confirmedById` |
| `POST` | `/api/numbers/:id/restore` | 🔐 JWT | Restore expired number back to RESERVED |
| `POST` | `/api/numbers/:numberId/payment-proofs` | — | Upload payment screenshot |

---

### Payments — `/api/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/payments` | — | List all payment proofs |
| `GET` | `/api/payments/reservation/:id` | — | Proofs for a number/reservation |
| `PATCH` | `/api/payments/:id/verify` | 🔐 JWT | Admin verifies proof → marks number CONFIRMED + sets `confirmedById` |
| `PATCH` | `/api/payments/:id/reject` | 🔐 JWT | Admin rejects proof → releases number to AVAILABLE + sets `confirmedById` |

---

### Draws — `/api/draws`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/draws` | Start a new draw for a game |
| `GET` | `/api/draws/game/:gameId` | Get draw state for a game |
| `POST` | `/api/draws/:id/number` | Draw the next random number |
| `POST` | `/api/draws/:id/winner` | Declare winner |

---

## Admin Identity Tracking

The system supports **multiple admins**. Three fields on `game_numbers` identify which admin did what:

| Field | Role | Set When |
|---|---|---|
| `createdById` | ADMIN | Numbers are seeded when a game is created (`POST /api/games`) |
| `confirmedById` | ADMIN | Admin confirms payment (`PATCH /confirm`) or rejects (`PATCH /cancel`, payment reject) |
| `userId` | PLAYER | Player reserves a number (`POST /reserve`) |

This allows full audit traceability — you can query which admin created a game's numbers and which admin verified each payment.

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # SQLite (dev) / MySQL·PostgreSQL (prod)
│   │   └── env.js           # Centralized env config
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT authenticate / optionalAuth
│   │   ├── upload.middleware.js  # Multer file upload
│   │   └── error.middleware.js   # Global error handler
│   ├── modules/
│   │   ├── index.js         # Sequelize associations hub
│   │   ├── users/           # User model, service, controller, router
│   │   ├── games/           # Game model, service, controller, router
│   │   ├── numbers/         # GameNumber model, service, controller, router
│   │   ├── payments/        # PaymentProof model, service, controller, router
│   │   ├── draws/           # Draw model, service, controller, router
│   │   └── audit/           # AuditEvent model
│   ├── tasks/
│   │   └── expiry.task.js   # Background worker: expires stale RESERVED numbers
│   ├── server.js            # Express app entry point
│   └── seed.js              # Database seeder (sample data)
├── uploads/                 # Uploaded payment screenshots
├── database.sqlite          # SQLite file (dev only, git-ignored)
├── .env                     # Environment variables
└── package.json
```
