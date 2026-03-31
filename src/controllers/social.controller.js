const fs = require("fs");
const { ok, fail } = require("../utils/http");
const { sanitizeUrl } = require("../utils/media");
const { safeUnlink, safeRmDir } = require("../utils/files");
const { getSocialInfo, downloadSocialMedia } = require("../services/social.service");

async function socialInfo(req, res) {
  const url = sanitizeUrl(req.query.url);
  if (!url) return fail(res, "URL inválida ou ausente", 400);

  const data = await getSocialInfo(url);
  return ok(res, data);
}

async function socialMedia(req, res) {
  const url = sanitizeUrl(req.query.url);
  if (!url) return fail(res, "URL inválida ou ausente", 400);

  try {
    const media = await downloadSocialMedia(url);
    res.setHeader("Content-Type", media.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${media.fileName || "social_media"}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Download-Provider", media.selectedProvider || media.provider || "unknown");
    if (Array.isArray(media.attempts)) {
      res.setHeader("X-Download-Attempts", String(media.attempts.length + 1));
    }

    const cleanup = () => {
      safeUnlink(media.filePath);
      safeRmDir(media.cleanupDir);
    };

    const stream = fs.createReadStream(media.filePath);

    stream.on("error", () => {
      cleanup();
      if (!res.headersSent) fail(res, "Erro ao processar mídia social", 502);
      else res.end();
    });

    stream.on("close", cleanup);

    res.on("close", () => {
      stream.destroy();
      cleanup();
    });

    stream.pipe(res);
  } catch (error) {
    return fail(res, error.statusCode === 400 ? "URL inválida ou ausente" : "Falha ao baixar mídia social", error.statusCode || 502, {
      error: error.message,
      attempts: error.attempts || [],
    });
  }
}

module.exports = { socialInfo, socialMedia };
