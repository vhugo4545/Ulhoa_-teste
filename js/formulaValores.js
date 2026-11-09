function preencherInformacoesProduto(botao, texto, personalizado = false) {
  const wrapper = botao.closest('.informacoes-produto-wrapper');
  const campo = wrapper?.querySelector('textarea[name="informacoesProduto"]');
  if (!campo) return;

  campo.value = personalizado ? "" : texto;
  campo.dataset.valorOriginal = campo.value;

  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.dispatchEvent(new Event("change", { bubbles: true }));

  // Personalizado: o prazo conta da "Data personalizada" (a pessoa escolhe a data)
  if (personalizado) {
    definirRefPrazo(botao.closest(".main-container"), "personalizado");
    campo.focus();
  }
}


// ── Referência do prazo (aba Prazos) ────────────────────────────────────────
// Um marcador por condição; só um fica marcado. Marca sozinho conforme a condição escolhida.
// Cada cartão mostra: data + prazo em dias úteis = data de entrega (sem fins de semana e feriados).
const REFS_PRAZO = [
  { ref: "projeto",       campo: "dataAssinaturaCliente",   curto: "Assinatura do projeto",
    desc: "Assinatura do cliente no projeto (Kommo: Assinatura Projeto)",            chave: "assinatura do cliente no projeto" },
  { ref: "instalacao",    campo: "dataInstalacaoEstrutura", curto: "Instalação da estrutura",
    desc: "Instalação da estrutura finalizada (Sistema de Produção)",                chave: "instalacao da estrutura" },
  { ref: "vidros",        campo: "dataPagamentoVidros",     curto: "Último pagamento 100%",
    desc: "Pagamento do(s) vidro(s) / faturamento direto (Produção / Compras)",      chave: "vidro" },
  { ref: "fornecedor",    campo: "dataLiberacaoFornecedor", curto: "Liberação do fornecedor",
    desc: "Liberação/entrega do material pelo fornecedor (Produção / Compras)",      chave: "fornecedor" },
  { ref: "contrato",      campo: "dataPedidoAssinado",      curto: "Assinatura do contrato",
    desc: "Contrato Assinado da Kommo (igual para todos os itens)",                  chave: "assinatura do contrato" },
  { ref: "personalizado", campo: "dataPersonalizada",       curto: "Data personalizada",
    desc: "Escolha a data de partida do prazo (condição personalizada)",             chave: null },
];

// Uma linha por opção: marcador + nome + data. A entrega aparece uma vez, abaixo, para a opção marcada.
function _htmlCardsRefPrazo() {
  const contrato = document.getElementById("dataPedidoAssinado")?.value || "";
  return REFS_PRAZO.map(r => `
        <div class="ref-prazo-card d-flex align-items-center gap-2" data-ref="${r.ref}" title="${r.desc}" style="border:1px solid #e2e8f0;border-radius:6px;padding:3px 6px;background:#fff;">
          <label class="d-flex align-items-center gap-2 mb-0 flex-grow-1" style="font-size:11.5px;color:#1e3a5f;cursor:pointer;min-width:0;">
            <input type="checkbox" class="form-check-input mt-0 chk-ref-prazo" data-ref="${r.ref}" style="flex:none;">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.curto}</span>
          </label>
          <input type="date" name="${r.campo}" class="form-control form-control-sm" style="width:128px;flex:none;padding:1px 6px;font-size:11.5px;${r.ref === "contrato" ? "background:#f3f3f3;" : ""}"${r.ref === "contrato" ? ` readonly value="${contrato}"` : ""}>
        </div>`).join("");
}

const _semAcentoPrazo = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Condição (texto) → referência; "" quando o texto não é de nenhuma opção (ex.: personalizado)
function refPrazoPorTexto(texto) {
  const t = _semAcentoPrazo(texto);
  if (!t.trim()) return "";
  return REFS_PRAZO.find(r => r.chave && t.includes(r.chave))?.ref || "";
}

// Feriados (todos os pedidos) + dias sem trabalho deste pedido, cadastrados no app de produção
window._diasNaoUteisPDV = new Set();
window._feriadosPDV = new Set();   // feriados de todos os pedidos
window._diasPedidoPDV = new Set(); // dias sem trabalho só deste pedido
(function carregarDiasNaoUteisPDV() {
  const id = new URLSearchParams(location.search).get("id") || "";
  fetch("https://app-producao-b843a894d7ea.herokuapp.com/api/feriados/publico?pedido=" + encodeURIComponent(id))
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (!d) return;
      window._feriadosPDV = new Set(d.feriados || []);
      window._diasPedidoPDV = new Set(d.pedido || []);
      window._diasNaoUteisPDV = new Set([...window._feriadosPDV, ...window._diasPedidoPDV]);
      window.atualizarPrazosPDV();
    })
    .catch(() => {});
})();

