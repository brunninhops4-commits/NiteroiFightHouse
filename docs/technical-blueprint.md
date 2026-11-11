# Arquitetura, UX e especificação técnica

## Direção de produto

O ponto de entrada apresenta a Fight House como uma comunidade e oferece três caminhos visíveis. A pessoa escolhe uma modalidade; o conteúdo e a agenda passam a refletir essa escolha. A marca permanece estável em preto, branco e vermelho. Muay Thai Feminino ganha acentos coral, Muay Thai Geral usa vermelho vivo e BJJ usa azul ardósia. Tipografia condensada nos títulos dá energia esportiva, com uma família sem serifa legível para texto, filtros e formulários.

As fotos anexadas pelo usuário dão contexto real à comunidade. O protótipo evita atribuir nomes, faixas, títulos ou resultados competitivos sem fonte confirmada. Espaços para credenciais e depoimentos vêm identificados como conteúdo a confirmar.

## Sitemap

```text
Início
├── Modalidades
│   ├── Muay Thai Feminino
│   │   ├── Benefícios e proposta da turma
│   │   ├── Coach e credenciais
│   │   ├── Depoimento autorizado
│   │   ├── Planos
│   │   └── Horários / reservar aula
│   ├── Muay Thai Geral
│   │   └── [mesmas seções específicas]
│   └── Jiu-Jitsu (BJJ)
│       └── [mesmas seções específicas]
├── Agenda
│   ├── Filtros e calendário
│   ├── Seleção de aula
│   ├── Dados do aluno
│   ├── Revisão e confirmação
│   └── Ticket / QR Code
├── Equipe
└── Planos
```

## Fluxo principal de reserva

1. A pessoa escolhe uma modalidade no seletor ou em um cartão de modalidade.
2. A agenda lista somente sessões dessa modalidade. Ela pode mudar dia, semana ou mês e aplicar nível, período do dia e coach.
3. Cada cartão mostra horário, nível, coach e vagas. Sessões lotadas ficam desabilitadas.
4. A pessoa seleciona uma aula e informa nome, e-mail e celular.
5. A tela de revisão repete turma, data, horário e dados antes da confirmação.
6. Na confirmação, o sistema valida novamente a lotação e procura outra reserva ativa do mesmo aluno em horário sobreposto.
7. Se válido, cria um identificador de ticket, reduz as vagas e mostra um QR Code com o código opaco do ticket. O ticket pode ser baixado como imagem.
8. Em caso de conflito, a tela mantém o contexto, explica o problema e permite escolher outro horário. Uma agenda sem sessões oferece a ação de limpar filtros.

No protótipo, a reserva e a contagem de vagas são locais ao navegador para permitir a demonstração. Não há confirmação com a academia. O ticket e o QR não autorizam entrada real.

## Componentes críticos de UI

| Componente | Conteúdo e interação | Estados necessários |
|---|---|---|
| Seletor de modalidade | Três opções com nome explícito e rota para detalhes ou agenda filtrada | nenhuma selecionada, modalidade ativa |
| Calendário | Navegação anterior/próximo, data de referência, dia/semana/mês e cartões de sessão | carregando, vazio, erro, lotada, disponível |
| Cartão de aula | Modalidade, hora, nível, coach e vagas; botão abre a reserva | disponível, últimas vagas, lotada, horário passado |
| Modal de reserva | Formulário, revisão e confirmação com sequência curta; dialog acessível | dados inválidos, duplicidade, aula lotada, sucesso |
| Ticket | Código legível, resumo da sessão, QR e opção de baixar | QR disponível, falha de CDN com código alternativo |

## Stack recomendada para produção

- **Frontend:** React com TypeScript e Next.js para páginas rápidas, metadados e navegação responsiva. CSS Modules ou Tailwind podem implementar os tokens mantendo variantes de modalidade controladas.
- **API:** Node.js com NestJS ou Fastify. A API valida autorização, capacidade, duplicidade e regras de cancelamento no servidor.
- **Banco:** PostgreSQL. Usuários, modalidades, coaches, sessões e reservas têm relações e restrições transacionais.
- **Acesso e operação:** autenticação por e-mail/telefone conforme a política da academia; logs sem dados de pagamento; backups e métricas de conflitos.
- **Atualização de vagas:** SSE para atualização unidirecional em escala pequena/média, ou WebSocket se houver necessidade de atualizações bidirecionais. A contagem exibida é informativa; somente a transação de reserva confirma uma vaga.
- **QR:** token aleatório assinado ou aleatório de uso único, sem nome, e-mail ou telefone no conteúdo do QR.

O protótipo atual usa HTML, CSS e JavaScript estáticos para que a interação possa ser revista sem infraestrutura. A proposta acima é a etapa de produção; não está implementada neste Site.

## Esquema relacional

O arquivo [`schema.sql`](schema.sql) contém uma base PostgreSQL com `users`, `classes`, `schedules` e `bookings`, além de `coaches` como entidade independente. `classes` representa uma modalidade/turma; `schedules` representa uma sessão com data e lotação; `bookings` relaciona pessoa e sessão.

## Prevenção de double-booking

Ao receber `POST /api/bookings`, a API deve abrir uma transação serializável ou usar bloqueios explícitos. Primeiro adquire um advisory lock por aluno e intervalo de início, depois bloqueia a linha da sessão (`SELECT ... FOR UPDATE`), valida que a sessão continua ativa e conta reservas confirmadas sob o mesmo bloqueio. Antes de inserir, consulta as sessões já reservadas pelo aluno e rejeita qualquer intervalo sobreposto. Em seguida insere a reserva e confirma a transação.

Uma restrição `UNIQUE (user_id, schedule_id)` fecha a corrida para tentativas repetidas na mesma sessão. O bloqueio da sessão impede ultrapassar a capacidade; o bloqueio do aluno serializa duas solicitações simultâneas a horários coincidentes em turmas diferentes. Em erro, a transação inteira faz rollback. Idempotency keys permitem repetir uma chamada de rede sem gerar dois tickets.

## Acessibilidade e performance

- Mirar WCAG 2.2 AA: contraste de texto e controles, estados que não dependem só de cor, foco visível, formulário com rótulos, mensagens de erro associadas e operação por teclado.
- O calendário anuncia a mudança de período com `aria-live`; navegação e diálogo suportam teclado, Escape e retorno de foco.
- Em produção, imagens em AVIF/WebP com tamanhos responsivos, dimensões definidas e `loading="lazy"` fora da primeira dobra. Pré-carregar somente a imagem principal.
- Buscar sessões por intervalo curto e modalidade, paginar meses longos e manter uma chave de cache que inclua modalidade, filtros e período.
- Vagas podem ser atualizadas por evento ou polling curto enquanto a agenda estiver aberta. Reservas continuam sujeitas à validação transacional final.

## Dados a confirmar antes do lançamento público

1. Endereço, telefone, links de contato e canais oficiais da academia.
2. Horários, capacidade por turma, critérios de nível e coach responsável por sessão.
3. Nomes, bios, credenciais e graduações autorizados para publicação.
4. Valores, duração dos planos, aula experimental, cancelamentos e política de faltas.
5. Depoimentos reais com consentimento e autorização de imagem.
6. Política de privacidade, retenção de dados e canal para solicitações do titular.
