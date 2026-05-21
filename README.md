# 🇭🇰 JobTrack HK — 香港求职追踪系统

A full-stack job application tracker built for Hong Kong job seekers. Keep track of every application, interview, and offer — all in one place.

![Tech Stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js%20%2B%20SQLite-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 📋 **Track Applications** — Log company, role, salary range, location, and status
- 📊 **Dashboard Stats** — Visualize your pipeline at a glance (applied / interviews / offers)
- 🔄 **Status Management** — Update from Applied → Interview → Offer / Rejected
- 🔍 **Filter & Search** — Filter by status or search by company/role
- 💾 **Persistent Storage** — SQLite database, no cloud setup needed

## 🛠 Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, Vite, Tailwind CSS      |
| Backend  | Node.js, Express 4                |
| Database | SQLite (via better-sqlite3)       |
| API      | RESTful JSON API                  |

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18

### 1. Clone the repo
```bash
git clone https://github.com/zane-dot/project2.git
cd project2
```

### 2. Start the backend
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:3001`

### 3. Start the frontend
```bash
cd client
npm install
npm run dev
```
App runs on `http://localhost:5173`

## 📡 API Endpoints

| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| GET    | /api/jobs        | Get all job applications |
| POST   | /api/jobs        | Create new application   |
| PUT    | /api/jobs/:id    | Update application       |
| DELETE | /api/jobs/:id    | Delete application       |
| GET    | /api/jobs/stats  | Get dashboard stats      |

## 📁 Project Structure

```
project2/
├── server/           # Express + SQLite backend
│   ├── index.js      # Entry point
│   ├── db.js         # Database setup & schema
│   └── routes/
│       └── jobs.js   # Job CRUD routes
└── client/           # React + Vite frontend
    └── src/
        ├── App.jsx
        └── components/
            ├── StatsCard.jsx
            ├── JobForm.jsx
            ├── JobList.jsx
            └── StatusBadge.jsx
```

## 🎯 Why This Project?

Built as a portfolio project to demonstrate full-stack development skills relevant to the Hong Kong tech market, including RESTful API design, React component architecture, and database integration.

## 📄 License

MIT
