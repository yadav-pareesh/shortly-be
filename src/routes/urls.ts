import { Router } from "express";
import {
  urlValidationRules,
  updateUrlValidationRules,
  validate,
} from "../utils/validation";
import * as urlController from "../controllers/urlController";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Create short URL
router.post(
  "/",
  rateLimiter,
  urlValidationRules(),
  validate,
  urlController.createShortUrl
);

// Get overall stats
router.get("/stats/overview", urlController.getStats);

// Get all URLs
router.get("/", urlController.getAllUrls);

// Get URL stats
router.get("/:shortCode/stats", urlController.getUrlStats);

// Record click
router.post("/:shortCode/click", urlController.recordClick);

// Update custom alias
router.put(
  "/:shortCode",
  updateUrlValidationRules(),
  validate,
  urlController.updateUrl
);

// Delete URL
router.delete("/:shortCode", urlController.deleteUrl);

// Redirect to original URL
router.get("/:shortCode", urlController.redirectUrl);

export default router;
