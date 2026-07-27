const response = {
success: (
  res,
  data = null,
  message = 'Success',
  code = 200,
  pagination = null
) => {
  return res.status(code).json({
    success: true,
    message,
    data,
    pagination
  })
},

  error: (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
    const payload = { success: false, message };
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
  },

  paginate: (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
    });
  },
};

module.exports = response;
