const rateLimit = require('express-rate-limit');

/**
 * Strict login rate limiter: 5 attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.'
  }
});

/**
 * Strict registration rate limiter: 5 attempts per hour per IP
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this IP address. Please try again after an hour.'
  }
});

/**
 * Strict contact submission rate limiter: 5 attempts per hour per IP
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many messages sent from this IP address. Please try again after an hour.'
  }
});

/**
 * General API rate limiter: 200 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  contactLimiter,
  generalLimiter
};
