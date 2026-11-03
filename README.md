# Thanker: Salon (Jaunpur) — Nearby Salon Discovery & Live Queue Token Booking

**Jaunpur's #1 Smart Salon Finder & Live Token Booking System** with real-time queue tracking and a Salon Partner Admin Panel (`PIN: 7777`).

---

## Vercel Deployment Guide (Step-by-Step)

Is project mein **Vercel deployment** ke liye sabhi zaroori configuration files pehle se added hain:
- `vercel.json` — Vite framework build settings (`npm run build` -> `dist`) aur SPA routing rewrites (`/(.*) -> /index.html`) taaki `/admin` page refresh karne par kabhi `404 Not Found` error na aaye.
- `.vercelignore` — Unnecessary local cache/test files ko ignore karne ke liye.
- `public/_redirects` — Static SPA routing fallback ke liye.

### Method 1: GitHub se Vercel par Deploy karein (Recommended)
1. Is project ke code ko apne **GitHub Repository** mein push karein (AI Studio ke top bar se **Export to GitHub** ya **Download ZIP** karke).
2. [vercel.com](https://vercel.com) par login karein aur **"Add New..." -> "Project"** par click karein.
3. Apna GitHub repository **Import** karein.
4. Vercel automatically `vercel.json` detect kar lega:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **"Deploy"** button par click karein — 1 minute ke andar aapki live link ready ho jayegi!

### Method 2: Vercel CLI se Direct Deploy karein
Agar aap apne computer ke terminal se deploy karna chahte hain:
```bash
npm install
npm run build
npx vercel --prod
```

---

## Live Application Routes & Demo Credentials

- **Customer App (Jaunpur Salon Discovery & Live Token Booking):** `/`
- **Salon Partner Admin Panel (Live Queue Controller):** `/admin` (ya top/bottom switcher button)
- **Demo Admin PIN:** `7777`
- **WhatsApp Ticket Number:** `+91 7043602377`
