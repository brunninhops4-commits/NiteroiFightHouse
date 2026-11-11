# Niterói Fight House

Protótipo responsivo da experiência digital da academia, com navegação por modalidade e reserva demonstrativa.

## Abrir localmente

Sirva a pasta `dist` com qualquer servidor estático. O protótipo não exige etapa de build. A geração do QR usa `qrcodejs` via CDN; sem acesso à CDN, o código do ticket continua disponível.

## O que está pronto

- Entrada única com três caminhos: Muay Thai Feminino, Muay Thai Geral e Jiu-Jitsu (BJJ).
- Conteúdo específico de cada modalidade e acentos visuais sobre a identidade comum preto, vermelho e branco.
- Agenda filtrável por modalidade, nível, período do dia, coach e visualização de dia, semana ou mês.
- Fluxo demonstrativo de reserva, validação de vaga, prevenção de duplicidade por e-mail e horário, ticket e QR Code.
- Dados de reserva ficam no `localStorage` deste navegador. Não há API, envio para a academia, sincronização entre usuários ou cobrança.
- Os horários, ocupação, planos e textos de depoimento são demonstrativos; nomes e credenciais de coaches precisam de confirmação.

## Documentação

Veja [arquitetura, sitemap, fluxo de usuário e especificação técnica](docs/technical-blueprint.md) e [esquema relacional de referência](docs/schema.sql).
