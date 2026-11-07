# Administração do Prosaê

## Liberar a conta responsável

1. Crie uma conta normal no Prosaê e entre com seu e-mail e senha.
2. Em **Minha conta**, consulte o **Identificador da conta**. Cada ambiente tem contas próprias: use o identificador da conta de produção para a produção.
3. O responsável pela hospedagem configura `PROSAE_ADMIN_USER_ID` no ambiente do servidor com esse identificador exato e publica novamente a versão para aplicar a configuração.
4. Acesse novamente **Minha conta** ou atualize a página. A conta autorizada passa a exibir **Administração** e pode abrir `/admin` com a mesma senha pessoal.

Não existe senha compartilhada, conta administrativa padrão ou promoção pelo formulário público. Sem a variável configurada, nenhuma conta recebe essa permissão. A variável contém um único identificador; para transferir ou revogar a administração, altere ou remova seu valor na hospedagem e publique novamente. A verificação acontece a cada solicitação, inclusive nas sessões existentes.

Não use um endereço de e-mail como valor dessa variável: ela compara o identificador persistente da conta. Isso impede que um novo cadastro com um e-mail escolhido pelo visitante se torne administrador.

## O que o painel oferece

- Indicadores de contas cadastradas, obras disponíveis e obras suspensas.
- Busca por título, autor ou gênero e filtro de disponibilidade.
- Suspensão e liberação de obras com motivo obrigatório.
- Histórico das últimas 30 ações; os demais registros permanecem no banco.

A suspensão preserva os arquivos, mas bloqueia catálogo, links públicos da obra, leitura e download. O autor não consegue republicar uma obra enquanto ela estiver suspensa. A liberação remove a suspensão; uma retirada feita pelo autor permanece válida. Rascunhos privados não são exibidos no painel. Não há exclusão de contas ou leitura das estantes pessoais pela administração.

## Desenvolvimento e testes

Para usar uma conta administrativa local, configure `PROSAE_ADMIN_USER_ID` em `.dev.vars` na raiz do projeto, com o identificador de uma conta local, e reinicie o servidor. Esse arquivo é ignorado pelo Git. Nunca publique senhas ou cookies no repositório.

Após compilar e aplicar as migrações, com o servidor de desenvolvimento em execução:

```bash
npm run test:admin
```

O teste usa apenas o ambiente local e inicia um Worker descartável via Miniflare. A permissão administrativa de teste é passada somente a esse processo; não altera as permissões da produção. O teste verifica bloqueios de acesso, tentativa de promoção pelo cliente, suspensão, links diretos, republicação, liberação e histórico. Para um servidor local em outra porta, configure `PROSAE_TEST_URL`.
