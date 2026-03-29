const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const Jimp = require('jimp');
const app = express();

app.use(cors());
const API_KEY = "Bronxys30092025";

// MÚSICA
app.get('/play', async (req, res) => {
    const { nome, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Erro");
    try {
        const search = await yts(nome);
        const video = search.videos[0];
        const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
        res.setHeader('Content-Type', 'audio/mpeg');
        stream.pipe(res);
    } catch (e) { res.status(502).send("Erro Youtube"); }
});

// BOAS-VINDAS (WELCOME USANDO JIMP - MUITO LEVE)
app.get('/welcome', async (req, res) => {
    const { titulo, nome, apikey } = req.query;
    if (apikey !== API_KEY) return res.status(403).send("Erro");

    try {
        // Cria uma imagem preta de 800x400 (Base)
        const image = new Jimp(800, 400, 0x000000FF);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

        image.print(font, 50, 100, titulo || "BEM-VINDO");
        image.print(fontSmall, 50, 200, nome || "Novo Membro");

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) { res.status(500).send("Erro Imagem"); }
});

app.listen(process.env.PORT || 3000, () => console.log("API LEVE ONLINE"));
