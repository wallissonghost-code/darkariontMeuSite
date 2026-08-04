# Auditoria de Produção — WD Founder

Data: 04/08/2026  
Versão auditada/publicada: **3.9.0**

## Resumo executivo

O projeto funciona como uma SPA autenticada hospedada no GitHub Pages, com Firebase Authentication, Firestore e Storage. A auditoria encontrou boa evolução visual e funcional, mas também uma dívida técnica relevante causada pelo acúmulo de folhas CSS, scripts de correção incremental e versões internas divergentes.

As correções aplicadas nesta versão priorizam estabilidade, acessibilidade, SEO técnico da área pública, cache, tratamento de falhas e experiência de navegação.

## Problemas críticos encontrados

### 1. Versões divergentes
- A tela de login ainda carregava recursos da versão 3.4.0.
- A SPA, shell, Service Worker e arquivos visuais já estavam em versões posteriores.
- Impacto: cache inconsistente, navegador executando arquivos antigos e correções aparentemente não publicadas.
- Correção: sincronização em 3.9.0 nos arquivos centrais.

### 2. Rank e privacidade
- O Rank tenta listar a coleção `usuarios`.
- As regras atuais permitem `list` apenas para administradores, o que é correto porque os documentos contêm nome, e-mail e telefone.
- Impacto: Rank pode falhar para membros; liberar a coleção seria vazamento de dados pessoais.
- Solução recomendada: coleção `rank_publico` sanitizada, atualizada por Cloud Function ou operação administrativa, contendo somente alias, inicial, foto pública autorizada, nível e pontuação.
- A alteração automática das regras foi bloqueada pela ferramenta de segurança e precisa ser aplicada no Firebase Console/deploy das rules.

### 3. Excesso de CSS
- O `app.html` carrega mais de vinte folhas de estilo.
- Existem camadas antigas e corretivas que se sobrepõem.
- Impacto: mais requisições, maior custo de cálculo de estilos e risco de regressão visual.
- Recomendação: migrar para Vite/Rollup e gerar um bundle CSS por área, com PurgeCSS/Lightning CSS.

### 4. Scripts e correções acumuladas
- Vários scripts foram criados para estabilizar navegação, tema, Rank, fotos e modais.
- Impacto: listeners duplicados, maior complexidade e dificuldade de manutenção.
- Correção parcial: consolidação da navegação na SPA e criação de uma camada única de hardening.
- Recomendação: refatorar por domínio (`auth`, `store`, `rank`, `account`, `admin`) e remover definitivamente arquivos legados após testes.

## Melhorias implementadas

### Performance
- Preconnect para Firebase/Google Static.
- DNS prefetch para APIs Google.
- Pré-carregamento das rotas da SPA.
- Lazy loading e decoding assíncrono aplicados automaticamente a imagens dinâmicas.
- Cache atualizado no Service Worker.
- Recursos críticos usam network-first.
- Páginas e recursos estáticos essenciais adicionados ao precache.
- Feedback de conexão offline/online.

### SEO
- Meta title e description na página pública.
- Open Graph.
- Twitter Card.
- Canonical URL.
- `robots.txt`.
- `sitemap.xml`.
- Página 404 personalizada.
- Área autenticada marcada como `noindex,nofollow,noarchive`.
- Metadados dinâmicos por rota dentro da SPA.

### Acessibilidade
- Link “Pular para o conteúdo”.
- Foco automático no H1 após navegação.
- Estados de foco visíveis.
- Área mínima de toque de 44 px.
- Labels e ARIA reforçados.
- Botões sem texto recebem nome acessível.
- Imagens sem `alt` recebem atributo seguro.
- Respeito a `prefers-reduced-motion`.
- Anúncios de estado de conexão e carregamento.

### Segurança
- Links externos recebem `noopener noreferrer`.
- Política de referrer `strict-origin-when-cross-origin`.
- Área privada removida da indexação.
- A chave pública do Firebase no frontend não é segredo; a segurança depende das regras e autorização.
- Foi identificado uso de papel administrativo legado salvo no Firestore. A melhor prática é usar somente Custom Claims para autorização administrativa.

