# Deployment Guide: College Management System

This guide outlines the steps to deploy your CMS with the backend on **Render** and the frontend on **Vercel**.

## Phase 1: Backend Deployment (Render)

### 1. Create a New Web Service
- Connect your GitHub repository to [Render](https://render.com).
- **Service Name**: `cms-backend` (or your choice).
- **Environment**: `Node`.
- **Root Directory**: `backend` (Important!).

### 2. Configure Build & Start
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. Environment Variables
Add the following in the **Environment** tab:
| Key | Value |
| --- | --- |
| `PORT` | `10000` (Render will override this, but keeping a default is safe) |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long, secure random string |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret |
| `ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` (Add after Vercel deployment) |

---

## Phase 2: Frontend Deployment (Vercel)

### 1. Create a New Project
- Connect your GitHub repository to [Vercel](https://vercel.com).
- **Framework Preset**: `Next.js`.
- **Root Directory**: `apps/web-shell` (Important!).

### 2. Environment Variables
Add the following during setup:
| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://cms-backend.onrender.com/api` (Replace with your actual Render URL) |

---

## Phase 3: Post-Deployment Sync

1. Once your **Render** backend is live, copy its URL (e.g., `https://cms-backend.onrender.com`).
2. Go to your **Vercel** dashboard, navigate to **Settings > Environment Variables**, and ensure `NEXT_PUBLIC_API_URL` is set to `https://your-render-url.onrender.com/api`.
3. Go back to your **Render** dashboard and add your **Vercel** URL to the `ALLOWED_ORIGINS` environment variable (e.g., `https://cms-frontend.vercel.app`).
4. Re-deploy the backend on Render to apply the new CORS settings.

## Verification Checklist
- [ ] Open the Vercel URL.
- [ ] Log in with your admin or student credentials.
- [ ] Check the "Network" tab in the browser console for any 401/403/500 errors.
- [ ] Ensure the "Connected to backend" message appears in the console (Socket connection).
