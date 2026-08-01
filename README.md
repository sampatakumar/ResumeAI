# ResumeAI 🚀

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Neomorphism-38BDF8?logo=tailwindcss&logoColor=white) ![Framer Motion](https://img.shields.io/badge/Framer%20Motion-Animations-0055FF?logo=framer&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white) ![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black) ![Groq AI](https://img.shields.io/badge/Groq-AI-111111) ![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Portfolio%20Deploy-F38020?logo=cloudflare&logoColor=white)

**ResumeAI** is an AI-powered full-stack career platform designed to help users maintain a master professional profile, tailor resumes to specific job descriptions with AI keyword matching, export high-quality PDF resumes, and publish custom portfolio websites directly to **Cloudflare Pages**.

The application features a modern **Neomorphism (Soft UI)** visual aesthetic with a fully responsive light/dark theme toggle, tactile 3D dual-shadow components, and smooth interactive animations.

---

## ✨ Key Features

- 🎨 **Neomorphism (Soft UI) Aesthetic**: Tactile 3D raised and sunken UI controls, smooth dual-shadow tokens, and glassmorphic depth.
- 🌓 **Responsive Theme Toggle**: Seamless light and dark mode switching supported across all pages and components.
- 📄 **Smart Resume Parsing**: Upload PDF, DOCX, TXT, TEX, or image resumes to automatically extract master profile data.
- 🤖 **AI Resume Tailoring**: Paste any job description to match ATS keywords and rewrite bullet points using Groq & LangChain AI models.
- 🌐 **Cloudflare Pages Portfolio Deployment**: One-click generation and live publishing of developer portfolios to Cloudflare Pages with optional custom domains.
- 📦 **GitHub Source Export**: Export generated portfolio web source code directly to a connected GitHub repository.
- 📁 **Project & Master Profile Management**: Comprehensive CRUD operations for work experience, skills, projects, achievements, and education history.
- 📥 **PDF & Resume Export**: Save tailored outputs and download clean PDF previews.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Vanilla CSS Variables, TailwindCSS, Neomorphism Design System
- **Animations**: Framer Motion
- **Icons & UI**: Lucide React, Radix UI Primitives, Sonner Toast Notifications
- **Theme**: Next-Themes (Light & Dark Mode)

### Backend
- **Runtime**: Node.js with Express 5
- **Database**: MongoDB with Mongoose
- **Authentication**: Firebase Admin SDK
- **AI Orchestration**: Groq LLaMA models & LangChain
- **Portfolio Deployment**: Cloudflare Pages API & Direct Uploads

---

## 📁 Project Structure

```text
BuildMyResume/
├── frontend/                     # React 18 + Vite TypeScript App
│   ├── src/
│   │   ├── components/           # Neomorphic UI Components & Resume Previews
│   │   │   ├── ui/               # Neomorphic Cards, Buttons, Inputs, Dialogs
│   │   │   ├── resume/           # JakeResumePreview & Types
│   │   │   ├── DashboardSidebar.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── pages/                # App Pages & Layouts
│   │   │   ├── Landing.tsx       # Neomorphic Hero, Feature Grid & Match Simulator
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── DashboardHome.tsx # Overview Stats & Activity Feed
│   │   │   ├── Resumes.tsx       # Master Profile & Resume Tailoring
│   │   │   ├── Portfolios.tsx    # Cloudflare Portfolio Generator
│   │   │   ├── Projects.tsx      # Project Management
│   │   │   └── SettingsPage.tsx  # User Settings & API Credentials
│   │   ├── index.css             # Neomorphism Design Tokens & Shadow Variables
│   │   └── tailwind.config.ts    # Custom Neomorphic Box Shadow Configuration
├── backend/                      # Node.js + Express REST API
│   ├── src/
│   │   ├── controllers/          # Auth, Resume, Portfolio, & AI Controllers
│   │   ├── models/               # MongoDB Schemas
│   │   ├── routes/               # Express Endpoint Routes
│   │   ├── services/             # Cloudflare Deploy & AI Tailoring Services
│   │   └── config/               # Environment & DB Setup
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ and **npm**
- **MongoDB** Instance
- **Firebase Project** Credentials
- **Groq API Key**
- **Cloudflare Account** API Token & Account ID

### 1. Environment Setup

#### Backend Environment (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resumeai
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key
GROQ_API_KEY=your-groq-api-key
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

#### Frontend Environment (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 2. Installation & Running Locally

#### Run Backend Server
```bash
cd backend
npm install
npm run dev
```

#### Run Frontend App
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to open the application in your browser.

---

## 📄 License
Licensed under the [MIT License](LICENSE).