function _isoPrazoPDV(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function _fmtPrazoPDV(iso) { const [a, m, d] = String(iso).split("-"); return d && m && a ? `${d}/${m}/${a}` : ""; }
// Soma dias úteis e conta o que foi pulado (para explicar a data na tela)
function _detalheDiasUteisPDV(iso, dias) {
  const d = new Date(iso + "T12:00:00");
  const det = { fim: "", fds: 0, feriados: [], pedido: [] };
  if (isNaN(d)) return det;
  let c = dias;
  while (c > 0) {
    d.setDate(d.getDate() + 1);
    const dw = d.getDay(), dia = _isoPrazoPDV(d);
    if (dw === 0 || dw === 6) det.fds++;
    else if (window._feriadosPDV.has(dia)) det.feriados.push(dia);
    else if (window._diasPedidoPDV.has(dia)) det.pedido.push(dia);
    else c--;
  }
  det.fim = _isoPrazoPDV(d);
  return det;
}
function _somarDiasUteisPDV(iso, dias) { return _detalheDiasUteisPDV(iso, dias).fim; }

// Redesenha as linhas de um grupo (marcador e destaque), a entrega da opção marcada
// e a sugestão quando o marcador não bate com a condição (só sugere, não trava)
function atualizarPrazoBloco(bloco) {
  const wrap = bloco?.querySelector(".ref-prazo-wrap");
  if (!wrap) return;
  const dias = parseInt(bloco.querySelector('input[name="previsaoEntrega"]')?.value, 10);
  const sel = wrap.querySelector('input[name="referenciaPrazo"]')?.value || "";
  let dataSel = "";
  wrap.querySelectorAll(".ref-prazo-card").forEach(card => {
    const on = card.dataset.ref === sel;
    const chk = card.querySelector(".chk-ref-prazo");
    if (chk) chk.checked = on;
    card.style.borderColor = on ? "#93c5fd" : "#e2e8f0";
    card.style.background = on ? "#eef5ff" : "#fff";
    if (on) dataSel = card.querySelector('input[type="date"]')?.value || "";
  });
  const out = wrap.querySelector(".ref-prazo-final");
  if (!out) return;
  const ref = REFS_PRAZO.find(r => r.ref === sel);
  const dm = iso => _fmtPrazoPDV(iso).slice(0, 5);
  const lista = arr => arr.length > 1 ? arr.slice(0, -1).map(dm).join(", ") + " e " + dm(arr[arr.length - 1]) : dm(arr[0]);
  let txt, detalhe = "";
  if (!ref) txt = `<span style="color:#b45309;">Marque de qual data o prazo conta.</span>`;
  else if (!dataSel) txt = `<span style="color:#b45309;">Preencha a data: ${ref.curto}.</span>`;
  else if (!(dias > 0)) txt = `${_fmtPrazoPDV(dataSel)} · <span style="color:#b45309;">informe o prazo (dias úteis).</span>`;
  else {
    const det = _detalheDiasUteisPDV(dataSel, dias);
    txt = `${_fmtPrazoPDV(dataSel)} + ${dias} dias úteis = <b style="color:#15803d;">${_fmtPrazoPDV(det.fim)}</b>`;
    const partes = [];
    if (det.fds) partes.push(`${det.fds} dias de fim de semana`);
    if (det.feriados.length) partes.push(`feriado${det.feriados.length > 1 ? "s" : ""} ${lista(det.feriados)}`);
    if (det.pedido.length) partes.push(`dia${det.pedido.length > 1 ? "s" : ""} sem trabalho deste pedido ${lista(det.pedido)}`);
    detalhe = partes.length ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">Não contou: ${partes.join(" · ")}.</div>` : "";
  }
  // Sugestão: a condição escolhida pede outra data
  const cond = bloco.querySelector('textarea[name="informacoesProduto"]')?.value || "";
  const refCond = refPrazoPorTexto(cond) || (cond.trim() ? "personalizado" : "");
  let sugestao = "";
  if (refCond && refCond !== sel) {
    const r = REFS_PRAZO.find(x => x.ref === refCond);
    sugestao = `<div style="font-size:10.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:5px;padding:4px 6px;margin-top:4px;">
      Sugestão: a condição ${refCond === "personalizado" ? "é personalizada" : `é «${r.curto}»`}, mas está marcado «${ref ? ref.curto : "nenhum"}».
      Marque «${r.curto}» e preencha a data dela.
      <a href="#" class="ref-prazo-usar" data-ref="${refCond}" style="font-weight:700;">Marcar «${r.curto}»</a></div>`;
  }
  out.innerHTML = `<b style="color:#1d4ed8;">Entrega:</b> ` + txt + detalhe + sugestao;
}
window.atualizarPrazosPDV = function () {
  document.querySelectorAll(".main-container").forEach(atualizarPrazoBloco);
};

// Marca a referência do grupo ("" = nenhuma; o app de produção usa o contrato)
function definirRefPrazo(bloco, ref) {
  const hid = bloco?.querySelector('input[name="referenciaPrazo"]');
  if (!hid) return;
  hid.value = ref || "";
  const hidProj = bloco.querySelector('input[name="usarAssinaturaProjetoRef"]');
  if (hidProj) hidProj.value = ref === "projeto" ? "sim" : "nao";
  atualizarPrazoBloco(bloco);
}
// Ao abrir a proposta: o que foi salvo; sem nada salvo, deduz pela condição do item
window.aplicarRefPrazoSalva = function (bloco, parametros) {
  const p = parametros || {};
  const ref = p.referenciaPrazo || (p.usarAssinaturaProjetoRef === "sim" ? "projeto" : "") || refPrazoPorTexto(p.informacoesProduto);
  definirRefPrazo(bloco, ref);
};

document.addEventListener("change", e => {
  const t = e.target;
  const bloco = t?.closest?.(".main-container");
  if (!bloco) return;
  if (t.classList.contains("chk-ref-prazo")) { definirRefPrazo(bloco, t.checked ? t.dataset.ref : ""); return; }
  if (t.matches('textarea[name="informacoesProduto"]')) {
    const ref = refPrazoPorTexto(t.value);
    if (ref) definirRefPrazo(bloco, ref); else atualizarPrazoBloco(bloco);
    return;
  }
  if (t.name === "previsaoEntrega" || t.closest(".ref-prazo-wrap")) atualizarPrazoBloco(bloco);
});
// "Marcar «...»" da sugestão
document.addEventListener("click", e => {
  const a = e.target?.closest?.(".ref-prazo-usar");
  if (!a) return;
  e.preventDefault();
  definirRefPrazo(a.closest(".main-container"), a.dataset.ref);
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t?.type === "checkbox") return; // o marcador é tratado no "change"
  if (t?.name === "previsaoEntrega" || t?.closest?.(".ref-prazo-wrap")) atualizarPrazoBloco(t.closest(".main-container"));
});


