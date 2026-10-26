# Minha Estante

## Autor

Luis Ernane Oliveira de Alencar RA: 22601006

## Descrição

Aplicação web para procurar livros no catálogo aberto da Open Library. A pessoa
digita um título ou o nome de um autor e recebe uma lista de resultados com capa,
autoria, ano da primeira publicação e número de páginas — informação suficiente
para decidir a próxima leitura sem sair da página.

## API utilizada

- **Open Library Search API** — documentação: https://openlibrary.org/dev/docs/api/search
- Endpoint consumido: `GET https://openlibrary.org/search.json?q={termo}&fields={campos}&limit=12`
- Imagens de capa: `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`
- Não requer autenticação nem chave de acesso.

Campos lidos da resposta: `title`, `author_name`, `first_publish_year`,
`number_of_pages_median`, `cover_i` e `key`.

## Funcionalidades

- Buscar livros por título ou por nome do autor, clicando no botão ou pressionando Enter.
- Ver os resultados em cartões com capa, autoria, ano de publicação e número de páginas.
- Abrir a página do livro no catálogo da Open Library.
- Receber mensagens claras quando a busca vem vazia, quando o campo não foi preenchido
  ou quando a API não responde — a interface nunca fica quebrada.
- Layout adaptado a telas de celular.

## Como executar localmente

1. Clone o repositório: `git clone URL_DO_REPOSITORIO`
2. Entre na pasta: `cd bootcamp2-app`
3. Abra o arquivo `index.html` no navegador.

Não há dependências nem etapa de build. Para desenvolver, a extensão Live Server
do VS Code recarrega a página a cada alteração salva.

## Estrutura dos arquivos

```
index.html   estrutura da página e campos de busca
style.css    estilos, paleta e layout responsivo
script.js    consumo da API, montagem dos cartões e tratamento de erros
```

## Links

- **Aplicação no ar (GitHub Pages):** https://seu-usuario.github.io/bootcamp2-app/
- **Repositório:** https://github.com/seu-usuario/bootcamp2-app
