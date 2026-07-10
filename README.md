# BuildMyResume

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white) ![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Storage-FFCA28?logo=firebase&logoColor=black) ![Groq](https://img.shields.io/badge/Groq-AI-111111) ![LangChain](https://img.shields.io/badge/LangChain-Orchestration-1C3C3C) ![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-Deploy-F38020?logo=cloudflare&logoColor=white)

BuildMyResume is a full-stack career platform that helps users maintain a master professional profile, manage resumes and projects, tailor resumes for specific job descriptions with AI, and publish a generated portfolio website.

The application uses a React frontend hosted on Vercel and an Express backend hosted on Render. Authentication is handled with Firebase, structured data is stored in MongoDB, resume files are currently served through Firebase Storage, AI capabilities are powered by Groq and LangChain, and generated portfolio sites are deployed to Cloudflare Pages.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Application Workflow](#application-workflow)
- [Repository Structure](#repository-structure)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Scripts](#scripts)
- [API Surface](#api-surface)

## Overview

BuildMyResume is designed around one central idea: users should only need to maintain their professional data once. From that master data, the platform can:

- create and manage resumes
- parse uploaded resumes into structured profile data
- store projects and import them from README files
- generate AI-assisted profile summaries and resume bullets
- tailor resumes to job descriptions
- generate a portfolio codebase from user data
- deploy that portfolio to Cloudflare Pages
- export the generated portfolio source code to GitHub

The platform is split into two main applications:

- `frontend/`: React + Vite client application
- `backend/`: Express API, AI orchestration, persistence, and deployment pipeline

## Key Features

### 1. Authentication and User Identity

- Google sign-in is handled through Firebase Authentication on the frontend.
- Protected backend routes verify Firebase ID tokens before allowing access.
- On first successful sign-in, the backend creates a user record in MongoDB.
- On later sign-ins, the backend updates only missing basic fields while preserving user-edited profile data.

### 2. Master Profile and Guided Onboarding

- Users can complete a guided onboarding flow after sign-in.
- The onboarding flow collects:
  - display name
  - headline
  - phone
  - summary/about
  - LinkedIn and GitHub links
  - custom domain preference
  - education
  - skills
  - experience
  - achievements
  - projects
- This data can also be collected using an uploaded resume.
- The same data can be edited later from the settings and projects page.

### 3. Resume Upload and Resume Management

- Users can upload resumes in supported formats such as PDF, DOCX, TXT, TEX, and image files.
- Resume metadata is stored in MongoDB.
- Resume files are currently uploaded to and served from Firebase Storage by the active resume controller.
- The UI supports:
  - listing resumes
  - opening resume files
  - deleting resumes
  - saving generated/tailored output as new resumes

### 4. Resume Parsing and Extraction

- Uploaded resumes can be parsed during onboarding.
- Text extraction supports:
  - PDF parsing
  - DOCX extraction
  - plain text and TeX text reading
  - OCR for image-based resumes
- The backend also extracts URLs and section-focused content from resumes to make the parsed output more useful for onboarding and tailoring.

### 5. Project Management

- Users can manually add projects with:
  - title
  - description
  - stack
  - date
  - GitHub URL
  - demo URL
- Users can also upload a README file and let the backend infer:
  - project title
  - description
  - tech stack
  - GitHub/demo links
- Projects are stored in MongoDB and reused by the portfolio generator and AI tailoring flow.

### 6. AI-Assisted Writing

- The app can generate:
  - profile summaries
  - resume/project description bullets
  - expanded project bullets
- These helpers are used across onboarding, settings, resume building, and tailoring.

### 7. AI Resume Tailoring

- Users can paste a job description and generate a targeted resume preview.
- The tailoring flow analyzes the JD and compares it against saved master data.
- The system recommends:
  - prioritized skills
  - best-fit projects
  - matching experience entries
  - matching achievements
  - fit and gap insights
- The tailored result is rendered in a resume preview and can be saved/exported.

### 8. Resume Builder and PDF Output

- The frontend includes an interactive resume builder and preview flow.
- Users can build a structured resume from saved profile data.
- Resume previews can be exported as PDF using `jsPDF`.

### 9. Portfolio Generation and Publishing

- The backend generates a portfolio codebase from the user profile and projects.
- It builds the generated portfolio as a Vite project inside a temporary workspace.
- The resulting static `dist` is deployed to Cloudflare Pages.
- The portfolio publishing route is asynchronous and returns a `jobId`.
- The frontend polls for build status until the deployment is complete.
- Custom domains can also be attached to deployed portfolio projects.

### 10. GitHub Export

- Instead of only publishing the portfolio, users can export the generated portfolio source code directly to GitHub.
- The backend can:
  - create a repository for the authenticated GitHub user
  - upload generated files
  - update existing files in a branch/path

### 11. Dashboard and Analytics

- The dashboard shows:
  - resume count
  - tailored version count
  - portfolio count
  - recent activity
  - active portfolio info
- Admin analytics expose recent daily counters for:
  - API hits
  - rate limit hits
  - Groq requests
  - new users
  - resumes uploaded
  - portfolios published


### Backend Layering

- `routes`: HTTP endpoints grouped by feature
- `controllers`: request validation and orchestration
- `services`: business logic, AI integration, portfolio build/deploy, GitHub export
- `models`: MongoDB schema definitions
- `middlewares`: auth, uploads, analytics, and error handling
- `utils`: storage helpers, API response wrappers, async helpers

## Application Workflow

### Authentication Flow

1. The user signs in from the frontend using Google through Firebase.
2. Firebase returns an ID token to the client.
3. The frontend sends the ID token in the `Authorization` header to backend protected routes.
4. The backend verifies the token.
5. The backend loads or creates the corresponding `User` document.

### Onboarding and Profile Flow

1. After sign-in, the user enters onboarding or settings.
2. The frontend collects profile, education, skills, experience, achievements, links, and project data.
3. The frontend sends profile updates to `PATCH /auth/me`.
4. The backend validates and normalizes the payload, then persists it in MongoDB.

### Resume Upload Flow

1. The user uploads a resume from the resumes page or onboarding parser flow.
2. Multer receives the file on the backend.
3. The backend uploads the file to Firebase Storage.
4. Resume metadata is saved in MongoDB.
5. A signed or direct file path is returned for frontend usage.

### Resume Parsing Flow

1. A resume file is uploaded to the onboarding AI endpoint.
2. The backend extracts raw text based on file type.
3. The parser identifies useful sections such as summary, skills, projects, education, and experience.
4. The frontend uses the parsed data to prefill onboarding fields.

### AI Tailoring Flow

1. The user enters a job description.
2. The frontend sends the JD to backend AI endpoints.
3. The backend analyzes the JD using Groq/LangChain.
4. The backend compares JD requirements with the user's saved master data.
5. The backend returns:
   - optimized skill ordering
   - recommended projects
   - recommended experience blocks
   - recommended achievements
   - fit and gap commentary
6. The frontend renders a tailored resume preview.
7. The user can export or save the result as a resume.

### Portfolio Publishing Flow

1. The user configures portfolio preferences from the frontend.
2. The frontend calls `POST /portfolio/publish`.
3. The backend:
   - loads the user and projects
   - generates a portfolio source bundle
   - writes generated files into a temporary workspace
   - runs `npm install`
   - runs `npm run build`
   - deploys the generated `dist` to Cloudflare Pages
4. The backend stores the deployment URL and metadata in the `Portfolio` collection.
5. The frontend polls `GET /portfolio/status/:jobId` until the build finishes.
6. If a custom domain is provided, the backend attaches it to the Cloudflare Pages project.

### GitHub Export Flow

1. The user opens the GitHub export dialog from the portfolio page.
2. The frontend submits repository details and a GitHub token.
3. The backend generates the portfolio source bundle.
4. The backend creates the repository if needed.
5. The backend uploads or updates the generated files through the GitHub REST API.

## Repository Structure

```text
BuildMyResume/
├─ backend/
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ index.js
│  │  ├─ classes/
│  │  ├─ config/
│  │  ├─ contollers/
│  │  ├─ db/
│  │  ├─ middlewares/
│  │  ├─ models/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
│  ├─ test/
│  └─ package.json
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ contexts/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ pages/
│  │  └─ config/
│  └─ package.json
└─ README.md
```

## Environment Variables

### Backend

Create `backend/.env` from `backend/.env.example`.

Required and supported backend variables:

```env
NODE_ENV=development
PORT=8000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:8080
MONGODB_URI=mongodb://127.0.0.1:27017

FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_SIGNED_URL_TTL_MINUTES=60
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
FIREBASE_RESUME_FOLDER=buildmyresume/resumes

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

CF_ACCOUNT_ID=
CF_API_TOKEN=
```

Notes:

- `FIREBASE_SERVICE_ACCOUNT_JSON` or both `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are required for Firebase Admin SDK initialization.
- `GROQ_API_KEY` is required for AI features.
- `CF_ACCOUNT_ID` and `CF_API_TOKEN` are required for portfolio publishing to Cloudflare Pages.

### Frontend

Create `frontend/.env` from `frontend/.env.example`.

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm
- MongoDB instance
- Firebase project with Google auth enabled
- Groq API key
- Cloudflare account and Pages API token for publishing

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd BuildMyResume
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure environment files

- create `backend/.env`
- create `frontend/.env`
- fill in Firebase, MongoDB, Groq, and Cloudflare values

### 5. Start the backend

```bash
cd backend
npm run dev
```

Backend default URL:

```text
http://localhost:8000
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend default URL is shown by Vite in the terminal.

## Scripts

### Backend

```bash
npm run dev
npm start
npm test
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

## API Surface

Base backend prefix:

```text
/api/v1
```

### Auth

- `POST /api/v1/auth/firebase/sign-in`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`

### AI

- `POST /api/v1/ai/tailor`
- `POST /api/v1/ai/project-bullet/extend`
- `POST /api/v1/ai/profile-summary`
- `POST /api/v1/ai/description-bullets`
- `POST /api/v1/ai/onboarding/parse-resume`
- `POST /api/v1/ai/analyze-jd`
- `POST /api/v1/ai/match-master-data`
- `POST /api/v1/ai/tailor-two-stage`

### Resumes

- `GET /api/v1/resumes`
- `GET /api/v1/resumes/:resumeId/file`
- `POST /api/v1/resumes`
- `DELETE /api/v1/resumes/:resumeId`

### Projects

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `POST /api/v1/projects/from-readme`
- `PATCH /api/v1/projects/:projectId`
- `DELETE /api/v1/projects/:projectId`

### Dashboard

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/profile`

### Portfolio

- `POST /portfolio/publish`
- `GET /portfolio/status/:jobId`
- `POST /portfolio/github`

### Admin

- `GET /api/v1/admin/analytics`

