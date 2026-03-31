const express = require("express");
const cors = require("cors");
const systemRoutes = require("./routes/system.routes");
const youtubeRoutes = require("./routes/youtube.routes");
const imageRoutes = require("./routes/image.routes");
const socialRoutes = require("./routes/social.routes");
const { fail } = require("./utils/http");
const { log } = require("./utils/logger");
const { ENABLE_SOCIAL_ROUTES, ENABLE_IMAGE_ROUTES } = require("./config/env");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.set("trust proxy", true);

app.use((req, res, next) => {
  req._startedAt = Date.now();
  next();
});

app.use((req, res, next) => {
  res.on("finish", () => {
    const durationMs = Date.now() - (req._startedAt || Date.now());
    log("info", req.path, "request_finished", {
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
    });
  });
  next();
});

app.use("/", systemRoutes);
app.use("/api", youtubeRoutes);

if (ENABLE_SOCIAL_ROUTES) {
  app.use("/api", socialRoutes);
}

if (ENABLE_IMAGE_ROUTES) {
  app.use("/api", imageRoutes);
}

app.use((req, res) => {
  return fail(res, "Rota não encontrada", 404, {
    route: req.path,
    method: req.method,
  });
});

app.use((error, req, res, next) => {
  log("error", req.path, "unhandled_error", {
    error: error.message,
    stack: error.stack,
  });

  if (res.headersSent) return next(error);

  return fail(res, "Erro interno do servidor", 500, {
    error: error.message,
  });
});

module.exports = app;
