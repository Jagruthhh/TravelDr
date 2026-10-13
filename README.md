# FixMyItch (TravelDoc) - International Travel Healthcare Platform

FixMyItch (TravelDoc) is a full-stack, mobile-first healthcare concierge platform designed for international travelers. It connects travelers with verified local clinics, hospitals, and dermatologists, providing upfront transparent pricing, multilingual support, an emergency helpline concierge with SLA-backed triage, and an agent management dashboard.

---

## 🏗️ Architecture Overview

The platform is structured into two core workspaces:

- **`backend/`**: Modular [NestJS](https://nestjs.com) REST API built with Clean Architecture & Domain-Driven Design (DDD).
  - **Domain Layer**: Rich domain entities (`HealthcareProvider`, `Hospital`, `Clinic`, `Doctor`, `HelplineCase`, `VerificationRecord`, `PriceEntry`, `CostEstimate`).
  - **Service Layer**: Pluggable strategies (`NearestRanking`), `ProviderSearchService`, `CostEstimator`, `HelplineService`, notification channels (`SmsNotifier`, `EmailNotifier`).
  - **Data Access Layer**: Repository ports & Prisma ORM adapters (`PrismaProviderRepository`, `PrismaCaseRepository`).
  - **Database**: PostgreSQL with embedded database support (`embedded-postgres`).
- **`frontend/`**: Modern [Next.js 16](https://nextjs.org) (App Router + Turbopack + Tailwind CSS) client.
  - **Typed API Client**: Single-point, strongly-typed client in `lib/api-client.ts` covering all backend endpoints with automated token management.
  - **Components**: Reusable, accessible UI components (`ProviderCard`, `ProviderSearch`, `ProviderDetail`, `HelplineRequestForm`, `AgentDashboard`, `Header`, `Footer`, `MobileBottomNav`).
  - **Validation**: Client-side schema validation via [Zod](https://zod.dev).

---

## ⚙️ Environment Variables

### 1. Backend (`backend/.env`)

Create `backend/.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/traveldoc?schema=public"

# HTTP server port (defaults to 3001 if omitted)
PORT=3001

# JWT Secret for authentication & role guards (optional, defaults to internal secret)
JWT_SECRET="traveldoc-super-secret-jwt-key"
```

### 2. Frontend (`frontend/.env.local`)

Create `frontend/.env.local`:

```env
# Backend REST API base URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js**: v18.18+ or v20+ recommended
- **npm**: v9+ or v10+

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 🗄️ Database Setup & Seeding

The backend includes an embedded PostgreSQL engine (`embedded-postgres`), allowing local development without installing an external database service.

### 1. Start the Database Daemon

Open a dedicated terminal:

```bash
cd backend
node start-db.js
```

> **Note:** The server will start PostgreSQL on `localhost:5432` with username `postgres` and password `password`, automatically creating the `traveldoc` database.

### 2. Push Schema & Run Migrations

In another terminal:

```bash
cd backend
npx prisma db push
```

### 3. Seed Initial Directory Data

Populate the database with destinations (Hyderabad, Goa), languages (English, Hindi, Telugu, Russian, Konkani), specialties, itemized treatments, and verified medical providers:

```bash
cd backend
npm run prisma:seed
# or directly:
npx tsx prisma/seed.ts
```

---

## 🏃 Running the Application

### 1. Start the Backend API (Port 3001)

```bash
cd backend

# Development mode with hot-reload:
npm run start:dev

# Production build and run:
npm run build
npm start
```

* API Health Check: `http://localhost:3001/health`
* Providers Endpoint: `http://localhost:3001/providers`
* Helpline Cases Endpoint: `http://localhost:3001/cases`

### 2. Start the Frontend App (Port 3000)

In a separate terminal:

```bash
cd frontend
npm run dev
```

Visit the application at: **`http://localhost:3000`**

### Available Routes

| Route | Description |
| :--- | :--- |
| **`/`** | Home page with hero highlights and quick navigation |
| **`/providers`** | Provider Search page with filters (city, language, specialty, verified-only) |
| **`/providers/[id]`** | Provider detail page with itemized price table, languages, patient reviews, and "Request Callback" |
| **`/cases/new`** | Emergency helpline request form with Zod validation and case confirmation screen |
| **`/cases`** | Agent Concierge Dashboard with live status queue (`NEW`, `ASSIGNED`, `RECOMMENDED`, `RESOLVED`, `CLOSED`) |

---

## 🧪 Testing

### Backend Test Suite (Vitest)

The backend features unit and integration tests covering domain entities, services, mock repositories, controllers, role guards, and ranking strategies:

```bash
cd backend

# Run all 207 tests:
npm test

# Run tests in watch mode:
npm run test:watch

# Generate code coverage report:
npm run test:coverage
```

### Frontend Typecheck & Build Validation

```bash
cd frontend

# Validate TypeScript and production build:
npm run build

# Run ESLint:
npm run lint
```

---

## 📡 Backend API Reference

| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Public | System liveness and timestamp check |
| `/auth/register` | `POST` | Public | Register user account with hashed password |
| `/auth/login` | `POST` | Public | Authenticate user credentials and return JWT |
| `/auth/me` | `GET` | Bearer JWT | Retrieve profile of authenticated user |
| `/auth/admin` | `GET` | `ADMIN` | Role check verification for administrators |
| `/auth/agent` | `GET` | `HELPLINE_AGENT`, `ADMIN` | Role check verification for helpline agents |
| `/auth/provider` | `GET` | `PROVIDER_STAFF`, `ADMIN` | Role check verification for clinic staff |
| `/providers` | `GET` | Public | Search providers by `city`, `language`, `specialty`, `verifiedOnly` |
| `/providers/:id` | `GET` | Public | Retrieve provider details, cost range, and published price entries |
| `/providers/:id/verification` | `PATCH` | `ADMIN` | Audit and update provider verification status |
| `/cases` | `GET` | Public / Agent | List all helpline cases, optionally filtered by `?status=` |
| `/cases` | `POST` | Public | Open a new emergency helpline case |
| `/cases/:id` | `GET` | Public / Agent | Retrieve case details and triage status |
| `/cases/:id/status` | `PATCH` | `HELPLINE_AGENT`, `ADMIN` | Advance case state (`ASSIGNED` &rarr; `RECOMMENDED` &rarr; `RESOLVED` &rarr; `CLOSED`) |

---

## 🏛️ SOLID Architecture Principles Applied

- **Single Responsibility Principle (SRP)**: Domain business rules (verification records, cost estimates) are encapsulated within domain entities and application services (`CostEstimator`, `ProviderService`, `HelplineService`), keeping HTTP controllers focused solely on request deserialization and response formatting.
- **Open/Closed Principle (OCP)**: Ranking strategies implement the `RankingStrategy` interface (`NearestRanking`), enabling new sorting algorithms without modifying core search services.
- **Liskov Substitution Principle (LSP)**: Polymorphic entities (`Hospital`, `Clinic`, `Doctor`) cleanly extend the base `HealthcareProvider` aggregate root and fulfill all common contracts.
- **Interface Segregation Principle (ISP)**: Repositories use focused port contracts (`ProviderRepository`, `CaseRepository`, `AgentRepository`) allowing granular test doubles.
- **Dependency Inversion Principle (DIP)**: NestJS services depend on injection tokens (`CASE_REPOSITORY`, `PROVIDER_REPOSITORY`, `RANKING_STRATEGY`) rather than concrete database classes.
