const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Pass the error to the global error handler (which currently logs and sends 500)
      next(err);
    });
  };
};

module.exports = catchAsync;
