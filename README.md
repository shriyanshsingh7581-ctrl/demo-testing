# Thanker: Salon — Jaunpur (3-Tier Multi-Vendor Smart Salon Aggregator & Live Queue Platform)

A production-ready, Vercel-deployable 3-Tier Multi-Vendor Web Application for **Thanker: Salon** (Jaunpur's #1 Smart Salon Finder & Live Queue Token Booking Platform).

## 3 Connected Portals & Access URLs

1. **Portal 1 — Customer App (`/?view=customer`)**
   - Discover nearby verified salons across Jaunpur (`Olandganj`, `Civil Lines`, `Line Bazar`, `TDB College Road`, `Machhlishahr Padav`).
   - View **Sponsored Advertisement Banners** and **Live Push Notifications** in real time.
   - Check live queue status (`Now Serving`, `Waiting`, `Est. Wait`, `Next Available Token`) and book an instant digital token with WhatsApp Ticket sharing (`+917043602377`).

2. **Portal 2 — Salon Partner Panel (`/?partner=true` | Demo PIN: `1111`)**
   - Register a new Salon Partner in Jaunpur (submitted to Super Admin for approval).
   - Run the daily **Live Token Queue Controller Board** (`Call Next Token`, `Mark Completed & Paid`, `Skip / No-Show`, `Add Walk-In Customer Token`).
   - Upload custom salon photos, update average wait time per customer, and manage the **Service Price Menu**.

3. **Portal 3 — Main Owner Super Admin Panel (`/?admin=true` | PIN: `7777`)**
   - Executive Overview & Traffic Analytics (`Total Registered Customers`, `Active & Pending Salon Partners`, `Total Token Bookings & Area Breakdown`, `Platform GMV & Ad Revenue`).
   - **Approve / Reject** new Salon Partners, mark salons as **Featured/Sponsored**, monitor all bookings across Jaunpur, broadcast **Push Notifications**, and manage **Sponsored Advertisement Banners**.

## Vercel Deployment

- Includes `vercel.json` and `.npmrc` (`legacy-peer-deps=true`) for zero-error deployment on Vercel.
- Build command: `npm run build` (`vite build`)
- Output directory: `dist`
