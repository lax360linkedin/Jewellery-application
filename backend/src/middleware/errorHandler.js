export function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

  const status = err.status || err.statusCode || 500;
  const detail = err.message || err.detail || 'An internal server error occurred. Please try again later.';

  res.status(status).json({
    detail,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

export default errorHandler;
