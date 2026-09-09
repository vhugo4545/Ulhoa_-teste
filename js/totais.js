// =========================
// UTILITÁRIOS
// =========================
function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .toLowerCase();
}

function normalizarNomeAmbiente(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatarNomeAmbiente(texto) {
  const valor = String(texto || "").trim();
  if (!valor) return "Ambiente não identificado";

  return valor
    .toLowerCase()
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

function formatarMoedaBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/**
 * Converte texto monetário/numérico em número,
 * aceitando tanto pt-BR quanto formato com ponto decimal.
 *
 * Exemplos aceitos:
 * "20.550,42" => 20550.42
 * "20550.42"  => 20550.42
 * "20550,42"  => 20550.42
 * "R$ 20.550,42" => 20550.42
 * "15%" => 15
 */
function parseNumeroFlex(valor) {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return isNaN(valor) ? 0 : valor;

  let texto = String(valor).trim();
  if (!texto) return 0;

  texto = texto.replace(/\s/g, "").replace("R$", "").replace("%", "");

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");

  // Caso 1: tem ponto e vírgula => formato BR clássico: 20.550,42
  if (temVirgula && temPonto) {
    texto = texto.replace(/\./g, "").replace(",", ".");
    return parseFloat(texto) || 0;
  }

  // Caso 2: só vírgula => pode ser decimal BR: 20550,42
  if (temVirgula && !temPonto) {
    texto = texto.replace(",", ".");
    return parseFloat(texto) || 0;
  }

  // Caso 3: só ponto => assume ponto decimal normal: 20550.42
  return parseFloat(texto) || 0;
}

function parsePercentualFlex(valor) {
  return parseNumeroFlex(valor) / 100;
}


// =========================
// CÁLCULO FINANCEIRO POR BLOCO
// =========================
function calcularValoresFinanceirosDiretoDaTabela(blocoId) {
  const bloco = document.getElementById(blocoId);
  if (!bloco) return null;

  const buscarValorDoInput = (nome) => {
    const input = bloco.querySelector(`input[name='${nome}']`);
    if (!input) return 0;
    return parsePercentualFlex(input.value);
  };

  const buscarCustoMaterial = () => {
    const input = bloco.querySelector(`input[name='custoTotalMaterial']`);
    if (!input) return 0;
    return parseNumeroFlex(input.value);
  };

  const impostos = buscarValorDoInput("impostos");
  const margemLucro = buscarValorDoInput("margem_lucro");
  const gastosTotais = buscarValorDoInput("gasto_operacional");
  const negociacao = buscarValorDoInput("margem_negociacao");
  const miudezas = buscarValorDoInput("miudezas");
  const comissaoArquiteta = buscarValorDoInput("comissao_arquiteta");
  const margemSeguranca = buscarValorDoInput("margem_seguranca");
  const custoTotalMaterialInput = buscarCustoMaterial();

  const tabela = bloco.querySelector("table");
  if (!tabela) return null;

  let materialBase = 0;

  tabela.querySelectorAll("tbody tr").forEach(linha => {
    const texto = linha.querySelector(".custo-unitario")?.textContent || "0";
    const valor = parseNumeroFlex(texto);
    materialBase += valor;
  });

  const custoMaterialBaseCalculado = materialBase;
  const custoMaterial = custoMaterialBaseCalculado * (1 + miudezas);

  const divisor = 1 - (gastosTotais + margemLucro + impostos);
  if (divisor <= 0) return null;

  const precoMinimo =
    (custoMaterial / divisor) * (1 + comissaoArquiteta + margemSeguranca);

  const precoSugerido = precoMinimo * (1 + negociacao);

  const campoVAlorSegurancaDesperdicio =
    precoMinimo - precoMinimo / (1 + comissaoArquiteta + margemSeguranca);

  const campoValorGastosOperacionais =
    (precoMinimo - campoVAlorSegurancaDesperdicio) * gastosTotais;

  const campoValorImpostos = impostos * precoMinimo;

  const somaValores =
    campoValorImpostos +
    custoMaterial +
    campoValorGastosOperacionais;

  const campoValorMargemLucro =
    (precoMinimo - somaValores) - campoVAlorSegurancaDesperdicio;

  const campoValorMiudezas =
    custoMaterial - custoMaterial / (1 + miudezas);

  const campoNegociacao = precoSugerido - precoMinimo;

  const valorMargemSeguranca =
    (
      custoMaterial +
      campoValorGastosOperacionais +
      campoValorMargemLucro +
      campoValorImpostos
    ) * margemSeguranca;

  const valorComissaoArquiteta =
    (
      custoMaterial +
      campoValorGastosOperacionais +
      campoValorMargemLucro +
      campoValorImpostos
    ) * comissaoArquiteta;

  console.log("➡️ materialBase:", materialBase);
  console.log("➡️ custoMaterial:", custoMaterial);
  console.log("➡️ precoMinimo:", precoMinimo);
  console.log("➡️ precoSugerido:", precoSugerido);

  return {
    campoValorGastosOperacionais,
    campoValorMargemLucro,
    campoValorImpostos,
    campoValorMinimo: precoMinimo,
    campoVAlorSegurancaDesperdicio,
    campoValorMiudezas,
    campoNegociacao,
    campoValorFinal: precoSugerido,
    comissao_arquiteta: valorComissaoArquiteta,
    margem_seguranca: valorMargemSeguranca,
    custoTotalMaterial: custoTotalMaterialInput || custoMaterial
  };
}


// =========================
// HTML DO TOTALIZADOR
// =========================
function gerarHtmlTotalizador(nomeAmbiente, valores) {
  const base = Number(valores.campoValorMinimo) || 1;
  function pct(v) { return `${((Number(v||0)/base)*100).toFixed(1)}%`; }

  const comissaoArquiteta  = Number(valores.comissao_arquiteta) || 0;
  const custoTotalMaterial = Number(valores.custoTotalMaterial) || 0;
  const margemSeguranca    = Number(valores.margem_seguranca) || 0;
  const campoNegociacao    = Number(valores.campoNegociacao) || 0;

  const col = (label, value, badge, extra = '') => `
    <div class="col">
      <div class="tot-card${extra ? ' ' + extra : ''}">
        <div class="text-muted small tot-label">${label}</div>
        <div class="fw-bold tot-value">${value}</div>
        <div class="text-secondary small">${badge}</div>
      </div>
    </div>`;

  return `
    <div class="row text-center gx-3 gy-3">
      ${col('Miudezas',            formatarMoedaBR(valores.campoValorMiudezas),           pct(valores.campoValorMiudezas))}
      ${col('Gastos Operacionais', formatarMoedaBR(valores.campoValorGastosOperacionais), pct(valores.campoValorGastosOperacionais))}
      ${col('Impostos',            formatarMoedaBR(valores.campoValorImpostos),           pct(valores.campoValorImpostos))}
      ${col('Mg. Segurança',       formatarMoedaBR(margemSeguranca),                     pct(margemSeguranca))}
      ${col('Comissão Arquiteta',  formatarMoedaBR(comissaoArquiteta),                   pct(comissaoArquiteta))}
      ${col('Negociação',          formatarMoedaBR(campoNegociacao),                     pct(campoNegociacao))}
      ${col('Custo Material',      formatarMoedaBR(custoTotalMaterial),                  '—')}
      ${col('Valor Mínimo',        formatarMoedaBR(valores.campoValorMinimo),            '100%',                        'tot-card--min')}
      ${col('Valor Sugerido',      formatarMoedaBR(valores.campoValorFinal),             pct(valores.campoValorFinal),  'tot-card--key')}
      ${col('Margem de Lucro',     formatarMoedaBR(valores.campoValorMargemLucro),       pct(valores.campoValorMargemLucro))}
    </div>`;
}


// =========================
// SOMA DE VALORES
// =========================
function somarValores(lista) {
  const total = {
    campoValorGastosOperacionais: 0,
    campoValorMargemLucro: 0,
    campoValorImpostos: 0,
    campoValorMinimo: 0,
    campoVAlorSegurancaDesperdicio: 0,
    campoValorMiudezas: 0,
    campoNegociacao: 0,
    campoValorFinal: 0,
    comissao_arquiteta: 0,
    custoTotalMaterial: 0,
    margem_seguranca: 0,
    campoValorMargemSeguranca: 0
  };

  lista.forEach(v => {
    for (const chave in total) {
      total[chave] += Number(v?.[chave]) || 0;
    }
  });

  return total;
}


// =========================
// TOTALIZADORES POR AMBIENTE
// =========================
function adicionarTotalizadoresPorAmbienteComAgrupamento() {
  const blocos = document.querySelectorAll("[id^='bloco-']");
  const mapaAmbientes = {};

  blocos.forEach(bloco => {
    const blocoId = bloco.id;
    const valores = calcularValoresFinanceirosDiretoDaTabela(blocoId);
    if (!valores) return;

    const inputAmbiente = document.querySelector(
      `input[placeholder='Ambiente'][data-id-grupo='${blocoId}']`
    );

    const nomeDigitado = inputAmbiente?.value?.trim() || "Ambiente não identificado";
    const chaveAmbiente = normalizarNomeAmbiente(nomeDigitado);
    const nomeExibicao = formatarNomeAmbiente(nomeDigitado);

    if (!mapaAmbientes[chaveAmbiente]) {
      mapaAmbientes[chaveAmbiente] = {
        nomeExibicao,
        valores: []
      };
    }

    mapaAmbientes[chaveAmbiente].valores.push(valores);

    bloco.querySelectorAll(".resumo-totalizador-interno").forEach(el => el.remove());

    const divInterna = document.createElement("div");
    divInterna.className = "resumo-totalizador resumo-totalizador-interno tot-bloco-interno mt-3";
    divInterna.innerHTML = `
      <div class="tot-bloco-nome mb-3">Resumo: ${nomeExibicao}</div>
      ${gerarHtmlTotalizador(nomeExibicao, valores)}
    `;

    bloco.appendChild(divInterna);
  });

  const _descontoSalvo = document.getElementById("campoDescontoFinal")?.value || "";
  document.querySelectorAll("#totalizadoresExternosPorAmbiente").forEach(e => e.remove());

  const containerResumo = document.createElement("div");
  containerResumo.id = "totalizadoresExternosPorAmbiente";
  containerResumo.className = "tot-secao mt-5";
  containerResumo.innerHTML = `
    <div class="tot-secao-titulo">
      <span class="material-icons-outlined">summarize</span>
      Totais Consolidados por Ambiente
    </div>`;

  const checkboxes = {};

  for (const chaveAmbiente in mapaAmbientes) {
    const grupo = mapaAmbientes[chaveAmbiente];
    const ambiente = grupo.nomeExibicao;
    const ambienteId = `amb-${slugify(chaveAmbiente)}`;
    const valoresSomados = somarValores(grupo.valores);

    const divResumo = document.createElement("div");
    divResumo.className = "tot-bloco mb-3";
    divResumo.innerHTML = `
      <div class="tot-bloco-header">
        <span class="tot-bloco-nome">${ambiente}</span>
        <label class="tot-toggle-label">
          <input
            class="form-check-input ambiente-toggle"
            type="checkbox"
            id="toggle-${ambienteId}"
            checked
            data-ambiente="${ambienteId}"
          >
          Incluir no total
        </label>
      </div>
      ${gerarHtmlTotalizador(ambiente, valoresSomados)}
    `;

    containerResumo.appendChild(divResumo);
    checkboxes[ambienteId] = valoresSomados;
  }

  const listaAmbientes = Object.values(checkboxes);
  if (listaAmbientes.length) {
    const valoresGerais = somarValores(listaAmbientes);

    const blocoGeral = document.createElement("div");
    blocoGeral.className = "tot-bloco tot-bloco--total mb-3";
    blocoGeral.innerHTML = `
      <div class="tot-bloco-header">
        <span class="tot-bloco-nome">Total da Proposta</span>
        <span class="tot-bloco-badge">Soma de todos os ambientes</span>
      </div>
      ${gerarHtmlTotalizador("Proposta", valoresGerais)}
    `;

    containerResumo.appendChild(blocoGeral);
  }

  const inputDesconto = document.createElement("input");
  inputDesconto.type = "text";
  inputDesconto.className = "form-control tot-desconto-input text-center";
  inputDesconto.placeholder = "Desconto (R$ ou %)";
  inputDesconto.id = "campoDescontoFinal";
  inputDesconto.value = _descontoSalvo;

  const final = document.createElement("div");
  final.className = "tot-valor-final-box mb-5";
  final.innerHTML = `
    <div class="tot-desconto-wrap">
      <label class="tot-desconto-label">Desconto</label>
    </div>
    <div class="tot-valor-final-label">Valor Final do Pedido</div>
    <div class="fw-bold tot-valor-final-number" id="valorFinalTotal">R$ 0,00</div>
  `;
  final.querySelector(".tot-desconto-wrap").appendChild(inputDesconto);
  containerResumo.appendChild(final);

  const finalValor = final.querySelector("#valorFinalTotal");

  const calcularTotalFinal = () => {
    let total = 0;

    for (const checkbox of containerResumo.querySelectorAll(".ambiente-toggle")) {
      if (checkbox.checked) {
        const ambienteId = checkbox.dataset.ambiente;
        total += Number(checkboxes[ambienteId]?.campoValorFinal) || 0;
      }
    }

    const desconto = inputDesconto.value.trim();

    if (desconto.endsWith("%")) {
      const percentual = parsePercentualFlex(desconto);
      if (!isNaN(percentual)) total -= total * percentual;
    } else if (desconto) {
      const valor = parseNumeroFlex(desconto);
      if (!isNaN(valor)) total -= valor;
    }

    if (total < 0) total = 0;

    finalValor.textContent = total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

    if (typeof atualizarValoresParcelas === "function") {
      atualizarValoresParcelas();
    }
  };

  inputDesconto.addEventListener("input", calcularTotalFinal);

  // Máscara de moeda BR ao sair do campo (se não for %)
  inputDesconto.addEventListener("blur", () => {
    const raw = inputDesconto.value.trim();
    if (!raw || raw.endsWith("%")) return;
    const num = parseNumeroFlex(raw);
    if (!isNaN(num) && num > 0) {
      inputDesconto.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  });

  // Limpa formatação ao focar para facilitar edição
  inputDesconto.addEventListener("focus", () => {
    const raw = inputDesconto.value.trim();
    if (!raw || raw.endsWith("%")) return;
    const num = parseNumeroFlex(raw);
    if (!isNaN(num) && num > 0) {
      inputDesconto.value = String(num).replace(".", ",");
    }
  });
  containerResumo.querySelectorAll(".ambiente-toggle").forEach(cb => {
    cb.addEventListener("change", calcularTotalFinal);
  });

  calcularTotalFinal();
  enumerarGruposVisualmente();
  const form = document.querySelector("#novoOrcamentoForm");
  (form || document.body).appendChild(containerResumo);
}


// =========================
// MONITORAR MUDANÇAS NOS AMBIENTES
// =========================
function monitorarMudancasAmbientes() {
  document.addEventListener("input", (e) => {
    if (e.target.matches("input[placeholder='Ambiente'][data-id-grupo]")) {
      clearTimeout(window.__timeoutAmbienteTotalizador);
      window.__timeoutAmbienteTotalizador = setTimeout(() => {
        adicionarTotalizadoresPorAmbienteComAgrupamento();
      }, 300);
    }
  });
}


// =========================
// ATUALIZAR PARCELAS
// =========================
function atualizarValoresDasParcelas() {
  setTimeout(() => {
    const textoTotal =
      document.querySelector("#valorFinalTotal")?.textContent?.trim() || "R$ 0,00";

    const total = parseNumeroFlex(textoTotal);

    const linhas = document.querySelectorAll("#listaParcelas .parcela-row");
    const totalParcelasSpan = document.getElementById("totalParcelas");

    if (linhas.length === 0) {
      if (totalParcelasSpan) {
        totalParcelasSpan.textContent = formatarMoedaBR(total);
      }
      return;
    }

    const valorPorParcela = total / linhas.length;
    let soma = 0;

    linhas.forEach(() => {
      soma += valorPorParcela;
    });

    if (totalParcelasSpan) {
      totalParcelasSpan.textContent = formatarMoedaBR(soma);
    }
  }, 500);
}

function enumerarGruposVisualmente() {
  setTimeout(() => {
    const container = document.getElementById("blocosProdutosContainer");
    if (!container) {
      console.warn("⚠️ Container #blocosProdutosContainer não encontrado.");
      return;
    }

    const blocos = container.querySelectorAll(".main-container");

    if (!blocos.length) {
      console.warn("⚠️ Nenhum grupo encontrado para enumerar.");
      return;
    }

    blocos.forEach((bloco, index) => {
      const numeroGrupo = index + 1;

      // remove linha visual antiga, se já existir
      const linhaAntiga = bloco.querySelector(":scope > .numero-visual-grupo");
      if (linhaAntiga) linhaAntiga.remove();

      // tenta pegar o nome real do grupo apenas para exibição
      const tituloSpan = bloco.querySelector('span[id^="titulo-accordion-"]');
      const tituloInput = bloco.querySelector(".input-editar-nome-grupo");

      let nomeGrupo = "";

      if (tituloInput && tituloInput.value) {
        nomeGrupo = tituloInput.value.trim();
      } else if (tituloSpan && tituloSpan.textContent) {
        nomeGrupo = tituloSpan.textContent.trim();
      }

      // remove numeração antiga caso já exista no texto visual
      nomeGrupo = nomeGrupo
        .replace(/^\d+\s*[-.–]\s*/, "")
        .replace(/^Grupo\s+\d+\s*[-.–]\s*/i, "")
        .trim();

      // cria linha visual separada
      const linhaNumero = document.createElement("div");
      linhaNumero.className = "numero-visual-grupo";
      linhaNumero.setAttribute("data-grupo-index", numeroGrupo);

      linhaNumero.style.marginBottom = "8px";
      linhaNumero.style.padding = "8px 12px";
      linhaNumero.style.background = "#f8f9fa";
      linhaNumero.style.border = "1px solid #dee2e6";
      linhaNumero.style.borderRadius = "8px";
      linhaNumero.style.fontSize = "14px";
      linhaNumero.style.fontWeight = "700";
      linhaNumero.style.color = "#212529";

      linhaNumero.textContent = nomeGrupo
        ? `Produto: ${numeroGrupo} - ${nomeGrupo}`
        : `Produto ${numeroGrupo}`;

      // insere acima de todo o bloco, sem alterar nada do grupo salvo
      bloco.insertBefore(linhaNumero, bloco.firstChild);
    });

    console.log(`✅ ${blocos.length} grupo(s) enumerado(s) visualmente com sucesso.`);
  }, 2000);
}
// =========================
// INICIALIZAÇÃO
// =========================
document.addEventListener("DOMContentLoaded", () => {
  adicionarTotalizadoresPorAmbienteComAgrupamento();
  monitorarMudancasAmbientes();
 
});
