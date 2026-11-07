# Prosaê

**Histórias que atravessam o Brasil.**

O Prosaê é uma biblioteca digital brasileira que conecta leitores e autores. O site reúne livros para descobrir, ler online e baixar, conforme as opções autorizadas pelo responsável por cada obra. Para quem escreve, oferece um espaço para publicar livros, apresentar seu trabalho e gerenciar suas publicações.

A identidade visual celebra a cultura e a biodiversidade brasileiras: verde, amarelo, azul e branco, tipografia expressiva, folhas e ilustrações de onça-pintada e arara.

[Acessar o Prosaê](https://prosae-leitura-brasileira.splendidbrink.chatgpt.site/) · [Repositório](https://github.com/RaquelAires/prosae)

## Para que serve

- **Leitores:** encontrar histórias, conhecer autores, ler no navegador e organizar uma estante pessoal.
- **Autores:** compartilhar obras em PDF ou EPUB, enviar capas e escolher se os livros poderão ser lidos online, baixados ou ambos.
- **Visitantes:** explorar o catálogo e conhecer as obras sem precisar criar uma conta.

## Como usar o site

### Encontrar um livro

Na página inicial, o visitante encontra seleções editoriais e destaques do catálogo. Em **Explorar livros**, pode pesquisar por título, autor e palavras-chave, usar filtros e ordenar os resultados. Cada card leva à página exclusiva da obra.

A página do livro apresenta capa, autoria, sinopse, dados da publicação e a seção **Por dentro da história**, com atmosfera, temas e uma frase de destaque. Os botões de leitura e download aparecem conforme a disponibilidade definida pelo autor. Antes de baixar, é possível conferir o formato e o tamanho do arquivo.

### Ler e organizar a estante

O leitor online abre em uma página dedicada, com navegação, progresso, marcador e tela cheia. Os controles se adaptam ao arquivo:

| Formato | Recursos de leitura |
| --- | --- |
| PDF | Navegação por páginas, zoom e ajuste à largura |
| EPUB | Navegação por capítulos, tamanho de fonte, espaçamento e temas de leitura |

Com uma conta, o leitor pode salvar livros em **Quero ler**, **Lendo** ou **Concluídos**, registrar seu progresso e retomar a leitura.

### Publicar uma obra

Depois de entrar na conta, o autor acessa **Publicar minha obra** e segue quatro etapas:

1. **Arquivo:** envia o livro em PDF ou EPUB.
2. **Capa:** envia uma imagem e confere a prévia.
3. **Sobre a obra:** preenche título, autoria, sinopse, gênero e demais informações; define as opções de leitura e download.
4. **Revisão:** confere os dados e confirma que possui autorização para compartilhar o conteúdo antes de publicar.

É possível salvar um rascunho antes da publicação. Em **Minha estante**, o autor também pode editar seu perfil e consultar, editar ou retirar suas próprias publicações. O diretório **Autores** reúne os perfis e suas obras.

## Conta, login e permissões

O cadastro é feito em **Criar conta**, informando nome, e-mail e uma senha entre **12 e 128 caracteres**. Depois, basta usar o e-mail e a senha em **Entrar**. Publicar, salvar livros e sincronizar o progresso exigem login.

Em **Minha conta**, é possível consultar os dados da conta, acessar a edição do perfil, alterar a senha e sair. A troca de senha encerra as outras sessões. A opção **Manter conectado** permite uma sessão de até 30 dias; sem ela, a sessão expira em até 12 horas.

**Não existe conta administrativa padrão, senha de administrador ou painel de administração global nesta versão.** Cada pessoa cria sua própria conta e gerencia somente seus livros, perfil e estante. Ter acesso ao repositório GitHub ou à hospedagem não concede um perfil administrativo dentro do site.

As senhas são armazenadas como hashes scrypt com salt exclusivo. As sessões são verificadas no servidor e usam cookies HttpOnly, SameSite=Lax e Secure em HTTPS. O servidor limita tentativas de autenticação. Recuperação de senha por e-mail e verificação de e-mail ainda não estão disponíveis.

## Páginas

| Página | O que oferece |
| --- | --- |
| Início (`/`) | Apresentação, seleções e destaques editoriais |
| Explorar livros (`/explorar`) | Busca, sugestões, filtros e ordenação |
| Livro (`/livro/:id`) | Informações, leitura, download e recomendações |
| Leitor (`/ler/:id`) | Leitura online de PDF ou EPUB |
| Autores (`/autores`) | Diretório de autores |
| Perfil (`/autores/:id`) | Apresentação do autor e suas obras |
| Publicar (`/publicar`) | Envio por etapas, rascunho e revisão |
| Minha estante (`/estante`) | Livros salvos, progresso, perfil e publicações próprias |
| Entrar e criar conta (`/entrar`, `/cadastro`) | Autenticação e cadastro |
| Minha conta (`/conta`) | Dados da conta, troca de senha e saída |

## Arquivos e armazenamento

| Conteúdo | Formatos aceitos | Limite por arquivo |
| --- | --- | --- |
| Livro | PDF e EPUB | 25 MB |
| Capa | JPG, PNG e WebP | 5 MB |

Livros, perfis, rascunhos, estantes, progresso, contas e sessões ficam no **Cloudflare D1**. Arquivos enviados e capas ficam no **Cloudflare R2**. Produção e desenvolvimento usam dados separados.

As seis obras iniciais são exemplos originais com autores fictícios, identificados na interface. O leitor EPUB extrai conteúdo sem executar scripts dos livros; arquivos com DRM ou diagramação fixa não são suportados. Novas contas por e-mail não são vinculadas automaticamente às antigas identidades da hospedagem; os registros anteriores permanecem no banco.

## Tecnologias

- **Interface:** Vue 3, Vue Router, TypeScript e Vite.
- **Servidor:** Cloudflare Worker, com API para autenticação, catálogo, uploads e permissões.
- **Persistência:** Cloudflare D1, Drizzle ORM e migrações SQL; Cloudflare R2 para arquivos.
- **Leitura:** PDF.js para PDF e JSZip para extração de EPUB.
- **Ícones:** Lucide.

## Executar no VS Code

Instale o **Node.js 22.13 ou superior**, abra a pasta que contém `package.json` no VS Code e instale a extensão **Vue - Official** sugerida pelo projeto.

No terminal integrado:

```bash
npm ci
npm run build
npm run db:local
npm run dev
```

Abra o endereço indicado no terminal, normalmente **http://127.0.0.1:5173**. Se a porta estiver ocupada, o Vite informa outra. Mantenha o terminal aberto enquanto usa o site; **Ctrl+C** encerra o servidor.

Nas próximas execuções, use `npm run dev`. Após atualizações que adicionem migrações, execute novamente o build e `npm run db:local` antes de iniciar. O cadastro local funciona com e-mail e senha próprios, mas as contas não são compartilhadas com a produção.

Os dados locais ficam em `.wrangler/state`, ignorada pelo Git. Preserve essa pasta para manter os cadastros e uploads de desenvolvimento. A tarefa **Prosaê: iniciar Vue** também está disponível em **Terminal → Executar Tarefa**.

## Organização do projeto

| Local | Responsabilidade |
| --- | --- |
| `src/` | Interface Vue, componentes, páginas e estilos |
| `server/` | API, autenticação, sessões e acesso aos arquivos |
| `db/schema.ts` | Esquema do banco de dados |
| `drizzle/` | Migrações SQL versionadas |
| `public/` | Ilustrações, capas, exemplos e worker do PDF.js |
| `scripts/` | Preparação do banco e testes de integração |
| `.vscode/` | Extensão recomendada e tarefas do editor |
| `wrangler.jsonc` | Configuração Cloudflare |
| `vite.config.ts` | Configuração do Vue e servidor de desenvolvimento |

## Comandos de desenvolvimento

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Iniciar o ambiente local com atualização automática |
| `npm run typecheck` | Verificar TypeScript e templates Vue |
| `npm run build` | Verificar tipos e compilar cliente e servidor |
| `npm run preview` | Executar o build local na porta 4173 |
| `npm run db:local` | Aplicar migrações preservando os dados locais |
| `npm run db:generate` | Gerar migrações após alterar o esquema |
| `npm run test:books` | Validar os PDFs e EPUBs de demonstração |
| `npm run test:api` | Testar upload, publicação, download, estante e permissões |
| `npm run test:auth` | Testar cadastro, login, sessões, troca de senha e proteções |

Os testes de API e autenticação exigem o servidor local em execução e usam apenas localhost. Para outra porta, defina `PROSAE_TEST_URL` com o endereço local correspondente. O teste de publicação retira sua obra de teste do catálogo ao terminar.

## Hospedagem e contribuição

O GitHub guarda o código-fonte; banco, contas e uploads não são enviados junto com os commits. O **GitHub Pages não executa o backend necessário para o funcionamento completo do Prosaê**. A hospedagem atual reúne interface, Worker, D1 e R2.

Consulte [PUBLICACAO.md](PUBLICACAO.md) para as orientações de implantação em outra conta Cloudflare. Não versione senhas, tokens, arquivos de ambiente ou dados locais. Para contribuir, revise suas alterações no controle de código-fonte do VS Code, execute as verificações adequadas e envie os commits ao repositório.
