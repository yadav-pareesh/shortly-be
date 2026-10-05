import prisma from "../lib/prisma";
import { fileStorage } from "../database/fileStorage";
import { generateShortCode, generateQRCode, isUrlExpired, getBaseUrl } from "../utils/helpers";
import { AppError } from "../utils/errorHandler";
import { CreateUrlRequest, ShortUrlResponse } from "../types/index";

let isPrismaAvailable: boolean | null = null;
let loggedWarning = false;

const isDbConnectionError = (error: any): boolean => {
  const code = error?.code;
  const name = error?.name;
  const msg = String(error?.message || "");

  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1003" ||
    name === "PrismaClientInitializationError" ||
    msg.includes("Can't reach database server") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("connect ECONNREFUSED")
  );
};

const notifyFallback = (error?: any) => {
  isPrismaAvailable = false;
  if (!loggedWarning) {
    loggedWarning = true;
    console.warn(
      "[Database Notice] PostgreSQL is currently offline/unreachable. Operating with persistent local storage engine."
    );
    if (error?.message) {
      console.warn("Details:", error.message.split("\n")[0]);
    }
  }
};

export const urlService = {
  async createShortUrl(payload: CreateUrlRequest): Promise<ShortUrlResponse> {
    const { originalUrl, customAlias, expiresAt } = payload;
    const cleanAlias = customAlias?.trim() || null;
    const baseUrl = getBaseUrl();

    // Try Prisma DB first
    if (isPrismaAvailable !== false) {
      try {
        if (cleanAlias) {
          const existing = await prisma.url.findFirst({
            where: {
              OR: [{ customAlias: cleanAlias }, { shortCode: cleanAlias }],
            },
          });
          if (existing) {
            throw new AppError(409, "Custom alias is already in use");
          }
        }

        // Retry loop to ensure unique short code
        let shortCode = "";
        let attempts = 0;
        while (attempts < 5) {
          const candidate = generateShortCode();
          const existingCode = await prisma.url.findFirst({
            where: {
              OR: [{ shortCode: candidate }, { customAlias: candidate }],
            },
          });
          if (!existingCode) {
            shortCode = candidate;
            break;
          }
          attempts++;
        }

        if (!shortCode) {
          throw new AppError(500, "Unable to generate unique code. Please try again.");
        }

        const url = await prisma.url.create({
          data: {
            originalUrl,
            shortCode,
            customAlias: cleanAlias,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            clicks: 0,
          },
        });

        isPrismaAvailable = true;
        const displayIdentifier = cleanAlias || shortCode;
        const qrCode = generateQRCode(`${baseUrl}/${displayIdentifier}`);
        return this.formatUrlResponse(url, qrCode, baseUrl);
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    // Local file fallback
    if (cleanAlias) {
      const existing = await fileStorage.findByCodeOrAlias(cleanAlias);
      if (existing) {
        throw new AppError(409, "Custom alias is already in use");
      }
    }

    let shortCode = "";
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateShortCode();
      const existing = await fileStorage.findByCodeOrAlias(candidate);
      if (!existing) {
        shortCode = candidate;
        break;
      }
      attempts++;
    }

    if (!shortCode) {
      throw new AppError(500, "Unable to generate unique code. Please try again.");
    }

    const record = await fileStorage.create({
      originalUrl,
      shortCode,
      customAlias: cleanAlias,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    const displayIdentifier = cleanAlias || shortCode;
    const qrCode = generateQRCode(`${baseUrl}/${displayIdentifier}`);
    return this.formatUrlResponse(record, qrCode, baseUrl);
  },

  async redirectUrl(shortCodeOrAlias: string): Promise<string> {
    const key = shortCodeOrAlias.trim();

    if (isPrismaAvailable !== false) {
      try {
        const url = await prisma.url.findFirst({
          where: {
            OR: [{ shortCode: key }, { customAlias: key }],
          },
        });

        if (url) {
          if (url.expiresAt && isUrlExpired(url.expiresAt)) {
            throw new AppError(410, "This short URL has expired");
          }

          // Asynchronously increment clicks
          prisma.url
            .update({
              where: { id: url.id },
              data: { clicks: { increment: 1 } },
            })
            .catch(() => {});

          return url.originalUrl;
        }

        isPrismaAvailable = true;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    // Local storage lookup
    const record = await fileStorage.findByCodeOrAlias(key);
    if (!record) {
      throw new AppError(404, "Short URL not found");
    }

    if (record.expiresAt && isUrlExpired(record.expiresAt)) {
      throw new AppError(410, "This short URL has expired");
    }

    await fileStorage.incrementClicks(key);
    return record.originalUrl;
  },

  async recordClick(shortCodeOrAlias: string): Promise<void> {
    const key = shortCodeOrAlias.trim();

    if (isPrismaAvailable !== false) {
      try {
        const url = await prisma.url.findFirst({
          where: {
            OR: [{ shortCode: key }, { customAlias: key }],
          },
        });

        if (url) {
          await prisma.url.update({
            where: { id: url.id },
            data: { clicks: { increment: 1 } },
          });
          return;
        }
      } catch (err: any) {
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        }
      }
    }

    await fileStorage.incrementClicks(key);
  },

  async getUrlStats(shortCodeOrAlias: string): Promise<ShortUrlResponse> {
    const key = shortCodeOrAlias.trim();
    const baseUrl = getBaseUrl();

    if (isPrismaAvailable !== false) {
      try {
        const url = await prisma.url.findFirst({
          where: {
            OR: [{ shortCode: key }, { customAlias: key }],
          },
        });

        if (url) {
          const displayIdentifier = url.customAlias || url.shortCode;
          const qrCode = generateQRCode(`${baseUrl}/${displayIdentifier}`);
          return this.formatUrlResponse(url, qrCode, baseUrl);
        }
      } catch (err: any) {
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    const record = await fileStorage.findByCodeOrAlias(key);
    if (!record) {
      throw new AppError(404, "Short URL not found");
    }

    const displayIdentifier = record.customAlias || record.shortCode;
    const qrCode = generateQRCode(`${baseUrl}/${displayIdentifier}`);
    return this.formatUrlResponse(record, qrCode, baseUrl);
  },

  async getAllUrls(skip = 0, take = 50, search?: string) {
    const baseUrl = getBaseUrl();

    if (isPrismaAvailable !== false) {
      try {
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

        isPrismaAvailable = true;
        const formattedUrls = urls.map((url: any) => {
          const displayIdentifier = url.customAlias || url.shortCode;
          return {
            id: url.id,
            shortCode: url.shortCode,
            shortUrl: `${baseUrl}/${displayIdentifier}`,
            originalUrl: url.originalUrl,
            createdAt: url.createdAt,
            expiresAt: url.expiresAt,
            clicks: url.clicks,
            customAlias: url.customAlias,
            title: url.title,
            description: url.description,
            qrCode: generateQRCode(`${baseUrl}/${displayIdentifier}`),
          };
        });

        return { data: formattedUrls, total };
      } catch (err: any) {
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    const { data: records, total } = await fileStorage.getAll(skip, take, search);
    const formattedUrls = records.map((record) => {
      const displayIdentifier = record.customAlias || record.shortCode;
      return {
        id: record.id,
        shortCode: record.shortCode,
        shortUrl: `${baseUrl}/${displayIdentifier}`,
        originalUrl: record.originalUrl,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        clicks: record.clicks,
        customAlias: record.customAlias,
        title: record.title || null,
        description: record.description || null,
        qrCode: generateQRCode(`${baseUrl}/${displayIdentifier}`),
      };
    });

    return { data: formattedUrls, total };
  },

  async updateUrl(
    shortCodeOrAlias: string,
    customAlias: string
  ): Promise<ShortUrlResponse> {
    const key = shortCodeOrAlias.trim();
    const cleanAlias = customAlias.trim();
    const baseUrl = getBaseUrl();

    if (isPrismaAvailable !== false) {
      try {
        const url = await prisma.url.findFirst({
          where: {
            OR: [{ shortCode: key }, { customAlias: key }],
          },
        });

        if (url) {
          if (cleanAlias !== url.customAlias) {
            const conflict = await prisma.url.findFirst({
              where: {
                OR: [{ customAlias: cleanAlias }, { shortCode: cleanAlias }],
              },
            });
            if (conflict && conflict.id !== url.id) {
              throw new AppError(409, "Custom alias is already in use");
            }
          }

          const updated = await prisma.url.update({
            where: { id: url.id },
            data: { customAlias: cleanAlias },
          });

          const displayIdentifier = updated.customAlias || updated.shortCode;
          const qrCode = generateQRCode(`${baseUrl}/${displayIdentifier}`);
          return this.formatUrlResponse(updated, qrCode, baseUrl);
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    const record = await fileStorage.findByCodeOrAlias(key);
    if (!record) {
      throw new AppError(404, "Short URL not found");
    }

    if (cleanAlias !== record.customAlias) {
      const conflict = await fileStorage.findByCodeOrAlias(cleanAlias);
      if (conflict && conflict.id !== record.id) {
        throw new AppError(409, "Custom alias is already in use");
      }
    }

    const updated = await fileStorage.updateCustomAlias(key, cleanAlias);
    if (!updated) {
      throw new AppError(404, "Short URL not found");
    }

    const displayIdentifier = updated.customAlias || updated.shortCode;
    const qrCode = generateQRCode(`${baseUrl}/${displayIdentifier}`);
    return this.formatUrlResponse(updated, qrCode, baseUrl);
  },

  async deleteUrl(shortCodeOrAlias: string): Promise<boolean> {
    const key = shortCodeOrAlias.trim();

    if (isPrismaAvailable !== false) {
      try {
        const url = await prisma.url.findFirst({
          where: {
            OR: [{ shortCode: key }, { customAlias: key }],
          },
        });

        if (url) {
          await prisma.url.delete({
            where: { id: url.id },
          });
          return true;
        }
      } catch (err: any) {
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    const deleted = await fileStorage.delete(key);
    if (!deleted) {
      throw new AppError(404, "Short URL not found");
    }

    return true;
  },

  async getStats() {
    if (isPrismaAvailable !== false) {
      try {
        const [totalUrls, totalClicks] = await Promise.all([
          prisma.url.count(),
          prisma.url.aggregate({
            _sum: { clicks: true },
          }),
        ]);

        return {
          totalUrls,
          totalClicks: totalClicks._sum.clicks || 0,
        };
      } catch (err: any) {
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        } else {
          throw err;
        }
      }
    }

    return fileStorage.getStats();
  },

  async cleanupExpiredUrls(): Promise<number> {
    if (isPrismaAvailable !== false) {
      try {
        const result = await prisma.url.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        });
        return result.count;
      } catch (err: any) {
        if (isDbConnectionError(err)) {
          notifyFallback(err);
        }
      }
    }

    return fileStorage.cleanupExpired();
  },

  formatUrlResponse(url: any, qrCode: string, baseUrl?: string): ShortUrlResponse {
    const base = baseUrl || getBaseUrl();
    const displayIdentifier = url.customAlias || url.shortCode;

    return {
      id: url.id,
      shortCode: url.shortCode,
      shortUrl: `${base}/${displayIdentifier}`,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      clicks: url.clicks || 0,
      customAlias: url.customAlias || null,
      title: url.title || null,
      description: url.description || null,
      qrCode,
    };
  },
};
