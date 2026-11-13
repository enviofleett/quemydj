# CueMyDJ — Live Music Request & DJ Discovery Platform

**CueMyDJ** is a mobile-first web application connecting event guests with live DJs. Guests can discover live DJs, scan booth/table QR codes, browse live session details, submit song requests with tips, simulate payment authorization, and follow their song's progress in real-time. DJs use a booth-optimized workspace to control queue intake, set song statuses (Waiting → Accepted → Playing → Played), and monitor live earnings.

---

## 🚀 Key Features

### 1. Guest Experience
- **Live DJ Discovery (`/discover`):** Real-time list of live DJs with distance indicators, set times, genre tags, and minimum request pricing. Includes manual district/city selector fallback when GPS location is denied.
- **Venue QR Scanner & Passcode Access (`/qr-scanner`):** Simulated laser-line camera viewfinder with quick code resolution and test code triggers (`SKY99`, `PULSE`, `RETRO`).
- **DJ Profile & Live Session Details (`/djs/[djId]`):** Comprehensive DJ identity, live set window, venue location, minimum request price, announcement banners, guidelines, and queue activity feed.
- **Interactive 3-Step Song Request Flow (`/request/[sessionId]`):**
  1. *Track Selection:* Searchable catalog with genre filters, album artwork, release year, duration, and BPM indicators.
  2. *Review & Priority Tip:* Enter guest table/name, dedication note, and priority queue boost tips ($0, +$5, +$10, +$20). Transparent fee breakdown and money-back guarantee banner.
  3. *Demonstration Checkout:* Apple Pay, Credit Card, Cash App, or Demo Wallet with simulated payment success (confetti burst + automatic redirection) and failure handling.
- **Real-Time Request Status & Timeline (`/requests/[requestId]`):**
  - Multi-state progression: `1. Waiting for DJ` → `2. Accepted` → `3. Now Playing` (with speaker indicator) → `4. Played`.
  - Terminal states: `Declined (Refunded)` with DJ rationale and refund proof.
  - Interactive verification: Confirm song was heard or report playback issues.
- **Request History (`/requests`):** Filter by All, Active, Completed, or Declined with receipts and timestamps.
- **Guest Profile & Preferences (`/profile`):** Favorite genres, push notifications for song milestones, refund terms, and support FAQ.

### 2. DJ Workspace
- **Operational Booth Overview (`/dj`):** Live/paused toggle, quick metrics (Pending review, in rotation, fulfilled, session payout), recent activity feed, and booth event passcode display.
- **High-Visibility 4-Column Live Queue (`/dj/queue`):**
  - **Waiting for DJ:** Large touch targets to *Accept* or *Decline*.
  - **Accepted in Set:** Re-order and *Spin Now (Mark as Playing)*.
  - **Now Playing:** Prominent neon indicator with *Finished Track (Mark as Played)*.
  - **Recently Played:** Timestamped session log with gross fee earned.
  - *Decline Dialog:* Preset reasons (vibe mismatch, duplicate track, low BPM, explicit lyrics) with custom reason input. Automatically triggers guest refund.
- **Session Management (`/dj/sessions`):** Edit live event name, start/end hours, event access code, minimum request price ($5–$100), and guest announcement message.
- **Earnings & Payout Ledger (`/dj/earnings`):** Tonight's net earnings, pending morning bank deposit, itemized transaction ledger, and Stripe Connect status.
- **DJ Settings (`/dj/settings`):** Stage name, DJ handle, sound manifesto, and default pricing.

### 3. Cross-Experience Shared State
- **Instant Synchronization:** When a DJ updates a request in `/dj/queue`, the guest's view in `/requests/[requestId]` updates in real time.
- **Top Demo Role Switcher:** Fixed demo bar to toggle between **Guest View** and **DJ Workspace** at any point, with a quick data reset button.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Dark nightlife palette: Charcoal `#080c14`, Slate `#111722`, Emerald `#10b981`, Amber `#f59e0b`)
- **Icons:** Lucide React
- **Animations:** Canvas Confetti

---

## 📦 Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Production build:**
   ```bash
   npm run build
   npm run start
   ```

4. **Linting:**
   ```bash
   npm run lint
   ```

---

## 🧪 Verified End-to-End Test Journey

1. **Discover:** Open `/discover`, view DJ Kofi Beats live at *Skyline Rooftop Lounge*.
2. **Access Session:** Tap "View Session" or scan event QR `SKY99` via `/qr-scanner`.
3. **Select Track:** Click "Request a Song", search "Last Last" by Burna Boy, and continue.
4. **Review & Tip:** Add a table note ("VIP Booth 4") and an optional tip, verifying the transparent total price.
5. **Checkout:** Select Apple Pay and tap "Pay with Apple Pay (Simulate Success)".
6. **Track Status:** Observe the timeline in `Waiting for DJ` state.
7. **Switch Role:** Click "DJ Workspace" in the top demo bar.
8. **Booth Action:** Go to `/dj/queue`, find the request in column 1, and click **Accept**.
9. **Transition:** Click **Spin Now (Mark as Playing)**, then **Finished Track (Mark as Played)**.
10. **Verify Guest:** Switch back to "Guest View" and verify the request is now marked as `Played`, with the playback confirmation button active.

---

## 🔒 Simulated vs. Production Integrations

| Feature | Current Prototype | Production Integration |
|---|---|---|
| **State Storage** | React Context + LocalStorage | PostgreSQL / Supabase Realtime + WebSockets |
| **Payments** | Simulated checkout authorization | Stripe Connect / Apple Pay Web Payments SDK |
| **Music Catalog** | Curated club mock tracks (Afrobeats, Amapiano, House) | Spotify Web API / Apple Music MusicKit |
| **Authentication** | Demo role toggle (Guest ↔ DJ) | Clerk / Supabase Auth / NextAuth |
| **Notifications** | In-app alerts | Web Push / SMS (Twilio) |
