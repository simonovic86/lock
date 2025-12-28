# Time-Locked Vault

A client-side, serverless web app for **delaying access to secrets** using cryptographic time-locks.

This tool is designed to protect against **impulsive future decisions**, not against a determined attacker with infinite time.

No accounts. No backend. No plaintext ever leaves the browser.

---

## What This Is

Time-Locked Vault lets you encrypt a secret in your browser and make it **cryptographically inaccessible** until a chosen time.

The encrypted secret is embedded directly into a URL.
The decryption key is held behind a **time-based access condition** enforced by Lit Protocol.

You cannot decrypt the secret early — even if you control the app, the browser, or the storage.

---

## What This Is NOT

This is **not** a data destruction tool.  
This is **not** a DRM system.  
This does **not** protect against someone willing to wait until the unlock time.

Deleting the app, clearing storage, or losing the UI does NOT destroy the secret.

---

## Threat Model (Explicit)

### Protects against
- Impulsive actions by future-you
- Panic decisions
- Regret-driven access attempts
- Local tampering (storage deletion, reloads, reinstalls)

### Does NOT protect against
- Waiting until the unlock time
- Copying the encrypted URL and keeping it forever
- A fully compromised environment
- Social engineering Lit or breaking cryptography

If you need destruction or revocation, this is the wrong tool.

---

## How It Works (Actual Flow)

1. **Client-side encryption**
    - Your secret is encrypted locally using AES-GCM.
    - Plaintext never leaves the browser.

2. **Key custody via Lit**
    - The encryption key is wrapped behind a Lit time condition.
    - Lit will only release the key *after* the specified unlock time.

3. **URL-embedded ciphertext**
    - The encrypted payload is embedded directly into the URL.
    - This URL is the *only* backup and restore mechanism.

4. **No servers**
    - No backend
    - No database
    - No accounts
    - No recovery if you lose the URL

---

## Pages

- `index.html`
    - Create vaults
    - List locally known vault references (UX only)

- `vault.html`
    - Attempt unlock
    - Decrypt after time condition is met

- `restore.html`
    - Restore a vault using a backup URL

---

## Important Properties

### Deletion ≠ Destruction
Removing a vault from the UI or clearing browser storage does **not** delete the secret.

If the encrypted URL exists, the vault exists.

### Restore Is Trivial (By Design)
Restore is simply:
> open the URL in any browser

There is no identity, ownership, or account recovery layer.

---

## Limitations

- URLs may be long
- URLs may appear in browser history
- Anyone with the URL can attempt to unlock *after* the time passes
- No revocation or early cancellation

These are conscious trade-offs to keep the system trustless and simple.

---

## Who This Is For

- People who want to delay access to secrets
- Self-control and commitment use cases
- Developers who want inspectable, minimal security tools

---

## License

MIT
