<p align="center" >
  <img width=100% height=100% alt="Job Roadmap" src="https://github.com/user-attachments/assets/8671e48e-1878-45f5-8c22-9eac944cc6f2"/>
</p>

---

# Rolemap 🧭

> Daily quests for landing your dream job.

Rolemap is an AI-powered career planning platform that transforms vague career goals into a structured, gamified, and actionable roadmap.

Users select 2–3 target roles (e.g., Software Engineer, Product Manager), rank dream companies, upload their resume, and connect their GitHub. Rolemap analyzes their current skill set, compares it against real hiring expectations, and generates a personalized visual roadmap with daily and weekly tasks.

Instead of “set it and forget it” career goals, Rolemap builds systems for consistent progress.

---

# ✨ Why Rolemap?

Job preparation often feels overwhelming and unstructured. Rolemap solves this by:

- Analyzing where you are now (Resume Parsing + GitHub)
- Comparing your skills to real job expectations
- Highlighting skill gaps
- Generating clear, executable tasks
- Reinforcing learning with checkpoints
- Gamifying consistency with streaks and points

---

# 🧩 MVP Features

## 1️⃣ Role & Company Selection
- Choose 2–3 target roles
- Select and rank dream companies
- Prioritize focus if multiple roles are selected

## 2️⃣ Resume Upload & Parsing
- Upload PDF or DOCX resume
- Extract:
  - Skills
  - Experience
  - Projects
- Identify missing or underdeveloped skills

## 3️⃣ GitHub Integration
- Connect GitHub account
- Analyze repositories for:
  - Languages used
  - Commit activity & recency
  - Project scope
- Infer actively practiced skills
- Map projects to role expectations

## 4️⃣ Personalized Skill Gap Roadmap
- Visual roadmap with checkpoints
- Highlight missing skills
- Recommend exercises or learning resources
- Adapt roadmap as progress is made

## 5️⃣ Daily & Weekly Tasks
- Generate small, actionable tasks
- Assign deadlines
- Sync with Google Calendar / Apple Calendar
- Notifications & reminders

## 6️⃣ Gamification Layer
- Points system
- Streak tracking
- Leaderboard
- Milestone checkpoints

---

# 🌱 Stretch Goals

- LinkedIn parsing for improved customization
- Company culture & fit analysis
- Skill decay tracking with spaced repetition
- Anonymous forum with intern/full-time insights
- Data-driven insights on skills that mattered in hiring

---

# 🗺️ Development Timeline

| Week | Focus | Frontend | Backend |
|------|--------|----------|----------|
| 1 | Setup & Scope | Next.js + TypeScript + Tailwind setup, layout structure, wireframes | PostgreSQL setup, initial schema (users, roles, skills, roadmaps, tasks), environment config |
| 2 | Design & Data Modeling | High-fidelity Figma designs, onboarding flow, resume upload UI | Resume parsing logic, GitHub API integration, CRUD operations |
| 3–4 | Skill Analysis & Roadmap Engine | Roadmap visualization, skill gap display, dashboard layout | GitHub repository analysis, skill weighting model, roadmap generation algorithm |
| 5–6 | Task System & Gamification | Daily/weekly task views, task completion interactions, streaks & leaderboard UI | Task generation logic, progress tracking, scoring system, leaderboard queries |
| 7–8 | Integration & Polish | UX refinements, responsive design, accessibility improvements | Performance optimization, data validation, security checks, bug fixes |
| 8.5–10 | Demo & Final Prep | Final UI polish, testing | Full integration, demo rehearsal, presentation prep |

---

# 🛠️ Tech Stack

## Frontend
- Next.js (React + TypeScript)
- Tailwind CSS
- Figma (UI/UX design)

## Backend
- Node.js
- PostgreSQL (Supabase or self-hosted)
- Prisma (ORM)

## AI & APIs
- OpenAI API (resume parsing, roadmap & task generation)
- GitHub REST API
- Google Calendar API

## Tools
- GitHub
- VS Code

---

# 👥 Meet the Team
- Quoc Dung (Tom) Pham
- Siri Kishore Dola
- Jon Montague
- Pranay Chintakunta
