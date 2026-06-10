# Guia de implementação — Pedidos de reagendamento com data proposta pelo cliente

## Visão geral do sistema

O sistema permite que um cliente solicite o reagendamento de uma visita de manutenção já agendada, informando uma data que seria viável para ele. O planejador revisa o pedido com a data do cliente já pré-selecionada nos campos de aprovação, podendo aceitá-la diretamente ou escolher outra data. Ao recusar, o planejador também pode sugerir uma data alternativa ao cliente.

---

## Camadas do sistema

O sistema envolve quatro camadas que devem ser alteradas de forma coordenada:

- **Banco de dados** — armazena a data sugerida pelo cliente e, opcionalmente, a data alternativa proposta pelo planejador ao recusar.
- **API backend** — recebe, persiste e retorna esses campos; valida as regras de negócio.
- **Contrato OpenAPI** — define os schemas de entrada e saída para que o cliente HTTP e as validações permaneçam em sincronia.
- **Frontend** — o formulário do cliente ganha um seletor de data; a tela do planejador exibe o destaque da data sugerida e pré-preenche os campos.

---

## Banco de dados

### Tabela de pedidos de reagendamento

Adicione duas colunas novas à tabela existente de pedidos:

**`suggested_date`** — texto simples no formato `AAAA-MM-DD`. Preenchida pelo cliente ao abrir o pedido. Pode ser nula (o campo não é obrigatório para o cliente). Não armazena horário, apenas a data.

**`counter_suggested_date`** — texto simples no mesmo formato `AAAA-MM-DD`. Preenchida pelo planejador somente quando ele recusa o pedido e quer propor outro dia ao cliente. Também nula por padrão.

As colunas devem ser adicionadas de forma segura para não quebrar registros existentes. Use `ADD COLUMN IF NOT EXISTS` para garantir idempotência.

---

## API backend

### Endpoint de criação do pedido (`POST /reschedule-requests`)

Aceite o campo opcional `suggestedDate` no corpo da requisição. O formato esperado é `AAAA-MM-DD`. Salve o valor na coluna correspondente do banco. Se o campo não vier na requisição, armazene nulo.

### Endpoint de recusa do pedido (`POST /reschedule-requests/:id/reject`)

Aceite o campo opcional `counterSuggestedDate` no corpo da requisição. O formato esperado é `AAAA-MM-DD`. Se o planejador informar uma data alternativa, salve-a na coluna do banco junto com o motivo de recusa já existente.

### Resposta de listagem e consulta por evento

Inclua os dois novos campos (`suggestedDate` e `counterSuggestedDate`) em todas as respostas que retornam pedidos — tanto na listagem completa do planejador quanto na consulta por evento do cliente. Quando o campo não tiver valor, retorne `null`.

Para o cliente, a resposta por evento já deve ser filtrada (sem expor o nome de quem pediu, por exemplo) — mantenha essa lógica e apenas acrescente os dois campos.

### Regras de negócio

- `suggestedDate` é enviado apenas pelo cliente e apenas no momento da criação. Nunca deve ser alterado depois.
- `counterSuggestedDate` é enviado apenas pelo planejador e apenas no momento da recusa. Um pedido aprovado não deve ter esse campo preenchido.
- Nenhum dos dois campos é obrigatório. O sistema deve funcionar normalmente mesmo que o cliente não informe uma data preferida.

---

## Contrato OpenAPI

### Schema do pedido de reagendamento (`RescheduleRequest`)

Adicione os dois campos ao schema de resposta:

- `suggestedDate`: string nullable, descrição: "Data no formato AAAA-MM-DD sugerida pelo cliente como opção viável para a visita."
- `counterSuggestedDate`: string nullable, descrição: "Data no formato AAAA-MM-DD proposta pelo planejador ao recusar o pedido."

Como ambos são opcionais e podem ser nulos, não devem ser incluídos na lista de campos obrigatórios do schema.

### Schema de criação do pedido (`CreateRescheduleRequest`)

Adicione o campo opcional `suggestedDate` como string nullable, com a mesma descrição acima.

### Schema de recusa do pedido (`RejectRescheduleRequest`)

Adicione o campo opcional `counterSuggestedDate` como string nullable.

Após atualizar o contrato, regenere os clientes e validadores a partir da spec para manter o frontend e o backend em sincronia.

---

## Frontend — fluxo do cliente (formulário de solicitação)

