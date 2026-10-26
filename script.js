/* ============================================================
   Minha Estante — busca na Open Library + estante no Supabase
   Open Library: https://openlibrary.org/dev/docs/api/search
   Supabase JS:  https://supabase.com/docs/reference/javascript
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------
   0. Configuração
   ------------------------------------------------------------ */

// Project Settings → API (ou "API Keys") no painel do Supabase.
// A chave anon/publishable FOI FEITA para ficar no frontend: quem protege
// os dados são as políticas RLS da tabela, não o segredo da chave.
// NUNCA coloque aqui a chave service_role/secret.
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_CHAVE = "SUA_CHAVE_ANON";
const TABELA = "estante";

const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE);

// Open Library
const ENDPOINT = "https://openlibrary.org/search.json";
const CAMPOS = "key,title,author_name,first_publish_year,number_of_pages_median,cover_i";
const LIMITE = 12;

// Rótulos que aparecem na tela para cada valor da coluna "status".
const STATUS = {
  quero_ler: "Quero ler",
  lendo: "Lendo",
  lido: "Lido",
};

// Referências aos elementos do HTML.
const campoBusca = document.getElementById("campo-busca");
const botaoBuscar = document.getElementById("botao-buscar");
const linhaStatus = document.getElementById("status");
const areaResultados = document.getElementById("resultados");
const linhaStatusEstante = document.getElementById("status-estante");
const resumoEstante = document.getElementById("resumo-estante");
const areaEstante = document.getElementById("estante");

// Cópia local da estante (o que veio do banco). Serve para desenhar a tela
// e para saber, nos resultados da busca, quais livros já estão guardados.
let estante = [];

/* ------------------------------------------------------------
   1. Interação do usuário
   ------------------------------------------------------------ */

botaoBuscar.addEventListener("click", iniciarBusca);

campoBusca.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") iniciarBusca();
});

function iniciarBusca() {
  const termo = campoBusca.value.trim();

  if (termo === "") {
    areaResultados.innerHTML = "";
    mostrarStatus("Digite o nome de um livro ou de um autor para procurar.", true);
    campoBusca.focus();
    return;
  }

  buscarLivros(termo);
}

/* ------------------------------------------------------------
   2. Busca na API da Open Library
   ------------------------------------------------------------ */

