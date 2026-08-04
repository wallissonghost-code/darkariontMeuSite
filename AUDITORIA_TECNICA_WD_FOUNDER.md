# Auditoria técnica — WD Founder

Data: 03/08/2026

## Objetivo

Revisar o projeto completo com foco em estabilidade, segurança, integridade dos dados, desempenho e compatibilidade entre iOS, Android, iPad/tablets, Windows e macOS.

## Regra da auditoria

Nenhum arquivo será excluído apenas por parecer antigo. Antes de remover, deve ser confirmado que ele não é importado por HTML, JavaScript, CSS, rota administrativa, módulo dinâmico ou ferramenta embutida.

## Achados iniciais

### 1. Conflito de layout administrativo — crítico

O layout administrativo embutido é alterado por mais de uma camada:

- `app-shell.js`
- `unified-admin-shell.js`
- `embedded-admin-stabilizer.js`
- `admin-frame-autosize.css`
- `admin-frame-autosize.js`

O `app-shell.js` ainda injeta `min-height: 100dvh`, padding inferior de 110/120 px e estilos inline. As camadas mais recentes tentam substituir esses valores. Isso cria comportamento dependente da ordem de carregamento e explica áreas vazias, rolagem dupla e saltos no Safari.

Ação recomendada: consolidar a responsabilidade do layout embutido em um único módulo e remover apenas as regras duplicadas, não as páginas administrativas.

### 2. Concorrência no estoque — crítico

`registrar-compra.js` lê usuários e produtos, calcula o estoque localmente e depois grava com `writeBatch`. O lote é atômico, mas não valida se o estoque mudou entre a leitura e a gravação.

Risco: dois administradores ou dois toques em dispositivos diferentes podem vender as mesmas unidades.

Ação recomendada: migrar a operação para `runTransaction`, reler o produto dentro da transação e rejeitar estoque insuficiente.

### 3. Conteúdo dinâmico em `innerHTML` — alto

Clientes, produtos, categorias e e-mails são interpolados em HTML. Mesmo que hoje esses campos sejam majoritariamente administrativos, é necessário escapar texto dinâmico ou usar `textContent`/criação de elementos.

Risco: quebra visual e possibilidade de XSS armazenado caso um campo malicioso chegue ao Firestore.

Ação recomendada: criar utilitário único de escape e substituir os pontos de maior risco.

### 4. Excesso de camadas CSS — alto

`app.html` carrega várias folhas gerais e corretivas, incluindo:

- `premium.css`
- `dashboard.css`
- `dashboard-luxury.css`
- `app-ui.css`
- `dark-mode.css`
- `spa.css`
- `desktop-sidebar-premium.css`
- `ios-navigation-performance.css`
- `unified-shell.css`
- `admin-navigation-premium.css`
- `cross-platform-fixes.css`
- `bottom-nav-premium.css`
- `theme-coherence-v2.css`
- `admin-frame-autosize.css`

Ação recomendada: mapear seletores duplicados e consolidar por responsabilidade. Não remover antes do mapa de dependências.

### 5. Cache e versões inconsistentes — médio/alto

Há vários números de build independentes em HTML e JavaScript. Uma página pode carregar um módulo novo com CSS antigo.

Ação recomendada: usar um único identificador de build por lançamento e atualizar todas as importações de forma coordenada.

### 6. Administração no frontend — médio

O frontend contém UID administrativo fixo e aceita papéis legados. Isso não entrega senha, porém mistura apresentação com autorização.

Ação recomendada: manter a proteção real nas regras/claims e reduzir dependência de listas administrativas no cliente.

### 7. Regras Firestore — revisão necessária

Pontos positivos:

- negação global ao final;
- cliente só pode atualizar campos limitados do próprio perfil;
- logs não podem ser alterados ou excluídos;
- operações administrativas estão protegidas.

Pontos para revisar:

- migrar gradualmente o papel legado para Custom Claims;
- validar esquema e limites em compras, produtos e configurações;
- validar valores não negativos e tipos de campos;
- criar testes automatizados das regras.

### 8. Falta de testes automatizados — alto

É necessário cobrir pelo menos:

- login e persistência de sessão;
- navegação membro/admin;
- retorno do Admin para cada tela de membro;
- rolagem mobile;
- claro/escuro;
- venda com estoque por tamanho;
- clique duplo;
- venda simultânea;
- permissões de cliente/admin;
- exclusão de notificação;
- cache e atualização de versão.

## Ordem de correção

### Fase 1 — estabilidade

1. Consolidar shell/iframe administrativo.
2. Remover rolagem dupla e regras `100dvh` conflitantes.
3. Padronizar navegação e ciclo de vida dos listeners.
4. Criar tratamento global de erros.

### Fase 2 — integridade

1. Migrar Registrar compra para transação.
2. Criar identificador idempotente por operação.
3. Validar estoque e tamanhos no banco.
4. Impedir gravações duplicadas.

### Fase 3 — segurança

1. Remover interpolação insegura em HTML.
2. Fortalecer regras Firestore.
3. Preparar App Check.
4. Adicionar CSP compatível com GitHub Pages.
5. Revisar uploads e links externos.

### Fase 4 — desempenho e manutenção

1. Consolidar CSS.
2. Unificar build/cache.
3. Carregar módulos somente quando necessários.
4. Remover arquivos realmente órfãos.
5. Criar checklist multiplataforma por versão.

## Plataformas obrigatórias

- iPhone Safari
- iPad Safari em retrato e paisagem
- Android Chrome
- tablet Android
- Windows Chrome/Edge/Firefox
- macOS Safari/Chrome
- toque, mouse e teclado
- modo claro e escuro

## Status

Auditoria iniciada. Nenhum arquivo funcional foi removido nesta etapa.
