-- ============================================================
-- Minha Estante — tabela e políticas de acesso (Supabase)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- ============================================================

create table if not exists public.estante (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  chave_ol   text        not null unique,   -- ex.: "/works/OL45804W" (evita livro duplicado)
  titulo     text        not null,
  autor      text,
  ano        integer,
  paginas    integer,
  capa_id    bigint,                        -- cover_i da Open Library
  status     text        not null default 'quero_ler'
             check (status in ('quero_ler', 'lendo', 'lido'))
);

-- Liga o Row Level Security. Sem políticas, TODA operação é negada
-- (e o insert falha "em silêncio" no frontend — veja o Console, F12).
alter table public.estante enable row level security;

-- LIMITAÇÃO CONHECIDA (registrada no README): políticas abertas para o
-- papel "anon". Qualquer pessoa com a URL e a chave pública pode ler,
-- criar, alterar e apagar registros. Aceitável nesta etapa; o próximo
-- passo seria autenticação (Supabase Auth) com políticas por usuário.
create policy "estante: leitura pública"    on public.estante for select to anon using (true);
create policy "estante: inserção pública"   on public.estante for insert to anon with check (true);
create policy "estante: alteração pública"  on public.estante for update to anon using (true) with check (true);
create policy "estante: exclusão pública"   on public.estante for delete to anon using (true);

-- Garante que a API de dados enxergue a tabela (necessário em projetos
-- novos, em que tabelas criadas por SQL não são expostas automaticamente).
grant select, insert, update, delete on public.estante to anon;
