const express = require("express");
const cors = require("cors");
const ytdl = require("@distube/ytdl-core");
const yts = require("yt-search");
const Jimp = require("jimp");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.set("trust proxy", true);

const API_KEY = process.env.API_KEY || "NR_OFICIAL_2026";
const PORT = Number(process.env.PORT || 3000);
const SERVICE_NAME = process.env.API_NAME || "NR API";
const SERVICE_VERSION = process.env.API_VERSION || "3.5.0";
const STARTED_AT = Date.now();

function nowIso() {
  return new Date().toISOString();
}

function log(level, route, message, extra = {}) {
  const payload = {
    time: nowIso(),
    level,
    route,
    message,
    ...extra,
  };
  console.log(JSON.stringify(payload));
}

function ok(res, resultado = null, extra = {}, statusCode = 200) {
  return res.status(statusCode).json({
    status: true,
    resultado,
    ...extra,
  });
}

function fail(res, resultado, statusCode = 400, extra = {}) {
  return res.status(statusCode).json({
    status: false,
    resultado,
    ...extra,
  });
}

function normalizeTitle(title = "media") {
  return String(title).replace(/[^\w\s.-]/g, "").trim() || "media";
}

function sanitizeText(input, max = 150) {
  return String(input || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function requireApiKey(req, res, next) {
  const apikey = req.query.apikey || req.headers["x-api-key"];
  if (apikey !== API_KEY) {
    return fail(res, "Acesso negado", 403);
  }
  next();
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

function buildBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function buildMediaLinks(req, videoUrl) {
  const baseUrl = buildBaseUrl(req);
  return {
    mp3: `${baseUrl}/api/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(API_KEY)}`,
    mp4: `${baseUrl}/api/ytmp4?url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(API_KEY)}`,
  };
}

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

// ROOT
app.get("/", (req, res) => {
  return ok(
    res,
    {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      uptime: process.uptime(),
      startedAt: STARTED_AT,
      now: Date.now(),
    },
    { message: "API NR online" }
  );
});

// HEALTH
app.get("/health", (req, res) => {
  return ok(
    res,
    {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      uptime: process.uptime(),
      startedAt: STARTED_AT,
      now: Date.now(),
      env: process.env.NODE_ENV || "development",
    },
    { message: "API saudável" }
  );
});

// YTSEARCH
app.get(
  "/api/ytsearch",
  requireApiKey,
  asyncRoute(async (req, res) => {
    const q = sanitizeText(req.query.q, 120);

    if (!q) {
      return fail(res, "Faltou o termo da pesquisa", 400);
    }

    const search = await yts(q);
    const videos = (search?.videos || []).slice(0, 10).map((video) => ({
      titulo: video.title,
      thumb: video.thumbnail,
      canal: video.author?.name || "Desconhecido",
      views: video.views,
      publicado: video.ago,
      duracao: video.timestamp,
      url: video.url,
    }));

    return ok(res, videos, {
      query: q,
      total: videos.length,
    });
  })
);

// YTPLAYV2
app.get(
  "/api/ytplayv2",
  requireApiKey,
  asyncRoute(async (req, res) => {
    const nome = sanitizeText(req.query.nome, 120);

    if (!nome) {
      return fail(res, "Faltou o nome da pesquisa", 400);
    }

    const search = await yts(nome);
    const video = search?.videos?.[0];

    if (!video) {
      return fail(res, "Nenhum resultado encontrado", 404);
    }

    const links = buildMediaLinks(req, video.url);

    return ok(res, {
      titulo: video.title,
      thumb: video.thumbnail,
      canal: video.author?.name || "Desconhecido",
      views: video.views,
      publicado: video.ago,
      duracao: video.timestamp,
      url: video.url,
      mp3: links.mp3,
      mp4: links.mp4,
    });
  })
);

// YTMP3
app.get(
  "/api/ytmp3",
  requireApiKey,
  asyncRoute(async (req, res) => {
    const url = sanitizeText(req.query.url, 500);

    if (!url) {
      return fail(res, "URL ausente", 400);
    }

    if (!ytdl.validateURL(url)) {
      return fail(res, "URL inválida", 400);
    }

    let finished = false;

    const info = await ytdl.getInfo(url);
    const safeTitle = normalizeTitle(info?.videoDetails?.title || "audio");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.mp3"`);
    res.setHeader("Cache-Control", "no-store");

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 24,
    });

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        stream.destroy(new Error("Timeout no download mp3"));
        if (!res.headersSent) {
          fail(res, "Tempo limite excedido", 504);
        } else {
          res.end();
        }
      }
    }, 45000);

    stream.on("error", (error) => {
      clearTimeout(timeout);
      log("error", "/api/ytmp3", "stream_error", { error: error.message });
      if (!finished) {
        finished = true;
        if (!res.headersSent) {
          fail(res, "Erro ao processar mp3", 502);
        } else {
          res.end();
        }
      }
    });

    stream.on("end", () => {
      clearTimeout(timeout);
      finished = true;
    });

    res.on("close", () => {
      clearTimeout(timeout);
      stream.destroy();
    });

    stream.pipe(res);
  })
);

// YTMP4
app.get(
  "/api/ytmp4",
  requireApiKey,
  asyncRoute(async (req, res) => {
    const url = sanitizeText(req.query.url, 500);

    if (!url) {
      return fail(res, "URL ausente", 400);
    }

    if (!ytdl.validateURL(url)) {
      return fail(res, "URL inválida", 400);
    }

    let finished = false;

    const info = await ytdl.getInfo(url);
    const safeTitle = normalizeTitle(info?.videoDetails?.title || "video");

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.mp4"`);
    res.setHeader("Cache-Control", "no-store");

    const stream = ytdl(url, {
      filter: "audioandvideo",
      quality: "highest",
      highWaterMark: 1 << 24,
    });

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        stream.destroy(new Error("Timeout no download mp4"));
        if (!res.headersSent) {
          fail(res, "Tempo limite excedido", 504);
        } else {
          res.end();
        }
      }
    }, 60000);

    stream.on("error", (error) => {
      clearTimeout(timeout);
      log("error", "/api/ytmp4", "stream_error", { error: error.message });
      if (!finished) {
        finished = true;
        if (!res.headersSent) {
          fail(res, "Erro ao processar mp4", 502);
        } else {
          res.end();
        }
      }
    });

    stream.on("end", () => {
      clearTimeout(timeout);
      finished = true;
    });

    res.on("close", () => {
      clearTimeout(timeout);
      stream.destroy();
    });

    stream.pipe(res);
  })
);

// CANVAS
app.get(
  "/api/canvas/welcome",
  requireApiKey,
  asyncRoute(async (req, res) => {
    const titulo = sanitizeText(req.query.titulo || "BEM-VINDO", 40);

    const image = new Jimp(800, 400, 0x000000ff);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

    image.print(font, 50, 150, titulo);

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    res.setHeader("Content-Type", "image/jpeg");
    return res.send(buffer);
  })
);

// 404
app.use((req, res) => {
  return fail(res, "Rota não encontrada", 404, {
    route: req.path,
    method: req.method,
  });
});

// ERROR HANDLER
app.use((error, req, res, next) => {
  log("error", req.path, "unhandled_error", {
    error: error.message,
    stack: error.stack,
  });

  if (res.headersSent) {
    return next(error);
  }

  return fail(res, "Erro interno do servidor", 500, {
    error: error.message,
  });
});

app.listen(PORT, () => {
  log("info", "server", "api_started", {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
  });
});
