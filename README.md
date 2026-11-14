# ⚡ ZipDrop

> **Universal Zero-Server Peer-to-Peer File Transfer Protocol**  
> High-speed, end-to-end encrypted direct file sharing between any devices (Phone to PC, Mac to Android, etc.) powered by **WebRTC DataChannels**, **Socket.IO Signaling**, and **React**.

---

## 🚀 Key Features

* **Zero Cloud Storage & 100% Free**: Files never touch any cloud server or database. Data streams directly peer-to-peer (P2P) between browsers over local WiFi/LAN or across networks.
* **Multi-File Batch Queue**: Select or drag-and-drop multiple files at once, add or remove items before sending, accept/decline incoming batch requests, and transfer files sequentially with per-file and overall batch progress tracking.
* **Zero-RAM Direct Disk Streaming**: Overcomes browser V8 heap limits by streaming chunks directly to the user's hard drive/SSD via the **File System Access API** (`showSaveFilePicker` for single files and `showDirectoryPicker` for batch transfers) with sequential Promise-queued disk writes, keeping RAM consumption constant (<40MB) even on 10GB+ transfers, with graceful fallback for Safari/mobile.
* **Large File Streaming with Backpressure**: Splits files into **16 KB binary chunks (`ArrayBuffer`)** with `RTCDataChannel` `bufferedAmount` flow control (64 KB low threshold / 512 KB high-water mark) to stream large files smoothly without overflowing browser memory.
* **AirDrop-Style Radar UI**: Live animated radar detects nearby connected devices in the same room with device-type recognition (`desktop`, `mobile`, `tablet`).
* **QR Code Pairing & In-App Camera Scanner**: Display a room QR code (`?room=ZIP-XXXX`) or scan another device's QR code directly inside the app using your device camera (`html5-qrcode`) or by entering the 4-character room code manually.
* **Cross-Network STUN & TURN Fallback**: Configured with Google public STUN servers and Metered OpenRelay community STUN/TURN fallback (plus support for custom TURN credentials) for reliable NAT traversal behind mobile data or restrictive firewalls.
* **End-to-End Encrypted**: Native WebRTC DTLS/SCTP encryption ensures complete privacy between peers.

---

## 🛡️ Security & Reliability

* **Filename Sanitization**: Received filenames are sanitized client-side to strip path traversal (`../`), reserved filesystem characters, and control characters, and are capped at 255 characters.
* **Signaling Input Validation**: Room IDs, device names, and device types are validated and sanitized on the signaling server.
* **Rate Limiting & Room Guards**: Socket.IO connections are rate-limited (60 connections/minute per IP), signaling payloads are capped at `1 MB`, and rooms are limited to a maximum of 12 concurrent peers.

---

## 🛠️ Tech Stack

* **Frontend (`/client`)**: React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, `qrcode.react`, `html5-qrcode`, `socket.io-client`
* **P2P Networking**: Native Browser WebRTC (`RTCPeerConnection`, `RTCDataChannel`) with STUN/TURN ICE configuration
* **Signaling Server (`/server`)**: Node.js, Express 5, Socket.IO, TypeScript, CORS, dotenv

---

## 📁 Project Structure

```text
.
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Navbar, Radar, DropZone, QRModal, ScannerModal, IncomingModal, TransferModal
│   │   ├── services/       # WebRTCManager (signaling, ICE/TURN, sequential batch DataChannel transfers)
│   │   ├── types/          # Shared TypeScript interfaces
│   │   └── utils/          # Chunk size, byte formatting, device detection, room codes, filename sanitization
│   └── .env.example        # Client environment variable template
├── server/                 # Express + Socket.IO signaling server
│   └── src/index.ts        # Room management, WebRTC signaling relay, rate limiting, /health endpoint
└── package.json            # Root workspace scripts
```

---

## 📦 Getting Started (Local Development)

### 1. Install Dependencies
```bash
npm --prefix server install
npm --prefix client install
```

### 2. Configure Environment Variables (Optional)
Copy `client/.env.example` to `client/.env` if you want to override defaults:
```env
# Signaling Server URL (defaults automatically to http(s)://<current-host>:5000 if unset)
VITE_SIGNALING_URL=http://localhost:5000

# Optional: Custom TURN server credentials (defaults to Google STUN + OpenRelay community TURN)
# VITE_TURN_SERVER_URL=turn:a.relay.metered.ca:443
# VITE_TURN_USERNAME=your_username
# VITE_TURN_CREDENTIAL=your_password
```
On the server, you can optionally set `PORT` (defaults to `5000`).

### 3. Start the Signaling Server
```bash
npm run server
# Runs on http://localhost:5000 (health check at GET /health)
```

### 4. Start the Frontend Client
```bash
npm run client
# Runs on http://localhost:5173
```

Open `http://localhost:5173` in two browser tabs—or scan the QR code from your phone on the same network—to test live direct P2P transfers!

### 5. Production Build
```bash
npm run build
# Builds both /server (tsc -> dist/) and /client (tsc -b && vite build -> dist/)
```

---

## 🌐 Free Lifetime Deployment (₹0 Cost)

* **Frontend (`/client`)**: Deploy to [Vercel](https://vercel.com) (Free Hobby Tier). Set `VITE_SIGNALING_URL` to your deployed signaling server URL (and optionally `VITE_TURN_SERVER_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` for dedicated TURN relay).
* **Signaling Server (`/server`)**: Deploy to [Render](https://render.com) or [Railway](https://railway.app) (Free Tier) using `npm run build` and `npm start`, with `GET /health` as the health check path.
