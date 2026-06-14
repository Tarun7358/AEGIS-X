# AEGIS X — Real-Time Discord Security & SOC Platform (v2.0)

AEGIS X is a production-grade, state-of-the-art **Security Operations Center (SOC)** and automation platform for Discord servers. standardizing on a premium **Rage Optimizer** aesthetic (neon-crimson/purple glassmorphic dark theme), AEGIS X provides real-time monitoring, threat emulation, automated playbooks, zero-trust verification, and server configuration backup recovery.

---

## Key Features (v2.0 SOC Expansion)

### 1. Real-Time SOC Command Center
*   **Live Console Dashboard**: Visualizes active server health scores, active incident telemetry, quarantined member status, and real-time activity streams.
*   **Security Shields Console**: Granular control toggle switches for active security subsystems:
    *   **Anti-Nuke Engine**: Intercepts unauthorized channel/role creation or deletions.
    *   **Anti-Raid Subsystem**: Monitors join frequencies and locks invites during join-floods.
    *   **Anti-Spam Filter**: Automatically detects invite links and spam bursts.
    *   **Anti-Scam Guard**: Identifies phishing links, false giveaways, and Nitro scams.
    *   **Anti-Phishing Filter**: Scans chat payloads for known credentials harvesting landing pages.
    *   **Anti-Malware scanner**: Flags executable payloads or dangerous attachment extensions.
*   **Emergency Lockdown**: A high-impact toggle to immediately lock all write channels and secure the guild.

### 2. Zero-Trust Verification Pipeline
*   **4-Stage Join Screening**: Intercepts every new member joining the guild. Runs a comprehensive account-age and behavior risk profile evaluation.
*   **Real-time Queue Gating**: Members are routed to:
    *   *Passed / Auto-Approved*: Instantly assigned verified roles.
    *   *Pending Verification*: Gated with Text/CAPTCHA challenges.
    *   *Quarantined*: Locked in a detention role for staff review.
*   **Verification Log**: Displays steps executed by the pipeline (`Risk Engine`, `Alt Detection`, `Decision`).

### 3. Threat Intelligence Profile Auditing
*   **Behavioral Auditing**: Aggregates behavioral timeline logs for flagged users.
*   **Threat Score Meter**: Evaluates threat profiles from 0 to 100 with dynamic ratings (Safe, Moderate, High, Critical).

### 4. Incident Response Playbooks
*   **Trigger Engine**: Automatically runs response playbooks for `ANTI_SPAM`, `ANTI_RAID`, and `ANTI_NUKE`.
*   **Action Lifecycle**: Deletes messages, executes timeouts, creates incident reports, alerts moderators, and locks invites.

### 5. Permission Audit Center
*   **Automated Scans**: Scans role configurations for hazardous permissions (e.g., Administrator, Manage Channels).
*   **One-Click Fixes**: Allows administrators to immediately patch identified vulnerabilities directly from the dashboard.

### 6. Configuration Backup & Recovery
*   **Automated Snapshots**: Stores complete configurations (roles, channel layouts, permission matrices) inside Supabase.
*   **Instant Restore**: Reverts modifications or recovers server state with a single button.

---

## Technical Architecture

*   **Frontend**: React (Vite) + Tailwind CSS + Zustand (`useStore.js`) + Lucide Icons.
*   **Backend**: Node.js (Express) + Socket.IO + Discord.js bot client.
*   **Database**: Supabase PostgreSQL with custom schemas + Local mock fallback configuration for local development.

---

## Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Discord Bot token and client credentials
*   Supabase Project URL and API Keys (optional; falls back to `mockDb` if not provided)

### 1. Install Dependencies
Run the installation script in the root directory:
```bash
npm run install-all
```

### 2. Configuration Settings
Create a `.env` file in the `server` directory. Use the `server/.env.example` template:
```env
PORT=5000
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:5000/api/auth/callback
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

Toggle the mock mode inside `server/src/config.js` to transition between simulation/mock mode and live Supabase production database:
```javascript
module.exports = {
  shouldMock: false // Set to false to use Supabase database
};
```

### 3. Run Locally
Start both backend API and frontend Vite servers concurrently:
*   **Start Backend**: `npm run server` (Runs on `http://localhost:5000`)
*   **Start Frontend**: `npm run dashboard` (Runs on `http://localhost:5173`)

---

## Verification & Simulation Testing
Use the **Threat Emulators** on the Dashboard Console to trigger mock security actions:
*   *Simulate Member Join*: Triggers the 4-stage join-screening pipeline.
*   *Simulate Anti-Spam Trigger*: Fires the anti-spam playbook, logging muted cases.
*   *Simulate Anti-Nuke (Critical)*: Triggers the server-wide lockdown playbook, revoking admin roles and capturing recovery snapshots.
