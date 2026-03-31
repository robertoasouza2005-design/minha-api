MINHA API FREE — VERSÃO 4.2.1

O que esta versão adiciona/corrige:
- YouTube organizado em routes/controllers/services/providers
- Fallback de download por perfis do yt-dlp
- Rotas sociais separadas
- Tentativa real de fallback com gallery-dl
- Rotas de imagem básicas além do welcome
- Healthcheck com verificação de yt-dlp / ffmpeg / gallery-dl
- Rotas legadas opcionais de ytmp3 / ytmp4
- Correção de validação de URL com sanitizeUrl
- Compat condicional nas rotas antigas
- Limpeza de arquivo/pasta temporária mais segura no stream
- Resposta padronizada com attempts quando o download falha

IMPORTANTE:
1. Instale no servidor:
   - yt-dlp
   - ffmpeg
   - gallery-dl (opcional, mas recomendado)
2. Se o bot ainda usa:
   - /api/ytmp3
   - /api/ytmp4
   elas continuam funcionando quando ENABLE_LEGACY_YT_ROUTES=true
3. Novas rotas sociais:
   - /api/social/info
   - /api/social/media
4. Novas rotas de imagem:
   - /api/canvas/welcome
   - /api/image/logo/simple
   - /api/image/banner/text
