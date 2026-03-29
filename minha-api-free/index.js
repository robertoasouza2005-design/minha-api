const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const Jimp = require('jimp');
const app = express();

app.use(cors());
app.use(express.json());

// CHAVE QUE O SEU BOT NR USA
const API_KEY = "Bronxys30092025";

// --- ROTA DE MÚSICA (PEDIDA PELO REQ.JS DO SEU BOT) ---
app.get('/api/ytplayv2', async (req, res) => {
    const { nome, apikey } = req.query;

    if (apikey !== API_KEY) return res.status(403).json({ status: false, resultado: "APIKEY Inválida" });
    if (!nome) return res.status(400).json({ status: false, resultado: "Faltou o nome da música" });

    try {
        const search = await yts(nome);
        const video = search.videos[0];

        if (!video) return res.status(404).json({ status: false, resultado: "Música não encontrada" });

        // Retorna o JSON exatamente como o seu Bot NR espera ler
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
        console.error(e);
        res.status(500).json({ status: false, resultado: "Erro interno na API" });
    }
});

// --- ROTA DE DOWNLOAD QUE A API USA ---
app.get('/api/download', async (req, res) => {
    const { url, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Acesso Negado");

    try {
        const stream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) {
        res.status(502).send("Erro ao processar áudio");
    }
});

// --- ROTA DE BOAS-VINDAS (PEDIDA NA LINHA 794 DO SEU INICIAR.JS) ---
app.get('/api/canvas/welcome', async (req, res) => {
    const { titulo, nome, apikey } = req.query;

    if (apikey !== API_KEY) return res.status(403).send("Erro de Chave");

    try {
        // Cria imagem 800x400 preta (Mais leve que o Canvas)
        const image = new Jimp(800, 400, 0x000000FF);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        
        image.print(font, 50, 150, titulo || "BEM-VINDO");
        image.print(font, 50, 230, nome || "MEMBRO");

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) {
        res.status(500).send("Erro ao gerar imagem");
    }
});

// Rota de Teste Simples
app.get('/', (req, res) => res.json({ status: "online", bot: "NR-API v3.1" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[API NR] Sistema rodando e compatível com o bot!`);
});
