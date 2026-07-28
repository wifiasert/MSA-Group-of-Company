const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    ok: false,
    message,
    errors: err.errors || undefined
  });
};

module.exports = { errorHandler };
