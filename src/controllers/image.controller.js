const { createWelcomeImage, createSimpleLogo, createBannerText } = require("../services/image.service");

async function welcomeCanvas(req, res) {
  const buffer = await createWelcomeImage(req.query.titulo || "BEM-VINDO");
  res.setHeader("Content-Type", "image/jpeg");
  return res.send(buffer);
}

async function simpleLogo(req, res) {
  const buffer = await createSimpleLogo(req.query.texto || "NR-BOT");
  res.setHeader("Content-Type", "image/png");
  return res.send(buffer);
}

async function bannerText(req, res) {
  const buffer = await createBannerText(req.query.titulo || "NR API", req.query.subtitulo || "banner");
  res.setHeader("Content-Type", "image/jpeg");
  return res.send(buffer);
}

module.exports = { welcomeCanvas, simpleLogo, bannerText };