function preencherValoresFinanceiros(blocoId) {

  const bloco = document.getElementById(blocoId);
 atualizarValoresDasParcelas()
  if (!bloco) {
    console.warn(`Bloco ${blocoId} não encontrado.`);
    return;
  }

  const inputs = bloco.querySelectorAll('input[name]');
  const dados = {};

  // Coletar valores dos inputs
  inputs.forEach(input => {
    const nome = input.name;
    const valor = input.value.trim().replace(',', '.').replace('R$', '');
    dados[nome] = parseFloat(valor) || 0;
  });

  // Extrair percentuais
  const impostos = dados.impostos / 100;
  const margemLucro = dados.margem_lucro / 100;
  const gastosTotais = dados.gasto_operacional / 100;
  const negociacao = dados.margem_negociacao / 100;
  const miudezas = dados.miudezas / 100;
  const comissaoArquiteta = dados.comissao_arquiteta / 100;
  const margemSegunraca = dados.margem_seguranca / 100;

  
  // Obter total da tabela (soma da coluna "Valor de Custo Final")
  const tabela = bloco.querySelector("table");
  if (!tabela) {
    adicionarTotalizadoresPorAmbienteComAgrupamento();
    return;
  }
  let materialBase = 0;
  tabela.querySelectorAll("tbody tr").forEach(linha => {
    const valorStr = linha.querySelector(".custo-unitario")?.textContent?.replace("R$", "").replace(",", ".");
    const valor = parseFloat(valorStr || 0);
    materialBase += valor;
  });


  // Custo total de material com miudezas
  const custoMaterial = materialBase * (1 + miudezas);

  const divisor = 1 - (gastosTotais + margemLucro + impostos);
  if (divisor <= 0) {
    console.error("❌ Erro: soma dos percentuais maior ou igual a 100%");
    adicionarTotalizadoresPorAmbienteComAgrupamento();
    return;
  }

  // Fórmula: custo de material / (1 - gastosTotais - margemLucro - impostos) * (1 + comissaoArquiteta)
  const precoMinimo = (custoMaterial / (1- gastosTotais -margemLucro - impostos )) * (1 + (comissaoArquiteta + margemSegunraca));
  const negociacao1 =  negociacao
  const precoSugerido = precoMinimo * (1 + negociacao1 );

  // Preencher os campos no HTML
  const inputMin = bloco.querySelector('input[name="precoMinimo"]');
  const inputSug = bloco.querySelector('input[name="precoSugerido"]');
  const inputCusto = bloco.querySelector('input[name="custoTotalMaterial"]');

  if (inputMin) inputMin.value = precoMinimo.toFixed(2);
  if (inputSug) inputSug.value = precoSugerido.toFixed(2);
  if (inputCusto) inputCusto.value = custoMaterial.toFixed(2);

  // Atualizar total no rodapé da tabela
  const totalRodape = bloco.querySelector('table tfoot td[colspan="8"] strong');
  if (totalRodape) totalRodape.textContent = `R$ ${precoSugerido.toFixed(2)}`;

  // Mostrar no console os valores detalhados
  const valorImpostos = precoMinimo * impostos;
  const valorMargem = precoMinimo * margemLucro;
  const valorGastos = precoMinimo * gastosTotais;
  const valorComissao = precoMinimo * comissaoArquiteta;
  const valorNegociacao = precoMinimo * negociacao;
  const valorMiudezas = materialBase * miudezas;

const campoVAlorSegunrnçaDesperdicio = precoMinimo - precoMinimo / (1 + comissaoArquiteta + margemSegunraca);
const campoValorGastosOperacionais = (precoMinimo-campoVAlorSegunrnçaDesperdicio)*(gastosTotais);

const campoValorPorcentagemImpostos = impostos;
const campoValorMinimo = precoMinimo;
const campoValorImpostos = impostos * precoMinimo;

const somaValotres = campoValorImpostos + custoMaterial + campoValorGastosOperacionais

const campoValorMargemLucro =  (campoValorMinimo-  somaValotres) - margemSegunraca ;
const campoValorSeguranca = (custoMaterial/(1-campoValorGastosOperacionais - campoValorMargemLucro  - valorImpostos))* valorMargem  ;

const campoValorMiudezas = custoMaterial - custoMaterial / (1 + miudezas);
const campoNegocia = precoSugerido - precoMinimo


const arqeuiteto = (custoMaterial/(1-campoValorGastosOperacionais - campoValorMargemLucro - campoValorImpostos))* comissaoArquiteta  ;


console.log( "teste ",arqeuiteto)

adicionarBotaoResumoFinanceiro(blocoId)
adicionarTotalizadoresPorAmbienteComAgrupamento();

 }

 function calcularValoresFinanceiros(blocoId) {
  const bloco = document.getElementById(blocoId);
  if (!bloco) return null;

  // Tenta encontrar valores mesmo se não tiver input
  const buscarValor = (nome, padrao = 0) => {
    const input = bloco.querySelector(`input[name='${nome}']`);
    if (!input) return padrao;
    const valor = input.value.trim().replace(',', '.').replace('R$', '');
    return parseFloat(valor) || padrao;
  };

  // Busca os percentuais ou usa 0 como fallback
  const impostos = buscarValor("impostos") / 100;
  const margemLucro = buscarValor("margem_lucro") / 100;
  const gastosTotais = buscarValor("gasto_operacional") / 100;
  const negociacao = buscarValor("margem_negociacao") / 100;
  const miudezas = buscarValor("miudezas") / 100;
  const comissaoArquiteta = buscarValor("comissao_arquiteta") / 100;
  const margemSeguranca = buscarValor("margem_seguranca") / 100;

  const tabela = bloco.querySelector("table");
  if (!tabela) return null;

  let materialBase = 0;
  tabela.querySelectorAll("tbody tr").forEach(linha => {
    const valorStr = linha.querySelector(".custo-unitario")?.textContent?.replace("R$", "").replace(",", ".");
    const valor = parseFloat(valorStr || 0);
    materialBase += valor;
  });

  const custoMaterial = materialBase * (1 + miudezas);
  const divisor = 1 - (gastosTotais + margemLucro + impostos);
  if (divisor <= 0) {
    console.error("❌ Erro: soma dos percentuais maior ou igual a 100%");
    return null;
  }

  const precoMinimo = (custoMaterial / divisor) * (1 + comissaoArquiteta + margemSeguranca);
  const precoSugerido = precoMinimo * (1 + negociacao);
  const campoVAlorSegunrnçaDesperdicio = precoMinimo - precoMinimo / (1 + comissaoArquiteta + margemSegunraca);
  const campoValorGastosOperacionais = (precoMinimo - campoVAlorSegunrnçaDesperdicio) * gastosTotais;
  const campoValorPorcentagemImpostos = impostos;
  const campoValorMinimo = precoMinimo;
  const campoValorImpostos = impostos * precoMinimo;
  const somaValotres = campoValorImpostos + custoMaterial + campoValorGastosOperacionais;
  const campoValorMargemLucro = (campoValorMinimo - somaValotres) - campoValorSeguranca;
  const campoValorSeguranca = (custoMaterial/(1-campoValorGastosOperacionais - campoValorMargemLucro - campoValorImpostos))* margemSeguranca  ;
  const arqeuiteto = (custoMaterial/(1-campoValorGastosOperacionais - campoValorMargemLucro - campoValorImpostos))* comissaoArquiteta  ;
  const campoValorMiudezas = custoMaterial - custoMaterial / (1 + miudezas);
  const campoNegocia = precoSugerido - precoMinimo;

  console.log( "Arquiteto", arqeuiteto, "Segurança",  campoValorSeguranca)

  return {
    campoVAlorSegunrnçaDesperdicio,
    campoValorGastosOperacionais,
    campoValorImpostos,
    campoValorMinimo: precoMinimo,
    campoValorMargemLucro,
    campoValorMiudezas,
    campoNegocia
  };
}

