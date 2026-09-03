import { Request, Response } from "express";
import { urlService } from "../services/urlService";
import { asyncHandler } from "../utils/errorHandler";

export const createShortUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await urlService.createShortUrl(req.body);

    res.status(201).json({
      success: true,
      statusCode: 201,
      data: result,
    });
  }
);

export const redirectUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    const originalUrl = await urlService.redirectUrl(shortCode);
    res.redirect(301, originalUrl);
  }
);

export const getUrlStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    const result = await urlService.getUrlStats(shortCode);

    res.json({
      success: true,
      statusCode: 200,
      data: result,
    });
  }
);

export const getAllUrls = asyncHandler(
  async (req: Request, res: Response) => {
    const skip = Number.parseInt((req.query.skip as string) ?? "0", 10) || 0;
    const take = Number.parseInt((req.query.take as string) ?? "10", 10) || 10;
    const search = req.query.search as string | undefined;

    const { data, total } = await urlService.getAllUrls(skip, take, search);

    res.json({
      success: true,
      statusCode: 200,
      data,
      pagination: {
        skip,
        take,
        total,
        hasMore: skip + take < total,
      },
    });
  }
);

export const updateUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    const { customAlias } = req.body;

    const result = await urlService.updateUrl(shortCode, customAlias);

    res.json({
      success: true,
      statusCode: 200,
      data: result,
    });
  }
);

export const deleteUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;

    await urlService.deleteUrl(shortCode);

    res.json({
      success: true,
      statusCode: 200,
      message: "Short URL deleted successfully",
    });
  }
);

export const getStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const stats = await urlService.getStats();

    res.json({
      success: true,
      statusCode: 200,
      data: stats,
    });
  }
);