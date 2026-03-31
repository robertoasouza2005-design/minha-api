const fs = require("fs");
const { YTDLP_BIN, DOWNLOAD_TIMEOUT_MS } = require("../config/env");
const { normalizeTitle } = require("../utils/text");
const { createTempBase, findGeneratedFile, cleanupTempArtifacts } = require("../utils/files");
const { runCommand } = require("../utils/exec");

async function getVideoInfo(url) {
  const args = ["--dump-single-json", "--no-playlist", url];
  const { stdout } = await runCommand(YTDLP_BIN, args, { timeoutMs: DOWNLOAD_TIMEOUT_MS });
  return JSON.parse(stdout);
}

async function runDownload(url, mode, profile = {}) {
  const info = await getVideoInfo(url);
  const safeTitle = normalizeTitle(info?.title || (mode === "mp3" ? "audio" : "video"));
  const basePath = createTempBase(mode);
  const template = `${basePath}.%(ext)s`;

  const commonArgs = [
    "--no-playlist",
    "--no-progress",
    "--newline",
    ...(profile.commonArgs || []),
    "-o", template,
    url,
  ];

  const modeArgs = mode === "mp3"
    ? [
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        ...(profile.modeArgs || []),
      ]
    : [
        "-f", profile.format || "bv*+ba/b",
        "--merge-output-format", "mp4",
        ...(profile.modeArgs || []),
      ];

  try {
    await runCommand(YTDLP_BIN, [...commonArgs.slice(0, -2), ...modeArgs, ...commonArgs.slice(-2)], {
      timeoutMs: profile.timeoutMs || DOWNLOAD_TIMEOUT_MS,
    });

    const filePath = findGeneratedFile(basePath);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Arquivo ${mode} não foi gerado`);
    }

    return {
      ok: true,
      provider: profile.name || "ytdlp_default",
      filePath,
      contentType: mode === "mp3" ? "audio/mpeg" : "video/mp4",
      fileName: `${safeTitle}.${mode}`,
      info,
      basePath,
    };
  } catch (error) {
    cleanupTempArtifacts(basePath);
    throw error;
  }
}

module.exports = { getVideoInfo, runDownload };