function calcularValoresFinanceiros(blocoId) {
  const bloco = document.getElementById(blocoId);
  if (!bloco) return null;

  const inputs = bloco.querySelectorAll('input[name]');
  const dados = {};
  inputs.forEach(input => {
    const nome = input.name;
    const valor = input.value.trim().replace(',', '.').replace('R$', '');
    dados[nome] = parseFloat(valor) || 0;
  });

  const impostos = dados.impostos / 100;
  const margemLucro = dados.margem_lucro / 100;
  const gastosTotais = dados.gasto_operacional / 100;
  const negociacao = dados.margem_negociacao / 100;
  const miudezas = dados.miudezas / 100;
  const comissaoArquiteta = dados.comissao_arquiteta / 100;
  const margemSegunraca = dados.margem_seguranca / 100;

  const tabela = bloco.querySelector("table");
  let materialBase = 0;
  tabela.querySelectorAll("tbody tr").forEach(linha => {
    const valorStr = linha.querySelector(".custo-unitario")?.textContent?.replace("R$", "").replace(",", ".");
    const valor = parseFloat(valorStr || 0);
    materialBase += valor;
  });

  const custoMaterial = materialBase * (1 + miudezas);
  const divisor = 1 - (gastosTotais + margemLucro + impostos);
  if (divisor <= 0) {
    console.error("❌ Erro: soma dos percentuais maior ou igual a 100%");
    return null;
  }

  const precoMinimo = (custoMaterial / divisor) * (1 + (comissaoArquiteta + margemSegunraca));
  const precoSugerido = precoMinimo * (1 + negociacao);

  const campoVAlorSegunrnçaDesperdicio = precoMinimo - precoMinimo / (1 + comissaoArquiteta + margemSegunraca);
  const campoValorGastosOperacionais = (precoMinimo - campoVAlorSegunrnçaDesperdicio) * gastosTotais;
  const campoValorPorcentagemImpostos = impostos;
  const campoValorMinimo = precoMinimo;
  const campoValorImpostos = impostos * precoMinimo;
  const somaValotres = campoValorImpostos + custoMaterial + campoValorGastosOperacionais;
  const campoValorMargemLucro = (campoValorMinimo - somaValotres) - margemSegunraca;
  const campoValorSeguranca = (custoMaterial/(1-campoValorGastosOperacionais - campoValorMargemLucro - campoValorImpostos))* margemSegunraca  ;
  const arqeuiteto = (custoMaterial/(1-campoValorGastosOperacionais - campoValorMargemLucro - campoValorImpostos))* comissaoArquiteta  ;
  const campoValorMiudezas = custoMaterial - custoMaterial / (1 + miudezas);
  const campoNegocia = precoSugerido - precoMinimo;

  

  return {
    campoVAlorSegunrnçaDesperdicio,
    campoValorGastosOperacionais,
    campoValorPorcentagemImpostos,
    campoValorMinimo,
    campoValorImpostos,
    campoValorSeguranca,
    campoValorMargemLucro,
    campoValorMiudezas,
    campoNegocia
  };
}

function adicionarBotaoResumoFinanceiro(blocoId) {
  const bloco = document.getElementById(blocoId);
  if (!bloco) return;

  const botaoExistente = bloco.querySelector(".btn-detalhes-financeiros");
  if (botaoExistente) return;

  const botao = document.createElement("button");
  botao.className = "btn btn-outline-info btn-sm btn-detalhes-financeiros";
  botao.innerHTML = "📊 Ver Detalhes Financeiros";
  botao.style.marginTop = "8px";

  botao.addEventListener("click", () => {
    abrirPopupValoresFinanceiros(blocoId);
  });

  const destino = bloco.querySelector(".tab-pane") || bloco;
  destino.appendChild(botao);
}

function abrirPopupValoresFinanceiros(blocoId) {
  const valores = calcularValoresFinanceiros(blocoId);
  if (!valores) return;

  const html = `
    <div style="padding: 20px; font-size: 14px; max-width: 400px;">
      <h5 class="mb-3">Resumo Financeiro</h5>
      <ul class="list-group">
        <li class="list-group-item">💰 <strong>Valor Gastos Operacionais:</strong> R$ ${valores.campoValorGastosOperacionais.toFixed(2)}</li>
        <li class="list-group-item">📈 <strong>Margem de Lucro:</strong> R$ ${valores.campoValorMargemLucro.toFixed(2)}</li>
        <li class="list-group-item">🧾 <strong>Valor Impostos:</strong> R$ ${valores.campoValorImpostos.toFixed(2)}</li>
        <li class="list-group-item">💼 <strong>Valor Mínimo:</strong> R$ ${valores.campoValorMinimo.toFixed(2)}</li>
        <li class="list-group-item">🏗 <strong>Margem + Comissão Arquiteto:</strong> R$ ${valores.campoVAlorSegunrnçaDesperdicio.toFixed(2)}</li>
        <li class="list-group-item">📦 <strong>Miudezas:</strong> R$ ${valores.campoValorMiudezas.toFixed(2)}</li>
        <li class="list-group-item">📝 <strong>Valor Sugerido (Negociação):</strong> R$ ${valores.campoNegocia.toFixed(2)}</li>
      </ul>
      <div class="text-end mt-3">
        <button class="btn btn-sm btn-secondary" onclick="this.closest('.popup-financeiro').remove()">Fechar</button>
      </div>
    </div>
  `;

  const popup = document.createElement("div");
  popup.className = "popup-financeiro";
  popup.innerHTML = html;
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "#fff";
  popup.style.border = "1px solid #ccc";
  popup.style.borderRadius = "12px";
  popup.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  popup.style.zIndex = 10000;

  document.body.appendChild(popup);
}


