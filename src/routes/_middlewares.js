const { fail } = require("../utils/http");
const { API_KEY } = require("../config/env");

function requireApiKey(req, res, next) {
  const apikey = req.query.apikey || req.headers["x-api-key"];
  if (apikey !== API_KEY) return fail(res, "Acesso negado", 403);
  next();
}

module.exports = { requireApiKey };
