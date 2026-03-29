const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const Jimp = require('jimp');
const app = express();

app.use(cors());
app.use(express.json());

// A chave que o seu bot NR usa para se conectar
const API_KEY = "Bronxys30092025";

// --- ROTA DE PESQUISA (O QUE O BOT CHAMA PRIMEIRO) ---
app.get('/play', async (req, res) => {
    const { nome, apikey } = req.query;

    if (apikey !== API_KEY) {
        return res.status(403).json({ status: false, resultado: "APIKEY Inválida" });
    }

    if (!nome) {
        return res.status(400).json({ status: false, resultado: "Faltou o nome da música" });
    }

    try {
        const search = await yts(nome);
        const video = search.videos[0];

        if (!video) {
            return res.status(404).json({ status: false, resultado: "Música não encontrada" });
        }

        // Responde em JSON para o bot não dar erro de leitura
        res.json({
            status: true,
            resultado: {
                titulo: video.title,
                thumb: video.thumbnail,
                canal: video.author.name,
                duracao: video.timestamp,
                views: video.views,
                link: `https://${req.get('host')}/download?url=${encodeURIComponent(video.url)}&apikey=${API_KEY}`
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, resultado: "Erro interno na API" });
    }
});

// --- ROTA DE DOWNLOAD REAL DO ÁUDIO ---
app.get('/download', async (req, res) => {
    const { url, apikey } = req.query;

    if (apikey !== API_KEY) return res.status(403).send("Acesso negado");

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

// --- ROTA DE BOAS-VINDAS (WELCOME - JIMP LEVE) ---
app.get('/welcome', async (req, res) => {
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
    } catch (e) {
        res.status(500).send("Erro na imagem");
    }
});

// Rota de status para o Render não derrubar a API
app.get('/', (req, res) => res.json({ status: "online", bot: "NR-API" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[API NR] Rodando com sucesso na porta ${PORT}`);
});