function exibirResumoFinanceiroConsole(blocoId) {
  const bloco = document.getElementById(blocoId);
  if (!bloco) return;

  const valoresCalculados = calcularValoresFinanceiros(blocoId);
  if (!valoresCalculados) return;

  console.log("Valor Gastos Operacionais:", valoresCalculados.campoValorGastosOperacionais.toFixed(2));
  console.log("Margem de Lucro:", valoresCalculados.campoValorMargemLucro.toFixed(2));
  console.log("Valor Impostos:", valoresCalculados.campoValorImpostos.toFixed(2));
  console.log("Valor Mínimo:", valoresCalculados.campoValorMinimo.toFixed(2));
  console.log("Valor Margem + comissão arquiteto:", valoresCalculados.campoVAlorSegunrnçaDesperdicio.toFixed(2));
  console.log("Miudezas:", valoresCalculados.campoValorMiudezas.toFixed(2));
  console.log("Valor sugerido:", valoresCalculados.campoNegocia.toFixed(2));
}



function duplicarBlocoViaDOM(idOriginal) {
  const blocoOriginal = document.getElementById(idOriginal);
  if (!blocoOriginal) {
    console.warn(`❌ Bloco com ID ${idOriginal} não encontrado.`);
    return;
  }

  // Novo ID único
  const novoId = `bloco-${blocoIndex++}`;

  // Clonar DOM
  const novoBloco = blocoOriginal.cloneNode(true);
  novoBloco.id = novoId;

  // Atualiza todos os atributos de ID e referencias internas
  const htmlAtualizado = novoBloco.innerHTML.replaceAll(idOriginal, novoId);
  novoBloco.innerHTML = htmlAtualizado;

  // Atualiza atributos específicos que não são apenas IDs
  const elementos = novoBloco.querySelectorAll("*");
  elementos.forEach(el => {
    if (el.id?.includes(idOriginal)) el.id = el.id.replace(idOriginal, novoId);
    if (el.getAttribute("data-id-grupo") === idOriginal)
      el.setAttribute("data-id-grupo", novoId);

    if (el.getAttribute("onclick")?.includes(idOriginal))
      el.setAttribute("onclick", el.getAttribute("onclick").replaceAll(idOriginal, novoId));

    if (el.getAttribute("data-bs-target")?.includes(idOriginal))
      el.setAttribute("data-bs-target", el.getAttribute("data-bs-target").replaceAll(idOriginal, novoId));

    if (el.getAttribute("aria-controls")?.includes(idOriginal))
      el.setAttribute("aria-controls", el.getAttribute("aria-controls").replaceAll(idOriginal, novoId));

    if (el.getAttribute("data-bs-parent")?.includes(idOriginal))
      el.setAttribute("data-bs-parent", el.getAttribute("data-bs-parent").replaceAll(idOriginal, novoId));
  });

  // Copia valores dos inputs manualmente (evita inputs limpos pelo cloneNode)
  const inputsOriginais = blocoOriginal.querySelectorAll("input, select, textarea");
  const inputsDuplicados = novoBloco.querySelectorAll("input, select, textarea");

  inputsOriginais.forEach((inputOrig, index) => {
    const valor = inputOrig.value;
    const inputNovo = inputsDuplicados[index];
    if (inputNovo) inputNovo.value = valor;
  });

  // Adiciona bloco ao DOM
  const container = document.getElementById("blocosProdutosContainer");
  container.appendChild(novoBloco);

  // Reativa funcionalidades
  setTimeout(() => {
    if (typeof ativarRecalculoEmTodasTabelas === "function") ativarRecalculoEmTodasTabelas();
    if (typeof preencherValoresFinanceiros === "function") preencherValoresFinanceiros(novoId);
    if (typeof simularFocusEBlurEmTodosCamposFormula === "function") simularFocusEBlurEmTodosCamposFormula();
  }, 500);

  console.log(`✅ Bloco duplicado: ${idOriginal} → ${novoId}`);
}



window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".main-container").forEach(bloco => {
    adicionarBotaoResumoFinanceiro(bloco.id);
  });
});












// 🔁 Ativa o recálculo automático ao alterar inputs financeiros (exclui campos informativos)
const _CAMPOS_NAO_FINANCEIROS = new Set([
  'previsaoEntrega', 'informacoesProduto', 'ambiente', 'usarAssinaturaProjetoRef', 'referenciaPrazo'
]);
document.addEventListener('input', function (e) {
  const input = e.target;
  if (input.matches('input[name]') && !_CAMPOS_NAO_FINANCEIROS.has(input.name)) {
    const bloco = input.closest('.main-container');
    if (bloco && bloco.id) {
      preencherValoresFinanceiros(bloco.id);
    }
  }
});

// Adiciona checkbox acima do textarea de resumo (só uma vez por grupo)
function inserirCheckboxResumo(idSuffix) {
  const textarea = document.getElementById(`resumo-${idSuffix}`);
  if (!textarea) return;

  if (!document.getElementById(`checkboxResumoManual-${idSuffix}`)) {
    const div = document.createElement("div");
    div.className = "mb-1";
    div.innerHTML = `
      <label class="form-check-label" style="font-size:0.93em">
        <input type="checkbox" class="form-check-input me-1" id="checkboxResumoManual-${idSuffix}">
        Editar manualmente
      </label>
    `;
    textarea.parentNode.insertBefore(div, textarea);

    // Ao focar ou desfocar, ativa modo manual
    textarea.addEventListener("focus", () => {
      document.getElementById(`checkboxResumoManual-${idSuffix}`).checked = true;
    });
    textarea.addEventListener("blur", () => {
      document.getElementById(`checkboxResumoManual-${idSuffix}`).checked = true;
    });
  }
}

// Função para atualizar resumo do grupo
function atualizarResumoDoGrupo(idSuffix) {
  
}


