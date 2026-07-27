const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ ok: true, message, data });
};

const errorResponse = (res, message = 'Error', statusCode = 400, errors) => {
  res.status(statusCode).json({ ok: false, message, errors });
};

module.exports = { successResponse, errorResponse };
