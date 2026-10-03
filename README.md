# HyperBeam | Frontend Web App & Transfer HUD

Zero-cost, high-velocity large file transfer web application built with **Vite, React 19, TypeScript**, and **Vanilla CSS** following the HyperBeam Space-Tech Design System.

## Architectural Highlights

- **100% Free-Tier Architecture**:
  - **Mode A (WebRTC Direct P2P)**: Direct browser-to-browser SCTP stream over encrypted DataChannels using free Google STUN and Metered OpenRelay TURN. Zero cloud bytes stored ($0 cost).
  - **Mode B (Cloudflare R2 Staging)**: Parallel HTTP/3 chunk uploads directly to Cloudflare R2 edge with $0 egress bandwidth.
- **In-Browser Acceleration & Cryptography**:
  - **Zero-Knowledge Encryption**: 256-bit `AES-256-GCM` key generated client-side via Web Crypto API. Key anchor fragment (`#key=...`) is never transmitted to any server.
  - **Direct-to-Disk Stream Writing**: File System Access API (`showSaveFilePicker`) writes incoming byte streams directly to NVMe/HDD storage without browser heap overflow.
  - **Memory Bounded Slicing**: Web Streams API slices files into 16MB/32MB chunks on-demand.
  - **Integrity Digest**: Streaming `SHA-256` verification.
- **Design System Compliance**:
  - Futuristic Space Tech / Aerospace HUD cockpit.
  - Syncopate (Headings) and Space Mono (Body) typography.
  - Color palette: `#0F172A`, `#1E293B`, `#334155`, `#22C55E`, `#F8FAFC`.
  - 12-column responsive layout, live chunk memory matrix, telemetry gauges, and Web Audio API synthesizer.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Runs at `http://localhost:5173`. Make sure the backend gateway is running at `http://localhost:8787`.

### 3. Build for Production
```bash
npm run build
```

Production static assets are output to `dist/`, ready for direct deployment to **Cloudflare Pages** or **Vercel** with zero configuration.
