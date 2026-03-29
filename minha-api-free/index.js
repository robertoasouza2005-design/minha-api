const express = require('express');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const app = express();

app.get('/', (req, res) => res.send('Sua API Própria está Online! 🚀'));

// --- ROTA DE MÚSICA (!play) ---
app.get('/play', async (req, res) => {
    const query = req.query.nome;
    if (!query) return res.status(400).send("Diga o nome da música!");
    try {
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return res.status(404).send("Vídeo não encontrado.");
        
        res.header('Content-Disposition', `attachment; filename="audio.mp3"`);
        ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);
    } catch (e) { res.status(500).send("Erro no YouTube"); }
});

// --- ROTA DE FIGURINHA (!s) ---
// Transforma link de imagem em figurinha .webp
app.get('/sticker', async (req, res) => {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("Falta a URL da imagem");
    
    try {
        const response = await axios({ url: imgUrl, responseType: 'stream' });
        res.setHeader('Content-Type', 'image/webp');
        
        // O FFmpeg faz a mágica de redimensionar e converter para .webp (formato de figurinha)
        ffmpeg(response.data)
            .format('webp')
            .size('512x512')
            .pipe(res, { end: true });
    } catch (e) { res.status(500).send("Erro ao converter imagem"); }
});

app.listen(process.env.PORT || 3000, () => console.log("API RODANDO!"));
