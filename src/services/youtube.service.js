const yts = require("yt-search");
const { API_KEY, EXPOSE_API_KEY_IN_LINKS, ENABLE_LEGACY_YT_ROUTES } = require("../config/env");
const { sanitizeText } = require("../utils/text");
const { downloadWithFallback, ensureBinaries } = require("./download.orchestrator");
const { sanitizeUrl } = require("../utils/media");

function buildBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function withApiKey(url) {
  if (!EXPOSE_API_KEY_IN_LINKS) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}apikey=${encodeURIComponent(API_KEY)}`;
}

function buildMediaLinks(req, videoUrl) {
  const baseUrl = buildBaseUrl(req);
  const links = {
    mp3: withApiKey(`${baseUrl}/api/youtube/mp3?url=${encodeURIComponent(videoUrl)}`),
    mp4: withApiKey(`${baseUrl}/api/youtube/mp4?url=${encodeURIComponent(videoUrl)}`),
  };

  if (ENABLE_LEGACY_YT_ROUTES) {
    links.compat = {
      mp3: withApiKey(`${baseUrl}/api/ytmp3?url=${encodeURIComponent(videoUrl)}`),
      mp4: withApiKey(`${baseUrl}/api/ytmp4?url=${encodeURIComponent(videoUrl)}`),
    };
  }

  return links;
}

async function searchVideos(query) {
  const q = sanitizeText(query, 120);
  const search = await yts(q);
  return (search?.videos || []).slice(0, 10).map((video) => ({
    titulo: video.title,
    thumb: video.thumbnail,
    canal: video.author?.name || "Desconhecido",
    views: video.views,
    publicado: video.ago,
    duracao: video.timestamp,
    url: video.url,
  }));
}

async function getFirstVideo(query, req) {
  const nome = sanitizeText(query, 120);
  const search = await yts(nome);
  const video = search?.videos?.[0];
  if (!video) return null;
  const links = buildMediaLinks(req, video.url);
  return {
    titulo: video.title,
    thumb: video.thumbnail,
    canal: video.author?.name || "Desconhecido",
    views: video.views,
    publicado: video.ago,
    duracao: video.timestamp,
    url: video.url,
    mp3: links.mp3,
    mp4: links.mp4,
    ...(links.compat ? { compat: links.compat } : {}),
  };
}

async function downloadMp3(url) {
  return downloadWithFallback(sanitizeUrl(url), "mp3");
}

async function downloadMp4(url) {
  return downloadWithFallback(sanitizeUrl(url), "mp4");
}

module.exports = { searchVideos, getFirstVideo, downloadMp3, downloadMp4, ensureBinaries };
