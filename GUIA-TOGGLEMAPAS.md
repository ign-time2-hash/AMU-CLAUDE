# Prompt — Botões de alternância Mapa / Cards na Visão Geral

## Objetivo

Implemente os botões de alternância da página Visão Geral (`/overview`). O header da página deve conter dois grupos de pills: um para selecionar o cenpes ativo (Cenpes 1 ou Cenpes 2) e outro para alternar entre a visualização de mapa e de cards.

---

## Estado da página

Crie três variáveis de estado:

- Uma para o slug do mapa ativo, com valor padrão `cenpes-2`.
- Uma para o modo de visualização, podendo ser `map` ou `cards`, com valor padrão `map`.
- Um hook que detecta se a tela é desktop (largura mínima de 768px), ouvindo mudanças de viewport em tempo real.

Calcule um modo efetivo: no mobile, se o mapa ativo não tiver uma imagem 2D disponível, o modo efetivo é sempre `cards` independente do estado. No desktop e no mobile com imagem 2D disponível, o modo efetivo segue o estado normal.

---

## Estrutura do header

O header da página deve ter duas colunas. Na esquerda, o título "Visão Geral" e um subtítulo "Selecione um setor para ver os laboratórios". Na direita, os grupos de botões alinhados. Em desktop as colunas ficam lado a lado. Em mobile empilham verticalmente.

A área dos botões usa layout em linha com quebra automática de linha (`flex-wrap`) para que no mobile os grupos desçam para a próxima linha sem criar scroll horizontal.

---

## Grupo 1 — Seletor de cenpes

Exiba este grupo somente quando houver mais de um mapa retornado pela API. Os mapas são carregados de `GET /api/mapas`.

O grupo é uma pílula arredondada com fundo levemente acinzentado e sombra interna. Dentro dela, um botão por mapa disponível.

Cada botão exibe o ícone ou logotipo do cenpes correspondente (importe como asset estático). O cenpes ativo tem fundo branco com sombra suave e texto na cor primária. O inativo tem texto acinzentado sem fundo, e ao passar o mouse fica com texto escuro.

Ao clicar em um cenpes, atualize o slug ativo e feche qualquer popover de setor que esteja aberto. O modo (mapa/cards) não é resetado ao trocar de cenpes.

---

## Grupo 2 — Alternância Mapa / Cards

Exiba este grupo no desktop sempre. No mobile, exiba somente quando o mapa ativo tiver uma imagem 2D disponível para renderizar.

O grupo tem o mesmo visual de pílula arredondada com fundo acinzentado. Dentro, dois botões: "Mapa" com ícone de mapa e "Cards" com ícone de grade.

O botão ativo tem fundo branco, sombra suave e texto na cor primária. O inativo tem texto acinzentado e ao passar o mouse fica com texto escuro.

Ao clicar em "Mapa" ou "Cards", atualize o modo e feche qualquer popover aberto. Se o usuário trocar para "Cards", desative também o modo de edição de marcadores, caso esteja ativo.

---

## Grupo 3 — Botões de edição de marcadores

Exiba este grupo apenas para usuários com papel `planejador` e apenas quando o modo efetivo for "Mapa".

Quando o modo de edição estiver desativado, mostre um botão "Reposicionar" com ícone de mover. Ele tem borda, fundo branco e texto acinzentado. Ao clicar, ativa o modo de edição.

Quando o modo de edição estiver ativo, mostre um botão "Concluir" com ícone de check, em fundo primário e texto branco. Ao clicar, desativa o modo de edição.

Se houver coordenadas de marcadores salvas no banco para o mapa ativo, exiba também um botão "Restaurar padrão" com ícone de desfazer. Ele tem o mesmo visual do botão "Reposicionar" (borda, fundo branco, texto acinzentado). Ao clicar, apaga as coordenadas salvas e volta para as posições estáticas padrão de cada setor.

---

## Visibilidade por papel e dispositivo

Para o papel `cliente` e `tecnico_externo`, o Grupo 3 deve ser completamente oculto. Os grupos 1 e 2 são visíveis para todos os papéis.

No mobile sem imagem 2D disponível para o mapa ativo, o Grupo 2 fica oculto e o conteúdo abaixo exibe sempre os cards. O Grupo 1 permanece visível para trocar de cenpes.

---

## Comportamento ao trocar de cenpes

Ao selecionar outro cenpes, feche popover de setor aberto, desative o modo de edição e mantenha o modo de visualização (mapa ou cards) inalterado. Os marcadores no mapa devem reposicionar para as coordenadas do novo cenpes.

---

## Design visual dos pills — resumo

Todos os grupos de pills compartilham o mesmo container: arredondado, fundo levemente acinzentado, padding interno pequeno, sombra interna suave. Os botões dentro dos grupos têm bordas totalmente arredondadas, tamanho de texto pequeno e texto em negrito semibold. A transição de cor ao clicar ou ao passar o mouse deve ser suave (200ms).

---

## Acessibilidade

O container de cada grupo deve ter `role="tablist"` e um `aria-label` descritivo. Cada botão dentro do grupo deve ter `role="tab"` e `aria-selected` refletindo o estado ativo. Os ícones são decorativos e não precisam de texto alternativo.

Os botões do Grupo 3 são ações, não abas — não usam `role="tab"`.

---

## Critério de aceitação

- Ao carregar a página, o Cenpes 2 e o modo Mapa estão selecionados por padrão.
- Clicar em Cenpes 1 troca o mapa e reposiciona os marcadores sem resetar o modo.
- Clicar em Cards esconde o mapa e exibe o grid de laboratórios.
- Clicar em Mapa volta para a imagem 3D com marcadores.
- No mobile sem imagem 2D, o grid de cards aparece diretamente sem opção de trocar para mapa.
- O botão "Reposicionar" aparece só para planejador no modo mapa.
- O botão "Restaurar padrão" aparece só quando há coordenadas salvas no banco.
- Ao trocar de cenpes, o modo de edição desativa automaticamente.
- Ao clicar em Cards, o modo de edição desativa automaticamente.
- Em mobile, os grupos de botões quebram para nova linha sem overflow horizontal.
