export interface UrlEntry {
  _id?: string;
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
  expiresAt?: Date;
  clicks: number;
  customAlias?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface CreateUrlRequest {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string;
}

export interface ShortUrlResponse {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt?: Date;
  clicks: number;
  customAlias?: string;
  title?: string;
  description?: string;
  qrCode?: string;
}

export interface PaginationMeta {
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}