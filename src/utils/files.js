const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { TEMP_DIR } = require("../config/env");

function ensureTempDir() {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  return TEMP_DIR;
}

function createTempBase(prefix = "media") {
  ensureTempDir();
  const id = crypto.randomBytes(6).toString("hex");
  return path.join(TEMP_DIR, `${prefix}_${Date.now()}_${id}`);
}

function findGeneratedFile(basePath) {
  const dir = path.dirname(basePath);
  const prefix = path.basename(basePath);
  const files = fs.readdirSync(dir);
  const match = files.find((file) => file.startsWith(prefix));
  return match ? path.join(dir, match) : null;
}

function findFirstMediaFile(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return null;
  const mediaExts = [".mp4", ".mp3", ".m4a", ".webm", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mov"];
  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    for (const item of fs.readdirSync(current)) {
      const full = path.join(current, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
      } else if (mediaExts.includes(path.extname(full).toLowerCase())) {
        return full;
      }
    }
  }
  return null;
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function safeRmDir(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {}
}

function cleanupTempArtifacts(basePath) {
  try {
    const dir = path.dirname(basePath);
    const prefix = path.basename(basePath);
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith(prefix)) {
        safeUnlink(path.join(dir, file));
      }
    }
    safeRmDir(`${basePath}_dir`);
  } catch {}
}

module.exports = {
  ensureTempDir,
  createTempBase,
  findGeneratedFile,
  findFirstMediaFile,
  safeUnlink,
  safeRmDir,
  cleanupTempArtifacts,
};
