# Tutorial para publicar o site da Space Light na Locaweb

> Versão inicial — 1º de setembro de 2026  
> Este guia será atualizado assim que tivermos acesso ao painel e soubermos o nome exato do produto contratado.

## Objetivo

Publicar o site institucional e o portal da Space Light com:

- site público no domínio da empresa;
- acesso administrativo exclusivo da equipe Space Light;
- acesso individual dos clientes por e-mail e senha;
- cadastro de novos clientes sujeito à aprovação;
- banco de dados persistente;
- HTTPS, backups e processo seguro de atualização.

## A decisão mais importante: qual plano da Locaweb usar

O projeto não é apenas um conjunto de páginas. Ele possui login, sessões, painel administrativo, banco de dados e rotas de servidor. Por isso, não devemos publicar a versão completa apenas por FTP em uma hospedagem estática.

A documentação oficial da Locaweb ensina o deploy de aplicações Next.js SSR usando uma **máquina virtual Linux no Locaweb Cloud**, com Ubuntu 22.04 LTS ou superior. A recomendação oficial é usar ao menos **2 vCPUs e 4 GB de RAM** para evitar falhas durante a compilação.

### Opção recomendada

- Locaweb Cloud ou VPS Linux;
- Ubuntu 22.04 LTS ou superior;
- mínimo de 2 vCPUs e 4 GB de RAM;
- IP público fixo;
- acesso por chave SSH;
- Docker;
- Nginx;
- PostgreSQL;
- certificado HTTPS gratuito com Let's Encrypt.

### Se o produto contratado for “Hospedagem de Sites”, “Hospedagem WordPress” ou apenas FTP

Não envie o projeto ainda. Esses produtos são adequados para arquivos estáticos, PHP ou WordPress, mas o nosso portal precisa de um processo de servidor sempre ativo.

Nesse caso teremos duas escolhas:

1. contratar uma VM Locaweb Cloud/VPS para hospedar todo o sistema; ou
2. manter a aplicação em outra plataforma e usar a Locaweb apenas para domínio e e-mail.

### Mensagem pronta para o suporte da Locaweb

Copie e envie esta pergunta ao suporte antes de contratar ou configurar o servidor:

> Preciso hospedar uma aplicação Next.js com renderização no servidor, Node.js 22, autenticação própria, rotas de API, PostgreSQL, Docker, Nginx e armazenamento privado de arquivos. O plano contratado oferece VM Linux com acesso root ou sudo, IP público fixo, chave SSH, portas 80 e 443 e processo Node.js sempre ativo? Qual produto da Locaweb é indicado?

