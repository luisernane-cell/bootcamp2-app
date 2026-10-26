# Minha Estante

Aplicação web para procurar livros no catálogo aberto da [Open Library](https://openlibrary.org)
e guardar os que você quer ler numa estante pessoal, salva em banco de dados (Supabase/PostgreSQL).
Cada livro da estante tem um status de leitura: Quero ler, Lendo ou Lido.

A imagem serve a aplicação com Nginx (Alpine), com compressão gzip e healthcheck.

## Como rodar

```bash
docker run -d -p 8080:80 --name minha-estante luisernane/bootcamp2-app:latest
```

Depois, abra http://localhost:8080 no navegador.

## Versões

| Tag      | O que mudou |
|----------|-------------|
| `1.0`    | Primeira versão funcional: busca na Open Library e estante com criar, listar e excluir. |
| `1.1`    | Nginx configurado com gzip, cache de CSS/JS, cabeçalhos de segurança e healthcheck. |
| `latest` | Aponta para a versão mais recente (hoje, 1.1). |

## Código-fonte

GitHub: https://github.com/luisernane-cell/bootcamp2-app

Projeto acadêmico do Bootcamp II, por Luis Ernane Oliveira de Alencar.
