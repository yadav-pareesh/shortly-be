import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const urlValidationRules = () => {
  return [
    body('originalUrl')
      .trim()
      .isURL({ require_protocol: true })
      .withMessage('Invalid URL format')
      .isLength({ max: 2048 })
      .withMessage('URL is too long (max 2048 characters)'),
    body('customAlias')
      .optional()
      .trim()
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Custom alias can only contain letters, numbers, hyphens, and underscores')
      .isLength({ min: 3, max: 20 })
      .withMessage('Custom alias must be between 3 and 20 characters'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ];
};

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      statusCode: 400,
      data: errors.array(),
    });
  }
  next();
};