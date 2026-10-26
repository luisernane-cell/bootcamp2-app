# ============================================================
# Minha Estante — imagem de produção (versão 1.1)
# ============================================================

# Versão fixa do Nginx: o build de hoje e o de daqui a seis meses
# usam a mesma base (com "nginx:alpine" ela muda sem aviso).
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Minha Estante" \
      org.opencontainers.image.description="Busca de livros na Open Library com estante salva no Supabase" \
      org.opencontainers.image.version="1.1" \
      org.opencontainers.image.source="https://github.com/SEU-USUARIO/bootcamp2-app"

# 1.1: configuração própria do Nginx (gzip, cache e cabeçalhos de segurança).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos da aplicação para a pasta servida pelo Nginx.
# Os nomes precisam bater exatamente com os do repositório.
COPY index.html style.css script.js /usr/share/nginx/html/

EXPOSE 80

# 1.1: o Docker passa a saber se o site está respondendo (coluna STATUS do docker ps).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
