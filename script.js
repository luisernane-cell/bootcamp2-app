/* ============================================================
   Minha Estante — consumo da API da Open Library
   Documentação: https://openlibrary.org/dev/docs/api/search
   Não precisa de chave de acesso.
   ============================================================ */

// Endereço base do endpoint de busca.
const ENDPOINT = "https://openlibrary.org/search.json";

// A Open Library devolve dezenas de campos por livro. Pedindo só os que
// vamos usar, a resposta fica muito menor e a busca mais rápida.
const CAMPOS = "key,title,author_name,first_publish_year,number_of_pages_median,cover_i";

// Quantos resultados mostrar por busca.
const LIMITE = 12;

// Guardamos as referências aos elementos do HTML uma única vez.
const campoBusca = document.getElementById("campo-busca");
const botaoBuscar = document.getElementById("botao-buscar");
const linhaStatus = document.getElementById("status");
const areaResultados = document.getElementById("resultados");

/* ------------------------------------------------------------
   1. Interação do usuário
   ------------------------------------------------------------ */

botaoBuscar.addEventListener("click", iniciarBusca);

// Buscar com Enter é o que qualquer pessoa espera de um campo de busca.
campoBusca.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") iniciarBusca();
});

function iniciarBusca() {
  const termo = campoBusca.value.trim();

  // Primeiro caso de erro: o usuário clicou sem digitar nada.
  if (termo === "") {
    areaResultados.innerHTML = "";
    mostrarStatus("Digite o nome de um livro ou de um autor para procurar.", true);
    campoBusca.focus();
    return;
  }

  buscarLivros(termo);
}

/* ------------------------------------------------------------
   2. A chamada à API
   ------------------------------------------------------------ */

async function buscarLivros(termo) {
  mostrarEsqueleto();
  mostrarStatus("Procurando…");

  try {
    // encodeURIComponent transforma espaços e acentos em algo que caiba
    // numa URL. Sem isso, "dom casmurro" quebraria a requisição.
    const url = `${ENDPOINT}?q=${encodeURIComponent(termo)}&fields=${CAMPOS}&limit=${LIMITE}`;

    // await = espera a resposta chegar da internet antes de seguir.
    const resposta = await fetch(url);

    // resposta.ok é false para qualquer status 4xx ou 5xx.
    if (!resposta.ok) {
      throw new Error(`A Open Library respondeu com status ${resposta.status}`);
    }

    const dados = await resposta.json(); // converte o texto JSON em objeto
    const livros = dados.docs;

    areaResultados.innerHTML = ""; // tira os blocos de carregamento

    // Segundo caso de erro: a API respondeu bem, mas não achou nada.
    if (!livros || livros.length === 0) {
      mostrarStatus(`Nenhum livro encontrado para "${termo}". Tente outra grafia ou o nome do autor.`);
      return;
    }

    mostrarStatus(`${dados.numFound} livros encontrados. Mostrando os ${livros.length} primeiros.`);

    // Para cada livro da resposta, monta um cartão e coloca na tela.
    livros.forEach((livro) => {
      areaResultados.appendChild(criarCartao(livro));
    });

  } catch (erro) {
    // Terceiro caso de erro: sem internet, API fora do ar, JSON inválido.
    // O console.error ajuda você a depurar; a mensagem na tela é para o usuário.
    console.error(erro);
    areaResultados.innerHTML = "";
    mostrarStatus("Não foi possível falar com a Open Library agora. Confira sua conexão e tente de novo.", true);
  }
}

/* ------------------------------------------------------------
   3. Montagem do cartão de cada livro
   ------------------------------------------------------------ */

function criarCartao(livro) {
  const cartao = document.createElement("article");
  cartao.className = "livro";

  cartao.appendChild(criarCapa(livro));

  // Usamos textContent (e não innerHTML) para o conteúdo vindo da API:
  // assim um título com < ou > entra como texto, sem virar HTML.
  const titulo = document.createElement("h3");
  titulo.className = "titulo";
  titulo.textContent = livro.title;

  const autor = document.createElement("p");
  autor.className = "autor";
  // author_name é um array e pode não existir. Sempre desconfie do JSON alheio.
  autor.textContent = livro.author_name
    ? livro.author_name.slice(0, 2).join(", ")
    : "Autoria não informada";

  const meta = document.createElement("p");
  meta.className = "meta";
  const ano = livro.first_publish_year || "ano desconhecido";
  const paginas = livro.number_of_pages_median
    ? `${livro.number_of_pages_median} páginas`
    : "páginas não informadas";
  meta.textContent = `${ano}, ${paginas}`;

  const link = document.createElement("a");
  link.href = `https://openlibrary.org${livro.key}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Ver no catálogo";

  cartao.append(titulo, autor, meta, link);

  return cartao;
}

function criarCapa(livro) {
  const capa = document.createElement("div");
  capa.className = "capa";

  // cover_i é o identificador da imagem no servidor de capas da Open Library.
  if (livro.cover_i) {
    const imagem = document.createElement("img");
    imagem.src = `https://covers.openlibrary.org/b/id/${livro.cover_i}-M.jpg`;
    imagem.alt = `Capa de ${livro.title}`;
    imagem.loading = "lazy"; // só carrega quando entra na tela
    capa.appendChild(imagem);
  } else {
    // Sem capa digitalizada, o próprio título ocupa o lugar dela.
    capa.classList.add("capa-vazia");
    capa.textContent = livro.title;
  }

  return capa;
}

/* ------------------------------------------------------------
   4. Mensagens e estados para o usuário
   ------------------------------------------------------------ */

function mostrarStatus(mensagem, ehErro = false) {
  linhaStatus.textContent = mensagem;
  linhaStatus.classList.toggle("status-erro", ehErro);
}

// Blocos cinzas pulsando enquanto a resposta não chega: a tela não fica vazia.
function mostrarEsqueleto() {
  areaResultados.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const bloco = document.createElement("div");
    bloco.className = "esqueleto";
    areaResultados.appendChild(bloco);
  }
}
