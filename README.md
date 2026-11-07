# ⚡ ZipDrop

> **Universal Zero-Server Peer-to-Peer File Transfer Protocol**  
> High-speed, end-to-end encrypted direct file sharing between any devices (Phone to PC, Mac to Android, etc.) powered by **WebRTC DataChannels** and **React**.

---

## 🚀 Key Features

* **Zero Cloud Storage & 100% Free**: Files never touch any cloud server or database. Data streams directly peer-to-peer (P2P) between two browsers over local WiFi/LAN at peak speeds (50–100 MB/s).
* **Unlimited File Size**: Handles 10MB to 10GB+ smoothly without memory overflow by splitting files into **16KB binary chunks (`ArrayBuffer`)** with backpressure flow control.
* **AirDrop-Style Radar UI**: Live animated radar detects nearby connected devices in real time with custom icons (Laptop, Smartphone, Tablet).
* **Instant QR Code Pairing**: Scan a QR code on your PC screen with your mobile phone camera to instantly join the room.
* **End-to-End Encrypted**: Native WebRTC DTLS/SCTP encryption ensures complete privacy.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, QR Code SVG
* **P2P Networking**: Native Browser WebRTC (`RTCPeerConnection`, `RTCDataChannel`)
* **Signaling Server**: Node.js, Express, Socket.IO, TypeScript

---

## 📦 Getting Started (Local Development)

### 1. Start the Signaling Server
```bash
npm run server
# Runs on http://localhost:5000
```

### 2. Start the Frontend Client
```bash
npm run client
# Runs on http://localhost:5173
```

Open `http://localhost:5173` in two different browser tabs (or on your laptop and phone) to test live direct P2P transfers!

---

## 🌐 Free Lifetime Deployment (₹0 Cost)

* **Frontend (`/client`)**: Deploy to [Vercel](https://vercel.com) (Free Hobby Tier).
* **Signaling Server (`/server`)**: Deploy to [Render](https://render.com) or [Railway](https://railway.app) (Free Container Tier). Set `VITE_SIGNALING_URL` in Vercel to your deployed server URL.