async function buscarLivros(termo) {
  mostrarEsqueleto(areaResultados);
  mostrarStatus("Procurando…");

  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(termo)}&fields=${CAMPOS}&limit=${LIMITE}`;
    const resposta = await fetch(url);

    if (!resposta.ok) {
      throw new Error(`A Open Library respondeu com status ${resposta.status}`);
    }

    const dados = await resposta.json();
    const livros = dados.docs;

    areaResultados.innerHTML = "";

    if (!livros || livros.length === 0) {
      mostrarStatus(`Nenhum livro encontrado para "${termo}". Tente outra grafia ou o nome do autor.`);
      return;
    }

    mostrarStatus(`${dados.numFound} livros encontrados. Mostrando os ${livros.length} primeiros.`);

    livros.forEach((livro) => {
      areaResultados.appendChild(criarCartaoResultado(livro));
    });

  } catch (erro) {
    console.error(erro);
    areaResultados.innerHTML = "";
    mostrarStatus("Não foi possível falar com a Open Library agora. Confira sua conexão e tente de novo.", true);
  }
}

/* ------------------------------------------------------------
   3. CRUD da estante no Supabase
   ------------------------------------------------------------ */

// READ — carrega a estante ao abrir a página.
async function carregarEstante() {
  if (SUPABASE_URL.includes("SEU-PROJETO")) {
    mostrarStatusEstante("Configure a URL e a chave do Supabase no script.js para ativar a estante.", true);
    return;
  }

  mostrarEsqueleto(areaEstante, 3);

  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar a estante:", error);
    areaEstante.innerHTML = "";
    mostrarStatusEstante("Não foi possível carregar sua estante. Tente recarregar a página.", true);
    return;
  }

  estante = data;
  renderizarEstante();
}

// CREATE — guarda um livro vindo da busca.
async function guardarLivro(livro, botao) {
  botao.disabled = true;
  botao.textContent = "Guardando…";

  const registro = {
    chave_ol: livro.key,
    titulo: livro.title,
    autor: livro.author_name ? livro.author_name.slice(0, 2).join(", ") : null,
    ano: livro.first_publish_year ?? null,
    paginas: livro.number_of_pages_median ?? null,
    capa_id: livro.cover_i ?? null,
  };

  // .select().single() devolve a linha criada (com id e criado_em do banco).
  const { data, error } = await supabase
    .from(TABELA)
    .insert(registro)
    .select()
    .single();

  if (error) {
    // 23505 = violação de "unique": o livro já estava no banco
    // (por exemplo, guardado em outra aba). Sincronizamos e seguimos.
    if (error.code === "23505") {
      await carregarEstante();
      atualizarBotoesResultado();
      return;
    }

    console.error("Erro ao guardar:", error);
    botao.disabled = false;
    botao.textContent = "Guardar na estante";
    mostrarStatusEstante(`Não foi possível guardar "${livro.title}". Tente de novo.`, true);
    return;
  }

  estante.unshift(data);
  renderizarEstante();
  atualizarBotoesResultado();
}

// UPDATE (bônus) — muda o status de leitura.
async function mudarStatus(registro, novoStatus, seletor) {
  const statusAnterior = registro.status;
  seletor.disabled = true;

  const { error } = await supabase
    .from(TABELA)
    .update({ status: novoStatus })
    .eq("id", registro.id);

  seletor.disabled = false;

  if (error) {
    console.error("Erro ao alterar status:", error);
    seletor.value = statusAnterior; // volta o seletor para o valor real
    mostrarStatusEstante("Não foi possível alterar o status. Tente de novo.", true);
    return;
  }

  registro.status = novoStatus;
  atualizarResumo();
}

// DELETE — tira um livro da estante.
async function removerLivro(registro, botao) {
  botao.disabled = true;
  botao.textContent = "Tirando…";

  const { error } = await supabase
    .from(TABELA)
    .delete()
    .eq("id", registro.id);

  if (error) {
    console.error("Erro ao remover:", error);
    botao.disabled = false;
    botao.textContent = "Tirar da estante";
    mostrarStatusEstante(`Não foi possível tirar "${registro.titulo}" da estante. Tente de novo.`, true);
    return;
  }

  estante = estante.filter((item) => item.id !== registro.id);
  renderizarEstante();
  atualizarBotoesResultado();
}

/* ------------------------------------------------------------
   4. Desenho da estante
   ------------------------------------------------------------ */

function renderizarEstante() {
  areaEstante.innerHTML = "";
  atualizarResumo();

  if (estante.length === 0) {
    mostrarStatusEstante("Sua estante está vazia. Procure um livro acima e clique em “Guardar na estante”.");
    return;
  }

  mostrarStatusEstante("");
  estante.forEach((registro) => {
    areaEstante.appendChild(criarCartaoEstante(registro));
  });
}

function atualizarResumo() {
  if (estante.length === 0) {
    resumoEstante.textContent = "";
    return;
  }

  const lidos = estante.filter((item) => item.status === "lido").length;
  const total = estante.length === 1 ? "1 livro" : `${estante.length} livros`;
  resumoEstante.textContent = `${total}, ${lidos} ${lidos === 1 ? "lido" : "lidos"}`;
}

function criarCartaoEstante(registro) {
  const cartao = document.createElement("article");
  cartao.className = "livro";

  cartao.appendChild(criarCapa(registro.capa_id, registro.titulo));

  const titulo = document.createElement("h3");
  titulo.className = "titulo";
  titulo.textContent = registro.titulo;

  const autor = document.createElement("p");
  autor.className = "autor";
  autor.textContent = registro.autor || "Autoria não informada";

  // Seletor de status (UPDATE).
  const idSeletor = `status-${registro.id}`;
  const rotulo = document.createElement("label");
  rotulo.className = "sr-only";
  rotulo.htmlFor = idSeletor;
  rotulo.textContent = `Status de leitura de ${registro.titulo}`;

  const seletor = document.createElement("select");
  seletor.id = idSeletor;
  seletor.className = "seletor-status";
  Object.entries(STATUS).forEach(([valor, texto]) => {
    const opcao = document.createElement("option");
    opcao.value = valor;
    opcao.textContent = texto;
    seletor.appendChild(opcao);
  });
  seletor.value = registro.status;
  seletor.addEventListener("change", () => mudarStatus(registro, seletor.value, seletor));

  // Botão de excluir (DELETE).
  const botaoRemover = document.createElement("button");
  botaoRemover.type = "button";
  botaoRemover.className = "botao-remover";
  botaoRemover.textContent = "Tirar da estante";
  botaoRemover.setAttribute("aria-label", `Tirar ${registro.titulo} da estante`);
  botaoRemover.addEventListener("click", () => removerLivro(registro, botaoRemover));

  const acoes = document.createElement("div");
  acoes.className = "acoes";
  acoes.append(rotulo, seletor, botaoRemover);

  cartao.append(titulo, autor, acoes);
  return cartao;
}

/* ------------------------------------------------------------
   5. Cartões de resultado da busca
   ------------------------------------------------------------ */

function criarCartaoResultado(livro) {
  const cartao = document.createElement("article");
  cartao.className = "livro";

  cartao.appendChild(criarCapa(livro.cover_i, livro.title));

  // textContent (e não innerHTML) para conteúdo vindo de fora.
  const titulo = document.createElement("h3");
  titulo.className = "titulo";
  titulo.textContent = livro.title;

  const autor = document.createElement("p");
  autor.className = "autor";
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

  // Botão de guardar (CREATE).
  const botaoGuardar = document.createElement("button");
  botaoGuardar.type = "button";
  botaoGuardar.className = "botao-guardar";
  botaoGuardar.dataset.chave = livro.key;
  botaoGuardar.addEventListener("click", () => guardarLivro(livro, botaoGuardar));
  atualizarBotao(botaoGuardar);

  const link = document.createElement("a");
  link.href = `https://openlibrary.org${livro.key}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Ver no catálogo";

  const acoes = document.createElement("div");
  acoes.className = "acoes";
  acoes.append(botaoGuardar, link);

  cartao.append(titulo, autor, meta, acoes);
  return cartao;
}