// Pare aqui
// Mapeamento: interno -> label visível
const labelsParametros = {
  miudezas: "Miudezas",
  gasto_operacional: "Gastos Operacionais",
  impostos: "Impostos",
  margem_seguranca: "Margem de Segurança",
  comissao_arquiteta: "Comissão Arquiteta",
  margem_negociacao: "Margem de Negociação",
  numero_montantes: "Nº de Montantes / Fixações",
  altura_montante: "Altura do Montante",
  numero_protecoes: "Número de Proteções / Altura do Vidro",
  margem_lucro: "Margem de Lucro",
  descricao: "Metragem / Unidade(s)",
  equipe_mo_botao:    "Equipe MO Botão",
  ritmo_mo_botao:     "Ritmo MO Botão (un/dia)",
  equipe_mo_garra:    "Equipe MO Garra",
  ritmo_mo_garra:     "Ritmo MO Garra (un/dia)",
  equipe_mo_calha:    "Equipe MO Calha Infinity",
  ritmo_mo_calha:     "Ritmo MO Calha Infinity (m/dia)",
  equipe_mo_vidro_bg: "Equipe MO Vidro Botão/Garra",
  ritmo_mo_vidro_bg:  "Ritmo MO Vidro Botão/Garra (un/dia)",
  equipe_mo_vidro_h:  "Equipe MO Vidro Montante H",
  ritmo_mo_vidro_h:   "Ritmo MO Vidro Montante H (un/dia)",
  equipe_mo_vidro_ci: "Equipe MO Vidro Calha Infinity",
  ritmo_mo_vidro_ci:  "Ritmo MO Vidro Calha Infinity (un/dia)"
};

// Ordem para exibição no front
const ordemParametros = [
  "miudezas",
  "gasto_operacional",
  "impostos",
  "margem_seguranca",
  "comissao_arquiteta",
  "margem_negociacao",
  "numero_montantes",
  "altura_montante",
  "numero_protecoes",
  "margem_lucro",
  "descricao",
  "equipe_mo_botao",
  "ritmo_mo_botao",
  "equipe_mo_garra",
  "ritmo_mo_garra",
  "equipe_mo_calha",
  "ritmo_mo_calha",
  "equipe_mo_vidro_bg",
  "ritmo_mo_vidro_bg",
  "equipe_mo_vidro_h",
  "ritmo_mo_vidro_h",
  "equipe_mo_vidro_ci",
  "ritmo_mo_vidro_ci"
];

// ----------------------------
// Função principal
// ----------------------------
// Data "Assinatura do cliente no projeto" vem do campo "Assinatura de Projeto" da Kommo (bloqueioKommo.js)
window.travarAssinaturaProjetoKommo = function (inp) {
  if (!inp || window._kommoAssinaturaProjeto === undefined) return;
  inp.value = window._kommoAssinaturaProjeto || "";
  inp.dataset.valorOriginal = inp.value;
  inp.readOnly = true;
  inp.style.background = "#f3f3f3";
  inp.title = 'Vem do campo "Assinatura Projeto" da Kommo';
  atualizarPrazoBloco(inp.closest(".main-container"));
};

