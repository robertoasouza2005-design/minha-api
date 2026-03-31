function ok(res, resultado = null, extra = {}, statusCode = 200) {
  return res.status(statusCode).json({ status: true, resultado, ...extra });
}

function fail(res, resultado, statusCode = 400, extra = {}) {
  return res.status(statusCode).json({ status: false, resultado, ...extra });
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { ok, fail, asyncRoute };
