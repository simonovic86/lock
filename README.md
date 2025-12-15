# Time-Locked Vault

A fully decentralized app to lock secrets until a specific time. No accounts, no servers, no trust required.

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Secret    │────▶│  Encrypted  │────▶│    IPFS     │
│  (client)   │     │  AES-256    │     │  (Pinata)   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Lit Protocol│
                   │ Time-Lock   │
                   └─────────────┘
```

1. **Encrypt** - Your secret is encrypted client-side with AES-256-GCM
2. **Store** - Encrypted blob uploaded to IPFS (via Pinata)
3. **Time-Lock** - Decryption key locked by Lit Protocol until unlock time
4. **Decrypt** - After time passes, key is released and secret decrypted locally

**No one can access your secret before the unlock time** - not even us, because:
- We never see your plaintext secret
- We never hold your decryption key
- Time-lock is enforced by Lit Protocol's decentralized network

## Features

- **Text secrets** - Lock any message
- **Vault naming** - Give your vaults memorable names
- **Time presets** - 1 hour, 24 hours, 7 days, 30 days, or custom
- **Destroy after read** - Self-destructing vaults that delete after first unlock
- **Shareable links** - Links work on any device (vault data encoded in URL)
- **QR codes** - Scan to share vault links
- **Backup/Restore** - Export all vaults to a single link, restore on any browser
- **Verify on IPFS** - View your encrypted data on the public IPFS network
- **No accounts** - Just create and share
- **Decentralized** - Small vaults need zero external services; large vaults use Filecoin-backed IPFS

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Encryption | Web Crypto API (AES-256-GCM) |
| Storage | URL-inline (small <8KB) or IPFS via Pinata (large) |
| Time-Lock | Lit Protocol (datil-dev network) |
| Local Data | IndexedDB (idb-keyval) |
| Anti-Abuse | Cloudflare Turnstile + Rate Limiting |

## Setup

### Prerequisites

- Node.js 18+
- Free [Pinata](https://pinata.cloud) account (only needed for vaults >8KB)

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd lock

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your API keys
```

### Get Pinata API Key (for large vaults)

> **Note:** Small vaults (<8KB) are stored directly in the URL — no API key needed! Most use cases (passwords, phone numbers, short notes) work without any external service.

For larger vaults, set up Pinata:

1. Create free account at [pinata.cloud](https://pinata.cloud)
2. Go to API Keys in dashboard
3. Create new key with "pinFileToIPFS" and "unpin" permissions
4. Add to `.env.local`:

```env
PINATA_JWT=your_jwt_token_here
```

> **Note:** The JWT is server-only (not exposed to clients). Uploads are rate-limited to 5 per IP per hour with a 1MB max file size.

### Get Cloudflare Turnstile Keys (Anti-Abuse)

1. Go to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) (free)
2. Add a new site
3. Copy the Site Key and Secret Key to `.env.local`:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```

> **Note:** CAPTCHA is optional. Without these keys, the app works but has no bot protection.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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

### Verify on IPFS

Click "View on IPFS" to see your encrypted data exists on the public IPFS network via the [IPLD Explorer](https://explore.ipld.io).

## Development

### Commands

Using **Make** (recommended):

| Command | Description |
|---------|-------------|
| `make dev` | Start development server |
| `make stop` | Stop server on port 3000 |
| `make restart` | Stop + start dev server |
| `make status` | Check if server is running |
| `make build` | Build for production |
| `make lint` | Run ESLint |
| `make clean` | Remove .next and node_modules |
| `make help` | Show all commands |

Using **npm**:

```bash
npm run dev       # Start dev server
npm run stop      # Stop server on port 3000
npm run restart   # Stop + start
npm run status    # Check if running
npm run build     # Production build
npm run lint      # Run linter
```

### Architecture

```
src/
├── app/
│   ├── page.tsx          # Home - create vault + vault list
│   ├── vault/[id]/       # View/unlock individual vault
│   ├── restore/          # Restore vaults from backup link
│   └── api/
│       ├── upload/       # Server-side IPFS upload with rate limiting
│       ├── unpin/        # Remove vault from IPFS
│       └── verify-captcha/ # CAPTCHA verification
├── components/
│   ├── CreateVaultForm   # Main form for creating vaults
│   ├── TimeSelector      # Time picker component
│   ├── VaultCountdown    # Countdown timer display
│   ├── ConfirmModal      # Confirmation dialogs
│   ├── ErrorBoundary     # Global error handling
│   ├── QRCode            # QR code generator
│   ├── Toast             # Notification component
│   └── Turnstile         # CAPTCHA widget
└── lib/
    ├── crypto.ts         # AES-256-GCM encryption
    ├── ipfs.ts           # IPFS upload/fetch via server API
    ├── lit.ts            # Lit Protocol time-lock
    ├── storage.ts        # IndexedDB vault storage
    ├── share.ts          # URL encoding for sharing
    ├── rate-limit.ts     # In-memory rate limiting
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
| Encrypted secret | IPFS (public) | Anyone can see the encrypted blob |
| Decryption key | Lit Protocol | Only released after unlock time |
| Vault metadata | Your browser (IndexedDB) | Only on your device |
| Shareable link | URL hash | Anyone with the link |

### What we DON'T have access to:
- Your plaintext secret
- Your decryption key
- Your vault list (stored locally)

### Abuse Prevention

| Protection | Implementation |
|------------|----------------|
| CAPTCHA | Cloudflare Turnstile (optional) |
| Rate Limiting | 5 uploads per IP per hour |
| Size Limit | 1MB max per vault |
| Server-side JWT | Pinata key not exposed to clients |

### Trust assumptions:
- **Lit Protocol** - Decentralized network enforces time-lock honestly
- **IPFS/Pinata** - Data remains available (pinned by Pinata)
- **Your browser** - Crypto operations are secure

## Limitations

- **Max secret size** - 1MB per vault (rate-limited to prevent abuse)
- **Time accuracy** - Depends on blockchain timestamp (±minutes)
- **Data persistence** - Relies on Pinata pinning; unpinned data may disappear
- **Network required** - Need internet to create/unlock vaults
- **Rate limits** - 5 IPFS uploads per hour per IP address

## License

MIT

---

**No accounts. No servers. Your data lives on IPFS, time-locked by Lit Protocol. We keep nothing.**
