# Time-Locked Vault

A fully decentralized app to lock secrets until a specific time. No accounts, no servers, no trust required.

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Secret    │────▶│  Encrypted  │────▶│  URL Hash   │
│  (client)   │     │  AES-256    │     │  (inline)   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Lit Protocol│
                   │ Time-Lock   │
                   └─────────────┘
```

1. **Encrypt** - Your secret is encrypted client-side with AES-256-GCM
2. **Store** - Encrypted data is embedded directly in the shareable URL
3. **Time-Lock** - Decryption key locked by Lit Protocol until unlock time
4. **Decrypt** - After time passes, key is released and secret decrypted locally

**No one can access your secret before the unlock time** - not even us, because:
- We never see your plaintext secret
- We never hold your decryption key
- Time-lock is enforced by Lit Protocol's decentralized network
- **No server required** - the app is pure static HTML/JS

## Features

- **Text secrets** - Lock any message (up to 32KB)
- **Vault naming** - Give your vaults memorable names
- **Time presets** - 1 hour, 24 hours, 7 days, 30 days, or custom
- **Destroy after read** - Self-destructing vaults that delete after first unlock
- **Shareable links** - Links work on any device (vault data encoded in URL)
- **QR codes** - Scan to share vault links
- **Backup/Restore** - Export all vaults to a single link, restore on any browser
- **No accounts** - Just create and share
- **Truly serverless** - Deploy as static files anywhere

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Encryption | Web Crypto API (AES-256-GCM) |
| Storage | URL-inline (all data in shareable link) |
| Time-Lock | Lit Protocol (datil-dev network) |
| Local Data | IndexedDB (idb-keyval) |
| Hosting | Any static host (GitHub Pages, Netlify, IPFS) |

## Setup

### Prerequisites

- Node.js 18+

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd lock

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **No environment variables needed!** The app runs entirely client-side.

## Usage

### Create a Vault

1. (Optional) Give your vault a name
2. Enter your secret message
3. Select unlock time (or use Custom for specific date/time)
4. (Optional) Enable "Destroy after reading" for self-destructing vaults
5. Click "Lock Secret"
6. Copy the shareable link or scan the QR code

### Unlock a Vault

1. Open the vault link
2. Wait for countdown (if still locked)
3. Click "Unlock Vault"
4. View your decrypted secret

> **Note:** If the vault has "Destroy after reading" enabled, you'll see a confirmation warning before unlocking.

### Backup Your Vaults

1. Click "Backup" button on home page
2. Save the copied link somewhere safe
3. On a new browser, paste the link to restore all vaults

## Development

### Commands

Using **Make** (recommended):

| Command | Description |
|---------|-------------|
| `make dev` | Start development server |
| `make build` | Build for production (static export) |
| `make stop` | Stop server on port 3000 |
| `make restart` | Stop + start dev server |
| `make status` | Check if server is running |
| `make lint` | Run ESLint |
| `make clean` | Remove .next and node_modules |
| `make help` | Show all commands |

Using **npm**:

```bash
npm run dev       # Start dev server
npm run build     # Build for production (outputs to /out)
npm run lint      # Run linter
```

### Deploy

The app exports as static HTML/JS. After building, the `/out` folder can be deployed anywhere:

```bash
npm run build
# Deploy the /out folder to any static host
```

**Free hosting options:**

| Platform | How to deploy |
|----------|---------------|
| **GitHub Pages** | Push `/out` to `gh-pages` branch |
| **Netlify** | Drag and drop `/out` folder |
| **Cloudflare Pages** | Connect repo, set build command to `npm run build` |
| **Vercel** | Connect repo (auto-detected) |
| **IPFS** | Pin `/out` folder with Pinata or web3.storage |

### Architecture

```
src/
├── app/
│   ├── page.tsx          # Home - create vault + vault list
│   ├── vault/[id]/       # View/unlock individual vault
│   └── restore/          # Restore vaults from backup link
├── components/
│   ├── CreateVaultForm   # Main form for creating vaults
│   ├── TimeSelector      # Time picker component
│   ├── VaultCountdown    # Countdown timer display
│   ├── ConfirmModal      # Confirmation dialogs
│   ├── ErrorBoundary     # Global error handling
│   ├── QRCode            # QR code generator
│   └── Toast             # Notification component
└── lib/
    ├── crypto.ts         # AES-256-GCM encryption
    ├── ipfs.ts           # IPFS fetch (legacy vaults only)
    ├── lit.ts            # Lit Protocol time-lock
    ├── storage.ts        # IndexedDB vault storage
    ├── share.ts          # URL encoding for sharing
    ├── retry.ts          # Retry logic for network calls
    └── errors.ts         # User-friendly error messages
```

## Security

### What's encrypted?
- Your secret is encrypted with a random AES-256-GCM key
- The key is then encrypted by Lit Protocol with time-based access control
- Decrypted secrets are cleared from memory when you navigate away

### What's stored where?

| Data | Location | Visibility |
|------|----------|------------|
| Encrypted secret | URL hash | Anyone with the link |
| Decryption key | Lit Protocol | Only released after unlock time |
| Vault metadata | Your browser (IndexedDB) | Only on your device |

### What we DON'T have access to:
- Your plaintext secret
- Your decryption key
- Your vault list (stored locally)
- **We have no servers** - nothing to access!

### Trust assumptions:
- **Lit Protocol** - Decentralized network enforces time-lock honestly
- **Your browser** - Crypto operations are secure

## Limitations

- **Max secret size** - 32KB (must fit in URL)
- **Time accuracy** - Depends on blockchain timestamp (±minutes)
- **Network required** - Need internet to create/unlock (Lit Protocol)
- **URL length** - Very long URLs may not work in some apps (SMS, etc.)

## License

MIT

---

**No accounts. No servers. Pure client-side encryption. Time-locked by Lit Protocol. We keep nothing.**
