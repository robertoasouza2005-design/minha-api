const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const { createCanvas, loadImage } = require('canvas');
const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DE SEGURANÇA (Bate com o seu Bot NR)
const API_KEY = "Bronxys30092025";

// --- ROTA DE MÚSICA (RESOLVE O ERRO 502) ---
app.get('/play', async (req, res) => {
    const { nome, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Acesso Negado");

    try {
        const search = await yts(nome);
        const video = search.videos[0];
        if (!video) return res.status(404).send("Música não encontrada");

        const stream = ytdl(video.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) {
        console.error(e);
        res.status(502).send("Erro ao processar música no YouTube");
    }
});

// --- ROTA DE BOAS-VINDAS (WELCOME - LINHA 794 DO SEU INICIAR.JS) ---
app.get('/welcome', async (req, res) => {
    const { titulo, nome, perfil, grupo, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Erro de Autenticação");

    try {
        const canvas = createCanvas(800, 450);
        const ctx = canvas.getContext('2d');

        // Fundo Escuro Estilizado
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, 0, 800, 450);

        // Borda Decorativa
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 10;
        ctx.strokeRect(20, 20, 760, 410);

        // Texto de Boas-Vindas
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(titulo || "BEM-VINDO(A)", 400, 150);

        ctx.fillStyle = '#00ffcc';
        ctx.font = '40px sans-serif';
        ctx.fillText(nome || "Novo Membro", 400, 250);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '25px sans-serif';
        ctx.fillText(`Grupo: ${grupo || "NR-Bot"}`, 400, 320);

        const buffer = canvas.toBuffer('image/png');
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) {
        res.status(500).send("Erro ao gerar imagem de boas-vindas");
    }
});

// Rota padrão para saber se a API está viva
app.get('/', (req, res) => res.send("API NR 2.0 - ONLINE E INDEPENDENTE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[API NR] Servidor rodando na porta ${PORT}`);
});
