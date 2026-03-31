const path = require("path");
const { GALLERY_DL_BIN, DOWNLOAD_TIMEOUT_MS } = require("../config/env");
const { createTempBase, findFirstMediaFile, safeRmDir } = require("../utils/files");
const { runCommand } = require("../utils/exec");
const { guessContentType } = require("../utils/media");
const { normalizeTitle } = require("../utils/text");

async function canUseGalleryDl() {
  try {
    await runCommand(GALLERY_DL_BIN, ["--version"], { timeoutMs: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function attemptGalleryDl(url, mode = "auto") {
  const basePath = createTempBase(`gallery_${mode}`);
  const dir = `${basePath}_dir`;

  try {
    await runCommand(GALLERY_DL_BIN, ["--directory", dir, url], {
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
    });

    const filePath = findFirstMediaFile(dir);
    if (!filePath) {
      throw new Error("gallery-dl não gerou arquivo de mídia utilizável");
    }

    const ext = path.extname(filePath).replace(".", "") || "bin";
    const name = normalizeTitle(path.basename(filePath, path.extname(filePath)) || "social_media");

    return {
      ok: true,
      provider: "gallerydl",
      filePath,
      contentType: guessContentType(filePath),
      fileName: `${name}.${ext}`,
      cleanupDir: dir,
    };
  } catch (error) {
    safeRmDir(dir);
    throw error;
  }
}

module.exports = { canUseGalleryDl, attemptGalleryDl };