// Deixa o botão coerente com o que está no banco.
function atualizarBotao(botao) {
  const jaGuardado = estante.some((item) => item.chave_ol === botao.dataset.chave);
  botao.disabled = jaGuardado;
  botao.classList.toggle("guardado", jaGuardado);
  botao.textContent = jaGuardado ? "Na estante ✓" : "Guardar na estante";
}

function atualizarBotoesResultado() {
  areaResultados.querySelectorAll(".botao-guardar").forEach(atualizarBotao);
}

function criarCapa(capaId, titulo) {
  const capa = document.createElement("div");
  capa.className = "capa";

  if (capaId) {
    const imagem = document.createElement("img");
    imagem.src = `https://covers.openlibrary.org/b/id/${capaId}-M.jpg`;
    imagem.alt = `Capa de ${titulo}`;
    imagem.loading = "lazy";
    capa.appendChild(imagem);
  } else {
    capa.classList.add("capa-vazia");
    capa.textContent = titulo;
  }

  return capa;
}

/* ------------------------------------------------------------
   6. Mensagens e estados
   ------------------------------------------------------------ */

function mostrarStatus(mensagem, ehErro = false) {
  linhaStatus.textContent = mensagem;
  linhaStatus.classList.toggle("status-erro", ehErro);
}

function mostrarStatusEstante(mensagem, ehErro = false) {
  linhaStatusEstante.textContent = mensagem;
  linhaStatusEstante.classList.toggle("status-erro", ehErro);
  linhaStatusEstante.hidden = mensagem === "";
}

function mostrarEsqueleto(area, quantidade = 6) {
  area.innerHTML = "";
  for (let i = 0; i < quantidade; i++) {
    const bloco = document.createElement("div");
    bloco.className = "esqueleto";
    area.appendChild(bloco);
  }
}

/* ------------------------------------------------------------
   7. Início
   ------------------------------------------------------------ */

carregarEstante();
