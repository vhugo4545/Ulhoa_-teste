// 📦 carregarProdutosModelo.js

const searchInput = document.getElementById("searchInput");
const grupoList = document.getElementById("grupoList");
const erroMsg = document.getElementById("erroMsg");
const container = document.getElementById("included-products-container");

// Variáveis globais
window.includedProducts = window.includedProducts || [];
window.groupPopupsData = window.groupPopupsData || {};
window.parametrosPorGrupo = window.parametrosPorGrupo || {};
window.grupoNomeMap = window.grupoNomeMap || {};
window.grupoNomeOriginalMap = window.grupoNomeOriginalMap || {};

let grupos = [];

// 🔄 Carrega proposta modelo do backend
async function carregarPropostaModelo() {
   console.log("ultimo modelo:",ultimaModelo)
  const TOKEN = localStorage.getItem('accessToken');   // 🔐 JWT salvo no login
  if (!TOKEN) {
    erroMsg.textContent = 'Sessão expirada — faça login novamente.';
    console.warn('⚠️ Token ausente. Interrompendo carregamento de proposta modelo.');
    return;
  }

  try {
    const res = await fetch('https://ulhoa-0a02024d350a.herokuapp.com/api/propostas', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!res.ok) throw new Error('Erro ao buscar propostas');

    const propostas = await res.json();

    // 🔍 Encontra a última proposta do tipo "modelo"
    const ultimaModelo = [...propostas].reverse()
      .find(p => p.tipoProposta === 'modelo');

    if (!ultimaModelo || !ultimaModelo.grupos) {
      erroMsg.textContent = "Nenhuma proposta tipo 'modelo' ou grupos encontrados.";
      console.warn('❌ Nenhuma proposta válida do tipo "modelo" encontrada.');
      return;
    }

    // Torna acessível globalmente se outras funções precisarem
    window.ultimaPropostaModelo = ultimaModelo;
    console.log("ultimo modelo:",ultimaModelo)
    // Preenche grupos e renderiza
    grupos = ultimaModelo.grupos;
    console.log( ultimaModelo.grupos.id)
    renderLista();

  } catch (err) {
    erroMsg.textContent = 'Erro ao carregar dados: ' + err.message;
    console.error('❌ Erro ao carregar proposta modelo:', err);
  }
}


