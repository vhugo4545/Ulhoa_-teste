
const produtosMapeados = new Map();
let todosProdutos = [];
const sugestoesTemp = {}; // armazenamento temporÃ¡rio por bloco

document.addEventListener('DOMContentLoaded', carregarProdutos);

async function carregarProdutos() {
  try {
    const response = await fetch('https://ulhoa-0a02024d350a.herokuapp.com/produtos/visualizar');
    todosProdutos = (await response.json()).filter(p => !p.inativo);
    produtosMapeados.clear();
    todosProdutos.forEach(produto => {
      if (produto.descricao) {
        produtosMapeados.set(produto.descricao.trim().toLowerCase(), produto);
      }
    });
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
}

function atualizarTituloAccordion(idSuffix, nome) {
  const titulo = document.getElementById(`titulo-accordion-${idSuffix}`);
  if (titulo) {
    const nomeLimpo = nome.trim();
    titulo.textContent = nomeLimpo || `ParÃ¢metros e Produtos (${idSuffix})`;
  }
}



// Inclui pelo texto digitado no input
function incluirProduto(idSuffix) {
  const termo = document.getElementById(`input-${idSuffix}`).value.trim().toLowerCase();
  if (!termo) {
    alert("Digite ao menos 3 caracteres.");
    return;
  }

  // Tenta encontrar o produto correspondente na lista de todos os produtos
  const produto = todosProdutos.find(p => (p.descricao || '').trim().toLowerCase() === termo);
  if (!produto) {
    alert("Produto nÃ£o encontrado.");
    return;
  }

  // Inclui diretamente via montagem da linha (sempre)
  montarLinhaProduto(idSuffix, produto);

  // Limpa campo de busca e sugestÃµes
  document.getElementById(`input-${idSuffix}`).value = '';
  limparSugestoes(idSuffix);
}
function removerBloco(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este grupo?");
  setTimeout(() => {
    adicionarTotalizadoresPorAmbienteComAgrupamento();
  }, 100); // ou 100m
  if (!confirmar) return;

  const bloco = document.getElementById(id);
  if (bloco) {
    bloco.remove();
  }
}

function abrirSubstituirProduto(botao) {
  const linha = botao.closest("tr");
  const idSuffix = linha?.dataset?.idSuffix;

  if (!idSuffix) {
    console.warn("âŒ ID do grupo (idSuffix) nÃ£o encontrado na linha.");
    return;
  }

  // Evita abrir mais de uma linha de substituiÃ§Ã£o
  if (linha.nextElementSibling?.classList.contains("linha-substituir")) return;

  // Cria nova linha de substituiÃ§Ã£o
  const novaLinha = document.createElement("tr");
  novaLinha.classList.add("linha-substituir");
  novaLinha.dataset.idSuffix = idSuffix;

  novaLinha.innerHTML = `
    <td colspan="9">
      <div class="position-relative">
        <div class="d-flex gap-2">
          <input type="text"
                 id="input-${idSuffix}-sub"
                 class="form-control form-control-sm"
                 placeholder="Novo produto..."
                 oninput="mostrarSugestoesSub(this, '${idSuffix}')">
          <button class="btn btn-success btn-sm" onclick="confirmarSubstituicao(this)">Confirmar</button>
          <button class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Cancelar</button>
        </div>
        <div id="sugestoes-${idSuffix}-sub"
             class="tabela-sugestoes position-absolute w-100 mt-1 bg-white border"
             style="z-index:1000;"></div>
      </div>
    </td>
  `;

  linha.parentNode.insertBefore(novaLinha, linha.nextSibling);
}

function incluirProdutoPeloIndice(idSuffix, index) {
  const lista = sugestoesTemp[idSuffix];
  if (!lista || !lista[index]) return alert("Produto nÃ£o encontrado.");
  montarLinhaProduto(idSuffix, lista[index]);
}

function montarLinhaProduto(idSuffix, produto) {
  const tabelaBody = document.querySelector(`#tabela-${idSuffix} tbody`);
  if (!tabelaBody) return;

  const linha = document.createElement("tr");
  linha.dataset.idSuffix = idSuffix;

  const descricao     = decodeHTMLEntities(produto.descricao || "");
  const utilizacao    = decodeHTMLEntities(produto.utilizacao || "Uso");
  const valorUnitario = parseFloat(produto.valor_unitario || 0).toFixed(2);
  const codigo        = produto.codigo_produto || produto.codigo || "COD";
  const unidade       = produto.unidade ||
    (window._produtosUnidadeMap && window._produtosUnidadeMap[String(codigo).trim()]) || "\u2014";

  linha.innerHTML = `
    <td>${utilizacao}</td>
    <td>${descricao}</td>
    <td class="custo-unitario" data-valor-original="${valorUnitario}">R$ ${valorUnitario}</td>
    <td class="venda-unitaria" data-valor-original="${valorUnitario}">R$ ${valorUnitario}</td>
    <td>${codigo}</td>
    <td class="unidade-medida">${unidade}</td>
    <td>
      <input type="number" class="form-control form-control-sm quantidade" value="1">
    </td>
    <td class="quantidade-desejada">
      <span class="formula-result" data-formula="" data-group-id="${idSuffix}" onclick="tornarCampoEditavel(this)">1</span>
    </td>
    <td>
      <button class="btn btn-danger btn-sm me-1" onclick="this.closest('tr').remove()">Remover</button>
      <button class="btn btn-secondary btn-sm" onclick="abrirSubstituirProduto(this)">Substituir</button>
    </td>
  `;

  tabelaBody.appendChild(linha);
}


// Limpa sugestÃµes (principal ou sub)
function limparSugestoes(idSuffix, sub=false) {
  const sel = sub ? `#sugestoes-${idSuffix}-sub` : `#sugestoes-${idSuffix}`;
  const div = document.querySelector(sel);
  if (div) div.innerHTML = "";
}

// Abre linha para substituir o produto
function abrirSubstituirProduto(botao, idSuffix) {
  const linha = botao.closest("tr");
  if (linha.nextElementSibling?.classList.contains("linha-substituir")) return;

  const novaLinha = document.createElement("tr");
  novaLinha.classList.add("linha-substituir");
  novaLinha.dataset.idSuffix = idSuffix;

  novaLinha.innerHTML = `
    <td colspan="9">
      <div class="position-relative">
        <div class="d-flex gap-2">
          <input type="text"
                 id="input-${idSuffix}-sub"
                 class="form-control form-control-sm"
                 placeholder="Novo produto..."
                 oninput="mostrarSugestoesSub(this, '${idSuffix}')">
          <button class="btn btn-success btn-sm" onclick="confirmarSubstituicao(this)">Confirmar</button>
          <button class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Cancelar</button>
        </div>
        <div id="sugestoes-${idSuffix}-sub" class="tabela-sugestoes position-absolute w-100 mt-1 bg-white border" style="z-index:1000;"></div>
      </div>
    </td>
  `;

  linha.parentNode.insertBefore(novaLinha, linha.nextSibling);
}


function substituirProdutoPeloIndice(idSuffix, index) {
  const key = `${idSuffix}-sub`;
  const lista = sugestoesTemp[key];
  if (!lista || !lista[index]) return alert("Produto nÃ£o encontrado.");

  const prod = lista[index];

  const linhaSub = document.querySelector(`tr.linha-substituir[data-id-suffix="${idSuffix}"]`);
  if (!linhaSub) return;
  const linhaOrig = linhaSub.previousElementSibling;
  if (!linhaOrig) return;

  // Elementos da linha original
  const inputQuantidade = linhaOrig.querySelector("input.quantidade");
  const celulaQtdDesejada = linhaOrig.querySelector(".quantidade-desejada");
  const inputQtdDesejada = celulaQtdDesejada?.querySelector("input");

  const tdDescricao = linhaOrig.children[1];
  const tdCusto     = linhaOrig.querySelector(".custo-unitario");
  const tdVenda     = linhaOrig.querySelector(".venda-unitaria");
  const tdCodigo    = linhaOrig.children[4];

  // Atualiza diretamente os valores visÃ­veis
  if (tdDescricao) tdDescricao.textContent = decodeHTMLEntities(prod.descricao || "");
  if (tdCusto)     tdCusto.textContent     = `R$ ${parseFloat(prod.valor_unitario || 0).toFixed(2)}`;
  if (tdVenda) {
    const valorVenda = parseFloat(prod.valor_unitario || 0).toFixed(2);
    tdVenda.textContent = `R$ ${valorVenda}`;
    tdVenda.dataset.valorOriginal = valorVenda;
  }
  if (tdCodigo) tdCodigo.textContent = prod.codigo_produto || "COD";

  const tdUnidade = linhaOrig.querySelector(".unidade-medida");
  if (tdUnidade) {
    tdUnidade.textContent = prod.unidade ||
      (window._produtosUnidadeMap && window._produtosUnidadeMap[String(prod.codigo_produto || "").trim()]) || "—";
  }

  // Zera a quantidade manual
  if (inputQuantidade) inputQuantidade.value = 0;

  // â— NÃƒO altera a cÃ©lula quantidade-desejada (mantÃ©m input + fÃ³rmula + valor)

  // Remove linha de substituiÃ§Ã£o e limpa sugestÃµes
  linhaSub.remove();
  limparSugestoes(idSuffix, true);

  const sugestaoSub = document.getElementById(`sugestoes-${idSuffix}-sub`);
  if (sugestaoSub) sugestaoSub.innerHTML = "";

  const inputSub = document.getElementById(`input-${idSuffix}-sub`);
  if (inputSub) inputSub.value = "";

  // Limpa linhas Ã³rfÃ£s
  document.querySelectorAll(".linha-substituir")?.forEach(e => e.remove());

  // Reativa blur/eval global se necessÃ¡rio
  if (typeof simularFocusEBlurEmTodosCamposFormula === "function") {
    simularFocusEBlurEmTodosCamposFormula();
  }
}



function decodeHTMLEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}




