const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const yts = require("yt-search");

const {
  YTDLP_BIN,
  FFMPEG_BIN,
  API_KEY,
} = require("../config/env");

const { sanitizeText, normalizeTitle } = require("../utils/text");
const {
  createTempBase,
  findGeneratedFile,
} = require("../utils/files");

// ════════════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════════════
const BIN_TIMEOUT_MS = 15000;
const INFO_TIMEOUT_MS = 45000;
const DOWNLOAD_TIMEOUT_MP3_MS = 120000;
const DOWNLOAD_TIMEOUT_MP4_MS = 180000;

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS DE LOG
// ════════════════════════════════════════════════════════════════════════════════
function logYT(step, extra = {}) {
  try {
    console.log(
      JSON.stringify({
        scope: "youtube.service",
        step,
        time: new Date().toISOString(),
        ...extra,
      }),
    );
  } catch {}
}

function buildBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function buildMediaLinks(req, videoUrl) {
  const baseUrl = buildBaseUrl(req);

  return {
    mp3: `${baseUrl}/api/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(API_KEY)}`,
    mp4: `${baseUrl}/api/ytmp4?url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(API_KEY)}`,
    mp3_new: `${baseUrl}/api/youtube/mp3?url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(API_KEY)}`,
    mp4_new: `${baseUrl}/api/youtube/mp4?url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(API_KEY)}`,
  };
}

function fileExistsSafe(filePath) {
  try {
    return !!filePath && fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function cleanFileName(name, fallback) {
  return normalizeTitle(name || fallback || "media");
}

// ════════════════════════════════════════════════════════════════════════════════
// EXECUTOR COM TIMEOUT
// ════════════════════════════════════════════════════════════════════════════════
function runCommandWithTimeout(bin, args, timeoutMs, label = "command") {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    logYT("command_start", {
      label,
      bin,
      args,
      timeoutMs,
    });

    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;

      try {
        child.kill("SIGKILL");
      } catch {}

      const err = new Error(`Timeout em ${label} após ${timeoutMs}ms`);
      err.code = "TIMEOUT";
      err.stdout = stdout;
      err.stderr = stderr;

      logYT("command_timeout", {
        label,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        stderr: stderr.slice(-1200),
      });

      reject(err);
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      logYT("command_error", {
        label,
        error: error.message,
        durationMs: Date.now() - startedAt,
      });

      reject(error);
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      const durationMs = Date.now() - startedAt;

      if (code === 0) {
        logYT("command_success", {
          label,
          code,
          durationMs,
        });

        resolve({ stdout, stderr, code, durationMs });
      } else {
        const err = new Error(
          stderr || `Comando ${label} falhou com código ${code}`,
        );
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;

        logYT("command_failed", {
          label,
          code,
          durationMs,
          stderr: stderr.slice(-1200),
        });

        reject(err);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// BINÁRIOS
// ════════════════════════════════════════════════════════════════════════════════
async function ensureBinaries() {
  await runCommandWithTimeout(
    YTDLP_BIN || "yt-dlp",
    ["--version"],
    BIN_TIMEOUT_MS,
    "yt-dlp-version",
  );

  await runCommandWithTimeout(
    FFMPEG_BIN || "ffmpeg",
    ["-version"],
    BIN_TIMEOUT_MS,
    "ffmpeg-version",
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SEARCH / PLAY
// ════════════════════════════════════════════════════════════════════════════════
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
    mp3_new: links.mp3_new,
    mp4_new: links.mp4_new,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// INFO DO VÍDEO
// ════════════════════════════════════════════════════════════════════════════════
async function getVideoInfo(url) {
  const args = [
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    "--socket-timeout",
    "20",
    url,
  ];

  const { stdout } = await runCommandWithTimeout(
    YTDLP_BIN || "yt-dlp",
    args,
    INFO_TIMEOUT_MS,
    "yt-dlp-info",
  );

  try {
    return JSON.parse(stdout);
  } catch (error) {
    logYT("json_parse_error", {
      where: "getVideoInfo",
      error: error.message,
      stdoutPreview: String(stdout).slice(0, 1200),
    });
    throw new Error("Não foi possível interpretar os metadados do vídeo");
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// DOWNLOAD MP3
// ════════════════════════════════════════════════════════════════════════════════
async function downloadMp3(url) {
  await ensureBinaries();

  logYT("mp3_prepare", { url });

  const info = await getVideoInfo(url);
  const safeTitle = cleanFileName(info?.title, "audio");
  const basePath = createTempBase("audio");
  const template = `${basePath}.%(ext)s`;

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--socket-timeout",
    "20",
    "--retries",
    "2",
    "--fragment-retries",
    "2",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "-o",
    template,
    url,
  ];

  logYT("mp3_download_start", {
    url,
    template,
  });

  await runCommandWithTimeout(
    YTDLP_BIN || "yt-dlp",
    args,
    DOWNLOAD_TIMEOUT_MP3_MS,
    "yt-dlp-mp3",
  );

  const filePath = findGeneratedFile(basePath);

  logYT("mp3_download_end", {
    filePath,
    exists: fileExistsSafe(filePath),
  });

  if (!fileExistsSafe(filePath)) {
    throw new Error("Arquivo mp3 não foi gerado");
  }

  return {
    filePath,
    contentType: "audio/mpeg",
    fileName: `${safeTitle}.mp3`,
    info,
    provider: "yt-dlp",
    selectedProvider: "yt-dlp",
    attempts: [{ provider: "yt-dlp", status: "success" }],
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// DOWNLOAD MP4
// ════════════════════════════════════════════════════════════════════════════════
async function downloadMp4(url) {
  await ensureBinaries();

  logYT("mp4_prepare", { url });

  const info = await getVideoInfo(url);
  const safeTitle = cleanFileName(info?.title, "video");
  const basePath = createTempBase("video");
  const template = `${basePath}.%(ext)s`;

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--socket-timeout",
    "20",
    "--retries",
    "2",
    "--fragment-retries",
    "2",
    "-f",
    "bv*+ba/b",
    "--merge-output-format",
    "mp4",
    "-o",
    template,
    url,
  ];

  logYT("mp4_download_start", {
    url,
    template,
  });

  await runCommandWithTimeout(
    YTDLP_BIN || "yt-dlp",
    args,
    DOWNLOAD_TIMEOUT_MP4_MS,
    "yt-dlp-mp4",
  );

  const filePath = findGeneratedFile(basePath);

  logYT("mp4_download_end", {
    filePath,
    exists: fileExistsSafe(filePath),
  });

  if (!fileExistsSafe(filePath)) {
    throw new Error("Arquivo mp4 não foi gerado");
  }

  return {
    filePath,
    contentType: "video/mp4",
    fileName: `${safeTitle}.mp4`,
    info,
    provider: "yt-dlp",
    selectedProvider: "yt-dlp",
    attempts: [{ provider: "yt-dlp", status: "success" }],
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════
module.exports = {
  searchVideos,
  getFirstVideo,
  getVideoInfo,
  downloadMp3,
  downloadMp4,
  ensureBinaries,
};