### Resiliência
- Tratamento global de erros JavaScript e promises rejeitadas.
- Mensagem amigável para falhas inesperadas.
- Fallback visual para imagens quebradas.
- Página 404 própria.
- Service Worker com fallback offline.

### PWA
- `manifest.webmanifest` adicionado.
- Cores de tema e fundo definidas.
- Modo standalone preparado.
- Observação: ícones próprios ainda precisam ser adicionados ao manifest.

## Banco de dados e APIs

### Consultas
- Há telas administrativas que fazem `getDocs` de coleções completas (`usuarios`, `ofertas`, `compras`).
- Impacto: custo e lentidão conforme a base cresce.
- Recomendação: paginação com `limit`, `startAfter`, filtros por período e índices compostos.

### N+1 e duplicidade
- Algumas páginas carregam perfil e depois fazem consultas adicionais separadas.
- Recomendação: cache de sessão e documentos resumidos para dashboard.

### Timeouts
- Algumas consultas já possuem timeout manual; outras não.
- Recomendação: padronizar timeout e retry exponencial.

## Imagens

- A vitrine já utiliza `loading="lazy"` nos cards.
- A camada de hardening adiciona lazy loading e decoding em imagens dinâmicas.
- Imagens são armazenadas/remotas e não podem ser convertidas automaticamente no GitHub Pages.
- Recomendação: comprimir no upload, limitar dimensões e gerar WebP/AVIF via Cloud Function ou serviço de imagens.

## Compressão e minificação

- GitHub Pages controla a compressão HTTP; não é possível configurar Brotli/Gzip por arquivo no repositório.
- Os arquivos atuais não passam por build/minificação consistente.
- Recomendação: pipeline GitHub Actions com Vite, minificação JS/CSS/HTML e deploy da pasta `dist`.

## Headers de segurança

GitHub Pages não permite configurar livremente headers como:
- Content-Security-Policy
- X-Frame-Options / frame-ancestors
- Permissions-Policy
- HSTS personalizado

Recomendação: migrar a hospedagem para Cloudflare Pages, Firebase Hosting, Vercel ou Netlify para controlar headers. Como o projeto usa iframes internos administrativos, uma CSP deve ser testada cuidadosamente.

## URLs

- A SPA usa `app.html?page=...`, adequado funcionalmente, mas não é uma URL pública amigável.
- Como a área é privada e `noindex`, o impacto de SEO é baixo.
- Para experiência mais limpa, usar History API com rotas `/app/inicio`, `/app/rank`, etc., exige regras de rewrite não disponíveis no GitHub Pages sem fallback customizado.

## Responsividade

- Existem breakpoints para celular, tablet e desktop.
- A grande quantidade de CSS sobreposto continua sendo o maior risco de regressão.
- Recomendação: testes visuais automatizados em 320, 375, 390, 430, 768, 1024 e 1440 px.

## Checklist pendente para qualidade de produção

1. Criar `rank_publico` e regras seguras no Firebase.
2. Migrar autorização admin para Custom Claims.
3. Criar pipeline Vite e remover CSS/JS legado.
4. Adicionar testes E2E com Playwright.
5. Adicionar Lighthouse CI.
6. Criar compressão WebP/AVIF no upload.
7. Paginar coleções administrativas.
8. Configurar monitoramento de erros (Sentry ou Firebase Crashlytics Web equivalente).
9. Migrar hospedagem para plataforma com headers de segurança.
10. Adicionar ícones PWA 192x192 e 512x512.

## Ganho esperado

Sem medição Lighthouse automatizada não é correto prometer números exatos. As mudanças desta versão devem produzir:
- menor risco de cache antigo;
- navegação percebida mais rápida;
- menos imagens carregadas fora da tela;
- melhor experiência offline e em conexão instável;
- redução de falhas silenciosas;
- melhoria significativa de acessibilidade e SEO técnico da página pública.

O maior ganho futuro virá da consolidação dos bundles e da paginação das consultas Firestore.
