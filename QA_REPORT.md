# QA Report

Data da rodada: 2026-05-15

## Telas revisadas

- Web app revisado em desktop (1440x900), tablet (1024x768) e mobile (390x844).
- Fluxos web revisados: login, dashboard, contatos, kanban, campanhas, respostas rapidas, lembretes e configuracoes.
- Extensao revisada a partir do build final em harness local com assets reais da extensao:
  - popup antes do login
  - popup autenticado
  - sidebar no estado de login
  - sidebar com erro de conexao
  - sidebar autenticada com sync de contato via API
- Artefatos gerados em `.tmp/qa-artifacts/`:
  - `summary.json`
  - `extension-summary.json`
  - capturas `web-*` e `extension-*`

## Bugs encontrados

- Sidebar fixa a partir de `1024px` estava comprimindo demais o workspace em tablet e notebook menor.
- Layouts com split view em `contacts`, `campaigns` e `reminders` estavam entrando cedo demais, deixando lista/tabela espremida.
- Tabelas tinham densidade horizontal excessiva em larguras intermediarias por padding e texto sem truncation suficiente.
- Cards de respostas rapidas variavam demais de altura e desalinhavam as areas de acao.
- Kanban em telas menores ainda exigia muito arrasto horizontal, sem snap visual entre colunas.
- Alguns textos longos em contatos, campanhas, lembretes e sidebar da extensao podiam quebrar mal ou pressionar o layout.
- Login e shell tinham pequenos gaps de acessibilidade e UX:
  - labels do login sem associacao explicita com inputs
  - botoes de icone sem `aria-label`

## Bugs corrigidos

- Breakpoint da shell principal movido para `xl`, mantendo a sidebar em modo overlay ate larguras menores e liberando area util no tablet.
- Split layouts de `contacts`, `campaigns` e `reminders` movidos para `2xl`, evitando panes estreitos em desktop medio.
- Tabelas compactadas com padding responsivo menor e melhor leitura em larguras apertadas.
- Truncation, `min-w-0`, `break-words` e ajustes de badge aplicados nos pontos com maior risco de corte de texto.
- Lista de respostas rapidas convertida para cards com altura mais consistente e CTA alinhado no rodape.
- Kanban refinado com colunas menores em breakpoints menores e `snap` horizontal para navegação mais fluida.
- Sidebar/topbar refinadas para telas pequenas, com melhor distribuicao de espaco.
- Sidebar da extensao recebeu ajustes de wrap e alinhamento para textos longos em cards, listas e strip do contato.
- Login recebeu `htmlFor`/`id` corretos; botoes de menu/tema receberam `aria-label`.

## Itens pendentes

- Nao houve validacao final dentro do `https://web.whatsapp.com/` real com extensao MV3 carregada em sessao Chrome completa. O ambiente atual foi validado via harness local usando o build real da extensao.
- O kanban continua com scroll horizontal por desenho. Isso e intencional; a rodada removeu atrito visual, nao o modelo de interacao.
- A heuristica automatizada ainda marca elementos da sidebar off-canvas em tablet/mobile como "overflow elements", mas o `horizontalPageOverflow` ficou `0` em todas as rotas revisadas.

## Proximos riscos tecnicos

- A extensao depende de seletores do DOM do WhatsApp Web. Mudancas no markup do produto podem quebrar `extractOpenChat()` e `insertMessageInComposer()`.
- Como a shell agora segura a sidebar fixa so a partir de `xl`, qualquer aumento futuro de densidade no header ou nos cards deve ser revisado junto com os breakpoints.
- Tabelas continuam sensiveis a textos muito maiores que a seed atual; se novos campos vierem com payloads mais longos, pode ser necessario reforcar truncation por coluna.
- O harness da extensao cobre visual, login, erro e sync via API, mas nao cobre permissao real do Chrome, service worker MV3 nem mudancas de comportamento do WhatsApp em producao.

## Validacao final

- `npm run lint` -> ok
- `npm run build` -> ok
- `npm run build -w @salonzap/extension` -> ok
