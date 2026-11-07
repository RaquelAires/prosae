# Prosaê

Biblioteca digital brasileira feita com **Vue 3**, **Vue Router**, **TypeScript** e **Vite**. Autores podem enviar livros e capas; leitores podem descobrir obras, ler PDF/EPUB, baixar arquivos autorizados e organizar a estante.

## Abrir no VS Code

Abra esta pasta, a que contém `package.json`, no VS Code. Instale a extensão **Vue - Official** sugerida pelo projeto.

No terminal integrado:

```bash
npm ci
npm run build
npm run db:local
npm run dev
```

Acesse **http://127.0.0.1:5173**. Nas próximas vezes, basta executar `npm run dev`. O terminal deve permanecer aberto; **Ctrl+C** encerra o servidor.

No ambiente em que o projeto foi preparado, dependências e banco local já estão prontos.

Também é possível usar **Terminal → Executar Tarefa → Prosaê: iniciar Vue**. A tarefa de compilação está disponível em **Terminal → Executar Tarefa de Compilação**.

## Estrutura

```text
src/
  App.vue                 Layout principal
  main.ts                 Vue e configuração do Vue Router
  store.ts                Estado compartilhado e cliente da API
  types.ts                Tipos das obras e perfis
  style.css               Identidade visual e responsividade
  components/             Capas, cards, títulos e estados da interface
  views/                  Início, catálogo, livro, autores, estante, publicação e leitor
server/
  index.ts                Worker HTTP e rotas de autenticação
  api.ts                  API, autorização, uploads e persistência
  identity.ts             Identidade da sessão persistente
  env.ts                  Tipos dos recursos do servidor
  data.ts                 Obras e perfis de demonstração
db/schema.ts              Esquema do banco
drizzle/                  Migrações SQL versionadas
public/                   Onça, arara, capas, exemplos e worker do PDF.js
scripts/                  Preparação do banco e testes
.vscode/                  Extensão recomendada e tarefas do VS Code
wrangler.jsonc            Configuração do servidor e recursos Cloudflare
vite.config.ts            Vue e integração do servidor com Vite
```

## Rotas

| Rota | Função |
| --- | --- |
| `/` | Início e seleções editoriais |
| `/explorar` | Busca, sugestões, filtros e ordenação |
| `/livro/:id` | Detalhes, sinopse, download e recomendações |
| `/ler/:id` | Leitor de PDF ou EPUB |
| `/autores` | Diretório de autores |
| `/autores/:id` | Perfil e publicações |
| `/publicar` | Envio por etapas, rascunho e revisão |
| `/estante` | Livros salvos, progresso, perfil e publicações |
| `/entrar` e `/cadastro` | Entrada e criação de conta |
| `/conta` | Conta, troca de senha e saída |

## Dados e arquivos

- **D1** armazena livros, perfis, rascunhos, estantes e progresso.
- **R2** armazena os arquivos enviados e as capas.
- No desenvolvimento, os dados ficam em `.wrangler/state`. Essa pasta é ignorada pelo Git e não deve ser apagada se você quiser manter os uploads locais.
- Produção e desenvolvimento usam bancos e arquivos separados. A migração para Vue preserva o esquema e os dados anteriores.
- `npm run db:local` prepara um banco vazio ou reconhece o esquema existente sem recriar tabelas.
- PDF e EPUB: até **25 MB**. Capas JPG, PNG e WebP: até **5 MB**. O servidor verifica tipo, autoria e disponibilidade da obra.
- O leitor PDF usa **PDF.js**. O leitor EPUB extrai texto com **JSZip**, permite ajustes de fonte/tema e não executa scripts das obras. EPUBs com DRM ou diagramação fixa não são suportados.
- As seis obras iniciais são exemplos originais, com autores fictícios, identificados na interface.

## Login

O catálogo pode ser explorado sem login. Publicar, salvar livros e sincronizar leituras exige autenticação.

O cadastro em `/cadastro` e a entrada em `/entrar` usam e-mail e senha própria, tanto localmente quanto em produção. A senha deve ter entre 12 e 128 caracteres e é armazenada como hash scrypt com salt exclusivo. As sessões ficam no D1; o navegador recebe um cookie HttpOnly, SameSite=Lax e Secure em HTTPS.

Em `/conta`, é possível consultar o perfil, alterar a senha e sair. A troca de senha encerra as outras sessões. A opção de manter conectado dura até 30 dias; sem ela, a sessão expira em até 12 horas. O servidor limita tentativas de autenticação. Recuperação de senha por e-mail e verificação de e-mail ainda não estão configuradas.

Contas nativas são novas e não são vinculadas automaticamente às antigas identidades da hospedagem. Os registros anteriores permanecem no banco. Execute `npm run db:local` após atualizar o projeto para aplicar as novas tabelas sem apagar os dados.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Servidor Vue com atualização automática |
| `npm run typecheck` | Verifica TypeScript e templates Vue |
| `npm run build` | Verifica tipos e compila cliente e servidor |
| `npm run preview` | Executa a compilação local em `http://127.0.0.1:4173` |
| `npm run db:local` | Prepara/preserva o banco local |
| `npm run db:generate` | Gera migrações após alteração do esquema |
| `npm run test:books` | Valida os PDFs e EPUBs de demonstração |
| `npm run test:api` | Testa upload, publicação, estante e permissões no servidor local |
| `npm run test:auth` | Testa cadastro, sessões, senha, CSRF e limites de tentativas |

Os testes de API usam somente localhost e retiram do catálogo a publicação de teste ao terminar.

## Commit e envio ao GitHub

O projeto já tem um repositório Git. A pasta `.vscode` pode ser versionada; `node_modules`, builds, dados locais e arquivos de configuração com segredos são ignorados.

No VS Code, abra **Controle do Código-Fonte** (`Ctrl+Shift+G`) para revisar as alterações e criar commits. Para enviar a um novo repositório, use **Publicar Branch** e escolha sua conta do GitHub.

Se você já criou um repositório vazio no GitHub, configure o endereço dele:

```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Se `origin` já estiver configurado, confira `git remote -v` antes de alterá-lo. O envio dos arquivos para o GitHub versiona o código; ele não transfere o banco e os uploads nem executa o servidor no GitHub Pages.

## Publicação

A configuração `.openai/hosting.json` mantém a identidade da hospedagem atual e os recursos D1/R2. A compilação gera `dist/client` e `dist/server/index.js`.

Para outro ambiente Cloudflare, crie os recursos D1/R2 na sua conta, substitua os identificadores de exemplo em `wrangler.jsonc`, aplique as migrações e configure a autenticação. Não coloque tokens nem arquivos `.env` no repositório.