// 🧹 Formata nome para exibição
function formatarNome(nome) {
  return (nome || "")
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

// 📋 Renderiza lista de grupos
function renderLista(filtro = "") {
 console.log("Render");
const searchInput = document.getElementById("buscaProduto");
const grupoList = document.getElementById("sugestoesProdutos");

// Garante que a lista ocupe espaço fixo e não fique sobreposta
grupoList.style.position = "static";
grupoList.style.display = "block";
grupoList.style.width = "100%";
grupoList.style.marginTop = "0.5rem";
grupoList.style.maxHeight = "300px";
grupoList.style.overflowY = "auto";
grupoList.style.backgroundColor = "#f9f9f9";
grupoList.style.border = "1px solid #ccc";
grupoList.style.borderRadius = "4px";
grupoList.style.padding = "8px";

grupoList.innerHTML = "";
const nomesUnicos = new Set();


  grupos
    .filter(grupo => grupo.nome?.toLowerCase().includes(filtro.toLowerCase()))
    .forEach(grupo => {
      if (!nomesUnicos.has(grupo.nome)) {
        nomesUnicos.add(grupo.nome);

        const li = document.createElement("li");
        const nomeFormatado = formatarNome(grupo.nome);
        li.textContent = nomeFormatado;
        li.className = "list-group-item list-group-item-action";
        li.style.cursor = "pointer";

        li.addEventListener("click", () => {
          const grupoSelecionado = grupos.find(g => g.nome === grupo.nome);
          if (!grupoSelecionado) return;

          searchInput.value = "";
          grupoList.style.display = "none";

          criarBlocoDeProposta(nomeFormatado);

          setTimeout(() => {
            const ultimoBloco = document.querySelector("#blocosProdutosContainer .main-container:last-child");
            if (!ultimoBloco) return;

            const parametros = grupoSelecionado.parametros || {};
            const inputs = ultimoBloco.querySelectorAll(`input[name]`);
            inputs.forEach(input => {
              const param = input.name;
              if (parametros[param] !== undefined) {
                input.value = parametros[param];
              }
            });

            const tabela = ultimoBloco.querySelector(`table tbody`);
            const totalTd = ultimoBloco.querySelector(`table tfoot td[colspan="7"], table tfoot td:last-child`);
            tabela.innerHTML = "";

            let total = 0;

            (grupoSelecionado.itens || []).forEach(item => {
              const quantidadeCalculada = calcularQuantidadeDesejada(item, { groupId: ultimoBloco.id });
              const quantidadeArredondada = Math.ceil(quantidadeCalculada || item.quantidade || 1);
              const custoUnitario = parseFloat(item.custo) || 0;

              // Calcula o valor final com base na quantidade arredondada
              const valorTotal = custoUnitario * quantidadeArredondada;

              const tr = document.createElement("tr");
              tr.dataset.idSuffix = ultimoBloco.id;

              tr.innerHTML = `
 <td>
  <textarea class="form-control form-control-sm" rows="3">
${item.descricao_utilizacao|| "Utilização (Modelo)"}
  </textarea>
</td>

                <td>${item.nome_produto || item.nome || ""}</td>
                <td class="custo-unitario">R$ ${valorTotal.toFixed(2)}</td>
                <td class="venda-unitaria">R$ ${custoUnitario.toFixed(2)}</td>
                <td>${item.codigo_omie || ""}</td>
                <td>
                  <input type="number" class="form-control form-control-sm quantidade" 
                         value="${quantidadeArredondada}" min="1">
                </td>
                <td>
                  <input type="text" class="form-control form-control-sm quantidade-desejada" 
                         value="${(quantidadeCalculada )}"
                         data-formula="${item.formula_quantidade || ""}">
                </td>
                <td>
                  <button class="btn btn-sm btn-danger d-block mb-1" onclick="this.closest('tr').remove()">Remover</button>
                  <button class="btn btn-sm btn-secondary d-block" onclick="abrirSubstituirProduto(this)">Substituir</button>
                </td>`;

              tabela.appendChild(tr);
              total += valorTotal;
            });

            if (totalTd) {
              totalTd.innerHTML = `<strong>R$ ${total.toFixed(2)}</strong>`;
            }

            new Sortable(tabela, {
              animation: 100,
              handle: "td",
              ghostClass: "bg-warning-subtle"
            });

            inicializarCamposDeFormulaQuantidade(ultimoBloco, { groupId: ultimoBloco.id });

            // ⚙️ Recalcula ao carregar (se necessário)
            ativarRecalculoEmTodasTabelas();

          }, 100);
        });

        grupoList.appendChild(li);
      }
    });

  grupoList.style.display = grupoList.children.length > 0 ? "block" : "none";
 //  document.querySelectorAll('input[name="descricao"]').forEach(forcarEventosDescricao);
   
}


// ➕ Adiciona produtos e configura popup
// ➕ Adiciona produtos do grupo e pré-configura pop-up
function adicionarProdutosDoGrupo(grupo) {
  if (!grupo || typeof grupo !== "object") {
    console.error("❌ Grupo inválido:", grupo);
    return;
  }

  /* 1. ─── IDs e mapas ───────────────────────────────────── */
  const nomeVisivel = grupo.nome?.trim() || "Grupo Sem Nome";
  const idBase      = nomeVisivel.replace(/\s+/g, "-").toLowerCase();
  const usados      = includedProducts.map(p => p.grupoInterno || p.class);

  let grupoInterno = idBase, n = 1;
  while (usados.includes(grupoInterno)) {
    grupoInterno = `${idBase}-${String(n++).padStart(3, "0")}`;
  }

  grupoNomeMap[nomeVisivel]          = grupoInterno;
  grupoNomeOriginalMap[grupoInterno] = nomeVisivel;

  /* 2. ─── Parâmetros / pop-up ───────────────────────────── */
  const parametros =
    grupo.parametros && typeof grupo.parametros === "object"
      ? { ...grupo.parametros }
      : {};

  groupPopupsData[grupoInterno]    = parametros;  // fórmulas + pop-up
  parametrosPorGrupo[grupoInterno] = parametros;  // se útil em outro lugar

  /* 3. ─── Adiciona itens “crus” ─────────────────────────── */
  (grupo.itens || []).forEach((item, i) => {
    includedProducts.push({
      ...item,                               // objeto sem alterações
      descricao: item.nome_produto,          // coluna Descrição

      /* metadados internos */
      class: grupoInterno,
      grupoInterno,
      index: includedProducts.length,
      ordem: `${grupoInterno}.${i + 1}`,

      /* chaves de fórmula que o front-end já espera */
      custoFormula:            item.formula_custo      ?? String(item.custo ?? ""),
      vendaFormula:            item.formula_preco      ?? String(item.preco ?? ""),
      adjustedQuantityFormula: item.formula_quantidade ?? "",

      /* coerções para garantir números */
      cost:               Number(item.custo               ?? 0),
      price:              Number(item.preco               ?? 0),
      quantity:           Number(item.quantidade          ?? 0),
      quantidadeDesejada: Number(item.quantidade_desejada ?? 0)
    });
  });

  /* 4. ─── Renderiza tabela + cria pop-up ────────────────── */
  renderIncludedProducts({
    grupoId:   grupoInterno,
    produtos:  includedProducts.filter(p => p.class === grupoInterno),
    popup:     parametros
  });

  /* 5. ─── Preenche o pop-up assim que existir no DOM ────── */
  requestAnimationFrame(() =>
    requestAnimationFrame(() => preencherPopupCampos(grupoInterno))
  );
}

/* ─────────────────────────────────────────────────────────── *
 * Preenche inputs / selects / spans dentro do pop-up          *
 * ─────────────────────────────────────────────────────────── */
function preencherPopupCampos(grupoId) {
  const dados = groupPopupsData?.[grupoId];
  if (!dados) return;

  const popup =
    document.querySelector(`.popup-grupo[data-grupo="${grupoId}"]`) ||
    document.querySelector(`.popup-info[data-group-id="${grupoId}"]`);
  if (!popup) {
    console.warn(`⚠️ Pop-up não encontrado para grupo "${grupoId}"`);
    return;
  }

  Object.entries(dados).forEach(([chave, valor]) => {
    const campo =
      popup.querySelector(`[name="${chave}"]`)     ||
      popup.querySelector(`#${chave}`)            ||
      popup.querySelector(`[data-tag="${chave}"]`) ||
      popup.querySelector(`[data-param="${chave}"]`);
    if (!campo) return;

    if (campo.type === "checkbox" || campo.type === "radio") {
      campo.checked = Boolean(valor);
    } else if (
      campo.tagName === "INPUT" ||
      campo.tagName === "TEXTAREA" ||
      campo.tagName === "SELECT"
    ) {
      campo.value = valor;
    } else {
      campo.textContent = valor;
    }
  });
}







// 🔁 Evento de filtro
searchInput.addEventListener("input", () => renderLista(searchInput.value));

// 🚀 Carrega ao iniciar
carregarPropostaModelo();
