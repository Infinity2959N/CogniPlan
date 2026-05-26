# 🗄️ CogniPlan Role 1: Systems & Core API Database Service

This folder contains the core backend server, database schemas, and REST APIs for the **CogniPlan** study planner. It handles user authentication, revision topic storage, daily session schedules, and spaced repetition (SuperMemo-2) interval calculations.

---

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Web Framework**: Express
- **ORM**: Prisma ORM
- **Database**: PostgreSQL (fallback to in-memory store in dev/test)
- **Testing**: Jest / Supertest

---

## 📸 Core Features & Services

### 1. Spaced Repetition Logic (SM2 Algorithm)
Calculates study revision schedules based on user ratings (quality scores 0-5):
- **Quality (q)**:
  - `q < 3`: Revision failed. Reset repetition count to `0`, set interval to `1` day, and adjust ease factor.
  - `q >= 3`: Revision succeeded.
    - Repetition 0: `interval = 1` day
    - Repetition 1: `interval = 6` days
    - Repetition > 1: `interval = last_interval * ease_factor`
- **Ease Factor (EF)**: Dynamically adjusted based on rating quality:
  $$\text{EF}' = \max\left(1.3, \text{EF} + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))\right)$$

### 2. Daily Scanner Engine (`initDailyScanner`)
Runs a background worker to scan the database, calculate due queue dates, and populate revision slots.

### 3. REST API Endpoints

#### Authentication
- `POST /auth/signup`: Registers a new user.
- `POST /auth/login`: Validates credentials and returns a JWT access token.

#### Revision Topics Queue
- `GET /api/v1/topics/queue`: Retrieves the user's active revision queue, current streak, and category details.
- `POST /api/v1/topics/review`: Submits a review session quality score (0-5), recalculates recall intervals using SM2, and updates progress counters.

---

## ⚙️ Environment Variables (`.env`)

Configure the backend database credentials:
```env
PORT=4001
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cogniplan
JWT_SECRET=super-secret-jwt-key
```

---

## 🚀 Running Local Database & Server

1. **Install Dependencies**:
```bash
npm install
```

2. **Push Prisma Database Schema**:
```bash
npx prisma db push
```

3. **Start Development Server**:
```bash
npm run dev
```
*The systems service will listen on port `4001`.*

4. **Run Automated Test Suites**:
```bash
npm run test
```
