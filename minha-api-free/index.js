const express = require("express");
const cors = require("cors");
const ytdl = require("@distube/ytdl-core");
const yts = require("yt-search");
const Jimp = require("jimp");

const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = "NR_OFICIAL_2026";
const PORT = process.env.PORT || 3000;

function isAuthorized(apikey) {
  return apikey === API_KEY;
}

function sendForbidden(res) {
  return res.status(403).json({ status: false, resultado: "Acesso Negado" });
}

app.get("/api/ytplayv2", async (req, res) => {
  const { nome, apikey } = req.query;

  if (!isAuthorized(apikey)) return sendForbidden(res);
  if (!nome) {
    return res.status(400).json({ status: false, resultado: "Faltou o nome" });
  }

  try {
    const search = await yts(nome);
    const video = search?.videos?.[0];

    if (!video) {
      return res
        .status(404)
        .json({ status: false, resultado: "Não encontrado" });
    }

    return res.json({
      status: true,
      resultado: {
        titulo: video.title,
        thumb: video.thumbnail,
        canal: video.author?.name || "Desconhecido",
        views: video.views,
        publicado: video.ago,
        link: `https://${req.get("host")}/api/download?url=${encodeURIComponent(video.url)}&apikey=${API_KEY}`
      }
    });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, resultado: "Erro no Servidor NR" });
  }
});

app.get("/api/download", async (req, res) => {
  const { url, apikey } = req.query;

  if (!isAuthorized(apikey)) return res.status(403).send("Não autorizado");
  if (!url) return res.status(400).send("URL ausente");
  if (!ytdl.validateURL(url)) return res.status(400).send("URL inválida");

  let responded = false;

  try {
    const info = await ytdl.getInfo(url);
    const title = (info?.videoDetails?.title || "audio")
      .replace(/[^\w\s.-]/g, "")
      .trim();

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${title || "audio"}.mp3"`
    );
    res.setHeader("Cache-Control", "no-store");

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 24
    });

    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        stream.destroy(new Error("Timeout no download"));
        if (!res.headersSent) {
          res.status(504).send("Tempo limite excedido");
        }
      }
    }, 45000);

    stream.on("error", () => {
      clearTimeout(timeout);
      if (!responded) {
        responded = true;
        if (!res.headersSent) {
          res.status(502).send("Erro Youtube");
        } else {
          res.end();
        }
      }
    });

    res.on("close", () => {
      clearTimeout(timeout);
      stream.destroy();
    });

    stream.on("end", () => {
      clearTimeout(timeout);
    });

    stream.pipe(res);
  } catch (e) {
    if (!responded) {
      responded = true;
      return res.status(502).send("Erro Youtube");
    }
  }
});

app.get("/api/canvas/welcome", async (req, res) => {
  const { titulo, apikey } = req.query;

  if (!isAuthorized(apikey)) return res.status(403).send("Erro");

  try {
    const image = new Jimp(800, 400, 0x000000ff);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

    image.print(font, 50, 150, titulo || "BEM-VINDO");

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    res.setHeader("Content-Type", "image/jpeg");
    return res.send(buffer);
  } catch (e) {
    return res.status(500).send("Erro ao gerar imagem");
  }
});

app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "API NR online"
  });
});

app.listen(PORT, () => {
  console.log(`API NR online na porta ${PORT}`);
});
