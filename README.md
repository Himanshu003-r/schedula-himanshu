# Booking System API

A NestJS + TypeORM + PostgreSQL backend for a doctor-patient appointment booking system, with role-based access control (RBAC), configurable doctor scheduling (stream & wave), and availability management.

## Tech Stack

- **Framework:** NestJS
- **ORM:** TypeORM (migrations only — `synchronize: false`)
- **Database:** PostgreSQL
- **Auth:** JWT (Passport) + role-based guards
- **Deployment:** Railway

## Features

- **Auth:** Register/login with role selection (`patient` / `doctor`)
- **Profiles:** Patient & Doctor onboarding (create/get/update, RBAC-protected)
- **Availability:** Recurring weekly availability + date-specific overrides, with overlap and invalid-range validation
- **Scheduling:** Doctor-configurable scheduling type
  - **Stream** — fixed-duration exact time slots (with optional buffer)
  - **Wave** — token-based booking within a shared time window, with capacity limits
- **Appointments:** Book, view (patient & doctor sides), and cancel — with duplicate-booking and overbooking prevention
- **Health Check:** `/health` endpoint (DB connectivity check via Terminus) for deployment monitoring

## Getting Started

```bash
npm install
cp .env.example .env   # fill in DB credentials, JWT_SECRET
npm run migration:run
npm run start:dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Secret for signing access tokens |
| `PORT` | App port (defaults to 3000 locally; set automatically by Railway in production) |

## Key API Routes

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST/GET/PATCH | `/patient/profile` | Patient |
| POST/GET/PATCH | `/doctor/profile` | Doctor |
| PATCH | `/doctor/scheduling-config` | Doctor |
| POST/GET/PATCH/DELETE | `/doctor/availability` | Doctor |
| POST/GET/PATCH/DELETE | `/doctor/availability/override` | Doctor |
| GET | `/doctor/availability/slots?date=` | Doctor |
| POST | `/appointments` | Patient |
| GET | `/appointments/me` | Patient |
| DELETE | `/appointments/:id` | Patient |
| GET | `/doctor/appointments` | Doctor |
| GET | `/health` | Public |

## Database Migrations

Schema changes are managed exclusively through TypeORM migrations (no `synchronize` in any environment).

```bash
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

## Architecture Notes

- Every entity relationship (`User → Patient/Doctor`, `Doctor → Availability/Appointments`) is enforced at the DB level via foreign keys with `ON DELETE CASCADE`.
- Wave-scheduling capacity checks run inside a DB transaction to prevent overbooking races.
- Role access is enforced via `@Roles()` + a global `RolesGuard`, layered on top of JWT authentication.