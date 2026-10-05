import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const urlValidationRules = () => {
  return [
    body('originalUrl')
      .trim()
      .isURL({ require_protocol: true })
      .withMessage('Enter a valid URL with http:// or https://')
      .isLength({ max: 2048 })
      .withMessage('URL is too long (max 2048 characters)'),
    body('customAlias')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Custom alias can only contain letters, numbers, hyphens, and underscores')
      .isLength({ min: 3, max: 30 })
      .withMessage('Custom alias must be between 3 and 30 characters'),
    body('expiresAt')
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage('Invalid date format for expiration date'),
  ];
};

export const updateUrlValidationRules = () => {
  return [
    body('customAlias')
      .trim()
      .notEmpty()
      .withMessage('Custom alias is required')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Custom alias can only contain letters, numbers, hyphens, and underscores')
      .isLength({ min: 3, max: 30 })
      .withMessage('Custom alias must be between 3 and 30 characters'),
  ];
};

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    const primaryMsg = errorList[0]?.msg || 'Validation failed';
    return res.status(400).json({
      success: false,
      error: primaryMsg,
      statusCode: 400,
      data: errorList,
    });
  }
  next();
};
