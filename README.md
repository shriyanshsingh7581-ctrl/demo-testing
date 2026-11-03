# Thanker: Salon (Jaunpur) — Nearby Salon Discovery & Live Queue Token Booking

**Jaunpur's #1 Smart Salon Finder & Live Token Booking System** with real-time queue tracking and a separate Salon Partner Admin Portal.

---

## Separate URLs for Customer Website & Admin Panel

Customer website par **Admin Panel** ka koi button ya link nahi dikhta hai. Dono ke alag URLs hain:

1. **Public Customer Website (Main URL):**
   - `https://your-project-name.vercel.app/`
   - Yahan sirf Customers ke liye Nearby Salons, Search, Area Filters, aur Live Token Booking dikhega.

2. **Secret Salon Partner Admin Panel (`/admin` URL):**
   - `https://your-project-name.vercel.app/admin` (ya `/?admin=true` / `/#/admin`)
   - **Admin PIN:** `7777`
   - Ye URL sirf Salon Owner / Admin ke liye hai jahan se Live Queue (`Call Next Token`, `Walk-In Token`, `Salon Management`) control hota hai.

---

## Vercel Deployment Guide

1. Code ko **GitHub** par push/sync karein.
2. [vercel.com](https://vercel.com) par project **Deploy / Redeploy** karein (`vercel.json` aur `.npmrc` pehle se configured hain).
