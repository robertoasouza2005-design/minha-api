const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const Jimp = require('jimp');
const app = express();

app.use(cors());
app.use(express.json());

// A SUA NOVA CHAVE MESTRA (SÓ O SEU RACK CONHECE)
const API_KEY = "NR_OFICIAL_2026";

// ROTA DE MÚSICA (COMPATÍVEL COM O NOVO RACK)
app.get('/api/ytplayv2', async (req, res) => {
    const { nome, apikey } = req.query;

    if (apikey !== API_KEY) return res.status(403).json({ status: false, resultado: "Acesso Negado" });
    if (!nome) return res.status(400).json({ status: false, resultado: "Faltou o nome" });

    try {
        const search = await yts(nome);
        const video = search.videos[0];

        if (!video) return res.status(404).json({ status: false, resultado: "Não encontrado" });

        res.json({
            status: true,
            resultado: {
                titulo: video.title,
                thumb: video.thumbnail,
                canal: video.author.name,
                views: video.views,
                publicado: video.ago,
                link: `https://${req.get('host')}/api/download?url=${encodeURIComponent(video.url)}&apikey=${API_KEY}`
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, resultado: "Erro no Servidor NR" });
    }
});

// ROTA DE DOWNLOAD (MÚSICA)
app.get('/api/download', async (req, res) => {
    const { url, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Não autorizado");
    try {
        const stream = ytdl(url, { 
            filter: 'audioonly', 
            quality: 'highestaudio', 
            highWaterMark: 1 << 25 
        });
        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) { res.status(502).send("Erro Youtube"); }
});

// ROTA DE WELCOME (IMAGEM)
app.get('/api/canvas/welcome', async (req, res) => {
    const { titulo, nome, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Erro");
    try {
        const image = new Jimp(800, 400, 0x000000FF);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        image.print(font, 50, 150, titulo || "BEM-VINDO");
        image.print(font, 50, 230, nome || "MEMBRO");
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) { res.status(500).send("Erro Imagem"); }
});

app.get('/', (req, res) => res.send("SISTEMA NR ONLINE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API NR V3.2 Rodando..."));
