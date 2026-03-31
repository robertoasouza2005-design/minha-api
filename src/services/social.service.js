const { normalizeTitle } = require("../utils/text");
const { downloadWithFallback, getGenericInfo } = require("./download.orchestrator");
const { sanitizeUrl } = require("../utils/media");

async function getSocialInfo(url) {
  const cleanUrl = sanitizeUrl(url);
  if (!cleanUrl) {
    const error = new Error("URL inválida ou ausente");
    error.statusCode = 400;
    throw error;
  }

  const info = await getGenericInfo(cleanUrl);

  return {
    titulo: info?.title || "Sem título",
    thumb: info?.thumbnail || null,
    uploader: info?.uploader || info?.channel || "Desconhecido",
    duracao: info?.duration || null,
    plataforma: info?.extractor_key || info?.extractor || "Desconhecida",
    url: info?.webpage_url || cleanUrl,
    original: info,
  };
}

async function downloadSocialMedia(url) {
  const cleanUrl = sanitizeUrl(url);
  if (!cleanUrl) {
    const error = new Error("URL inválida ou ausente");
    error.statusCode = 400;
    throw error;
  }

  const media = await downloadWithFallback(cleanUrl, "mp4");

  if (!media.fileName) {
    media.fileName = `${normalizeTitle("social_media")}.mp4`;
  }

  return media;
}

module.exports = { getSocialInfo, downloadSocialMedia };
