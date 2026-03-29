const express = require('express');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('✅ API NR Independente Ativa!');
});

// --- ROTA DE PESQUISA ---
app.get('/pesquisa_ytb', async (req, res) => {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ error: 'Falta o nome' });
    try {
        const search = await yts(nome);
        res.json(search.all[0]);
    } catch (e) {
        res.status(500).json({ error: 'Erro na pesquisa' });
    }
});

// --- ROTA PLAY (ÁUDIO) COM BUFFER OTIMIZADO ---
app.get('/play', async (req, res) => {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ error: 'Falta o nome' });
    try {
        const search = await yts(nome);
        const video = search.videos[0];
        if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });

        const stream = ytdl(video.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25 // 32MB de buffer para evitar erro 502
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) {
        res.status(500).send('Erro ao processar áudio');
    }
});

// --- ROTA WELCOME (IMAGEM DE BOAS-VINDAS) ---
app.get('/welcome', async (req, res) => {
    const { titulo, nome, perfil, grupo, membros } = req.query;
    // Aqui podes usar uma canvas ou apenas redirecionar para uma API de imagem
    // Por enquanto, vamos redirecionar para um gerador de imagem dinâmico
    const welcomeImg = `https://api.clau.me/api/canvas/welcome?titulo=${titulo}&nome=${nome}&perfil=${perfil}&grupo=${grupo}&membros=${membros}&tema=dark`;
    
    try {
        const response = await axios.get(welcomeImg, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', 'image/png');
        res.send(response.data);
    } catch (e) {
        res.status(500).send('Erro ao gerar imagem');
    }
});

// --- ROTA STICKER ---
app.get('/sticker', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Falta a URL');
    // Redireciona para o processamento de imagem
    res.redirect(url); 
});

app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
