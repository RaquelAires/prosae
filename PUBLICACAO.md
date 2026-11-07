# Publicação do Prosaê

## Por que o GitHub Pages fica em branco?

O projeto usa Vue 3 + Vite com um backend Cloudflare Worker. O frontend consulta `/api/catalog`, `/api/authors` e `/api/me`; o GitHub Pages não executa esse backend. A configuração atual do Vite também não é uma publicação estática configurada para o subdiretório `/prosae/`.

## Hospedagem recomendada

Publique frontend e backend juntos no **Cloudflare Workers**, usando os assets gerados pelo build. O código já tem `@cloudflare/vite-plugin` e `wrangler.jsonc`.

1. Crie uma conta Cloudflare e autorize a implantação do projeto.
2. Crie o banco D1 e o bucket R2 na conta.
3. Substitua em `wrangler.jsonc` o `database_id` de exemplo `00000000-0000-4000-8000-000000000000` pelo ID real do D1; atualize `database_name` e `bucket_name` para os recursos criados.
4. **Antes de expor o projeto à internet, substitua o login herdado da plataforma de origem.** Atualmente `server/identity.ts` confia nos cabeçalhos `oai-authenticated-*`, que não constituem autenticação segura em uma implantação pública sem um proxy confiável que remova cabeçalhos fornecidos pelo cliente e injete identidade validada. Use um provedor de identidade com sessões verificadas no servidor, e adapte as rotas de entrada/saída.
5. Aplique as migrações do diretório `drizzle` ao D1, conferindo o banco de destino.
6. No projeto, execute `npm ci`, `npm run typecheck`, `npm run build` e, após configurar os recursos e autenticação, `npx wrangler deploy`.
7. Verifique as rotas `/api/catalog`, `/api/authors`, `/api/me`, login, publicação, upload e leitura no endereço fornecido pela Cloudflare.

Não coloque tokens, chaves de API nem segredos de sessão no GitHub. Use as configurações de segredos da Cloudflare.

## Verificação automática

O workflow `.github/workflows/check.yml` executa `npm ci` e `npm run build` no GitHub Actions. Essa checagem não implanta o site e não substitui testes de integração.

## GitHub Pages

Se a URL `https://raquelaires.github.io/prosae/` continuar exibindo a versão incompleta, desative Pages em **Settings → Pages**. O domínio de produção recomendado será o da Cloudflare ou um domínio personalizado apontando para ela.
