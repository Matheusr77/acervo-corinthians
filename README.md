# Acervo Corinthians

Portal de estatísticas com a história dos jogos do Sport Club Corinthians Paulista.
É uma SPA em JavaScript puro (ES Modules + Tailwind CSS) que consome uma API REST em Node.js/Express sobre um banco MySQL.

> Projeto acadêmico, não oficial. Os dados vêm do site [Todo Poderoso Timão](https://www.todopoderosotimao.com.br).

## Funcionalidades

- **Jogos**: listagem paginada com filtros por ano, competição, adversário, resultado e mando. Os filtros ficam na URL, então dá para compartilhar o link de uma busca.
- **Detalhes da partida**: placar (com pênaltis), informações do jogo, retrospecto contra o adversário e navegação para o jogo anterior e o seguinte.
- **Temporadas**: linha do tempo por década e página de cada ano, com desempenho, competições disputadas, destaques e todos os jogos.
- **Confrontos**: retrospecto contra cada adversário, com busca, e uma página por confronto.
- **Hoje na História**: na home e em `/hoje`, os jogos do Corinthians no mesmo dia do ano, com um jogo em destaque (títulos e clássicos têm prioridade) e navegação por qualquer data.
- **O Timão na sua vida** (`/minha-historia`): o torcedor informa a data de nascimento e vê jogos, vitórias, títulos, clássicos e recordes que viveu, e monta uma imagem para compartilhar (gerada no navegador, nada é salvo): 13 modelos de fundo, formatos story, feed e quadrado, destaque à escolha (títulos, clássicos, maior goleada, melhor temporada), frase opcional e até uma foto própria. As fotos dos modelos ficam em `public/assets/img/story/{modelo}.jpg` e podem ser trocadas mantendo o nome (miniaturas em `story/miniaturas/`).
- **Quiz do Timão** (`/quiz`): 5 perguntas por dia geradas do banco (placar de clássicos e finais, adversário de goleadas, ano de títulos, vitórias numa temporada, rival mais enfrentado na década). A data é a semente do sorteio, então todo mundo recebe as mesmas perguntas no mesmo dia, e o resultado sai em quadradinhos (🟩🟥) para compartilhar.
- **Fregueses & Tabus** (`/fregueses`): maiores fregueses e carrascos (mínimo de 30 jogos), tabus em andamento contra rivais ainda enfrentados e sequências atuais do time.
- **Estádios** (`/estadios`): retrospecto em cada um dos estádios, com placar mais comum, adversários mais enfrentados ali, décadas e todos os jogos.
- **O Timão pelo mapa** (`/mapa`): mapa do Brasil (estados e cidades) e mapa-múndi (países) desenhados em SVG com as cores do site. Tamanho da bolha e tom do estado mostram a quantidade de jogos; clicar num estado ou cidade aproxima a região e mostra o nome das principais cidades.
- **Achou um erro? Avise**: botão nas páginas de jogo, temporada, confronto e estádio (e no rodapé) que abre um formulário para a torcida apontar erros. Os avisos são revisados no painel `/admin/correcoes` (veja "Correções da torcida").
- **Tema claro ("Uniforme 2")**: botão de sol/lua no topo. A escolha fica salva no navegador e vale para gráficos e mapa.
- **Busca geral**: lupa no topo (atalhos `/` e `Ctrl+K`) que encontra times, estádios, campeonatos, temporadas e páginas.
- **Prévia de cada jogo**: `/og/jogo/{id}.png` gera a imagem com placar e escudos que aparece ao compartilhar o link de um jogo.
- **Clássicos**: Derby, Majestoso e Clássico Alvinegro, com placar histórico, resultados por década, sequências e maiores placares.
- **Títulos**: sala de troféus montada a partir das observações dos jogos decisivos, com link para o jogo de cada conquista.
- **Estatísticas**: números gerais, gráficos de aproveitamento por temporada e de gols por década, desempenho por temporada, adversários mais enfrentados, maiores goleadas e derrotas, maiores públicos, sequências históricas e estádios mais frequentes.
- **URLs limpas e prévia de link**: cada página tem endereço próprio (`/jogos/6291`, `/classicos/derby`) e o servidor já entrega título, descrição e imagem certos para Google e WhatsApp, além de `sitemap.xml` e `robots.txt`.

## Requisitos

- Node.js 22 ou superior
- MySQL 8 (ou MariaDB 10.5+) com o banco de jogos (tabelas `jogo`, `time`, `estadio` e `campeonato`)

## Como rodar

```bash
npm install
cp .env.example .env        # no Windows: copy .env.example .env
# edite o .env com os dados do seu MySQL
npm run dev                 # reinicia sozinho ao salvar arquivos do servidor
```

Depois é só acessar http://localhost:3000.

### Posts do dia (`/admin/posts`)

Com a mesma senha (`ADMIN_TOKEN`) do painel de correções, a página `/admin/posts` monta imagens e legendas prontas para o X e o Instagram: os jogos do Timão na data escolhida ("Hoje na História") e os títulos que fazem aniversário hoje e nos próximos 7 dias. Cada imagem sai em 1600×900 (X), 1080×1350 (feed) e 1080×1920 (story).

### Correções da torcida

O formulário "Achou um erro?" grava cada aviso em `data/correcoes.jsonl` (um por linha, sem tabela nova no banco). Para revisar:

1. Defina `ADMIN_TOKEN` no `.env` com uma senha longa (ex.: `openssl rand -hex 24`) e reinicie o servidor.
2. Abra `/admin/correcoes`, digite a senha e aceite ou recuse cada aviso. A correção no banco em si continua manual.

Proteções: limite de 5 avisos a cada 15 minutos por IP (o IP não é gravado), campo invisível contra robôs, validação de tamanho em tudo e corpo JSON de no máximo 10 KB. O e-mail é opcional e só aparece no painel. Em hospedagens com disco temporário, aponte `DATA_DIR` para um volume persistente; se o volume de avisos crescer, dá para migrar para uma tabela.

### Correção recomendada no banco

O scraping criou dois registros "Corinthians" na tabela `time`: o `id_time 1` (jogos até 11/12/1947) e o `id_time 1014`, com cidade "Porto Alegre" (todos os jogos a partir de 14/12/1947). Por isso o `.env` vem com `CORINTHIANS_IDS=1,1014`, e assim o site já conta os 6.291 jogos.

Para corrigir o banco de vez (não cria tabelas, só move os jogos para o `id_time 1`):

```bash
mysqldump -u root -p corinthians_db > backup_antes_correcao.sql
mysql -u root -p corinthians_db < database/correcoes/001-unificar-corinthians.sql
```

Depois disso, pode trocar para `CORINTHIANS_IDS=1` no `.env`.

## Escudos dos times

Os escudos ficam em `public/assets/img/escudos/`, com o **id_time** como nome do arquivo (`102.png` = Palmeiras). Não há mudança no banco: se o arquivo existe, o site usa a imagem, e se não existe mostra a sigla. Para descobrir o id de um time, abra a página dele no site (`/adversarios/102`).

**1. Baixar automaticamente do Wikidata/Wikimedia Commons**

Coloque seu e-mail em `ESCUDOS_CONTATO` no `.env` (a Wikimedia pede um contato para scripts) e rode:

```bash
npm run escudos                 # os 100 adversários mais enfrentados (≈85% dos jogos)
npm run escudos -- --top 50     # só os 50 primeiros
npm run escudos -- --todos      # todos os adversários
npm run escudos -- --refazer    # baixa de novo quem já tem escudo
```

O script compara nome e cidade de cada time com os clubes do Wikidata e separa o resultado:

- **ok**: vai direto para a pasta de escudos e já aparece no site.
- **revisar**: fica em `escudos/_revisar/` (ex.: dois clubes "Guarani"). Confira a imagem e, se estiver certa, mova para a pasta de escudos com o nome `{id}.png`.
- **faltando**: não existe no Wikidata. Complete à mão.

No fim ele gera o `escudos-relatorio.csv` (abre no Excel) com o status de cada time, e os créditos (autor e licença) ficam em `escudos/creditos.json`, que a página Sobre exibe.

**2. Completar à mão**

Salve a imagem na pasta com o id do time (PNG ou SVG, de preferência com fundo transparente e cerca de 256×256 px). Escudos salvos à mão nunca são sobrescritos pelo script, a não ser com `--refazer`. Anote a fonte de cada um.

> As respostas da API ficam em cache por até 5 minutos. Se um escudo novo não aparecer, reinicie o servidor.

## Scripts

| Comando             | O que faz                                                |
| ------------------- | -------------------------------------------------------- |
| `npm start`         | Sobe o servidor                                          |
| `npm run dev`       | Sobe o servidor com reinício automático                  |
| `npm run build:css` | Compila o Tailwind para `public/assets/css/app.css`      |
| `npm run watch:css` | Recompila o CSS a cada alteração (use junto com o `dev`) |
| `npm test`          | Roda os testes unitários                                 |
| `npm run lint`      | Verifica o código com ESLint                             |
| `npm run format`    | Formata o código com Prettier                            |
| `npm run escudos`   | Baixa escudos do Wikidata (veja "Escudos dos times")     |
| `npm run mapa:base` | Refaz a base do mapa (estados, municípios e países)      |

> Ao usar uma classe do Tailwind nova nos arquivos JS/HTML, rode `npm run build:css` (ou deixe o `watch:css` aberto). O CSS compilado já vai no repositório, então o site funciona sem esse passo.

## Estrutura

```
├── server/                  API (Express, ES Modules)
│   ├── server.js            ponto de entrada (porta, desligamento)
│   ├── app.js               middlewares, segurança, rotas, arquivos estáticos
│   ├── config/              leitura do .env e lista de clássicos
│   ├── db/                  pool de conexões MySQL
│   ├── routes/              definição dos endpoints
│   ├── controllers/         leitura/validação da requisição e resposta
│   ├── services/            regras de negócio, respostas da API e SEO (meta tags, sitemap)
│   ├── repositories/        consultas SQL (parametrizadas) e mapeamento
│   ├── middlewares/         tratamento de erros e log
│   └── utils/               validações, cálculos, extração de títulos e cache
├── public/                  tudo que o navegador recebe
│   ├── index.html
│   └── assets/
│       ├── css/app.css      gerado pelo Tailwind (não editar)
│       ├── img/
│       └── js/
│           ├── main.js      rotas e layout
│           ├── core/        roteador, cliente da API e template com escape
│           ├── components/  peças reutilizáveis de interface (inclui os gráficos SVG)
│           ├── views/       uma página por arquivo
│           └── utils/       formatação e helpers
├── src/styles/main.css      fonte do CSS (Tailwind + componentes)
├── scripts/escudos/         busca de escudos no Wikidata/Commons
├── scripts/mapa/            gera a base geográfica do mapa (já gerada no projeto)
├── data/                    avisos da torcida (criado sozinho, fora do git)
├── database/correcoes/      scripts de correção de dados
├── tests/                   testes unitários (node:test)
└── design/                  imagens originais em alta resolução
```

## API

Todas as respostas são JSON. Em caso de erro: `{ "erro": { "status": 400, "mensagem": "..." } }`.

| Endpoint                         | Descrição                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                | Status do servidor e do banco                                                                                                                                   |
| `GET /api/jogos`                 | Lista paginada. Parâmetros: `ano`, `campeonato`, `adversario`, `adversarioId`, `resultado` (V/E/D), `mando` (casa/fora), `ordem` (asc/desc), `pagina`, `limite` |
| `GET /api/jogos/filtros`         | Anos e campeonatos disponíveis                                                                                                                                  |
| `GET /api/jogos/recentes`        | Últimos jogos (`?limite=`)                                                                                                                                      |
| `GET /api/jogos/:id`             | Detalhe do jogo, navegação e retrospecto do confronto                                                                                                           |
| `GET /api/estatisticas/resumo`   | Números gerais do acervo                                                                                                                                        |
| `GET /api/estatisticas/recordes` | Goleadas, derrotas, públicos, sequências, adversários e estádios                                                                                                |
| `GET /api/temporadas`            | Desempenho por ano                                                                                                                                              |
| `GET /api/temporadas/:ano`       | Detalhe de uma temporada                                                                                                                                        |
| `GET /api/adversarios`           | Retrospecto contra cada adversário (`?busca=`)                                                                                                                  |
| `GET /api/adversarios/:id`       | Retrospecto completo contra um adversário                                                                                                                       |
| `GET /api/classicos`             | Derby, Majestoso e Clássico Alvinegro (placar geral e último jogo)                                                                                              |
| `GET /api/classicos/:slug`       | Retrospecto completo de um clássico (`derby`, `majestoso`, `alvinegro`)                                                                                         |
| `GET /api/quiz`                  | 5 perguntas do dia (`?dia=AAAA-MM-DD` para dias anteriores)                                                                                                     |
| `GET /api/fregueses`             | Fregueses, carrascos, tabus e sequências em andamento                                                                                                           |
| `GET /api/estadios`              | Retrospecto em cada estádio                                                                                                                                     |
| `GET /api/estadios/:id`          | Retrospecto completo em um estádio                                                                                                                              |
| `GET /api/busca?q=`              | Busca em times, estádios, campeonatos, temporadas e páginas                                                                                                     |
| `GET /api/escudos/creditos`      | Autor e licença dos escudos baixados do Wikimedia Commons                                                                                                       |
| `GET /api/hoje`                  | Jogos neste dia do ano em outras temporadas (`?dia=MM-DD`, padrão: hoje em São Paulo)                                                                           |
| `GET /api/minha-historia`        | O Corinthians desde uma data (`?desde=AAAA-MM-DD`)                                                                                                              |
| `GET /api/titulos`               | Títulos por categoria e competição, e índice de títulos por ano                                                                                                 |
| `GET /api/mapa`                  | Jogos por cidade (com posição no mapa), estado e país                                                                                                           |
| `POST /api/correcoes`            | Envia um aviso de erro (`tipo`, `descricao`, `sugestao`, `nome`, `email`, `pagina`, `jogoId`)                                                                   |
| `GET /api/admin/correcoes`       | Avisos recebidos (`?status=aberta\|aceita\|recusada`). Exige `Authorization: Bearer ADMIN_TOKEN`                                                                |
| `PATCH /api/admin/correcoes/:id` | Muda o status de um aviso (`{ "status": "aceita" }`). Exige `ADMIN_TOKEN`                                                                                       |

Fora da API, o servidor também responde `GET /sitemap.xml`, `GET /robots.txt` e `GET /og/jogo/{id}.png` (imagem de prévia do jogo).

## Decisões técnicas

- **Segurança**: só a pasta `public/` é servida (o `.env` e o código do servidor não ficam acessíveis); cabeçalhos de segurança e Content-Security-Policy com Helmet; todas as consultas são parametrizadas; todo texto vindo do banco passa por escape de HTML antes de ir para a tela.
- **Cálculos do ponto de vista do Corinthians**: todas as consultas partem da mesma tabela derivada (`JOGOS_DO_CLUBE` em `server/repositories/sql.js`), que já calcula gols pró/contra, adversário, mando e resultado. Assim, todas as telas usam a mesma regra.
- **Aproveitamento**: `(V×3 + E) / (J×3)`, considerando só jogos com placar registrado.
- **Datas**: o MySQL devolve as datas como texto (`YYYY-MM-DD`), para o fuso horário nunca mudar o dia do jogo.
- **Títulos**: o banco não tem tabela de títulos. Eles são extraídos das observações dos jogos decisivos ("Campeão Paulista pela 14ª vez", "Bicampeão Mundial de Clubes") em `server/utils/titulos.js`. A edição vem de "Jogo válido pelo … de AAAA" quando a final foi no ano seguinte, e jogos de "Entrega do troféu" são ignorados. Conquistas sem essa anotação na fonte não aparecem.
- **Clássicos**: configurados em `server/config/classicos.js` pelo nome e cidade do rival (não pelo ID), para continuar valendo se o banco for recriado.
- **Rotas**: o front usa History API (`/jogos/123`, sem `#`). O servidor devolve o `index.html` para qualquer rota da SPA, já com as meta tags da página, e responde 404 de verdade para rotas inexistentes. Links antigos no formato `/#/jogos/123` são convertidos automaticamente.
- **Gráficos**: SVG desenhado sem bibliotecas (`components/charts.js`), no tamanho real da tela, com tooltip, legenda e a opção "Ver dados em tabela" para acessibilidade.
- **Campos vazios no acervo**: `publico`, `horario`, `renda`, `arbitro` e os pênaltis estão vazios em todos os jogos do backup atual. O site só mostra esses campos quando há valor (a seção "Maiores Públicos" aparece sozinha quando houver dados). Estádios "nao encontrado" são tratados como sem estádio.
- **Jogos de título**: jogos cuja observação indica conquista ("Campeão Paulista pela 3ª vez", "Campeão da Libertadores…") ganham o selo 🏆 na listagem.
- **Imagem de prévia**: SVG convertido em PNG no servidor com `@resvg/resvg-js`, usando a fonte Poppins que vem em `server/assets/fonts` (licença OFL, em `OFL.txt`). Cada imagem fica em memória depois de gerada.
- **Quiz**: as respostas certas vêm junto com as perguntas (a conferência é feita no navegador). Para um quiz casual isso basta; para ranking com prêmio, a correção teria que ir para o servidor.
- **Mapa**: a base geográfica é gerada uma vez (`npm run mapa:base`) e já vem projetada em coordenadas SVG, então o navegador não carrega nenhuma biblioteca de mapas. Fontes: estados de [giuliano-oliveira/geodata-br-states](https://github.com/giuliano-oliveira/geodata-br-states) (MIT), municípios de [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros) (MIT, dados do IBGE), países do Natural Earth via `world-atlas` (domínio público) e nomes em português do `i18n-iso-countries` (MIT). Cidades com nome antigo ou grafia diferente no banco (Taguatinga, Campos, "Dourado"…) são ligadas ao município certo em `server/services/mapaService.js`.
- **Redes e contato**: o @ do X e do Instagram e o e-mail de contato ficam em `public/assets/js/components/redes.js` (rodapé e página Sobre).
- **Título da home**: sorteado a cada visita entre as frases da lista `FRASES` em `views/home.js`, sem repetir a anterior.
- **Menu**: as páginas ficam numa lista só (`public/assets/js/components/navegacao.js`), agrupadas em Arquivo, Rivais, Números e Torcida. Dela saem o menu lateral do computador (só ícones em telas médias, ícone + nome em telas grandes), o menu do celular e o bloco "Tudo no acervo" da home. Página nova no menu = uma linha nessa lista.
- **Tema**: as cores ficam em variáveis CSS (`src/styles/main.css`); o tema claro inverte a escala de cinzas e escurece o dourado para manter o contraste. Um script pequeno no `<head>` aplica o tema salvo antes da página aparecer, para não piscar.
- **Escalações, gols e lances** ainda não existem no banco. Quando essas tabelas forem criadas, a página de detalhes pode ganhar essas seções.

## Publicação

O site precisa de um servidor Node.js e de um banco MySQL na nuvem. Use o arquivo `corinthians_db_deploy.sql` (backup sem `CREATE DATABASE`/`DEFINER` e já com a correção 001) para importar os dados.

Variáveis de ambiente em produção:

| Variável                                                      | Valor                                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                    | `production`                                                                                  |
| `SITE_URL`                                                    | endereço público do site (ex.: `https://…`), usado nos links de compartilhamento e no sitemap |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | dados do banco da hospedagem                                                                  |
| `CORINTHIANS_IDS`                                             | `1` (o backup de deploy já está corrigido)                                                    |
| `DB_SSL`                                                      | `true` quando o banco exige conexão segura (ex.: Aiven)                                       |
| `DB_SSL_CA`                                                   | conteúdo do certificado CA fornecido pela hospedagem                                          |
| `ADMIN_TOKEN`                                                 | senha do painel de correções (opcional)                                                       |
| `UMAMI_WEBSITE_ID`                                            | ID do site no Umami, para contar visitas (opcional)                                           |
| `DATA_DIR`                                                    | pasta persistente para os avisos da torcida (opcional; padrão `data/`)                        |

Comando de build: `npm ci --omit=dev` · Comando de início: `npm start`. A porta vem da variável `PORT`, que as hospedagens definem sozinhas.