function limparFormulaHTML(f) {
  if (!f) return "";
  return f
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function confirmarSubstituicao(botao) {
   alert("funÃ§Ã£o")
  const linhaSub = botao.closest("tr");
  const idSuffix = linhaSub.dataset.idSuffix;
  const input = linhaSub.querySelector("input");
  const desc = input.value.trim().toLowerCase();
  if (!desc) return alert("Produto invÃ¡lido.");

  const prod = produtosMapeados.get(desc);
  if (!prod) return alert("Produto nÃ£o encontrado.");

  const linhaOrig = linhaSub.previousElementSibling;

  // ReferÃªncias Ã s cÃ©lulas da linha original
  const celulaQtdDesejada = linhaOrig.querySelector(".quantidade-desejada");
  const tdUtilizacao = linhaOrig.children[0];
  const tdDescricao  = linhaOrig.children[1];
  const tdCusto      = linhaOrig.querySelector(".custo-unitario");
  const tdVenda      = linhaOrig.querySelector(".venda-unitaria");
  const tdCodigo     = linhaOrig.children[4];
  const inputQtd     = linhaOrig.querySelector("input.quantidade");

  // Atualiza conteÃºdo das cÃ©lulas
  if (tdUtilizacao) tdUtilizacao.textContent = prod.utilizacao || "Uso";
  if (tdDescricao)  tdDescricao.textContent  = prod.descricao || "";

  const valor = parseFloat(prod.valor_unitario || 0).toFixed(2);

  if (tdCusto) tdCusto.textContent = `R$ ${valor}`;
  if (tdVenda) {
    tdVenda.textContent = `R$ ${valor}`;
    tdVenda.dataset.valorOriginal = valor;
  }
  if (tdCodigo) tdCodigo.textContent = prod.codigo_produto || "COD";
  if (inputQtd) inputQtd.value = 0; // Zera a quantidade manual

  // Avalia fÃ³rmula da quantidade desejada e atualiza a cÃ©lula com <span>
  let formula = "";
  if (celulaQtdDesejada) {
    const campo = celulaQtdDesejada.querySelector("input, span");
    formula = campo?.dataset?.formula || campo?.value || celulaQtdDesejada?.textContent || "";
  }

  // Prepara fÃ³rmula
  formula = formula.replace(/,/g, "."); // troca vÃ­rgulas por ponto
  if (typeof limparFormulaHTML === "function") {
    formula = limparFormulaHTML(formula);
  }

  const variaveis = typeof obterVariaveisDoGrupo === "function"
    ? obterVariaveisDoGrupo(idSuffix)
    : {};

  try {
    if (typeof evaluateFormula === "function") {
      const resultado = evaluateFormula(formula, variaveis);

     celulaQtdDesejada.innerHTML = `
  <input type="text" class="form-control form-control-sm quantidade-desejada"
         value="${resultado}" data-formula="${formula}" data-group-id="${idSuffix}">
`;

    }
  } catch (erro) {
    console.error("âŒ Erro ao avaliar fÃ³rmula:", formula, erro);
    celulaQtdDesejada.innerHTML = `<span class="text-danger">Erro</span>`;
  }

  // Remove a linha de substituiÃ§Ã£o e limpa sugestÃµes
  linhaSub.remove();
  limparSugestoes(idSuffix, true);

  // Reativa blur/focus global
  if (typeof simularFocusEBlurEmTodosCamposFormula === "function") {
    simularFocusEBlurEmTodosCamposFormula();
  }
}



function normalizarTextoRanking(texto) {
  return (texto || "")
    .replace(/&quot;/g, '"')              // Entidade para aspas
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")      // Remove acentos
    .replace(/[^a-z0-9 x\/"\-]+/g, " ")   // MantÃ©m X, /, " e hÃ­fen
    .replace(/\s+/g, " ")
    .trim();
}

function mostrarSugestoes(input, idSuffix) {
  const termoOriginal = input.value.trim();
  const termoNorm = normalizarTextoRanking(termoOriginal);

  if (termoNorm.length < 3) {
    document.getElementById(`sugestoes-${idSuffix}`).innerHTML = '';
    return;
  }

  const termos = termoNorm.split(' ').filter(Boolean);
  const container = document.getElementById(`sugestoes-${idSuffix}`);
  if (!container) return;

  // Ranking: mais compatÃ­veis vÃªm primeiro
  const resultadosPontuados = todosProdutos.map(prod => {
    const descNorm = normalizarTextoRanking(prod.descricao);

    // Peso 1: Igualdade exata do termo digitado
    const exato = descNorm === termoNorm ? 10000 : 0;
    // Peso 2: Termo completo como substring (ex: "2 x 1/2")
    const substring = descNorm.includes(termoNorm) ? 2000 : 0;
    // Peso 3: Todos os termos presentes?
    const todosPresentes = termos.every(term => descNorm.includes(term)) ? 1000 : 0;
    // Peso 4: Quantos termos batem (quanto mais, melhor)
    const termosPresentes = termos.filter(term => descNorm.includes(term)).length * 10;

    // PontuaÃ§Ã£o final
    let score = exato + substring + todosPresentes + termosPresentes;

    // Penaliza se nÃ£o tiver pelo menos metade dos termos presentes
    if (termosPresentes < termos.length * 5) score -= 5000;

    return { prod, score };
  });

  // Ordena por score decrescente (melhor primeiro)
  const resultados = resultadosPontuados
    .filter(obj => obj.score > 0) // SÃ³ resultados relevantes
    .sort((a, b) => b.score - a.score)
    .map(obj => obj.prod);

  sugestoesTemp[idSuffix] = resultados;

  container.innerHTML = resultados.length
    ? `
      <div style="max-height:340px; overflow-y:auto; border:1px solid #e0e0e0; border-radius:6px;">
        <table class="table table-sm mb-0">
          <tbody>
            ${resultados.map((prod, i) => `
              <tr>
                <td>${prod.descricao || "-"}</td>
                <td>R$ ${parseFloat(prod.valor_unitario||0).toFixed(2)}</td>
                <td><button class="btn btn-success btn-sm"
                            onclick="incluirProdutoPeloIndice('${idSuffix}', ${i})"><span class="material-icons-outlined" style="font-size:18px;vertical-align:middle;">add</span></button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`
    : `<div class="text-muted px-2">Nenhum resultado encontrado</div>`;
}

function normalizarTexto(texto) {
  return (texto || "")
    .replace(/&quot;/g, '"')                // Entidade para aspas HTML
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // Remove acentos
    .replace(/[^a-z0-9 x\/"\-]+/g, " ")     // MantÃ©m X, /, " e hÃ­fen para cÃ³digos tÃ©cnicos
    .replace(/\s+/g, " ")
    .trim();
}

function mostrarSugestoesSub(input, idSuffix) {
  const termo = input.value.trim();
  const container = document.getElementById(`sugestoes-${idSuffix}-sub`);
  if (!container) return;
  if (termo.length < 3) {
    container.innerHTML = '';
    return;
  }

  // Normaliza termo e descriÃ§Ã£o mantendo sÃ­mbolos tÃ©cnicos
  const termoNorm = normalizarTexto(termo);

  // 1. Prioriza igualdade exata
  const exatos = todosProdutos.filter(prod =>
    normalizarTexto(prod.descricao) === termoNorm
  );

  // 2. Busca por partes (cada palavra do termo aparece na descriÃ§Ã£o, incluindo sÃ­mbolos tÃ©cnicos!)
  const termos = termoNorm.split(' ').filter(Boolean);
  const similares = todosProdutos.filter(prod => {
    const descNorm = normalizarTexto(prod.descricao);
    return descNorm !== termoNorm && termos.every(term => descNorm.includes(term));
  });

  // Junta exatos + similares (aqui sem limite de 6, mostre todos se quiser)
  const resultados = [...exatos, ...similares];

  sugestoesTemp[`${idSuffix}-sub`] = resultados;

  container.innerHTML = resultados.length
    ? `<table class="table table-sm mb-0"><tbody>${
        resultados.map((prod, i) => `
          <tr onclick="substituirProdutoPeloIndice('${idSuffix}', ${i})" style="cursor:pointer">
            <td>${prod.descricao}</td>
            <td>R$ ${parseFloat(prod.valor_unitario || 0).toFixed(2)}</td>
          </tr>
        `).join("")
      }</tbody></table>`
    : `<div class="text-muted px-2">Nenhum resultado encontrado</div>`;
}









