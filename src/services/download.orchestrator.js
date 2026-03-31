const { FFMPEG_BIN, YTDLP_BIN, GALLERY_DL_BIN } = require("../config/env");
const { log } = require("../utils/logger");
const { extractReadableError, isYouTubeUrl } = require("../utils/media");
const { runCommand } = require("../utils/exec");
const { runDownload, getVideoInfo } = require("../providers/ytdlp.provider");
const { canUseGalleryDl, attemptGalleryDl } = require("../providers/gallerydl.provider");

const AUDIO_PROFILES = [
  { name: "ytdlp_audio_default", commonArgs: [], modeArgs: [] },
  { name: "ytdlp_audio_relaxed", commonArgs: ["--no-check-certificates", "--prefer-free-formats"], modeArgs: [] },
  { name: "ytdlp_audio_android", commonArgs: ["--extractor-args", "youtube:player_client=android"], modeArgs: [] },
  { name: "ytdlp_audio_web", commonArgs: ["--extractor-args", "youtube:player_client=web"], modeArgs: [] },
];

const VIDEO_PROFILES = [
  { name: "ytdlp_video_default", format: "bv*+ba/b" },
  { name: "ytdlp_video_mp4_preferred", format: "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b" },
  { name: "ytdlp_video_android", commonArgs: ["--extractor-args", "youtube:player_client=android"], format: "bv*+ba/b" },
  { name: "ytdlp_video_relaxed", commonArgs: ["--no-check-certificates"], format: "b[ext=mp4]/bv*+ba/b" },
];

async function ensureBinaries() {
  const binaries = { ytdlp: false, ffmpeg: false, gallerydl: false };

  await runCommand(YTDLP_BIN, ["--version"], { timeoutMs: 15000 });
  binaries.ytdlp = true;

  await runCommand(FFMPEG_BIN, ["-version"], { timeoutMs: 15000 });
  binaries.ffmpeg = true;

  try {
    await runCommand(GALLERY_DL_BIN, ["--version"], { timeoutMs: 15000 });
    binaries.gallerydl = true;
  } catch {}

  return binaries;
}

async function tryProfiles(url, mode, profiles) {
  const attempts = [];

  for (const profile of profiles) {
    try {
      const media = await runDownload(url, mode, profile);
      return { ...media, attempts, selectedProvider: profile.name };
    } catch (error) {
      const message = extractReadableError(error);
      attempts.push({ provider: profile.name, ok: false, error: message });
      log("warn", "/api/download", "provider_failed", {
        provider: profile.name,
        mode,
        error: message,
      });
    }
  }

  throw attempts;
}

async function downloadWithFallback(url, mode) {
  await ensureBinaries();

  const attempts = [];
  const profiles = mode === "mp3" ? AUDIO_PROFILES : VIDEO_PROFILES;

  try {
    const media = await tryProfiles(url, mode, profiles);
    return media;
  } catch (profileAttempts) {
    attempts.push(...profileAttempts);
  }

  if (!isYouTubeUrl(url) && await canUseGalleryDl()) {
    try {
      const galleryMedia = await attemptGalleryDl(url, mode);
      return {
        ...galleryMedia,
        attempts,
        selectedProvider: "gallerydl",
      };
    } catch (error) {
      attempts.push({
        provider: "gallerydl",
        ok: false,
        error: extractReadableError(error),
      });
    }
  } else {
    attempts.push({
      provider: "gallerydl",
      ok: false,
      error: isYouTubeUrl(url)
        ? "gallery-dl ignorado para URL do YouTube"
        : "gallery-dl não disponível no servidor",
    });
  }

  const finalError = new Error(`Todos os providers falharam para ${mode}`);
  finalError.attempts = attempts;
  throw finalError;
}

async function getGenericInfo(url) {
  await ensureBinaries();
  return getVideoInfo(url);
}

module.exports = { ensureBinaries, downloadWithFallback, getGenericInfo };
