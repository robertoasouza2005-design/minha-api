const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const app = express();

app.use(cors());
app.use(express.json());

const MINHA_CHAVE = "Bronxys30092025"; 

// --- ROTA DE MÚSICA (!PLAY) ---
app.get('/play', async (req, res) => {
    const { nome, apikey } = req.query;
    if (apikey !== MINHA_CHAVE) return res.status(403).send("Chave Inválida");
    
    try {
        const search = await yts(nome);
        const video = search.videos[0];
        if (!video) return res.status(404).send("Vídeo não encontrado");

        const stream = ytdl(video.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) {
        res.status(502).send("Erro no processamento da música");
    }
});

// --- ROTA DE FIGURINHAS (STICKER) ---
// Essa rota ajuda o bot a converter imagens em WebP (formato de figurinha)
app.post('/sticker', async (req, res) => {
    // Aqui entra o processamento de imagem para figurinha
    // O bot envia a imagem, a API usa o Ffmpeg e devolve o WebP
    res.send("Motor de figurinhas ativo");
});

// --- ROTA DE BOAS-VINDAS (WELCOME) ---
app.get('/welcome', async (req, res) => {
    const { titulo, nome, perfil, grupo, apikey } = req.query;
    if (apikey !== MINHA_CHAVE) return res.status(403).send("Acesso Negado");

    try {
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Fundo (pode ser uma cor ou imagem)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 800, 400);

        // Texto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(titulo || "BEM-VINDO", 400, 150);
        ctx.font = '30px sans-serif';
        ctx.fillText(nome || "Novo Membro", 400, 220);
        ctx.fillText(`Grupo: ${grupo || "NR-Bot"}`, 400, 280);

        const buffer = canvas.toBuffer('image/png');
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) {
        res.status(500).send("Erro na imagem");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API NR COMPLETA RODANDO NA PORTA ${PORT}`));
