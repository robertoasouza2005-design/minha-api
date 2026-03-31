const Jimp = require("jimp");
const { sanitizeText } = require("../utils/text");

async function createWelcomeImage(titulo) {
  const text = sanitizeText(titulo || "BEM-VINDO", 40);
  const image = new Jimp(800, 400, 0x000000ff);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  image.print(font, 50, 150, text);
  return image.getBufferAsync(Jimp.MIME_JPEG);
}

async function createSimpleLogo(texto) {
  const text = sanitizeText(texto || "NR-BOT", 24);
  const image = new Jimp(512, 512, 0x111111ff);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  image.print(font, 0, 180, {
    text,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
  }, 512, 120);
  return image.getBufferAsync(Jimp.MIME_PNG);
}

async function createBannerText(titulo, subtitulo) {
  const title = sanitizeText(titulo || "NR API", 32);
  const subtitle = sanitizeText(subtitulo || "banner", 60);

  const image = new Jimp(1280, 720, 0x0b1020ff);
  const titleFont = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  const subtitleFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

  image.print(titleFont, 60, 220, title, 1160);
  image.print(subtitleFont, 60, 340, subtitle, 1160);

  return image.getBufferAsync(Jimp.MIME_JPEG);
}

module.exports = { createWelcomeImage, createSimpleLogo, createBannerText };
