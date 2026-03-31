const fs = require("fs");
const { ok, fail } = require("../utils/http");
const { sanitizeText } = require("../utils/text");
const { safeUnlink, safeRmDir } = require("../utils/files");
const { searchVideos, getFirstVideo, downloadMp3, downloadMp4 } = require("../services/youtube.service");
const { sanitizeUrl } = require("../utils/media");

async function ytSearch(req, res) {
  const q = sanitizeText(req.query.q, 120);
  if (!q) return fail(res, "Faltou o termo da pesquisa", 400);
  const videos = await searchVideos(q);
  return ok(res, videos, { query: q, total: videos.length });
}

async function ytPlay(req, res) {
  const nome = sanitizeText(req.query.nome, 120);
  if (!nome) return fail(res, "Faltou o nome da pesquisa", 400);
  const video = await getFirstVideo(nome, req);
  if (!video) return fail(res, "Nenhum resultado encontrado", 404);
  return ok(res, video, {
    linksProtegidos: !req.query.apikey,
  });
}

function pipeMedia(res, media, fallbackMessage) {
  res.setHeader("Content-Type", media.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${media.fileName}"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "X-Download-Provider",
    media.selectedProvider || media.provider || "unknown",
  );

  if (Array.isArray(media.attempts)) {
    res.setHeader("X-Download-Attempts", String(media.attempts.length || 1));
  }

  const cleanup = () => {
    safeUnlink(media.filePath);
    safeRmDir(media.cleanupDir);
  };

  const stream = fs.createReadStream(media.filePath);

  stream.on("error", () => {
    cleanup();
    if (!res.headersSent) fail(res, fallbackMessage, 502);
    else res.end();
  });

  stream.on("close", cleanup);

  res.on("close", () => {
    stream.destroy();
    cleanup();
  });

  stream.pipe(res);
}
async function ytMp3(req, res) {
  const url = sanitizeUrl(req.query.url);
  if (!url) return fail(res, "URL inválida ou ausente", 400);
  try {
    const media = await downloadMp3(url);
    return pipeMedia(res, media, "Erro ao processar mp3");
  } catch (error) {
    return fail(res, "Falha ao baixar mp3", 502, {
      error: error.message,
      attempts: error.attempts || [],
    });
  }
}

async function ytMp4(req, res) {
  const url = sanitizeUrl(req.query.url);
  if (!url) return fail(res, "URL inválida ou ausente", 400);
  try {
    const media = await downloadMp4(url);
    return pipeMedia(res, media, "Erro ao processar mp4");
  } catch (error) {
    return fail(res, "Falha ao baixar mp4", 502, {
      error: error.message,
      attempts: error.attempts || [],
    });
  }
}

module.exports = { ytSearch, ytPlay, ytMp3, ytMp4 };
