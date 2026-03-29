const express = require('express');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const app = express();

app.get('/', (req, res) => res.send('🚀 API Privada Aleatory Online!'));

// Rota de música
app.get('/play', async (req, res) => {
    const query = req.query.nome;
    if (!query) return res.status(400).send("Falta o nome da música");
    try {
        const search = await yts(query);
        const video = search.videos[0];
        if (!video) return res.status(404).send("Não encontrado");
        res.header('Content-Disposition', `attachment; filename="audio.mp3"`);
        ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);
    } catch (e) { res.status(500).send("Erro no processamento"); }
});

// Rota de figurinha
app.get('/sticker', async (req, res) => {
    const imgUrl = req.query.url;
    if (!imgUrl) return res.status(400).send("URL necessária");
    try {
        const response = await axios({ url: imgUrl, responseType: 'stream' });
        res.setHeader('Content-Type', 'image/webp');
        ffmpeg(response.data).format('webp').size('512x512').pipe(res);
    } catch (e) { res.status(500).send("Erro na figurinha"); }
});

// Rota de busca do YouTube (O bot vai precisar disso)
app.get('/pesquisa_ytb', async (req, res) => {
    try {
        const search = await yts(req.query.nome);
        res.json(search.videos);
    } catch (e) { res.status(500).json({ erro: "Erro na busca" }); }
});

// Rota simples de Boas-vindas
app.get('/welcome', (req, res) => {
    res.redirect('https://i.imgur.com/6U9S9uO.png'); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
