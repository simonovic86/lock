/**
 * IPFS storage via server-side Pinata upload
 * 
 * For small vaults (<8KB), data is stored inline in the URL — no IPFS needed!
 * For larger vaults, we upload via /api/upload which handles:
 * - Server-side Pinata upload (JWT hidden from client)
 * - Rate limiting (5 uploads per IP per hour)
 * - Size validation (max 1MB)
 * - CAPTCHA verification
 */

import { withRetry } from './retry';
import { INLINE_DATA_THRESHOLD } from './storage';

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

/**
 * Convert Uint8Array to base64 string (for inline storage)
 */
export function toBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert base64 string back to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  // Restore standard base64
  let b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Check if data should be stored inline (in URL) vs IPFS
 */
export function shouldUseInlineStorage(data: Uint8Array): boolean {
  return data.byteLength <= INLINE_DATA_THRESHOLD;
}

/**
 * Upload encrypted data to IPFS via server API
 * 
 * @param data - Encrypted data to upload
 * @param captchaToken - CAPTCHA token for verification
 * @returns IPFS CID
 */
export async function uploadToIPFS(
  data: Uint8Array,
  captchaToken: string,
): Promise<string> {
  return withRetry(
    async () => {
      const buffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(buffer).set(data);

      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', blob, 'vault.bin');
      formData.append('captchaToken', captchaToken);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload failed (${response.status})`);
      }

      return result.cid;
    },
    {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        console.warn(`Upload retry ${attempt}:`, error.message);
      },
    },
  );
}

/**
 * Fetch data from IPFS via public gateways
 */
export async function fetchFromIPFS(cid: string): Promise<Uint8Array> {
  const gateways = [
    `${PINATA_GATEWAY}/${cid}`,
    `https://w3s.link/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
  ];

  let lastError: Error | null = null;

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Gateway ${url} failed:`, error);
      continue;
    }
  }

  throw new Error(`Failed to fetch from IPFS: ${lastError?.message}`);
}
