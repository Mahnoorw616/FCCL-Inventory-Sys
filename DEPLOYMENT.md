# Deployment Guide: Vercel (Frontend) & Render (Backend)

This repository is split into a standalone **Frontend** (Vite + React) and **Backend** (Node.js + Express API).

```
fccl-inventory-system/
├── frontend/          # React + Vite client (Deploy to Vercel)
│   ├── src/
│   ├── vercel.json    # SPA routing rules
│   ├── .env.example
│   └── package.json
├── backend/           # Express REST API (Deploy to Render)
│   ├── src/
│   ├── data/          # Persistent inventory.json store
│   ├── render.yaml    # Render Blueprint
│   ├── .env.example
│   └── package.json
├── package.json       # Root scripts to run both in dev
└── DEPLOYMENT.md      # This guide
```

---

## 1. Deploy the Backend to Render

Deploy the backend first so you have your backend URL ready for the frontend.

### Option A: Using Render Web Service (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2. Connect your GitHub repository: `fccl-inventory-system`.
3. Configure the service settings:
   - **Name**: `fccl-inventory-backend` (or your preferred name)
   - **Region**: Choose the closest region (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend` *(Important!)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Expand **Advanced** and set:
   - **Health Check Path**: `/api/health`
5. In **Environment Variables**, add:
   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `CORS_ORIGIN` | `*` | Or set to your Vercel URL later (e.g. `https://your-app.vercel.app`) |
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g. `https://fccl-inventory-backend.onrender.com`).
   - Test it by opening `https://fccl-inventory-backend.onrender.com/api/health` in your browser. It should respond with `{"status":"ok"}`.

> [!NOTE]
> **Render Free Tier Cold Starts**: Render's free tier web services spin down after 15 minutes of inactivity. When a request arrives, it may take 20–40 seconds to wake up. The frontend includes a status indicator in the header ("Connecting...") so users are aware while the backend wakes up.

---

## 2. Deploy the Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
2. Import your GitHub repository: `fccl-inventory-system`.
3. Configure the project settings:
   - **Project Name**: `fccl-inventory-system`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`** *(Critical!)*
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. In **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://fccl-inventory-backend.onrender.com/api` | Point to your Render backend with `/api` suffix |
5. Click **Deploy**.
6. When deployment finishes, click on the domain (e.g. `https://fccl-inventory-system.vercel.app`) to open the app.
7. *(Optional)* Go back to your Render backend dashboard and update `CORS_ORIGIN` to your exact Vercel URL (e.g. `https://fccl-inventory-system.vercel.app`) for strict security.

---

## 3. Local Development

You can run both the frontend and backend locally with a single command from the project root:

### Quick Start
```bash
# Install dependencies for both projects
npm run install:all

# Start both backend (port 5000) and frontend (port 3000) concurrently
npm run dev
```

### Individual Service Commands
```bash
# Run only frontend (http://localhost:3000)
npm run dev:frontend

# Run only backend (http://localhost:5000)
npm run dev:backend

# Build both projects for production testing
npm run build
```

During local development:
- The backend listens on `http://localhost:5000`.
- The frontend runs on `http://localhost:3000`.
- Vite's dev proxy automatically forwards any requests to `/api/*` to `http://localhost:5000`, so no CORS configuration is needed during dev.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & uptime |
| `GET` | `/api/inventory` | Fetch full inventory (devices, racks, stock, etc.) |
| `POST` | `/api/inventory/reset` | Reset database to seed sample data |
| `GET` | `/api/devices` | List all devices |
| `POST` | `/api/devices` | Add new device |
| `PUT` | `/api/devices/:id` | Update device |
| `DELETE` | `/api/devices/:id` | Delete device |
| `POST` | `/api/devices/import` | Bulk import devices from CSV |
| `GET` | `/api/work-orders` | List work orders |
| `POST` | `/api/work-orders` | Create work order |
| `PATCH` | `/api/work-orders/:id/status` | Update work order status |
| `PATCH` | `/api/work-orders/:id/priority`| Update work order priority |
| `DELETE` | `/api/work-orders/:id` | Delete work order |
| `GET` | `/api/stock` | List stock items |
| `POST` | `/api/stock` | Add stock item |
| `PUT` | `/api/stock/:id` | Update stock item |
| `PATCH` | `/api/stock/:id/change` | Adjust stock quantity |
| `DELETE` | `/api/stock/:id` | Delete stock item |
| `GET` | `/api/suppliers` | List suppliers |
| `POST` | `/api/suppliers` | Add supplier |
| `PUT` | `/api/suppliers/:id` | Update supplier |
| `DELETE` | `/api/suppliers/:id` | Delete supplier |
| `GET` | `/api/racks` | List racks |
| `POST` | `/api/racks` | Add rack |
| `DELETE` | `/api/racks/:id` | Delete rack |
| `GET` | `/api/logs` | View activity audit logs |
