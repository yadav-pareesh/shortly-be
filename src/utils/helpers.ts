import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 6);

export const getBaseUrl = (): string => process.env.BASE_URL || 'http://localhost:5000';

export const generateShortCode = (): string => {
  return nanoid();
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getExpirationTime = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const generateQRCode = async (url: string): Promise<string> => {
  const encodedUrl = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`;
};

export const isUrlExpired = (expiresAt?: Date): boolean => {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
};