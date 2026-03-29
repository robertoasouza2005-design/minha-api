const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const Jimp = require('jimp');
const app = express();

app.use(cors());
const API_KEY = "Bronxys30092025";

// ROTA DE MÚSICA (MELHORADA)
app.get('/play', async (req, res) => {
    const { nome, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Chave Inválida");
    if (!nome) return res.status(400).send("Nome faltando");

    try {
        const search = await yts(nome);
        const video = search.videos[0];
        if (!video) return res.status(404).send("Não encontrado");

        const stream = ytdl(video.url, { 
            filter: 'audioonly', 
            quality: 'highestaudio',
            highWaterMark: 1 << 25 // Buffer de 32MB para não cair
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) { 
        console.log(e);
        res.status(502).send("Erro no Youtube"); 
    }
});

// ROTA DE BOAS-VINDAS (ESTÁVEL)
app.get('/welcome', async (req, res) => {
    const { titulo, nome, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Erro");

    try {
        // Cria imagem 800x400 preta
        const image = new Jimp(800, 400, 0x000000FF);
        
        // Carrega fonte padrão do Jimp (evita erro de carregamento externo)
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        
        image.print(font, 50, 150, titulo || "BEM-VINDO");
        image.print(font, 50, 230, nome || "MEMBRO");

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) { 
        res.status(500).send("Erro na Imagem"); 
    }
});

app.get('/', (req, res) => res.send("NR-API ONLINE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API RODANDO"));
