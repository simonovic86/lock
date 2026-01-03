/**
 * Polyfills for Node.js globals needed by Lit Protocol
 * Must be imported before any other modules
 */

// Use dynamic import to avoid module resolution issues
async function initPolyfills() {
  if (typeof globalThis.Buffer === 'undefined') {
    const bufferModule = await import('buffer');
    globalThis.Buffer = bufferModule.Buffer;
  }
}

// Run immediately (side effect)
initPolyfills();

// Also export for explicit initialization if needed
export { initPolyfills };
