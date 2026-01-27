import { body, ValidationChain } from 'express-validator';

export const loginValidation: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const updateProfileValidation: ValidationChain[] = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('phone')
    .optional()
    .trim(),
  body('timezone')
    .optional()
    .trim(),
  body('language')
    .optional()
    .isIn(['en', 'vi'])
    .withMessage('Language must be either en or vi'),
];

export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

export const enable2FAValidation: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('2FA token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA token must be 6 digits'),
];
