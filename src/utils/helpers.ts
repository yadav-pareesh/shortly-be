import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 6);

export const getBaseUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:${process.env.PORT || 5000}`;
  }
  return process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
};

export const generateShortCode = (): string => {
  return nanoid();
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getExpirationTime = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const generateQRCode = (url: string): string => {
  const encodedUrl = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&margin=1`;
};

export const isUrlExpired = (expiresAt?: Date | string | null): boolean => {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
};
