# Minha Estante

## Autor

Luis Ernane Oliveira de Alencar RA: 22601006

## Links da entrega

| Item | Link |
|------|------|
| Repositório GitHub | https://github.com/luisernane-cell/bootcamp2-app |
| Aplicação no ar (GitHub Pages) | https://luisernane-cell.github.io/bootcamp2-app/ |
| Repositório no Docker Hub | https://hub.docker.com/r/luisernane/bootcamp2-app |

## Rodar com Docker (comando para o avaliador)

```bash
docker run -d -p 8080:80 --name minha-estante luisernane/bootcamp2-app:1.1
```

Depois, abra http://localhost:8080. Para parar e remover: `docker rm -f minha-estante`.

## Descrição

Aplicação web para procurar livros no catálogo aberto da Open Library e guardar os que
interessam numa estante pessoal. A busca mostra capa, autoria, ano da primeira publicação
e número de páginas; a estante fica salva em banco de dados e continua lá depois que o
navegador é fechado. Cada livro guardado recebe um status de leitura: Quero ler, Lendo ou Lido.

## API utilizada

- **Open Library Search API** — documentação: https://openlibrary.org/dev/docs/api/search
- Endpoint consumido: `GET https://openlibrary.org/search.json?q={termo}&fields={campos}&limit=12`
- Imagens de capa: `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`
- Não requer autenticação nem chave de acesso.

Campos lidos da resposta: `title`, `author_name`, `first_publish_year`,
`number_of_pages_median`, `cover_i` e `key`.

## Persistência de dados

**Banco escolhido:** Supabase (PostgreSQL gerenciado, região South America — São Paulo),
acessado direto do frontend pela biblioteca `@supabase/supabase-js`.

**O que é salvo:** os livros que a pessoa guarda na estante, com os dados necessários para
redesenhar o cartão sem chamar a Open Library de novo, mais o status de leitura.

**Estrutura da tabela `estante`** (script completo em [`supabase/estante.sql`](supabase/estante.sql)):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `bigint` (identity, PK) | Identificador gerado pelo banco |
| `criado_em` | `timestamptz` | Data em que o livro foi guardado (padrão `now()`) |
| `chave_ol` | `text`, único | Chave da obra na Open Library (ex.: `/works/OL45804W`); impede duplicatas |
| `titulo` | `text` | Título do livro |
| `autor` | `text` | Até dois autores, separados por vírgula |
| `ano` | `integer` | Ano da primeira publicação |
| `paginas` | `integer` | Mediana do número de páginas |
| `capa_id` | `bigint` | Identificador da capa (`cover_i`) |
| `status` | `text` | `quero_ler`, `lendo` ou `lido` (padrão `quero_ler`) |

**Operações implementadas:**

| Operação | Na interface | No código (`script.js`) |
|----------|--------------|-------------------------|
| Create | Botão "Guardar na estante" em cada resultado da busca | `guardarLivro()` → `insert` |
| Read | Seção "Minha estante", carregada ao abrir a página | `carregarEstante()` → `select` |
| Update (bônus) | Seletor de status em cada livro da estante | `mudarStatus()` → `update` |
| Delete | Botão "Tirar da estante" em cada livro da estante | `removerLivro()` → `delete` |

**Limitação conhecida:** as políticas de acesso (RLS) da tabela estão abertas para qualquer
visitante (papel `public`, que inclui o `anon`). Isso significa que qualquer pessoa com a URL do projeto e a chave pública pode ler,
criar, alterar e apagar registros, e que existe uma única estante compartilhada por todos os
visitantes. A chave pública está no código de propósito (ela foi feita para o frontend); quem
protegeria os dados seriam políticas mais restritas. O próximo passo seria usar o Supabase Auth
e uma coluna `user_id`, com políticas que deixem cada pessoa ver e alterar apenas a própria estante.

## Funcionalidades

- Buscar livros por título ou por nome do autor, clicando no botão ou pressionando Enter.
- Ver os resultados em cartões com capa, autoria, ano de publicação e número de páginas.
- Guardar um livro na estante; livros já guardados aparecem como "Na estante ✓".
- Ver a estante ao abrir a página, com o total de livros e quantos já foram lidos.
- Marcar cada livro como Quero ler, Lendo ou Lido.
- Tirar um livro da estante.
- Abrir a página do livro no catálogo da Open Library.
- Mensagens claras quando a busca vem vazia, quando o campo não foi preenchido, quando a API
  não responde ou quando o banco não está acessível.
- Layout adaptado a telas de celular.

## Como executar localmente

**Com Docker (recomendado):**

```bash
git clone https://github.com/luisernane-cell/bootcamp2-app
cd bootcamp2-app
docker build -t bootcamp2-app .
docker run -d -p 8080:80 --name meu-app bootcamp2-app
```

Abra http://localhost:8080.

**Sem Docker:** use a extensão Live Server do VS Code, ou rode `python3 -m http.server 8080`
na pasta do projeto. Abrir o `index.html` com duplo clique não funciona mais: o `script.js`
agora é um módulo JavaScript (para importar a biblioteca do Supabase), e o navegador bloqueia
módulos carregados por `file://`.

## Estrutura dos arquivos