Referência oficial: [Deploy de aplicações Next.js SSR no Locaweb Cloud](https://www.locaweb.com.br/ajuda/wiki/deploy-de-aplicacoes-next-js-e-nuxt-js-ssr-no-locaweb-cloud/).

---

## Visão geral do processo

1. Confirmar o produto correto na Locaweb.
2. Criar a máquina virtual Linux.
3. Configurar acesso seguro, rede e firewall.
4. Criar um endereço de homologação.
5. Adaptar o projeto para o ambiente da Locaweb.
6. Criar o banco PostgreSQL.
7. Configurar as senhas e variáveis privadas.
8. Publicar primeiro em homologação.
9. Testar todos os acessos.
10. Apontar o domínio principal.
11. Ativar HTTPS e backups.
12. Configurar atualizações automáticas.

---

## Etapa 1 — Obter os acessos necessários

Você precisará ter acesso a:

- [ ] Central do Cliente Locaweb;
- [ ] painel Locaweb Cloud ou painel do VPS;
- [ ] painel onde o domínio `spacelightengenharia.com.br` é administrado;
- [ ] e-mail que recebe os códigos de verificação da Locaweb;
- [ ] conta GitHub da Space Light, caso adotemos publicação automática;
- [ ] responsável autorizado a aprovar alterações de DNS.

### Regras de segurança

- Ative a autenticação em dois fatores na conta Locaweb.
- Não envie senha da Locaweb, chave privada ou senha do banco em mensagens comuns.
- Se a Locaweb permitir usuários adicionais, crie um acesso técnico separado.
- Cada pessoa deve usar sua própria conta administrativa.
- Nunca coloque senhas dentro do código ou do repositório GitHub.

### Informações que você deve anotar no painel

Não anote senhas neste documento. Registre apenas:

- nome exato do produto contratado;
- sistema operacional disponível;
- quantidade de vCPUs;
- memória RAM;
- endereço IP público;
- situação do domínio;
- local onde o DNS é administrado;
- existência de backup contratado;
- disponibilidade de PostgreSQL ou de um disco de dados.

---

## Etapa 2 — Criar a máquina virtual

No painel Locaweb Cloud/VPS:

1. Entre em **Computação** ou **Servidores**.
2. Escolha a criação de uma nova VM/servidor.
3. Use um nome claro, como `space-light-producao`.
4. Selecione **Ubuntu 22.04 LTS ou superior**.
5. Escolha no mínimo **2 vCPUs e 4 GB de RAM**.
6. Use autenticação por **chave pública SSH**.
7. Associe a VM a uma rede isolada ou VPC.
8. Aloque e associe um IP público fixo.
9. Aguarde a instalação ficar com status ativo.

A Locaweb informa que a instalação de um servidor pode levar algumas horas. Veja: [instalar ou reinstalar um servidor VPS](https://www.locaweb.com.br/ajuda/wiki/como-instalar-e-reinstalar-um-servidor-vps-locaweb/).

### Chave SSH

A chave SSH possui duas partes:

- **chave pública:** pode ser cadastrada na Locaweb;
- **chave privada:** fica somente no computador autorizado e nunca deve ser compartilhada.

Quando retomarmos o trabalho, eu posso orientar a geração da chave no seu computador e confirmar o cadastro sem expor a parte privada.

---

## Etapa 3 — Configurar rede e firewall

No IP público da VM, configure encaminhamento e firewall:

| Serviço | Porta | Quem pode acessar | Uso |
|---|---:|---|---|
| SSH | 22 | somente o IP administrativo | manutenção do servidor |
| HTTP | 80 | público | redirecionamento para HTTPS |
| HTTPS | 443 | público | acesso ao site |
| Aplicação | 3000 | apenas internamente | comunicação entre Nginx e o site |
| PostgreSQL | 5432 | nunca publicar | banco de dados privado |

### Cuidados

- A porta 22 deve ficar restrita ao IP do responsável técnico sempre que possível.
- A porta 3000 não deve ficar aberta permanentemente para a internet.
- A porta 5432 do PostgreSQL não deve receber encaminhamento público.
- Apenas 80 e 443 devem ficar abertas para visitantes.

A documentação oficial explica o IP público, encaminhamento de portas e firewall no [tutorial de Next.js da Locaweb Cloud](https://www.locaweb.com.br/ajuda/wiki/deploy-de-aplicacoes-next-js-e-nuxt-js-ssr-no-locaweb-cloud/).

---

## Etapa 4 — Criar o endereço de homologação

Não devemos trocar o domínio principal antes de testar o sistema completo.

Primeiro criaremos:

`homologacao.spacelightengenharia.com.br`

No painel de DNS:

1. Abra a zona DNS do domínio.
2. Crie um registro do tipo **A**.
3. No nome/host, informe `homologacao`.
4. No destino/valor, informe o IP público da VM.
5. Salve a alteração.
6. Aguarde a propagação.

### Atenção ao e-mail da empresa

Não altere registros MX, SPF, DKIM ou DMARC. Eles controlam o e-mail corporativo.

Também não troque todos os servidores DNS sem antes registrar a configuração atual. A própria Locaweb alerta que alterações de DNS podem interromper outros serviços. Veja: [configuração de zona DNS](https://www.locaweb.com.br/ajuda/wiki/como-configurar-a-zona-dns-de-dominios-fora-da-locaweb-hospedagem-de-sites/).

---

## Etapa 5 — Adaptações que farei no projeto

O projeto atual foi preparado inicialmente para a infraestrutura Cloudflare/OpenAI Sites. Antes de funcionar na Locaweb, eu precisarei adaptar:

- o modo de compilação para uma aplicação Node.js compatível com a VM;
- o banco Cloudflare D1/SQLite para PostgreSQL;
- as consultas e migrações do banco;
- o armazenamento de fotos, documentos e certificados;
- as variáveis privadas de produção;
- o processo de criação da conta administrativa;
- o sistema de logs e auditoria;
- o empacotamento em Docker;
- a configuração do Nginx;
- o processo de backup e restauração;
- o deploy automático ou manual.

### O que você não precisará fazer

Você não precisará editar arquivos do projeto, escrever comandos do banco, criar as tabelas manualmente ou alterar o código de autenticação. Eu cuidarei dessas partes depois que soubermos qual ambiente a Locaweb disponibilizou.

---

## Etapa 6 — Criar o banco de dados

Usaremos PostgreSQL para armazenar:

- contas da equipe Space Light;
- contas dos clientes;
- empresas cadastradas;
- treinamentos;
- participantes;
- documentos e fotos;
- lotes de certificados;
- registros de auditoria.

### Alternativa A — PostgreSQL gerenciado

Se o produto da Locaweb oferecer PostgreSQL gerenciado:

1. Abra **Banco de dados** no painel.
2. Escolha **Criar banco de dados**.
3. Selecione PostgreSQL.
4. Defina uma senha longa e exclusiva.
5. Guarde em um gerenciador de senhas:
   - hostname;
   - porta;
   - nome do banco;
   - usuário;
   - senha.
6. Restrinja o acesso ao IP privado/público da aplicação, conforme o produto permitir.

A Locaweb informa que o banco pode levar até uma hora para ser disponibilizado. Veja: [instalar banco de dados na Locaweb](https://www.locaweb.com.br/ajuda/wiki/como-instalar-um-banco-de-dados-hospedagem-de-sites/).

### Alternativa B — PostgreSQL dentro da VM

Se não houver banco gerenciado, criaremos o PostgreSQL em um contêiner Docker privado, com:

- volume persistente separado;
- porta 5432 sem exposição pública;
- backup diário;
- senha exclusiva;
- teste periódico de restauração.

A escolha entre A e B será feita após vermos o plano contratado.

---

## Etapa 7 — Arquivos, fotos e certificados

O banco guarda os dados dos arquivos, mas as fotos e PDFs precisam de armazenamento próprio.

Antes da publicação escolheremos uma destas opções:

1. armazenamento de objetos compatível com S3; ou
2. disco de dados anexado à VM, com backup externo.

Para a primeira versão com baixo volume, um disco separado pode funcionar. Para crescimento, armazenamento de objetos é mais seguro e escalável.

Nenhum arquivo de cliente deve ficar em uma pasta pública sem controle de acesso. O download deverá passar pela autenticação do portal.

---

## Etapa 8 — Configurar as variáveis privadas

O servidor receberá variáveis como estas, sem salvar os valores no GitHub:

```text
DATABASE_URL
AUTH_SESSION_SECRET
SPACE_ADMIN_EMAIL
SPACE_ADMIN_PASSWORD_HASH
SPACE_ADMIN_PASSWORD_SALT
APP_URL
UPLOADS_PATH ou dados do armazenamento de objetos
```

### Conta administrativa inicial

Criaremos uma conta da equipe Space Light com:

- e-mail administrativo definido pela empresa;
- senha temporária forte;
- troca obrigatória no primeiro acesso;
- permissão administrativa;
- sessão protegida por cookie seguro.

Os clientes continuarão usando o mesmo endereço de login. O sistema identifica o tipo da conta e envia:

- funcionário da Space Light para `/empresa`;
- cliente aprovado para `/cliente`.

---

## Etapa 9 — Preparar a aplicação no servidor

O método recomendado será Docker porque ele mantém as dependências e a versão do Node.js iguais em toda publicação.

O servidor terá:

- Docker e Docker Compose;
- contêiner da aplicação;
- contêiner PostgreSQL, somente se não houver banco gerenciado;
- Nginx como porta de entrada;
- diretório persistente para arquivos, se necessário;
- rotina de backup;
- logs com rotação.

### Fluxo interno

```text
Internet → HTTPS/Nginx → aplicação na porta 3000 → PostgreSQL privado
                                      └────────→ armazenamento privado
```

O visitante nunca acessará diretamente o banco ou a porta interna da aplicação.

---

## Etapa 10 — Primeira publicação em homologação

Na primeira publicação faremos manualmente, para confirmar cada etapa:

1. enviar o código ao servidor por conexão segura;
2. instalar ou construir os contêineres;
3. executar as migrações do banco;
4. criar a conta administrativa inicial;
5. iniciar a aplicação;
6. verificar os logs;
7. testar a resposta interna na porta 3000;
8. configurar o Nginx;
9. abrir `homologacao.spacelightengenharia.com.br`;
10. executar todos os testes do portal.

Depois que a primeira publicação funcionar, poderemos automatizar as próximas pelo GitHub Actions. A Locaweb documenta tanto Docker/GitHub Actions quanto o método manual no [guia oficial de Next.js SSR](https://www.locaweb.com.br/ajuda/wiki/deploy-de-aplicacoes-next-js-e-nuxt-js-ssr-no-locaweb-cloud/).

---

## Etapa 11 — Configurar Nginx e HTTPS

O Nginx receberá o domínio público e encaminhará as solicitações para a aplicação na porta interna 3000.

Depois do DNS funcionar:

1. instalar Nginx;
2. configurar o domínio de homologação;
3. encaminhar as solicitações para `127.0.0.1:3000`;
4. validar a configuração;
5. instalar Certbot;
6. emitir certificado Let's Encrypt;
7. ativar redirecionamento automático de HTTP para HTTPS;
8. testar a renovação do certificado.

A Locaweb fornece o passo a passo de Nginx e Certbot no [tutorial de aplicações SSR](https://www.locaweb.com.br/ajuda/wiki/deploy-de-aplicacoes-next-js-e-nuxt-js-ssr-no-locaweb-cloud/).

---

## Etapa 12 — Checklist de testes antes de abrir ao público

### Site institucional

- [ ] página inicial abre em HTTPS;
- [ ] imagens carregam corretamente;
- [ ] menus e botões funcionam;
- [ ] WhatsApp abre com a mensagem correta;
- [ ] versão para celular está correta;
- [ ] título e imagem de compartilhamento estão corretos.

### Segurança

- [ ] porta 5432 não responde publicamente;
- [ ] porta 3000 não fica pública após a homologação;
- [ ] páginas administrativas exigem login;
- [ ] cliente não consegue abrir `/empresa`;
- [ ] funcionário não usa conta de cliente;
- [ ] sessão expira corretamente;
- [ ] logout elimina a sessão;
- [ ] HTTPS está ativo em todas as páginas;
- [ ] senhas não aparecem em logs ou no código.

### Acesso da equipe Space Light

- [ ] funcionário entra pela tela de login;
- [ ] conta administrativa vai para `/empresa`;
- [ ] primeiro acesso exige nova senha;
- [ ] funcionário cadastra um cliente;
- [ ] sistema gera senha temporária;
- [ ] senha temporária aparece apenas uma vez;
- [ ] cliente criado pela Space consegue entrar.

### Cadastro feito pelo cliente

- [ ] cliente abre `/cliente/cadastro`;
- [ ] envia dados da empresa;
- [ ] recebe confirmação de cadastro pendente;
- [ ] não consegue entrar antes da aprovação;
- [ ] equipe vê o cadastro pendente;
- [ ] equipe aprova o acesso;
- [ ] cliente aprovado consegue entrar.

### Dados e documentos

- [ ] criação de treinamento fica salva no banco;
- [ ] QR Code leva ao treinamento correto;
- [ ] participante consegue se cadastrar;
- [ ] arquivos ficam vinculados ao cliente correto;
- [ ] cliente só vê documentos da própria empresa;
- [ ] backup inclui banco e arquivos.

---

## Etapa 13 — Trocar para o domínio principal

Somente depois da homologação aprovada:

1. faça um backup completo;
2. registre os valores atuais do DNS;
3. reduza o TTL com antecedência, se possível;
4. altere o registro A do domínio principal para o IP da VM;
5. configure também o `www`;
6. emita o certificado para o domínio principal;
7. teste site, login, cadastro e WhatsApp;
8. monitore os logs nas primeiras horas;
9. preserve a versão anterior até confirmar a estabilidade.

Não altere registros de e-mail durante essa troca.

---

## Etapa 14 — Backups e recuperação

Precisaremos de três proteções diferentes:

1. **backup do PostgreSQL:** diário;
2. **backup dos arquivos enviados:** diário;
3. **snapshot da VM antes de atualizações importantes:** sob demanda.

Um snapshot ajuda a desfazer uma atualização, mas não substitui um backup externo. A própria Locaweb explica essa diferença em [snapshots recorrentes](https://www.locaweb.com.br/ajuda/wiki/como-agendar-a-criacao-de-snapshots-recorrentes-locaweb-cloud/) e oferece orientação para [backup de Cloud Server/VPS](https://www.locaweb.com.br/ajuda/wiki/backup-de-servidor-cloud-server-pro-vps/).

### Rotina recomendada

- banco: backup diário com retenção de 7 a 30 dias;
- arquivos: cópia diária para local diferente da VM;
- VM: snapshot antes de cada publicação importante;
- restauração: teste trimestral;
- responsável: uma pessoa deve receber alertas de falha.

---

## Etapa 15 — Como serão feitas as atualizações futuras

Depois da primeira publicação, o processo ideal será:

1. alteração desenvolvida e testada localmente;
2. envio para o repositório privado;
3. cópia de segurança antes da publicação;
4. build automático;
5. atualização da aplicação;
6. migração do banco, quando necessária;
7. verificação de saúde;
8. retorno automático ou manual à versão anterior se houver erro.

As credenciais serão guardadas como segredos do ambiente, nunca dentro do arquivo de automação. A documentação da Locaweb também orienta o uso de secrets no GitHub.

---

## Problemas comuns

### O site institucional abre, mas o login não funciona

Provável causa: foi enviada apenas uma versão estática por FTP. O portal precisa da aplicação Node.js e do banco ativos.

### Erro 502 Bad Gateway

O Nginx está ativo, mas a aplicação não está respondendo na porta interna 3000. Devemos verificar o contêiner e os logs.

### Erro ao conectar ao banco

Verificar hostname, usuário, senha, rede privada e variável `DATABASE_URL`. Não abrir a porta 5432 publicamente para corrigir o problema.

### Certificado HTTPS não é emitido

Confirmar se o DNS já aponta para a VM e se as portas 80 e 443 estão abertas.

### Build encerra por falta de memória

Confirmar que a VM possui ao menos 4 GB de RAM. A documentação oficial também sugere swap para falhas de memória, mas o ideal é dimensionar a VM corretamente.

### E-mails pararam depois da troca de DNS

Provável alteração indevida em MX, SPF, DKIM, DMARC ou servidores DNS. Restaurar os valores registrados antes da mudança.

---

## O que preciso receber quando você obtiver o acesso

Envie apenas estas informações, sem senhas:

- [ ] nome exato do produto contratado;
- [ ] uma imagem da tela inicial do painel, ocultando informações sensíveis;
- [ ] sistema operacional disponível;
- [ ] quantidade de CPU e RAM;
- [ ] confirmação de acesso root ou sudo;
- [ ] confirmação de chave SSH;
- [ ] existência de IP público fixo;
- [ ] existência de PostgreSQL gerenciado;
- [ ] existência de disco de dados ou armazenamento de objetos;
- [ ] onde o DNS do domínio é administrado;
- [ ] qual e-mail será o administrador inicial do portal.

Com isso, eu atualizarei este tutorial com os nomes exatos dos menus do seu plano e continuarei a adaptação do site.

---

## Resumo rápido para você

1. Não envie o projeto por FTP.
2. Confirme se possui Locaweb Cloud/VPS Linux.
3. Use Ubuntu 22.04 ou superior, 2 vCPUs e 4 GB de RAM no mínimo.
4. Use chave SSH e IP público fixo.
5. Crie primeiro o subdomínio de homologação.
6. Não altere os registros de e-mail.
7. Envie apenas as informações do plano, nunca as senhas.
8. Eu farei a migração técnica, o banco, a segurança e a publicação.

## Fontes oficiais da Locaweb

- [Deploy de aplicações Next.js e Nuxt.js SSR no Locaweb Cloud](https://www.locaweb.com.br/ajuda/wiki/deploy-de-aplicacoes-next-js-e-nuxt-js-ssr-no-locaweb-cloud/)
- [Como instalar ou reinstalar um servidor VPS](https://www.locaweb.com.br/ajuda/wiki/como-instalar-e-reinstalar-um-servidor-vps-locaweb/)
- [Como configurar a zona DNS](https://www.locaweb.com.br/ajuda/wiki/como-configurar-a-zona-dns-de-dominios-fora-da-locaweb-hospedagem-de-sites/)
- [Como instalar um banco de dados](https://www.locaweb.com.br/ajuda/wiki/como-instalar-um-banco-de-dados-hospedagem-de-sites/)
- [Como configurar regras de firewall](https://www.locaweb.com.br/ajuda/wiki/como-configurar-regras-de-firewall/)
- [Como fazer backup de Cloud Server/VPS](https://www.locaweb.com.br/ajuda/wiki/backup-de-servidor-cloud-server-pro-vps/)
- [Como agendar snapshots recorrentes](https://www.locaweb.com.br/ajuda/wiki/como-agendar-a-criacao-de-snapshots-recorrentes-locaweb-cloud/)
