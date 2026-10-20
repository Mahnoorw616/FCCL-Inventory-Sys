# FCCL Inventory System

A modern IT equipment inventory, work order tracker, spare parts management, rack layout, and supplier tracking system for FCCL plants.

The project is structured into a separated **Frontend** (Vite + React) and **Backend** (Node.js + Express REST API), ready for independent deployment on **Vercel** and **Render**.

---

## Architecture

- **`frontend/`**: React 19, TypeScript, Tailwind CSS, Lucide icons, Vite.
  - Deployed to: **Vercel**
  - Features: Real-time UI updates, offline cache resilience, CSV import/export, backend health indicator.
- **`backend/`**: Node.js, Express, TypeScript.
  - Deployed to: **Render**
  - Features: Full REST API, CORS support, persistent JSON data store, automatic seed data generation, health checks.

---

## Quick Start (Local Development)

```bash
# 1. Install all dependencies (both backend and frontend)
npm run install:all

# 2. Run both backend and frontend concurrently
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### Individual Commands

```bash
# Frontend only (port 3000)
npm run dev:frontend

# Backend only (port 5000)
npm run dev:backend

# Production build test
npm run build

# Run unit tests
npm test
```

---

## Deployment

Complete step-by-step instructions for deploying to **Render** and **Vercel** can be found in [DEPLOYMENT.md](file:///d:/Downloads/fccl-inventory-system/fccl-inventory-system/DEPLOYMENT.md).

1. **Deploy Backend to Render**:
   - Web Service connected to your GitHub repository.
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`

2. **Deploy Frontend to Vercel**:
   - New Project connected to your GitHub repository.
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Environment Variable: `VITE_API_URL` set to `https://<your-render-backend-url>/api`
