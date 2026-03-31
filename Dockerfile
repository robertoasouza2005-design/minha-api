FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && pip3 install --break-system-packages -U yt-dlp gallery-dl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=10000
ENV YTDLP_BIN=yt-dlp
ENV FFMPEG_BIN=ffmpeg
ENV GALLERYDL_BIN=gallery-dl

EXPOSE 10000

CMD ["npm", "start"]
