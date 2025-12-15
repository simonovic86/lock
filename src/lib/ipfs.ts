/**
 * IPFS utilities
 * 
 * All vaults now use inline storage (data in URL), so IPFS upload is no longer needed.
 * fetchFromIPFS is kept for backwards compatibility with old vaults that used IPFS.
 */

const IPFS_GATEWAYS = [
  'https://w3s.link/ipfs',
  'https://dweb.link/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://ipfs.io/ipfs',
];

/**
 * Convert Uint8Array to URL-safe base64 string (for inline storage)
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
 * Convert URL-safe base64 string back to Uint8Array
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
 * Fetch data from IPFS via public gateways
 * 
 * This is kept for backwards compatibility with old vaults that used IPFS storage.
 * New vaults use inline storage and don't need this.
 */
export async function fetchFromIPFS(cid: string): Promise<Uint8Array> {
  let lastError: Error | null = null;

  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}/${cid}`;
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
