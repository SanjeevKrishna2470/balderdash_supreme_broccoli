import crypto from 'crypto';
import { config } from '../config';

export interface TokenPayload {
  accessToken: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string;
    htmlUrl: string;
    publicRepos: number;
  };
  privateAccess?: boolean;
  gatekeeper?: {
    status: 'welcome' | 'denied';
    dialogue: string;
  };
  exp: number; // Unix timestamp in seconds
}

/**
 * Generates an HMAC-SHA256 signed token containing user authentication details.
 */
export function signToken(payload: Omit<TokenPayload, 'exp'>, expiresInDays = 7): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies the signature and expiration of an HMAC-SHA256 token.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(data)
      .digest('base64url');

    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (signatureBuf.length !== expectedBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired token
    }
    return payload;
  } catch {
    return null;
  }
}
