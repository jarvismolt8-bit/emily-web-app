function sendSuccess(res, data, message = null, status = 200) {
  const response = { success: true, data };
  if (message) response.message = message;
  return res.status(status).json(response);
}

function sendError(res, code, message, status = 400) {
  return res.status(status).json({
    success: false,
    error: { code, message }
  });
}

function sendPaginated(res, data, total, page, limit) {
  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
}

module.exports = { sendSuccess, sendError, sendPaginated };