function criarBlocoDeProposta(nomeGrupo = "", ambiente = "") {
  const idSuffix = `bloco-${blocoIndex++}`;
  const container = document.getElementById("blocosProdutosContainer");
  if (!container) {
    console.warn("❌ Container #blocosProdutosContainer não encontrado.");
    return idSuffix;
  }

  const estaEditandoModelo = window.location.pathname.includes("editarModelo.html");
  // Quem vê custo, mínimo e sugerido (Ajustes → Perfis); padrão: admin
  const isAdmin = window.Permissoes ? window.Permissoes.pode("verCustos") : (localStorage.getItem("usuarioTipo") || "") === "admin";

  const camposFinanceiros = [
    { label: "Custo Total de Material", name: "custoTotalMaterial" },
    { label: "Valor Mínimo",            name: "precoMinimo"        },
    { label: "Valor Sugerido",          name: "precoSugerido"      },
  ];

  const bloco = document.createElement("div");
  bloco.className = "main-container position-relative mb-4";
  bloco.id = idSuffix;

  bloco.innerHTML = `
    <div class="accordion" id="accordion-${idSuffix}">
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-${idSuffix}">
          <div class="d-flex align-items-center justify-content-between px-2 w-100">
            <button class="accordion-button collapsed flex-grow-1" type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapse-${idSuffix}"
              aria-expanded="false"
              aria-controls="collapse-${idSuffix}">
              <span id="titulo-accordion-${idSuffix}">
                ${nomeGrupo || `Grupo (${idSuffix})`}
              </span>
            </button>
            <div class="d-flex align-items-center gap-2 ms-4">
              <input type="text" class="form-control form-control-sm" placeholder="Ambiente"
                value="${ambiente || ""}" data-id-grupo="${idSuffix}" title="Digite o nome do ambiente"
                ${estaEditandoModelo ? 'style="display:none;"' : ''}>
              <button class="btn btn-outline-danger btn-sm" type="button" onclick="removerBloco('${idSuffix}')" title="Excluir grupo">Excluir</button>
              <button class="btn btn-outline-secondary btn-sm" type="button" onclick="duplicarBlocoViaDOM('${idSuffix}')" title="Duplicar grupo">Duplicar</button>
            </div>
          </div>
        </h2>
        <div id="collapse-${idSuffix}" class="accordion-collapse collapse" data-bs-parent="#accordion-${idSuffix}">
          <div class="accordion-body">
            <div class="row g-3">
              <div class="col-lg-4">
                <ul class="nav nav-tabs">
                  <li class="nav-item">
                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#${idSuffix}-aba1">Parâmetros</button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#${idSuffix}-aba2">Valores R$</button>
                  </li>
                   <!-- [CAMPO NOVO] Botão da aba Informações -->
                  <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#${idSuffix}-aba3">Prazos</button>
                  </li>
                </ul>
                <div class="tab-content pt-3">
                  <div class="tab-pane fade show active" id="${idSuffix}-aba1">
                    <form class="row g-2">
                      ${ordemParametros.map(param => `
                        <div class="col-6">
                          <label class="form-label">${labelsParametros[param]}</label>
                          <input type="text" name="${param}" class="form-control form-control-sm"
                            ${(!estaEditandoModelo && !["altura_montante", "numero_montantes", "numero_protecoes", "descricao", "comissao_arquiteta", "margem_negociacao","margem_seguranca","margem_lucro","equipe_mo_botao","ritmo_mo_botao","equipe_mo_garra","ritmo_mo_garra","equipe_mo_calha","ritmo_mo_calha","equipe_mo_vidro_bg","ritmo_mo_vidro_bg","equipe_mo_vidro_h","ritmo_mo_vidro_h","equipe_mo_vidro_ci","ritmo_mo_vidro_ci"].includes(param))
                              ? "readonly style='background:#f3f3f3'" : ""}>
                        </div>
                      `).join("")}
                    </form>
                  </div>
                  <div class="tab-pane fade" id="${idSuffix}-aba2">
                    <form class="row g-2">
                      ${camposFinanceiros.map(campo => `
                        <div class="col-12">
                          <label class="form-label">${campo.label}</label>
                          <input type="text" name="${campo.name}" class="form-control form-control-sm"
                            ${!estaEditandoModelo ? "readonly style='background:#f3f3f3'" : ""}>
                        </div>
                      `).join("")}
                    </form>
                  </div>
                  
               <div class="tab-pane fade" id="${idSuffix}-aba3">
  <form class="row g-2">

    <!-- Prazo: número de dias -->
    <div class="col-12">
      <label class="form-label fw-semibold mb-1" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;">Prazo (dias úteis)</label>
      <div class="input-group input-group-sm">
        <input type="number" name="previsaoEntrega" class="form-control form-control-sm" placeholder="Ex: 15" min="1" style="max-width:90px;">
        <span class="input-group-text" style="font-size:11px;color:#666;">dias úteis</span>
      </div>
    </div>

    <!-- Separador -->
    <div class="col-12"><hr class="my-1" style="border-color:#e0e0e0;"></div>

    <!-- Opções de texto -->
    <div class="col-12 informacoes-produto-wrapper">
      <label class="form-label fw-semibold mb-1" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;">Condição</label>
      <div class="d-grid gap-1 mb-2 opcoes-informacoes-produto" style="grid-template-columns:1fr 1fr;display:grid;">
        <button type="button" class="btn btn-outline-secondary btn-sm text-start px-2" style="font-size:11px;line-height:1.3;" onclick="preencherInformacoesProduto(this, 'dias úteis após assinatura do cliente no projeto desse respectivo item.')">Assinatura do cliente</button>
        <button type="button" class="btn btn-outline-secondary btn-sm text-start px-2" style="font-size:11px;line-height:1.3;" onclick="preencherInformacoesProduto(this, 'dias úteis após instalação da estrutura desse respectivo item ser finalizada.')">Instalação da estrutura</button>
        <button type="button" class="btn btn-outline-secondary btn-sm text-start px-2" style="font-size:11px;line-height:1.3;" onclick="preencherInformacoesProduto(this, 'dias úteis após pagamento pelo cliente de todo(s) o(s) vidro(s) desse respectivo item.')">Pagamento do(s) vidro(s)</button>
        <button type="button" class="btn btn-outline-secondary btn-sm text-start px-2" style="font-size:11px;line-height:1.3;" onclick="preencherInformacoesProduto(this, 'dias úteis após liberação/entrega do material pelo fornecedor à Ferreira Ulhoa.')">Liberação do fornecedor</button>
        <button type="button" class="btn btn-outline-secondary btn-sm text-start px-2" style="font-size:11px;line-height:1.3;" onclick="preencherInformacoesProduto(this, 'dias úteis após assinatura do contrato pelo cliente.')">Assinatura do contrato</button>
        <button type="button" class="btn btn-outline-primary btn-sm text-start px-2" style="font-size:11px;line-height:1.3;" onclick="preencherInformacoesProduto(this, '', true)">✏️ Personalizado</button>
      </div>
      <textarea
        name="informacoesProduto"
        class="form-control form-control-sm"
        rows="2"
        placeholder="Texto da condição de prazo"
        data-valor-original=""
        style="font-size:11px;resize:none;"
      ></textarea>
    </div>

    <!-- Separador -->
    <div class="col-12"><hr class="my-1" style="border-color:#e0e0e0;"></div>

    <!-- Datas de referência por item: um marcador por condição (só um fica marcado; marca sozinho pela condição).
         Salvo em parametros.referenciaPrazo = contrato | projeto | instalacao | vidros | fornecedor | personalizado -->
    <div class="col-12 ref-prazo-wrap">
      <label class="form-label fw-semibold mb-1" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;">Datas de Referência <span style="text-transform:none;letter-spacing:0;font-weight:400;color:#64748b;">· marque de qual data o prazo conta</span></label>
      <input type="hidden" name="referenciaPrazo" value="">
      <input type="hidden" name="usarAssinaturaProjetoRef" value="nao">
      <div class="d-flex flex-column" style="gap:4px;">
        ${_htmlCardsRefPrazo()}
      </div>
      <div class="ref-prazo-final" style="font-size:11px;color:#334155;margin-top:6px;" title="Data marcada + prazo em dias úteis (sem fins de semana e feriados)"></div>
    </div>

  </form>
</div>
                </div>
              </div>
              <div class="col-lg-8 grupo-tabela position-relative">
                <div class="input-group mb-3">
                  <input id="input-${idSuffix}" type="text" class="form-control form-control-sm"
                         placeholder="Pesquisar e incluir produto..."
                         oninput="mostrarSugestoes(this, '${idSuffix}')">
                  <button class="btn btn-primary btn-sm" type="button" onclick="incluirProduto('${idSuffix}')">Incluir</button>
                </div>
                <div id="sugestoes-${idSuffix}" class="tabela-sugestoes position-absolute bg-white shadow-sm" style="z-index:1000;"></div>
                <div class="table-responsive">
                  <table id="tabela-${idSuffix}" class="table table-sm table-bordered">
                    <thead class="table-light">
                      <tr>
                        <th>Utilização</th>
                        <th>Descrição</th>
                        <th>Custo Final</th>
                        <th>Custo Unit.</th>
                        <th>Código Omie</th>
                        <th>Unidade</th>
                        <th>Qtd.</th>
                        <th>Qtd. Des.</th>
                        <th style="white-space:nowrap;">Dt. Alt.</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody ondragover="event.preventDefault();" ondrop="handleDrop(event)"></tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2"><strong>Total</strong></td>
                        <td colspan="8"><strong>R$ 0,00</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div class="mt-3">
                    <textarea id="resumo-${idSuffix}" class="form-control form-control-sm" rows="6"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(bloco);
  window.travarAssinaturaProjetoKommo(bloco.querySelector('input[name="dataAssinaturaCliente"]'));
  atualizarPrazoBloco(bloco);

  const tbody = bloco.querySelector("tbody");
  if (tbody) {
    const observer = new MutationObserver(() => atualizarResumoDoGrupo(idSuffix));
    observer.observe(tbody, { childList: true, subtree: true });

    // Drag-and-drop
    const dragObserver = new MutationObserver(() => {
      const linhas = tbody.querySelectorAll("tr");
      linhas.forEach(linha => {
        if (!linha.hasAttribute("draggable")) {
          linha.setAttribute("draggable", "true");
          linha.addEventListener("dragstart", () => linha.classList.add("dragging"));
          linha.addEventListener("dragend", () => {
            linha.classList.remove("dragging");
            atualizarResumoDoGrupo(idSuffix);
          });
        }
      });
    });
    dragObserver.observe(tbody, { childList: true, subtree: true });
  }

  // Altura montante reativa
  const inputAltura = bloco.querySelector(`input[name='altura_montante']`);
  if (inputAltura) {
    inputAltura.addEventListener("input", () => atualizarResumoDoGrupo(idSuffix));
  }

  setTimeout(() => {
    if (typeof ativarRecalculoEmTodasTabelas === "function") ativarRecalculoEmTodasTabelas();
    if (typeof preencherValoresFinanceiros === "function") preencherValoresFinanceiros(idSuffix);
    if (typeof simularFocusEBlurEmTodosCamposFormula === "function") simularFocusEBlurEmTodosCamposFormula();
    atualizarResumoDoGrupo(idSuffix); // primeira renderização
  }, 1000);

  if (window.location.pathname.includes("criar.html")) {
    setTimeout(() => {
      atualizarPrecosOmieNaDOM();
    }, 1000);
  }

  return idSuffix;
}



function ativarInputsDescricaoComDelay() {
  setTimeout(() => {
    const inputs = document.querySelectorAll('input[type="text"][name="descricao"].form-control.form-control-sm');

    inputs.forEach(input => {
      // Dispara eventos de input e change para "reativar" lógicas ligadas a eles
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // Se quiser forçar algum valor, por exemplo, limpar ou reatribuir o mesmo texto:
      input.value = input.value; // Reatribui o próprio valor para forçar reatividade
    });

    console.log(`✅ ${inputs.length} inputs de descrição reativados após 1s`);
  }, 500);
}



// Função de drop que move as linhas
function handleDrop(event) {
  event.preventDefault();
  const dragged = document.querySelector(".dragging");
  const targetRow = event.target.closest("tr");
  if (!dragged || !targetRow || dragged === targetRow) return;

  const tbody = targetRow.closest("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const fromIndex = rows.indexOf(dragged);
  const toIndex = rows.indexOf(targetRow);

  if (fromIndex < toIndex) {
    targetRow.after(dragged);
  } else {
    targetRow.before(dragged);
  }
}



function ativarRecalculoEmTodasTabelas() {
  const tabelas = document.querySelectorAll("table[id^='tabela-bloco-']");
 

  tabelas.forEach((tabela, index) => {


    const atualizarLinha = (linha, tentativa = 0) => {
      const custoFinalCell = linha.querySelector(".custo-unitario");
      const custoUnitarioCell = linha.querySelector(".venda-unitaria");
      const inputQuantidade = linha.querySelector("input.quantidade");

      if (!custoFinalCell || !custoUnitarioCell || !inputQuantidade) {
        if (tentativa < 1) {
          console.warn("⚠️ Elemento ausente na linha. Tentando novamente em 2 segundos...", { custoFinalCell, custoUnitarioCell, inputQuantidade });
          setTimeout(() => atualizarLinha(linha, tentativa + 1), 2000);
        } else {
          console.error("❌ Elementos ainda ausentes após nova tentativa:", { custoFinalCell, custoUnitarioCell, inputQuantidade });
        }
        return;
      }

      const quantidade = parseFloat(inputQuantidade.value.replace(",", ".") || 1);

      const custoUnitario = parseFloat(

        custoUnitarioCell.textContent.replace("R$", "").replace(",", ".") ||
        0
      );

      const custoFinal = custoUnitario * quantidade;
      custoFinalCell.textContent = `R$ ${custoFinal.toFixed(2)}`;

     
    };

    const atualizarTotalTabela = (tabela) => {
      let total = 0;
      tabela.querySelectorAll("tbody tr").forEach(linha => {
        const valorStr = linha.querySelector(".custo-unitario")?.textContent?.replace("R$", "").replace(",", ".");
        const valor = parseFloat(valorStr || 0);
        total += valor;
      });
      const totalCell = tabela.querySelector("tfoot td strong");
      if (totalCell) {
        totalCell.textContent = `R$ ${total.toFixed(2)}`;
     
      }
    };

    // Escuta mudanças no campo .quantidade
    tabela.querySelectorAll("input.quantidade").forEach(input => {
      const linha = input.closest("tr");
      if (!linha) {
        console.warn("⚠️ Linha não encontrada para input.quantidade");
        return;
      }

     input.addEventListener("input", () => {
    atualizarLinha(linha);
    atualizarTotalTabela(tabela);

  const grupoId = tabela.id.replace("tabela-", ""); // ex: "tabela-bloco-0" → "bloco-0"
  console.log("📦 Grupo ID:", grupoId);

  preencherValoresFinanceiros(grupoId);
});


      atualizarLinha(linha); // Executa ao carregar

    });

    // Salva valor original de custo unitário
    tabela.querySelectorAll("tbody tr").forEach(linha => {
      const cell = linha.querySelector(".venda-unitaria");
      if (cell && !cell.dataset.valorOriginal) {
        const val = cell.textContent.replace("R$", "").replace(",", ".").trim();
        cell.dataset.valorOriginal = parseFloat(val || 0);
      
      }
    });

    atualizarTotalTabela(tabela); // Total inicial
    adicionarTotalizadoresPorAmbienteComAgrupamento();
  });
}

// Propaga #dataPedidoAssinado para todos os grupos ao alterar o campo global
document.addEventListener("change", function (e) {
  if (e.target.id !== "dataPedidoAssinado") return;
  const valor = e.target.value;
  document.querySelectorAll('.tab-pane input[name="dataPedidoAssinado"]').forEach(input => {
    input.value = valor;
  });
});



