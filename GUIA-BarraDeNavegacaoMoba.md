# Prompt — Barra de navegação inferior (mobile)

## Objetivo

Recrie a barra de navegação inferior do app na versão mobile, exibida apenas em telas pequenas (oculta no desktop). A barra fica fixa no rodapé da tela e contém os atalhos principais de navegação. O item ativo é destacado por uma "bolha" verde arredondada que desliza horizontalmente até a posição do item selecionado.

A barra segue o visual da imagem de referência: fundo cinza claro, ícone + rótulo em cada item, item ativo com fundo verde em formato de cápsula, ícones e textos brancos quando ativos e cinza quando inativos. Um item pode exibir um selo vermelho de notificação com um número.

---

## Container da barra

- Visível somente no mobile (oculta a partir de 768px de largura).
- Posicionada no rodapé, ocupando toda a largura da tela.
- Fundo cinza muito claro (aproximadamente `#F2F2F2`).
- Cantos superiores arredondados (raio grande, estilo `rounded-t-2xl`).
- Sombra suave projetada para cima, dando a sensação de que a barra flutua sobre o conteúdo.
- Espaçamento interno: pequeno padding horizontal e vertical, com um pouco mais de respiro na base para acomodar a área segura do celular.

---

## Distribuição dos itens

- Os itens dividem a largura da barra em partes iguais. Se houver 4 itens, cada um ocupa 25% da largura; se houver 5, cada um ocupa 20%, e assim por diante.
- Cada item é um botão em coluna: ícone em cima, rótulo embaixo, ambos centralizados.
- O rótulo aparece em caixa alta, fonte pequena, peso semibold e leve espaçamento entre letras.

Os itens variam conforme o papel do usuário, mas o layout e o comportamento são sempre os mesmos. Exemplos de itens: Labs, Remarc., Inventário, Perfil.

---

## A bolha verde do item ativo

- Uma cápsula totalmente arredondada que fica atrás do ícone e do rótulo do item ativo.
- Ocupa a largura de um item (a mesma fração calculada acima) e a altura total da área dos itens.
- Preenchimento em degradê diagonal de verde: começa em um verde médio vivo, passa por um verde acinzentado no meio e termina em um verde bem escuro quase grafite. Direção do degradê a 135 graus.
- Sombra verde suave por baixo, reforçando o destaque.
- A bolha não recebe cliques (fica como camada decorativa atrás dos botões).

### Animação de deslize

- Quando o usuário troca de aba, a bolha **desliza horizontalmente** da posição anterior até a nova posição.
- A transição é apenas na propriedade de movimento horizontal, com duração longa e suave (cerca de 800ms, com curva de aceleração suave no início).
- Se nenhum item corresponder à rota atual, a bolha fica oculta.
- Em rotas de fluxo que não têm item próprio na barra (por exemplo, criar ou editar um evento), a bolha deve permanecer ancorada no item principal (Labs) para não desaparecer da tela.

---

## Ícones e rótulos

- Ícone com tamanho médio (cerca de 20px).
- Quando o item está ativo: ícone e rótulo na cor branca.
- Quando inativo: ícone e rótulo em cinza médio (aproximadamente `#9E9E9E`).
- A mudança de cor entre ativo e inativo é animada com uma transição curta e suave (cerca de 220ms).

### Animação de "pop" no ícone ativo

Quando um item se torna ativo, o conjunto ícone + rótulo executa uma pequena animação de salto, em sequência:

1. Começa no tamanho normal.
2. Cresce um pouco e sobe levemente (pico de ampliação por volta de 28% maior, subindo 3px).
3. Encolhe ligeiramente abaixo do normal.
4. Faz um pequeno overshoot para cima de novo.
5. Volta ao tamanho e posição normais.

A duração total é curta (cerca de 420ms) e usa uma curva elástica (com leve ultrapassagem antes de assentar). A animação dispara toda vez que o item passa a ser o ativo.

---

## Selo de notificação

- Alguns itens podem exibir um selo vermelho no canto superior direito do ícone.
- O selo é um círculo vermelho com número branco em fonte muito pequena e em negrito.
- Posicionado levemente para fora do ícone (sobreposto ao canto superior direito).
- Se o número for maior que 9, exibir "9+".
- O selo só aparece quando a contagem for maior que zero.

---

## Comportamento de clique

- Ao tocar em um item, navegar para a rota correspondente.
- A bolha verde desliza até o item tocado e a animação de pop dispara no novo ícone ativo.
- O item ativo é determinado comparando a rota atual com o destino de cada item.

---

## Resumo de cores

| Elemento | Cor |
|----------|-----|
| Fundo da barra | cinza muito claro (~`#F2F2F2`) |
| Bolha ativa | degradê verde 135° (verde vivo → verde acinzentado → verde escuro) |
| Ícone/rótulo ativo | branco |
| Ícone/rótulo inativo | cinza médio (~`#9E9E9E`) |
| Selo de notificação | vermelho com texto branco |

---

## Critério de aceitação

- A barra aparece somente no mobile e fica fixa no rodapé com cantos superiores arredondados e sombra para cima.
- Os itens dividem a largura igualmente, cada um com ícone em cima e rótulo em caixa alta embaixo.
- O item ativo tem a cápsula verde em degradê atrás dele, com ícone e rótulo brancos.
- Ao trocar de aba, a cápsula desliza suavemente até a nova posição.
- O ícone do novo item ativo executa a animação de pop elástico.
- Itens inativos ficam em cinza e mudam de cor suavemente ao serem ativados.
- O selo vermelho de notificação aparece sobre o ícone correto quando há pendências, exibindo o número (ou "9+").
- Em rotas sem item próprio, a cápsula permanece ancorada no item principal.
