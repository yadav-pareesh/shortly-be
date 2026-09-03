import prisma from "../lib/prisma";
import { generateShortCode, generateQRCode, isUrlExpired } from "../utils/helpers";
import { AppError } from "../utils/errorHandler";
import { CreateUrlRequest, ShortUrlResponse } from "../types/index";

export const urlService = {
  async createShortUrl(payload: CreateUrlRequest): Promise<ShortUrlResponse> {
    const { originalUrl, customAlias, expiresAt } = payload;

    // Check if custom alias already exists
    if (customAlias) {
      const existing = await prisma.url.findUnique({
        where: { customAlias },
      });
      if (existing) {
        throw new AppError(409, "Custom alias already in use");
      }
    }

    const shortCode = generateShortCode();

    // Check if short code already exists
    const existingCode = await prisma.url.findUnique({
      where: { shortCode },
    });
    if (existingCode) {
      throw new AppError(409, "Short code already in use");
    }

    const qrCode = await generateQRCode(
      `${process.env.BASE_URL}/${shortCode}`
    );

    const url = await prisma.url.create({
      data: {
        originalUrl,
        shortCode,
        customAlias: customAlias || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        clicks: 0,
      },
    });

    return this.formatUrlResponse(url, qrCode);
  },

  async redirectUrl(shortCodeOrAlias: string): Promise<string> {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ shortCode: shortCodeOrAlias }, { customAlias: shortCodeOrAlias }],
      },
    });

    if (!url) {
      throw new AppError(404, "Short URL not found");
    }

    if (url.expiresAt && isUrlExpired(url.expiresAt)) {
      throw new AppError(410, "This short URL has expired");
    }

    // Update clicks asynchronously
    prisma.url
      .update({
        where: { id: url.id },
        data: { clicks: { increment: 1 } },
      })
      .catch((err: unknown) => {
        console.error("Failed to update clicks:", err);
      });

    return url.originalUrl;
  },

  async getUrlStats(shortCodeOrAlias: string): Promise<ShortUrlResponse> {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ shortCode: shortCodeOrAlias }, { customAlias: shortCodeOrAlias }],
      },
    });

    if (!url) {
      throw new AppError(404, "Short URL not found");
    }

    const qrCode = await generateQRCode(
      `${process.env.BASE_URL}/${url.shortCode}`
    );

    return this.formatUrlResponse(url, qrCode);
  },

  async getAllUrls(skip: number = 0, take: number = 10, search?: string) {
    const where = search
      ? {
          OR: [
            { originalUrl: { contains: search, mode: "insensitive" as const } },
            { customAlias: { contains: search, mode: "insensitive" as const } },
            { shortCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [urls, total] = await Promise.all([
      prisma.url.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.url.count({ where }),
    ]);

    const baseUrl = process.env.BASE_URL;

    const formattedUrls = await Promise.all(
      urls.map(async (url: any) => ({
        id: url.id,
        shortCode: url.shortCode,
        shortUrl: `${baseUrl}/${url.shortCode}`,
        originalUrl: url.originalUrl,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
        clicks: url.clicks,
        customAlias: url.customAlias,
        title: url.title,
        description: url.description,
        qrCode: await generateQRCode(`${baseUrl}/${url.shortCode}`),
      }))
    );

    return { data: formattedUrls, total };
  },

  async updateUrl(
    shortCode: string,
    customAlias: string
  ): Promise<ShortUrlResponse> {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ shortCode }, { customAlias: shortCode }],
      },
    });

    if (!url) {
      throw new AppError(404, "Short URL not found");
    }

    if (customAlias && customAlias !== url.customAlias) {
      const exists = await prisma.url.findUnique({
        where: { customAlias },
      });
      if (exists) {
        throw new AppError(409, "Custom alias already in use");
      }
    }

    const updated = await prisma.url.update({
      where: { id: url.id },
      data: { customAlias: customAlias || null },
    });

    const qrCode = await generateQRCode(
      `${process.env.BASE_URL}/${updated.shortCode}`
    );

    return this.formatUrlResponse(updated, qrCode);
  },

  async deleteUrl(shortCode: string): Promise<boolean> {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ shortCode }, { customAlias: shortCode }],
      },
    });

    if (!url) {
      throw new AppError(404, "Short URL not found");
    }

    await prisma.url.delete({
      where: { id: url.id },
    });

    return true;
  },

  async getStats() {
    const totalUrls = await prisma.url.count();
    const totalClicks = await prisma.url.aggregate({
      _sum: { clicks: true },
    });

    return {
      totalUrls,
      totalClicks: totalClicks._sum.clicks || 0,
    };
  },

  async cleanupExpiredUrls(): Promise<number> {
    const result = await prisma.url.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  },

  formatUrlResponse(url: any, qrCode: string): ShortUrlResponse {
    return {
      id: url.id,
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      clicks: url.clicks,
      customAlias: url.customAlias,
      title: url.title,
      description: url.description,
      qrCode,
    };
  },
};