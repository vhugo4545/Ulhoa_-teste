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
  function pct(v) { return `${((Number(v||0)/base)*100).toFixed(2)}%`; }

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
      ${col('Negociação',          formatarMoedaBR(campoNegociacao),                     valores.campoValorFinal > 0 ? ((campoNegociacao / valores.campoValorFinal) * 100).toFixed(2) + '%' : '—')}
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
    if (!valores) {
      bloco.querySelectorAll(".resumo-totalizador-interno").forEach(el => el.remove());
      return;
    }

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
    let totalMinimo = 0;

    for (const checkbox of containerResumo.querySelectorAll(".ambiente-toggle")) {
      if (checkbox.checked) {
        const ambienteId = checkbox.dataset.ambiente;
        total       += Number(checkboxes[ambienteId]?.campoValorFinal)   || 0;
        totalMinimo += Number(checkboxes[ambienteId]?.campoValorMinimo)  || 0;
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

    // Aviso se desconto leva abaixo do valor mínimo
    let avisoEl = final.querySelector(".tot-aviso-minimo");
    const abaixoMinimo = desconto && totalMinimo > 0 && total < totalMinimo;
    finalValor.style.color = abaixoMinimo ? "#dc2626" : "";
    if (abaixoMinimo) {
      if (!avisoEl) {
        avisoEl = document.createElement("div");
        avisoEl.className = "tot-aviso-minimo";
        avisoEl.style.cssText = "display:flex;justify-content:center;margin-top:12px;";
        final.appendChild(avisoEl);
      }
      const _isAdmin   = (localStorage.getItem("usuarioTipo") || "") === "admin";
      const _solic     = window._solicitacoesAprovacaoMinimo || [];
      const _aprovada  = _solic.find(s => s.status === "aprovado");
      const _pendente  = _solic.find(s => s.status === "pendente");

      const _fmtBRL = n => (n||0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      let _btnHtml = "";

      if (_isAdmin) {
        // Gestor: dropdown com solicitações pendentes ou status atual
        if (_aprovada) {
          const _dt = new Date(_aprovada.dataAprovacao).toLocaleString("pt-BR");
          _btnHtml = `<div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:6px 14px;margin-top:8px;font-size:12px;color:#166534;font-weight:600;">
            <span class="material-icons-outlined" style="font-size:15px;">check_circle</span>
            Aprovado por ${_aprovada.aprovador} · ${_dt}
          </div>`;
        } else if (_pendente) {
          const _dt = new Date(_pendente.dataHora).toLocaleString("pt-BR");
          _btnHtml = `
            <div style="position:relative;display:inline-block;margin-top:8px;" id="_apmin_drop_wrap">
              <button onclick="_apminToggleDrop()" style="display:inline-flex;align-items:center;gap:6px;background:#f59e0b;color:#fff;border:none;border-radius:10px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">
                <span class="material-icons-outlined" style="font-size:15px;">pending_actions</span>
                Pendente · ${_dt}
                <span class="material-icons-outlined" style="font-size:14px;">expand_more</span>
              </button>
              <div id="_apmin_drop" style="display:none;position:absolute;left:50%;transform:translateX(-50%);top:calc(100% + 6px);background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);padding:16px;min-width:280px;z-index:1000;text-align:left;">
                <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">👤 <strong>${_pendente.solicitante || "—"}</strong></div>
                <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">🕐 ${_dt}</div>
                <div style="display:flex;gap:12px;font-size:13px;margin-bottom:12px;">
                  <span>Final: <strong style="color:#dc2626;">${_fmtBRL(_pendente.valorFinal)}</strong></span>
                  <span>Mín: <strong>${_fmtBRL(_pendente.valorMinimo)}</strong></span>
                </div>
                <div style="display:flex;gap:8px;">
                  <button onclick="_apminResolver('${_pendente._id}','aprovado')" style="flex:1;padding:8px 0;border:none;border-radius:8px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✓ Aprovar</button>
                  <button onclick="_apminResolver('${_pendente._id}','negado')"  style="flex:1;padding:8px 0;border:none;border-radius:8px;background:#ef4444;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">✗ Negar</button>
                </div>
              </div>
            </div>`;
        }
        // Se não há pendente nem aprovado, gestor não vê botão (só o badge vermelho)
      } else {
        // Usuário normal
        if (_aprovada) {
          const _dt = new Date(_aprovada.dataAprovacao).toLocaleString("pt-BR");
          _btnHtml = `<div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:6px 14px;margin-top:8px;font-size:12px;color:#166534;font-weight:600;">
            <span class="material-icons-outlined" style="font-size:15px;">check_circle</span>
            Aprovado por ${_aprovada.aprovador} · ${_dt}
          </div>`;
        } else if (_pendente) {
          const _dt = new Date(_pendente.dataHora).toLocaleString("pt-BR");
          _btnHtml = `<div style="display:inline-flex;align-items:center;gap:6px;background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:6px 14px;margin-top:8px;font-size:12px;color:#92400e;font-weight:600;">
            <span class="material-icons-outlined" style="font-size:15px;">hourglass_top</span>
            Aguardando aprovação · solicitado ${_dt}
          </div>`;
        } else {
          _btnHtml = `<button onclick="_solicitarAprovacaoMinimo(${total}, ${totalMinimo})"
            style="display:inline-flex;align-items:center;gap:6px;background:#1e40af;color:#fff;border:none;border-radius:10px;padding:7px 16px;margin-top:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">
            <span class="material-icons-outlined" style="font-size:15px;">approval</span>
            Solicitar aprovação
          </button>`;
        }
      }

      avisoEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:8px 16px;box-shadow:0 1px 4px rgba(220,38,38,.10);">
            <span class="material-icons-outlined" style="font-size:17px;color:#dc2626;">warning</span>
            <span style="font-size:12px;font-weight:700;color:#b91c1c;letter-spacing:0.02em;text-transform:uppercase;">Abaixo do mínimo</span>
            <span style="width:1px;height:14px;background:#fca5a5;display:inline-block;"></span>
            <span style="font-size:12px;font-weight:600;color:#dc2626;">${totalMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
          ${_btnHtml}
        </div>`;
    } else if (avisoEl) {
      avisoEl.remove();
    }

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
  const CAMPOS_FINANCEIROS = [
    "margem_lucro", "impostos", "gasto_operacional",
    "margem_negociacao", "margem_seguranca", "comissao_arquiteta", "miudezas"
  ];

  document.addEventListener("input", (e) => {
    const nome = e.target.name;
    const ehAmbiente = e.target.matches("input[placeholder='Ambiente'][data-id-grupo]");
    const ehFinanceiro = CAMPOS_FINANCEIROS.includes(nome);

    if (ehAmbiente || ehFinanceiro) {
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

// ── Solicitação de aprovação para valor abaixo do mínimo ──────────────────────
window._solicitacoesAprovacaoMinimo = window._solicitacoesAprovacaoMinimo || [];

async function _solicitarAprovacaoMinimo(valorFinal, valorMinimo) {
  const nome = localStorage.getItem("usuarioNome") || "Usuário";
  const email = localStorage.getItem("usuarioEmail") || "";
  const fmtBRL = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const confirmou = await new Promise(resolve => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',system-ui,sans-serif;";
    ov.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:28px 28px 22px;width:min(420px,92vw);box-shadow:0 16px 48px rgba(0,0,0,.22);">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">Solicitar aprovação de desconto</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.5;">
          O valor final <strong style="color:#dc2626;">${fmtBRL(valorFinal)}</strong> está abaixo do mínimo <strong>${fmtBRL(valorMinimo)}</strong>.<br>
          O gestor receberá uma notificação para aprovar ou negar este desconto.
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:20px;">Solicitante: <strong>${nome}</strong></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="_am_cancel" style="padding:9px 20px;border:1px solid #e2e8f0;border-radius:8px;background:#f1f5f9;font-family:inherit;font-size:13px;font-weight:600;color:#475569;cursor:pointer;">Cancelar</button>
          <button id="_am_ok" style="padding:9px 20px;border:none;border-radius:8px;background:#1e40af;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Enviar solicitação</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById("_am_cancel").onclick = () => { document.body.removeChild(ov); resolve(false); };
    document.getElementById("_am_ok").onclick     = () => { document.body.removeChild(ov); resolve(true); };
  });
  if (!confirmou) return;

  const nova = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    solicitante: nome,
    email,
    dataHora: new Date().toISOString(),
    valorFinal,
    valorMinimo,
    status: "pendente"
  };

  // Salva na coleção dedicada e obtém o _id
  const id = new URLSearchParams(location.search).get("id");
  if (id) {
    const token = localStorage.getItem("accessToken") || "";
    const proposta = window.propostaAtual || window.propostaEmEdicao || {};
    const resp = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/api/aprovacoes-minimo", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        propostaId:      id,
        numeroProposta:  proposta.numeroProposta || proposta.camposFormulario?.numeroOrcamento || "",
        nomeCliente:     proposta.camposFormulario?.clientes?.[0]?.nome_razao_social || "",
        solicitante:     nova.solicitante,
        email:           nova.email,
        valorFinal,
        valorMinimo
      })
    }).catch(() => null);
    if (resp?.ok) {
      const doc = await resp.json();
      nova.id = doc._id;
    }
  }
  window._solicitacoesAprovacaoMinimo = [...window._solicitacoesAprovacaoMinimo, nova];

  // Re-renderiza os totais para atualizar o badge
  if (typeof adicionarTotalizadoresPorAmbienteComAgrupamento === "function") {
    adicionarTotalizadoresPorAmbienteComAgrupamento();
  }
}

// ── Dropdown do gestor ────────────────────────────────────────────────────────
window._apminToggleDrop = function() {
  const d = document.getElementById("_apmin_drop");
  if (!d) return;
  const isOpen = d.style.display !== "none";
  d.style.display = isOpen ? "none" : "block";
  if (!isOpen) {
    // Fecha ao clicar fora
    setTimeout(() => {
      document.addEventListener("click", function _close(e) {
        const wrap = document.getElementById("_apmin_drop_wrap");
        if (!wrap || !wrap.contains(e.target)) {
          const dd = document.getElementById("_apmin_drop");
          if (dd) dd.style.display = "none";
          document.removeEventListener("click", _close);
        }
      });
    }, 0);
  }
};

window._apminResolver = async function(aprovacaoId, novoStatus) {
  const token    = localStorage.getItem("accessToken") || "";
  const aprovador = localStorage.getItem("usuarioNome") || "Gestor";

  const resp = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/api/aprovacoes-minimo/${aprovacaoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: novoStatus, aprovador })
  }).catch(() => null);

  if (!resp?.ok) { alert("Erro ao salvar decisão."); return; }
  const doc = await resp.json();

  window._solicitacoesAprovacaoMinimo = (window._solicitacoesAprovacaoMinimo || []).map(s =>
    (s._id === aprovacaoId || s.id === aprovacaoId) ? { ...s, ...doc } : s
  );

  if (typeof adicionarTotalizadoresPorAmbienteComAgrupamento === "function") {
    adicionarTotalizadoresPorAmbienteComAgrupamento();
  }
};
