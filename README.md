# Time-Locked Vault

Lock any secret until a specific time. Fully decentralized, client-side encrypted.

## How It Works

1. **Encrypt**: Your secret is encrypted with AES-256-GCM in your browser
2. **Store**: Encrypted data is uploaded to IPFS (decentralized storage)
3. **Time-Lock**: The decryption key is secured via Lit Protocol with a time-based condition
4. **Unlock**: After the unlock time, anyone with the vault link can decrypt

**No servers. No databases. No backdoors.**

## Tech Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Encryption**: AES-256-GCM (Web Crypto API)
- **Storage**: IPFS via Pinata
- **Time-Lock**: Lit Protocol

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```

3. Get a free Pinata API key:
   - Sign up at https://pinata.cloud
   - Go to API Keys → New Key
   - Copy the JWT token

4. Create `.env.local`:
   ```
   NEXT_PUBLIC_PINATA_JWT=your_jwt_token_here
   ```

5. Run the dev server:
   ```bash
   npm run dev
   ```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User's Browser                       │
├─────────────────────────────────────────────────────────┤
│  Secret → AES-256-GCM Encrypt → Encrypted Blob          │
│                                      │                   │
│                                      ▼                   │
│                              ┌──────────────┐            │
│                              │    IPFS      │            │
│                              │  (Pinata)    │            │
│                              └──────────────┘            │
│                                      │                   │
│  Symmetric Key → Lit Protocol → Time-Locked Key         │
│                                      │                   │
│                              ┌──────────────┐            │
│                              │ Lit Network  │            │
│                              │ (Decentralized)│          │
│                              └──────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## Security

- All encryption happens client-side
- Symmetric keys never leave your browser unencrypted
- IPFS only stores encrypted blobs
- Lit Protocol enforces time-based access control
- No server-side code = no server-side attack surface

## License

MIT
