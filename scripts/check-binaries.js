require("dotenv").config();
const { YTDLP_BIN, FFMPEG_BIN, GALLERY_DL_BIN } = require("../src/config/env");
const { runCommand } = require("../src/utils/exec");

async function check(name, bin, args) {
  try {
    const { stdout } = await runCommand(bin, args, { timeoutMs: 15000 });
    console.log(`[OK] ${name}: ${stdout.split("\n")[0] || "disponível"}`);
  } catch (error) {
    console.log(`[FAIL] ${name}: ${error.message}`);
  }
}

(async () => {
  await check("yt-dlp", YTDLP_BIN, ["--version"]);
  await check("ffmpeg", FFMPEG_BIN, ["-version"]);
  await check("gallery-dl", GALLERY_DL_BIN, ["--version"]);
})();
