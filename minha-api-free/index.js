const express = require("express");
const cors = require("cors");
const ytdl = require("@distube/ytdl-core");
const yts = require("yt-search");
const Jimp = require("jimp");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY || "NR_OFICIAL_2026";
const PORT = process.env.PORT || 10000;

function isAuthorized(apikey) {
  return apikey === API_KEY;
}

function sendForbidden(res) {
  return res.status(403).json({
    status: false,
    resultado: "Acesso negado"
  });
}

function normalizeTitle(title = "media") {
  return String(title).replace(/[^\w\s.-]/g, "").trim() || "media";
}

function getBestProgressiveMp4Format(info) {
  const formats = info.formats.filter(
    (f) =>
      f.container === "mp4" &&
      f.hasVideo &&
      f.hasAudio &&
      f.isHLS !== true
  );

  if (!formats.length) return null;

  formats.sort((a, b) => (b.height || 0) - (a.height || 0));
  return formats[0];
}

function getBestAudioFormat(info) {
  const formats = info.formats.filter(
    (f) =>
      f.hasAudio &&
      !f.hasVideo &&
      (f.container === "mp4" || f.container === "webm")
  );

  if (!formats.length) return null;

  formats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
  return formats[0];
}

// HEALTHCHECK
app.get("/", (req, res) => {
  return res.status(200).json({
    status: true,
    message: "API NR online",
    uptime: process.uptime()
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: true,
    message: "API saudável"
  });
});

// YTSEARCH
app.get("/api/ytsearch", async (req, res) => {
  const { q, apikey } = req.query;

  if (!isAuthorized(apikey)) return sendForbidden(res);
  if (!q) {
    return res.status(400).json({
      status: false,
      resultado: "Faltou o termo da pesquisa"
    });
  }

  try {
    const search = await yts(q);
    const videos = (search?.videos || []).slice(0, 10).map((video) => ({
      titulo: video.title,
      thumb: video.thumbnail,
      canal: video.author?.name || "Desconhecido",
      views: video.views,
      publicado: video.ago,
      duracao: video.timestamp,
      url: video.url
    }));

    return res.status(200).json({
      status: true,
      resultado: videos
    });
  } catch (error) {
    console.log("ERRO YTSEARCH:", error);
    return res.status(500).json({
      status: false,
      resultado: "Erro ao pesquisar no YouTube",
      error: error.message
    });
  }
});

// YTPLAY
app.get("/api/ytplayv2", async (req, res) => {
  const { nome, apikey } = req.query;

  if (!isAuthorized(apikey)) return sendForbidden(res);
  if (!nome) {
    return res.status(400).json({
      status: false,
      resultado: "Faltou o nome da pesquisa"
    });
  }

  try {
    const search = await yts(nome);
    const video = search?.videos?.[0];

    if (!video) {
      return res.status(404).json({
        status: false,
        resultado: "Nenhum resultado encontrado"
      });
    }

    return res.status(200).json({
      status: true,
      resultado: {
        titulo: video.title,
        thumb: video.thumbnail,
        canal: video.author?.name || "Desconhecido",
        views: video.views,
        publicado: video.ago,
        duracao: video.timestamp,
        url: video.url,
        mp3: `${req.protocol}://${req.get("host")}/api/ytmp3?url=${encodeURIComponent(video.url)}&apikey=${encodeURIComponent(API_KEY)}`,
        mp4: `${req.protocol}://${req.get("host")}/api/ytmp4?url=${encodeURIComponent(video.url)}&apikey=${encodeURIComponent(API_KEY)}`
      }
    });
  } catch (error) {
    console.log("ERRO YTPLAYV2:", error);
    return res.status(500).json({
      status: false,
      resultado: "Erro ao buscar vídeo",
      error: error.message
    });
  }
});

// YTMP3
app.get("/api/ytmp3", async (req, res) => {
  const { url, apikey } = req.query;

  if (!isAuthorized(apikey)) return res.status(403).send("Não autorizado");
  if (!url) return res.status(400).send("URL ausente");
  if (!ytdl.validateURL(url)) return res.status(400).send("URL inválida");

  let finished = false;

  try {
    const info = await ytdl.getInfo(url);
    const safeTitle = normalizeTitle(info?.videoDetails?.title || "audio");

    const audioFormat = getBestAudioFormat(info);
    if (!audioFormat) {
      return res.status(500).send("Nenhum formato de áudio encontrado");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.mp3"`);
    res.setHeader("Cache-Control", "no-store");

    const stream = ytdl.downloadFromInfo(info, {
      format: audioFormat,
      highWaterMark: 1 << 24
    });

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        stream.destroy(new Error("Timeout no download mp3"));
        if (!res.headersSent) {
          res.status(504).send("Tempo limite excedido");
        } else {
          res.end();
        }
      }
    }, 45000);

    stream.on("error", (err) => {
      clearTimeout(timeout);
      console.log("ERRO YTMP3:", err);
      if (!finished) {
        finished = true;
        if (!res.headersSent) {
          res.status(502).send("Erro ao processar mp3");
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
  } catch (error) {
    console.log("ERRO INTERNO YTMP3:", error);
    if (!finished) {
      finished = true;
      return res.status(500).send("Erro interno no mp3");
    }
  }
});

// YTMP4
app.get("/api/ytmp4", async (req, res) => {
  const { url, apikey } = req.query;

  if (!isAuthorized(apikey)) return res.status(403).send("Não autorizado");
  if (!url) return res.status(400).send("URL ausente");
  if (!ytdl.validateURL(url)) return res.status(400).send("URL inválida");

  let finished = false;

  try {
    const info = await ytdl.getInfo(url);
    const safeTitle = normalizeTitle(info?.videoDetails?.title || "video");

    const videoFormat = getBestProgressiveMp4Format(info);
    if (!videoFormat) {
      return res.status(500).send("Nenhum formato MP4 progressivo encontrado");
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.mp4"`);
    res.setHeader("Cache-Control", "no-store");

    const stream = ytdl.downloadFromInfo(info, {
      format: videoFormat,
      highWaterMark: 1 << 24
    });

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        stream.destroy(new Error("Timeout no download mp4"));
        if (!res.headersSent) {
          res.status(504).send("Tempo limite excedido");
        } else {
          res.end();
        }
      }
    }, 60000);

    stream.on("error", (err) => {
      clearTimeout(timeout);
      console.log("ERRO YTMP4:", err);
      if (!finished) {
        finished = true;
        if (!res.headersSent) {
          res.status(502).send("Erro ao processar mp4");
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
  } catch (error) {
    console.log("ERRO INTERNO YTMP4:", error);
    if (!finished) {
      finished = true;
      return res.status(500).send("Erro interno no mp4");
    }
  }
});

// CANVAS
app.get("/api/canvas/welcome", async (req, res) => {
  const { titulo, apikey } = req.query;

  if (!isAuthorized(apikey)) return res.status(403).send("Não autorizado");

  try {
    const image = new Jimp(800, 400, 0x000000ff);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

    image.print(font, 50, 150, titulo || "BEM-VINDO");

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    res.setHeader("Content-Type", "image/jpeg");
    return res.send(buffer);
  } catch (error) {
    console.log("ERRO CANVAS:", error);
    return res.status(500).send("Erro ao gerar imagem");
  }
});

app.listen(PORT, () => {
  console.log(`API NR online na porta ${PORT}`);
});