```
index.html           estrutura da página, busca e seção da estante
style.css            estilos, paleta e layout responsivo
script.js            consumo da API, CRUD no Supabase e tratamento de erros
Dockerfile           receita da imagem (Nginx servindo os arquivos estáticos)
nginx.conf           configuração do Nginx: gzip, cache e cabeçalhos (versão 1.1)
.dockerignore        o que não entra no contexto de build
supabase/estante.sql criação da tabela e das políticas RLS
docs/                prints e textos de apoio (evidências das sidequests)
```

## Imagem Docker

A aplicação é servida por um Nginx (`nginx:1.27-alpine`) dentro do container. O Dockerfile
copia `index.html`, `style.css` e `script.js` para `/usr/share/nginx/html/`, a pasta que o Nginx
serve, e expõe a porta 80.

```bash
docker build -t bootcamp2-app .
docker run -d -p 8080:80 --name meu-app bootcamp2-app
```

## Sidequests

### SQ1 · .dockerignore

O arquivo [`.dockerignore`](.dockerignore) exclui `.git`, `README.md`, a pasta `docs/` com os
prints, o script SQL, configurações de editor e rascunhos.

Quando rodamos `docker build`, a primeira coisa que o Docker faz é empacotar a pasta inteira (o
"contexto de build") e enviá-la ao motor do Docker. Sem o `.dockerignore`, isso inclui a pasta
`.git` com todo o histórico do projeto e as imagens dos prints, que podem pesar muito mais que a
aplicação. Excluindo esses arquivos, o contexto fica menor e o build começa mais rápido.

Há ainda um efeito na imagem: se algum dia o Dockerfile usar `COPY . .`, tudo que estiver no
contexto vai parar dentro da imagem, inclusive o histórico do Git, que pode conter dados
sensíveis. O `.dockerignore` funciona como uma rede de proteção: garante que só o necessário
entre na imagem e que alterar o README não invalide o cache das camadas e force um rebuild. No
Dockerfile atual os arquivos são copiados um a um, então a imagem já sai enxuta; o
`.dockerignore` mantém essa garantia mesmo se o Dockerfile mudar.

### SQ2 · Versionamento de imagem

O repositório no Docker Hub tem três tags:

| Tag | Conteúdo |
|-----|----------|
| `1.0` | Primeira versão funcional: busca, estante com criar, listar e excluir, Nginx com configuração padrão. |
| `1.1` | Melhoria: configuração própria do Nginx (`nginx.conf`) com compressão gzip, cache de CSS/JS e cabeçalhos de segurança, além de `HEALTHCHECK` no Dockerfile. Com ele, o `docker ps` mostra `(healthy)` quando o site está respondendo. |
| `latest` | Aponta para a `1.1`. |

Evidência: aba Tags em https://hub.docker.com/r/luisernane/bootcamp2-app/tags


### SQ3 · Descrição no Docker Hub

O overview do repositório no Docker Hub descreve a aplicação, traz o comando `docker run` pronto
para copiar e o link deste repositório. O texto usado está em
[`docs/dockerhub-overview.md`](docs/dockerhub-overview.md).

Evidência: https://hub.docker.com/r/luisernane/bootcamp2-app

### SQ4 · Explorando a orquestração

Dois containers da mesma imagem rodando ao mesmo tempo, nas portas 8080 e 8081:

```bash
docker run -d -p 8080:80 --name estante-a luisernane/bootcamp2-app:1.1
docker run -d -p 8081:80 --name estante-b luisernane/bootcamp2-app:1.1
docker ps
```

![docker ps com dois containers](docs/sq4-docker-ps.png)

**Se eu tivesse 100 containers, como gerenciaria?**

Com dois containers, digitar `docker run` e conferir o `docker ps` é viável; com cem, não. Seria
preciso escolher portas sem conflito, distribuir os containers entre várias máquinas, perceber
quando um deles cai e subir outro no lugar, e atualizar todos para uma nova versão sem tirar o
site do ar. Esse trabalho é o que um orquestrador como o Kubernetes automatiza. Nele, as máquinas
(nós) formam um **cluster**, que funciona como um único computador grande: eu digo o que quero e
o Kubernetes decide em qual máquina cada coisa roda. A menor unidade que ele gerencia é o **pod**,
um invólucro com um ou mais containers que compartilham rede e armazenamento; no meu caso, cada
pod teria um container da Minha Estante. Em vez de criar pods um a um, eu declararia num arquivo
(um Deployment) que quero, por exemplo, 100 **réplicas** da imagem `bootcamp2-app:1.1`. O
Kubernetes então mantém esse número sozinho: se um pod falha ou uma máquina sai do ar, ele cria
outro; se eu mudo a tag para `1.2`, ele substitui as réplicas aos poucos (rolling update); e um
Service distribui as requisições entre todas elas por um único endereço. A diferença de postura é
que deixo de dar ordens ("rode este container") e passo a declarar o estado desejado ("quero 100
destes funcionando"), cabendo ao orquestrador garantir que a realidade corresponda a ele.

## Histórico

- **Etapa 01:** busca de livros com a API da Open Library, publicada no GitHub Pages.
- **Etapa 02:** estante persistida no Supabase, conteinerização com Docker e publicação no Docker Hub.
