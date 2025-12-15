import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { MAX_VAULT_SIZE } from '@/lib/storage';

const PINATA_API = 'https://api.pinata.cloud';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Rate limit: 5 uploads per IP per hour
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Verify CAPTCHA token with Cloudflare Turnstile
 */
async function verifyCaptcha(token: string, ip: string): Promise<boolean> {
  // Skip in development
  if (token === 'development-mode') {
    return true;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn('TURNSTILE_SECRET_KEY not configured, skipping verification');
    return true;
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const result: TurnstileVerifyResponse = await response.json();
  return result.success;
}

/**
 * Upload data to Pinata IPFS
 */
async function uploadToPinata(data: ArrayBuffer): Promise<string> {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    throw new Error('PINATA_JWT not configured');
  }

  const blob = new Blob([data], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, 'vault.bin');

  const response = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  try {
    // Check rate limit
    const rateLimit = checkRateLimit(`upload:${ip}`, {
      maxRequests: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        },
      );
    }

    // Parse request body
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const captchaToken = formData.get('captchaToken') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { success: false, error: 'CAPTCHA token required' },
        { status: 400 },
      );
    }

    // Verify CAPTCHA
    const captchaValid = await verifyCaptcha(captchaToken, ip);
    if (!captchaValid) {
      return NextResponse.json(
        { success: false, error: 'CAPTCHA verification failed' },
        { status: 403 },
      );
    }

    // Check file size
    if (file.size > MAX_VAULT_SIZE) {
      const maxMB = MAX_VAULT_SIZE / (1024 * 1024);
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${maxMB}MB.` },
        { status: 413 },
      );
    }

    // Upload to Pinata
    const data = await file.arrayBuffer();
    const cid = await uploadToPinata(data);

    return NextResponse.json(
      { success: true, cid },
      { headers: getRateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}