O formulário onde o cliente abre um pedido de reagendamento deve receber um novo campo entre o campo "Seu nome" e o campo "Motivo do pedido".

### Campo "Data preferida para o reagendamento"

- Tipo: seletor de data nativo (`date`), sem horário.
- Rótulo: "Data preferida para o reagendamento".
- Texto de apoio abaixo do campo: "Escolha uma data viável para a visita. O planejador pode ajustar conforme a disponibilidade."
- O campo deve aceitar apenas datas a partir do dia de hoje (bloquear datas passadas).
- O campo **não é obrigatório** — o cliente pode enviar o pedido sem informar uma data preferida.
- Quando há um pedido pendente para o mesmo evento (estado de bloqueio), o campo fica desabilitado junto com os demais.
- O valor do campo, quando preenchido, é enviado ao backend como `suggestedDate` no formato `AAAA-MM-DD`.

### Aviso no estado "pedido pendente"

Quando já existe um pedido pendente e o campo `suggestedDate` tem valor, exiba esse dado no aviso amarelo de "Já existe um pedido pendente", formatando a data por extenso em português. Exemplo: "Data sugerida: 27 de outubro de 2025".

### Aviso no estado "pedido recusado" com data alternativa

Quando o planejador recusou o pedido e informou um `counterSuggestedDate`, exiba essa informação no aviso vermelho de "Último pedido recusado". Formate a data por extenso e acrescente uma frase como "O planejador sugeriu outra data: 5 de novembro de 2025".

---

## Frontend — fluxo do planejador (tela de revisão)

A tela onde o planejador revisa os pedidos pendentes deve ser atualizada para:

### Destaque da data sugerida pelo cliente

Quando o pedido tiver `suggestedDate` preenchido, exiba um painel de destaque azul claro logo acima dos campos de data, com ícone de calendário e o texto "Data sugerida pelo cliente: [data por extenso em português]". Este painel é apenas informativo — não é clicável.

### Pré-preenchimento dos campos de nova data

Os campos de "Novo início" e "Novo fim" devem ser inicializados da seguinte forma:

- Se o pedido tiver `suggestedDate`: combine essa data com o **horário atual do evento** (horário de início para o campo de início, horário de fim para o campo de fim). O planejador verá a data do cliente mas com o horário que o evento já tem — evitando que ele precise digitar o horário do zero.
- Se o pedido não tiver `suggestedDate`: pré-preencha com a data e horário atuais do evento, como já ocorre hoje.

O planejador pode alterar livremente qualquer valor antes de aprovar.

### Campo de data alternativa na recusa

Na seção de recusa do pedido, adicione um novo campo opcional antes do campo de motivo:

- Tipo: seletor de data nativo (`date`), sem horário.
- Rótulo: "Data alternativa sugerida (opcional)".
- Texto de apoio: "Se quiser propor outro dia ao cliente, selecione uma data aqui."
- O campo aceita apenas datas a partir de hoje.
- Não é obrigatório — o planejador pode recusar sem sugerir outra data.
- O valor, quando preenchido, é enviado ao backend como `counterSuggestedDate` no formato `AAAA-MM-DD`.

---

## Critérios de aceitação

- O cliente consegue abrir um pedido sem informar data preferida — o comportamento atual não é quebrado.
- Quando o cliente informa uma data preferida, ela é salva e exibida na revisão do planejador.
- Os campos de nova data na aprovação são pré-preenchidos com a data do cliente (mantendo o horário original do evento) quando `suggestedDate` está presente.
- O planejador pode alterar qualquer data antes de aprovar, sem restrição.
- O planejador pode recusar sem sugerir data alternativa — apenas com motivo de texto.
- Quando o planejador recusa e informa uma data alternativa, ela é salva e exibida para o cliente no aviso de pedido recusado.
- Datas passadas são bloqueadas nos dois seletores de data (tanto no formulário do cliente quanto no campo de alternativa do planejador).
- Todos os campos novos são opcionais — nenhum deles impede o envio ou a aprovação/recusa se estiver vazio.
- A data sugerida pelo cliente nunca aparece editável para o planejador — é apenas lida e usada como base para o pré-preenchimento.
- A data alternativa do planejador nunca aparece editável pelo cliente — é apenas exibida no aviso de recusa.
- O sistema de notificação (Teams, e-mail ou equivalente) deve incluir a data sugerida ao notificar o planejador de um novo pedido, e a data alternativa ao notificar o cliente de uma recusa.




