# 🚀 Job Preparation Backend

> **High-performance, AI-powered backend for a modern Job Preparation & Quiz platform.**

[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://fastify.dev)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Live API:** [https://job-preparation-with-quiz-backend.onrender.com](https://job-preparation-with-quiz-backend.onrender.com)  
**Client Frontend:** [https://job-preparation-with-quiz-client.vercel.app](https://job-preparation-with-quiz-client.vercel.app)  
**Client Repo:** [Job-Preparation-with-quiz-client](https://github.com/developer-jabed/Job-Preparation-with-quiz-client)  
**Backend Repo:** [Job-Preparation-with-quiz-backend](https://github.com/developer-jabed/Job-Preparation-with-quiz-backend)

---

## ✨ Overview

A production-ready **Node.js + Fastify** backend that powers a complete Job Preparation ecosystem.  
Admins can manage learners, subjects, categories, topics, tags, questions, tests, and reports.  
Learners can practice, take tests, track mastery, use spaced repetition, bookmark questions, and view analytics.

**Key highlights:**
- AI-powered PDF question extraction (Groq + Puppeteer + unpdf)
- Automatic subject/tag detection & duplicate prevention
- Spaced repetition system
- Real-time analytics & mastery tracking
- Secure JWT authentication with role-based access
- Queue-based background jobs (BullMQ + Redis)
- Clean modular architecture

---

## 🔥 Features

### Authentication & Users
- Secure JWT-based auth (register, login, refresh, logout)
- Role-based access (Admin / Learner)
- Profile management & password change
- Cookie support

### Content Management
- Full CRUD for **Subjects → Categories → Topics → Tags**
- Advanced **Question** bank with rich metadata
- **Test Templates** & **Test Attempts**
- Bookmark system
- Question reporting & moderation

### AI & Automation
- PDF upload → automatic question extraction
- AI auto-detection of subjects & tags
- Duplicate question prevention
- Extracted questions review workflow

### Learning Experience
- Spaced Repetition (Spaced Review)
- Mastery tracking
- Learner analytics & progress
- Dashboard statistics

### Platform
- Rate limiting, Helmet security headers, CORS
- Swagger / OpenAPI documentation
- Health check endpoint
- Structured logging (Pino)
- Cloudinary media handling
- Background workers support

---

## 🛠 Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Runtime            | Node.js (ESM)                                   |
| Framework          | **Fastify 5**                                   |
| Language           | TypeScript                                      |
| ORM                | **Prisma 7** + PostgreSQL                       |
| Auth               | @fastify/jwt + bcrypt                           |
| Validation         | Zod                                             |
| Queue / Jobs       | BullMQ + ioredis                                |
| AI                 | Groq SDK                                        |
| PDF Processing     | Puppeteer-core + @sparticuz/chromium + unpdf + pdf-lib |
| File Upload        | @fastify/multipart + Cloudinary                 |
| Security           | Helmet, Rate Limit, CORS, Cookies               |
| Docs               | @fastify/swagger + Swagger UI                   |
| Logging            | Pino + pino-pretty                              |
| Package Manager    | pnpm                                            |

---

## 🏗 Architecture
src/
├── app/
│   ├── config/                 # Environment & app configuration
│   ├── errors/                 # Custom error classes
│   ├── helper/                 # Utility helpers
│   ├── interfaces/             # Shared TypeScript interfaces
│   ├── middlewares/            # Auth, validation, error handlers
│   ├── modules/                # Feature modules (core of the app)
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── Bookmark/
│   │   ├── category/
│   │   ├── dashboard/
│   │   ├── extracted-question/
│   │   ├── learner/
│   │   ├── mastery/
│   │   ├── pdf-upload/
│   │   ├── question/
│   │   ├── question-report/
│   │   ├── spaced-review/
│   │   ├── subject/
│   │   ├── tag/
│   │   ├── test/
│   │   ├── test-attempt/
│   │   └── topic/
│   ├── routes/                 # Central route registration
│   ├── shared/                 # Shared services / utils
│   └── types/
├── server.ts                   # Application entry point
prisma/
├── schema.prisma
└── migrations/
text### Route Prefixes

| Prefix                    | Module                  |
|---------------------------|-------------------------|
| `/auth`                   | Authentication          |
| `/learners`               | Learner management      |
| `/subjects`               | Subjects                |
| `/categories`             | Categories              |
| `/topics`                 | Topics                  |
| `/tags`                   | Tags                    |
| `/questions`              | Questions               |
| `/tests`                  | Tests                   |
| `/attempts`               | Test Attempts           |
| `/bookmarks`              | Bookmarks               |
| `/spaced-reviews`         | Spaced Repetition       |
| `/reports`                | Question Reports        |
| `/pdf-uploads`            | PDF Upload & Extraction |
| `/extracted-questions`    | AI Extracted Questions  |
| `/analytics`              | Analytics               |
| `/dashboard`              | Dashboard stats         |
| `/mastery-setup`          | Mastery configuration   |
| `/health`                 | Health check            |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL
- Redis (for queues)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/developer-jabed/Job-Preparation-with-quiz-backend.git
cd Job-Preparation-with-quiz-backend
2. Install dependencies
Bashpnpm install
3. Environment Variables
Create a .env file in the root:
env# Server
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/job_preparation?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Cloudinary (optional but recommended)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Groq AI
GROQ_API_KEY=your_groq_api_key

# CORS
FRONTEND_URL=http://localhost:3000
4. Database Setup
Bash# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Seed data
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
5. Run the Development Server
Bashpnpm dev
The API will be available at http://localhost:5000.
Swagger UI is usually available at /documentation or /docs (check your Fastify Swagger configuration).
6. Production Build
Bashpnpm build
pnpm start

📜 Available Scripts





















































ScriptDescriptionpnpm devStart development server with hot reloadpnpm buildGenerate Prisma client + compile TypeScriptpnpm startRun production buildpnpm db:generateGenerate Prisma Clientpnpm db:pushPush schema changes (dev)pnpm db:migrateCreate & apply migrationspnpm db:deployDeploy migrations (production)pnpm db:studioOpen Prisma Studiopnpm db:seedSeed the databasepnpm lintRun ESLintpnpm formatFormat code with Prettier

📡 Health Check
httpGET /health
Response:
JSON{
  "success": true,
  "status": "OK",
  "message": "Server is healthy",
  "timestamp": "2026-09-12T04:00:00.000Z"
}

🔐 Security Features

Helmet security headers
Rate limiting
JWT authentication
Password hashing (bcrypt)
Input validation with Zod
CORS configuration
Secure cookies


🤝 Related Repositories




















ProjectRepositoryLive URLFrontendJob-Preparation-with-quiz-clientVercelBackendJob-Preparation-with-quiz-backendRender

📄 License
This project is licensed under the MIT License.

👨‍💻 Author
developer-jabed

GitHub: developer-jabed



Built with ❤️ for aspiring government job candidates
⭐ Star the repo if you find it useful!