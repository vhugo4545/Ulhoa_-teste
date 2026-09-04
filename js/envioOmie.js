



function vvDataPartesSemTimezone(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return {
      ano: String(valor.getFullYear()),
      mes: String(valor.getMonth() + 1).padStart(2, "0"),
      dia: String(valor.getDate()).padStart(2, "0")
    };
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  let match = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (match) {
    return { ano: match[1], mes: match[2], dia: match[3] };
  }

  match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return { ano: match[3], mes: match[2], dia: match[1] };
  }

  match = texto.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (match) {
    return { ano: match[1], mes: match[2], dia: match[3] };
  }

  const data = new Date(texto);
  if (isNaN(data.getTime())) return null;

  return {
    ano: String(data.getFullYear()),
    mes: String(data.getMonth() + 1).padStart(2, "0"),
    dia: String(data.getDate()).padStart(2, "0")
  };
}

function vvDataISO(valor) {
  const partes = vvDataPartesSemTimezone(valor);
  if (!partes) return "";
  return `${partes.ano}-${partes.mes}-${partes.dia}`;
}

function vvSomarMesesDataISO(valor, meses = 0) {
  const partes = vvDataPartesSemTimezone(valor);
  if (!partes) return "";

  const ano = Number(partes.ano);
  const mesIndex = Number(partes.mes) - 1;
  const dia = Number(partes.dia);
  const data = new Date(ano, mesIndex + Number(meses || 0), 1);
  const ultimoDiaMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();

  data.setDate(Math.min(dia, ultimoDiaMes));

  const anoFinal = String(data.getFullYear());
  const mesFinal = String(data.getMonth() + 1).padStart(2, "0");
  const diaFinal = String(data.getDate()).padStart(2, "0");
  return `${anoFinal}-${mesFinal}-${diaFinal}`;
}

function vvDataPrevisaoServicoParaOmie(valor) {
  if (!valor) return "";

  // A OS da Omie gera o vencimento um ciclo mensal apos a previsao.
  // Enviar um mes antes faz o vencimento bater com a data escolhida na parcela.
  if (window.VV_SERVICOS_COMPENSAR_MES_OMIE === false) {
    return vvDataISO(valor);
  }

  return vvSomarMesesDataISO(valor, -1);
}

function formatarDataBR(valor) {
  const partes = vvDataPartesSemTimezone(valor);
  if (!partes) return "";
  return `${partes.dia}/${partes.mes}/${partes.ano}`;
}

function mostrarPopupPendencias(pendencias) {
  const lista = document.getElementById("listaPendencias");
  lista.innerHTML = "";
  pendencias.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    lista.appendChild(li);
  });
  document.getElementById("popupPendencias").style.display = "block";
  document.getElementById("overlayPopup").style.display = "block";
}

function fecharPopupPendencias() {
  document.getElementById("popupPendencias").style.display = "none";
  document.getElementById("overlayPopup").style.display = "none";
}

function mostrarPopupCustomizado(titulo, mensagem, tipo = "info") {
  ocultarCarregando();
  const popupExistente = document.getElementById("popup-status-omie");
  if (popupExistente) popupExistente.remove();

  const corTitulo   = tipo === "success" ? "#16a34a" : tipo === "error" ? "#b91c1c" : "#1e40af";
  const corBotao    = tipo === "success" ? "#16a34a" : tipo === "error" ? "#b91c1c" : "#2563eb";
  const icone       = tipo === "success"
    ? `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><circle cx="11" cy="11" r="11" fill="${corTitulo}" opacity="0.15"/><path d="M6.5 11.5L9.5 14.5L15.5 8.5" stroke="${corTitulo}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : tipo === "error"
    ? `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><circle cx="11" cy="11" r="11" fill="${corTitulo}" opacity="0.15"/><line x1="11" y1="6.5" x2="11" y2="12.5" stroke="${corTitulo}" stroke-width="2.2" stroke-linecap="round"/><circle cx="11" cy="15.5" r="1.2" fill="${corTitulo}"/></svg>`
    : `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><circle cx="11" cy="11" r="11" fill="${corTitulo}" opacity="0.15"/><line x1="11" y1="6.5" x2="11" y2="12.5" stroke="${corTitulo}" stroke-width="2.2" stroke-linecap="round"/><circle cx="11" cy="15.5" r="1.2" fill="${corTitulo}"/></svg>`;

  const overlay = document.createElement("div");
  overlay.id = "popup-status-omie";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;";

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:28px 32px;max-width:460px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${icone}
        <span style="font-size:17px;font-weight:700;color:${corTitulo};">${titulo}</span>
      </div>
      <div style="font-size:13.5px;color:#374151;line-height:1.6;">${mensagem}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button id="_vv_popup_fechar" style="padding:9px 24px;border:none;border-radius:8px;background:${corBotao};color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:filter 0.15s;">Fechar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector("#_vv_popup_fechar").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#_vv_popup_fechar").addEventListener("mouseover", function(){ this.style.filter="brightness(0.9)"; });
  overlay.querySelector("#_vv_popup_fechar").addEventListener("mouseout",  function(){ this.style.filter="brightness(1)"; });
}

function gerarNumeroPedidoUnico() {
  const agora = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const ano = agora.getFullYear().toString().slice(-2);
  const mes = pad(agora.getMonth() + 1);
  const dia = pad(agora.getDate());
  const hora = pad(agora.getHours());
  const minuto = pad(agora.getMinutes());
  const segundo = pad(agora.getSeconds());
  const milesimo = String(agora.getMilliseconds()).padStart(3, "0");
  const aleatorio = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${ano}${mes}${dia}${hora}${minuto}${segundo}${milesimo}${aleatorio}`;
}

function gerarCodigoIntegracaoOmie(prefixo = "OMIE") {
  const agora = new Date();
  const pad = n => String(n).padStart(2, "0");
  const timestamp = [
    agora.getFullYear(),
    pad(agora.getMonth() + 1),
    pad(agora.getDate()),
    pad(agora.getHours()),
    pad(agora.getMinutes()),
    pad(agora.getSeconds()),
    String(agora.getMilliseconds()).padStart(3, "0")
  ].join("");
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefixo}-${timestamp}-${aleatorio}`;
}

const CONTATOR_ULHOA_API_BASE = (
  window.CONTATOR_ULHOA_API_BASE ||
  "https://contator-ulhoa-3d28d89efa68.herokuapp.com"
).replace(/\/+$/, "");

async function garantirNumeroPedidoPreenchido() {
  const campoNumeroPedido = document.getElementById("numeroPedido");

  if (!campoNumeroPedido) {
    throw new Error("Campo #numeroPedido nao encontrado para preencher o numero do pedido.");
  }

  const numeroAtual = String(
    campoNumeroPedido.value?.trim?.() ||
    campoNumeroPedido.dataset?.valorOriginal?.trim?.() ||
    campoNumeroPedido.getAttribute("data-valor-original")?.trim?.() ||
    campoNumeroPedido.textContent?.trim?.() ||
    ""
  ).trim();

  if (numeroAtual) {
    campoNumeroPedido.value = numeroAtual;
    campoNumeroPedido.dataset.valorOriginal = numeroAtual;
    campoNumeroPedido.setAttribute("data-valor-original", numeroAtual);
    return numeroAtual;
  }

  const resposta = await fetch(`${CONTATOR_ULHOA_API_BASE}/pedido`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Nao foi possivel buscar o proximo numero do pedido. HTTP ${resposta.status}.`);
  }

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    throw new Error("A resposta da API de pedido veio invalida.");
  }

  const numeroPedido = [
    dados?.pedido_proximo,
    dados?.numero,
    dados?.pedido,
    dados?.proximo,
    dados?.next
  ]
    .map(valor => String(valor ?? "").trim())
    .find(Boolean);

  if (!numeroPedido) {
    throw new Error("A API nao retornou um numero de pedido valido.");
  }

  campoNumeroPedido.value = numeroPedido;
  campoNumeroPedido.dataset.valorOriginal = numeroPedido;
  campoNumeroPedido.setAttribute("data-valor-original", numeroPedido);
  campoNumeroPedido.dispatchEvent(new Event("input", { bubbles: true }));
  campoNumeroPedido.dispatchEvent(new Event("change", { bubbles: true }));

  return numeroPedido;
}

window.garantirNumeroPedidoPreenchido = garantirNumeroPedidoPreenchido;
window.__vvEnvioOmieVersion = "2026-04-24-cliente-servicos-fonte-correta-v19";

const OMIE_ULHOA_API_BASE = (
  window.OMIE_ULHOA_API_BASE ||
  "https://ulhoa-vidros-1ae0adcf5f73.herokuapp.com"
).replace(/\/+$/, "");

const OMIE_SERVICOS_API_BASE = (
  window.OMIE_SERVICOS_API_BASE ||
  "https://ulhoa-servico-ec4e1aa95355.herokuapp.com"
).replace(/\/+$/, "");

const OMIE_PROJETOS_ENDPOINT = (
  window.OMIE_PROJETOS_ENDPOINT ||
  `${OMIE_ULHOA_API_BASE}/api/omie/projetos`
).replace(/\/+$/, "");

const OMIE_PROJETOS_SERVICOS_ENDPOINT = (
  window.OMIE_PROJETOS_SERVICOS_ENDPOINT ||
  `${OMIE_SERVICOS_API_BASE}/api/omie/projetos`
).replace(/\/+$/, "");

async function vvGarantirProjetoOmiePorPedidoBase(numeroPedido, {
  force = false,
  endpoint = OMIE_PROJETOS_ENDPOINT,
  cacheKey = "__vvProjetosOmiePorPedido",
  ultimoKey = "__vvUltimoProjetoOmie",
  origem = "produtos"
} = {}) {
  const nomeProjeto = String(numeroPedido || "").trim();

  if (!nomeProjeto) {
    throw new Error("Numero do pedido ausente para criar o projeto na Omie.");
  }

  window[cacheKey] = window[cacheKey] || {};
  const cache = window[cacheKey][nomeProjeto];

  if (!force && cache?.codigo) {
    return Number(cache.codigo);
  }

  const codint = `PROJ-${Date.now()}`.slice(0, 20);

  console.group(`🚀 [CRIAR PROJETO OMIE ${origem.toUpperCase()}]`);
  console.log("numeroPedido:", nomeProjeto);
  console.log("codint:", codint);
  console.log("endpoint:", endpoint);
  console.groupEnd();

  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      codint,
      nome: nomeProjeto,
      inativo: "N"
    })
  });

  const json = await resposta.json().catch(() => ({}));

  console.group(`📥 [CRIAR PROJETO OMIE ${origem.toUpperCase()}] Resposta`);
  console.log("HTTP status:", resposta.status);
  console.log("ok:", resposta.ok);
  console.log("Resposta completa:", json);
  console.groupEnd();

  const codigoProjeto = Number(json?.omie?.codigo || 0);

  if (!resposta.ok || json?.ok === false || !(codigoProjeto > 0)) {
    throw new Error(
      json?.error ||
      json?.message ||
      json?.omie?.descricao ||
      `Falha ao criar projeto na Omie para o pedido ${nomeProjeto}.`
    );
  }

  const projeto = {
    numeroPedido: nomeProjeto,
    codigo: codigoProjeto,
    codint,
    endpoint,
    origem,
    resposta: json
  };

  window[cacheKey][nomeProjeto] = projeto;
  window[ultimoKey] = projeto;
  window.__vvUltimoProjetoOmie = projeto;

  return codigoProjeto;
}

async function vvGarantirProjetoOmiePorPedido(numeroPedido, { force = false } = {}) {
  return vvGarantirProjetoOmiePorPedidoBase(numeroPedido, {
    force,
    endpoint: OMIE_PROJETOS_ENDPOINT,
    cacheKey: "__vvProjetosOmiePorPedido",
    ultimoKey: "__vvUltimoProjetoOmie",
    origem: "produtos"
  });
}

async function vvGarantirProjetoOmieServicoPorPedido(numeroPedido, { force = false } = {}) {
  return vvGarantirProjetoOmiePorPedidoBase(numeroPedido, {
    force,
    endpoint: OMIE_PROJETOS_SERVICOS_ENDPOINT,
    cacheKey: "__vvProjetosOmieServicoPorPedido",
    ultimoKey: "__vvUltimoProjetoOmieServico",
    origem: "servicos"
  });
}

window.vvGarantirProjetoOmiePorPedido = vvGarantirProjetoOmiePorPedido;
window.vvGarantirProjetoOmieServicoPorPedido = vvGarantirProjetoOmieServicoPorPedido;
window.criarProjetoTeste = async function criarProjetoTeste() {
  const numeroPedido = await garantirNumeroPedidoPreenchido();
  const codigoProjeto = await vvGarantirProjetoOmiePorPedido(numeroPedido, { force: true });
  return {
    ok: true,
    numeroPedido,
    codigoProjeto,
    projeto: window.__vvUltimoProjetoOmie || null
  };
};
window.criarProjetoServicoTeste = async function criarProjetoServicoTeste() {
  const numeroPedido = await garantirNumeroPedidoPreenchido();
  const codigoProjeto = await vvGarantirProjetoOmieServicoPorPedido(numeroPedido, { force: true });
  return {
    ok: true,
    numeroPedido,
    codigoProjeto,
    projeto: window.__vvUltimoProjetoOmieServico || null
  };
};




// ============================================================================
//  BLOCO ÚNICO — ENVIO PARA OMIE (COMPLETO E AJUSTADO)
//  - Helpers (formatos, BRL, data, UI stubs)
//  - Coleta (1º item por grupo)
//  - Popup de seleção (rateia Serviços %/R$)
//  - Geração do payload (mantendo estrutura antiga)
//  - Envio (atualizarNaOmie)
//  - Stubs defensivos p/ funções externas ausentes
//  - Tudo exposto no window.*
// ============================================================================

/* =========================
   0) SHIMS / HELPERS GLOBAIS
   ========================= */
(function ensureHelpers(){
  // Visual (stubs para não quebrar se não existirem)
  window.mostrarCarregando      ||= function(){ /* opcional: mostrar overlay */ };
  window.ocultarCarregando      ||= function(){ /* opcional: esconder overlay */ };
  window.mostrarPopupCustomizado ||= function(titulo, msg, tipo){
    // substitua pela sua lib de popup se quiser
    alert((tipo ? `[${tipo.toUpperCase()}] ` : "") + titulo + "\n" + (msg || ""));
  };
  window.mostrarPopupPendencias ||= function(pendencias){
    alert("Pendências:\n- " + pendencias.join("\n- "));
  };

  // Formatação de datas
  window.formatarDataBR ||= function(iso){
    if (!iso) return "";
    const v = String(iso).trim();
    // ISO puro YYYY-MM-DD: split direto, sem new Date() para evitar fuso
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-");
      return `${d}/${m}/${y}`;
    }
    // datetime ISO: YYYY-MM-DDTHH:mm:ss
    const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d}/${m}/${y}`;
    }
    // fallback com UTC
    const d = new Date(v);
    if (isNaN(d)) return "";
    const dd = String(d.getUTCDate()).padStart(2,"0");
    const mm = String(d.getUTCMonth()+1).padStart(2,"0");
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  };

  // Números / dinheiro
  window.vv_round2 ||= (n) => Math.round((Number(n)||0) * 100) / 100;

  window.vv_parseBRL ||= function(str){
    if (str == null) return 0;
    let s = String(str).trim();
    if (!s) return 0;
    s = s.replace(/[^\d.,-]/g, '');
    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');
    const lastSep   = Math.max(lastComma, lastDot);
    if (lastSep >= 0){
      const intPart  = s.slice(0, lastSep).replace(/[^\d-]/g, '');
      const fracPart = s.slice(lastSep + 1).replace(/\D/g, '');
      const normalized = intPart + '.' + fracPart;
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }
    const only = s.replace(/[^\d-]/g,'');
    return parseFloat(only) || 0;
  };

  window.vv_fmtBRL ||= function(n){
    return (Number(n)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  };

  // Número de pedido (fallback)
  window.gerarNumeroPedidoUnico ||= function(){ return 'PED-' + Date.now(); };

  // Ambientes marcados (fallback)
  window.lerAmbientesMarcados ||= function(){
  return Array.from(document.querySelectorAll(".ambiente-toggle:checked"))
    .map(cb => {
      const label = cb.closest(".form-check")?.querySelector("label")?.textContent || "";
      const m = label.match(/"([^"]+)"/);
      return m ? m[1].trim() : null;
    })
    .filter(Boolean);
};
})();

/* =======================================
   1) CSS do MODAL (injeção, uma única vez)
   ======================================= */
(function ensureModalStyles(){
  if (document.getElementById('selecao-omie-styles')) return;
  const style = document.createElement('style');
  style.id = 'selecao-omie-styles';
  style.textContent = `
  .vv-modal-backdrop{
    position: fixed; inset: 0;
    background: rgba(0,0,0,.45);
    display:flex; align-items:center; justify-content:center;
    z-index: 9999;
  }
  .vv-modal{
    width: min(1500px);
    background: #fff; border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,.22);
    overflow: hidden; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
  }
  .vv-modal header{
    padding: 16px 20px; border-bottom: 1px solid #eee; background: #f8fafc;
    display:flex; align-items:center; gap: 8px;
  }
  .vv-modal header h3{ margin:0; font-size: 18px; font-weight: 600; }
  .vv-modal .vv-body{ padding: 16px 20px; max-height: 60vh; overflow:auto; }
  .vv-help{ color:#475569; font-size:14px; margin-bottom: 8px; }
  .vv-table{ width:100%; border-collapse: collapse; }
  .vv-table th, .vv-table td{ padding:10px; border-bottom:1px solid #eee; vertical-align: middle; }
  .vv-table th{ text-align:left; font-size:12px; letter-spacing:.02em; color:#64748b; font-weight:600; background:#f8fafc; position: sticky; top: 0; }
  .vv-table td small{ color:#64748b; }
  .vv-right{ text-align:right; }
  .vv-mono{ font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
  .vv-footer{ padding: 14px 20px; border-top: 1px solid #eee; display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fafafa;}
  .vv-footer .totais{ font-size: 14px; color:#334155;}
  .vv-btn{
    appearance:none; border:1px solid #e2e8f0; background:#fff; padding:10px 14px; border-radius:10px; cursor:pointer;
    font-weight:600;
  }
  .vv-btn:hover{ background:#f8fafc; }
  .vv-btn.primary{ background:#2563eb; border-color:#2563eb; color:#fff; }
  .vv-btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
  .vv-transfer-grid{
    display:grid;
    gap:12px;
    grid-template-columns:1fr 1fr;
    align-items:stretch;
  }
  .vv-transfer-panel{
    display:flex;
    flex-direction:column;
    gap:12px;
    border:1px solid #e2e8f0;
    border-radius:14px;
    padding:14px;
    background:#fff;
    min-height:320px;
  }
  .vv-transfer-summary{
    display:grid;
    gap:8px;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    padding:12px;
    border:1px solid #e2e8f0;
    border-radius:12px;
    background:#f8fafc;
  }
  .vv-transfer-list{
    min-height:180px;
    display:flex;
    flex-direction:column;
    gap:10px;
    flex:1;
    padding:10px;
    border:2px dashed #cbd5e1;
    border-radius:12px;
    background:#f8fbff;
    transition:border-color .15s ease, background .15s ease;
  }
  .vv-transfer-list.is-over{
    border-color:#2563eb;
    background:#eff6ff;
  }
  .vv-transfer-empty{
    margin:0;
    display:flex;
    align-items:center;
    justify-content:center;
    flex:1;
    color:#64748b;
    font-size:13px;
    text-align:center;
    padding:12px 8px;
  }
  .vv-parcela-card{
    border:1px solid #e2e8f0;
    border-radius:12px;
    padding:12px;
    background:#fff;
    box-shadow:0 2px 8px rgba(15,23,42,.05);
  }
  .vv-parcela-card.is-dragging{
    opacity:.6;
  }
  .vv-parcela-card.vv-ignorada{
    opacity:.55;
    background:#fafafa;
    border-color:#e2e8f0;
    border-style:dashed;
  }
  .vv-parcela-card.vv-ignorada .row{
    pointer-events:none;
    user-select:none;
  }
  .vv-ignorar-label{
    display:inline-flex;
    align-items:center;
    gap:6px;
    font-size:12px;
    font-weight:600;
    color:#b42318;
    cursor:pointer;
    user-select:none;
    padding:2px 8px;
    border:1px solid #f5b5b5;
    border-radius:6px;
    background:#fff5f5;
    transition:background .12s;
  }
  .vv-ignorar-label:has(input:checked){
    background:#fee2e2;
    color:#7f1d1d;
  }
  .vv-ignorar-label input{
    margin:0;
    cursor:pointer;
  }
  .vv-parcela-head{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
    margin-bottom:8px;
  }
  .vv-drag-handle{
    display:inline-flex;
    align-items:center;
    gap:6px;
    color:#475569;
    font-size:12px;
    font-weight:600;
    cursor:grab;
    user-select:none;
  }
  .vv-transfer-actions{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
  }
  .vv-btn.danger{
    color:#b42318;
    border-color:#f5b5b5;
    background:#fff5f5;
  }
  @media (max-width: 900px){
    .vv-modal{
      width:min(96vw, 1500px);
    }
    .vv-footer{
      flex-direction:column;
      align-items:stretch;
    }
  }
  `;
  document.head.appendChild(style);
})();

/* =========================================================
   DIAGNÓSTICO DE BLOCOS — chame diagnosticarBlocos() no console
   ========================================================= */
window.diagnosticarBlocos = function () {
  const blocos = document.querySelectorAll("[id^='bloco-']");
  console.group(`🔬 diagnosticarBlocos — ${blocos.length} bloco(s) encontrado(s)`);

  blocos.forEach((bloco) => {
    const grupoId = bloco.id;
    const inputAmb = bloco.querySelector("input[placeholder='Ambiente'][data-id-grupo]");
    const nomeAmbiente = (inputAmb?.value || "").trim() || "(sem nome)";

    console.group(`📦 ${grupoId} — "${nomeAmbiente}"`);

    // Tabela
    const tabela = bloco.querySelector("table") || bloco.querySelector(".table");
    const tfootEl = tabela?.querySelector("tfoot tr td:last-child strong");
    console.log("tfoot strong:", tfootEl?.textContent?.trim() || "(não encontrado)");

    // Resumo
    const resumoEl = bloco.querySelector(".resumo-totalizador-interno");
    console.log(".resumo-totalizador-interno:", resumoEl ? "✅ encontrado" : "❌ NÃO encontrado");

    if (resumoEl) {
      const cols = resumoEl.querySelectorAll(".row > .col, .col");
      console.log(`  Colunas encontradas: ${cols.length}`);
      let _custo = 0, _sugerido = 0;
      cols.forEach((col, i) => {
        const titulo = col.querySelector(".text-muted")?.textContent?.replace(/\s+/g, " ")?.trim() || "(sem .text-muted)";
        const valor  = col.querySelector(".fw-bold")?.textContent?.trim() || "(sem .fw-bold)";
        const parsed = typeof vv_parseBRL !== 'undefined' ? vv_parseBRL(valor) : 0;
        const t = titulo.toLowerCase();
        if (t.includes("custo") && t.includes("material")) _custo = parsed;
        if (t.includes("sugerido")) _sugerido = parsed;
        console.log(`  [${i}] "${titulo}" → "${valor}" (parsed: ${parsed})`);
      });
      console.log(`  ✅ CUSTO MATERIAL → R$ ${_custo.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
      console.log(`  ✅ VALOR SUGERIDO → R$ ${_sugerido.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
    } else {
      // Tenta variantes
      const alt1 = bloco.querySelector(".resumo-totalizador");
      const alt2 = bloco.querySelector("[class*='resumo']");
      console.log("  Alternativas: .resumo-totalizador =", alt1 ? "✅" : "❌",
                  "| [class*=resumo] =", alt2?.className || "❌");
    }

    // MO hora
    const primeiraLinha = tabela?.querySelector("tbody tr");
    const td2 = primeiraLinha?.querySelector("td:nth-child(2)");
    console.log("  Descrição 1ª linha:", td2?.textContent?.trim() || "(não encontrado)");

    console.groupEnd();
  });

  console.groupEnd();
};

/* =========================================================
   2) COLETAR ITENS (1º produto por grupo + total por grupo)
   ========================================================= */
function coletarItensPorGrupoParaOmie(ambientesMarcados = []) {
  const itens = [];
  const blocos = document.querySelectorAll("[id^='bloco-']");

  const ambientesMarcadosNormalizados = Array.isArray(ambientesMarcados)
    ? ambientesMarcados.map(a => normalizarAmbienteOmie(a)).filter(Boolean)
    : [];

  console.log("✅ Ambientes marcados (originais):", ambientesMarcados);
  console.log("✅ Ambientes marcados (normalizados):", ambientesMarcadosNormalizados);

  blocos.forEach((bloco) => {
    const grupoId = bloco.id || "(sem-id)";
    const inputAmb = bloco.querySelector("input[placeholder='Ambiente'][data-id-grupo]");
    const nomeAmbiente = (inputAmb?.value || inputAmb?.getAttribute("value") || "").trim() || "Ambiente não identificado";
    const nomeAmbienteNormalizado = normalizarAmbienteOmie(nomeAmbiente);

    console.log("âž¡️ Bloco:", grupoId, "| Ambiente bruto:", nomeAmbiente, "| Ambiente normalizado:", nomeAmbienteNormalizado);

    if (ambientesMarcadosNormalizados.length > 0) {
      if (!ambientesMarcadosNormalizados.includes(nomeAmbienteNormalizado)) {
        console.log("â›” Bloco ignorado por ambiente não marcado:", grupoId, nomeAmbiente);
        return;
      }
    }

    const tabela =
      bloco.querySelector("table") ||
      bloco.querySelector(".tabela-grupo table") ||
      bloco.querySelector(".table");

    if (!tabela) {
      console.log("â›” Bloco sem tabela:", grupoId);
      return;
    }

    const linhas = tabela.querySelectorAll("tbody tr");
    if (!linhas || !linhas.length) {
      console.log("â›” Bloco sem linhas:", grupoId);
      return;
    }

    let valorTotalGrupo = 0;
    const totalGrupoEl = tabela.querySelector("tfoot tr td:last-child strong");

    if (totalGrupoEl && totalGrupoEl.textContent) {
      valorTotalGrupo = vv_parseBRL(totalGrupoEl.textContent);
    } else {
      const byDataTotal = tabela.querySelector("[data-total-grupo]")?.textContent;
      const byClassTotal = tabela.querySelector(".total-grupo, .totalGrupo, .valor-total-grupo")?.textContent;
      const textoTotal = byDataTotal || byClassTotal || "0";
      valorTotalGrupo = vv_parseBRL(textoTotal);
    }

    // Lê Valor Sugerido e Custo Total de Material do resumo do bloco
    let valorCustoMaterial = 0;
    let valorSugerido = 0;
    const resumoEl = bloco.querySelector(".resumo-totalizador-interno");
    if (resumoEl) {
      const cols = resumoEl.querySelectorAll(".row > .col, .col");
      for (const col of cols) {
        const titulo = col.querySelector(".text-muted")?.textContent?.replace(/\s+/g, " ")?.trim()?.toLowerCase() || "";
        const valorTexto = (col.querySelector(".fw-bold")?.textContent || "").trim();
        if (titulo.includes("custo") && titulo.includes("material")) {
          valorCustoMaterial = vv_parseBRL(valorTexto);
        } else if (titulo.includes("valor sugerido") || titulo.includes("sugerido")) {
          valorSugerido = vv_parseBRL(valorTexto);
        }
      }
    }
    // Usa Valor Sugerido como base quando disponível; caso contrário mantém o total do tfoot
    if (valorSugerido > 0) valorTotalGrupo = valorSugerido;

    const primeiraLinha = linhas[0];
    const td2 = primeiraLinha.querySelector("td:nth-child(2)");
    const td5 = primeiraLinha.querySelector("td:nth-child(5)");

    const descricao =
      (td2?.textContent || td2?.querySelector("input,textarea")?.value || "").trim() ||
      (primeiraLinha.querySelector(".descricao, .nome, .produto-descricao")?.textContent || "").trim() ||
      "Item sem descrição";

    const codigo =
      (td5?.textContent || td5?.querySelector("input")?.value || "").trim() ||
      (primeiraLinha.querySelector(".codigo, .sku, .produto-codigo")?.textContent || "").trim() ||
      "";

    const key = `${grupoId}::${codigo || descricao}`;

    itens.push({
      key,
      grupoId,
      ambiente: nomeAmbiente,
      codigo,
      descricao,
      valorTotalGrupo: Number(valorTotalGrupo) || 0,
      valorCustoMaterial: Number(valorCustoMaterial) || 0, // ✅ NOVO
    });

    console.log("✅ Item elegível adicionado:", {
      grupoId,
      ambiente: nomeAmbiente,
      codigo,
      descricao,
      valorTotalGrupo,
      valorSugerido,
      valorCustoMaterial,
    });
  });

  console.log("📦 Itens coletados para Omie:", itens);
  return itens;
}

/* ============================================
   3) POPUP DE SELEÇÃO + RATEIO DE SERVIÇOS
   ============================================ */
/* =========================================================
   1) COMISSÕES → OMIE (função global usada pelo popup)
   ---------------------------------------------------------
   - Mantém a assinatura: window.enviarComissoes(payload)
   - Envia arquiteto e vendedor em paralelo para sua rota
    https://ulhoa-vidros-1ae0adcf5f73.herokuapp.com/api/omie/comissao
   - Dispara eventos:
       vv:comissoes:prontas    (antes do POST)
       vv:comissoes:enviadas   (após POST, com resultados)
   ========================================================= */



/* =========================================================
   2) POPUP DE SELEÇÃO + RATEIO + ENVIO DE COMISSÕES
   ---------------------------------------------------------
   - NÃO altera nada além do que você pediu
   - Inclui previsão/vencimento/observação para Arquiteto e Vendedor
   - Chama window.enviarComissoes(...) no confirmar
   ========================================================= */

async function verificarClienteEAtualizar_REMOVIDA() {
  const inp = document.querySelector(
    '#clientesWrapper > div > div.col-md-6.position-relative.d-flex.align-items-end.gap-2 > div > input, ' +
    'input.form-control.razaoSocial'
  );

  if (!inp) {
    console.warn("⚠️ verificarClienteEAtualizar: input de razão social não encontrado.");
    return;
  }

  const norm = s => (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.\-\/\s]/g, "")
    .trim();

  const normNome = s => (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const razaoSocialAlvo = normNome(inp.value || inp.dataset.valorOriginal);
  if (!razaoSocialAlvo) {
    console.warn("⚠️ verificarClienteEAtualizar: razão social vazia.");
    return;
  }

  const cnpjEl = document.querySelector(
    '#clientesWrapper .cliente-item .cnpjCliente, ' +
    '#clientesWrapper .cliente-item input[placeholder*="CNPJ"], ' +
    '#clientesWrapper .cliente-item .cnpj'
  );
  const cnpjAlvo = norm(cnpjEl?.value || cnpjEl?.dataset?.valorOriginal || "");

  console.group("🔎 [verificarClienteEAtualizar]");
  console.log("Razão social buscada:", razaoSocialAlvo);
  console.log("CNPJ buscado:", cnpjAlvo || "(não encontrado)");

  const [resServico, resLocal] = await Promise.all([
    fetch("https://ulhoa-servico-ec4e1aa95355.herokuapp.com/clientes")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null),
    fetch("https://ulhoa-0a02024d350a.herokuapp.com/clientes/visualizar")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  ]);

  const listaServico = Array.isArray(resServico?.clientes) ? resServico.clientes
    : Array.isArray(resServico) ? resServico : [];

  const listaLocal = Array.isArray(resLocal?.clientes) ? resLocal.clientes
    : Array.isArray(resLocal) ? resLocal : [];

  if (listaServico.length) window.listaClientesServico = listaServico;

  console.group("📋 Estrutura da API de serviços (primeiro cliente)");
  console.log(listaServico[0] ?? "(lista vazia)");
  console.groupEnd();

  console.group("📋 Estrutura da API local (primeiro cliente)");
  console.log(listaLocal[0] ?? "(lista vazia)");
  console.groupEnd();

  function clienteBate(c) {
    const nomeCliente = normNome(c.razao_social || c.nome_fantasia || c.nome || "");
    const cnpjCliente = norm(c.cnpj || c.cpf_cnpj || c.documento || "");

    if (nomeCliente && nomeCliente === razaoSocialAlvo) return true;
    if (nomeCliente && (nomeCliente.includes(razaoSocialAlvo) || razaoSocialAlvo.includes(nomeCliente))) return true;
    if (cnpjAlvo && cnpjCliente && cnpjCliente === cnpjAlvo) return true;

    return false;
  }

  const existeServico = listaServico.some(clienteBate);
  const existeLocal   = listaLocal.some(clienteBate);

  console.log("Existe na API de serviços?", existeServico);
  console.log("Existe na API local?", existeLocal);

  if (!existeServico) {
    const candidatos = listaServico
      .filter(c => {
        const n = normNome(c.razao_social || c.nome_fantasia || c.nome || "");
        return n.includes(razaoSocialAlvo.slice(0, 6)) || razaoSocialAlvo.includes(n.slice(0, 6));
      })
      .slice(0, 5);
    console.warn("❌ NÃO encontrado na API serviços. Candidatos próximos:", candidatos);
  }

  if (!existeLocal) {
    const candidatos = listaLocal
      .filter(c => {
        const n = normNome(c.razao_social || c.nome_fantasia || c.nome || "");
        return n.includes(razaoSocialAlvo.slice(0, 6)) || razaoSocialAlvo.includes(n.slice(0, 6));
      })
      .slice(0, 5);
    console.warn("❌ NÃO encontrado na API local. Candidatos próximos:", candidatos);
  }

  console.groupEnd();

  if (!existeServico || !existeLocal) {
    alert("Cliente não encontrado em ambas as bases. Atualizando lista de clientes…");
    if (typeof dispararAtualizacaoClientes === "function") {
      dispararAtualizacaoClientes();
    }
  } else {
    const clienteServico = listaServico.find(clienteBate);
    const clienteLocal   = listaLocal.find(clienteBate);

    console.group("✅ [verificarClienteEAtualizar] Cliente ENCONTRADO nas duas bases");
    console.log("Razão social buscada:", razaoSocialAlvo);
    console.log("CNPJ buscado:", cnpjAlvo || "(não informado)");

    console.group("📦 API de Serviços");
    console.log("razao_social:",       clienteServico?.razao_social    || "—");
    console.log("nome_fantasia:",      clienteServico?.nome_fantasia   || "—");
    console.log("cnpj:",               clienteServico?.cnpj            || clienteServico?.cpf_cnpj || clienteServico?.documento || "—");
    console.log("codigo_cliente_omie:", clienteServico?.codigo_cliente_omie || "—");
    console.groupEnd();

    console.group("📦 API Local");
    console.log("razao_social:",       clienteLocal?.razao_social    || "—");
    console.log("nome_fantasia:",      clienteLocal?.nome_fantasia   || "—");
    console.log("cnpj:",               clienteLocal?.cnpj            || clienteLocal?.cpf_cnpj || clienteLocal?.documento || "—");
    console.log("codigo_cliente_omie:", clienteLocal?.codigo_cliente_omie || "—");
    console.groupEnd();

    console.groupEnd();
  }
}

const VV_CLIENTES_VISUALIZAR_URL = "https://ulhoa-0a02024d350a.herokuapp.com/clientes/visualizar";
const VV_CLIENTES_SERVICO_URL = "https://ulhoa-servico-ec4e1aa95355.herokuapp.com/clientes";

function vvNormalizarNomeClienteOmie(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function vvExtrairListaClientesVisualizar(payload) {
  if (Array.isArray(payload?.clientes)) return payload.clientes;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function vvCarregarClientesVisualizar({ force = false } = {}) {
  window.__vvClientesVisualizarCache = window.__vvClientesVisualizarCache || {
    lista: [],
    fetchedAt: 0
  };

  const cache = window.__vvClientesVisualizarCache;
  if (!force && Array.isArray(cache.lista) && cache.lista.length) {
    return cache.lista;
  }

  const resposta = await fetch(VV_CLIENTES_VISUALIZAR_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!resposta.ok) {
    throw new Error(`Nao foi possivel carregar clientes para comissao. HTTP ${resposta.status}.`);
  }

  const json = await resposta.json().catch(() => null);
  const lista = vvExtrairListaClientesVisualizar(json);

  cache.lista = Array.isArray(lista) ? lista : [];
  cache.fetchedAt = Date.now();

  if (cache.lista.length) {
    window.__vvClientesVisualizarLista = cache.lista;
  }

  return cache.lista;
}

function vvEncontrarClienteVisualizarPorNome(nome, lista = []) {
  const alvo = vvNormalizarNomeClienteOmie(nome);
  if (!alvo) return null;

  const base = Array.isArray(lista) ? lista : [];

  let match = base.find(cliente => (
    vvNormalizarNomeClienteOmie(
      cliente?.razao_social ||
      cliente?.nome_fantasia ||
      cliente?.nome ||
      ""
    ) === alvo
  ));

  if (match) return match;

  match = base.find(cliente => {
    const nomeCliente = vvNormalizarNomeClienteOmie(
      cliente?.razao_social ||
      cliente?.nome_fantasia ||
      cliente?.nome ||
      ""
    );
    return nomeCliente.includes(alvo) || alvo.includes(nomeCliente);
  });

  return match || null;
}

async function vvBuscarCodigoClienteOmiePorNome(nome, { force = false } = {}) {
  const alvo = String(nome || "").trim();
  if (!alvo) return "";

  const lista = await vvCarregarClientesVisualizar({ force });
  const cliente = vvEncontrarClienteVisualizarPorNome(alvo, lista);

  if (!cliente) return "";

  const codigo = Number(
    cliente?.codigo_cliente_omie ||
    cliente?.codigoClienteOmie ||
    cliente?.codigo ||
    0
  ) || 0;

  return codigo > 0 ? String(codigo) : "";
}

window.vvBuscarCodigoClienteOmiePorNome = vvBuscarCodigoClienteOmiePorNome;

const VV_CONDICOES_PAGTO_PARCELAS = [
  { value: "avista", label: "3 dias apos finalizar instalacao completa." },
  { value: "na-retirada", label: "3 dias apos finalizar instalacao da estrutura." },
  { value: "30-dias", label: "3 dias apos finalizar instalacao dos vidros." },
  { value: "entrada+30", label: "Na retirada/entrega do produto." },
  { value: "personalizado", label: "Personalizado" },
  // Retrocompatibilidade: valores do select #condicaoPagamento antigo
  { value: "debito_40_40_20", label: "40% de entrada, 40% após 30 dias e 20% após 60 dias." },
  { value: "debito_40_30_30", label: "40% de entrada, 30% após 30 dias e 30% após 60 dias." },
  { value: "debito_60_40",    label: "60% de entrada, 40% após 30 dias." },
  { value: "parcelado",       label: "Personalizado" }
];

/* Converte códigos antigos do sistema para os códigos Omie (tipo_documento_cadastro).
   Aceita tanto o valor antigo quanto o novo — idempotente. */
const _VV_MEIO_PAG_MAP = {
  CRC:  "03", CRCP: "03",          // Cartão de Crédito / Parcelado
  CRD:  "04",                      // Cartão de Débito
  DIN:  "01",                      // Dinheiro
  BOLV: "15", BOLR: "15",          // Boleto
  PIX:  "17",                      // PIX Dinâmico
  TED:  "18",                      // TED
  PER:  "99"                       // Outros / Permuta
};

function vvNormalizarCodigoMeioPagamento(codigo) {
  const s = String(codigo || "").trim();
  if (!s) return "";
  // já é código Omie numérico → devolve como está
  if (/^\d+$/.test(s)) return s;
  // código antigo → converte
  return _VV_MEIO_PAG_MAP[s.toUpperCase()] || s;
}

function vvParseBRLControleParcelas(valor) {
  if (typeof vv_parseBRL === "function") return vv_parseBRL(valor || "0");
  return Number(
    String(valor || "0")
      .replace(/\u00A0/g, " ")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}

function vvFmtBRLControleParcelas(valor) {
  if (typeof vv_fmtBRL === "function") return vv_fmtBRL(Number(valor || 0));
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function vvRound2ControleParcelas(valor) {
  if (typeof vv_round2 === "function") return vv_round2(valor);
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function vvCondicaoEhPersonalizadaParcelas(condicao = "") {
  const valor = String(condicao || "").trim();
  if (!valor) return false;
  return !VV_CONDICOES_PAGTO_PARCELAS.some(op => op.value === valor);
}

function vvCriarSelectCondicaoParcelas(className = "condicao-pagto") {
  const select = document.createElement("select");
  select.className = `form-select ${className}`;

  const optPlaceholder = document.createElement("option");
  optPlaceholder.value = "";
  optPlaceholder.disabled = true;
  optPlaceholder.selected = true;
  optPlaceholder.textContent = "Selecione...";
  select.appendChild(optPlaceholder);

  VV_CONDICOES_PAGTO_PARCELAS.forEach(op => {
    const option = document.createElement("option");
    option.value = op.value;
    option.textContent = op.label;
    select.appendChild(option);
  });

  return select;
}

function vvCriarInputCondicaoParcelas(className = "condicao-pagto", valor = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.className = `form-control ${className}`;
  input.placeholder = "Descreva a condicao de pagamento...";
  input.value = valor || "Personalizado - ";
  return input;
}

function vvMontarCampoCondicaoParcelas(wrapper, {
  className = "condicao-pagto",
  valor = "",
  onChange = null
} = {}) {
  const registrar = (el) => {
    if (!el || typeof onChange !== "function") return el;
    el.addEventListener("input", onChange);
    el.addEventListener("change", onChange);
    return el;
  };

  wrapper.innerHTML = "";

  if (vvCondicaoEhPersonalizadaParcelas(valor)) {
    const input = registrar(vvCriarInputCondicaoParcelas(className, valor));
    wrapper.appendChild(input);
    return input;
  }

  const select = vvCriarSelectCondicaoParcelas(className);
  if (valor) {
    select.value = valor;
  } else {
    select.selectedIndex = 0;
  }

  select.addEventListener("change", () => {
    if (select.value === "personalizado") {
      const input = registrar(vvCriarInputCondicaoParcelas(className));
      wrapper.innerHTML = "";
      wrapper.appendChild(input);
      requestAnimationFrame(() => input.focus());
      if (typeof onChange === "function") onChange();
      return;
    }

    if (typeof onChange === "function") onChange();
  });

  wrapper.appendChild(registrar(select));
  return select;
}

function vvNormalizarParcelaControle(parcela = {}) {
  const valorBruto =
    parcela?.valor ??
    parcela?.valor_digitado ??
    parcela?.valor_formatado ??
    0;

  return {
    tipo_monetario: vvNormalizarCodigoMeioPagamento(parcela?.tipo_monetario ?? parcela?.tipo ?? ""),
    condicao_pagto: String(parcela?.condicao_pagto ?? parcela?.condicao ?? parcela?.condicaoPagamento ?? "").trim(),
    valor: vvRound2ControleParcelas(vvParseBRLControleParcelas(valorBruto)),
    vencimento: String(parcela?.vencimento ?? parcela?.data ?? parcela?.previsao ?? "").trim(),
    ignorar: parcela?.ignorar === true || parcela?.ignorar === "true",
    descritivo: String(parcela?.descritivo ?? parcela?.observacao ?? "").trim(),
    tipo_parcelamento: String(parcela?.tipo_parcelamento ?? "normal").trim() || "normal"
  };
}

function vvSomarParcelasControle(parcelas = []) {
  return vvRound2ControleParcelas(
    (parcelas || [])
      .filter(parcela => !parcela?.ignorar)
      .reduce((acc, parcela) => acc + Number(parcela?.valor || 0), 0)
  );
}

function vvSerializarParcelasProdutoParaFormulario(parcelasProduto = []) {
  return (parcelasProduto || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0 && !parcela.ignorar)
    .map(parcela => ({
      tipo: parcela.tipo_monetario || "",
      condicao: parcela.condicao_pagto || "",
      valor: vvFmtBRLControleParcelas(parcela.valor),
      data: parcela.vencimento || "",
      descritivo: parcela.descritivo || "",
      tipo_parcelamento: parcela.tipo_parcelamento || "normal"
    }));
}

function vvSerializarParcelasServicoParaServidor(parcelasServico = []) {
  return (parcelasServico || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0 && !parcela.ignorar)
    .map(parcela => ({
      tipo_monetario: parcela.tipo_monetario || "",
      condicao_pagto: parcela.condicao_pagto || "",
      valor: vvRound2ControleParcelas(parcela.valor),
      previsao: parcela.vencimento || "",
      vencimento: parcela.vencimento || "",
      descritivo: parcela.descritivo || "",
      tipo_parcelamento: parcela.tipo_parcelamento || "normal"
    }));
}

function vvLerParcelasFormularioPrincipal() {
  const linhas = [...document.querySelectorAll("#listaParcelas .row")];
  return linhas
    .map(row => {
      const condSelect = row.querySelector("select.condicao-pagto");
      const condInput = row.querySelector("input.condicao-pagto");
      const tipoParcela = row.querySelector(".tipo-item-parcela")?.value || "";
      return {
        ...vvNormalizarParcelaControle({
          tipo: row.querySelector(".tipo-monetario")?.value || "",
          condicao: condSelect?.value || condInput?.value || row.querySelector(".condicao-pagto")?.value || "",
          valor: row.querySelector(".valor-parcela")?.value || "",
          data: row.querySelector(".data-parcela")?.value || ""
        }),
        _tipoParcela: tipoParcela
      };
    })
    .filter(parcela =>
      parcela.valor > 0 ||
      parcela.vencimento ||
      parcela.tipo_monetario ||
      parcela.condicao_pagto
    );
}

function vvObterParcelasProdutoParaEnvioOmie(parcelasPreferidas = null) {
  const fontes = [
    parcelasPreferidas,
    window.vvParcelamentoProdutosServicosOmie?.parcelasProduto,
    window.vvParcelasProdutoOmie,
    vvLerParcelasFormularioPrincipal()
  ];

  for (const fonte of fontes) {
    if (!Array.isArray(fonte) || !fonte.length) continue;

    const normalizadas = fonte
      .filter(p => p?._tipoParcela !== "faturado-direto")
      .map(vvNormalizarParcelaControle)
      .filter(parcela => parcela.valor > 0 && !parcela.ignorar);

    if (normalizadas.length) return normalizadas;
  }

  return [];
}

function vvMontarParcelasProdutoPayloadOmie(parcelasProduto = []) {
  const parcelasValidas = (parcelasProduto || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0 && !parcela.ignorar && formatarDataBR(parcela.vencimento));

  const totalParcelas = vvRound2ControleParcelas(
    parcelasValidas.reduce((acc, parcela) => acc + Number(parcela.valor || 0), 0)
  );

  const resultados = [];
  let somaPctAcumulada = 0;
  parcelasValidas.forEach((parcela, index) => {
    const isUltima = index === parcelasValidas.length - 1;
    const pct = totalParcelas > 0
      ? (isUltima
          ? Number((100 - somaPctAcumulada).toFixed(2))
          : Number(((Number(parcela.valor || 0) / totalParcelas) * 100).toFixed(2)))
      : 0;
    somaPctAcumulada += pct;
    const obj = {
      numero_parcela: index + 1,
      percentual: pct,
      data_vencimento: formatarDataBR(parcela.vencimento),
      valor: vvRound2ControleParcelas(parcela.valor)
    };
    const meio = String(parcela.tipo_monetario || "").trim();
    if (meio) obj.meio_pagamento = meio;
    resultados.push(obj);
  });
  return resultados;
}

function vvCriarLinhaParcelaFormularioFallback() {
  const row = document.createElement("div");
  row.className = "row g-2 align-items-end mb-2";
  row.innerHTML = `
    <div class="col-3 col-lg-2">
      <label class="form-label mb-0">Tipo Monetario</label>
      <select class="form-select tipo-monetario">
        <option value="" disabled selected>Selecione...</option>
        <option value="17">Pix</option>
        <option value="01">Dinheiro</option>
        <option value="03">Cartao Parcelado</option>
        <option value="03">Cartao de Credito</option>
        <option value="04">Cartao de Debito</option>
        <option value="15">Boleto Recorrente</option>
        <option value="15">Boleto a Vista</option>
        <option value="99">Permuta</option>
      </select>
    </div>
    <div class="col-4 col-lg-3">
      <label class="form-label mb-0">Condicao de Pagto</label>
      <div class="condicao-wrapper"></div>
    </div>
    <div class="col-3 col-lg-2">
      <label class="form-label mb-0">Valor</label>
      <input type="text" class="form-control valor-parcela" placeholder="Ex: 1000,00">
    </div>
    <div class="col-2 col-lg-3">
      <label class="form-label mb-0">Vencimento</label>
      <input type="date" class="form-control data-parcela">
    </div>
    <div class="col-12 col-lg-2">
      <button type="button" class="btn btn-outline-danger w-100 btn-remover-parcela-formulario">Remover</button>
    </div>
  `;

  const wrapper = row.querySelector(".condicao-wrapper");
  vvMontarCampoCondicaoParcelas(wrapper, { className: "condicao-pagto" });

  row.querySelector(".btn-remover-parcela-formulario")?.addEventListener("click", () => {
    row.remove();
    if (typeof atualizarValoresParcelas === "function") atualizarValoresParcelas();
  });

  return row;
}

function vvAplicarParcelaProdutoNaLinhaFormulario(row, parcela = {}) {
  const normalizada = vvNormalizarParcelaControle(parcela);
  const tipoSelect = row.querySelector(".tipo-monetario");
  const valorInput = row.querySelector(".valor-parcela");
  const dataInput = row.querySelector(".data-parcela");
  const condWrapper = row.querySelector(".condicao-wrapper");

  if (tipoSelect) tipoSelect.value = normalizada.tipo_monetario || "";
  if (valorInput) valorInput.value = normalizada.valor > 0 ? vvFmtBRLControleParcelas(normalizada.valor) : "";
  if (dataInput) dataInput.value = normalizada.vencimento || "";
  if (condWrapper) {
    vvMontarCampoCondicaoParcelas(condWrapper, {
      className: "condicao-pagto",
      valor: normalizada.condicao_pagto || ""
    });
  }
}

function vvAtualizarListaParcelasFormulario(parcelasProduto = []) {
  const lista = document.getElementById("listaParcelas");
  if (!lista) {
    console.warn("[parcelas] #listaParcelas nao encontrado para aplicar parcelas de produtos.");
    return false;
  }

  const parcelasNormalizadas = (parcelasProduto || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0);

  lista.innerHTML = "";

  const parcelamentoContainer = document.getElementById("parcelamentoContainer");
  if (parcelamentoContainer) {
    parcelamentoContainer.style.display = "block";
  }

  parcelasNormalizadas.forEach(parcela => {
    let row = null;

    if (typeof adicionarParcela === "function") {
      adicionarParcela();
      const linhas = document.querySelectorAll("#listaParcelas .row");
      row = linhas[linhas.length - 1] || null;
    }

    if (!row) {
      row = vvCriarLinhaParcelaFormularioFallback();
      lista.appendChild(row);
      if (typeof aplicarEventosParcela === "function") {
        aplicarEventosParcela(row);
      }
    }

    vvAplicarParcelaProdutoNaLinhaFormulario(row, parcela);
  });

  if (typeof atualizarValoresParcelas === "function") {
    atualizarValoresParcelas();
  }

  return true;
}

async function vvSalvarParcelamentoOmieNoServidor({
  parcelasProduto = [],
  parcelasServico = [],
  persistirNoServidor = false
} = {}) {
  try {
    if (!persistirNoServidor) {
      console.info("[parcelas] persistencia no Heroku bloqueada no envio Omie; usando parcelas apenas em memoria para montar os payloads.");
      return { ok: true, skipped: true };
    }

    const idProposta = new URLSearchParams(window.location.search).get("id");
    if (!idProposta) {
      console.warn("[parcelas] ID da proposta nao encontrado na URL. Parcelas nao foram salvas no servidor.");
      return null;
    }

    const propostaBase = window.propostaEmEdicao || window.propostaAtual;
    if (!propostaBase || typeof propostaBase !== "object") {
      console.warn("[parcelas] Proposta base nao encontrada em memoria. Parcelas nao foram salvas no servidor.");
      return null;
    }

    const parcelasProdutoFormulario = vvSerializarParcelasProdutoParaFormulario(parcelasProduto);
    const parcelasServicoServidor = vvSerializarParcelasServicoParaServidor(parcelasServico);

    const payload = JSON.parse(JSON.stringify(propostaBase));
    payload.camposFormulario = payload.camposFormulario || {};
    payload.camposFormulario.parcelas = parcelasProdutoFormulario;
    payload.camposFormulario.parcelasServico = parcelasServicoServidor;

    console.group("[parcelas] salvando no servidor");
    console.log("idProposta:", idProposta);
    console.log("parcelasProdutoFormulario:", JSON.parse(JSON.stringify(parcelasProdutoFormulario || [])));
    console.log("parcelasServicoServidor:", JSON.parse(JSON.stringify(parcelasServicoServidor || [])));
    console.groupEnd();

    const resposta = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${idProposta}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado?.erro || resultado?.message || "Falha ao salvar parcelamento de produtos e servicos.");
    }

    if (window.propostaEmEdicao) {
      window.propostaEmEdicao.camposFormulario = window.propostaEmEdicao.camposFormulario || {};
      window.propostaEmEdicao.camposFormulario.parcelas = parcelasProdutoFormulario;
      window.propostaEmEdicao.camposFormulario.parcelasServico = parcelasServicoServidor;
    }

    if (window.propostaAtual) {
      window.propostaAtual.camposFormulario = window.propostaAtual.camposFormulario || {};
      window.propostaAtual.camposFormulario.parcelas = parcelasProdutoFormulario;
      window.propostaAtual.camposFormulario.parcelasServico = parcelasServicoServidor;
    }

    return resultado;
  } catch (erro) {
    console.error("[parcelas] erro ao salvar no servidor:", erro);
    throw erro;
  }
}

function vvSubtrairParcelasServicoDeParcelasProduto(parcelasProduto = [], parcelasServico = []) {
  const produtos = (parcelasProduto || []).map(vvNormalizarParcelaControle);
  const servicos = (parcelasServico || []).map(vvNormalizarParcelaControle).filter(parcela => parcela.valor > 0);

  for (const servico of servicos) {
    let restante = vvRound2ControleParcelas(servico.valor);

    const indicesPreferenciais = [];
    produtos.forEach((produto, index) => {
      if (produto.valor > 0 && produto.vencimento && produto.vencimento === servico.vencimento) {
        indicesPreferenciais.push(index);
      }
    });

    produtos.forEach((produto, index) => {
      if (produto.valor > 0 && !indicesPreferenciais.includes(index)) {
        indicesPreferenciais.push(index);
      }
    });

    for (const index of indicesPreferenciais) {
      if (restante <= 0.009) break;
      const produto = produtos[index];
      const abatido = Math.min(produto.valor, restante);
      produto.valor = vvRound2ControleParcelas(produto.valor - abatido);
      restante = vvRound2ControleParcelas(restante - abatido);
    }

    if (restante > 0.02) {
      return {
        ok: false,
        parcelasProdutoAjustadas: (parcelasProduto || []).map(vvNormalizarParcelaControle)
      };
    }
  }

  return {
    ok: true,
    parcelasProdutoAjustadas: produtos.filter(produto => produto.valor > 0.009)
  };
}

function vvEscolherParcelasIniciaisProdutosServicos({
  valorTotalProdutos = 0,
  valorTotalServicos = 0,
  parcelasProduto = [],
  parcelasServico = []
} = {}) {
  const parcelasProdutoIniciais = (parcelasProduto || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0);

  const parcelasServicoIniciais = (parcelasServico || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0);

  // Só cria parcela inicial de produto se não houver nenhuma salva
  if (!parcelasProdutoIniciais.length && valorTotalProdutos > 0) {
    // Retrocompatibilidade: usa o select global #condicaoPagamento se existir
    const _condGlobal = document.getElementById("condicaoPagamento")?.value || "";
    parcelasProdutoIniciais.push({
      tipo_monetario: "",
      condicao_pagto: _condGlobal,
      valor: vvRound2ControleParcelas(valorTotalProdutos),
      vencimento: "",
      ignorar: false
    });
  }

  // Serviços: nunca cria automaticamente — o usuário adiciona se quiser

  return {
    origem: "persistido",
    parcelasProdutoIniciais,
    parcelasServicoIniciais
  };
}

function abrirPopupParcelamentoProdutosServicos({
  valorTotalProdutos = 0,
  valorTotalServicos = 0,
  parcelasProdutoExistentes = [],
  parcelasServicoExistentes = []
} = {}) {
  return new Promise((resolveParcelas) => {
    const totalProdutosTarget = vvRound2ControleParcelas(valorTotalProdutos);
    const totalServicosTarget = vvRound2ControleParcelas(valorTotalServicos);

    const inicial = vvEscolherParcelasIniciaisProdutosServicos({
      valorTotalProdutos: totalProdutosTarget,
      valorTotalServicos: totalServicosTarget,
      parcelasProduto: parcelasProdutoExistentes,
      parcelasServico: parcelasServicoExistentes
    });

    console.group("[parcelas] abrirPopupParcelamentoProdutosServicos");
    console.log("valorTotalProdutos:", totalProdutosTarget);
    console.log("valorTotalServicos:", totalServicosTarget);
    console.log("origem inicial:", inicial.origem);
    console.log("parcelasProdutoIniciais:", JSON.parse(JSON.stringify(inicial.parcelasProdutoIniciais || [])));
    console.log("parcelasServicoIniciais:", JSON.parse(JSON.stringify(inicial.parcelasServicoIniciais || [])));
    console.groupEnd();

    const bd = document.createElement("div");
    bd.className = "vv-modal-backdrop";

    const md = document.createElement("div");
    md.className = "vv-modal";
    md.style.maxWidth = "1800px";
    md.style.width = "98vw";

    const hd = document.createElement("header");
    hd.innerHTML = `
      <div style="display:grid; gap:4px;">
        <h3>Controle de Parcelas: Produtos e Servicos</h3>
        <div class="vv-help" style="margin:0;">
          Arraste parcelas entre produtos e servicos. Quando o valor arrastado passar do que falta no destino, a parcela sera dividida automaticamente.
        </div>
      </div>
    `;

    const by = document.createElement("div");
    by.className = "vv-body";
    by.innerHTML = `
      <div style="display:grid; gap:12px;">
        <div class="vv-transfer-summary">
          <div>Total a parcelar: <b id="vv-total-target-produtos">${vvFmtBRLControleParcelas(totalProdutosTarget)}</b></div>
          <div>Total parcelado (produtos): <b id="vv-prod-somado">${vvFmtBRLControleParcelas(0)}</b></div>
          <div>Total parcelado (servicos): <b id="vv-serv-somado">${vvFmtBRLControleParcelas(0)}</b></div>
        </div>
        <div class="vv-transfer-grid">
          <section class="vv-transfer-panel">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
              <div>
                <h4 style="margin:0;">Produtos</h4>
                <div class="vv-help" style="margin:4px 0 0 0;">Essas parcelas vao para o pedido de produtos da Omie.</div>
              </div>
              <div class="vv-transfer-actions">
                <button type="button" class="vv-btn" id="vv-add-parcela-produto">Adicionar</button>
                <button type="button" class="vv-btn" id="vv-gerar-1x-produto">Gerar 1x</button>
                <button type="button" class="vv-btn" id="vv-gerar-2x-produto">Gerar 2x</button>
              </div>
            </div>
            <div class="vv-transfer-list" data-bucket-list="produtos"></div>
          </section>
          <section class="vv-transfer-panel">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
              <div>
                <h4 style="margin:0;">Servicos</h4>
                <div class="vv-help" style="margin:4px 0 0 0;">Essas parcelas vao para a OS de servicos.</div>
              </div>
              <div class="vv-transfer-actions">
                <button type="button" class="vv-btn" id="vv-add-parcela-servico">Adicionar</button>
                <button type="button" class="vv-btn" id="vv-gerar-1x-servico">Gerar 1x</button>
                <button type="button" class="vv-btn" id="vv-gerar-2x-servico">Gerar 2x</button>
              </div>
            </div>
            <div class="vv-transfer-list" data-bucket-list="servicos"></div>
          </section>
        </div>
      </div>
    `;

    const ft = document.createElement("div");
    ft.className = "vv-footer";
    ft.innerHTML = `
      <div class="vv-help" id="vv-help-controle-parcelas">
        As parcelas aqui sao usadas apenas neste envio para Omie. O formulario e o Heroku nao sao alterados.
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="vv-btn" id="vv-cancelar-controle-parcelas">Cancelar</button>
        <button class="vv-btn primary" id="vv-confirmar-controle-parcelas">Confirmar parcelamento</button>
      </div>
    `;

    md.appendChild(hd);
    md.appendChild(by);
    md.appendChild(ft);
    bd.appendChild(md);
    document.body.appendChild(bd);

    const buckets = {
      produtos: {
        label: "Produtos",
        target: totalProdutosTarget,
        list: by.querySelector('[data-bucket-list="produtos"]'),
        sumEl: by.querySelector("#vv-prod-somado")
      },
      servicos: {
        label: "Servicos",
        target: totalServicosTarget,
        list: by.querySelector('[data-bucket-list="servicos"]'),
        sumEl: by.querySelector("#vv-serv-somado")
      }
    };

    let draggedRow = null;

    function criarLinhaParcelaCard(parcela = {}, bucket = "produtos") {
      const normalizada = vvNormalizarParcelaControle(parcela);

      const card = document.createElement("div");
      card.className = "vv-parcela-card";
      card.draggable = true;
      card.dataset.bucket = bucket;

      card.innerHTML = `
        <div class="vv-parcela-head">
          <span class="vv-drag-handle">Arraste para transferir</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <label class="vv-ignorar-label" title="Faturamento direto — esta parcela nao sera enviada para a Omie">
              <input type="checkbox" class="vv-ignorar-parcela"> Ignorar (fat. direto)
            </label>
            <button type="button" class="vv-btn danger vv-remover-parcela-transfer">Remover</button>
          </div>
        </div>
        <div class="row g-2 align-items-end">
          <div class="col-12 col-xl-3">
            <label class="form-label mb-0">Tipo Monetario</label>
            <select class="form-select tipo-monetario-transfer">
              <option value="" disabled selected>Selecione...</option>
              <option value="17">Pix</option>
              <option value="01">Dinheiro</option>
              <option value="03">Cartao Parcelado</option>
              <option value="03">Cartao de Credito</option>
              <option value="04">Cartao de Debito</option>
              <option value="15">Boleto Recorrente</option>
              <option value="15">Boleto a Vista</option>
              <option value="99">Permuta</option>
            </select>
          </div>
          <div class="col-12 col-xl-4">
            <label class="form-label mb-0">Condicao de Pagto</label>
            <div class="condicao-wrapper-transfer"></div>
          </div>
          <div class="col-12 col-xl-3">
            <label class="form-label mb-0">Valor</label>
            <input type="text" class="form-control valor-parcela-transfer" placeholder="Ex: 1000,00">
          </div>
          <div class="col-12 col-xl-2" style="min-width:150px;">
            <label class="form-label mb-0">Vencimento</label>
            <input type="date" class="form-control data-parcela-transfer">
          </div>
          <div class="col-12 col-xl-4">
            <label class="form-label mb-0">Tipo de Parcelamento</label>
            <select class="form-select tipo-parcelamento-transfer">
              <option value="normal">Normal</option>
              <option value="faturamento_direto">Faturamento Direto</option>
            </select>
          </div>
          <div class="col-12 col-xl-8">
            <label class="form-label mb-0">Descritivo</label>
            <input type="text" class="form-control descritivo-parcela-transfer" placeholder="Ex: Entrada, 1ª parcela...">
          </div>
        </div>
      `;

      const tipoSelect = card.querySelector(".tipo-monetario-transfer");
      const valorInput = card.querySelector(".valor-parcela-transfer");
      const dataInput = card.querySelector(".data-parcela-transfer");
      const wrapper = card.querySelector(".condicao-wrapper-transfer");

      if (tipoSelect) tipoSelect.value = normalizada.tipo_monetario || "";
      if (valorInput) valorInput.value = normalizada.valor > 0 ? vvFmtBRLControleParcelas(normalizada.valor) : "";
      if (dataInput) dataInput.value = normalizada.vencimento || "";
      const tipoParcelamentoSelect = card.querySelector(".tipo-parcelamento-transfer");
      if (tipoParcelamentoSelect) {
        tipoParcelamentoSelect.value = normalizada.tipo_parcelamento || "normal";
        tipoParcelamentoSelect.addEventListener("change", atualizarResumoParcelasControle);
      }
      const descrInput = card.querySelector(".descritivo-parcela-transfer");
      if (descrInput) {
        descrInput.value = normalizada.descritivo || "";
        descrInput.addEventListener("input", atualizarResumoParcelasControle);
      }

      const ignorarCheck = card.querySelector(".vv-ignorar-parcela");
      if (ignorarCheck) {
        ignorarCheck.checked = !!normalizada.ignorar;
        ignorarCheck.addEventListener("change", () => {
          if (ignorarCheck.checked) {
            const bucketAtual = card.dataset.bucket || bucket;
            card.remove();
            atualizarEstadoLista(bucketAtual);
            atualizarResumoParcelasControle();
          }
        });
      }

      vvMontarCampoCondicaoParcelas(wrapper, {
        className: "condicao-pagto-transfer",
        valor: normalizada.condicao_pagto || "",
        onChange: atualizarResumoParcelasControle
      });

      tipoSelect?.addEventListener("change", atualizarResumoParcelasControle);
      valorInput?.addEventListener("input", atualizarResumoParcelasControle);
      valorInput?.addEventListener("blur", () => {
        const valor = vvParseBRLControleParcelas(valorInput.value || "0");
        valorInput.value = valor > 0 ? vvFmtBRLControleParcelas(valor) : "";
        atualizarResumoParcelasControle();
      });
      dataInput?.addEventListener("change", atualizarResumoParcelasControle);

      card.querySelector(".vv-remover-parcela-transfer")?.addEventListener("click", () => {
        const bucketAtual = card.dataset.bucket || bucket;
        card.remove();
        atualizarEstadoLista(bucketAtual);
        atualizarResumoParcelasControle();
      });

      card.addEventListener("dragstart", () => {
        draggedRow = card;
        card.classList.add("is-dragging");
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        draggedRow = null;
        Object.values(buckets).forEach(info => info.list.classList.remove("is-over"));
      });

      return card;
    }

    function coletarParcelasBucket(bucket) {
      return [...buckets[bucket].list.querySelectorAll(".vv-parcela-card")]
        .map(card => {
          const condicaoEl = card.querySelector(".condicao-pagto-transfer");
          return vvNormalizarParcelaControle({
            tipo_monetario: card.querySelector(".tipo-monetario-transfer")?.value || "",
            condicao_pagto: condicaoEl?.value || "",
            valor: card.querySelector(".valor-parcela-transfer")?.value || "",
            vencimento: card.querySelector(".data-parcela-transfer")?.value || "",
            descritivo: card.querySelector(".descritivo-parcela-transfer")?.value || "",
            tipo_parcelamento: card.querySelector(".tipo-parcelamento-transfer")?.value || "normal"
          });
        })
        .filter(parcela =>
          parcela.valor > 0 ||
          parcela.vencimento ||
          parcela.tipo_monetario ||
          parcela.condicao_pagto
        );
    }

    function atualizarEstadoLista(bucket) {
      const info = buckets[bucket];
      if (!info) return;

      let vazio = info.list.querySelector(".vv-transfer-empty");
      const temCards = info.list.querySelector(".vv-parcela-card");

      if (!temCards && !vazio) {
        vazio = document.createElement("p");
        vazio.className = "vv-transfer-empty";
        vazio.textContent = bucket === "produtos"
          ? "Arraste parcelas para produtos ou crie novas."
          : "Arraste parcelas para servicos ou crie novas.";
        info.list.appendChild(vazio);
      }

      if (temCards && vazio) {
        vazio.remove();
      }

      sincronizarAlturaListasTransferencia();
    }

    function sincronizarAlturaListasTransferencia() {
      const listas = Object.values(buckets)
        .map(info => info?.list)
        .filter(Boolean);

      if (!listas.length) return;

      listas.forEach(lista => {
        lista.style.minHeight = "";
      });

      const maiorAltura = Math.max(
        180,
        ...listas.map(lista => Math.ceil(lista.scrollHeight || 0))
      );

      listas.forEach(lista => {
        lista.style.minHeight = `${maiorAltura}px`;
      });
    }

    function adicionarLinhaNoBucket(bucket, parcela = {}) {
      const card = criarLinhaParcelaCard(parcela, bucket);
      buckets[bucket].list.appendChild(card);
      atualizarEstadoLista(bucket);
      atualizarResumoParcelasControle();
      return card;
    }

    function limparBucket(bucket) {
      buckets[bucket].list.innerHTML = "";
      atualizarEstadoLista(bucket);
      atualizarResumoParcelasControle();
    }

    function gerarParcelasIguais(bucket, qtd) {
      if (!qtd || qtd <= 0) return;

      const target = buckets[bucket].target;
      const atuais = coletarParcelasBucket(bucket);
      const outroBucket = bucket === "produtos" ? "servicos" : "produtos";
      const referencia = atuais[0] || coletarParcelasBucket(outroBucket)[0] || {};

      limparBucket(bucket);

      let acumulado = 0;
      for (let i = 0; i < qtd; i++) {
        let valor = vvRound2ControleParcelas(target / qtd);
        if (i === qtd - 1) {
          valor = vvRound2ControleParcelas(target - acumulado);
        }
        acumulado = vvRound2ControleParcelas(acumulado + valor);

        adicionarLinhaNoBucket(bucket, {
          tipo_monetario: referencia.tipo_monetario || "",
          condicao_pagto: referencia.condicao_pagto || "",
          valor,
          vencimento: i === 0 ? (referencia.vencimento || "") : ""
        });
      }
    }

    function atualizarResumoBucket(bucket, totalParcelado) {
      const info = buckets[bucket];
      if (info.sumEl) info.sumEl.textContent = vvFmtBRLControleParcelas(totalParcelado);
    }

    function atualizarResumoParcelasControle() {
      const totalProdutos = vvRound2ControleParcelas(
        coletarParcelasBucket("produtos").reduce((s, p) => s + p.valor, 0)
      );
      const totalServicos = vvRound2ControleParcelas(
        coletarParcelasBucket("servicos").reduce((s, p) => s + p.valor, 0)
      );
      atualizarResumoBucket("produtos", totalProdutos);
      atualizarResumoBucket("servicos", totalServicos);
    }

    function moverLinhaParaBucket(card, bucketDestino, valorTransferencia = null) {
      if (!card) return;

      const bucketOrigem = card.dataset.bucket || "produtos";
      if (bucketOrigem === bucketDestino) return;

      const dadosOriginais = vvNormalizarParcelaControle({
        tipo_monetario: card.querySelector(".tipo-monetario-transfer")?.value || "",
        condicao_pagto: card.querySelector(".condicao-pagto-transfer")?.value || "",
        valor: card.querySelector(".valor-parcela-transfer")?.value || "",
        vencimento: card.querySelector(".data-parcela-transfer")?.value || ""
      });

      if (
        typeof valorTransferencia === "number" &&
        valorTransferencia > 0.009 &&
        valorTransferencia < dadosOriginais.valor - 0.009
      ) {
        const valorRestante = vvRound2ControleParcelas(dadosOriginais.valor - valorTransferencia);
        const valorInput = card.querySelector(".valor-parcela-transfer");

        if (valorRestante > 0.009 && valorInput) {
          valorInput.value = vvFmtBRLControleParcelas(valorRestante);
        } else {
          card.remove();
        }

        const clone = criarLinhaParcelaCard({
          ...dadosOriginais,
          valor: valorTransferencia
        }, bucketDestino);
        buckets[bucketDestino].list.appendChild(clone);
      } else {
        card.dataset.bucket = bucketDestino;
        buckets[bucketDestino].list.appendChild(card);
      }

      atualizarEstadoLista(bucketOrigem);
      atualizarEstadoLista(bucketDestino);
      atualizarResumoParcelasControle();
    }

    Object.entries(buckets).forEach(([bucket, info]) => {
      info.list.addEventListener("dragover", (event) => {
        event.preventDefault();
        info.list.classList.add("is-over");
      });

      info.list.addEventListener("dragleave", () => {
        info.list.classList.remove("is-over");
      });

      info.list.addEventListener("drop", (event) => {
        event.preventDefault();
        info.list.classList.remove("is-over");

        if (!draggedRow) return;

        const valorLinha = vvParseBRLControleParcelas(
          draggedRow.querySelector(".valor-parcela-transfer")?.value || "0"
        );

        const totalAtualDestino = vvSomarParcelasControle(coletarParcelasBucket(bucket));
        const faltaDestino = vvRound2ControleParcelas(info.target - totalAtualDestino);
        const valorTransferencia =
          faltaDestino > 0.009 && valorLinha > faltaDestino + 0.009
            ? faltaDestino
            : null;

        moverLinhaParaBucket(draggedRow, bucket, valorTransferencia);
      });
    });

    by.querySelector("#vv-add-parcela-produto")?.addEventListener("click", () => {
      adicionarLinhaNoBucket("produtos");
    });
    by.querySelector("#vv-add-parcela-servico")?.addEventListener("click", () => {
      adicionarLinhaNoBucket("servicos");
    });
    by.querySelector("#vv-gerar-1x-produto")?.addEventListener("click", () => gerarParcelasIguais("produtos", 1));
    by.querySelector("#vv-gerar-2x-produto")?.addEventListener("click", () => gerarParcelasIguais("produtos", 2));
    by.querySelector("#vv-gerar-1x-servico")?.addEventListener("click", () => gerarParcelasIguais("servicos", 1));
    by.querySelector("#vv-gerar-2x-servico")?.addEventListener("click", () => gerarParcelasIguais("servicos", 2));

    ft.querySelector("#vv-cancelar-controle-parcelas")?.addEventListener("click", () => {
      document.body.removeChild(bd);
      resolveParcelas(null);
    });

    ft.querySelector("#vv-confirmar-controle-parcelas")?.addEventListener("click", () => {
      try {
        const parcelasProduto = coletarParcelasBucket("produtos").filter(p => p.valor > 0);
        const parcelasServico = coletarParcelasBucket("servicos").filter(p => p.valor > 0);

        // ── Validações ──────────────────────────────────────────────────────
        const erros = [];

        const totalProdutosConfirmado = vvRound2ControleParcelas(parcelasProduto.reduce((s, p) => s + p.valor, 0));
        const totalServicosConfirmado = vvRound2ControleParcelas(parcelasServico.reduce((s, p) => s + p.valor, 0));

        // Valida o TOTAL COMBINADO (produtos + serviços) — o usuário pode
        // distribuir livremente entre os buckets, o que importa é a soma bater.
        const totalCombinado         = vvRound2ControleParcelas(totalProdutosTarget + totalServicosTarget);
        const totalCombConfirmado    = vvRound2ControleParcelas(totalProdutosConfirmado + totalServicosConfirmado);
        const diffCombinado          = vvRound2ControleParcelas(totalCombinado - totalCombConfirmado);

        if (parcelasProduto.length === 0 && parcelasServico.length === 0) {
          erros.push("Nenhuma parcela foi preenchida.");
        } else if (Math.abs(diffCombinado) > 0) {
          if (Math.abs(diffCombinado) <= 0.03) {
            // Ajuste automático de centavos na última parcela disponível
            const ultimaLista = parcelasProduto.length > 0 ? parcelasProduto : parcelasServico;
            ultimaLista[ultimaLista.length - 1].valor = vvRound2ControleParcelas(
              ultimaLista[ultimaLista.length - 1].valor + diffCombinado
            );
            console.log(`[parcelas] ajuste automático combinado: ${diffCombinado > 0 ? "+" : ""}${diffCombinado}`);
          } else {
            erros.push(
              `Parcelas somam ${vvFmtBRLControleParcelas(totalCombConfirmado)}, ` +
              `mas o total do pedido é ${vvFmtBRLControleParcelas(totalCombinado)} ` +
              `(diferença de ${vvFmtBRLControleParcelas(Math.abs(diffCombinado))}). Ajuste os valores.`
            );
          }
        }

        parcelasProduto.forEach((p, i) => {
          if (!p.vencimento) erros.push(`Parcela de produtos ${i + 1}: data de vencimento não preenchida.`);
          if (!p.tipo_monetario) erros.push(`Parcela de produtos ${i + 1}: tipo monetário não selecionado.`);
        });

        parcelasServico.forEach((p, i) => {
          if (!p.vencimento) erros.push(`Parcela de serviços ${i + 1}: data de vencimento não preenchida.`);
          if (!p.tipo_monetario) erros.push(`Parcela de serviços ${i + 1}: tipo monetário não selecionado.`);
        });

        if (erros.length > 0) {
          if (typeof mostrarPopupPendencias === "function") {
            mostrarPopupPendencias(erros);
          } else {
            alert("Pendências:\n- " + erros.join("\n- "));
          }
          return;
        }
        // ── Fim das validações ──────────────────────────────────────────────

        sincronizarPDVparaKommo().catch(e => console.warn("[SYNC] Kommo (background):", e?.message || e));

        const parcelasServicoServidor = vvSerializarParcelasServicoParaServidor(parcelasServico);

        window.vvParcelasProdutoOmie = parcelasProduto;
        window.vvParcelasServicoOmie = parcelasServicoServidor;
        window.vvParcelamentoProdutosServicosOmie = {
          totalProdutos: totalProdutosTarget,
          totalServicos: totalServicosTarget,
          parcelasProduto,
          parcelasServico: parcelasServicoServidor
        };

        document.body.removeChild(bd);
        resolveParcelas({
          totalProdutos: totalProdutosTarget,
          totalServicos: totalServicosTarget,
          parcelasProduto,
          parcelasServico: parcelasServicoServidor
        });
      } catch (erro) {
        console.error("[parcelas] erro ao confirmar controle de parcelas:", erro);
        alert("Erro ao confirmar o controle de parcelas.");
      }
    });

    (inicial.parcelasProdutoIniciais || []).forEach(parcela => adicionarLinhaNoBucket("produtos", parcela));
    (inicial.parcelasServicoIniciais || []).forEach(parcela => adicionarLinhaNoBucket("servicos", parcela));

    atualizarEstadoLista("produtos");
    atualizarEstadoLista("servicos");
    atualizarResumoParcelasControle();
  });
}



// ── Top-level: acessível por atualizarNaOmie sem depender de abrirPopupSelecaoItensOmie ──
async function tentarEnviarComissoes(payload) {
  function _toast(msg, tipo, tempo) {
    var cont = document.getElementById('vv-toast-container');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'vv-toast-container';
      cont.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(cont);
    }
    var t = document.createElement('div');
    t.style.cssText = 'padding:12px 18px;border-radius:8px;color:#fff;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.2);background:' +
      (tipo === 'erro' ? '#dc2626' : tipo === 'ok' ? '#16a34a' : '#2563eb') + ';';
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, tempo || 4500);
  }

  try {
    document.dispatchEvent(new CustomEvent('vv:comissoes:prontas', { detail: payload }));
  } catch(e) {}

  if (typeof window.enviarComissoes !== 'function') {
    _toast('Comissões preparadas, mas função enviarComissoes() não está disponível.', 'info');
    return { ok: false, resposta: null, erro: 'Função enviarComissoes() ausente' };
  }

  _toast('Enviando comissões…', 'info', 2000);

  try {
    const r = await Promise.resolve(window.enviarComissoes(payload));
    const ok = !!r?.ok;

    const arqInfo = r?.resultados?.arquiteto || {};
    const vendInfo = r?.resultados?.vendedor || {};
    const arqV = Number(payload?.arquiteto?.valorCalculado || payload?.arquiteto?.valorManual || 0);
    const venV = Number(payload?.vendedor?.valorCalculado || payload?.vendedor?.valorManual || 0);
    const _fmt = (n) => (typeof vv_fmtBRL === 'function') ? vv_fmtBRL(n) : String(n);
    const msgs = [];

    if (arqInfo.status === 'enviado')  msgs.push(`Arquiteto enviado: ${_fmt(arqV)}`);
    else if (arqInfo.status === 'ignorado') msgs.push('Arquiteto ignorado');
    else if (arqInfo.status === 'invalido') msgs.push(`Arquiteto inválido: ${arqInfo.erro || '-'}`);
    else if (arqInfo.status === 'erro')     msgs.push(`Arquiteto com erro: ${arqInfo.erro || '-'}`);

    if (vendInfo.status === 'enviado')  msgs.push(`Vendedor enviado: ${_fmt(venV)}`);
    else if (vendInfo.status === 'ignorado') msgs.push('Vendedor ignorado');
    else if (vendInfo.status === 'invalido') msgs.push(`Vendedor inválido: ${vendInfo.erro || '-'}`);
    else if (vendInfo.status === 'erro')     msgs.push(`Vendedor com erro: ${vendInfo.erro || '-'}`);

    // Envia valores financeiros para a Kommo (aguarda resultado)
    let kommoOk = null;
    let kommoErro = null;
    try {
      const idProposta = new URLSearchParams(window.location.search).get('id');
      if (idProposta) {
        const _parse = (s) => (typeof vv_parseBRL === 'function') ? vv_parseBRL(s) : parseFloat(String(s).replace(',', '.')) || 0;
        const valorNFProduto = _parse(document.getElementById('vv-cat-produto')?.textContent || '0');
        const valorNFServico = _parse(document.getElementById('vv-cat-servico')?.textContent || '0');
        const valorFatDireto = _parse(document.getElementById('vv-cat-vidro')?.textContent  || '0');
        const kommoRes = await fetch(`https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/financeiro`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valorNFProduto, valorNFServico, valorFatDireto })
        });
        if (!kommoRes.ok) {
          let errMsg = `HTTP ${kommoRes.status}`;
          if (kommoRes.status === 404) {
            errMsg = 'Não foi possível encontrar o número de orçamento, ID PDV ou número do pedido';
          } else {
            try { const body = await kommoRes.json(); errMsg = body?.message || body?.erro || errMsg; } catch(_) {}
          }
          throw new Error(errMsg);
        }
        kommoOk = true;
      }
    } catch(eKommo) {
      kommoOk = false;
      kommoErro = eKommo?.message || 'Erro ao atualizar Kommo';
      console.warn('[KOMMO] Erro:', eKommo);
    }

    if (ok) {
      _toast(`Comissões processadas.\n${msgs.join(' | ')}`, 'ok', 7000);
      try { document.dispatchEvent(new CustomEvent('vv:comissoes:enviadas', { detail: { ok: true, resposta: r, payload } })); } catch(_) {}
      return { ok: true, resposta: r, erro: null, kommoOk, kommoErro };
    } else {
      const msg = r?.message || r?.erro || 'Nenhuma comissão foi enviada.';
      _toast(`${msg}\n${msgs.join(' | ')}`, 'erro', 7000);
      try { document.dispatchEvent(new CustomEvent('vv:comissoes:enviadas', { detail: { ok: false, resposta: r, erro: msg, payload } })); } catch(_) {}
      return { ok: false, resposta: r, erro: msg, kommoOk, kommoErro };
    }
  } catch(e) {
    const msg = e?.message || 'Erro inesperado ao enviar comissões.';
    console.error('[COMISSÕES] Exceção:', e);
    _toast(msg, 'erro', 6000);
    try { document.dispatchEvent(new CustomEvent('vv:comissoes:enviadas', { detail: { ok: false, resposta: null, erro: msg, payload } })); } catch(_) {}
    return { ok: false, resposta: null, erro: msg, kommoOk: null, kommoErro: null };
  }
}

async function abrirPopupSelecaoItensOmie(itens){

  if (typeof ocultarCarregando === 'function') ocultarCarregando();

  // ===== helpers de UI: toast =====
  function vvToast(msg, tipo='ok', tempo=4500){
    let cont = document.getElementById('vv-toast-container');
    if (!cont){
      cont = document.createElement('div');
      cont.id = 'vv-toast-container';
      cont.style.cssText = `
        position:fixed; inset:auto 16px 16px auto; z-index:10000; display:flex; flex-direction:column; gap:8px;
      `;
      document.body.appendChild(cont);
    }
    const el = document.createElement('div');
    el.className = 'vv-toast';
    el.style.cssText = `
      max-width: min(92vw, 560px);
      background: ${tipo==='erro' ? '#fee2e2' : tipo==='info' ? '#e0f2fe' : '#dcfce7'};
      border: 1px solid ${tipo==='erro' ? '#ef4444' : tipo==='info' ? '#38bdf8' : '#22c55e'};
      color: #111827; padding: 10px 12px; border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,.12); font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
    `;
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .35s linear'; }, tempo-350);
    setTimeout(()=>{ cont.removeChild(el); }, tempo);
  }

  // ---- helpers de normalização/identificação ----
  const normalize = (s) => (s || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const isMaoDeObraInstalPorHora = (desc) => {
    const n = normalize(desc);
    return n.includes('mao de obra de instalacao') && n.includes('(por hora)');
  };

  const classifyKind = (desc) => {
    const n = (desc || "")
      .toString()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (/^vidros?\b/.test(n)) return "vidro";
    if (isMaoDeObraInstalPorHora(desc)) return "servico";
    return "produto";
  };

  // ✅ AJUSTE: comissão do vendedor = 1% do #valorFinalTotal
  function lerValorFinalTotal(){
    const el = document.getElementById('valorFinalTotal');
    let txt = (el?.textContent || '').trim();
    if (!txt) return 0;

    // normaliza NBSP
    txt = txt.replace(/\u00A0/g,' ');

    // tenta helper BRL primeiro
    if (typeof vv_parseBRL === 'function'){
      const v1 = vv_parseBRL(txt);
      if (!isNaN(v1) && v1 > 0) return v1;
    }

    // fallback robusto: aceita "R$ 2444039.47" e "R$ 2.444.039,47"
    const s = txt.replace(/[^\d,\.]/g,'');
    if (!s) return 0;

    // se tiver vírgula, assume decimal BR; se não, assume ponto decimal
    if (s.includes(',')){
      return Number(s.replace(/\./g,'').replace(',','.')) || 0;
    }
    return Number(s) || 0;
  }

  // ========== ESTADO DE COMISSÕES (só informativo) ==========
  const vendedorDefault =
    document.querySelector('#vendedorResponsavel')?.value?.trim() ||
    document.querySelector('#vendedorResponsavel')?.textContent?.trim() ||
    '';

  const ARQ_COMISSAO_SEL = '#totalizadoresExternosPorAmbiente > div:nth-child(4) > div.row.text-center.gx-4.gy-3 > div:nth-child(5) > div.fw-bold';
  const $arqDomEl = document.querySelector(ARQ_COMISSAO_SEL);
  const arqDomValorInicial = (typeof vv_parseBRL === 'function')
    ? vv_parseBRL($arqDomEl?.textContent || '0')
    : Number(String($arqDomEl?.textContent || '0').replace(/[^\d,-]/g,'').replace(/\./g,'').replace(',','.')) || 0;

  let _comArq = { modo:'percent', percent:0, valorManual:0, nome:'', codigo:'', prev:'', venc:'', obs:'' };
  let _comVend= { modo:'percent', percent:0, valorManual:0, nome:(vendedorDefault||''), codigo:'', prev:'', venc:'', obs:'' };
  let _lastTotalBaseMO = 0;

  if (arqDomValorInicial > 0) { _comArq.modo = 'valor'; _comArq.valorManual = arqDomValorInicial; }

  function coletarArquitetosCadastrados(){
    const lista = [];
    document.querySelectorAll('#clientesWrapper .cliente-item').forEach(item=>{
      const nome = (item.querySelector('.razaoSocial')?.value
                 || item.querySelector('.razaoSocial')?.getAttribute('data-valor-original')
                 || '').trim();
      const codigo = (item.querySelector('.codigoCliente')?.value || '').trim();
      if (nome) lista.push({ nome, codigo });
    });
    const nomeArqExtra = (document.getElementById('arquitetoNome')?.value || '').trim();
    const codArqExtra  = (document.getElementById('codigoArquiteto')?.value || '').trim();
    if (nomeArqExtra) lista.push({ nome: nomeArqExtra, codigo: codArqExtra });
    const seen = new Set();
    return lista.filter(a=>{
      const k = a.nome.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function lerComissaoArquitetoDoResumo(){
    const el = document.querySelector(ARQ_COMISSAO_SEL);
    return el ? (window.vv_parseBRL ? vv_parseBRL(el.textContent||'0') : 0) : 0;
  }
  function atualizarComissaoArquitetoNoResumo(valor){
    const el = document.querySelector(ARQ_COMISSAO_SEL);
    if (el && window.vv_fmtBRL) el.textContent = vv_fmtBRL(Number(valor)||0);
  }

  // ===== SUB-POPUP: COMISSÕES =====
 // ===== SUB-POPUP: COMISSÕES =====
function abrirPopupComissao(){
  return new Promise((resolveC)=>{
    const ARQUITETOS = coletarArquitetosCadastrados();

    // ================== HELPERS ==================
    const parseBRL = (s)=> {
      if (window.vv_parseBRL) return vv_parseBRL(s);
      return Number(
        String(s || '')
          .replace(/\u00A0/g, ' ')
          .replace(/[^\d,-]/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
      ) || 0;
    };

    const fmtBRL = (n)=> {
      if (window.vv_fmtBRL) return vv_fmtBRL(n);
      return `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`;
    };

    const toISODate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const proximoDia15 = (base = new Date()) => {
      const y = base.getFullYear();
      const m = base.getMonth();
      const diaHoje = base.getDate();
      const alvo = (diaHoje <= 15) ? new Date(y, m, 15) : new Date(y, m + 1, 15);
      return toISODate(alvo);
    };

    const primeiroDiaUtilProxMes = (base = new Date()) => {
      const y = base.getFullYear();
      const m = base.getMonth();
      let d = new Date(y, m + 1, 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return toISODate(d);
    };

    function lerValorProdutoResumo(){
      const el =
        document.getElementById('vv-total-ajustado') ||
        document.getElementById('vv-cat-produto');
      return parseBRL(el?.textContent || '0');
    }

    function lerComissaoArquitetoResumoVisual(){
      const cards = [...document.querySelectorAll('.col')];
      for (const card of cards) {
        const titulo = card.querySelector('.text-muted.small')?.textContent || '';
        if (/Comissão\s*Arquiteta/i.test(titulo.replace(/\s+/g, ' '))) {
          const bold = card.querySelector('.fw-bold')?.textContent || '0';
          return parseBRL(bold);
        }
      }
      return 0;
    }

    // ================== DEFAULTS DE DATAS ==================
    const hoje = new Date();
    const defaultArq = proximoDia15(hoje);
    const defaultVend = primeiroDiaUtilProxMes(hoje);

    if (!_comArq) _comArq = {};
    if (!_comVend) _comVend = {};

    if (!_comArq.prev) _comArq.prev = defaultArq;
    if (!_comArq.venc) _comArq.venc = defaultArq;

    if (!_comVend.prev) _comVend.prev = defaultVend;
    if (!_comVend.venc) _comVend.venc = defaultVend;

    // ================== OBS PADRÃO ==================
    const elOrc = document.getElementById("numeroOrcamento");
    const numeroOrcamento =
      (elOrc?.value || "").trim() ||
      (elOrc?.dataset?.valorOriginal || "").trim();

    const obsPadrao = numeroOrcamento ? `Orçamento: ${numeroOrcamento}` : "";

    if (!_comArq.obs)  _comArq.obs  = obsPadrao;
    if (!_comVend.obs) _comVend.obs = obsPadrao;

    // ================== DEFAULTS DE COMISSÃO ==================
    if (!_comArq.modo) _comArq.modo = 'valor';

    const valorArquitetoResumo = lerComissaoArquitetoResumoVisual();
    if (_comArq.valorManual == null || isNaN(Number(_comArq.valorManual))) {
      _comArq.valorManual = valorArquitetoResumo || 0;
    }

    if (_comArq.percent == null || isNaN(Number(_comArq.percent))) {
      _comArq.percent = 0;
    }

    // vendedor SEMPRE 1% do total produto
    _comVend.modo = 'percent';
    _comVend.percent = 1;
    _comVend.valorManual = 0;

    const codigoVendedorPopupInicial = (
      document.getElementById('codigoVendedor')?.value?.trim() ||
      resolverCodigoVendedor(vendedorDefault) ||
      _comVend?.codigo_vendedor ||
      _comVend?.codigo ||
      ''
    ).trim();
    const codigoClienteFornecedorVendedorPopupInicial = String(
      _comVend?.codigo_cliente_fornecedor ||
      _comVend?.codigoClienteFornecedor ||
      _comVend?.codigo_fornecedor ||
      _comVend?.codigoFornecedor ||
      ''
    ).trim();

    if (!window._comDesc) window._comDesc = { modo:'percent', percent:0, valorManual:0 };

    const bd = document.createElement('div');
    bd.className = 'vv-modal-backdrop';

    const md = document.createElement('div');
    md.className = 'vv-modal';

    const hd = document.createElement('header');
    hd.innerHTML = `
      <h3>Comissões</h3>
      <div class="vv-help" style="margin-top:4px;">
        <b>Arquiteto:</b> valor exibido no resumo “Comissão Arquiteta” ·
        <b>Vendedor:</b> <u>1% fixo do Total (Produto)</u>
      </div>
    `;

    const optsArq = ARQUITETOS.map(a=>{
      const txt = a.codigo ? `${a.nome} — ${a.codigo}` : a.nome;
      const sel = (a.nome && a.nome === (_comArq?.nome||'')) ? 'selected' : '';
      return `<option value="${a.nome.replace(/"/g,'&quot;')}" data-codigo="${(a.codigo||'').replace(/"/g,'&quot;')}" ${sel}>${txt}</option>`;
    }).join('');

    const by = document.createElement('div');
    by.className = 'vv-body';
    by.innerHTML = `
      <div style="display:grid; gap:16px;">
        <div style="display:grid; gap:8px;">
          <div class="vv-help">
            Base atual (Arquiteto):
            <b id="vv-com-base-arq">${fmtBRL(valorArquitetoResumo || 0)}</b>
            <span class="vv-help" style="margin-left:8px;">(vem do resumo “Comissão Arquiteta”)</span>
          </div>
          <div class="vv-help">
            Base fixa (Vendedor = 1%):
            <b id="vv-com-base-vend">${fmtBRL(lerValorProdutoResumo() || 0)}</b>
            <span class="vv-help" style="margin-left:8px;">(vem do total final de produtos enviado para a Omie)</span>
          </div>
        </div>

        <div style="display:grid; gap:16px; grid-template-columns: repeat(auto-fit, minmax(280px,1fr));">
          <!-- Arquiteto -->
          <section style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
            <h4 style="margin:0 0 8px 0;">Arquiteto</h4>

            <label class="form-label">Selecionar arquiteto cadastrado</label>
            <select id="comArqSelect" class="form-select" style="margin-bottom:8px;">
              <option value="">— escolher —</option>
              ${optsArq}
            </select>

            <div class="row g-2" style="margin-bottom:8px;">
              <div class="col-8">
                <label class="form-label">Nome</label>
                <input id="comArqNome" class="form-control" placeholder="Nome do arquiteto" value="${_comArq?.nome||''}">
              </div>
              <div class="col-4">
                <label class="form-label">Código cliente/fornecedor</label>
                <input id="comArqCodigo" class="form-control" placeholder="Código cliente/fornecedor" value="${_comArq?.codigo||''}">
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
              <label><input type="radio" name="comArqModo" value="percent" ${_comArq?.modo==='percent'?'checked':''}> %</label>
              <label><input type="radio" name="comArqModo" value="valor" ${_comArq?.modo!=='percent'?'checked':''}> Valor fixo (R$)</label>
            </div>

            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <label class="form-label" style="min-width:90px;">Valor</label>
              <input id="comArqPercent" type="number" min="0" step="0.01" value="${Number(_comArq?.percent||0)}" class="form-control" style="max-width:140px;">
              <input id="comArqValor" type="text" value="${fmtBRL(_comArq?.valorManual ?? valorArquitetoResumo ?? 0)}" class="form-control" style="max-width:180px;">
            </div>

            <div class="row g-2" style="margin-top:8px;">
              <div class="col-6">
                <label class="form-label">Previsão</label>
                <input type="date" id="arqPrev" class="form-control" value="${_comArq?.prev||''}">
              </div>
              <div class="col-6">
                <label class="form-label">Vencimento</label>
                <input type="date" id="arqVenc" class="form-control" value="${_comArq?.venc||''}">
              </div>
            </div>

            <div style="margin-top:8px;">
              <label class="form-label">Observação (opcional)</label>
              <textarea id="arqObs" rows="2" class="form-control" placeholder="Ex: Comissão arquiteto">${_comArq?.obs||''}</textarea>
            </div>

            <div class="vv-help" style="margin-top:6px;">Calculado: <b id="comArqCalc">R$ 0,00</b></div>
          </section>

          <!-- Vendedor -->
          <section style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
            <h4 style="margin:0 0 8px 0;">Vendedor</h4>

            <div class="row g-2" style="margin-bottom:8px;">
              <div class="col-6">
                <label class="form-label">Nome</label>
                <input id="comVendNome" class="form-control" placeholder="Nome do vendedor" value="${_comVend?.nome|| (document.getElementById('vendedorResponsavel')?.value||'')}">
              </div>
              <div class="col-3">
                <label class="form-label">Código do vendedor</label>
                <input id="comVendCodigo" class="form-control" placeholder="Código do vendedor" value="${codigoVendedorPopupInicial}" data-valor-original="${codigoVendedorPopupInicial}">
              </div>
              <div class="col-3">
                <label class="form-label">Código cliente/fornecedor</label>
                <input id="comVendCodigoFornecedor" class="form-control" placeholder="Código cliente/fornecedor" value="${codigoClienteFornecedorVendedorPopupInicial}" data-valor-original="${codigoClienteFornecedorVendedorPopupInicial}">
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
              <label><input type="radio" name="comVendModo" value="percent" checked> % do total produto</label>
              <label><input type="radio" name="comVendModo" value="valor"> Valor fixo (R$)</label>
            </div>

            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <label class="form-label" style="min-width:90px;">Valor</label>
              <input id="comVendPercent" type="number" min="0" step="0.01" value="1" class="form-control" style="max-width:140px;">
              <input id="comVendValor" type="text" value="${fmtBRL(0)}" class="form-control" style="max-width:180px;">
            </div>

            <div class="row g-2" style="margin-top:8px;">
              <div class="col-6">
                <label class="form-label">Previsão</label>
                <input type="date" id="vendPrev" class="form-control" value="${_comVend?.prev||''}">
              </div>
              <div class="col-6">
                <label class="form-label">Vencimento</label>
                <input type="date" id="vendVenc" class="form-control" value="${_comVend?.venc||''}">
              </div>
            </div>

            <div style="margin-top:8px;">
              <label class="form-label">Observação (opcional)</label>
              <textarea id="vendObs" rows="2" class="form-control" placeholder="Ex: Comissão consultor">${_comVend?.obs||''}</textarea>
            </div>

            <div class="vv-help" style="margin-top:6px;">Calculado: <b id="comVendCalc">R$ 0,00</b></div>
          </section>

          <!-- Resumo -->
          <section style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
            <h4 style="margin:0 0 8px 0;">Resumo</h4>
            <div class="vv-help">Arquiteto: <b id="sumArq">R$ 0,00</b></div>
            <div class="vv-help">Vendedor: <b id="sumVend">R$ 0,00</b></div>
            <div class="vv-help" style="margin-top:4px;">Total: <b id="sumTot">R$ 0,00</b></div>
          </section>
        </div>
      </div>
    `;

    const ft = document.createElement('div');
    ft.className = 'vv-footer';
    ft.innerHTML = `
      <div class="vv-help">Informativo — não altera valores enviados à Omie.</div>
      <div style="display:flex; gap:8px;">
        <button class="vv-btn" id="commCancel">Cancelar</button>
        <button class="vv-btn primary" id="commSave">Salvar</button>
      </div>
    `;

    md.appendChild(hd);
    md.appendChild(by);
    md.appendChild(ft);
    bd.appendChild(md);
    document.body.appendChild(bd);

    const $selArq        = by.querySelector('#comArqSelect');
    const $comArqNome    = by.querySelector('#comArqNome');
    const $comArqCodigo  = by.querySelector('#comArqCodigo');
    const $comArqPercent = by.querySelector('#comArqPercent');
    const $comArqValor   = by.querySelector('#comArqValor');
    const $arqPrev       = by.querySelector('#arqPrev');
    const $arqVenc       = by.querySelector('#arqVenc');
    const $arqObs        = by.querySelector('#arqObs');

    const $comVendNome    = by.querySelector('#comVendNome');
    const $comVendCodigo  = by.querySelector('#comVendCodigo');
    const $comVendCodigoFornecedor = by.querySelector('#comVendCodigoFornecedor');
    const $comVendPercent = by.querySelector('#comVendPercent');
    const $comVendValor   = by.querySelector('#comVendValor');
    const $vendPrev       = by.querySelector('#vendPrev');
    const $vendVenc       = by.querySelector('#vendVenc');
    const $vendObs        = by.querySelector('#vendObs');

    if ($arqObs) $arqObs.value = vv_normalizarObservacaoComissao($arqObs.value);
    if ($vendObs) $vendObs.value = vv_normalizarObservacaoComissao($vendObs.value);

    const $comArqCalc   = by.querySelector('#comArqCalc');
    const $comVendCalc  = by.querySelector('#comVendCalc');
    const $sumArq       = by.querySelector('#sumArq');
    const $sumVend      = by.querySelector('#sumVend');
    const $sumTot       = by.querySelector('#sumTot');
    const $baseArqLabel = by.querySelector('#vv-com-base-arq');
    const $baseVendLabel= by.querySelector('#vv-com-base-vend');
    const $vendedorTela = document.getElementById('vendedorResponsavel');

    const getModoArq = ()=> by.querySelector('input[name="comArqModo"]:checked')?.value || 'valor';

    // trava UI do vendedor
    by.querySelectorAll('input[name="comVendModo"]').forEach(r => {
      r.checked = (r.value === 'percent');
      r.disabled = true;
    });
    $comVendPercent.value = '1';
    $comVendPercent.disabled = true;
    $comVendValor.value = fmtBRL(0);
    $comVendValor.disabled = true;

    if ($selArq){
      $selArq.addEventListener('change', ()=>{
        const opt = $selArq.selectedOptions[0];
        if (!opt) return;
        $comArqNome.value   = opt.value || '';
        $comArqCodigo.value = opt.getAttribute('data-codigo') || '';
        sincronizarCodigoArquitetoPopup();
      });
    }

    async function sincronizarCodigoArquitetoPopup() {
      const nomeArquiteto = ($comArqNome?.value || '').trim();
      if (!nomeArquiteto || !$comArqCodigo) return;

      try {
        const codigo = await vvBuscarCodigoClienteOmiePorNome(nomeArquiteto);
        if (!codigo) return;
        $comArqCodigo.value = codigo;
        $comArqCodigo.dataset.valorOriginal = codigo;
        $comArqCodigo.setAttribute('data-valor-original', codigo);
      } catch (erro) {
        console.warn('[comissao] nao foi possivel resolver codigo do arquiteto pela API de clientes.', erro);
      }
    }

    function sincronizarCodigoVendedorPopup() {
      if (!$comVendCodigo) return;

      const nomeVendedor =
        $comVendNome?.value?.trim() ||
        $vendedorTela?.options?.[$vendedorTela.selectedIndex]?.text?.trim() ||
        $vendedorTela?.value?.trim() ||
        _comVend?.nome ||
        '';

      const codigo =
        resolverCodigoVendedor(nomeVendedor) ||
        document.getElementById('codigoVendedor')?.value?.trim() ||
        '';

      if (!codigo) return;

      $comVendCodigo.value = codigo;
      $comVendCodigo.dataset.valorOriginal = codigo;
      $comVendCodigo.setAttribute('data-valor-original', codigo);
    }

    async function sincronizarCodigoFornecedorVendedorPopup() {
      const nomeVendedor = ($comVendNome?.value || '').trim();
      if (!nomeVendedor || !$comVendCodigoFornecedor) return;

      try {
        const codigo = await vvBuscarCodigoClienteOmiePorNome(nomeVendedor);
        if (!codigo) return;
        $comVendCodigoFornecedor.value = codigo;
        $comVendCodigoFornecedor.dataset.valorOriginal = codigo;
        $comVendCodigoFornecedor.setAttribute('data-valor-original', codigo);
      } catch (erro) {
        console.warn('[comissao] nao foi possivel resolver codigo cliente/fornecedor do vendedor pela API de clientes.', erro);
      }
    }

    function limparSyncCodigoVendedorPopup() {
      $comVendNome?.removeEventListener('input', sincronizarCodigoVendedorPopup);
      $comVendNome?.removeEventListener('change', sincronizarCodigoVendedorPopup);
      $vendedorTela?.removeEventListener('change', sincronizarCodigoVendedorPopup);
      $vendedorTela?.removeEventListener('input', sincronizarCodigoVendedorPopup);
      $comArqNome?.removeEventListener('input', sincronizarCodigoArquitetoPopup);
      $comArqNome?.removeEventListener('change', sincronizarCodigoArquitetoPopup);
      $comVendNome?.removeEventListener('input', sincronizarCodigoFornecedorVendedorPopup);
      $comVendNome?.removeEventListener('change', sincronizarCodigoFornecedorVendedorPopup);
      $vendedorTela?.removeEventListener('change', sincronizarCodigoFornecedorVendedorPopup);
      $vendedorTela?.removeEventListener('input', sincronizarCodigoFornecedorVendedorPopup);
    }

    $comArqNome?.addEventListener('input', sincronizarCodigoArquitetoPopup);
    $comArqNome?.addEventListener('change', sincronizarCodigoArquitetoPopup);
    $comVendNome?.addEventListener('input', sincronizarCodigoVendedorPopup);
    $comVendNome?.addEventListener('change', sincronizarCodigoVendedorPopup);
    $comVendNome?.addEventListener('input', sincronizarCodigoFornecedorVendedorPopup);
    $comVendNome?.addEventListener('change', sincronizarCodigoFornecedorVendedorPopup);
    $vendedorTela?.addEventListener('change', sincronizarCodigoVendedorPopup);
    $vendedorTela?.addEventListener('input', sincronizarCodigoVendedorPopup);
    $vendedorTela?.addEventListener('change', sincronizarCodigoFornecedorVendedorPopup);
    $vendedorTela?.addEventListener('input', sincronizarCodigoFornecedorVendedorPopup);
    sincronizarCodigoArquitetoPopup();
    sincronizarCodigoVendedorPopup();
    sincronizarCodigoFornecedorVendedorPopup();

    function recalcComm(){
      const baseArqResumo = lerComissaoArquitetoResumoVisual();
      const baseVendProduto = lerValorProdutoResumo();

      const arq = (getModoArq() === 'percent')
        ? (Number($comArqPercent.value || 0) / 100) * baseArqResumo
        : parseBRL($comArqValor.value || '0');

      const vend = 0.01 * baseVendProduto;

      $baseArqLabel.textContent = fmtBRL(baseArqResumo);
      $baseVendLabel.textContent = fmtBRL(baseVendProduto);

      $comArqCalc.textContent = fmtBRL(arq);
      $comVendCalc.textContent = fmtBRL(vend);

      $sumArq.textContent = fmtBRL(arq);
      $sumVend.textContent = fmtBRL(vend);
      $sumTot.textContent = fmtBRL(Math.max(0, arq) + Math.max(0, vend));
    }

    by.querySelectorAll('input[name="comArqModo"]').forEach(r => r.addEventListener('change', recalcComm));
    [$comArqPercent, $comArqValor].forEach(inp => {
      inp.addEventListener('input', recalcComm);
      if (inp === $comArqValor) {
        inp.addEventListener('blur', ()=>{
          inp.value = fmtBRL(parseBRL(inp.value || '0'));
          recalcComm();
        });
      }
    });

    recalcComm();

    ft.querySelector('#commCancel').addEventListener('click', ()=>{
      limparSyncCodigoVendedorPopup();
      document.body.removeChild(bd);
      resolveC(null);
    });

    ft.querySelector('#commSave').addEventListener('click', ()=>{
      const codigoVendedorSalvo = ($comVendCodigo.value || '').trim();
      const codigoClienteFornecedorVendedorSalvo = String(
        $comVendCodigoFornecedor?.value ||
        _comVend?.codigo_cliente_fornecedor ||
        _comVend?.codigoClienteFornecedor ||
        _comVend?.codigo_fornecedor ||
        _comVend?.codigoFornecedor ||
        ''
      ).trim();

      _comArq = {
        modo: getModoArq(),
        percent: Number($comArqPercent.value || 0),
        valorManual: parseBRL($comArqValor.value || '0'),
        nome: $comArqNome.value || '',
        codigo: $comArqCodigo.value || '',
        prev: $arqPrev.value || '',
        venc: $arqVenc.value || '',
        obs: $arqObs.value || ''
      };

      _comVend = {
        ..._comVend,
        modo: 'percent',
        percent: 1,
        valorManual: 0,
        nome: $comVendNome.value || '',
        codigo: codigoVendedorSalvo,
        codigo_vendedor: codigoVendedorSalvo,
        codigo_cliente_fornecedor: codigoClienteFornecedorVendedorSalvo,
        prev: $vendPrev.value || '',
        venc: $vendVenc.value || '',
        obs: $vendObs.value || ''
      };

      const arqCalc = parseBRL($sumArq.textContent || '0');
      const venCalc = parseBRL($sumVend.textContent || '0');

      if (typeof atualizarComissaoArquitetoNoResumo === 'function') {
        atualizarComissaoArquitetoNoResumo(arqCalc);
      }

      limparSyncCodigoVendedorPopup();
      document.body.removeChild(bd);
      resolveC({
        baseConsiderada: lerValorProdutoResumo(),
        arquiteto: { ..._comArq, valorCalculado: arqCalc },
        vendedor:  { ..._comVend, valorCalculado: venCalc },
        total: arqCalc + venCalc
      });
    });
  });
}


  // === Normalização nome->código vendedor ===
  function _vv_normNome(s){
    return (s || "")
      .toString()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim()
      .toUpperCase();
  }
 const VENDEDORES_CODIGO = [
    { nome:"FELIPE ULHOA FERREIRA", codigo:"2452905682", aliases:["FELIPE ULHOA","FELIPE U","FELIPE F","FELIPE FERREIRA"] },
    { nome:"JOAO CLEBER MARTINS",   codigo:"2452905334", aliases:["JOAO CLEBER","JOÃO CLEBER","JOAO C MARTINS","J C MARTINS","JOAO MARTINS"] },
    { nome:"RAFAEL ANGELO ARAUJO DA SILVA", codigo:"2452905445", aliases:["RAFAEL ANGELO","RAFAEL A A SILVA","RAFAEL ARAUJO","RAFAEL SILVA"] }
  ];

  window.VV_VENDEDORES_CODIGO = VENDEDORES_CODIGO.map(vendedor => ({
    nome: String(vendedor?.nome || "").trim(),
    codigo: String(vendedor?.codigo || "").trim(),
    aliases: Array.isArray(vendedor?.aliases) ? [...vendedor.aliases] : []
  }));
  window.VV_VENDEDORES_CODIGO = [
    { nome:"FELIPE ULHOA FERREIRA", codigo:"2452905682", aliases:["FELIPE ULHOA","FELIPE U","FELIPE F","FELIPE FERREIRA"] },
    { nome:"JOAO CLEBER MARTINS",   codigo:"2452905334", aliases:["JOAO CLEBER","JOAO C MARTINS","J C MARTINS","JOAO MARTINS"] },
    { nome:"RAFAEL ANGELO ARAUJO DA SILVA", codigo:"2452905445", aliases:["RAFAEL ANGELO","RAFAEL A A SILVA","RAFAEL ARAUJO","RAFAEL SILVA"] }
  ];
  window.VV_VENDEDORES_CODIGO_COMISSAO = window.VV_VENDEDORES_CODIGO.map(vendedor => ({
    nome: String(vendedor?.nome || "").trim(),
    codigo: String(vendedor?.codigo || "").trim(),
    aliases: Array.isArray(vendedor?.aliases) ? [...vendedor.aliases] : []
  }));

  function resolverCodigoVendedor(nome){
    const n = _vv_normNome(nome);
    const vendedores = Array.isArray(window.VV_VENDEDORES_CODIGO) && window.VV_VENDEDORES_CODIGO.length
      ? window.VV_VENDEDORES_CODIGO
      : VENDEDORES_CODIGO;
    if (!n) return "";
    for (const v of vendedores){
      if (_vv_normNome(v.nome) === n) return v.codigo;
    }
    for (const v of vendedores){
      if ((v.aliases||[]).some(a => _vv_normNome(a) === n)) return v.codigo;
    }
    for (const v of vendedores){
      const alvo = _vv_normNome(v.nome);
      if (n.includes(alvo) || alvo.includes(n)) return v.codigo;
      if ((v.aliases||[]).some(a => {
        const aa = _vv_normNome(a);
        return n.includes(aa) || aa.includes(n);
      })) return v.codigo;
    }
    return "";
  }
  (function wireVendedorCodigoAuto(){
    const sel = document.getElementById("vendedorResponsavel");
    if (!sel) return;
    let cod = document.getElementById("codigoVendedor");
    if (!cod){
      cod = document.createElement("input");
      cod.type = "text";
      cod.id = "codigoVendedor";
      cod.className = "form-control";
      cod.placeholder = "Código do vendedor";
      cod.style.maxWidth = "220px";
      sel.parentElement?.appendChild(cod);
    }
    function atualizarCodigo(){
      const nome = (sel.value || sel.options?.[sel.selectedIndex]?.text || "").trim();
      const codigo = resolverCodigoVendedor(nome);
      cod.value = codigo;
    }
    sel.addEventListener("change", atualizarCodigo);
    sel.addEventListener("input", atualizarCodigo);
    atualizarCodigo();
  })();

  // ===================== MODAL PRINCIPAL =====================
  return new Promise(resolve => {
    const backdrop = document.createElement('div'); backdrop.className = 'vv-modal-backdrop';
    const modal    = document.createElement('div'); modal.className    = 'vv-modal';

    const header = document.createElement('header');
    header.innerHTML = `
      <h3 style="flex:1;">Selecione os itens (Desconto primeiro → Ignorar → MO → Serviços)</h3>
      <label id="vv-label-so-servicos" style="
        display:inline-flex; align-items:center; gap:6px; cursor:pointer;
        font-size:13px; font-weight:600; color:#7c3aed;
        background:#f5f3ff; border:1px solid #c4b5fd;
        border-radius:8px; padding:6px 12px; white-space:nowrap;
        user-select:none;
      ">
        <input type="checkbox" id="vv-chk-so-servicos" style="accent-color:#7c3aed; width:15px; height:15px; cursor:pointer;">
        Somente Serviços
      </label>
    `;

    const body  = document.createElement('div'); body.className = 'vv-body';

    // --------- controles ---------
    const controls = document.createElement('div');
    controls.style.cssText = "display:grid; gap:8px; margin-bottom:12px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items:end;";
    controls.innerHTML = `
      <!-- Serviços -->
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="font-weight:600;">Serviços (aplicado nos aprovados)</label>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <label><input type="radio" name="srvModo" value="percent" checked> % do total aprovado</label>
          <label><input type="radio" name="srvModo" value="valor"> Valor fixo (R$)</label>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input id="srvPercent" type="number" min="0" step="0.01" value="0" class="vv-input" style="width:120px; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
          <input id="srvValor"   type="text"   value="R$ 0,00" class="vv-input" style="width:160px; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <small class="vv-help">Ignorados não entram no rateio de Serviços.</small>
      </div>

      <!-- Desconto -->
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="font-weight:600;">Desconto (primeiro, sobre o <b>TOTAL</b> dos itens)</label>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <label><input type="radio" name="discModo" value="percent" checked> % do total</label>
          <label><input type="radio" name="discModo" value="valor"> Valor fixo (R$)</label>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input id="discPercent" type="number" min="0" step="0.01" value="0" class="vv-input" style="width:120px; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
          <input id="discValor"   type="text"   value="R$ 0,00" class="vv-input" style="width:160px; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <small class="vv-help">Depois o desconto é <b>dividido igualmente</b> entre os aprovados.</small>
      </div>

      <!-- Comissão (display) -->
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="font-weight:600;">Comissão (informativa — não vai para a Omie)</label>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <label><input type="radio" name="comModo" value="percent" checked> % do total aprovado</label>
          <label><input type="radio" name="comModo" value="valor"> Valor fixo (R$)</label>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input id="comPercent" type="number" min="0" step="0.01" value="0" class="vv-input" style="width:120px; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
          <input id="comValor"   type="text"   value="R$ 0,00" class="vv-input" style="width:160px; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
        </div>
        <small class="vv-help">Use o botão "Comissão…" para cadastrar nomes e confirmar.</small>
      </div>
    `;

    // --------- tabela ---------
    const table = document.createElement('table');
    table.className = 'vv-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th style="width:44px;">Ignorar</th>
          <th>Ambiente</th>
          <th>Produto</th>
          <th>Código</th>
          <th class="vv-right">% part.</th>
          <th class="vv-right">Valor original</th>
          <th class="vv-right">Valor ajustado (base+MO)</th>
          <th class="vv-right">Final p/ OMIE</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    // --------- rodapé ---------
    const footer = document.createElement('div');
    footer.className = 'vv-footer';
    footer.innerHTML = `
      <div class="totais">
        <div>Total aprovado (base + MO): <b id="vv-total-aprovado">R$ 0,00</b></div>
        <div>Serviços aplicado: <b id="vv-total-servicos">R$ 0,00</b></div>
        <div>Desconto total (sobre TODOS): <b id="vv-total-desconto">R$ 0,00</b></div>
        <div>Comissão (info): <b id="vv-total-comissao">R$ 0,00</b></div>
        <div>Total produtos após ajuste: <b id="vv-total-ajustado">R$ 0,00</b></div>

        <div style="margin-top:10px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; padding-top:8px; border-top:1px dashed #e5e7eb;">
          <div>Total (Produto): <b id="vv-cat-produto">R$ 0,00</b></div>
          <div>Total (Serviço): <b id="vv-cat-servico">R$ 0,00</b></div>
          <div>Produtos faturados diretos: <b id="vv-cat-vidro">R$ 0,00</b></div>
        </div>

        <small class="vv-help" style="display:block; margin-top:6px;">
          <b>Regra especial:</b> se "Mão de Obra de Instalação (por Hora)" for <i>ignorado</i>, seu valor é dividido em partes iguais entre os itens não ignorados.
        </small>
      </div>
      <div class="acoes" style="display:flex; gap:8px;">
        <button class="vv-btn" id="vv-comissoes">Comissão…</button>
        <button class="vv-btn" id="vv-marcar-todos">Marcar todos como ignorados</button>
        <button class="vv-btn" id="vv-desmarcar-todos">Limpar marcações</button>
        <button class="vv-btn" id="vv-cancelar">Cancelar</button>
        <button class="vv-btn primary" id="vv-confirmar">Confirmar seleção</button>
      </div>
    `;

    // --------- ajuda + filtros ---------
    const help = document.createElement('div');
    help.className = 'vv-help';
    help.innerHTML = `
      Ordem: <b>Desconto</b> sobre TODOS → <b>Ignorar</b> → <b>MO</b> redistribuida entre aprovados → <b>Servicos</b> abatidos do total final de produtos. Arredonda so no final.
    `;

    const filtros = document.createElement('div');
    filtros.style.cssText = "display:flex; gap:10px; align-items:center; margin:12px 0; flex-wrap:wrap;";
    filtros.innerHTML = `
      <input id="filtroTexto" type="text" placeholder="Buscar..." 
        style="padding:8px 12px; border:1px solid #ccc; border-radius:8px; width:220px;" />
      <button class="vv-btn" id="filtroTodos">Todos</button>
      <button class="vv-btn" id="filtroVidros">Somente Vidros</button>
      <button class="vv-btn" id="filtroServicos">Somente Serviços</button>
      <small class="vv-help">Filtros são visuais; não alteram os cálculos.</small>
    `;

    // monta
    const bodyWrap = document.createElement('div');
    bodyWrap.appendChild(help);
    bodyWrap.appendChild(filtros);
    bodyWrap.appendChild(controls);
    bodyWrap.appendChild(table);
    body.appendChild(bodyWrap);
    modal.appendChild(header); modal.appendChild(body); modal.appendChild(footer);
    backdrop.appendChild(modal); document.body.appendChild(backdrop);

    // --------- linhas ---------
itens.forEach(item => {
  const tr = document.createElement('tr');
  const ehMOHora = isMaoDeObraInstalPorHora(item.descricao);
  const kind = classifyKind(item.descricao || '');
  tr.innerHTML = `
    <td><input type="checkbox" class="vv-ignorar" data-key="${item.key}"></td>
    <td>${item.ambiente || '-'}</td>
    <td>${item.descricao ? item.descricao : '<small>Sem descrição</small>'}${ehMOHora ? ' <small style="color:#2563eb;font-weight:600;">(MO Hora)</small>' : ''}</td>
    <td><span class="vv-mono">${item.codigo || '-'}</span></td>
    <td class="vv-right vv-mono" data-col="part">0%</td>
    <td class="vv-right vv-mono" data-col="original">${vv_fmtBRL(Number(item.valorTotalGrupo)||0)}</td>
    <td class="vv-right vv-mono" data-col="ajustado">R$ 0,00</td>
    <td class="vv-right vv-mono" data-col="final">R$ 0,00</td>
  `;
  tr.dataset.key      = item.key;
  tr.dataset.valor    = String(Number(item.valorTotalGrupo) || 0);
  tr.dataset.custo    = String(Number(item.valorCustoMaterial) || 0); // ✅ NOVO
  tr.dataset.islabor  = ehMOHora ? '1' : '0';
  tr.dataset.kind     = kind;
  tbody.appendChild(tr);
});
    // --------- refs ---------
    const chkAll       = [...tbody.querySelectorAll('.vv-ignorar')];
    const $totAprov    = footer.querySelector('#vv-total-aprovado');
    const $totServ     = footer.querySelector('#vv-total-servicos');
    const $totDesc     = footer.querySelector('#vv-total-desconto');
    const $totCom      = footer.querySelector('#vv-total-comissao');
    const $totAjust    = footer.querySelector('#vv-total-ajustado');
    const $catProduto  = footer.querySelector('#vv-cat-produto');
    const $catServico  = footer.querySelector('#vv-cat-servico');
    const $catVidro    = footer.querySelector('#vv-cat-vidro');

  const $srvPercent  = controls.querySelector('#srvPercent');
const $srvValor    = controls.querySelector('#srvValor');
let srvValorEditadoManualmente = false;
$srvValor.addEventListener('input', () => {
  srvValorEditadoManualmente = true;
});
const $discPercent = controls.querySelector('#discPercent');
const $discValor   = controls.querySelector('#discValor');
const $comPercent  = controls.querySelector('#comPercent');
const $comValor    = controls.querySelector('#comValor');

// ===================== SYNC DESCONTO COM #campoDescontoFinal =====================


const $campoDescontoFinal = document.getElementById('campoDescontoFinal');

function syncDescontoFromCampoFinal(){
  if (!$campoDescontoFinal) return;

  // usa apenas o valor atual digitado — ignora data-valor-original para não ressuscitar desconto removido
  let raw = String(($campoDescontoFinal.value ?? '').trim());

  // campo vazio ou zerado → reseta desconto no popup
  if (!raw || raw === '0' || raw === 'R$ 0,00' || raw === '0,00') {
    const rValor = controls.querySelector('input[name="discModo"][value="valor"]');
    if (rValor) rValor.checked = true;
    $discValor.value = vv_fmtBRL(0);
    $discValor.dataset.valorOriginal = '0';
    $discPercent.value = '0';
    $discPercent.dataset.valorOriginal = '0';
    return;
  }

  // normaliza NBSP
  raw = raw.replace(/\u00A0/g, ' ');

  // Se vier com %, usa percent
  if (raw.includes('%')) {
    const rPercent = controls.querySelector('input[name="discModo"][value="percent"]');
    if (rPercent) rPercent.checked = true;

    const num = Number(raw.replace(',', '.').replace(/[^\d.]/g,'')) || 0;
    $discPercent.value = String(num);

    // ✅ AJUSTE: manter data-valor-original alinhado com #campoDescontoFinal
    $discPercent.dataset.valorOriginal = String(num);
    // (limpa o outro pra não confundir)
    $discValor.dataset.valorOriginal = vv_fmtBRL(0);

    return;
  }

  // Caso contrário, trata como VALOR FIXO (R$), inclusive quando raw = "500"
  const rValor = controls.querySelector('input[name="discModo"][value="valor"]');
  if (rValor) rValor.checked = true;

  // se for "500" puro, vv_parseBRL pode retornar 0 dependendo da sua implementação,
  // então garantimos fallback numérico
  let v = (typeof vv_parseBRL === 'function') ? vv_parseBRL(raw) : 0;
  if (!v || isNaN(v)) {
    v = Number(String(raw).replace(/[^\d,\.]/g,'').replace(/\./g,'').replace(',','.')) || 0;
  }

  $discValor.value = vv_fmtBRL(v);

  // ✅ AJUSTE: data-valor-original do discValor = data-valor-original do campoDescontoFinal (mesma base numérica)
  // Ex: campoDescontoFinal data-valor-original="500" -> discValor data-valor-original="500"
  $discValor.dataset.valorOriginal = String(Number(v) || 0);
  // (e mantém o percent coerente)
  $discPercent.dataset.valorOriginal = String(Number($discPercent.value || 0) || 0);
}

// sincroniza ao abrir o modal
syncDescontoFromCampoFinal();

// mantém sincronizado quando o campo mudar fora do modal
if ($campoDescontoFinal){
  $campoDescontoFinal.addEventListener('input', ()=>{ syncDescontoFromCampoFinal(); recalc(); if (typeof atualizarValoresParcelas === "function") atualizarValoresParcelas(); });
  $campoDescontoFinal.addEventListener('change', ()=>{ syncDescontoFromCampoFinal(); recalc(); if (typeof atualizarValoresParcelas === "function") atualizarValoresParcelas(); });
}
// ================================================================================

const getModoServicos = () => (controls.querySelector('input[name="srvModo"]:checked')?.value) || 'percent';
const getModoDesconto = () => (controls.querySelector('input[name="discModo"]:checked')?.value) || 'percent';
const getModoComissao = () => (controls.querySelector('input[name="comModo"]:checked')?.value) || 'percent';


    const sum = (arr) => arr.reduce((a,b)=>a+b,0);
    const toCents = (v) => Math.round(v * 100);
    const fromCents = (c) => c / 100;

    // ============== FILTROS (visuais) ==============
    const filtroInput = filtros.querySelector('#filtroTexto');
    const btnTodos    = filtros.querySelector('#filtroTodos');
    const btnVidros   = filtros.querySelector('#filtroVidros');
    const btnServ     = filtros.querySelector('#filtroServicos');

    function aplicarFiltro(tipo = 'todos'){
      const termo = (filtroInput.value || '').toLowerCase().trim();
      [...tbody.querySelectorAll('tr')].forEach(tr=>{
        const desc = (tr.children[2]?.innerText || '').toLowerCase();
        const amb  = (tr.children[1]?.innerText || '').toLowerCase();
        const kind = tr.dataset.kind;
        const isLabor = tr.dataset.islabor === '1';

        let mostra = true;
        if (tipo === 'vidros')   mostra = (kind === 'vidro');
        if (tipo === 'servicos') mostra = (kind === 'servico' || isLabor);

        if (termo && !(desc.includes(termo) || amb.includes(termo))) mostra = false;

        tr.style.display = mostra ? '' : 'none';
      });
    }

    filtroInput.addEventListener('input', ()=>aplicarFiltro());
    btnTodos.addEventListener('click', ()=>aplicarFiltro('todos'));
    btnVidros.addEventListener('click', ()=>aplicarFiltro('vidros'));
    btnServ.addEventListener('click',  ()=>aplicarFiltro('servicos'));


    function mostrarAlertaDescontoExcessivo(msg, tipo = "erro") {
  let alerta = document.getElementById("vv-alerta-desconto-excessivo");

  if (!alerta) {
    alerta = document.createElement("div");
    alerta.id = "vv-alerta-desconto-excessivo";
    alerta.style.margin = "10px 0";
    alerta.style.padding = "12px 14px";
    alerta.style.borderRadius = "10px";
    alerta.style.fontWeight = "600";
    alerta.style.fontSize = "14px";
    alerta.style.display = "none";
    alerta.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";

    controls.parentNode.insertBefore(alerta, table);
  }

  if (!msg) {
    alerta.style.display = "none";
    alerta.innerHTML = "";
    return;
  }

  alerta.style.display = "block";

  if (tipo === "ok") {
    alerta.style.background = "#e8f7ee";
    alerta.style.color = "#146c2e";
    alerta.style.border = "1px solid #b7e4c7";
    alerta.innerHTML = `✅ ${msg}`;
  } else {
    alerta.style.background = "#fdecec";
    alerta.style.color = "#a61b1b";
    alerta.style.border = "1px solid #f5b5b5";
    alerta.innerHTML = `⚠️ ${msg}`;
  }
}
    // ===================== RECALC =====================
function recalc(){
  const rows = [...tbody.querySelectorAll('tr')];
  const isIgnoredKey = (key) => !!chkAll.find(c => c.dataset.key===key)?.checked;

  const totalTodos = rows.reduce((acc, tr) => acc + (Number(tr.dataset.valor||0) || 0), 0);

  let descontoTotal = 0;
  if (getModoDesconto()==='percent'){
    const p = Number($discPercent.value||0);
    descontoTotal = (p/100) * totalTodos;
  } else {
    descontoTotal = vv_parseBRL($discValor.value||'0');
  }
  descontoTotal = Math.max(0, Math.min(descontoTotal, totalTodos));

  const aprovadosRows = rows.filter(tr => !isIgnoredKey(tr.dataset.key));
  const nAprov = aprovadosRows.length;

  // Faturamento direto = ignorados sem MO, usando data-custo
  const catIgnoradosSemMO = rows
    .filter(tr => isIgnoredKey(tr.dataset.key) && tr.dataset.islabor !== '1')
    .reduce((acc, tr) => acc + toCents(Number(tr.dataset.custo || 0)), 0);

  // ✅ baseParaServico = (totalTodos - desconto) - faturamento direto
  const totalTodosComDescontoParaServico = Math.max(0, totalTodos - descontoTotal);
  const baseParaServico = Math.max(0, totalTodosComDescontoParaServico - fromCents(catIgnoradosSemMO));

  // Só aplica 20% automático se há itens de serviço reais aprovados
  const temServicosReais = rows.some(tr =>
    !isIgnoredKey(tr.dataset.key) && (tr.dataset.kind === 'servico' || tr.dataset.islabor === '1')
  );
  const valorServicosAutomatic = temServicosReais ? baseParaServico * 0.20 : 0;

  console.log('[recalc] catIgnoradosSemMO:', fromCents(catIgnoradosSemMO));
  console.log('[recalc] baseParaServico:', baseParaServico);
  console.log('[recalc] temServicosReais:', temServicosReais);
  console.log('[recalc] valorServicosAutomatic:', valorServicosAutomatic);

  // Preenche campo de serviços automaticamente apenas se há serviços reais
if ($srvValor && valorServicosAutomatic > 0 && !srvValorEditadoManualmente) {
  const valorAtual = vv_parseBRL($srvValor.value || '0');
  if (Math.abs(valorAtual - valorServicosAutomatic) > 0.01) {
    const rValorSrv = controls.querySelector('input[name="srvModo"][value="valor"]');
    if (rValorSrv) rValorSrv.checked = true;
    $srvValor.value = vv_fmtBRL(valorServicosAutomatic);
    $srvValor.dataset.valorOriginal = vv_fmtBRL(valorServicosAutomatic);
  }
} else if (!temServicosReais && !srvValorEditadoManualmente) {
  // Sem serviços reais e sem edição manual — zera o campo
  if ($srvValor) { $srvValor.value = vv_fmtBRL(0); }
}

  if (nAprov === 0){
    rows.forEach(tr => {
      tr.querySelector('[data-col="part"]').textContent = '0%';
      tr.querySelector('[data-col="ajustado"]').textContent = vv_fmtBRL(Number(tr.dataset.valor||0));
      tr.querySelector('[data-col="final"]').textContent = vv_fmtBRL(0);
    });

    $totAprov.textContent   = vv_fmtBRL(0);
    $totServ.textContent    = vv_fmtBRL(0);
    $totDesc.textContent    = vv_fmtBRL(descontoTotal);
    $totCom.textContent     = vv_fmtBRL(0);
    $totAjust.textContent   = vv_fmtBRL(0);
    $catProduto.textContent = vv_fmtBRL(0);
    $catServico.textContent = vv_fmtBRL(0);
    $catVidro.textContent   = vv_fmtBRL(fromCents(catIgnoradosSemMO));
    _lastTotalBaseMO = 0;
    return;
  }

  const laborIgnoredTotal = rows.reduce((acc, tr) => {
    const isLab = tr.dataset.islabor === '1';
    const isIgn = isIgnoredKey(tr.dataset.key);
    return acc + (isLab && isIgn ? (Number(tr.dataset.valor||0)||0) : 0);
  }, 0);

  const cotaMO = laborIgnoredTotal > 0 ? (laborIgnoredTotal / nAprov) : 0;

  const baseMOMap = new Map();
  let totalBaseMO = 0;
  aprovadosRows.forEach(tr => {
    const original = Number(tr.dataset.valor||0) || 0;
    const base = original + cotaMO;
    baseMOMap.set(tr.dataset.key, base);
    totalBaseMO += base;
  });

  const descontoAplicavel = Math.min(descontoTotal, totalBaseMO);
  const cotaDescontoIgual = nAprov > 0 ? (descontoAplicavel / nAprov) : 0;
  const baseLiquidaMap = new Map();
  let totalLiquidoGeral = 0;
  aprovadosRows.forEach(tr => {
    const key = tr.dataset.key;
    const base = baseMOMap.get(key) || (Number(tr.dataset.valor || 0) || 0);
    const baseLiquida = Math.max(0, base - cotaDescontoIgual);
    baseLiquidaMap.set(key, baseLiquida);
    totalLiquidoGeral += baseLiquida;
  });

  // ✅ Usa valorServicosAutomatic direto — não lê o campo para evitar loop
const servTotal = valorServicosAutomatic > 0 && !srvValorEditadoManualmente
  ? valorServicosAutomatic
  : getModoServicos() === 'percent'
    ? ((Number($srvPercent.value||0)/100) * totalLiquidoGeral)
    : vv_parseBRL($srvValor.value||'0');

  const servAplicavel = Math.max(0, Math.min(servTotal, totalLiquidoGeral));

  const totalProdutosDestino  = Math.max(0, totalLiquidoGeral - servAplicavel);
  const totalProdutosDestinoC = toCents(totalProdutosDestino);
  const catServicoC           = toCents(servAplicavel);

  const rowsProdutosOmie = aprovadosRows.filter(tr => {
    const kind    = tr.dataset.kind;
    const isLabor = tr.dataset.islabor === '1';
    return kind !== 'servico' && !isLabor;
  });

  const baseProdutosParaRateio = rowsProdutosOmie.reduce((acc, tr) => {
    return acc + (baseLiquidaMap.get(tr.dataset.key) || 0);
  }, 0);

  const alocacaoProdutoC = new Map();
  if (rowsProdutosOmie.length > 0 && baseProdutosParaRateio > 0 && totalProdutosDestinoC > 0) {
    let totalAlocadoC = 0;
    const restos = [];

    rowsProdutosOmie.forEach(tr => {
      const key         = tr.dataset.key;
      const baseLiquida = baseLiquidaMap.get(key) || 0;
      const brutoC      = (baseLiquida / baseProdutosParaRateio) * totalProdutosDestinoC;
      const pisoC       = Math.floor(brutoC);

      alocacaoProdutoC.set(key, pisoC);
      totalAlocadoC += pisoC;
      restos.push({ key, resto: brutoC - pisoC });
    });

    restos.sort((a, b) => b.resto - a.resto);

    let faltanteC = totalProdutosDestinoC - totalAlocadoC;
    while (faltanteC > 0 && restos.length > 0) {
      const item = restos.shift();
      alocacaoProdutoC.set(item.key, (alocacaoProdutoC.get(item.key) || 0) + 1);
      faltanteC -= 1;
    }
  }

  aprovadosRows.forEach(tr => {
    const key      = tr.dataset.key;
    const original = Number(tr.dataset.valor||0) || 0;
    const base     = baseMOMap.get(key) || original;
    const baseLiquida = baseLiquidaMap.get(key) || 0;

    const part = totalBaseMO > 0 ? (base / totalBaseMO) * 100 : 0;
    tr.querySelector('[data-col="part"]').textContent     = `${part.toFixed(2)}%`;
    tr.querySelector('[data-col="ajustado"]').textContent = vv_fmtBRL(baseLiquida);
    tr.querySelector('[data-col="final"]').textContent    = vv_fmtBRL(fromCents(alocacaoProdutoC.get(key) || 0));
  });

  rows
    .filter(tr => isIgnoredKey(tr.dataset.key))
    .forEach(tr => {
      tr.querySelector('[data-col="part"]').textContent     = '0%';
      tr.querySelector('[data-col="ajustado"]').textContent = vv_fmtBRL(Number(tr.dataset.valor||0));
      tr.querySelector('[data-col="final"]').textContent    = vv_fmtBRL(0);
    });

  const comDisplay = getModoComissao()==='percent'
    ? fromCents( toCents( (Number($comPercent.value||0)/100) * totalBaseMO ) )
    : fromCents( toCents( vv_parseBRL($comValor.value||'0') ) );

  $totAprov.textContent   = vv_fmtBRL(totalBaseMO);
  $totServ.textContent    = vv_fmtBRL(servAplicavel);
  $totDesc.textContent    = vv_fmtBRL(descontoAplicavel);
  $totCom.textContent     = vv_fmtBRL(comDisplay);
  $totAjust.textContent   = vv_fmtBRL(fromCents(totalProdutosDestinoC));

  const totalTodosComDesconto = Math.max(0, totalTodos - descontoTotal);
  const catProdutoC = toCents(Math.max(0, totalTodosComDesconto - fromCents(catIgnoradosSemMO) - servAplicavel));

  $catProduto.textContent = vv_fmtBRL(fromCents(catProdutoC));
  $catServico.textContent = vv_fmtBRL(fromCents(catServicoC));
  $catVidro.textContent   = vv_fmtBRL(fromCents(catIgnoradosSemMO));

  _lastTotalBaseMO = totalBaseMO;

  if (typeof atualizarValoresParcelas === "function") atualizarValoresParcelas();
}
    controls.querySelectorAll('input[name="srvModo"]').forEach(r=> r.addEventListener('change', recalc));
    controls.querySelectorAll('input[name="discModo"]').forEach(r=> r.addEventListener('change', recalc));
    controls.querySelectorAll('input[name="comModo"]').forEach(r=> r.addEventListener('change', recalc));
    [$srvPercent,$srvValor,$discPercent,$discValor,$comPercent,$comValor].forEach(inp=>{
      inp.addEventListener('input', recalc);
      if (inp===$srvValor || inp===$discValor || inp===$comValor){
        inp.addEventListener('blur', ()=>{ inp.value = vv_fmtBRL(vv_parseBRL(inp.value||'0')); });
      }
    });

    footer.querySelector('#vv-marcar-todos').addEventListener('click', ()=>{
      [...tbody.querySelectorAll('.vv-ignorar')].forEach(c => c.checked = true);
      recalc();
    });
    footer.querySelector('#vv-desmarcar-todos').addEventListener('click', ()=>{
      [...tbody.querySelectorAll('.vv-ignorar')].forEach(c => c.checked = false);
      recalc();
    });
    [...tbody.querySelectorAll('.vv-ignorar')].forEach(c => c.addEventListener('change', recalc));

    // ── Checkbox "Somente Serviços" ───────────────────────────────────────────
    const chkSoServicos = header.querySelector('#vv-chk-so-servicos');
    if (chkSoServicos) {
      chkSoServicos.addEventListener('change', () => {
        const ativo = chkSoServicos.checked;

        // ── 1) Marca/desmarca produtos na tabela ──
        [...tbody.querySelectorAll('tr')].forEach(tr => {
          const ehServico = tr.dataset.kind === 'servico';
          const chk = tr.querySelector('.vv-ignorar');
          if (chk) chk.checked = ativo ? !ehServico : false;
          tr.style.opacity = (ativo && !ehServico) ? '0.4' : '';
        });

        // ── 2) Destaca o label ──
        const label = header.querySelector('#vv-label-so-servicos');
        if (label) {
          label.style.background  = ativo ? '#7c3aed' : '#f5f3ff';
          label.style.color       = ativo ? '#fff'    : '#7c3aed';
          label.style.borderColor = ativo ? '#7c3aed' : '#c4b5fd';
        }

        // ── 3) Quando ativo: muda para "Valor fixo" e destaca o campo ──
        // Em modo somente serviços o total aprovado vira 0, então percentual
        // sempre resultaria em R$ 0. Força valor fixo para o usuário poder
        // digitar o valor correto.
        if (ativo) {
          const radioValor = controls.querySelector('input[name="srvModo"][value="valor"]');
          if (radioValor) {
            radioValor.checked = true;
            radioValor.dispatchEvent(new Event('change', { bubbles: true }));
          }
          // Destaca o campo de valor de serviço
          $srvValor.style.outline     = '2px solid #7c3aed';
          $srvValor.style.borderColor = '#7c3aed';
          $srvValor.focus();
          $srvValor.select();
        } else {
          $srvValor.style.outline     = '';
          $srvValor.style.borderColor = '';
        }

        recalc();
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    footer.querySelector('#vv-comissoes').addEventListener('click', async ()=>{
      await abrirPopupComissao();
    });

    footer.querySelector('#vv-cancelar').addEventListener('click', ()=>{
      document.body.removeChild(backdrop);
      resolve(null);
    });

    // ===== helper: envio com confirmação (toast) =====
  // ===== helper: envio com confirmação (toast) =====


async function tentarEnviarComissoes(payload){
  try {
    document.dispatchEvent(new CustomEvent('vv:comissoes:prontas', { detail: payload }));
  } catch(e){}

  if (typeof window.enviarComissoes !== 'function'){
    vvToast('Comissões preparadas, mas função enviarComissoes() não está disponível.', 'info');
    return { ok:false, resposta:null, erro:'Função enviarComissoes() ausente' };
  }

  vvToast('Enviando comissões…', 'info', 2000);

  try{
    const r = await Promise.resolve(window.enviarComissoes(payload));

    console.group("🚀 [COMISSÕES] Resultado final");
    console.log("Payload enviado:", JSON.parse(JSON.stringify(payload || {})));
    console.log("Retorno completo:", JSON.parse(JSON.stringify(r || {})));
    console.groupEnd();

    const ok = !!r?.ok;

    const arqInfo  = r?.resultados?.arquiteto || {};
    const vendInfo = r?.resultados?.vendedor || {};

    const arqV = Number(payload?.arquiteto?.valorCalculado || payload?.arquiteto?.valorManual || 0);
    const venV = Number(payload?.vendedor?.valorCalculado || payload?.vendedor?.valorManual || 0);

    const msgs = [];

    if (arqInfo.status === 'enviado') msgs.push(`Arquiteto enviado: ${vv_fmtBRL(arqV)}`);
    else if (arqInfo.status === 'ignorado') msgs.push(`Arquiteto ignorado`);
    else if (arqInfo.status === 'invalido') msgs.push(`Arquiteto inválido: ${arqInfo.erro || '-'}`);
    else if (arqInfo.status === 'erro') msgs.push(`Arquiteto com erro: ${arqInfo.erro || '-'}`);

    if (vendInfo.status === 'enviado') msgs.push(`Vendedor enviado: ${vv_fmtBRL(venV)}`);
    else if (vendInfo.status === 'ignorado') msgs.push(`Vendedor ignorado`);
    else if (vendInfo.status === 'invalido') msgs.push(`Vendedor inválido: ${vendInfo.erro || '-'}`);
    else if (vendInfo.status === 'erro') msgs.push(`Vendedor com erro: ${vendInfo.erro || '-'}`);

    // --- Envia valores financeiros para a Kommo ---
    try {
      const idProposta = new URLSearchParams(window.location.search).get("id");
      if (idProposta) {
        const valorNFProduto = vv_parseBRL(document.getElementById('vv-cat-produto')?.textContent || '0');
        const valorNFServico = vv_parseBRL(document.getElementById('vv-cat-servico')?.textContent || '0');
        const valorFatDireto = vv_parseBRL(document.getElementById('vv-cat-vidro')?.textContent  || '0');

        console.log('[KOMMO] Enviando financeiro — Produto:', valorNFProduto, '| Serviço:', valorNFServico, '| Fat. Direto:', valorFatDireto);

        fetch(`https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/financeiro`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ valorNFProduto, valorNFServico, valorFatDireto })
        })
        .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
        .then(res => console.log('[KOMMO] Financeiro atualizado na Kommo:', res))
        .catch(err => {
          console.warn('[KOMMO] Erro ao atualizar financeiro na Kommo:', err);
          vvToast('Aviso: valores financeiros não atualizados no Kommo. Verifique manualmente.', 'info', 6000);
        });
      } else {
        console.warn('[KOMMO] ID da proposta não encontrado na URL — financeiro não enviado');
      }
    } catch(eKommo) {
      console.warn('[KOMMO] Erro inesperado ao enviar financeiro:', eKommo);
    }
    // --- fim envio Kommo ---

    if (ok){
      vvToast(`Comissões processadas.\n${msgs.join(' | ')}`, 'ok', 7000);
      try {
        document.dispatchEvent(new CustomEvent('vv:comissoes:enviadas', {
          detail: { ok:true, resposta:r, payload }
        }));
      } catch(_){}
      return { ok:true, resposta:r, erro:null };
    } else {
      const msg = r?.message || r?.erro || 'Nenhuma comissão foi enviada.';
      vvToast(`${msg}\n${msgs.join(' | ')}`, 'erro', 7000);
      try {
        document.dispatchEvent(new CustomEvent('vv:comissoes:enviadas', {
          detail: { ok:false, resposta:r, erro:msg, payload }
        }));
      } catch(_){}
      return { ok:false, resposta:r, erro:msg };
    }
  } catch(e){
    const msg = e?.message || 'Erro inesperado ao enviar comissões.';
    console.group("ðŸ'¥ [COMISSÕES] Exceção");
    console.error("Mensagem:", msg);
    console.error("Erro completo:", e);
    console.error("Payload:", JSON.parse(JSON.stringify(payload || {})));
    console.groupEnd();

    vvToast(msg, 'erro', 6000);

    try {
      document.dispatchEvent(new CustomEvent('vv:comissoes:enviadas', {
        detail: { ok:false, resposta:null, erro:msg, payload }
      }));
    } catch(_){}

    return { ok:false, resposta:null, erro:msg };
  }
}

async function prepararComissoesAutomaticamente() {
  const parseBRL = (s) => {
    if (window.vv_parseBRL) return vv_parseBRL(s);
    return Number(
      String(s || '')
        .replace(/\u00A0/g, ' ')
        .replace(/[^\d,-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  };

  const toISODateLocal = (d) => {
    if (!d) return '';
    return vvDataISO(d);
  };

  const proximoDia15 = (base = new Date()) => {
    const y = base.getFullYear();
    const m = base.getMonth();
    const diaHoje = base.getDate();
    const alvo = (diaHoje <= 15) ? new Date(y, m, 15) : new Date(y, m + 1, 15);
    return toISODateLocal(alvo);
  };

  const primeiroDiaUtilProxMes = (base = new Date()) => {
    const y = base.getFullYear();
    const m = base.getMonth();
    let d = new Date(y, m + 1, 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return toISODateLocal(d);
  };

  const lerValorProdutoResumo = () => {
    const el = document.getElementById('vv-cat-produto');
    return parseBRL(el?.textContent || '0');
  };

  const lerComissaoArquitetoResumoVisual = () => {
    const cards = [...document.querySelectorAll('.col')];
    for (const card of cards) {
      const titulo = card.querySelector('.text-muted.small')?.textContent || '';
      if (/Comissão\s*Arquiteta/i.test(titulo.replace(/\s+/g, ' '))) {
        const bold = card.querySelector('.fw-bold')?.textContent || '0';
        return parseBRL(bold);
      }
    }
    return 0;
  };

  const resolverNomeVendedorTela = () => {
    return (
      document.getElementById('comVendNome')?.value?.trim() ||
      document.getElementById('vendedorResponsavel')?.value?.trim() ||
      _comVend?.nome ||
      ''
    );
  };

  const resolverCodigoVendedorTela = () => {
    return (
      document.getElementById('comVendCodigo')?.value?.trim() ||
      document.getElementById('codigoVendedor')?.value?.trim() ||
      vv_resolverCodigoVendedorComissaoPorNome?.(resolverNomeVendedorTela()) ||
      _comVend?.codigo_vendedor ||
      _comVend?.codigo ||
      ''
    );
  };

  const resolverCodigoClienteFornecedorVendedorTela = () => {
    return (
      document.getElementById('comVendCodigoFornecedor')?.value?.trim() ||
      _comVend?.codigo_cliente_fornecedor ||
      _comVend?.codigoClienteFornecedor ||
      _comVend?.codigo_fornecedor ||
      _comVend?.codigoFornecedor ||
      ''
    );
  };

  const resolverNomeArquitetoTela = () => {
    return (
      document.getElementById('comArqNome')?.value?.trim() ||
      _comArq?.nome ||
      ''
    );
  };

  const resolverCodigoArquitetoTela = () => {
    return (
      document.getElementById('comArqCodigo')?.value?.trim() ||
      _comArq?.codigo ||
      ''
    );
  };

  const numeroOrcamento =
    document.getElementById("numeroOrcamento")?.value?.trim() ||
    document.getElementById("numeroOrcamento")?.dataset?.valorOriginal?.trim() ||
    '';

  const obsPadrao = numeroOrcamento ? `Orçamento: ${numeroOrcamento}` : '';

  const hoje = new Date();
  const defaultArq = proximoDia15(hoje);
  const defaultVend = primeiroDiaUtilProxMes(hoje);

  if (typeof _comArq !== 'object' || !_comArq) _comArq = {};
  if (typeof _comVend !== 'object' || !_comVend) _comVend = {};

  // arquiteto
  const valorArquitetoResumo = lerComissaoArquitetoResumoVisual();
  _comArq.modo = _comArq.modo || 'valor';
  _comArq.percent = Number(_comArq.percent || 0);
  _comArq.valorManual = Number(_comArq.valorManual || valorArquitetoResumo || 0);
  _comArq.nome = resolverNomeArquitetoTela();
  _comArq.codigo = resolverCodigoArquitetoTela();
  if (!_comArq.codigo && _comArq.nome) {
    _comArq.codigo = await vvBuscarCodigoClienteOmiePorNome(_comArq.nome).catch(() => '');
  }
  _comArq.prev = _comArq.prev || defaultArq;
  _comArq.venc = _comArq.venc || defaultArq;
  _comArq.obs = _comArq.obs || obsPadrao;

  // vendedor = 1% do produto
  _comVend.modo = 'percent';
  _comVend.percent = 1;
  _comVend.valorManual = 0;
  _comVend.nome = resolverNomeVendedorTela();
  _comVend.codigo = resolverCodigoVendedorTela();
  _comVend.codigo_vendedor = resolverCodigoVendedorTela();
  _comVend.codigo_cliente_fornecedor = resolverCodigoClienteFornecedorVendedorTela();
  if (!_comVend.codigo_cliente_fornecedor && _comVend.nome) {
    _comVend.codigo_cliente_fornecedor = await vvBuscarCodigoClienteOmiePorNome(_comVend.nome).catch(() => '');
  }
  _comVend.prev = _comVend.prev || defaultVend;
  _comVend.venc = _comVend.venc || defaultVend;
  _comVend.obs = _comVend.obs || obsPadrao;

  console.group("ðŸ› ️ [COMISSÕES] Estado preparado automaticamente");
  console.log("_comArq:", JSON.parse(JSON.stringify(_comArq || {})));
  console.log("_comVend:", JSON.parse(JSON.stringify(_comVend || {})));
  console.log("Base arquiteto (resumo):", valorArquitetoResumo);
  console.log("Base vendedor (produto):", lerValorProdutoResumo());
  console.groupEnd();
}

footer.querySelector('#vv-confirmar').addEventListener('click', async ()=>{
  const ignoradosKeys = new Set(
    [...tbody.querySelectorAll('.vv-ignorar')]
      .filter(c => c.checked)
      .map(c => c.dataset.key)
  );

  const aprovados = [];
  const ignorados = [];

  [...tbody.querySelectorAll('tr')].forEach(tr => {
    const key  = tr.dataset.key;
    const item = itens.find(i => i.key === key);
    const isIgn = ignoradosKeys.has(key);

    if (!item) return;

    if (isIgn){
      ignorados.push(item);
    } else {
      const finText = tr.querySelector('[data-col="final"]')?.textContent || '0';
      const finalValor = vv_parseBRL(finText);

      aprovados.push({
        ...item,
        valorOriginal: Number(item.valorTotalGrupo) || 0,
        valorAjustadoParaOmie: finalValor
      });
    }
  });

  const totalAprovadoBaseComMO = vv_parseBRL($totAprov.textContent || '0');
  const valorServicos          = vv_parseBRL($totServ.textContent || '0');
  const valorDesconto          = vv_parseBRL($totDesc.textContent || '0');
  const valorComissaoInfo      = vv_parseBRL($totCom.textContent || '0');
  const totalFinalProdutos     = vv_parseBRL($totAjust.textContent || '0');

  let parcelamentoProdutosServicos = null;
  let parcelamentoServicos = null;

  if (valorServicos > 0 && typeof abrirPopupParcelamentoProdutosServicos === 'function') {
    const todasParcelasForm = vvLerParcelasFormularioPrincipal();

    // Distribui pelo tipo definido no formulário; faturado-direto é ignorado
    const parcelasProdutoDoForm  = todasParcelasForm.filter(p => p._tipoParcela === "produtos");
    const parcelasServicoDoForm  = todasParcelasForm.filter(p => p._tipoParcela === "servicos");
    const semTipoDefinido        = todasParcelasForm.filter(p => !p._tipoParcela);

    const parcelasProdutoSalvas =
      parcelasProdutoDoForm.length > 0
        ? parcelasProdutoDoForm
        : semTipoDefinido.length > 0
          ? semTipoDefinido
          : (Array.isArray(window.vvParcelasProdutoOmie) && window.vvParcelasProdutoOmie.length > 0)
            ? window.vvParcelasProdutoOmie
            : (
                window.propostaEmEdicao?.camposFormulario?.parcelas ||
                window.propostaAtual?.camposFormulario?.parcelas ||
                []
              );

    const parcelasServicoSalvas =
      parcelasServicoDoForm.length > 0
        ? parcelasServicoDoForm
        : (Array.isArray(window.vvParcelasServicoOmie) && window.vvParcelasServicoOmie.length > 0)
          ? window.vvParcelasServicoOmie
          : (
              window.propostaEmEdicao?.camposFormulario?.parcelasServico ||
              window.propostaAtual?.camposFormulario?.parcelasServico ||
              []
            );

  // Os alvos (totalFinalProdutos / valorServicos) já refletem desconto e
  // itens ignorados do popup anterior — são os valores corretos.
  // As parcelas existentes são carregadas apenas como ponto de partida;
  // o usuário ajusta se necessário antes de confirmar.
  parcelamentoProdutosServicos = await abrirPopupParcelamentoProdutosServicos({
    valorTotalProdutos: vv_parseBRL($catProduto.textContent || '0'),
    valorTotalServicos: valorServicos,
    parcelasProdutoExistentes: parcelasProdutoSalvas,
    parcelasServicoExistentes: parcelasServicoSalvas
  });

    if (!parcelamentoProdutosServicos) {
      vvToast('Controle de parcelas cancelado.', 'info');
      return;
    }
    parcelamentoServicos = parcelamentoProdutosServicos.parcelasServico || null;
  }

  await prepararComissoesAutomaticamente();

  const calcFromState = (s, base) => {
    const modo = s?.modo || 'percent';
    if (modo === 'percent') {
      return (Number(s?.percent || 0) / 100) * Number(base || 0);
    }
    return Number(s?.valorManual || 0);
  };

  const arqCalc = calcFromState(_comArq, _lastTotalBaseMO);
  const baseVendFinalTotal = lerValorFinalTotal();
  const vendCalc = Number((baseVendFinalTotal * 0.01).toFixed(2));

  const comissoesParaEnvio = {
    baseConsiderada: baseVendFinalTotal,
    arquiteto: {
      nome: _comArq?.nome || '',
      codigo: _comArq?.codigo || '',
      codigo_cliente_fornecedor: _comArq?.codigo || '',
      modo: _comArq?.modo || 'percent',
      percent: Number(_comArq?.percent || 0),
      valorManual: Number(_comArq?.valorManual || 0),
      valorCalculado: Number(arqCalc || 0),
      previsao: _comArq?.prev || '',
      vencimento: _comArq?.venc || '',
      observacao: vv_normalizarObservacaoComissao(_comArq?.obs),
      codigo_categoria: "2.09.05",
      numero_pedido: vv_getNumeroPedidoComissao() || '',
      id_conta_corrente: 2523861035
    },
    vendedor: {
      nome: _comVend?.nome || '',
      codigo: _comVend?.codigo || '',
      codigo_vendedor: _comVend?.codigo_vendedor || _comVend?.codigo || '',
      codigo_cliente_fornecedor: _comVend?.codigo_cliente_fornecedor || _comVend?.codigoClienteFornecedor || '',
      modo: 'percent',
      percent: 1,
      valorManual: 0,
      valorCalculado: Number(vendCalc || 0),
      previsao: _comVend?.prev || '',
      vencimento: _comVend?.venc || '',
      observacao: vv_normalizarObservacaoComissao(_comVend?.obs),
      codigo_categoria: "2.07.98",
      numero_pedido: vv_getNumeroPedidoComissao() || '',
      id_conta_corrente: 2523861035
    }
  };

  console.group("🧾 [COMISSÕES] Antes do envio");
  console.log("_comArq:", JSON.parse(JSON.stringify(_comArq || {})));
  console.log("_comVend:", JSON.parse(JSON.stringify(_comVend || {})));
  console.log("_lastTotalBaseMO:", _lastTotalBaseMO);
  console.log("baseVendFinalTotal:", baseVendFinalTotal);
  console.log("comissoesParaEnvio:", JSON.parse(JSON.stringify(comissoesParaEnvio || {})));
  console.groupEnd();

  const totaisPayload = {
    totalAprovadoBaseComMO,
    valorServicos,
    valorDesconto,
    valorComissaoInfo,
    totalFinalProdutos,
    parcelamentoProdutosServicos,
    parcelamentoServicos,
    parcelasProduto: parcelamentoProdutosServicos?.parcelasProduto || [],
    parcelasServico: parcelamentoProdutosServicos?.parcelasServico || [],
    comissoes: {
      baseConsiderada: baseVendFinalTotal,
      arquiteto: { ...comissoesParaEnvio.arquiteto },
      vendedor: { ...comissoesParaEnvio.vendedor },
      total: Math.max(0, Number(arqCalc || 0)) + Math.max(0, Number(vendCalc || 0))
    },
    porCategoria: {
      produto: vv_parseBRL($catProduto.textContent || '0'),
      servico: vv_parseBRL($catServico.textContent || '0'),
      vidro: vv_parseBRL($catVidro.textContent || '0')
    }
  };

  window.vvUltimosTotaisSelecaoItensOmie = totaisPayload;
  window.vvUltimoTotalFinalProdutosOmie  = totalFinalProdutos;
  window.vvTotalAprovadoBaseMO           = totalAprovadoBaseComMO;
  window.vvTotalServicosAplicado         = valorServicos;
  window.vvTotalDescontoAplicado         = valorDesconto;
  window.vvTotalComissaoInfo             = valorComissaoInfo;
  window.vvTotalProdutoCategoria         = totaisPayload.porCategoria.produto;
  window.vvTotalServicoCategoria         = totaisPayload.porCategoria.servico;
  window.vvTotalVidroCategoria           = totaisPayload.porCategoria.vidro;
  window.vvParcelasProdutoOmie           = totaisPayload.parcelasProduto;
  window.vvParcelasServicoOmie           = totaisPayload.parcelasServico;
  window.vvParcelamentoServicosOmie      = parcelamentoServicos;
  window.vvParcelamentoProdutosServicosOmie = parcelamentoProdutosServicos;

  console.log('💾 Totais da seleção Omie gravados em window:', totaisPayload);

  // Comissões salvas mas NÃO enviadas aqui — serão enviadas após confirmação do pedido/OS
  window.vvComissoesParaEnviar = comissoesParaEnvio;

  if (backdrop && backdrop.parentNode) {
    backdrop.parentNode.removeChild(backdrop);
  }

  resolve({
    aprovadosParaOmie: aprovados,
    ignorados,
    totais: totaisPayload
  });
});

    recalc();
  });
}



/* ======================================================================
   FUNÇÃO GLOBAL DE ENVIO (usa seu backend /api/omie/comissao e
   respeita: codigo_cliente_fornecedor + observacao vindos do front,
   e força codigo_categoria conforme papel)
   ====================================================================== */
(function () {
  if (window.enviarComissoes && window.enviarComissoes.__vvFixCategoriasIndependenteFinal) return;

  const API_URL = `${OMIE_ULHOA_API_BASE}/api/omie/comissao`;

  const toISODate = (d) => {
    if (!d) return "";
    return vvDataISO(d);
  };

  function comissaoExiste(fonte) {
    const codigo = String(fonte?.codigo || '').trim();
    return !!codigo;
  }

function montarLancamento(tipo, fonte, baseConsiderada, codigoProjeto) {
  const calc   = Number(fonte?.valorCalculado || 0);
  const manual = Number(fonte?.valorManual    || 0);
  const valor_documento = Number((calc > 0 ? calc : manual).toFixed(2));

  const data_previsao   = toISODate(fonte?.previsao   || "");
  const data_vencimento = toISODate(fonte?.vencimento || "");

  const tipoNorm = String(tipo || "")
    .trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const codigo_categoria = tipoNorm.includes("arquit") ? "2.09.05" : "2.07.99";
  const codigoClienteRaw = String(fonte?.codigo || "").trim();

  const numero_pedido = String(
    fonte?.numero_pedido ||
    vv_getNumeroPedidoComissao() ||
    ""
  ).trim().slice(0, 15);

  const id_conta_corrente = Number(
    fonte?.id_conta_corrente ||
    2523861035
  ) || 2523861035;

  const codigoVendedorRaw = String(
    tipoNorm.includes("vendedor")
      ? (
          fonte?.codigo_vendedor ||
          vv_getCodigoVendedorComissao() ||
          ""
        )
      : (
          fonte?.codigo_vendedor ||
          vv_getCodigoVendedorComissao() ||
          ""
        )
  ).trim();
  const codigo_vendedor = codigoVendedorRaw !== "" && Number.isFinite(Number(codigoVendedorRaw))
    ? Number(codigoVendedorRaw)
    : undefined;

  const codigo_cliente_fornecedor = codigoClienteRaw !== "" && Number.isFinite(Number(codigoClienteRaw))
    ? Number(codigoClienteRaw)
    : undefined;

  const observacaoLocal = vv_normalizarObservacaoComissao(fonte?.observacao);
  const observacaoPadrao = vv_getObservacaoPadraoComissao();
  const observacao = observacaoLocal || observacaoPadrao ||
    `Comissão ${tipo} — ${fonte?.nome || ""} (base: ${Number(baseConsiderada || 0).toFixed(2)})`;

  const payload = {
    codigo_categoria,
    id_conta_corrente,
    valor_documento,
    data_vencimento,
    data_previsao,
    observacao,
  };

  if (codigo_cliente_fornecedor !== undefined) payload.codigo_cliente_fornecedor = codigo_cliente_fornecedor;
  if (codigoProjeto !== undefined && Number(codigoProjeto) > 0) payload.codigo_projeto = Number(codigoProjeto);
  if (numero_pedido)                           payload.numero_pedido             = numero_pedido;
  if (codigo_vendedor !== undefined)           payload.codigo_vendedor           = codigo_vendedor;

  console.group(`🧾 [montarLancamento] ${tipo}`);
  console.log("payload final:", JSON.parse(JSON.stringify(payload)));
  console.log("id_conta_corrente:", typeof payload.id_conta_corrente, payload.id_conta_corrente);
  console.log("tipos → codigo_cliente_fornecedor:", typeof payload.codigo_cliente_fornecedor, payload.codigo_cliente_fornecedor);
  console.log("tipos → codigo_projeto:", typeof payload.codigo_projeto, payload.codigo_projeto);
  console.log("tipos → codigo_vendedor:", typeof payload.codigo_vendedor, payload.codigo_vendedor);
  console.groupEnd();

  return payload;
}

  function validarLancamento(lanc, papel) {
    const erros = [];
    if (!(lanc?.valor_documento > 0)) erros.push("valor_documento inválido");
    if (!lanc?.data_previsao) erros.push("data_previsao ausente");
    if (!lanc?.data_vencimento) erros.push("data_vencimento ausente");
    if (!lanc?.codigo_cliente_fornecedor) erros.push("codigo_cliente_fornecedor ausente");
    if (!lanc?.codigo_projeto) erros.push("codigo_projeto ausente");
    if (!lanc?.codigo_categoria) erros.push("codigo_categoria ausente");
    if (!lanc?.numero_pedido) erros.push("numero_pedido ausente");
    if (!lanc?.codigo_vendedor) erros.push("codigo_vendedor ausente");
    return { valido: erros.length === 0, erros, papel };
  }

 async function postarLancamento(lanc, papel) {
  // ✅ Força tipos integer para campos que a Omie exige como number
  const lancFinal = { ...lanc };
  if (lancFinal.codigo_cliente_fornecedor !== undefined)
    lancFinal.codigo_cliente_fornecedor = Number(lancFinal.codigo_cliente_fornecedor);
  if (lancFinal.codigo_projeto !== undefined)
    lancFinal.codigo_projeto = Number(lancFinal.codigo_projeto);
  if (lancFinal.codigo_vendedor !== undefined)
    lancFinal.codigo_vendedor = Number(lancFinal.codigo_vendedor);
  if (lancFinal.id_conta_corrente !== undefined)
    lancFinal.id_conta_corrente = Number(lancFinal.id_conta_corrente);

  console.group(`🚨 [PRÉ-ENVIO COMISSÃO] ${papel.toUpperCase()}`);
  console.log("Body FINAL enviado:", JSON.stringify(lancFinal, null, 2));
  console.log("codigo_cliente_fornecedor:", lancFinal.codigo_cliente_fornecedor, typeof lancFinal.codigo_cliente_fornecedor);
  console.log("codigo_projeto:", lancFinal.codigo_projeto, typeof lancFinal.codigo_projeto);
  console.log("codigo_vendedor:", lancFinal.codigo_vendedor, typeof lancFinal.codigo_vendedor);
  console.log("numero_pedido:", lancFinal.numero_pedido, typeof lancFinal.numero_pedido);
  console.log("codigo_categoria:", lancFinal.codigo_categoria);
  const tabelaDebugComissao = [{
    papel,
    codigo_cliente_fornecedor: lancFinal.codigo_cliente_fornecedor ?? "",
    codigo_projeto: lancFinal.codigo_projeto ?? "",
    codigo_categoria: lancFinal.codigo_categoria ?? "",
    numero_pedido: lancFinal.numero_pedido ?? "",
    codigo_vendedor: lancFinal.codigo_vendedor ?? "",
    id_conta_corrente: lancFinal.id_conta_corrente ?? "",
    valor_documento: lancFinal.valor_documento ?? "",
    data_previsao: lancFinal.data_previsao ?? "",
    data_vencimento: lancFinal.data_vencimento ?? "",
    observacao: lancFinal.observacao ?? ""
  }];
  console.table(tabelaDebugComissao);
  console.groupEnd();

  window.__vvUltimoLancamentoComissao = {
    papel,
    body: JSON.parse(JSON.stringify(lancFinal))
  };
  window.__vvUltimosLancamentosComissao = window.__vvUltimosLancamentosComissao || {};
  window.__vvUltimosLancamentosComissao[papel] = JSON.parse(JSON.stringify(lancFinal));
  window.__vvTabelaDebugComissao = window.__vvTabelaDebugComissao || {};
  window.__vvTabelaDebugComissao[papel] = JSON.parse(JSON.stringify(tabelaDebugComissao));

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lancFinal)
    });

    const json = await r.json().catch(() => ({}));

    console.group(`📥 [RESPOSTA COMISSÃO] ${papel}`);
    console.log("HTTP status:", r.status);
    console.log("HTTP ok:", r.ok);
    console.log("JSON retornado:", json);
    console.groupEnd();

    if (!r.ok || json?.ok === false || json?.faultstring) {
      const msg =
        json?.faultstring ||
        json?.omieRaw?.faultstring ||
        json?.omieErro?.faultstring ||
        json?.error ||
        json?.erro ||
        json?.message ||
        `HTTP ${r.status}`;
      return { ok: false, papel, status: 'erro', erro: msg, resposta: json, enviado: lancFinal };
    }

    return { ok: true, papel, status: 'enviado', resposta: json, enviado: lancFinal };
  } catch (e) {
    return { ok: false, papel, status: 'erro', erro: e?.message || "Falha de rede", enviado: lancFinal };
  }
}
  window.enviarComissoes = async function (payload) {
    await garantirNumeroPedidoPreenchido().catch(() => "");

    const numeroPedidoProjeto = vv_getNumeroPedidoComissao() || "";
    const codigoProjeto = await vvGarantirProjetoOmiePorPedido(numeroPedidoProjeto);

    const fonteArq = payload?.arquiteto || {};
    const fonteVend = payload?.vendedor || {};

    const existeArq = comissaoExiste(fonteArq);
    const existeVend = comissaoExiste(fonteVend);

    const lancArq = montarLancamento("arquiteto", fonteArq, payload?.baseConsiderada, codigoProjeto);
    const lancVend = montarLancamento("vendedor", fonteVend, payload?.baseConsiderada, codigoProjeto);

    console.group("🧾 [COMISSÕES] Pré-envio");
    console.log("Payload original:", JSON.parse(JSON.stringify(payload || {})));
    console.log("codigoProjeto:", codigoProjeto);
    console.log("Existe arquiteto?", existeArq, "Código:", fonteArq?.codigo || "");
    console.log("Existe vendedor?", existeVend, "Código:", fonteVend?.codigo || "");
    console.log("Lançamento arquiteto:", JSON.parse(JSON.stringify(lancArq || {})));
    console.log("Lançamento vendedor:", JSON.parse(JSON.stringify(lancVend || {})));
    console.groupEnd();

    let resArq = {
      ok: false,
      status: 'ignorado',
      papel: 'arquiteto',
      erro: 'Comissão não existente (sem código).'
    };

    let resVend = {
      ok: false,
      status: 'ignorado',
      papel: 'vendedor',
      erro: 'Comissão não existente (sem código).'
    };

    if (existeArq) {
      const vArq = validarLancamento(lancArq, "arquiteto");
      if (vArq.valido) {
        resArq = await postarLancamento(lancArq, "arquiteto");
      } else {
        resArq = {
          ok: false,
          status: 'invalido',
          papel: 'arquiteto',
          erro: vArq.erros.join(", "),
          validacao: vArq
        };
      }
    }

    if (existeVend) {
      const vVend = validarLancamento(lancVend, "vendedor");
      if (vVend.valido) {
        resVend = await postarLancamento(lancVend, "vendedor");
      } else {
        resVend = {
          ok: false,
          status: 'invalido',
          papel: 'vendedor',
          erro: vVend.erros.join(", "),
          validacao: vVend
        };
      }
    }

    const okGeral = !!(resArq.ok || resVend.ok);

    const retorno = {
      ok: okGeral,
      resultados: {
        arquiteto: resArq,
        vendedor: resVend
      },
      resumo: {
        existeArquiteto: existeArq,
        existeVendedor: existeVend,
        enviadoArquiteto: !!resArq.ok,
        enviadoVendedor: !!resVend.ok
      }
    };

    console.group("📦 [COMISSÕES] Retorno final");
    console.log(JSON.parse(JSON.stringify(retorno || {})));
    console.groupEnd();

    return retorno;
  };

  window.enviarComissoes.__vvFixCategoriasIndependenteFinal = true;
})();

(function () {
  const API_URL = "https://ulhoa-vidros-1ae0adcf5f73.herokuapp.com/api/omie/comissao";

  const toISODate = (valor) => {
    if (!valor) return "";
    try {
      return vvDataISO(valor);
    } catch {
      return "";
    }
  };

  function vvMontarLancamentoComProjeto(tipo, fonte, baseConsiderada, codigoProjeto) {
    const calc = Number(fonte?.valorCalculado || 0);
    const manual = Number(fonte?.valorManual || 0);
    const valor_documento = Number((calc > 0 ? calc : manual).toFixed(2));
    const tipoNorm = String(tipo || "").trim().toLowerCase();
    const codigoCliente = String(
      tipoNorm.includes("vendedor")
        ? (
            fonte?.codigo_cliente_fornecedor ||
            fonte?.codigoClienteFornecedor ||
            fonte?.codigo_fornecedor ||
            fonte?.codigoFornecedor ||
            ""
          )
        : (
            fonte?.codigo ||
            fonte?.codigo_cliente_fornecedor ||
            fonte?.codigoClienteFornecedor ||
            ""
          )
    ).trim();
    const codigoVendedor = String(
      fonte?.codigo_vendedor ||
      fonte?.codigoVendedor ||
      (
        tipoNorm.includes("vendedor")
          ? (
              fonte?.codigo ||
              vv_getCodigoVendedorComissao() ||
              vv_resolverCodigoVendedorComissaoPorNome(fonte?.nome || "") ||
              ""
            )
          : ""
      )
    ).trim();
    const numeroPedido = String(
      fonte?.numero_pedido ||
      vv_getNumeroPedidoComissao() ||
      ""
    ).trim().slice(0, 15);
    const codigoCategoria = String(fonte?.codigo_categoria || "").trim();
    const observacao =
      vv_normalizarObservacaoComissao(fonte?.observacao) ||
      `Comissao ${tipo} - ${fonte?.nome || ""} (base: ${Number(baseConsiderada || 0).toFixed(2)})`;

    const payload = {
      valor_documento,
      data_previsao: toISODate(fonte?.previsao || ""),
      data_vencimento: toISODate(fonte?.vencimento || ""),
      observacao
    };

    if (codigoCliente) {
      payload.codigo_cliente_fornecedor = Number.isFinite(Number(codigoCliente))
        ? Number(codigoCliente)
        : codigoCliente;
    }

    if (codigoVendedor) {
      payload.codigo_vendedor = Number.isFinite(Number(codigoVendedor))
        ? Number(codigoVendedor)
        : codigoVendedor;
    }

    if (codigoCategoria) payload.codigo_categoria = codigoCategoria;

    if (fonte?.id_conta_corrente) {
      payload.id_conta_corrente = Number(fonte.id_conta_corrente);
    }

    if (numeroPedido) {
      payload.numero_pedido = numeroPedido;
    }

    if (codigoProjeto !== undefined && Number(codigoProjeto) > 0) {
      payload.codigo_projeto = Number(codigoProjeto);
    }

    return payload;
  }

  function vvValidarLancamentoComProjeto(lanc, papel) {
    const erros = [];
    if (!(lanc?.valor_documento > 0)) erros.push("valor_documento invalido");
    if (!lanc?.data_previsao) erros.push("data_previsao ausente");
    if (!lanc?.data_vencimento) erros.push("data_vencimento ausente");
    if (!lanc?.codigo_cliente_fornecedor) erros.push("codigo_cliente_fornecedor ausente");
    if (!lanc?.numero_pedido) erros.push("numero_pedido ausente");
    if (!lanc?.codigo_projeto) erros.push("codigo_projeto ausente");
    if (String(papel || "").toLowerCase().includes("vendedor") && !lanc?.codigo_vendedor) {
      erros.push("codigo_vendedor ausente");
    }
    return { valido: erros.length === 0, erros, papel };
  }

  async function vvPostarLancamentoComProjeto(lanc, papel) {
    const lancFinal = { ...lanc };

    if (lancFinal.codigo_cliente_fornecedor !== undefined) {
      lancFinal.codigo_cliente_fornecedor = Number(lancFinal.codigo_cliente_fornecedor);
    }

    if (lancFinal.codigo_projeto !== undefined) {
      lancFinal.codigo_projeto = Number(lancFinal.codigo_projeto);
    }

    if (lancFinal.codigo_vendedor !== undefined) {
      lancFinal.codigo_vendedor = Number(lancFinal.codigo_vendedor);
    }

    if (lancFinal.id_conta_corrente !== undefined) {
      lancFinal.id_conta_corrente = Number(lancFinal.id_conta_corrente);
    }

    window.__vvUltimoLancamentoComissao = {
      papel,
      body: JSON.parse(JSON.stringify(lancFinal))
    };
    window.__vvUltimosLancamentosComissao = window.__vvUltimosLancamentosComissao || {};
    window.__vvUltimosLancamentosComissao[papel] = JSON.parse(JSON.stringify(lancFinal));

    try {
      const resposta = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lancFinal)
      });

      const json = await resposta.json().catch(() => ({}));

      if (!resposta.ok || json?.ok === false) {
        const erro = json?.error || json?.message || `HTTP ${resposta.status}`;
        return { ok: false, papel, status: "erro", erro, resposta: json, enviado: lancFinal };
      }

      return { ok: true, papel, status: "enviado", resposta: json, enviado: lancFinal };
    } catch (erro) {
      return {
        ok: false,
        papel,
        status: "erro",
        erro: erro?.message || "Falha de rede",
        enviado: lancFinal
      };
    }
  }

  window.enviarComissoes = async function (payload) {
    try {
      document.dispatchEvent(
        new CustomEvent("vv:comissoes:prontas", { detail: { payload } })
      );
    } catch {}

    await garantirNumeroPedidoPreenchido().catch(() => "");

    const numeroPedidoProjeto = vv_getNumeroPedidoComissao() || "";
    if (!numeroPedidoProjeto) {
      throw new Error("Numero do pedido ausente para enviar a comissao.");
    }

    const codigoProjeto = await vvGarantirProjetoOmiePorPedido(numeroPedidoProjeto);
    const fonteArqBase = payload?.arquiteto || {};
    const fonteVendBase = payload?.vendedor || {};

    const codigoClienteFornecedorArquiteto =
      String(
        fonteArqBase?.codigo ||
        fonteArqBase?.codigo_cliente_fornecedor ||
        fonteArqBase?.codigoClienteFornecedor ||
        ""
      ).trim() ||
      await vvBuscarCodigoClienteOmiePorNome(fonteArqBase?.nome || "").catch(() => "");

    const codigoClienteFornecedorVendedor =
      String(
        fonteVendBase?.codigo_cliente_fornecedor ||
        fonteVendBase?.codigoClienteFornecedor ||
        fonteVendBase?.codigo_fornecedor ||
        fonteVendBase?.codigoFornecedor ||
        ""
      ).trim() ||
      await vvBuscarCodigoClienteOmiePorNome(fonteVendBase?.nome || "").catch(() => "");

    const codigoVendedor =
      String(
        fonteVendBase?.codigo_vendedor ||
        fonteVendBase?.codigoVendedor ||
        fonteVendBase?.codigo ||
        vv_getCodigoVendedorComissao() ||
        vv_resolverCodigoVendedorComissaoPorNome(fonteVendBase?.nome || "") ||
        ""
      ).trim();

    const fonteArq = {
      ...fonteArqBase,
      codigo: codigoClienteFornecedorArquiteto,
      codigo_cliente_fornecedor: codigoClienteFornecedorArquiteto,
      numero_pedido: String(fonteArqBase?.numero_pedido || numeroPedidoProjeto).trim().slice(0, 15)
    };

    const fonteVend = {
      ...fonteVendBase,
      codigo: codigoVendedor,
      codigo_vendedor: codigoVendedor,
      codigo_cliente_fornecedor: codigoClienteFornecedorVendedor,
      numero_pedido: String(fonteVendBase?.numero_pedido || numeroPedidoProjeto).trim().slice(0, 15)
    };

    const existeArq = !!String(fonteArq?.codigo || "").trim();
    const existeVend = !!String(
      fonteVend?.codigo ||
      fonteVend?.codigo_vendedor ||
      fonteVend?.codigo_cliente_fornecedor ||
      ""
    ).trim();

    const lancArq = vvMontarLancamentoComProjeto("arquiteto", fonteArq, payload?.baseConsiderada, codigoProjeto);
    const lancVend = vvMontarLancamentoComProjeto("vendedor", fonteVend, payload?.baseConsiderada, codigoProjeto);

    let resArq = {
      ok: false,
      status: "ignorado",
      papel: "arquiteto",
      erro: "Comissao nao existente (sem codigo)."
    };

    let resVend = {
      ok: false,
      status: "ignorado",
      papel: "vendedor",
      erro: "Comissao nao existente (sem codigo)."
    };

    if (existeArq) {
      const validacaoArq = vvValidarLancamentoComProjeto(lancArq, "arquiteto");
      if (validacaoArq.valido) {
        resArq = await vvPostarLancamentoComProjeto(lancArq, "arquiteto");
      } else {
        resArq = {
          ok: false,
          status: "invalido",
          papel: "arquiteto",
          erro: validacaoArq.erros.join(", "),
          validacao: validacaoArq
        };
      }
    }

    if (existeVend) {
      const validacaoVend = vvValidarLancamentoComProjeto(lancVend, "vendedor");
      if (validacaoVend.valido) {
        resVend = await vvPostarLancamentoComProjeto(lancVend, "vendedor");
      } else {
        resVend = {
          ok: false,
          status: "invalido",
          papel: "vendedor",
          erro: validacaoVend.erros.join(", "),
          validacao: validacaoVend
        };
      }
    }

    const retorno = {
      ok: !!(resArq.ok || resVend.ok),
      resultados: {
        arquiteto: resArq,
        vendedor: resVend
      },
      resumo: {
        existeArquiteto: existeArq,
        existeVendedor: existeVend,
        enviadoArquiteto: !!resArq.ok,
        enviadoVendedor: !!resVend.ok,
        codigoProjeto: codigoProjeto || ""
      }
    };

    try {
      document.dispatchEvent(
        new CustomEvent("vv:comissoes:enviadas", {
          detail: {
            ok: retorno.ok,
            resultados: retorno.resultados,
            resumo: retorno.resumo
          }
        })
      );
    } catch {}

    return retorno;
  };

  window.enviarComissoes.__vvEstruturaCorretaProjeto = true;
})();







/* =========================================================
   4) ITENS IGNORADOS → "PRODUTOS FATURADOS DIRETO" (opcional)
   ========================================================= */


// helpers usados acima
function vv_getClienteNome() {
  const exato = document.querySelector(
    '#clientesWrapper > div > div.col-md-6.position-relative.d-flex.align-items-end.gap-2 > div > input.razaoSocial'
  );
  if (exato && exato.value?.trim()) return exato.value.trim();
  if (exato && exato.getAttribute('data-valor-original')) {
    const v = exato.getAttribute('data-valor-original')?.trim();
    if (v) return v;
  }
  const fallback = document.querySelector('#clientesWrapper .cliente-item .razaoSocial');
  return (fallback?.value?.trim() || fallback?.getAttribute('data-valor-original')?.trim() || 'Cliente não identificado');
}
function vv_getNumeroOrcamento() {
  const inp = document.getElementById('numeroOrcamento');
  return (inp?.value ?? inp?.textContent ?? '').toString().trim();
}
function vv_getNumeroPedidoComissao() {
  const inp = document.getElementById('numeroPedido');
  return (
    inp?.value?.trim?.() ||
    inp?.dataset?.valorOriginal?.trim?.() ||
    inp?.getAttribute?.('data-valor-original')?.trim?.() ||
    inp?.textContent?.trim?.() ||
    ''
  );
}
function vv_getVendedoresCodigoComissao() {
  const fallback = [
    { nome:"FELIPE ULHOA FERREIRA", codigo:"2452905682", aliases:["FELIPE ULHOA","FELIPE U","FELIPE F","FELIPE FERREIRA"] },
    { nome:"JOAO CLEBER MARTINS",   codigo:"2452905334", aliases:["JOAO CLEBER","JOAO C MARTINS","J C MARTINS","JOAO MARTINS"] },
    { nome:"RAFAEL ANGELO ARAUJO DA SILVA", codigo:"2452905445", aliases:["RAFAEL ANGELO","RAFAEL A A SILVA","RAFAEL ARAUJO","RAFAEL SILVA"] }
  ];

  const base = Array.isArray(window.VV_VENDEDORES_CODIGO_COMISSAO) && window.VV_VENDEDORES_CODIGO_COMISSAO.length
    ? window.VV_VENDEDORES_CODIGO_COMISSAO
    : Array.isArray(window.VV_VENDEDORES_CODIGO) && window.VV_VENDEDORES_CODIGO.length
      ? window.VV_VENDEDORES_CODIGO
      : fallback;

  return base.map(vendedor => ({
    nome: String(vendedor?.nome || "").trim(),
    codigo: String(vendedor?.codigo || "").trim(),
    aliases: Array.isArray(vendedor?.aliases) ? [...vendedor.aliases] : []
  }));
}
function vv_normNomeComissao(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
function vv_getNomeVendedorComissao() {
  const select = document.getElementById('vendedorResponsavel');
  return (
    document.getElementById('comVendNome')?.value?.trim() ||
    select?.options?.[select.selectedIndex]?.text?.trim() ||
    select?.value?.trim() ||
    ''
  );
}
function vv_resolverCodigoVendedorComissaoPorNome(nome) {
  const alvo = vv_normNomeComissao(nome);
  if (!alvo) return '';
  const vendedores = vv_getVendedoresCodigoComissao();

  for (const vendedor of vendedores) {
    if (vv_normNomeComissao(vendedor.nome) === alvo) return vendedor.codigo;
  }

  for (const vendedor of vendedores) {
    if ((vendedor.aliases || []).some(alias => vv_normNomeComissao(alias) === alvo)) {
      return vendedor.codigo;
    }
  }

  for (const vendedor of vendedores) {
    const nomeVendedor = vv_normNomeComissao(vendedor.nome);
    if (alvo.includes(nomeVendedor) || nomeVendedor.includes(alvo)) {
      return vendedor.codigo;
    }

    if ((vendedor.aliases || []).some(alias => {
      const aliasNorm = vv_normNomeComissao(alias);
      return alvo.includes(aliasNorm) || aliasNorm.includes(alvo);
    })) {
      return vendedor.codigo;
    }
  }

  return '';
}
function vv_getCodigoVendedorComissao() {
  const codigoManual = document.getElementById('codigoVendedor')?.value?.trim() || '';
  const nomeVendedor = vv_getNomeVendedorComissao();
  const codigoPorNome = vv_resolverCodigoVendedorComissaoPorNome(nomeVendedor);

  if (codigoManual && codigoPorNome && codigoManual !== codigoPorNome) {
    console.warn('[comissao] codigo_vendedor manual divergente do vendedor selecionado; usando o codigo do vendedor responsavel.', {
      nomeVendedor,
      codigoManual,
      codigoPorNome
    });
  }

  return codigoPorNome || codigoManual || '';
}
function vv_getObservacaoPadraoComissao() {
  const numeroPedido = vv_getNumeroPedidoComissao();
  const numeroOrcamento = vv_getNumeroOrcamento();

  if (!numeroPedido && !numeroOrcamento) return '';

  return `numero do pedido: ${numeroPedido} - numero do orçamento: ${numeroOrcamento}`;
}
function vv_normalizarObservacaoComissao(valor) {
  const texto = String(valor || '').trim();
  const padrao = vv_getObservacaoPadraoComissao();

  if (!texto) return padrao;
  if (/^Or/i.test(texto)) return padrao || texto;
  if (/^numero do pedido:/i.test(texto)) return padrao || texto;
  return texto;
}
function vv_getPrimeiraDataParcelaISO() {
  const first = Array.from(document.querySelectorAll('.data-parcela'))
    .map(el => (el.value || '').trim())
    .find(Boolean);
  if (!first) return null;
  const d = new Date(first);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)).toISOString();
}

/* =======================================
   5) GERAR PAYLOAD (estrutura antiga)
   ======================================= */
/* =======================================
   5) GERAR PAYLOAD (estrutura antiga)
   ======================================= */

   function normalizarAmbienteOmie(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function conferirTotalProdutosOmieComMarcador() {
  try {
    const payload = await gerarPayloadOmie();

    if (!payload || !Array.isArray(payload.det)) {
      alert("Não foi possível gerar o payload da Omie para conferência.");
      return;
    }

    const elTotalTela =
      document.getElementById("vv-total-ajustado") ||
      document.getElementById("vv-cat-produto");

    function parseMoedaBR(valor) {
      return Number(
        String(valor || "0")
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
      ) || 0;
    }

    function round2(n) {
      return Math.round((Number(n) || 0) * 100) / 100;
    }

    const itensConsiderados = [];
    let totalOmie = 0;

    payload.det.forEach((item, index) => {
      const produto = item?.produto || {};
      const descricao = produto.descricao || `Item ${index + 1}`;
      const quantidade = Number(produto.quantidade || 0);
      const valorUnitario = Number(produto.valor_unitario || 0);
      const totalItem = round2(quantidade * valorUnitario);

      // ignora zerados
      if (quantidade <= 0 || valorUnitario <= 0 || totalItem <= 0) {
        return;
      }

      totalOmie += totalItem;

      itensConsiderados.push({
        index: index + 1,
        descricao,
        quantidade,
        valorUnitario: round2(valorUnitario),
        totalItem
      });
    });

    totalOmie = round2(totalOmie);

    const totalTela = round2(
      Number(window.vvUltimoTotalFinalProdutosOmie ?? 0) ||
      parseMoedaBR(elTotalTela?.textContent || "0") ||
      (
        parseMoedaBR(document.getElementById("vv-cat-produto")?.textContent || "0") +
        parseMoedaBR(document.getElementById("vv-cat-vidro")?.textContent || "0")
      )
    );
    const bate = Math.abs(totalOmie - totalTela) < 0.01;

    let marcador = document.getElementById("vv-marcador-conferencia-omie");
    if (!marcador && elTotalTela?.parentNode) {
      marcador = document.createElement("div");
      marcador.id = "vv-marcador-conferencia-omie";
      marcador.style.marginTop = "8px";
      marcador.style.padding = "10px 14px";
      marcador.style.borderRadius = "10px";
      marcador.style.fontWeight = "700";
      marcador.style.fontSize = "14px";
      marcador.style.border = "1px solid transparent";
      marcador.style.display = "inline-block";
      marcador.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      elTotalTela.parentNode.appendChild(marcador);
    }

    if (marcador && bate) {
      marcador.style.background = "#e8f7ee";
      marcador.style.color = "#146c2e";
      marcador.style.borderColor = "#b7e4c7";
      marcador.innerHTML = `
        ✅ Total conferido com sucesso<br>
        Omie: <strong>R$ ${totalOmie.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br>
        Tela: <strong>R$ ${totalTela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      `;
    } else if (marcador) {
      marcador.style.background = "#fdecec";
      marcador.style.color = "#a61b1b";
      marcador.style.borderColor = "#f5b5b5";
      marcador.innerHTML = `
        ❌ Divergência encontrada no total<br>
        Omie: <strong>R$ ${totalOmie.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br>
        Tela: <strong>R$ ${totalTela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br>
        Diferença: <strong>R$ ${round2(totalOmie - totalTela).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      `;
    }

    console.group("🔎 Conferência total produtos Omie");
    console.log("Payload gerado:", payload);
    console.table(itensConsiderados);
    console.log("Total Omie:", totalOmie);
    console.log("Total Tela (#vv-cat-produto):", totalTela);
    console.log("Bate?", bate ? "SIM" : "NÃO");
    console.groupEnd();

    return {
      bate,
      totalOmie,
      totalTela,
      diferenca: round2(totalOmie - totalTela),
      itensConsiderados
    };

  } catch (erro) {
    console.error("Erro ao conferir total da Omie:", erro);
    alert("Erro ao conferir total da Omie. Veja o console.");
  }
}

async function gerarPayloadOmie() {
  const pendencias = [];

  const vendedorSelectEl = document.getElementById("vendedorResponsavel");
  const textoSelecionado =
    vendedorSelectEl?.options?.[vendedorSelectEl.selectedIndex]?.text?.trim() ||
    vendedorSelectEl?.value?.trim() ||
    "";

  const clientes = document.querySelectorAll("#clientesWrapper .cliente-item");
  const codigoCliente = clientes[0]?.querySelector(".codigoCliente")?.value?.trim();

  if (!codigoCliente) pendencias.push("Código do cliente não preenchido.");

  if (!textoSelecionado || textoSelecionado.toUpperCase() === "SELECIONE") {
    pendencias.push("Selecione um Vendedor Responsável válido.");
  }

  let primeiraDataParcelaRaw = Array.from(document.querySelectorAll(".data-parcela"))
    .map(el => (el.value || "").trim())
    .find(Boolean);

  let primeiraDataParcela = typeof formatarDataBR === "function"
    ? formatarDataBR(primeiraDataParcelaRaw)
    : "";


  let linhasParcelas = document.querySelectorAll("#listaParcelas .row");

  const blocosContainer = document.getElementById("blocosProdutosContainer");
  const temProdutosNaTela =
    !!blocosContainer &&
    (
      blocosContainer.querySelectorAll("table tbody tr:not(.extra-summary-row)").length > 0 ||
      blocosContainer.querySelectorAll("tbody tr:not(.extra-summary-row)").length > 0
    );

  // Nota: pedidos somente de serviços são permitidos — a ausência de produtos
  // não bloqueia mais o envio. A validação ocorre dentro do popup de seleção.

  if (pendencias.length > 0) {
    if (typeof mostrarPopupPendencias === "function") {
      mostrarPopupPendencias(pendencias);
    } else {
      alert("Pendências:\n- " + pendencias.join("\n- "));
    }
    return null;
  }

  async function esperarSelectCarregar(selectId, {
    minOptions = 2,
    timeoutMs = 15000,
    intervalMs = 200
  } = {}) {
    const inicio = Date.now();

    while (Date.now() - inicio < timeoutMs) {
      const sel = document.getElementById(selectId);
      if (sel && sel.options && sel.options.length >= minOptions) return sel;
      await new Promise(r => setTimeout(r, intervalMs));
    }

    return document.getElementById(selectId) || null;
  }

  function normalizarTexto(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function classificarTipoItem(item) {
    const desc = normalizarTexto(item?.descricao || "");
    if (/^vidros?\b/.test(desc)) return "vidro";
    if (desc.includes("mao de obra de instalacao") && desc.includes("(por hora)")) return "servico";
    return "produto";
  }

  function parseValorParcela(elValor) {
    const rawValor =
      (elValor?.value ??
        elValor?.textContent ??
        elValor?.innerText ??
        "")
        .toString()
        .trim();

    if (typeof vv_parseBRL === "function") {
      return vv_parseBRL(rawValor);
    }

    return Number(
      rawValor
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0;
  }

  function obterDataParcelaFormatada(linha) {
    const elData = linha.querySelector(".data-parcela") || linha.querySelector("input[type='date']");
    const dataISO = elData?.value || "";

    if (!dataISO) return "";

    return typeof formatarDataBR === "function"
      ? formatarDataBR(dataISO)
      : dataISO;
  }

  function round2(valor) {
    if (typeof vv_round2 === "function") return vv_round2(valor);
    return Math.round((Number(valor) || 0) * 100) / 100;
  }

  function parseMoedaBR(texto) {
    return Number(
      String(texto || "0")
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0;
  }

  function formatarMoedaBR(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function lerValorCampoOmie(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return (
      el.value?.trim?.() ||
      el.dataset?.valorOriginal?.trim?.() ||
      el.textContent?.trim?.() ||
      ""
    );
  }

  async function garantirNumeroPedidoPreenchido() {
    const campoNumeroPedido = document.getElementById("numeroPedido");

    if (!campoNumeroPedido) {
      throw new Error("Campo #numeroPedido nao encontrado para preencher o numero do pedido.");
    }

    const numeroAtual = String(
      campoNumeroPedido.value?.trim?.() ||
      campoNumeroPedido.dataset?.valorOriginal?.trim?.() ||
      campoNumeroPedido.getAttribute("data-valor-original")?.trim?.() ||
      campoNumeroPedido.textContent?.trim?.() ||
      ""
    ).trim();

    if (numeroAtual) {
      campoNumeroPedido.value = numeroAtual;
      campoNumeroPedido.dataset.valorOriginal = numeroAtual;
      campoNumeroPedido.setAttribute("data-valor-original", numeroAtual);
      return numeroAtual;
    }

    const resposta = await fetch(`${CONTATOR_ULHOA_API_BASE}/pedido`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!resposta.ok) {
      throw new Error(`Nao foi possivel buscar o proximo numero do pedido. HTTP ${resposta.status}.`);
    }

    let dados = null;
    try {
      dados = await resposta.json();
    } catch {
      throw new Error("A resposta da API de pedido veio invalida.");
    }

    const numeroPedido = [
      dados?.pedido_proximo,
      dados?.numero,
      dados?.pedido,
      dados?.proximo,
      dados?.next
    ]
      .map(valor => String(valor ?? "").trim())
      .find(Boolean);

    if (!numeroPedido) {
      throw new Error("A API nao retornou um numero de pedido valido.");
    }

    campoNumeroPedido.value = numeroPedido;
    campoNumeroPedido.dataset.valorOriginal = numeroPedido;
    campoNumeroPedido.setAttribute("data-valor-original", numeroPedido);
    campoNumeroPedido.dispatchEvent(new Event("input", { bubbles: true }));
    campoNumeroPedido.dispatchEvent(new Event("change", { bubbles: true }));

    return numeroPedido;
  }

  function obterContatoClienteParaOmie() {
    const seletores = [
      "#clientesWrapper .cliente-item .nomeContato",
      ".cliente-item .nomeContato",
      ".nomeContato",
      "#contatoResponsavel",
      ".contatoResponsavel",
      "#popupCliente_contato",
      'input[name="contato"]'
    ];

    for (const seletor of seletores) {
      const el = document.querySelector(seletor);
      const valor =
        el?.value?.trim?.() ||
        el?.dataset?.valorOriginal?.trim?.() ||
        el?.textContent?.trim?.() ||
        "";

      if (valor) return valor;
    }

    return "";
  }

  function obterResumoGrupoParaOmie(grupoId) {
    if (!grupoId) return "";

    const textarea =
      document.getElementById(`resumo-${grupoId}`) ||
      document.querySelector(`textarea[id="resumo-${grupoId}"]`);

    return (
      textarea?.value?.trim?.() ||
      textarea?.dataset?.valorOriginal?.trim?.() ||
      textarea?.textContent?.trim?.() ||
      ""
    );
  }

  function montarDadosAdicionaisNFOmie(numeroPedido, numeroOrcamento) {
    const linhas = [];
    const numeroPedidoLimpo = String(numeroPedido || "").trim();
    const numeroOrcamentoLimpo = String(numeroOrcamento || "").trim();

    if (numeroPedidoLimpo) {
      linhas.push(`Numero de pedido: ${numeroPedidoLimpo}`);
    }

    if (numeroOrcamentoLimpo) {
      linhas.push(`Numero de orçamento: ${numeroOrcamentoLimpo}`);
    }

    return linhas.join("\n").trim();
  }

  function montarObservacoesVendaOmie(numeroPedido, numeroOrcamento, parcelasProduto = []) {
    const linhas = [];
    const dadosAdicionaisNF = montarDadosAdicionaisNFOmie(numeroPedido, numeroOrcamento);

    if (dadosAdicionaisNF) {
      linhas.push(dadosAdicionaisNF);
    }

    const parcelasTexto = (parcelasProduto || [])
      .map(vvNormalizarParcelaControle)
      .filter(parcela => parcela.valor > 0 && !parcela.ignorar)
      .map((parcela, index) => {
        const partes = [`Parcela ${index + 1}`];
        const dataFormatada = formatarDataBR(parcela.vencimento) || parcela.vencimento;

        if (dataFormatada) partes.push(`vencimento ${dataFormatada}`);
        partes.push(`valor R$ ${formatarMoedaBR(parcela.valor)}`);

        if (parcela.tipo_monetario) partes.push(`tipo ${parcela.tipo_monetario}`);
        if (parcela.condicao_pagto) partes.push(`condicao ${parcela.condicao_pagto}`);
        if (parcela.descritivo) partes.push(`descricao ${parcela.descritivo}`);

        return partes.join(" | ");
      });

    if (parcelasTexto.length) {
      linhas.push("Parcelas:");
      linhas.push(parcelasTexto.join("\n"));
    }

    return linhas.join("\n").trim();
  }

  function atualizarMarcadorConferencia(totalOmie, totalTela) {
    const bate = Math.abs(round2(totalOmie) - round2(totalTela)) < 0.01;

    const elTotalTela =
      document.getElementById("vv-total-ajustado") ||
      document.getElementById("vv-cat-produto");
    if (!elTotalTela || !elTotalTela.parentNode) {
      console.warn("⚠️ Elemento #vv-cat-produto não encontrado para marcador visual.");
      return { bate, totalOmie, totalTela, diferenca: round2(totalOmie - totalTela) };
    }

    let marcador = document.getElementById("vv-marcador-conferencia-omie");

    if (!marcador) {
      marcador = document.createElement("div");
      marcador.id = "vv-marcador-conferencia-omie";
      marcador.style.marginTop = "8px";
      marcador.style.padding = "10px 14px";
      marcador.style.borderRadius = "10px";
      marcador.style.fontWeight = "700";
      marcador.style.fontSize = "13px";
      marcador.style.lineHeight = "1.45";
      marcador.style.display = "inline-block";
      marcador.style.border = "1px solid transparent";
      marcador.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      elTotalTela.parentNode.appendChild(marcador);
    }

    if (bate) {
      marcador.style.background = "#eaf8ee";
      marcador.style.color = "#166534";
      marcador.style.borderColor = "#bbf7d0";
      marcador.innerHTML = `
        ✅ Total dos produtos confere com a Omie<br>
        Omie: <strong>R$ ${formatarMoedaBR(totalOmie)}</strong><br>
        Tela: <strong>R$ ${formatarMoedaBR(totalTela)}</strong>
      `;
    } else {
      marcador.style.background = "#fef0f0";
      marcador.style.color = "#b42318";
      marcador.style.borderColor = "#fecdca";
      marcador.innerHTML = `
        ❌ Divergência no total dos produtos<br>
        Omie: <strong>R$ ${formatarMoedaBR(totalOmie)}</strong><br>
        Tela: <strong>R$ ${formatarMoedaBR(totalTela)}</strong><br>
        Diferença: <strong>R$ ${formatarMoedaBR(round2(totalOmie - totalTela))}</strong>
      `;
    }

    return {
      bate,
      totalOmie: round2(totalOmie),
      totalTela: round2(totalTela),
      diferenca: round2(totalOmie - totalTela)
    };
  }

  async function pegarVendedorSelecionadoComCodigo(selectId = "vendedorResponsavel") {
    const select = await esperarSelectCarregar(selectId, { minOptions: 2, timeoutMs: 15000 });
    if (!select) return null;

    const opt = select.options?.[select.selectedIndex];
    const nomeSelecionado = (
      opt?.text ||
      select.value ||
      select.getAttribute("data-valor-original") ||
      ""
    ).trim();

    if (!nomeSelecionado || nomeSelecionado.toUpperCase() === "SELECIONE") {
      return null;
    }

    const normalizar = (s) =>
      (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

    const nomeNorm = normalizar(nomeSelecionado);

    const lista = Array.isArray(VENDEDORES_FIXOS_FALLBACK?.cadastro)
      ? VENDEDORES_FIXOS_FALLBACK.cadastro
      : [];

    if (!lista.length) {
      console.warn("⚠️ VENDEDORES_FIXOS_FALLBACK.cadastro está vazio ou inexistente.");
      return null;
    }

    let match = lista.find(v => normalizar(v?.nome) === nomeNorm);

    if (!match) {
      const candidatos = lista.filter(v => {
        const nomeApi = normalizar(v?.nome);
        return nomeApi.includes(nomeNorm) || nomeNorm.includes(nomeApi);
      });

      if (candidatos.length === 1) {
        match = candidatos[0];
      } else if (candidatos.length > 1) {
        match = candidatos.find(v => String(v?.inativo || "").toUpperCase() === "N") || candidatos[0];
      }
    }

    if (!match) {
      const codigoDigitado = (document.getElementById("codigoVendedor")?.value || "").trim();
      if (codigoDigitado) {
        match = lista.find(v => String(v?.codigo || "").trim() === codigoDigitado);
      }
    }

    if (!match) {
      console.warn("⚠️ Não foi possível localizar vendedor na variável fixa.", {
        nomeSelecionado,
        nomeNorm,
        lista
      });
      return null;
    }

    return {
      nomeSelect: nomeSelecionado,
      nomeApi: match.nome,
      codigo: Number(match.codigo)
    };
  }

  const vendedorInfo = await pegarVendedorSelecionadoComCodigo("vendedorResponsavel");

  if (!vendedorInfo?.codigo) {
    mostrarPopupCustomizado("Atenção", "Selecione um Vendedor Responsável válido (não foi possível recuperar o código).", "info");
    return null;
  }

  const ambientesMarcados = (typeof lerAmbientesMarcados === "function")
    ? lerAmbientesMarcados()
    : [];

  const candidatos = coletarItensPorGrupoParaOmie(ambientesMarcados);

  if (!candidatos.length) {
    mostrarPopupCustomizado("Atenção", "Nenhum item elegível encontrado nos ambientes marcados.", "info");
    return null;
  }

  const selecao = await abrirPopupSelecaoItensOmie(candidatos);

  if (!selecao) {
    console.log("🚫 Seleção cancelada pelo usuário.");
    return null;
  }

  const { aprovadosParaOmie, ignorados, totais } = selecao;

  // ── DETECÇÃO: pedido somente de serviços ──────────────────────────────────
  // Casos cobertos:
  //   a) aprovados vazio + valorServicos preenchido
  //      → checkbox "Somente Serviços" marcou todos os produtos como ignorados
  //   b) aprovados só tem itens do tipo "servico" (MO Hora etc.) + valorServicos > 0
  //      → nenhum produto/vidro foi aprovado
  // Em ambos os casos os totais já foram gravados em
  // window.vvUltimosTotaisSelecaoItensOmie pelo popup (incluindo parcelasServico).
  if (!aprovadosParaOmie.length) {
    if (Number(totais?.valorServicos || 0) > 0) {
      console.log("[gerarPayloadOmie] Aprovados vazio + valorServicos > 0 → modo somente serviços.");
      return { servicosOnly: true };
    }
    mostrarPopupCustomizado("Atenção", "Selecione ao menos um item para enviar à Omie.", "info");
    return null;
  }

  const _aprovadosProdutos = aprovadosParaOmie.filter(item => {
    const tipo = classificarTipoItem(item);
    return tipo === "produto" || tipo === "vidro";
  });
  if (_aprovadosProdutos.length === 0 && Number(totais?.valorServicos || 0) > 0) {
    console.log("[gerarPayloadOmie] Nenhum produto aprovado + valorServicos > 0 → modo somente serviços.");
    return { servicosOnly: true };
  }
  // ─────────────────────────────────────────────────────────────────────────

  window.__vvUltimaSelecaoOmie = selecao;

  try {
    if (typeof produtosFaturadosParaOCliente === "function") {
      produtosFaturadosParaOCliente(ignorados);
    }
  } catch (e) {
    console.warn("produtosFaturadosParaOCliente falhou:", e);
  }

  const parcelasProdutoParaEnvio = vvObterParcelasProdutoParaEnvioOmie(totais?.parcelasProduto || null);
  const parcelasProdutoSemData = parcelasProdutoParaEnvio
    .map((parcela, index) => ({ parcela, index }))
    .filter(item => !formatarDataBR(item.parcela?.vencimento));

  if (!parcelasProdutoParaEnvio.length) {
    mostrarPopupCustomizado("Atenção", "Nenhuma parcela de produto válida foi informada para enviar à Omie.", "info");
    return null;
  }

  if (parcelasProdutoSemData.length) {
    mostrarPopupCustomizado("Atenção", "Preencha a data de vencimento das parcelas de produto antes de enviar à Omie: " +
      parcelasProdutoSemData.map(item => `Parcela ${item.index + 1}`).join(", "), "info");
    return null;
  }

  const parcelasProdutoPayloadOmie = vvMontarParcelasProdutoPayloadOmie(parcelasProdutoParaEnvio);
  primeiraDataParcela = parcelasProdutoPayloadOmie[0]?.data_vencimento || "";

  if (!primeiraDataParcela) {
    mostrarPopupCustomizado("Atenção", "Data da 1ª parcela de produto não preenchida.", "info");
    return null;
  }

  const codigoPedidoIntegracao = (typeof gerarNumeroPedidoUnico === "function")
    ? gerarNumeroPedidoUnico()
    : ("PED-" + Date.now());
  const numeroPedidoTela = String(lerValorCampoOmie("numeroPedido") || "").trim();
  const codigoProjetoOmie = await vvGarantirProjetoOmiePorPedido(numeroPedidoTela);
  const numeroOrcamentoTela = lerValorCampoOmie("numeroOrcamento");
  const contatoClienteTela = obterContatoClienteParaOmie();
  const dadosAdicionaisNF = montarDadosAdicionaisNFOmie(
    numeroPedidoTela,
    numeroOrcamentoTela
  );
  const observacoesVenda = montarObservacoesVendaOmie(
    numeroPedidoTela,
    numeroOrcamentoTela,
    parcelasProdutoParaEnvio
  );

  const payload = {
    cabecalho: {
      codigo_cliente: codigoCliente,
      codigo_pedido_integracao: codigoPedidoIntegracao,
      data_previsao: primeiraDataParcela,
      etapa: "10",
      numero_pedido: numeroPedidoTela,
      codigo_parcela: "999",
      quantidade_itens: 0
    },
    det: [],
    lista_parcelas: { parcela: [] },
    frete: { modalidade: "9" },
    observacoes: {
      obs_venda: observacoesVenda
    },
    informacoes_adicionais: {
      codigo_categoria: "1.01.01",
      codigo_conta_corrente: 2513856536,
      numero_pedido_cliente: numeroPedidoTela,
      numero_contrato: numeroPedidoTela,
      contato: contatoClienteTela,
      dados_adicionais_nf: dadosAdicionaisNF,
      consumidor_final: "S",
      enviar_email: "S",
      codVend: vendedorInfo.codigo,
      codProj: codigoProjetoOmie
    },
    agropecuario: {
      cNumReceita: "",
      cCpfResponsavel: "",
      nTipoGuia: 1,
      cUFGuia: "",
      cSerieGuia: "",
      nNumGuia: 1
    }
  };

  const aprovadosSomenteProdutos = aprovadosParaOmie.filter(item => {
    const tipo = classificarTipoItem(item);
    return tipo === "produto" || tipo === "vidro";
  });

  const itensConsideradosNoTotal = [];
  let totalProdutosOmie = 0;

  aprovadosSomenteProdutos.forEach((item, index) => {
    const codigo_produto = String(item.codigo || "").trim();

    if (!codigo_produto) {
      console.warn("â›” Produto sem código Omie:", item);
      return;
    }

    const descricao = String(item.descricao || "Item sem descrição").trim();

    let quantidade = Number(item.quantidade || 1);
    if (!quantidade || quantidade <= 0) quantidade = 1;

    let valor_unitario = Number(item.valorUnitarioItem || 0);

    if ((!valor_unitario || valor_unitario <= 0) && Number(item.valorTotalItem || 0) > 0) {
      valor_unitario = quantidade > 0
        ? Number((Number(item.valorTotalItem) / quantidade).toFixed(2))
        : Number(Number(item.valorTotalItem).toFixed(2));
    }

    if ((!valor_unitario || valor_unitario <= 0) && Number(item.valorAjustadoParaOmie || 0) > 0) {
      valor_unitario = Number(item.valorAjustadoParaOmie || 0);
      quantidade = 1;
    }

    quantidade = round2(quantidade);
    valor_unitario = round2(valor_unitario);

    if (!valor_unitario || valor_unitario <= 0) {
      console.warn("â›” Produto sem valor_unitario válido:", item);
      return;
    }

    const totalItem = round2(quantidade * valor_unitario);

    if (!totalItem || totalItem <= 0) {
      console.warn("â›” Produto com total zerado ignorado:", item);
      return;
    }

    payload.det.push({
      ide: {
        codigo_item_integracao: `${codigoPedidoIntegracao}-${index + 1}`
      },
      inf_adic: {
        peso_bruto: 1,
        peso_liquido: 1,
        dados_adicionais_item: obterResumoGrupoParaOmie(item.grupoId)
      },
      observacao: {
        obs_item: numeroOrcamentoTela
      },
      produto: {
        cfop: "5.102",
        codigo_produto,
        descricao,
        ncm: "9403.30.00",
        quantidade,
        tipo_desconto: "V",
        unidade: "UN",
        valor_desconto: 0,
        valor_unitario
      }
    });

    payload.cabecalho.quantidade_itens++;

    totalProdutosOmie += totalItem;

    itensConsideradosNoTotal.push({
      index: index + 1,
      codigo_produto,
      descricao,
      quantidade,
      valor_unitario,
      totalItem
    });
  });

  totalProdutosOmie = round2(totalProdutosOmie);

  if (!payload.det.length) {
    mostrarPopupCustomizado("Atenção", "Nenhum item válido foi montado para envio à Omie. Verifique código Omie e valor dos produtos.", "info");
    return null;
  }

  // Garante que a soma dos itens bate com o Total parcelado (produtos) confirmado no popup de parcelas.
  // Se o usuário ajustou as parcelas (ex: faturamento direto, arredondamentos), o valor correto a
  // enviar é a soma das parcelas de produto — não o total calculado internamente.
  // Reescala SOMENTE se as parcelas vieram do popup de seleção (totais.parcelasProduto preenchido).
  // Se as parcelas vieram só do formulário principal (fallback), não reescala — caso contrário,
  // ignorar um produto no popup seria anulado pelo total antigo do formulário.
  const parcelasVieramDoPopup = Array.isArray(totais?.parcelasProduto) && totais.parcelasProduto.length > 0;

  const totalParceladoProdutos = round2(
    (parcelasProdutoParaEnvio || [])
      .reduce((s, p) => s + Number(p?.valor || 0), 0)
  );

  if (parcelasVieramDoPopup && totalParceladoProdutos > 0 && Math.abs(totalParceladoProdutos - totalProdutosOmie) >= 0.01) {
    const fator = totalParceladoProdutos / totalProdutosOmie;
    let acumulado = 0;

    payload.det.forEach((item, idx) => {
      if (idx < payload.det.length - 1) {
        const novoValor = round2(item.produto.valor_unitario * fator);
        acumulado = round2(acumulado + novoValor * item.produto.quantidade);
        item.produto.valor_unitario = novoValor;
      } else {
        // último item absorve o resíduo de arredondamento
        const restante = round2(totalParceladoProdutos - acumulado);
        item.produto.valor_unitario = round2(
          item.produto.quantidade > 0 ? restante / item.produto.quantidade : restante
        );
      }
    });

    console.log(
      `[payload] valor_unitario reescalado: ${totalProdutosOmie} → ${totalParceladoProdutos} (fator ${fator.toFixed(6)})`
    );
    totalProdutosOmie = totalParceladoProdutos;
  }

  payload.lista_parcelas.parcela = parcelasProdutoPayloadOmie;

  const totalTelaProdutos = round2(
    Number(window.vvUltimoTotalFinalProdutosOmie ?? 0) ||
    parseMoedaBR(document.getElementById("vv-total-ajustado")?.textContent || "0") ||
    (
      parseMoedaBR(document.getElementById("vv-cat-produto")?.textContent || "0") +
      parseMoedaBR(document.getElementById("vv-cat-vidro")?.textContent || "0")
    )
  );

  const resumoConferencia = atualizarMarcadorConferencia(totalProdutosOmie, totalTelaProdutos);

  window.__vvResumoPayloadOmie = {
    codigoPedidoIntegracao,
    codigoProjeto: codigoProjetoOmie,
    numeroPedido: numeroPedidoTela,
    numeroPedidoCliente: numeroPedidoTela,
    numeroContrato: numeroPedidoTela,
    contato: contatoClienteTela,
    numeroOrcamento: numeroOrcamentoTela,
    dadosAdicionaisNF,
    observacoesVenda,
    totalProdutosOmie,
    totalTelaProdutos,
    diferenca: round2(totalProdutosOmie - totalTelaProdutos),
    itensConsideradosNoTotal,
    resumoConferencia
  };

  console.group("✅ Payload de produtos gerado");
  console.log("Payload:", payload);
  console.table(itensConsideradosNoTotal);
  console.log("Total produtos Omie:", totalProdutosOmie);
  console.log("Total tela (#vv-cat-produto):", totalTelaProdutos);
  console.log("Resumo conferência:", resumoConferencia);
  console.log("ðŸ› ️ Valor de serviços separado para OS:", totais?.valorServicos || 0);
  console.groupEnd();

  return payload;
}




/* =========================================================
   POPUP DE ESCOLHA: Produtos+Serviços  vs  Somente Serviços
   ========================================================= */
function abrirPopupEscolhaTipoEnvioOmie() {
  return new Promise((resolve) => {
    // backdrop
    const bd = document.createElement('div');
    bd.id = '_vv_tipo_envio_popup';
    bd.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.45);
      display:flex; align-items:center; justify-content:center; z-index:9999;
    `;

    // caixa
    const box = document.createElement('div');
    box.style.cssText = `
      background:#fff; border-radius:16px; padding:32px 28px;
      box-shadow:0 20px 60px rgba(0,0,0,.22); width:min(94vw,480px);
      font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
      display:flex; flex-direction:column; gap:20px;
    `;

    // título
    const titulo = document.createElement('h3');
    titulo.textContent = 'O que deseja enviar para a Omie?';
    titulo.style.cssText = 'margin:0; font-size:18px; font-weight:700; color:#1e293b;';

    // subtítulo
    const sub = document.createElement('p');
    sub.textContent = 'Escolha o tipo de envio para esta operação.';
    sub.style.cssText = 'margin:0; font-size:14px; color:#64748b;';

    // botões de opção
    const btnProdServ = document.createElement('button');
    btnProdServ.innerHTML = `
      
      <div>
        <div style="font-weight:700; font-size:15px;">Produtos + Serviços</div>
        <div style="font-size:13px; color:#475569; margin-top:3px;">Envia pedido de produtos e OS de serviços</div>
      </div>
    `;
    btnProdServ.style.cssText = `
      display:flex; align-items:center; gap:14px; width:100%;
      padding:16px 18px; border:2px solid #e2e8f0; border-radius:12px;
      background:#f8fafc; cursor:pointer; text-align:left;
      transition:border-color .15s, background .15s;
    `;
    btnProdServ.onmouseenter = () => {
      btnProdServ.style.borderColor = '#2563eb';
      btnProdServ.style.background = '#eff6ff';
    };
    btnProdServ.onmouseleave = () => {
      btnProdServ.style.borderColor = '#e2e8f0';
      btnProdServ.style.background = '#f8fafc';
    };

    const btnSoServ = document.createElement('button');
    btnSoServ.innerHTML = `
      
      <div>
        <div style="font-weight:700; font-size:15px;">Somente Serviços</div>
        <div style="font-size:13px; color:#475569; margin-top:3px;">Envia apenas a OS de serviços (sem pedido de produtos)</div>
      </div>
    `;
    btnSoServ.style.cssText = `
      display:flex; align-items:center; gap:14px; width:100%;
      padding:16px 18px; border:2px solid #e2e8f0; border-radius:12px;
      background:#f8fafc; cursor:pointer; text-align:left;
      transition:border-color .15s, background .15s;
    `;
    btnSoServ.onmouseenter = () => {
      btnSoServ.style.borderColor = '#7c3aed';
      btnSoServ.style.background = '#f5f3ff';
    };
    btnSoServ.onmouseleave = () => {
      btnSoServ.style.borderColor = '#e2e8f0';
      btnSoServ.style.background = '#f8fafc';
    };

    // botão cancelar
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.cssText = `
      align-self:flex-end; padding:8px 20px; border:1px solid #e2e8f0;
      background:#fff; border-radius:8px; cursor:pointer; font-size:14px;
      color:#64748b; font-weight:600;
    `;

    // eventos
    btnProdServ.addEventListener('click', () => {
      document.body.removeChild(bd);
      resolve('produtos_servicos');
    });
    btnSoServ.addEventListener('click', () => {
      document.body.removeChild(bd);
      resolve('so_servicos');
    });
    btnCancel.addEventListener('click', () => {
      document.body.removeChild(bd);
      resolve(null);
    });

    box.appendChild(titulo);
    box.appendChild(sub);
    box.appendChild(btnProdServ);
    box.appendChild(btnSoServ);
    box.appendChild(btnCancel);
    bd.appendChild(box);
    document.body.appendChild(bd);
  });
}


/* =========================================================
   FLUXO: Somente Serviços (sem popup de produtos)
   ========================================================= */
async function fluxoSomenteServicos() {
  const abrirStatus = (titulo, mensagem, tipo = 'info') => {
    mostrarPopupCustomizado(titulo, mensagem, tipo);
  };

  try {
    if (typeof mostrarCarregando === 'function') mostrarCarregando();


    const numeroPedidoGarantido = await garantirNumeroPedidoPreenchido();
    await vvCarregarClientesServicoOmie();
    definirCodigoVendedorServicoSelecionado();

    // ── carrega parcelas existentes ──────────────────────────
    const parcelasServicoExistentes =
      (Array.isArray(window.vvParcelasServicoOmie) && window.vvParcelasServicoOmie.length)
        ? window.vvParcelasServicoOmie
        : (window.propostaEmEdicao?.camposFormulario?.parcelasServico || []);

    // ── fecha loading ANTES de abrir o popup ─────────────────
    if (typeof ocultarCarregando === 'function') ocultarCarregando();

    const resultado = await abrirPopupSomenteServicos({
      parcelasServicoExistentes,
      numeroPedido: numeroPedidoGarantido
    });

    if (!resultado) {
      abrirStatus('ℹ️ Cancelado', 'Envio de serviços cancelado.', 'info');
      return;
    }

    const { valorServicos, parcelasServico } = resultado;

    if (!(valorServicos > 0)) {
      mostrarPopupCustomizado("Atenção", "Informe um valor de serviços válido.", "info");
      return;
    }

    window.vvParcelasServicoOmie    = parcelasServico;
    window.vvTotalServicosAplicado  = valorServicos;

    if (typeof mostrarCarregando === 'function') mostrarCarregando();
    abrirStatus('ðŸ› ️ Enviando Serviços', 'Enviando OS de serviços para a Omie.', 'info');

    const osResp = await enviarOSServico({ valorServicos, parcelasServico });

    if (osResp?.ok) {
      abrirStatus('✅ Serviços enviados', 'OS de serviços criada com sucesso na Omie.', 'success');
    } else {
      abrirStatus(
        '❌ Falha no envio dos serviços',
        osResp?.error || osResp?.erro || osResp?.message || 'Erro desconhecido.',
        'error'
      );
    }

  } catch (erro) {
    console.error('❌ fluxoSomenteServicos:', erro);
    mostrarPopupCustomizado('❌ Erro', erro?.message || String(erro), 'error');
  } finally {
    if (typeof ocultarCarregando === 'function') ocultarCarregando();
  }
}


function abrirPopupSomenteServicos({ parcelasServicoExistentes = [], numeroPedido = '' } = {}) {
  return new Promise((resolve) => {

    // ── lê valor e desconto da tela ──────────────────────────
    // ── lê valor e desconto da tela ──────────────────────────
function lerValorTela(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const txt = (el.textContent || el.innerText || el.value || '')
    .replace(/\u00A0/g, ' ').trim();
  return typeof vv_parseBRL === 'function' ? vv_parseBRL(txt) : 0;
}

// No fluxo "Somente Serviços", o valor dos serviços = Valor Final Total
const valorServicoInicial = lerValorTela('valorFinalTotal');

// desconto da tela para exibição informativa
const campoDesc = document.getElementById('campoDescontoFinal');
const descontoTexto = (
  campoDesc?.value?.trim() ||
  campoDesc?.dataset?.valorOriginal?.trim() ||
  ''
);
const valorFinalTela = valorServicoInicial; // são o mesmo valor

    // ── parcelas: usa existentes ou lê do formulário principal ─
    let parcelasIniciais = parcelasServicoExistentes;
    if (!parcelasIniciais.length) {
      // tenta reutilizar as parcelas de produto do formulário como ponto de partida
      parcelasIniciais = vvLerParcelasFormularioPrincipal()
        .filter(p => p.valor > 0)
        .map(p => ({
          ...p,
          // mantém tipo e condição, zera valor para o usuário preencher
          valor: 0
        }));
    }

    // ── monta modal ──────────────────────────────────────────
    const bd = document.createElement('div');
    bd.className = 'vv-modal-backdrop';

    const md = document.createElement('div');
    md.className = 'vv-modal';
    md.style.maxWidth = '780px';
    md.style.width = '96vw';

    const hd = document.createElement('header');
    hd.innerHTML = `
      <div style="display:grid; gap:4px;">
        <h3>ðŸ› ️ Configurar Serviços para a Omie</h3>
        <div class="vv-help" style="margin:0;">
          Informe o valor e as parcelas da OS de serviços que será criada na Omie.
        </div>
      </div>
    `;

    const by = document.createElement('div');
    by.className = 'vv-body';
    by.innerHTML = `
      <div style="display:grid; gap:18px;">

        <!-- Resumo informativo da tela -->
<div style="
  display:grid; gap:8px;
  grid-template-columns:repeat(auto-fit, minmax(180px,1fr));
  padding:12px 14px; border:1px solid #e2e8f0;
  border-radius:12px; background:#f8fafc;
  font-size:14px;
">
  <div>
    Valor Final Total:
    <b id="vv-so-info-final">
      ${valorFinalTela > 0 ? vv_fmtBRL(valorFinalTela) : '—'}
    </b>
  </div>
  <div>
    Desconto aplicado:
    <b id="vv-so-info-desc">
      ${descontoTexto || '—'}
    </b>
  </div>
</div>

        <!-- Campo de valor -->
        <div>
          <label class="form-label" style="font-weight:600;">
            Valor total dos Serviços (R$)
          </label>
          <input
            id="vv-so-serv-valor"
            type="text"
            class="form-control"
            placeholder="Ex: 1.500,00"
            value="${valorServicoInicial > 0 ? vv_fmtBRL(valorServicoInicial) : ''}"
            style="max-width:280px; margin-top:6px;"
          >
          <small class="vv-help" style="display:block; margin-top:4px;">
            Este é o valor que será gerado na OS de serviços da Omie.
          </small>
        </div>

        <!-- Parcelas -->
        <div>
          <div style="
            display:flex; justify-content:space-between;
            align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;
          ">
            <label class="form-label" style="font-weight:600; margin:0;">
              Parcelas de Serviço
            </label>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="vv-btn" id="vv-so-gerar-1x">Gerar 1x</button>
              <button type="button" class="vv-btn" id="vv-so-gerar-2x">Gerar 2x</button>
              <button type="button" class="vv-btn" id="vv-so-add-parcela">+ Adicionar</button>
            </div>
          </div>

          <!-- resumo soma parcelas -->
          <div style="
            font-size:13px; color:#475569; margin-bottom:8px;
          ">
            Total parcelado:
            <b id="vv-so-total-parcelado">${vv_fmtBRL(0)}</b>
          </div>

          <div id="vv-so-lista-parcelas"
            style="display:flex; flex-direction:column; gap:10px;">
          </div>
        </div>

      </div>
    `;

    const ft = document.createElement('div');
    ft.className = 'vv-footer';
    ft.innerHTML = `
      <div class="vv-help">
        Pedido: <b>${numeroPedido || '(não preenchido)'}</b>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="vv-btn" id="vv-so-cancelar">Cancelar</button>
        <button class="vv-btn primary" id="vv-so-confirmar">Confirmar e Enviar</button>
      </div>
    `;

    md.appendChild(hd);
    md.appendChild(by);
    md.appendChild(ft);
    bd.appendChild(md);
    document.body.appendChild(bd);

    const listaEl       = by.querySelector('#vv-so-lista-parcelas');
    const valorInput    = by.querySelector('#vv-so-serv-valor');
    const totalParc     = by.querySelector('#vv-so-total-parcelado');

    // ── atualiza total parcelado ──────────────────────────────
    function atualizarTotalParcelado() {
      const linhas = [...listaEl.querySelectorAll('.vv-so-row')];
      const soma = linhas.reduce((acc, row) => {
        const v = vv_parseBRL(row.querySelector('.valor-so')?.value || '0');
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      if (totalParc) totalParc.textContent = vv_fmtBRL(soma);
    }

    // ── cria linha de parcela ─────────────────────────────────
    function criarLinhaParcela(parcela = {}) {
      const norm = vvNormalizarParcelaControle(parcela);
      const row  = document.createElement('div');
      row.className = 'vv-so-row';
      row.style.cssText = `
        display:grid;
        grid-template-columns:1fr 1fr 1fr 1fr auto;
        gap:8px; align-items:end;
        border:1px solid #e2e8f0; border-radius:10px;
        padding:10px 12px; background:#fff;
      `;
      row.innerHTML = `
        <div>
          <label class="form-label mb-0" style="font-size:12px;">Tipo Monetário</label>
          <select class="form-select form-select-sm tipo-mon-so">
            <option value="" disabled selected>Selecione...</option>
            <option value="17">Pix</option>
            <option value="01">Dinheiro</option>
            <option value="03">Cartão Parcelado</option>
            <option value="03">Cartão de Crédito</option>
            <option value="04">Cartão de Débito</option>
            <option value="15">Boleto Recorrente</option>
            <option value="15">Boleto à Vista</option>
            <option value="99">Permuta</option>
          </select>
        </div>
        <div>
          <label class="form-label mb-0" style="font-size:12px;">Condição de Pagto</label>
          <div class="cond-wrapper-so"></div>
        </div>
        <div>
          <label class="form-label mb-0" style="font-size:12px;">Valor</label>
          <input type="text" class="form-control form-control-sm valor-so" placeholder="Ex: 500,00">
        </div>
        <div>
          <label class="form-label mb-0" style="font-size:12px;">Vencimento</label>
          <input type="date" class="form-control form-control-sm data-so">
        </div>
        <div style="padding-bottom:2px;">
          <button type="button" class="vv-btn danger btn-remover-so"
            style="padding:6px 10px; font-size:13px;">âœ•</button>
        </div>
      `;

      const tipoSel = row.querySelector('.tipo-mon-so');
      const valorEl = row.querySelector('.valor-so');
      const dataEl  = row.querySelector('.data-so');
      const condWr  = row.querySelector('.cond-wrapper-so');

      if (tipoSel && norm.tipo_monetario) tipoSel.value = norm.tipo_monetario;
      if (valorEl && norm.valor > 0) valorEl.value = vv_fmtBRL(norm.valor);
      if (dataEl  && norm.vencimento)  dataEl.value  = norm.vencimento;

      vvMontarCampoCondicaoParcelas(condWr, {
        className: 'condicao-pagto-so',
        valor: norm.condicao_pagto || '',
        onChange: atualizarTotalParcelado
      });

      valorEl?.addEventListener('input', atualizarTotalParcelado);
      valorEl?.addEventListener('blur', () => {
        const v = vv_parseBRL(valorEl.value || '0');
        valorEl.value = v > 0 ? vv_fmtBRL(v) : '';
        atualizarTotalParcelado();
      });

      row.querySelector('.btn-remover-so')?.addEventListener('click', () => {
        row.remove();
        atualizarTotalParcelado();
      });

      return row;
    }

    function adicionarParcela(parcela = {}) {
      listaEl.appendChild(criarLinhaParcela(parcela));
      atualizarTotalParcelado();
    }

    // ── gerar N parcelas iguais ───────────────────────────────
    function gerarParcelasIguais(qtd) {
      const totalServico = vv_parseBRL(valorInput.value || '0');
      listaEl.innerHTML = '';

      // tenta reutilizar dados da primeira parcela existente como referência
      const refParcela = parcelasIniciais[0] || {};

      let acumulado = 0;
      for (let i = 0; i < qtd; i++) {
        let valor = Math.round((totalServico / qtd) * 100) / 100;
        if (i === qtd - 1) {
          valor = Math.round((totalServico - acumulado) * 100) / 100;
        }
        acumulado = Math.round((acumulado + valor) * 100) / 100;

        adicionarParcela({
          tipo_monetario: refParcela.tipo_monetario || '',
          condicao_pagto: refParcela.condicao_pagto || '',
          valor,
          vencimento: i === 0 ? (refParcela.vencimento || '') : ''
        });
      }
    }

    // ── carrega parcelas iniciais ─────────────────────────────
    if (parcelasIniciais.length) {
      parcelasIniciais.forEach(p => adicionarParcela(p));
    } else {
      adicionarParcela();
    }

    // ── eventos dos botões ────────────────────────────────────
    valorInput.addEventListener('blur', () => {
      const v = vv_parseBRL(valorInput.value || '0');
      valorInput.value = v > 0 ? vv_fmtBRL(v) : '';
    });

    by.querySelector('#vv-so-gerar-1x')
      ?.addEventListener('click', () => gerarParcelasIguais(1));

    by.querySelector('#vv-so-gerar-2x')
      ?.addEventListener('click', () => gerarParcelasIguais(2));

    by.querySelector('#vv-so-add-parcela')
      ?.addEventListener('click', () => adicionarParcela());

    ft.querySelector('#vv-so-cancelar')
      ?.addEventListener('click', () => {
        document.body.removeChild(bd);
        resolve(null);
      });

    ft.querySelector('#vv-so-confirmar')
      ?.addEventListener('click', () => {
        const valorServicos = vv_parseBRL(valorInput.value || '0');

        if (!(valorServicos > 0)) {
          mostrarPopupCustomizado("Atenção", "Informe um valor de serviços válido.", "info");
          return;
        }

        const parcelas = [...listaEl.querySelectorAll('.vv-so-row')]
          .map(row => {
            const condEl = row.querySelector('.condicao-pagto-so');
            return vvNormalizarParcelaControle({
              tipo_monetario: row.querySelector('.tipo-mon-so')?.value || '',
              condicao_pagto: condEl?.value || '',
              valor:      row.querySelector('.valor-so')?.value || '',
              vencimento: row.querySelector('.data-so')?.value  || ''
            });
          })
          .filter(p => p.valor > 0);

        if (!parcelas.length) {
          mostrarPopupCustomizado("Atenção", "Adicione ao menos uma parcela com valor.", "info");
          return;
        }

        const semData = parcelas.filter(p => !p.vencimento);
        if (semData.length) {
          mostrarPopupCustomizado("Atenção", `Preencha a data de vencimento de todas as parcelas. ${semData.length} parcela(s) sem data.`, "info");
          return;
        }

        document.body.removeChild(bd);
        resolve({
          valorServicos,
          parcelasServico: vvSerializarParcelasServicoParaServidor(parcelas)
        });
      });
  });
}
/* =======================================
   6) ENVIAR PARA OMIE (botão/onclick)
   ======================================= */
async function atualizarNaOmie() {

  // ── VALIDAÇÃO: parcelas devem bater com o total antes de enviar ───
  if (typeof parcelasValidas === "function" && !parcelasValidas()) return;
  if (typeof parcelasCompletasParaOmie === "function" && !parcelasCompletasParaOmie()) return;

  // ── VALIDAÇÃO: cliente precisa ter UF cadastrada na Omie ──────────
  {
    // Exibe overlay de "verificando" imediatamente — o popup aparece antes de qualquer outra ação
    const _ufLoadingOv = document.createElement("div");
    _ufLoadingOv.id = "_uf_loading_ov";
    _ufLoadingOv.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;";
    _ufLoadingOv.innerHTML = `<div style="background:#fff;border-radius:12px;padding:24px 32px;box-shadow:0 8px 32px rgba(0,0,0,.2);font-size:14px;color:#374151;display:flex;align-items:center;gap:12px;">
      <span style="display:inline-block;width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:_uf_spin .7s linear infinite;"></span>
      Verificando dados do cliente na Omie…
    </div>
    <style>@keyframes _uf_spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(_ufLoadingOv);

    let _ufProsseguir = true; // por padrão prossegue; false = usuário cancelou

    try {
      // Tenta identificar o cliente pelo código Omie, CNPJ ou nome — na ordem de prioridade
      const _codigoOmieEl = document.querySelector(".cliente-item .codigoCliente");
      const _cnpjCpfEl   = document.querySelector(".cliente-item .cpfCnpj");
      const _razaoEl     = document.querySelector(".cliente-item .razaoSocial");
      const _codigoOmie  = (_codigoOmieEl?.value || "").trim();
      const _cnpjCpf     = (_cnpjCpfEl?.value || "").replace(/\D/g, "").trim();
      const _razao       = (_razaoEl?.value || "").trim().toLowerCase();

      // Carrega lista completa (usa cache interno de vvCarregarClientesVisualizar se disponível)
      let _listaClientes = [];
      try {
        if (typeof vvCarregarClientesVisualizar === "function") {
          _listaClientes = await vvCarregarClientesVisualizar();
        } else {
          const _r = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/clientes/visualizar").catch(() => null);
          if (_r && _r.ok) {
            const _j = await _r.json().catch(() => null);
            _listaClientes = Array.isArray(_j) ? _j : (_j?.clientes || _j?.data || []);
          }
        }
      } catch (_eLista) { console.warn("[validação UF] Falha ao carregar lista de clientes:", _eLista?.message); }

      // Encontra o cliente na lista pelo código Omie, CNPJ ou nome
      let _cli = null;
      if (_codigoOmie) {
        _cli = _listaClientes.find(c => String(c.codigo_cliente_omie || "") === _codigoOmie);
      }
      if (!_cli && _cnpjCpf) {
        _cli = _listaClientes.find(c => (c.cnpj_cpf || "").replace(/\D/g, "") === _cnpjCpf);
      }
      if (!_cli && _razao) {
        _cli = _listaClientes.find(c =>
          (c.razao_social || c.nome_fantasia || "").toLowerCase().includes(_razao) ||
          _razao.includes((c.razao_social || c.nome_fantasia || "").toLowerCase())
        );
      }

      if (_cli) {
        const _ufOmie = (_cli.estado || _cli.cEstado || _cli.cUF || _cli.uf || "").trim().toUpperCase();
        if (!_ufOmie || _ufOmie.length !== 2) {
          document.body.removeChild(_ufLoadingOv);
          const _nomeCliente = _cli.razao_social || _cli.nome_fantasia || "o cliente";
          const _ufInformada = await new Promise(resolve => {
            const _ov = document.createElement("div");
            _ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;";
            const _ufsOpts = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map(u => `<option value="${u}">${u}</option>`).join("");
            _ov.innerHTML = `<div style="background:#fff;border-radius:14px;padding:28px 32px;max-width:440px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.22);">
              <h5 style="margin:0 0 10px;color:#b45309;font-size:15px;font-weight:700;">UF não cadastrada na Omie</h5>
              <p style="margin:0 0 4px;font-size:13px;color:#374151;">O cliente <b id="_uf_nome_cli"></b> não possui estado (UF) registrado na Omie.</p>
              <p style="margin:0 0 14px;font-size:13px;color:#374151;">Selecione o estado para salvar e continuar:</p>
              <select id="_uf_omie_inp" style="width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;margin-bottom:8px;box-sizing:border-box;font-family:'Poppins',sans-serif;cursor:pointer;">
                <option value="">Selecione o estado...</option>
                ${_ufsOpts}
              </select>
              <div id="_uf_omie_err" style="font-size:12px;color:#ef4444;min-height:18px;margin-bottom:14px;"></div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="_uf_omie_cancel" style="padding:9px 20px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;cursor:pointer;font-size:13px;font-weight:600;">Cancelar</button>
                <button id="_uf_omie_ok" style="padding:9px 22px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-size:13px;font-weight:700;">Salvar e continuar</button>
              </div>
            </div>`;
            document.body.appendChild(_ov);
            _ov.querySelector("#_uf_nome_cli").textContent = _nomeCliente;
            const _inp = _ov.querySelector("#_uf_omie_inp");
            const _err = _ov.querySelector("#_uf_omie_err");
            _inp.focus();
            _inp.addEventListener("change", () => { _err.textContent = ""; });
            _ov.querySelector("#_uf_omie_ok").onclick = () => {
              const v = _inp.value.trim().toUpperCase();
              if (!v) { _err.textContent = "Selecione um estado."; return; }
              document.body.removeChild(_ov); resolve(v);
            };
            _ov.querySelector("#_uf_omie_cancel").onclick = () => { document.body.removeChild(_ov); resolve(""); };
          });
          if (!_ufInformada) return;
          try {
            mostrarCarregando();
            const _codigoRota = _cli.codigo_cliente_omie || _cli.codigo_cliente_integracao || "";
            if (!_codigoRota) throw new Error("Código do cliente não encontrado para atualizar na Omie.");
            console.log("📤 Alterando cliente UF:", _codigoRota, "->", _ufInformada);
            const _altResp = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/clientes/${_codigoRota}`, {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ estado: _ufInformada })
            });
            const _altData = await _altResp.json().catch(() => null);
            console.log("📥 Resposta alterar cliente:", _altResp.status, _altData);
            ocultarCarregando();
            if (_altResp.ok && (_altData?.sucesso || _altData?.ok || _altData?.codigo_cliente_omie)) {
              console.log("✅ UF salva na Omie:", _ufInformada);

              // Atualiza o cache em memória para não pedir UF novamente nesta sessão
              if (window.__vvClientesVisualizarCache?.lista) {
                const _idxCache = window.__vvClientesVisualizarCache.lista.findIndex(c =>
                  String(c.codigo_cliente_omie) === String(_cli.codigo_cliente_omie)
                );
                if (_idxCache !== -1) {
                  window.__vvClientesVisualizarCache.lista[_idxCache] = {
                    ...window.__vvClientesVisualizarCache.lista[_idxCache],
                    estado: _ufInformada
                  };
                }
              }
              // Também atualiza o objeto _cli localmente (por segurança)
              _cli.estado = _ufInformada;

              // Dispara refresh do cache do servidor em background
              if (typeof dispararAtualizacaoClientes === "function") {
                dispararAtualizacaoClientes();
              }

              const _toast = document.createElement("div");
              _toast.style.cssText = "position:fixed;bottom:24px;right:24px;background:#16a34a;color:#fff;padding:12px 20px;border-radius:10px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.18);z-index:99999;display:flex;align-items:center;gap:8px;";
              _toast.innerHTML = `<span style="font-size:18px;">✅</span> UF <b>${_ufInformada}</b> salva na Omie com sucesso!`;
              document.body.appendChild(_toast);
              setTimeout(() => _toast.remove(), 4000);
            } else {
              const _msg = _altData?.omieRaw?.faultstring || _altData?.message || _altData?.omieErro?.faultstring || _altData?.mensagem || _altData?.erro || `HTTP ${_altResp.status}`;
              mostrarPopupCustomizado("⚠️ Aviso", `Não foi possível salvar a UF na Omie: ${_msg}. O envio continuará mesmo assim.`, "info");
            }
          } catch (_eAlt) {
            ocultarCarregando();
            console.warn("Erro ao salvar UF:", _eAlt.message);
            mostrarPopupCustomizado("⚠️ Aviso", `Erro ao comunicar com a Omie: ${_eAlt.message}. O envio continuará mesmo assim.`, "info");
          }
        } else {
          document.body.removeChild(_ufLoadingOv);
        }
      } else {
        console.warn("Cliente nao encontrado na Omie -- pulando validacao de UF.");
        document.body.removeChild(_ufLoadingOv);
      }
    } catch (_eUF) {
      console.warn("⚠️ Erro inesperado na validação de UF:", _eUF.message);
      document.getElementById("_uf_loading_ov")?.remove();
    }

    if (!_ufProsseguir) return;
  }

  // ── VALIDAÇÃO DO CLIENTE NAS DUAS BASES DA OMIE ───────────
  try {
    const cpfCnpjRaw = (
      document.querySelector("#clientesWrapper .cliente-item .cnpjCliente")?.value ||
      document.querySelector(".cliente-item .cnpjCliente")?.value ||
      document.querySelector(".cliente-item .cpfCnpj")?.value ||
      document.querySelector(".cpfCnpj")?.value ||
      ""
    );
    const cpfCnpj = cpfCnpjRaw.replace(/\D/g, "");
    console.log("[Bases] CNPJ lido:", cpfCnpj || "(vazio)");

    if (cpfCnpj) {
      // Se o CNPJ já foi verificado com sucesso nesta sessão, pula a verificação
      if (window.__vvClienteVerificadoCnpj === cpfCnpj) {
        console.log("[Bases] CNPJ já verificado nesta sessão — pulando verificação.");
      } else {
      const _token = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
      const _authHeaders = _token ? { Authorization: "Bearer " + _token } : {};

      const _buscarBase = async (url) => {
        const _fetch = () => fetch(url, { headers: _authHeaders }).then(r => r.json()).catch(() => null);
        let res = await _fetch();
        if (res === null || !("encontrado" in (res || {}))) {
          await new Promise(r => setTimeout(r, 3000));
          res = await _fetch();
        }
        return res;
      };

      const [resUlhoa, resServico] = await Promise.all([
        _buscarBase(`https://ulhoa-0a02024d350a.herokuapp.com/clientes/buscar?cnpj_cpf=${cpfCnpj}`),
        _buscarBase(`${OMIE_SERVICOS_API_BASE}/clientes/buscar?cnpj_cpf=${cpfCnpj}`)
      ]);

      // Se o servidor não respondeu com "encontrado" (falha de rede), ignora aquela base
      const ulhoaRespondeu   = resUlhoa  != null && "encontrado" in (resUlhoa  || {});
      const servicoRespondeu = resServico != null && "encontrado" in (resServico || {});
      const naUlhoa   = !ulhoaRespondeu   || resUlhoa?.encontrado   === true;
      const naServico = !servicoRespondeu || resServico?.encontrado  === true;

      console.log("[Bases] Ulhoa:", resUlhoa?.clientes?.[0]?.codigo_cliente_omie ?? "não encontrado", "| Serviços:", resServico?.clientes?.[0]?.codigo_cliente_omie ?? "não encontrado");

      if (resServico?.encontrado && resServico?.clientes?.[0]?.codigo_cliente_omie) {
        window.__vvNCodCliServico = Number(resServico.clientes[0].codigo_cliente_omie);
      }

      if (!naUlhoa || !naServico) {
        const faltando = [
          !naUlhoa   && "Base Ulhoa (Produtos)",
          !naServico && "Base Serviços"
        ].filter(Boolean).join(" e ");

        await new Promise(resolve => {
          const bd = document.createElement("div");
          bd.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;";
          bd.innerHTML = `
            <div style="background:#fff;border-radius:12px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);">
              <div style="font-size:16px;font-weight:700;color:#b91c1c;margin-bottom:10px;">Cliente não encontrado na Omie</div>
              <div style="color:#374151;margin-bottom:18px;line-height:1.5;font-size:14px;">
                O cliente com CPF/CNPJ <strong>${cpfCnpjRaw}</strong> não foi encontrado em:<br>
                <strong style="color:#b91c1c;">${faltando}</strong><br><br>
                Cadastre o cliente na Omie antes de enviar o pedido.
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button id="_vv_val_cancelar" style="padding:8px 20px;border:none;border-radius:8px;background:#b91c1c;color:#fff;font-weight:600;cursor:pointer;">Fechar</button>
              </div>
            </div>`;
          document.body.appendChild(bd);
          bd.querySelector("#_vv_val_cancelar").onclick = () => { bd.remove(); resolve(); };
        });
        return;
      } else {
        window.__vvClienteVerificadoCnpj = cpfCnpj; // cache: não re-verificar este CNPJ
        const nomeCliente = resUlhoa?.clientes?.[0]?.razao_social || resServico?.clientes?.[0]?.razao_social || "";
        mostrarPopupCustomizado("Cliente verificado", `${nomeCliente ? `<strong>${nomeCliente}</strong><br>` : ""}Encontrado nas duas bases da Omie.`, "success");
        await new Promise(r => setTimeout(r, 1000));
      }
      } // fim do bloco de verificação
    } else {
      console.warn("[Bases] CNPJ vazio — validação de bases pulada.");
      await new Promise(resolve => {
        const bd = document.createElement("div");
        bd.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;";
        bd.innerHTML = `
          <div style="background:#fff;border-radius:12px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);font-family:'Inter',system-ui,sans-serif;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#b91c1c" opacity="0.15"/><line x1="10" y1="5.5" x2="10" y2="11" stroke="#b91c1c" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14" r="1.1" fill="#b91c1c"/></svg>
              <span style="font-size:15px;font-weight:700;color:#b91c1c;">CPF/CNPJ não cadastrado</span>
            </div>
            <div style="color:#374151;font-size:13.5px;line-height:1.6;margin-bottom:20px;">
              O cliente selecionado não possui <strong>CPF ou CNPJ</strong> registrado.<br>
              Cadastre o documento antes de enviar para a Omie.
            </div>
            <div style="display:flex;justify-content:flex-end;">
              <button id="_vv_sem_cnpj_fechar" style="padding:9px 22px;border:none;border-radius:8px;background:#b91c1c;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Fechar</button>
            </div>
          </div>`;
        document.body.appendChild(bd);
        bd.querySelector("#_vv_sem_cnpj_fechar").onclick = () => { bd.remove(); resolve(); };
      });
      return;
    }
  } catch (_eBases) {
    console.warn("⚠️ [Bases] Erro na validação:", _eBases.message);
  }

  // ── ESCOLHA DO TIPO DE ENVIO ──────────────────────────────
  const tipoEnvio = await abrirPopupEscolhaTipoEnvioOmie();
  if (!tipoEnvio) return; // usuário cancelou

  if (tipoEnvio === 'so_servicos') {
    return fluxoSomenteServicos();
  }

  const botao =
    document.getElementById("btn-gerar-pedido") ||
    document.getElementById("btnEnviarOmie") ||
    document.getElementById("btn-editar");

  const spinner =
    document.getElementById("spinnerOmie") ||
    document.getElementById("loadingSpinner");

  const abrirStatus = (titulo, mensagem, tipo = "info") => {
    mostrarPopupCustomizado(titulo, mensagem, tipo);
  };

  const montarTextoResposta = (dataOrText) => {
    try {
      if (typeof dataOrText === "string") return dataOrText;
      return JSON.stringify(dataOrText, null, 2);
    } catch {
      return String(dataOrText || "");
    }
  };

  const alertServer = (titulo, status, dataOrText) => {
    const corpo = montarTextoResposta(dataOrText);
    mostrarPopupCustomizado(titulo, `HTTP ${status}\n\n${corpo}`, "error");
  };

  const readJsonOrText = async (res) => {
    const raw = await res.text();
    try {
      return { parsed: JSON.parse(raw), raw };
    } catch {
      return { parsed: null, raw };
    }
  };

  // Extrai a melhor mensagem de erro de uma resposta Omie/servidor,
  // incluindo faultstring que a Omie retorna mesmo com HTTP 200.
  const extrairMensagemOmie = (data, httpStatus) => {
    if (!data) return `HTTP ${httpStatus}`;
    const fault = data?.faultstring || data?.omieRaw?.faultstring || data?.omieErro?.faultstring;
    if (fault) return fault;
    const detalhe = data?.detail;
    if (detalhe) return typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe);
    const msg = data?.error || data?.erro || data?.message || data?.mensagem;
    if (msg) return msg;
    const raw = data?.raw;
    if (raw && typeof raw === "string" && !raw.trim().startsWith("<")) return raw.slice(0, 500);
    return `HTTP ${httpStatus}`;
  };

  // Rastreia onde ocorreu a falha para o catch mostrar mensagem precisa
  let _etapaFalhou = null; // "produtos" | "inesperado"

  try {
    if (typeof mostrarCarregando === "function") mostrarCarregando();
    if (spinner) spinner.style.display = "inline-block";
    if (botao) botao.disabled = true;

    const numeroPedidoGarantido = await garantirNumeroPedidoPreenchido();
    const payload = await gerarPayloadOmie();
    if (!payload) {
      document.getElementById("popup-status-omie")?.remove();
      return;
    }

    const somenteServicos = payload.servicosOnly === true;
    let numeroPedido = numeroPedidoGarantido || document.getElementById("numeroPedido")?.value || "";

    // ── Fecha todos os popups abertos ─────────────────────────────────────────
    document.querySelectorAll('#overlayPopup,#popupPendencias,#popup-status-omie,#_vv_send_loading,#_vv_prog_overlay,#_vv_tipo_envio_popup,#sync-popup-overlay').forEach(function(el){ el.remove(); });

    // ── Suprime popups durante o envio (progress popup exibe os erros) ────────
    var _origMostrarPopup = typeof mostrarPopupCustomizado === 'function' ? mostrarPopupCustomizado : null;
    if (_origMostrarPopup) {
      window.mostrarPopupCustomizado = function(titulo, msg, tipo) {
        console.log('[vv:popup suprimido durante envio]', titulo, msg);
      };
    }

    // ── SVGs ──────────────────────────────────────────────────────────────────
    var _SPIN = '<div style="width:18px;height:18px;border:2.5px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:_vv_spin .7s linear infinite;flex-shrink:0;"></div>';
    var _OK   = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="#16a34a"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z"/></svg>';
    var _ERR  = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="#dc2626"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"/></svg>';
    var _NA   = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="#9ca3af"><path fill-rule="evenodd" d="M3 10a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z"/></svg>';
    var _INFO = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1z"/></svg>';

    // ── Cria popup de progresso ───────────────────────────────────────────────
    var _pov = document.createElement('div');
    _pov.id = '_vv_prog_overlay';
    _pov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',Inter,system-ui,sans-serif;";

    function _mkRow(id, label) {
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid #f1f5f9;">' +
        '<span id="_vv_icon_' + id + '" style="flex-shrink:0;margin-top:1px;display:flex;">' + _SPIN + '</span>' +
        '<div style="flex:1;">' +
          '<div style="font-weight:600;font-size:14px;color:#1e293b;">' + label + '</div>' +
          '<div id="_vv_det_' + id + '" style="font-size:13px;color:#6b7280;margin-top:2px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Aguardando...</div>' +
        '</div>' +
      '</div>';
    }

    _pov.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:460px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto;">' +
        '<div style="margin-bottom:18px;">' +
          '<div id="_vv_prog_tit" style="font-size:16px;font-weight:700;color:#374151;">Enviando para Omie...</div>' +
          '<div id="_vv_prog_num" style="font-size:12px;color:#64748b;margin-top:3px;"></div>' +
        '</div>' +
        '<div style="border-top:1px solid #f1f5f9;">' +
          _mkRow('produtos',  'Pedido de produtos') +
          _mkRow('servicos',  'OS de serviços') +
          _mkRow('comissoes', 'Comissões') +
          _mkRow('kommo',     'Kommo financeiro') +
        '</div>' +
        '<button id="_vv_prog_fechar" style="display:none;margin-top:20px;width:100%;padding:11px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">Fechar</button>' +
        '<style>@keyframes _vv_spin{to{transform:rotate(360deg)}}</style>' +
      '</div>';
    document.body.appendChild(_pov);
    _pov.querySelector('#_vv_prog_fechar').onclick = function() { _pov.remove(); };

    // Atualiza uma linha: state = 'loading' | 'ok' | 'erro' | 'na'
    window._vvTogErr = function(btn) {
      var eid = btn.getAttribute('data-eid');
      var d = document.getElementById(eid);
      if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
    };

    function _setStep(id, state, detalhe, erro) {
      var iconEl = document.getElementById('_vv_icon_' + id);
      var detEl  = document.getElementById('_vv_det_'  + id);
      if (!iconEl) return;
      var svgMap = { loading: _SPIN, ok: _OK, erro: _ERR, na: _NA };
      var corMap = { loading: '#6b7280', ok: '#16a34a', erro: '#dc2626', na: '#9ca3af' };
      iconEl.innerHTML = svgMap[state] || '';
      if (detEl) {
        var errPart = '';
        if (state === 'erro' && erro) {
          var eid = '_vv_errd_' + id;
          errPart = ' <button data-eid="' + eid + '" onclick="_vvTogErr(this)" ' +
            'style="background:none;border:1px solid #d1d5db;border-radius:4px;padding:1px 5px;cursor:pointer;color:#64748b;line-height:1;">' + _INFO + '</button>' +
            '<div id="' + eid + '" style="display:none;width:100%;margin-top:6px;font-size:12px;color:#dc2626;background:#fef2f2;border-radius:6px;padding:8px 10px;word-break:break-word;">' + (erro || '') + '</div>';
        }
        detEl.style.color = corMap[state] || '#6b7280';
        detEl.innerHTML = (detalhe || '') + errPart;
      }
    }

    // Finaliza: atualiza título e mostra botão Fechar
    function _progFim() {
      var ids = ['produtos', 'servicos', 'comissoes', 'kommo'];
      var temErro = ids.some(function(id) {
        var el = document.getElementById('_vv_icon_' + id);
        return el && el.innerHTML.indexOf('dc2626') !== -1;
      });
      var temOk = ids.some(function(id) {
        var el = document.getElementById('_vv_icon_' + id);
        return el && el.innerHTML.indexOf('16a34a') !== -1;
      });
      var tit = document.getElementById('_vv_prog_tit');
      var btn = document.getElementById('_vv_prog_fechar');
      if (tit) {
        tit.textContent = !temErro ? 'Envio concluído com sucesso' : temOk ? 'Envio parcialmente concluído' : 'Falha no envio';
        tit.style.color = !temErro ? '#16a34a' : temOk ? '#b45309' : '#dc2626';
      }
      if (btn) {
        btn.style.display = 'block';
        btn.style.background = !temErro ? '#16a34a' : temOk ? '#b45309' : '#dc2626';
      }
    }

    // rastreia qual etapa está ativa para o catch poder marcar erro
    var _etapaAtiva = null;

    // ── 1) ENVIO DE PRODUTOS ──────────────────────────────────────────────────
    if (!somenteServicos) {
      _etapaAtiva = 'produtos';
      _setStep('produtos', 'loading', 'Enviando pedido...');
      console.log("Payload gerado (produtos):", payload);

      const respostaProdutos = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/api/omie/pedidos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken") || ""}`
        },
        body: JSON.stringify(payload)
      });

      const retornoProdutos = await readJsonOrText(respostaProdutos);
      console.log("Resposta /pedidos:", respostaProdutos.status, retornoProdutos.parsed ?? retornoProdutos.raw);

      if (!respostaProdutos.ok) {
        _etapaFalhou = "produtos";
        const msgProdutos = extrairMensagemOmie(retornoProdutos?.parsed, respostaProdutos.status) || "Erro ao incluir pedido na Omie.";
        _setStep('produtos', 'erro', 'Falha no envio', msgProdutos);
        _etapaAtiva = null;
        throw new Error(msgProdutos);
      }

      numeroPedido =
        retornoProdutos?.parsed?.numeroPedido ||
        retornoProdutos?.parsed?.pedido?.numeroPedido ||
        retornoProdutos?.parsed?.nCodPed ||
        numeroPedidoGarantido ||
        document.getElementById("numeroPedido")?.value ||
        "";

      _etapaAtiva = null;
      _setStep('produtos', 'ok', 'Pedido nº ' + numeroPedido);
      var numEl = document.getElementById('_vv_prog_num');
      if (numEl && numeroPedido) numEl.textContent = 'Pedido nº ' + numeroPedido;

    } else {
      _setStep('produtos', 'na', 'Não aplicável');
    }

    // ── 2) OBTÉM TOTAIS / PARCELAS DE SERVIÇO ─────────────────────────────────────
    const totais =
      window.vvUltimosTotaisSelecaoItensOmie ||
      payload?.totais ||
      null;

    const valorServicos = Number(
      totais?.valorServicos ||
      window.vvTotalServicosAplicado ||
      0
    );

    const parcelasServicoCorretas = obterParcelasServicoCorretas(
      totais?.parcelasServico || null
    );

    // ── 3) ENVIO DE SERVIÇOS ────────────────────────────────────────────────────
    let houveTentativaDeServico = false;
    let servicosEnviadosComSucesso = false;
    let erroServicos = null;

    if (valorServicos > 0) {
      houveTentativaDeServico = true;
      _etapaAtiva = 'servicos';
      _setStep('servicos', 'loading', 'Enviando OS...');

      const osResp = await enviarOSServico({
        valorServicos,
        parcelasServico: parcelasServicoCorretas
      });

      console.log("Resposta /os:", osResp);

      _etapaAtiva = null;
      if (osResp?.ok) {
        servicosEnviadosComSucesso = true;
        _setStep('servicos', 'ok', 'Enviada com sucesso');
      } else {
        erroServicos = osResp?.error || osResp?.erro || osResp?.message || "Erro desconhecido ao enviar serviços.";
        _setStep('servicos', 'erro', 'Falha no envio', erroServicos);
      }
    } else {
      _setStep('servicos', 'na', 'Não aplicável');
    }

    // ── 4) COMISSÕES ──────────────────────────────────────────────────────────
    const produtosOk   = !somenteServicos;
    const servicosOk   = servicosEnviadosComSucesso;
    const ambosOk      = produtosOk && (!houveTentativaDeServico || servicosOk);
    const deveEnviarComissoes =
      (somenteServicos && servicosOk) ||
      (!somenteServicos && !houveTentativaDeServico && produtosOk) ||
      (!somenteServicos && houveTentativaDeServico && ambosOk);

    let comissoesOk = null;
    let erroComissoes = null;

    if (deveEnviarComissoes && window.vvComissoesParaEnviar) {
      _etapaAtiva = 'comissoes';
      _setStep('comissoes', 'loading', 'Enviando...');
      _setStep('kommo',     'loading', 'Aguardando...');

      const resComissoes = await tentarEnviarComissoes(window.vvComissoesParaEnviar).catch(function(e) {
        console.warn("[comissoes] erro ao enviar comissões:", e?.message || e);
        return { ok: false, erro: e?.message || "Erro inesperado", kommoOk: null, kommoErro: null };
      });

      comissoesOk = !!resComissoes?.ok;
      if (!comissoesOk) erroComissoes = resComissoes?.erro || "Falha ao lançar comissões";
      _etapaAtiva = null;
      window.__vvUltimoResComissoes = resComissoes;
      window.vvComissoesParaEnviar = null;

      if (comissoesOk) {
        _setStep('comissoes', 'ok', 'Lançadas na Omie');
      } else {
        _setStep('comissoes', 'erro', 'Falha ao lançar', erroComissoes);
      }

      const kommoOkF  = resComissoes?.kommoOk;
      const kommoErrF = resComissoes?.kommoErro;
      if (kommoOkF === true) {
        _setStep('kommo', 'ok', 'Atualizado com sucesso');
      } else if (kommoOkF === false) {
        _setStep('kommo', 'erro', 'Falha na atualização', kommoErrF);
      } else {
        _setStep('kommo', 'na', 'Não aplicável');
      }
    } else {
      _setStep('comissoes', 'na', 'Não aplicável');
      _setStep('kommo',     'na', 'Não aplicável');
    }

    _progFim();
    console.info("[Omie] Envio concluído.");

  } catch (erro) {
    console.error("Erro em atualizarNaOmie:", erro);
    var _povExists = !!document.getElementById('_vv_prog_overlay');
    if (_povExists && typeof _setStep === 'function') {
      // Marca a etapa que estava ativa como erro
      if (_etapaAtiva) {
        _setStep(_etapaAtiva, 'erro', 'Falha', erro?.message || 'Erro inesperado');
      }
      // Marca as etapas que ainda não rodaram como N/A
      var _todasEtapas = ['produtos', 'servicos', 'comissoes', 'kommo'];
      var _idx = _etapaAtiva ? _todasEtapas.indexOf(_etapaAtiva) + 1 : 0;
      for (var _i = _idx; _i < _todasEtapas.length; _i++) {
        _setStep(_todasEtapas[_i], 'na', 'Não executado');
      }
      if (typeof _progFim === 'function') _progFim();
    } else if (!_povExists) {
      alert("Erro inesperado no envio: " + (erro?.message || "Verifique o console para detalhes."));
    }
  } finally {
    if (typeof _origMostrarPopup === 'function') window.mostrarPopupCustomizado = _origMostrarPopup;
    if (spinner) spinner.style.display = "none";
    if (botao) botao.disabled = false;
    if (typeof ocultarCarregando === "function") ocultarCarregando();
  }
}

window.atualizarNaOmie = atualizarNaOmie;

const API_BASE_PRODUTOS = 'https://ulhoa-vidros-1ae0adcf5f73.herokuapp.com';
// TROQUE isso pela URL real quando publicar o server.

// =============================
// 🔹 Função GLOBAL: primeiro insumo da tabela do grupo
// =============================
// =============================
// 🔹 GLOBAL: primeiro insumo do grupo (continua igual)
// =============================
// =============================
// 🔹 Função GLOBAL: primeiro insumo do grupo
// =============================
// =============================
// 🔹 Lista COMPLETA de insumos do grupo (linhas da tabela)
//     Pega coluna "Quantidade" e "Valor de Custo Final"
// =============================
// =============================
// 🔹 Pega o nome do grupo no accordion
//     <span id="titulo-accordion-bloco-0">Vidro</span>
// =============================
window.getNomeGrupo = function (grupoId) {
  if (!grupoId) return '';

  const span = document.querySelector(`#titulo-accordion-${grupoId}`);
  if (!span) {
    console.warn(
      `⚠️ Não encontrei #titulo-accordion-${grupoId} para pegar o nome do grupo.`
    );
    return '';
  }

  const nome = (span.textContent || '').trim();
  console.log(`🏷️ Nome do grupo (${grupoId}):`, nome);
  return nome;
};

// =============================
// 🔹 Lista COMPLETA de insumos do grupo (linhas da tabela)
//     Pega coluna "Quantidade" (6ª) e "Valor de Custo Final" (3ª)
// =============================
window.getListaInsumosGrupo = function (grupoId) {
  if (!grupoId) return [];

  const tabela = document.querySelector(`#tabela-${grupoId}`);
  if (!tabela) return [];

  const theadRow = tabela.querySelector('thead tr');
  const tbody    = tabela.querySelector('tbody');
  if (!theadRow || !tbody) return [];

  const ths = Array.from(theadRow.querySelectorAll('th'));

  let idxCodigo          = -1;
  let idxDescricao       = -1;
  let idxUnidade         = -1;
  let idxQuantidade      = -1;
  let idxValorCustoFinal = -1;

  // tenta detectar pelos textos (caso mude a ordem no futuro)
  ths.forEach((th, i) => {
    const txt = (th.textContent || '').trim().toLowerCase();

    if (txt.includes('código') || txt.includes('codigo'))   idxCodigo    = i;
    if (txt.includes('descrição') || txt.includes('descricao')) idxDescricao = i;
    if (txt.includes('unidade') || txt.includes('un.'))     idxUnidade   = i;
    if (txt.includes('quantidade'))                         idxQuantidade = i;
    if (txt.includes('valor de custo final'))               idxValorCustoFinal = i;
  });

  // ðŸ'‡ Força os índices conforme você informou:
  // 3ª coluna = valor, 6ª coluna = quantidade
  if (ths.length >= 3) idxValorCustoFinal = 2;  // índice 2 = 3ª coluna
  if (ths.length >= 6) idxQuantidade      = 5;  // índice 5 = 6ª coluna

  if (idxQuantidade === -1) {
    console.warn(
      `⚠️ Não encontrei coluna "Quantidade" em #tabela-${grupoId}. Confere o texto do cabeçalho/ordem.`
    );
  }

  if (idxValorCustoFinal === -1) {
    console.warn(
      `⚠️ Não encontrei coluna "Valor de Custo Final" em #tabela-${grupoId}. Confere o texto do cabeçalho/ordem.`
    );
  }

  // helper para pegar valor atual da célula (input > span > texto)
  function extrairTextoCelula(td) {
    if (!td) return '';
    const input = td.querySelector('input');
    if (input) return input.value || '';
    const span = td.querySelector('span');
    if (span) return (span.textContent || '').trim();
    return (td.textContent || '').trim();
  }

  const linhas = Array.from(tbody.querySelectorAll('tr'));
  const insumos = [];

  linhas.forEach((tr, index) => {
    const tds = tr.querySelectorAll('td');

    insumos.push({
      ordem: index + 1,
      codigo:           idxCodigo          >= 0 ? extrairTextoCelula(tds[idxCodigo])          : '',
      descricao:        idxDescricao       >= 0 ? extrairTextoCelula(tds[idxDescricao])       : '',
      unidade:          idxUnidade         >= 0 ? extrairTextoCelula(tds[idxUnidade])         : '',
      quantidade:       idxQuantidade      >= 0 ? extrairTextoCelula(tds[idxQuantidade])      : '',
      valorCustoFinal:  idxValorCustoFinal >= 0 ? extrairTextoCelula(tds[idxValorCustoFinal]) : '',
    });
  });

  console.log(`🧾 Insumos lidos da tabela do grupo ${grupoId}:`, insumos);
  return insumos;
};

// =============================
// 🔹 Helper: converter número BR
//     "R$ 1.234,56"  → 1234.56
//     "159.698,78"   → 159698.78
//     "159698.78"    → 159698.78
// =============================
function parseNumeroBR(valor) {
  if (valor == null) return 0;
  if (typeof valor === 'number') return valor;

  let str = String(valor).trim();
  if (!str) return 0;

  // remove tudo que não é dígito, vírgula, ponto ou sinal
  str = str.replace(/[^\d.,-]/g, '');

  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot   = str.includes('.');

  if (hasComma && hasDot) {
    // formato "1.234,56" → tira pontos de milhar e troca vírgula por ponto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // formato "1234,56" → vírgula como decimal
    str = str.replace(',', '.');
  } else {
    // apenas ponto ou só números → deixa como está
  }

  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

// =============================
// 🔹 Função GLOBAL: valores vindos do popup do grupo
//    (Total produtos após ajuste / Total (Produto) / Total (Serviço))
// =============================
window.getValoresPopupGrupo = function (grupoId, valorGrupoFallback = 0) {
  const popupData =
    (window.groupPopupsData && window.groupPopupsData[grupoId]) || {};

  // ðŸŸ¦ Total produtos após ajuste  → valorTotalPedido
  const rawTotalProdutosAjuste =
    popupData.totalProdutosAposAjuste ??
    popupData.totalProdutosAjustado ??
    popupData.totalProdutosAjuste ??
    popupData.totalPedidoComDesconto ??
    null;

  // ðŸŸTotal (Produto)
  const rawProdutos =
    popupData.totalProdutos ??
    popupData.totalProduto ??
    popupData.valorTotalNFProdutos ??
    0;

  // ðŸŸTotal (Serviço)
  const rawServicos =
    popupData.totalServicos ??
    popupData.totalServico ??
    popupData.valorTotalNFServicos ??
    0;

  const totalPedidoCalc =
    rawTotalProdutosAjuste != null
      ? Number(rawTotalProdutosAjuste)
      : Number(rawProdutos || 0) + Number(rawServicos || 0);

  return {
    valorTotalPedido:
      Number.isFinite(totalPedidoCalc) && totalPedidoCalc > 0
        ? totalPedidoCalc
        : Number(valorGrupoFallback) || 0,

    valorTotalNFProdutos: Number(rawProdutos) || 0,
    valorTotalNFServicos: Number(rawServicos) || 0,
  };
};

// =============================
// 🔹 Função principal: cada INSUMO vira um PRODUTO enviado
// =============================
window.produtosFaturadosParaOCliente = async function (ignorados) {
  try {
    if (!Array.isArray(ignorados) || !ignorados.length) return null;

    const clienteNome     = vv_getClienteNome?.() || '';
    const numeroOrcamento = vv_getNumeroOrcamento?.() || '';
    const previsaoISO     = vv_getPrimeiraDataParcelaISO?.() || null;

    const totaisSelecao = window.vvUltimosTotaisSelecaoItensOmie || null;

    const valorTotalPedidoAjustado =
      (typeof window.vvUltimoTotalFinalProdutosOmie === 'number'
        ? window.vvUltimoTotalFinalProdutosOmie
        : totaisSelecao?.totalFinalProdutos) || 0;

    console.log('💰 Valor total do pedido ajustado (usado nos docs):', valorTotalPedidoAjustado);
    console.log(
      '📊 Totais completos da seleção Omie disponíveis em window.vvUltimosTotaisSelecaoItensOmie:',
      totaisSelecao
    );

    const docs = [];

    // 📁 Para cada GRUPO ignorado…
    ignorados.forEach((item) => {
      const valorGrupo = Number(item.valorTotalGrupo) || 0;

      // 🏷️ Nome do grupo (produto acabado)
      const nomeGrupo =
        (typeof window.getNomeGrupo === 'function'
          ? window.getNomeGrupo(item.grupoId)
          : '') || '';

      const nomePrimeiroInsumo =
        (typeof window.getPrimeiroInsumoDescricao === 'function'
          ? window.getPrimeiroInsumoDescricao(item.grupoId)
          : '') ||
        item.descricao ||
        '';

      const insumosGrupo =
        typeof window.getListaInsumosGrupo === 'function'
          ? window.getListaInsumosGrupo(item.grupoId)
          : [];

      let valorNFProdutosGrupo = 0;
      let valorNFServicosGrupo = 0;

      if (typeof window.getValoresPopupGrupo === 'function') {
        const r = window.getValoresPopupGrupo(item.grupoId, valorGrupo) || {};
        valorNFProdutosGrupo = Number(r.valorTotalNFProdutos) || 0;
        valorNFServicosGrupo = Number(r.valorTotalNFServicos) || 0;
      }

      const valorTotalNFProdutos =
        totaisSelecao?.porCategoria?.produto ?? valorNFProdutosGrupo;

      const valorTotalNFServicos =
        totaisSelecao?.porCategoria?.servico ?? valorNFServicosGrupo;

      // 🔸 Caso não haja linhas de insumo na tabela, cria doc único do grupo
      if (!insumosGrupo.length) {
        console.warn(
          `⚠️ Grupo ${item.grupoId} não tem linhas de insumos na tabela. Criando doc único do grupo.`
        );

        const docGrupoFallback = {
          numeroPedido: String(numeroOrcamento || ''),
          cliente: clienteNome || '',
          fornecedor: '',
          vidro: nomePrimeiroInsumo || nomeGrupo,
          tipo: '',
          quantidade: 1,

          grupoNome: nomeGrupo,
          grupoTipo: 'PRODUTO_ACABADO',
          produtoAcabadoCodigo: item.codigo || '',
          produtoAcabadoDescricao: nomeGrupo || nomePrimeiroInsumo,
          produtoAcabadoGrupoId: item.grupoId || '',
          produtoAcabadoAmbiente: item.ambiente || '',

          orcamentoEnviado: '',
          aprovacao: '',
          moldeEnviado: '',
          recebemosLinkPagamento: '',
          pagamento: 'Pendente',

          previsao: previsaoISO ? new Date(previsaoISO) : null,
          numeroPedidoFornecedor: '',
          vidrosProntos: null,
          naEmpresa: null,

          faturamento: 'Pendente',
          responsavelVendedor: '',
          numeroOrcFornecedor: '',

          valorTotalPedido: valorTotalPedidoAjustado,
          valorTotalFaturamentoDiretoOrcado: valorGrupo,
          valorAproximadoUF: 0,

          valorTotalNFProdutos,
          valorTotalNFServicos,

          valorReal: valorGrupo,
          residuoDiferencaFaturamentoServico: 0,

          numeroNotaFiscal: '',
          formaPagamento: '',

          observacao: `Ignorado no envio à Omie | Ambiente: ${item.ambiente || '-'} | Grupo: ${
            item.grupoId || '-'
          } | Código: ${item.codigo || '-'}`,

          meta: {
            origem: 'produtosFaturadosParaOCliente',
            numeroOrcamento: numeroOrcamento || null,
            chavePopup: item.key || null,
            totaisSelecaoOmie: totaisSelecao
              ? {
                  totalAprovadoBaseComMO: totaisSelecao.totalAprovadoBaseComMO ?? 0,
                  valorServicos:         totaisSelecao.valorServicos         ?? 0,
                  valorDesconto:         totaisSelecao.valorDesconto         ?? 0,
                  valorComissaoInfo:     totaisSelecao.valorComissaoInfo     ?? 0,
                  totalFinalProdutos:    totaisSelecao.totalFinalProdutos    ?? 0,
                  porCategoria: {
                    produto: totaisSelecao.porCategoria?.produto ?? 0,
                    servico: totaisSelecao.porCategoria?.servico ?? 0,
                    vidro:   totaisSelecao.porCategoria?.vidro   ?? 0,
                  },
                }
              : null,
            infoGrupo: {
              grupoId: item.grupoId || null,
              ambiente: item.ambiente || null,
              codigoGrupo: item.codigo || null,
              nomeGrupo,
            },
          },
        };

        console.log('📦 Documento (FALLBACK GRUPO) pronto para envio:', docGrupoFallback);
        docs.push(docGrupoFallback);
        return;
      }

      // 📁 Para cada INSUMO da tabela, criamos um "produto" individual
      insumosGrupo.forEach((insumo) => {
        const valorTotalInsumo = parseNumeroBR(insumo.valorCustoFinal);
        const quantidadeInsumo = parseNumeroBR(insumo.quantidade) || 1;

        const valorUnitarioInsumo =
          valorTotalInsumo && quantidadeInsumo
            ? valorTotalInsumo / quantidadeInsumo
            : valorTotalInsumo;

        const doc = {
          numeroPedido: String(numeroOrcamento || ''),
          cliente: clienteNome || '',
          fornecedor: '',
          vidro: insumo.descricao || nomePrimeiroInsumo || nomeGrupo,
          tipo: '',
          quantidade: quantidadeInsumo,

          grupoNome: nomeGrupo,
          grupoTipo: 'PRODUTO_ACABADO',
          produtoAcabadoCodigo: item.codigo || '',
          produtoAcabadoDescricao: nomeGrupo || nomePrimeiroInsumo,
          produtoAcabadoGrupoId: item.grupoId || '',
          produtoAcabadoAmbiente: item.ambiente || '',

          orcamentoEnviado: '',
          aprovacao: '',
          moldeEnviado: '',
          recebemosLinkPagamento: '',
          pagamento: 'Pendente',

          previsao: previsaoISO ? new Date(previsaoISO) : null,
          numeroPedidoFornecedor: '',
          vidrosProntos: null,
          naEmpresa: null,

          faturamento: 'Pendente',
          responsavelVendedor: '',
          numeroOrcFornecedor: '',

          valorTotalPedido: valorTotalPedidoAjustado,
          valorTotalFaturamentoDiretoOrcado: valorTotalInsumo || valorGrupo,
          valorAproximadoUF: 0,

          valorTotalNFProdutos,
          valorTotalNFServicos,

          valorReal: valorTotalInsumo || valorGrupo,
          residuoDiferencaFaturamentoServico: 0,

          numeroNotaFiscal: '',
          formaPagamento: '',

          observacao:
            `Ignorado no envio à Omie | Ambiente: ${item.ambiente || '-'} | Grupo: ${
              item.grupoId || '-'
            } | Código grupo: ${item.codigo || '-'} | ` +
            `Insumo: ${insumo.descricao || '-'} (linha ${insumo.ordem})`,

          meta: {
            origem: 'produtosFaturadosParaOCliente',
            numeroOrcamento: numeroOrcamento || null,
            chavePopup: item.key || null,

            totaisSelecaoOmie: totaisSelecao
              ? {
                  totalAprovadoBaseComMO: totaisSelecao.totalAprovadoBaseComMO ?? 0,
                  valorServicos:         totaisSelecao.valorServicos         ?? 0,
                  valorDesconto:         totaisSelecao.valorDesconto         ?? 0,
                  valorComissaoInfo:     totaisSelecao.valorComissaoInfo     ?? 0,
                  totalFinalProdutos:    totaisSelecao.totalFinalProdutos    ?? 0,
                  porCategoria: {
                    produto: totaisSelecao.porCategoria?.produto ?? 0,
                    servico: totaisSelecao.porCategoria?.servico ?? 0,
                    vidro:   totaisSelecao.porCategoria?.vidro   ?? 0,
                  },
                }
              : null,

            insumo: {
              ordem: insumo.ordem,
              codigo: insumo.codigo,
              descricao: insumo.descricao,
              unidade: insumo.unidade,
              quantidadeTexto: insumo.quantidade,
              valorCustoFinalTexto: insumo.valorCustoFinal,
              quantidadeNumero: quantidadeInsumo,
              valorUnitarioNumero: valorUnitarioInsumo,
              valorTotalNumero: valorTotalInsumo,
            },

            infoGrupo: {
              grupoId: item.grupoId || null,
              ambiente: item.ambiente || null,
              codigoGrupo: item.codigo || null,
              valorTotalGrupo: valorGrupo,
              nomeGrupo,
            },
          },
        };

        console.log('📦 Documento (INSUMO → produto) pronto para envio:', doc);
        docs.push(doc);
      });
    });

    console.log('📦 docs prontos para envio a /api/produtos:', {
      totalDocs: docs.length,
      docs,
    });

    let inseridos = 0;
    const resultados = [];

    for (const doc of docs) {
      console.log('ðŸšš Enviando insumo como produto para /api/produtos:', doc);

      const res = await fetch(`${API_BASE_PRODUTOS}/api/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });

      const j = await res.json();
      console.log('📥 Resposta do POST /api/produtos:', j);

      if (!j.ok) {
        throw new Error(j.error || 'Falha ao salvar itens ignorados (insumos)');
      }

      inseridos++;
      resultados.push(j.data);
    }

    console.log(
      `✅ ${inseridos} produto(s)/insumo(s) criado(s) na "Aba de produtos faturados direto".`
    );
    alert(
      `✅ ${inseridos} produto(s)/insumo(s) foram criados na aba de Produtos Faturados Direto.\n` +
        `Eles não foram enviados para a Omie.`
    );

    if (typeof carregarProdutos === 'function') {
      carregarProdutos();
    }

    return resultados;
  } catch (err) {
    console.error('❌ produtosFaturadosParaOCliente() erro:', err);
    alert('Erro ao salvar itens ignorados: ' + err.message);
    return null;
  }
};


function obterParcelasServicoCorretas(parcelasServico = null) {
  console.group("🔎 [obterParcelasServicoCorretas] entrada");
  console.log("parcelasServico parâmetro:", JSON.parse(JSON.stringify(parcelasServico || null)));
  console.log("window.vvUltimosTotaisSelecaoItensOmie?.parcelasServico:", JSON.parse(JSON.stringify(window.vvUltimosTotaisSelecaoItensOmie?.parcelasServico || null)));
  console.log("window.vvParcelasServicoOmie:", JSON.parse(JSON.stringify(window.vvParcelasServicoOmie || null)));
  console.log("window.propostaEmEdicao?.camposFormulario?.parcelasServico:", JSON.parse(JSON.stringify(window.propostaEmEdicao?.camposFormulario?.parcelasServico || null)));
  console.log("window.propostaAtual?.camposFormulario?.parcelasServico:", JSON.parse(JSON.stringify(window.propostaAtual?.camposFormulario?.parcelasServico || null)));
  console.groupEnd();

  let parcelas = [];

  if (Array.isArray(parcelasServico) && parcelasServico.length > 0) {
    parcelas = parcelasServico;
    console.log("✅ Fonte usada: parâmetro parcelasServico");
  } else if (
    Array.isArray(window.vvUltimosTotaisSelecaoItensOmie?.parcelasServico) &&
    window.vvUltimosTotaisSelecaoItensOmie.parcelasServico.length > 0
  ) {
    parcelas = window.vvUltimosTotaisSelecaoItensOmie.parcelasServico;
    console.log("✅ Fonte usada: window.vvUltimosTotaisSelecaoItensOmie.parcelasServico");
  } else if (
    Array.isArray(window.vvParcelasServicoOmie) &&
    window.vvParcelasServicoOmie.length > 0
  ) {
    parcelas = window.vvParcelasServicoOmie;
    console.log("✅ Fonte usada: window.vvParcelasServicoOmie");
  } else if (
    Array.isArray(window.propostaEmEdicao?.camposFormulario?.parcelasServico) &&
    window.propostaEmEdicao.camposFormulario.parcelasServico.length > 0
  ) {
    parcelas = window.propostaEmEdicao.camposFormulario.parcelasServico;
    console.log("✅ Fonte usada: window.propostaEmEdicao.camposFormulario.parcelasServico");
  } else if (
    Array.isArray(window.propostaAtual?.camposFormulario?.parcelasServico) &&
    window.propostaAtual.camposFormulario.parcelasServico.length > 0
  ) {
    parcelas = window.propostaAtual.camposFormulario.parcelasServico;
    console.log("✅ Fonte usada: window.propostaAtual.camposFormulario.parcelasServico");
  } else {
    console.warn("⚠️ Nenhuma fonte de parcelas de serviço encontrada.");
  }

  const parcelasNormalizadas = parcelas.map((p) => {
    const dataServico = p?.vencimento || p?.data || p?.previsao || "";
    return {
      ...p,
      // Para OS, a data que o usuario define na parcela e o vencimento.
      // Evita usar uma previsao antiga que pode ter sido gerada um mes a frente.
      previsao: dataServico,
      vencimento: dataServico
    };
  });

  console.group("📦 [obterParcelasServicoCorretas] saída normalizada");
  console.log("parcelas originais:", JSON.parse(JSON.stringify(parcelas || [])));
  console.log("parcelas normalizadas:", JSON.parse(JSON.stringify(parcelasNormalizadas || [])));
  console.table(
    parcelasNormalizadas.map((p, i) => ({
      index: i,
      tipo_monetario: p?.tipo_monetario || "",
      condicao_pagto: p?.condicao_pagto || "",
      valor: p?.valor || 0,
      previsao: p?.previsao || "",
      vencimento: p?.vencimento || ""
    }))
  );
  console.groupEnd();

  return parcelasNormalizadas;
}


/* ================== CONFIG ================== */
const OS_SERVICOS_ENDPOINT = window.OS_SERVICOS_ENDPOINT
  || "https://ulhoa-servico-ec4e1aa95355.herokuapp.com/os";

/* Defaults (podem ser ajustados) */
const CCOD_LC116_DEFAULT = "7.01";
const CCOD_MUN_DEFAULT   = "0701-0/01-88";
const CCODPARC_DEFAULT   = "999";
const CETAPA_DEFAULT     = "20";
const CCODCATEG_DEFAULT  = "1.01.99";
const NCODCC_DEFAULT     = 10937506623;

/* Código e nome do vendedor de serviços selecionado */
let NCODVEND_SERVICO_DEFAULT = "";
let NOME_VENDEDOR_SERVICO_DEFAULT = "";

/* =========================================================
   Base de vendedores de serviços
   ========================================================= */
const VENDEDORES_SERVICOS_FERREIRA_ULHOA = {
  pagina: 1,
  total_de_paginas: 1,
  registros: 32,
  total_de_registros: 32,
  cadastro: [
    { codInt: "", codigo: 10922409030, comissao: 0, email: "", fatura_pedido: "N", inativo: "S", nome: "Paulo Sergio Machado da Silva", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409032, comissao: 0, email: "", fatura_pedido: "N", inativo: "S", nome: "DOUGLAS VITOR DA SILVA", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409035, comissao: 0, email: "", fatura_pedido: "N", inativo: "S", nome: "GABRIEL JUNIOR DO COUTO NEPOMUCENO", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409037, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "MAURO FERREIRA", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409049, comissao: 0, email: "felipe.ulhoa@ferreiraulhoa.com.br", fatura_pedido: "N", inativo: "N", nome: "FELIPE ULHOA FERREIRA", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409051, comissao: 1, email: "joaomartins@ferreiraulhoa.com.br", fatura_pedido: "N", inativo: "N", nome: "JOAO CLEBER MARTINS", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409053, comissao: 0, email: "marilena.ulhoa@ferreiraulhoa.com.br", fatura_pedido: "N", inativo: "N", nome: "MARILENA DE ALMEIDA ULHOA", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409055, comissao: 0, email: "projetos@ferreiraulhoa.com.br", fatura_pedido: "N", inativo: "N", nome: "ANA FLAVIA RODRIGUES PRATES", visualiza_pedido: "N" },
    { codInt: "", codigo: 10922409059, comissao: 1, email: "rafael.angelo@ferreiraulhoa.com.br", fatura_pedido: "N", inativo: "N", nome: "RAFAEL ANGELO ARAUJO DA SILVA", visualiza_pedido: "N" },
    { codInt: "", codigo: 10985073333, comissao: 0, email: "lais.rabelo@ferreiraulhoa.com.br", fatura_pedido: "N", inativo: "S", nome: "LAIS MAGALHÃES RABELO", visualiza_pedido: "N" },
    { codInt: "", codigo: 11059840338, comissao: 0, email: "servidor@ferreiraulhoa.com.br", fatura_pedido: "S", inativo: "S", nome: "VANESSA ULHOA", visualiza_pedido: "N" },
    { codInt: "Enviado via API", codigo: 11060014882, comissao: 0, email: "", fatura_pedido: "N", inativo: "S", nome: "Enviado via API", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158319843, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "MAURO FERREIRA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376229, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "DAVIDSON JUNIO PEREIRA MACIEL", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376259, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "FERNANDO PEREIRA DE SOUZA JUNIOR", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376263, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "LEONARDO SOUSA OLIVEIRA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376268, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "MATHEUS HENRIQUE SOUZA BRAGA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376278, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "EDNALDO GOMES FILHO", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376285, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "DIONATA ALAN SILVA COSTA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376293, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "JOSE CARLOS SOARES DA CRUZ", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376335, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "JOSE GILMAR PINHEIRO", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376357, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "ERIVALDO AMARO DE ALMEIDA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376364, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "LUIZ FERNANDO LIMA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376367, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "OSVALDO PAURA OLIVEIRA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376374, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "JOSE CARLOS SOARES DA CRUZ", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376382, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "RENE GOMES DE OLIVEIRA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376392, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "ROBERTO MARTINS DO NASCIMENTO", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376703, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "RONAN GOMES DE SOUZA LIMA", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376707, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "SERGIO RICARDO PIO", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376710, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "RODRIGO NOBRE DOS SANTOS", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376713, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "RODRIGO BRITO CARDOSO", visualiza_pedido: "N" },
    { codInt: "", codigo: 11158376723, comissao: 0, email: "", fatura_pedido: "N", inativo: "N", nome: "SEBASTIAO DOS REIS DE MATOS", visualiza_pedido: "N" }
  ]
};

/* =========================================================
   Normalização para comparar nomes
   ========================================================= */
function normalizarTextoServico(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function definirCodigoVendedorServicoSelecionado() {
  // ── base completa de vendedores de serviço (interna) ──────
  const cadastroVendedoresServico = [
    { codigo: 10922409030, inativo: "S", nome: "Paulo Sergio Machado da Silva" },
    { codigo: 10922409032, inativo: "S", nome: "DOUGLAS VITOR DA SILVA" },
    { codigo: 10922409035, inativo: "S", nome: "GABRIEL JUNIOR DO COUTO NEPOMUCENO" },
    { codigo: 10922409037, inativo: "N", nome: "MAURO FERREIRA" },
    { codigo: 10922409049, inativo: "N", nome: "FELIPE ULHOA FERREIRA" },
    { codigo: 10922409051, inativo: "N", nome: "JOAO CLEBER MARTINS" },
    { codigo: 10922409053, inativo: "N", nome: "MARILENA DE ALMEIDA ULHOA" },
    { codigo: 10922409055, inativo: "N", nome: "ANA FLAVIA RODRIGUES PRATES" },
    { codigo: 10922409059, inativo: "N", nome: "RAFAEL ANGELO ARAUJO DA SILVA" },
    { codigo: 10985073333, inativo: "S", nome: "LAIS MAGALHÃES RABELO" },
    { codigo: 11059840338, inativo: "S", nome: "VANESSA ULHOA" },
    { codigo: 11060014882, inativo: "S", nome: "Enviado via API" },
    { codigo: 11158319843, inativo: "N", nome: "MAURO FERREIRA" },
    { codigo: 11158376229, inativo: "N", nome: "DAVIDSON JUNIO PEREIRA MACIEL" },
    { codigo: 11158376259, inativo: "N", nome: "FERNANDO PEREIRA DE SOUZA JUNIOR" },
    { codigo: 11158376263, inativo: "N", nome: "LEONARDO SOUSA OLIVEIRA" },
    { codigo: 11158376268, inativo: "N", nome: "MATHEUS HENRIQUE SOUZA BRAGA" },
    { codigo: 11158376278, inativo: "N", nome: "EDNALDO GOMES FILHO" },
    { codigo: 11158376285, inativo: "N", nome: "DIONATA ALAN SILVA COSTA" },
    { codigo: 11158376293, inativo: "N", nome: "JOSE CARLOS SOARES DA CRUZ" },
    { codigo: 11158376335, inativo: "N", nome: "JOSE GILMAR PINHEIRO" },
    { codigo: 11158376357, inativo: "N", nome: "ERIVALDO AMARO DE ALMEIDA" },
    { codigo: 11158376364, inativo: "N", nome: "LUIZ FERNANDO LIMA" },
    { codigo: 11158376367, inativo: "N", nome: "OSVALDO PAURA OLIVEIRA" },
    { codigo: 11158376374, inativo: "N", nome: "JOSE CARLOS SOARES DA CRUZ" },
    { codigo: 11158376382, inativo: "N", nome: "RENE GOMES DE OLIVEIRA" },
    { codigo: 11158376392, inativo: "N", nome: "ROBERTO MARTINS DO NASCIMENTO" },
    { codigo: 11158376703, inativo: "N", nome: "RONAN GOMES DE SOUZA LIMA" },
    { codigo: 11158376707, inativo: "N", nome: "SERGIO RICARDO PIO" },
    { codigo: 11158376710, inativo: "N", nome: "RODRIGO NOBRE DOS SANTOS" },
    { codigo: 11158376713, inativo: "N", nome: "RODRIGO BRITO CARDOSO" },
    { codigo: 11158376723, inativo: "N", nome: "SEBASTIAO DOS REIS DE MATOS" }
  ];

  // ── aliases: nome do select → nome na base ────────────────
  const aliases = {
    "MAURO LUCIO":          "MAURO FERREIRA",
    "LAIS MAGALHAES RABELO": "LAIS MAGALHÃES RABELO"
  };

  // ── normaliza texto para comparação ──────────────────────
  function norm(s) {
    return String(s || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // ── lê nome selecionado no select ────────────────────────
  const selectVendedor = document.getElementById("vendedorResponsavel");

  if (!selectVendedor) {
    console.warn("⚠️ [vendedor serviço] #vendedorResponsavel não encontrado.");
    NCODVEND_SERVICO_DEFAULT = "";
    NOME_VENDEDOR_SERVICO_DEFAULT = "";
    return;
  }

  const nomeSelecionado = (
    selectVendedor.options[selectVendedor.selectedIndex]?.text?.trim() ||
    selectVendedor.value?.trim() ||
    selectVendedor.getAttribute("data-valor-original")?.trim() ||
    ""
  );

  NOME_VENDEDOR_SERVICO_DEFAULT = nomeSelecionado;

  if (!nomeSelecionado) {
    console.warn("⚠️ [vendedor serviço] Nenhum vendedor selecionado.");
    NCODVEND_SERVICO_DEFAULT = "";
    return;
  }

  // ── resolve alias se necessário ──────────────────────────
  const nomeNorm      = norm(nomeSelecionado);
  const nomeResolvido = aliases[nomeNorm] || nomeSelecionado;

  // ── busca na base interna ────────────────────────────────
  const encontrados = cadastroVendedoresServico.filter(
    v => norm(v.nome) === norm(nomeResolvido)
  );

  if (!encontrados.length) {
    console.warn("⚠️ [vendedor serviço] Não encontrado na base:", {
      nomeSelecionado,
      nomeResolvido
    });
    NCODVEND_SERVICO_DEFAULT = "";
    return;
  }

  // prefere ativo (inativo === "N"); se todos inativos, usa o primeiro
  const vendedor =
    encontrados.find(v => String(v.inativo).toUpperCase() === "N") ||
    encontrados[0];

  NCODVEND_SERVICO_DEFAULT = Number(vendedor.codigo) || 0;

  console.log("✅ [vendedor serviço] Resolvido:", {
    nomeSelecionado,
    nomeResolvido,
    codigo: NCODVEND_SERVICO_DEFAULT,
    inativo: vendedor.inativo
  });
}

/* =========================================================
   Atualiza ao carregar e ao trocar o vendedor
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  definirCodigoVendedorServicoSelecionado();

  const selectVendedor = document.getElementById("vendedorResponsavel");
  if (selectVendedor) {
    selectVendedor.addEventListener("change", definirCodigoVendedorServicoSelecionado);
  }
});
/* ================== UTILS ================== */
function toBR(valor) {
  if (!valor) return "";

  const v = String(valor).trim();

  // já está em BR
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    return v;
  }

  // ISO puro: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }

  // datetime ISO: YYYY-MM-DDTHH:mm:ss...
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  // fallback — usa UTC para evitar deslocamento de fuso horário
  const d = new Date(v);
  if (isNaN(d)) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function toISO(valor) {
  if (!valor) return "";

  const v = String(valor).trim();

  // já está em ISO puro
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v;
  }

  // BR -> ISO
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split("/");
    return `${y}-${m}-${d}`;
  }

  // datetime ISO: YYYY-MM-DDTHH:mm:ss...
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m}-${d}`;
  }

  // fallback — usa UTC para evitar deslocamento de fuso horário
  const d = new Date(v);
  if (isNaN(d)) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function vv_fmtBRL(n){
  return (Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

/* ====== AJUSTE: BUSCA DE CÓDIGO DO CLIENTE PELO NOVO RETORNO DA API ====== */
/*
  Esperado da API /clientes:
  {
    "total": 3478,
    "ultimaAtualizacao": "2025-12-10T12:39:38.194Z",
    "clientes": [
      {
        "nome_fantasia": "PKO DO BRASIL IMP. E EXP. LTDA",
        "codigo_cliente_omie": 10922418046
      },
      ...
    ]
  }

  Em algum lugar do código você deve fazer algo como:
    const resp = await fetch("https://ulhoa-servico-ec4e1aa95355.herokuapp.com/clientes");
    const data = await resp.json();
    window.listaClientesServico = data.clientes || [];
*/

function normalizarTexto(str) {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

window.listaClientesServico = window.listaClientesServico || [];

function vvExtrairListaClientesServico(payload) {
  if (Array.isArray(payload?.clientes)) return payload.clientes;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function vvCarregarClientesServicoOmie({ force = false } = {}) {
  window.__vvClientesServicoCache = window.__vvClientesServicoCache || {
    lista: [],
    fetchedAt: 0
  };

  const cache = window.__vvClientesServicoCache;
  if (!force && Array.isArray(cache.lista) && cache.lista.length) {
    window.listaClientesServico = cache.lista;
    return cache.lista;
  }

  const resposta = await fetch(VV_CLIENTES_SERVICO_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!resposta.ok) {
    throw new Error(`Nao foi possivel carregar clientes de servicos. HTTP ${resposta.status}.`);
  }

  const json = await resposta.json().catch(() => null);
  const lista = vvExtrairListaClientesServico(json);

  cache.lista = Array.isArray(lista) ? lista : [];
  cache.fetchedAt = Date.now();
  window.listaClientesServico = cache.lista;

  return cache.lista;
}

window.vvCarregarClientesServicoOmie = vvCarregarClientesServicoOmie;

/**
 * Retorna o codigo_cliente_omie (número) a partir da razão social / nome fantasia.
 * Usada em ctxHeaderOS -> getCodigoClientePorRazao(razao)
 */
function getCodigoClientePorRazao(razaoBusca) {
  if (!razaoBusca) return "";

  const lista = window.listaClientesServico;
  if (!Array.isArray(lista) || !lista.length) {
    console.warn("⚠️ listaClientesServico ainda não carregada.");
    return "";
  }

  const alvo = normalizarTexto(razaoBusca);

  // 1) Match exato
  let cliente = lista.find(
    (c) => normalizarTexto(c.razao_social || c.nome_fantasia || c.nome) === alvo
  );

  // 2) Fallback: contém
  if (!cliente) {
    cliente = lista.find(
      (c) => normalizarTexto(c.razao_social || c.nome_fantasia || c.nome).includes(alvo)
    );
  }

  if (!cliente) {
    console.warn("⚠️ Cliente não encontrado na lista para:", razaoBusca);
    return "";
  }

  const codigo = cliente.codigo_cliente_omie;
  if (!codigo) {
    console.warn("⚠️ Cliente encontrado mas sem codigo_cliente_omie:", cliente);
    return "";
  }

  return Number(codigo);
}

/* ================== CONTEXTOS DA TELA ================== */
/* Caso você tenha inputs dedicados (inpCodInt, inpData, inpCli, inpParc, inpAdicNF),
   mapeie seus IDs aqui para captar valores com prioridade. */
function gerarCodigoOs7() {
  const now = new Date();

  // minutos, segundos e milissegundos do momento
  const baseTime =
    now.getMinutes() * 60 * 1000 +
    now.getSeconds() * 1000 +
    now.getMilliseconds();

  // "sal" aleatório para reduzir colisão
  const random = Math.floor(Math.random() * 36); // 0–35

  // base36 -> 0-9 + a-z, em maiúsculo
  const raw = (baseTime.toString(36) + random.toString(36)).toUpperCase();

  // garante no máximo 7 caracteres (pegando o final, mais variável)
  return raw.slice(-7);
}

function ctxFormOS() {
  const byId = (id) => document.getElementById(id);

  // gera código único se não houver valor digitado
  let codInt = byId("os-codint")?.value?.trim();
  if (!codInt) {
    codInt = gerarCodigoOs7();
    const inputCodInt = byId("os-codint");
    if (inputCodInt) inputCodInt.value = codInt; // opcional: já mostra na tela
  }

  const dataBr  = byId("os-data")?.value?.trim();       // se já vier em DD/MM/AAAA
  const dataIso = byId("os-data-iso")?.value?.trim();   // se vier ISO
  const codCli  = byId("os-codcli")?.value?.trim();     // ex: inpCli.value
  const qtParc  = byId("os-qtd-parc")?.value?.trim();   // ex: inpParc.value
  const dadosNF = byId("os-dados-adicnf")?.value?.trim(); // ex: inpAdicNF.value

  return {
    cCodIntOS_form: codInt || "",
    dDtPrevisao_form: dataBr || toBR(dataIso || "") || "",
    nCodCli_form: codCli ? Number(codCli) : undefined,
    nQtdeParc_form: qtParc ? Number(qtParc) : undefined,
    cDadosAdicNF_form: dadosNF || ""
  };
}

function ctxParcelasOS(parcelasServico = null) {
  const parcelasCorretas = obterParcelasServicoCorretas(parcelasServico);

  const nQtdeParc = parcelasCorretas.length || 1;

  const primeiraData = parcelasCorretas
    .map(p => String(p?.vencimento || p?.previsao || "").trim())
    .find(Boolean) || "";

  const dataPrevisaoOmie = vvDataPrevisaoServicoParaOmie(primeiraData);
  const dDtPrevisaoBR = toBR(dataPrevisaoOmie);
  const dDtPrevisaoISO = toISO(dataPrevisaoOmie);

  console.group("ðŸ§® [ctxParcelasOS AJUSTADO]");
  console.table(
    parcelasCorretas.map((p, i) => ({
      index: i,
      previsao: p?.previsao || "",
      vencimento: p?.vencimento || "",
      valor: p?.valor || 0
    }))
  );
  console.log("vencimento escolhido na parcela:", primeiraData);
  console.log("dataPrevisaoOmie compensada:", dataPrevisaoOmie);
  console.log("dDtPrevisaoBR:", dDtPrevisaoBR);
  console.log("dDtPrevisaoISO:", dDtPrevisaoISO);
  console.groupEnd();

  return {
    nQtdeParc,
    dDtPrevisaoBR,
    dDtPrevisaoISO,
    vencimentoServicoOriginal: primeiraData
  };
}
function ctxHeaderOS() {
  const orc = document.getElementById("numeroOrcamento");
  const numeroOrcamento =
    (orc?.value && String(orc.value).trim())
    || (orc?.dataset?.valorOriginal && String(orc.dataset.valorOriginal).trim())
    || "";

  const cCodIntOS = gerarCodigoIntegracaoOmie("OS");

  const razaoEl = document.querySelector("input.form-control.razaoSocial");
  const razao =
    (razaoEl?.value && String(razaoEl.value).trim())
    || (razaoEl?.dataset?.valorOriginal && String(razaoEl.dataset.valorOriginal).trim())
    || "";

  const nCodCliCache = (typeof getCodigoClientePorRazao === "function")
    ? (getCodigoClientePorRazao(razao) || "")
    : "";

  // Usa o código obtido diretamente da Omie durante a validação como fallback garantido
  const nCodCli = nCodCliCache || (window.__vvNCodCliServico ? String(window.__vvNCodCliServico) : "");

  return { cCodIntOS, nCodCli, razaoSocial: razao, numeroOrcamento };
}

function vvMontarDadosAdicNFServico(numeroPedido, numeroOrcamento) {
  const pedido = String(numeroPedido || "").trim();
  const orcamento = String(numeroOrcamento || "").trim();

  if (pedido && orcamento) {
    return `numero do pedido: ${pedido} e numero do orcamento: ${orcamento}`;
  }

  if (pedido) {
    return `numero do pedido: ${pedido}`;
  }

  if (orcamento) {
    return `numero do orcamento: ${orcamento}`;
  }

  return "";
}

function vvFormatarValorServicoTexto(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function vvMontarObservacoesServicoOmie(numeroPedido, numeroOrcamento, parcelasServico = []) {
  const linhas = [];
  const dadosAdicNF = vvMontarDadosAdicNFServico(numeroPedido, numeroOrcamento);

  if (dadosAdicNF) {
    linhas.push(dadosAdicNF);
  }

  const parcelasTexto = (parcelasServico || [])
    .map(vvNormalizarParcelaControle)
    .filter(parcela => parcela.valor > 0 && !parcela.ignorar)
    .map((parcela, index) => {
      const partes = [`Parcela ${index + 1}`];
      const dataFormatada = formatarDataBR(parcela.vencimento) || parcela.vencimento;

      if (dataFormatada) partes.push(`vencimento ${dataFormatada}`);
      partes.push(`valor R$ ${vvFormatarValorServicoTexto(parcela.valor)}`);

      if (parcela.tipo_monetario) partes.push(`tipo ${parcela.tipo_monetario}`);
      if (parcela.condicao_pagto) partes.push(`condicao ${parcela.condicao_pagto}`);
      if (parcela.descritivo) partes.push(`descricao ${parcela.descritivo}`);

      return partes.join(" | ");
    });

  if (parcelasTexto.length) {
    linhas.push("Parcelas:");
    linhas.push(parcelasTexto.join("\n"));
  }

  return linhas.join("\n").trim() || "Servico";
}

function vvColetarEmailsClientesOS() {
  const emails = [];
  const vistos = new Set();

  Array.from(document.querySelectorAll(".emailCliente"))
    .map(input =>
      input?.value?.trim() ||
      input?.dataset?.valorOriginal?.trim() ||
      ""
    )
    .filter(Boolean)
    .forEach(email => {
      const valor = String(email).trim();
      const chave = valor.toLowerCase();
      if (vistos.has(chave)) return;
      vistos.add(chave);
      emails.push(valor);
    });

  return emails.join(",");
}

/* =============== MONTAGEM DO PAYLOAD (FORMATO EXATO SOLICITADO) ===============
 Estrutura final enviada:
 {
   Cabecalho: {
     cCodIntOS, cCodParc, cEtapa, dDtPrevisao, nCodCli, nQtdeParc
   },
   Departamentos: [],
   Email: { cEnvBoleto, cEnvLink, cEnviarPara },
   InformacoesAdicionais: { cCodCateg, cDadosAdicNF, nCodCC },
   ServicosPrestados: [
     {
       cCodServLC116, cCodServMun, cRetemISS, cTribServ,
       impostos: { cRetemIRRF, cRetemPIS, nAliqIRRF, nAliqISS, nAliqPIS },
       nQtde, nValUnit
     }
   ]
 }
=========================================================================== */
function montarPayloadOS({
  cCodIntOS,
  nCodCli,
  dDtPrevisaoBR,
  dDtPrevisaoISO,
  valorServicos,
  nQtdeParc = 1,
  numeroPedido = "",
  numeroOrcamento = "",
  codigoProjeto = "",
  parcelasServico = []
}) {
  const getVal = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return "";
    return (
      el.value?.trim?.() ||
      el.dataset?.valorOriginal?.trim?.() ||
      el.textContent?.trim?.() ||
      ""
    );
  };

  const numeroPedidoOS = String(
    numeroPedido ||
    vv_getNumeroPedidoComissao() ||
    getVal("#numeroPedido")
  ).trim();

  const numeroOrcamentoOS = String(
    numeroOrcamento ||
    vv_getNumeroOrcamento() ||
    getVal("#numeroOrcamento") ||
    getVal('input[name="numeroOrcamento"]')
  ).trim();

  const codigoIntegracaoOS = String(cCodIntOS || gerarCodigoIntegracaoOmie("OS")).trim();

  const cCodParc_form = getVal("#cCodParc") || "999";
  const cEtapa_form   = getVal("#cEtapa")   || "20";

  const cDadosAdicNF_form =
    vvMontarDadosAdicNFServico(numeroPedidoOS, numeroOrcamentoOS) ||
    getVal("#cDadosAdicNF") ||
    "";

  const CCODCATEG_DEFAULT  = "1.01.99";
  const NCODCC_DEFAULT     = 10937506623;
  const CCOD_LC116_DEFAULT = "7.01";
  const CCOD_MUN_DEFAULT   = "0701-0/01-88";

  const nValUnitFinal = Number(valorServicos);
  if (!(nValUnitFinal > 0)) {
    throw new Error("Valor de Serviços inválido ou zero.");
  }

  // ── resolve vendedor ──────────────────────────────────────
  const cadastroVendedoresServico = [
    { codigo: 10922409030, inativo: "S", nome: "Paulo Sergio Machado da Silva" },
    { codigo: 10922409032, inativo: "S", nome: "DOUGLAS VITOR DA SILVA" },
    { codigo: 10922409035, inativo: "S", nome: "GABRIEL JUNIOR DO COUTO NEPOMUCENO" },
    { codigo: 10922409037, inativo: "N", nome: "MAURO FERREIRA" },
    { codigo: 10922409049, inativo: "N", nome: "FELIPE ULHOA FERREIRA" },
    { codigo: 10922409051, inativo: "N", nome: "JOAO CLEBER MARTINS" },
    { codigo: 10922409053, inativo: "N", nome: "MARILENA DE ALMEIDA ULHOA" },
    { codigo: 10922409055, inativo: "N", nome: "ANA FLAVIA RODRIGUES PRATES" },
    { codigo: 10922409059, inativo: "N", nome: "RAFAEL ANGELO ARAUJO DA SILVA" },
    { codigo: 10985073333, inativo: "S", nome: "LAIS MAGALHÃES RABELO" },
    { codigo: 11059840338, inativo: "S", nome: "VANESSA ULHOA" },
    { codigo: 11060014882, inativo: "S", nome: "Enviado via API" },
    { codigo: 11158319843, inativo: "N", nome: "MAURO FERREIRA" },
    { codigo: 11158376229, inativo: "N", nome: "DAVIDSON JUNIO PEREIRA MACIEL" },
    { codigo: 11158376259, inativo: "N", nome: "FERNANDO PEREIRA DE SOUZA JUNIOR" },
    { codigo: 11158376263, inativo: "N", nome: "LEONARDO SOUSA OLIVEIRA" },
    { codigo: 11158376268, inativo: "N", nome: "MATHEUS HENRIQUE SOUZA BRAGA" },
    { codigo: 11158376278, inativo: "N", nome: "EDNALDO GOMES FILHO" },
    { codigo: 11158376285, inativo: "N", nome: "DIONATA ALAN SILVA COSTA" },
    { codigo: 11158376293, inativo: "N", nome: "JOSE CARLOS SOARES DA CRUZ" },
    { codigo: 11158376335, inativo: "N", nome: "JOSE GILMAR PINHEIRO" },
    { codigo: 11158376357, inativo: "N", nome: "ERIVALDO AMARO DE ALMEIDA" },
    { codigo: 11158376364, inativo: "N", nome: "LUIZ FERNANDO LIMA" },
    { codigo: 11158376367, inativo: "N", nome: "OSVALDO PAURA OLIVEIRA" },
    { codigo: 11158376374, inativo: "N", nome: "JOSE CARLOS SOARES DA CRUZ" },
    { codigo: 11158376382, inativo: "N", nome: "RENE GOMES DE OLIVEIRA" },
    { codigo: 11158376392, inativo: "N", nome: "ROBERTO MARTINS DO NASCIMENTO" },
    { codigo: 11158376703, inativo: "N", nome: "RONAN GOMES DE SOUZA LIMA" },
    { codigo: 11158376707, inativo: "N", nome: "SERGIO RICARDO PIO" },
    { codigo: 11158376710, inativo: "N", nome: "RODRIGO NOBRE DOS SANTOS" },
    { codigo: 11158376713, inativo: "N", nome: "RODRIGO BRITO CARDOSO" },
    { codigo: 11158376723, inativo: "N", nome: "SEBASTIAO DOS REIS DE MATOS" }
  ];

  const aliasesVendedorServico = {
    "MAURO LUCIO":           "MAURO FERREIRA",
    "LAIS MAGALHAES RABELO": "LAIS MAGALHÃES RABELO"
  };

  const normV = (s) => String(s || "")
    .trim().toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const resolverCodVend = (nome) => {
    if (!nome) return 0;
    const nomeNorm     = normV(nome);
    const nomeResolvido = aliasesVendedorServico[nomeNorm] || nome;
    const encontrados  = cadastroVendedoresServico.filter(
      v => normV(v.nome) === normV(nomeResolvido)
    );
    if (!encontrados.length) return 0;
    const v = encontrados.find(v => String(v.inativo).toUpperCase() === "N") || encontrados[0];
    return Number(v.codigo) || 0;
  };

  const vendedorSelect = document.querySelector("#vendedorResponsavel");
  const nomeVendedorTela = (
    vendedorSelect?.options?.[vendedorSelect?.selectedIndex]?.text?.trim() ||
    vendedorSelect?.value?.trim() ||
    vendedorSelect?.getAttribute("data-valor-original")?.trim() ||
    ""
  );

  const codigoVendedorServico = resolverCodVend(nomeVendedorTela);

  console.log("[montarPayloadOS] vendedor serviço:", {
    nomeVendedorTela,
    codigoVendedorServico
  });

  // ── Cabecalho ─────────────────────────────────────────────
// ── Cabecalho ─────────────────────────────────────────────
  const Cabecalho = {
    cCodIntOS:   codigoIntegracaoOS,
    cCodParc:    String(cCodParc_form || "999").trim(),
    cEtapa:      String(cEtapa_form   || "20").trim(),
    dDtPrevisao: String(dDtPrevisaoBR || "").trim(),
    nQtdeParc:   Number(nQtdeParc || 1)
  };

  if (nCodCli) Cabecalho.nCodCli = Number(nCodCli);

  // ✅ nCodVend no Cabecalho
  if (codigoVendedorServico > 0) {
    Cabecalho.nCodVend = codigoVendedorServico;
  }

  // ── InformacoesAdicionais ─────────────────────────────────
  const InformacoesAdicionais = {
    cCodCateg:    CCODCATEG_DEFAULT,
    cDadosAdicNF: String(cDadosAdicNF_form || "").trim(),
    nCodCC:       NCODCC_DEFAULT
  };

  if (numeroPedidoOS) {
    InformacoesAdicionais.cNumPedido   = numeroPedidoOS;
    InformacoesAdicionais.cNumContrato = numeroPedidoOS;
  }

  const codigoProjetoNumero = Number(codigoProjeto || 0);
  if (codigoProjetoNumero > 0) {
    InformacoesAdicionais.nCodProj = codigoProjetoNumero;
  }
  // ← nCodVend não entra aqui
  // ── ServicosPrestados ─────────────────────────────────────
  const ServicosPrestados = [
    {
      cCodServLC116: CCOD_LC116_DEFAULT,
      cCodServMun:   CCOD_MUN_DEFAULT,
      cRetemISS:     "N",
      cTribServ:     "01",
      impostos: {
        cRetemIRRF: "N",
        cRetemPIS:  "N",
        nAliqIRRF:  0,
        nAliqISS:   0,
        nAliqPIS:   0
      },
      nQtde:    1,
      nValUnit: Number(nValUnitFinal.toFixed(2)),
      cDescServ: vvMontarObservacoesServicoOmie(
        numeroPedidoOS,
        numeroOrcamentoOS,
        parcelasServico
      )
    }
  ];

  // ── Parcelas da OS ────────────────────────────────────────
  const parcelasOsValidas = (parcelasServico || []).filter(p => Number(p?.valor || 0) > 0);

  const totalParcelasOs = parcelasOsValidas.reduce((s, p) => s + Number(p.valor || 0), 0);

  const Parcelas = parcelasOsValidas.map((p, i) => {
    const parc = {
      nParcela:    i + 1,
      dDtVenc:     (() => {
        const raw = String(p.vencimento || p.previsao || p.data || "").trim();
        if (!raw) return "";
        // ISO YYYY-MM-DD → DD/MM/YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [y, m, d] = raw.split("-");
          return `${d}/${m}/${y}`;
        }
        return raw; // já no formato correto
      })(),
      nValor:      Number((Number(p.valor || 0)).toFixed(2)),
      nPercentual: totalParcelasOs > 0
        ? Number(((Number(p.valor || 0) / totalParcelasOs) * 100).toFixed(2))
        : 0
    };
    const meio = String(p.tipo_monetario || "").trim();
    if (meio) parc.meio_pagamento = meio;
    return parc;
  });

  const payload = {
    Cabecalho,
    Departamentos: [],
    Email: {
      cEnvBoleto: "S",
      cEnvLink:   "S",
      cEnviarPara: vvColetarEmailsClientesOS()
    },
    InformacoesAdicionais,
    ServicosPrestados
  };

  if (Parcelas.length > 0) {
    payload.Parcelas = Parcelas;
  }

  window.__vvUltimoPayloadOSOmie = JSON.parse(JSON.stringify(payload));

  console.group("📦 [montarPayloadOS] FINAL");
  console.log("nomeVendedorTela:", nomeVendedorTela);
  console.log("codigoVendedorServico:", codigoVendedorServico);
  console.log("Cabecalho:", JSON.parse(JSON.stringify(Cabecalho)));
  console.log("InformacoesAdicionais:", JSON.parse(JSON.stringify(InformacoesAdicionais)));
  console.log("ServicosPrestados:", JSON.parse(JSON.stringify(ServicosPrestados)));
  console.log("payload JSON:", JSON.stringify(payload, null, 2));
  console.groupEnd();

  return payload;
}

/* ================== ENVIO PARA /os ================== */
async function enviarOSServico({
  valorServicos,
  parcelasServico = null,
  endpoint = OS_SERVICOS_ENDPOINT
}) {
  try {
    if (!(Number(valorServicos) > 0)) {
      const msg = "Valor de Serviços inválido ou zerado.";
      mostrarPopupCustomizado("❌ Erro ao enviar Serviços", msg, "error");
      return { ok: false, error: msg };
    }

    const numeroPedidoGarantido = await garantirNumeroPedidoPreenchido();
    await vvCarregarClientesServicoOmie();
    const codigoProjeto = await vvGarantirProjetoOmieServicoPorPedido(numeroPedidoGarantido);

    const parcelasServicoCorretas = obterParcelasServicoCorretas(parcelasServico);

    const { cCodIntOS, nCodCli, numeroOrcamento } = ctxHeaderOS();
    const { dDtPrevisaoBR, dDtPrevisaoISO, nQtdeParc } = ctxParcelasOS(parcelasServicoCorretas);
    const parcelasServicoSemData = (parcelasServicoCorretas || [])
      .map((parcela, index) => ({ parcela, index }))
      .filter(item => !formatarDataBR(item.parcela?.vencimento || item.parcela?.previsao));

    if (!dDtPrevisaoBR || parcelasServicoSemData.length) {
      const msg = parcelasServicoSemData.length
        ? "Preencha a data de vencimento das parcelas de servico antes de enviar a Omie: " +
          parcelasServicoSemData.map(item => `Parcela ${item.index + 1}`).join(", ")
        : "Data de previsao das parcelas de servico nao preenchida.";

      mostrarPopupCustomizado("Erro ao enviar Serviços", msg, "error");
      return { ok: false, error: msg };
    }

    console.group("🧾 [SERVIÇOS] PARCELAS ANTES DO ENVIO");
    console.log("endpoint:", endpoint);
    console.log("valorServicos:", valorServicos);
    console.log("numeroPedidoGarantido:", numeroPedidoGarantido);
    console.log("numeroOrcamento:", numeroOrcamento);
    console.log("codigoProjeto:", codigoProjeto);
    console.log("cCodIntOS:", cCodIntOS);
    console.log("nCodCli:", nCodCli);
    console.log("nQtdeParc:", nQtdeParc);
    console.log("dDtPrevisaoBR:", dDtPrevisaoBR);
    console.log("dDtPrevisaoISO:", dDtPrevisaoISO);
    console.log("parcelasServico parâmetro:", JSON.parse(JSON.stringify(parcelasServico || null)));
    console.log("parcelasServicoCorretas:", JSON.parse(JSON.stringify(parcelasServicoCorretas || [])));
    console.table(
      (parcelasServicoCorretas || []).map((p, i) => ({
        index: i,
        tipo_monetario: p?.tipo_monetario || "",
        condicao_pagto: p?.condicao_pagto || "",
        valor: p?.valor || 0,
        previsao: p?.previsao || "",
        vencimento: p?.vencimento || ""
      }))
    );
    console.groupEnd();

    const payload = montarPayloadOS({
      cCodIntOS,
      nCodCli,
      dDtPrevisaoBR,
      dDtPrevisaoISO,
      valorServicos,
      nQtdeParc,
      numeroPedido: numeroPedidoGarantido,
      numeroOrcamento,
      codigoProjeto,
      parcelasServico: parcelasServicoCorretas
    });

    console.group("🚀 [SERVIÇOS] REQUEST FINAL PARA OMIE");
    console.log("URL:", endpoint);
    console.log("Método:", "POST");
    console.log("Payload objeto:", JSON.parse(JSON.stringify(payload)));
    console.log("Payload JSON stringify:", JSON.stringify(payload, null, 2));
    console.log("Cabecalho enviado:", JSON.parse(JSON.stringify(payload?.Cabecalho || {})));
    console.log("ServicosPrestados enviado:", JSON.parse(JSON.stringify(payload?.ServicosPrestados || [])));
    console.groupEnd();

    const headers = { "Content-Type": "application/json" };
    const token =
      localStorage.getItem("accessTokenServico") ||
      localStorage.getItem("accessToken");

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.group("ðŸ“¡ [SERVIÇOS] FETCH");
    console.log("headers:", JSON.parse(JSON.stringify(headers)));
    console.log("body cru:", JSON.stringify(payload));
    console.groupEnd();

    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const raw = await resp.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = { ok: resp.ok, raw };
    }

    console.group("â¬…️ [SERVIÇOS] RESPOSTA OMIE");
    console.log("status HTTP:", resp.status);
    console.log("ok HTTP:", resp.ok);
    console.log("resposta parseada:", data);
    console.log("resposta raw:", raw);
    console.groupEnd();

    if (!resp.ok || data?.ok === false) {
      const motivo = extrairMensagemOmie(data, resp.status) || `HTTP ${resp.status}`;

      mostrarPopupCustomizado(
        "❌ Erro ao enviar OS de Serviços",
        motivo,
        "error"
      );

      return { ok: false, error: motivo, data };
    }

    mostrarPopupCustomizado(
      "✅ OS de Serviços enviada",
      `OS criada com sucesso.<br>Valor: ${vv_fmtBRL(valorServicos)}.`,
      "success"
    );

    return { ok: true, status: resp.status, data };
  } catch (err) {
    console.error("❌ enviarOSServico erro:", err);
    const msg = err?.message || String(err);

    mostrarPopupCustomizado("❌ Erro ao enviar Serviços", msg, "error");
    return { ok: false, error: msg };
  }
}

// ── Popup visual de retorno (sucesso / erro) ─────────────────────
// Cria o overlay uma única vez (se ainda não existir na página) e
// reaproveita nas próximas chamadas.
function mostrarPopupSync(texto, tipo = "sucesso") {
  let overlay = document.getElementById("sync-popup-overlay");

  if (!overlay) {
    const estilo = document.createElement("style");
    estilo.textContent = `
      #sync-popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15,30,60,.45);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      }
      #sync-popup-overlay.aberto { display: flex; }
      .sync-popup {
        background: #fff;
        border-radius: 16px;
        padding: 26px 24px 20px;
        width: 300px;
        max-width: 90vw;
        text-align: center;
        box-shadow: 0 12px 32px rgba(0,0,0,.2);
      }
      .sync-popup-icone {
        width: 52px;
        height: 52px;
        margin: 0 auto 14px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }
      .sync-popup-icone.sucesso { background: #e6f7ee; }
      .sync-popup-icone.erro { background: #fdecea; }
      .sync-popup-icone.aviso { background: #fff8e6; }
      .sync-popup-texto {
        color: #2c3e50;
        font-size: .92rem;
        line-height: 1.45;
        margin: 0 0 18px;
        white-space: pre-line;
      }
      .sync-popup-fechar {
        background: #114187;
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 9px 22px;
        font-weight: 600;
        font-size: .88rem;
        cursor: pointer;
      }
      .sync-popup-fechar:hover { background: #0b305e; }
    `;
    document.head.appendChild(estilo);

    overlay = document.createElement("div");
    overlay.id = "sync-popup-overlay";
    overlay.innerHTML = `
      <div class="sync-popup">
        <div class="sync-popup-icone" id="sync-popup-icone"></div>
        <p class="sync-popup-texto" id="sync-popup-texto"></p>
        <button class="sync-popup-fechar" id="sync-popup-fechar">Entendi</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const fechar = () => overlay.classList.remove("aberto");
    overlay.querySelector("#sync-popup-fechar").addEventListener("click", fechar);
    overlay.addEventListener("click", e => { if (e.target === overlay) fechar(); });
  }

  const icone = overlay.querySelector("#sync-popup-icone");
  icone.className = `sync-popup-icone ${tipo}`;
  icone.textContent = tipo === "sucesso" ? "\u{2705}" : tipo === "aviso" ? "\u{1F4CB}" : "\u{274C}";
  overlay.querySelector("#sync-popup-texto").textContent = texto;
  overlay.classList.add("aberto");
}

async function sincronizarPDVparaKommo() {
  const idProposta = new URLSearchParams(window.location.search).get("id");
  preencherNumeroPedidoKommo()
  if (!idProposta) {
    console.warn("[SYNC] ID da proposta não encontrado na URL.");
    return;
  }

  // ── Parser BRL seguro ─────────────────────────────
  function parseBRL(texto) {
    if (!texto) return 0;
    const limpo = texto
      .replace(/ /g, " ")
      .replace(/R\$\s*/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  }

  const campos = {};

  // ── Nome / Razão Social ───────────────────────────
  const nomeRazaoSocial = document.querySelector(".razaoSocial")?.value?.trim()
    || document.querySelector(".razaoSocial")?.getAttribute("data-valor-original")?.trim();
  if (nomeRazaoSocial) campos.kommo_nome_razao_social = nomeRazaoSocial;

  // ── Nº do Pedido ──────────────────────────────────
  let numeroPedido = document.getElementById("numeroPedido")?.value?.trim()
    || document.getElementById("numeroPedido")?.getAttribute("data-valor-original")?.trim();

  if (!numeroPedido) {
    console.log("[SYNC] numeroPedido vazio, buscando próximo número no contador...");
    try {
      const contadorRes = await fetch("https://contator-ulhoa-3d28d89efa68.herokuapp.com/pedido");
      if (contadorRes.ok) {
        const contadorData = await contadorRes.json();
        const proximo = contadorData.pedido_proximo;
        if (proximo) {
          numeroPedido = String(proximo);
          const inputPedido = document.getElementById("numeroPedido");
          if (inputPedido) inputPedido.value = numeroPedido;
          console.log("[SYNC] numeroPedido preenchido automaticamente:", numeroPedido);
        }
      } else {
        console.warn("[SYNC] Erro ao buscar contador de pedido:", contadorRes.status);
      }
    } catch (err) {
      console.warn("[SYNC] Falha ao conectar no contador:", err.message);
    }
  }

  if (numeroPedido) campos.kommo_numero_pedido = numeroPedido;

  // ── Número Orçamento ──────────────────────────────
  const numeroOrcamento = document.getElementById("numeroOrcamento")?.value?.trim()
    || document.getElementById("numeroOrcamento")?.getAttribute("data-valor-original")?.trim();
  if (numeroOrcamento) campos.kommo_numero_orcamento = numeroOrcamento;

  // ── TAG Omie ──────────────────────────────────────
  const tagOmie = document.getElementById("tagOmie")?.value?.trim();
  if (tagOmie) campos.kommo_tag_omie = tagOmie;

  // ── Desconto ──────────────────────────────────────
  const descontoRaw = document.querySelector("#campoDescontoFinal")?.value?.trim();
  if (descontoRaw) {
    const descontoNum = parseFloat(String(descontoRaw).replace(/\./g, '').replace(',', '.'));
    if (!isNaN(descontoNum) && descontoNum > 0) campos.kommo_desconto = descontoNum;
  }

  // ── Valor Total da Venda ──────────────────────────
  const valorFinalTotalEl    = document.getElementById("valorFinalTotal");
  const valorFinalTotalTexto = (valorFinalTotalEl?.textContent || valorFinalTotalEl?.innerText || "")
    .replace(/ /g, " ").trim();
  const valorFinalTotal = parseBRL(valorFinalTotalTexto);
  if (valorFinalTotal > 0) campos.kommo_valor_venda = valorFinalTotal;

  // ── Endereço da obra ──────────────────────────────
  const rua         = document.getElementById("rua")?.value?.trim();
  const numero      = document.getElementById("numero")?.value?.trim();
  const complemento = document.getElementById("complemento")?.value?.trim();
  const bairro      = document.getElementById("bairro")?.value?.trim();
  const cidade      = document.getElementById("cidade")?.value?.trim();

  if (rua)         campos.kommo_rua         = rua;
  if (numero)      campos.kommo_numero       = numero;
  if (complemento) campos.kommo_complemento  = complemento;
  if (bairro)      campos.kommo_bairro       = bairro;
  if (cidade)      campos.kommo_cidade       = cidade;

  // ── Endereço de cobrança ──────────────────────────
  const ruaObra         = document.getElementById("ruaObra")?.value?.trim();
  const numeroObra      = document.getElementById("numeroObra")?.value?.trim();
  const complementoObra = document.getElementById("complementoObra")?.value?.trim();
  const bairroObra      = document.getElementById("bairroObra")?.value?.trim();
  const cidadeObra      = document.getElementById("cidadeObra")?.value?.trim();

  if (ruaObra)         campos.kommo_rua_cobranca         = ruaObra;
  if (numeroObra)      campos.kommo_numero_cobranca       = numeroObra;
  if (complementoObra) campos.kommo_complemento_cobranca  = complementoObra;
  if (bairroObra)      campos.kommo_bairro_cobranca       = bairroObra;
  if (cidadeObra)      campos.kommo_cidade_cobranca       = cidadeObra;

  // ── Financeiro ────────────────────────────────────
  const valorNFProduto = parseBRL(document.getElementById("vv-cat-produto")?.textContent || "0");
  const valorNFServico = parseBRL(document.getElementById("vv-cat-servico")?.textContent || "0");
  const valorFatDireto = parseBRL(document.getElementById("vv-cat-vidro")?.textContent   || "0");

  campos.kommo_valor_nf_produto = valorNFProduto || 0;
  campos.kommo_valor_nf_servico = valorNFServico || 0;
  campos.kommo_valor_fat_direto = valorFatDireto || 0;

  // ── Vencimento Entrada = data da primeira parcela ───
  const todasDatasParcelas = [...document.querySelectorAll("#listaParcelas .data-parcela")]
    .map(el => el.value?.trim())
    .filter(Boolean);
  const primeiraDataParcela = todasDatasParcelas[0] || null;
  if (primeiraDataParcela) campos.kommo_vencimento_entrada = primeiraDataParcela;

  // ── Datas ─────────────────────────────────────────
  const dataPedidoEnviado   = document.getElementById("dataPedidoEnviadoCliente")?.value;
  const dataPedidoAssinado  = document.getElementById("dataPedidoAssinado")?.value;
  const dataMedicao         = document.getElementById("dataMedicaoRealizada")?.value;
  const dataLiberacaoObra   = document.getElementById("dataLiberacaoObra")?.value;
  const dataProjetoEnviado  = document.getElementById("dataProjetoEnviado")?.value;
  const dataProjetoAssinado = document.getElementById("dataProjetoAssinado")?.value;

  if (dataPedidoEnviado)   campos.kommo_contrato_enviado   = dataPedidoEnviado;
  if (dataPedidoAssinado)  campos.kommo_contrato_assinado  = dataPedidoAssinado;
  if (dataMedicao)         campos.kommo_medicao_realizada  = dataMedicao;
  if (dataLiberacaoObra)   campos.kommo_obra_liberada      = dataLiberacaoObra;
  if (dataProjetoEnviado)  campos.kommo_projeto_enviado    = dataProjetoEnviado;
  if (dataProjetoAssinado) campos.kommo_assinatura_projeto = dataProjetoAssinado;

  // Sempre envia o ID da proposta para vincular/manter o lead correto na Kommo
  campos.kommo_id_pdv = idProposta;

  if (Object.keys(campos).length <= 1) {
    console.warn("[SYNC] Nenhum campo preenchido para sincronizar com a Kommo.");
    return;
  }

  console.group("📤 [SYNC] PDV → Kommo");
  console.log("Proposta ID:", idProposta);
  console.log("Campos enviados:", campos);
  console.groupEnd();

  try {
    const resposta = await fetch(
      `https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/kommo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campos })
      }
    );

    const resultado = await resposta.json();
    console.log("lead_atual completo:", resultado.lead_atual);

    if (resposta.ok) {
      // ── Loga estado real retornado pelo servidor ──
      const lead = resultado.lead_atual;
      const cf   = lead?.custom_fields_values ?? [];

      const getField = (id) => cf.find(f => f.field_id === id)?.values?.[0]?.value ?? null;

      console.group("✅ [SYNC] Sucesso, estado atual na Kommo");
      console.log("Lead ID:            ", resultado.lead_id);
      console.log("Lead nome:          ", resultado.lead_nome);
      console.log("Campos atualizados: ", resultado.campos_atualizados);
      console.log("Valor venda (price):", lead?.price ?? null);
      console.log("NF Produto:         ", getField(1790646));
      console.log("NF Serviço:         ", getField(1790644));
      console.log("Fat. Direto:        ", getField(1790986));
      console.log("Nº Pedido:          ", getField(1716834));
      console.log("Nº Orçamento:       ", getField(1710738));
      console.log("Nome/Razão Social:  ", getField(1791998));
      console.log("Rua obra:           ", getField(1725250));
      console.log("Número obra:        ", getField(1725254));
      console.log("Bairro obra:        ", getField(1725256));
      console.log("Cidade obra:        ", getField(1725260));
      console.log("Vencimento entrada: ", getField(1723710));
      if (resultado.nao_mapeados?.length) {
        console.warn("Campos não mapeados:", resultado.nao_mapeados);
      }
      console.groupEnd();

      mostrarPopupSync(
        `Dados sincronizados com a Kommo com sucesso!\nLead: ${resultado.lead_nome || resultado.lead_id || ""}`,
        "sucesso"
      );
    } else {
      console.group("❌ [SYNC] Erro do servidor Kommo");
      console.warn("HTTP status:", resposta.status);
      console.warn("Erro:", resultado?.error);
      console.warn("Detalhes:", resultado?.details);
      console.warn("Validation errors:", JSON.stringify(resultado?.details?.['validation-errors'], null, 2));
      console.groupEnd();

      const naoLocalizado =
        resposta.status === 404 ||
        resultado?.error === "Cliente não localizado na Kommo" ||
        resultado?.error === "Nenhum lead encontrado pelo ID PDV";

      if (naoLocalizado) {
        mostrarPopupSync(
          `Cliente não encontrado na Kommo.\n\nO consultor deve cadastrar o cliente na Kommo e realizar o processo corretamente antes de sincronizar.`,
          "aviso"
        );
      } else {
        mostrarPopupSync(
          `Falha ao sincronizar com a Kommo:\n${resultado?.error || "Erro desconhecido"}`,
          "erro"
        );
      }
    }

    return resultado;

  } catch (err) {
    console.warn("[SYNC] Erro de conexão com Kommo (silenciado):", err.message);
  }
}

window.testarIntegracaoKommo = async function () {
  const BASE = "https://kommo-server-9f1243cbe450.herokuapp.com";
  const idProposta = new URLSearchParams(window.location.search).get("id");

  console.group("🔍 [TESTE KOMMO]");

  if (!idProposta) {
    console.error("❌ ID da proposta não encontrado na URL. Abra uma proposta antes de testar.");
    console.groupEnd();
    return;
  }
  console.log("ID da proposta:", idProposta);

  // 1. Health
  try {
    const h = await fetch(`${BASE}/health`);
    const hd = await h.json();
    if (hd.kommo_configured || hd.kommo_configurado) {
      console.log("✅ Servidor OK — Kommo configurado:", hd.kommo_domain || "(domínio ok)");
    } else {
      console.error("❌ Servidor sem credenciais Kommo:", hd);
      console.groupEnd();
      return;
    }
  } catch (e) {
    console.error("❌ Servidor offline:", e.message);
    console.groupEnd();
    return;
  }

  // Lê identificadores do DOM
  const numOrcamento = document.getElementById("numeroOrcamento")?.value?.trim() || "";
  const numPedido    = document.getElementById("numeroPedido")?.value?.trim() || "";

  // Busca lead por texto via servidor (usa GET /kommo/leads?query=)
  async function buscarPorTexto(termo, rotulo) {
    if (!termo) { console.warn(`   [${rotulo}] vazio, pulando`); return null; }
    try {
      const r = await fetch(`${BASE}/kommo/leads?query=${encodeURIComponent(termo)}&limit=10`);
      if (!r.ok) return null;
      const d = await r.json();
      const leads = d?.leads || d?._embedded?.leads || [];
      if (leads.length) {
        console.log(`   ✅ [${rotulo}] encontrou ${leads.length} lead(s) — usando: ID ${leads[0].id} — "${leads[0].name}"`);
        return leads[0];
      }
      console.warn(`   ❌ [${rotulo}] nenhum lead`);
      return null;
    } catch (e) {
      console.warn(`   ❌ [${rotulo}] erro:`, e.message);
      return null;
    }
  }

  // 2. Busca do lead — tenta 3 estratégias em sequência
  let leadId   = null;
  let leadNome = null;
  let metodo   = null;

  console.group("🔎 Buscando lead...");

  // 2a. Por campo kommo_id_pdv (mais preciso)
  try {
    const r = await fetch(`${BASE}/proposta/${idProposta}/lead`);
    const d = await r.json();
    if (r.ok) {
      leadId = d.lead_id; leadNome = d.nome; metodo = "campo ID PDV";
      console.log(`✅ Por ID PDV: lead ${d.lead_id} — "${d.nome}" | pipeline ${d.pipeline_id} | etapa ${d.status_id}`);
    } else {
      console.warn("❌ Por ID PDV: não encontrado");
    }
  } catch (e) {
    console.warn("❌ Por ID PDV: erro:", e.message);
  }

  // 2b. Por número do orçamento
  if (!leadId) {
    const l = await buscarPorTexto(numOrcamento, `Nº Orçamento "${numOrcamento}"`);
    if (l) { leadId = l.id; leadNome = l.name; metodo = `Nº Orçamento "${numOrcamento}"`; }
  }

  // 2c. Por número do pedido
  if (!leadId) {
    const l = await buscarPorTexto(numPedido, `Nº Pedido "${numPedido}"`);
    if (l) { leadId = l.id; leadNome = l.name; metodo = `Nº Pedido "${numPedido}"`; }
  }

  console.groupEnd();

  if (!leadId) {
    console.error("❌ LEAD NÃO ENCONTRADO por nenhum método:");
    console.error(`   • campo ID PDV (${idProposta}) — não cadastrado no lead`);
    console.error(`   • Nº Orçamento: "${numOrcamento || "(vazio)"}"`);
    console.error(`   • Nº Pedido:    "${numPedido    || "(vazio)"}"`);
    console.error("   → Abra o lead correto na Kommo e preencha o campo 'ID PDV' com: " + idProposta);
    console.groupEnd();
    return;
  }

  console.log(`✅ Lead localizado via: ${metodo}`);
  console.log(`   ID: ${leadId} — "${leadNome}"`);

  if (metodo !== "campo ID PDV") {
    console.warn(`⚠️  Lead encontrado por texto, mas campo ID PDV não está preenchido.`);
    console.warn(`   → Para fixar o vínculo permanentemente, preencha o campo 'ID PDV' do lead ${leadId} com: ${idProposta}`);
  }

  // 3. Simula payload sem enviar (lê campos do DOM)
  const vals = {
    "Razão Social": document.querySelector(".razaoSocial")?.value?.trim(),
    "Nº Pedido":    numPedido,
    "Nº Orçamento": numOrcamento,
    "Valor Venda":  (document.getElementById("valorFinalTotal")?.textContent || "").trim(),
    "NF Produto":   document.getElementById("vv-cat-produto")?.textContent?.trim(),
    "NF Serviço":   document.getElementById("vv-cat-servico")?.textContent?.trim(),
    "Fat. Direto":  document.getElementById("vv-cat-vidro")?.textContent?.trim(),
    "Rua obra":     document.getElementById("rua")?.value?.trim(),
    "Cidade obra":  document.getElementById("cidade")?.value?.trim(),
  };
  console.log("📋 Campos que seriam enviados:");
  for (const [k, v] of Object.entries(vals)) {
    console.log(`   ${k.padEnd(14)}: ${v || "(vazio)"}`);
  }

  console.log("🟢 Integração pronta — lead vinculado e campos detectados.");
  console.groupEnd();
};

async function preencherNumeroPedidoKommo() {
  const idProposta = new URLSearchParams(window.location.search).get("id");

  if (!idProposta) {
    console.warn("[PEDIDO] ID da proposta não encontrado na URL.");
    return;
  }

  // 1. Verifica se o campo já está preenchido
  const inputPedido = document.getElementById("numeroPedido");
  const valorAtual  = inputPedido?.value?.trim();

  if (valorAtual) {
    console.log("[PEDIDO] Campo já preenchido:", valorAtual, "— nenhuma ação necessária.");
    return;
  }

  try {
    // 2. Busca próximo número
    const contadorRes = await fetch("https://contator-ulhoa-3d28d89efa68.herokuapp.com/pedido");
    if (!contadorRes.ok) throw new Error("Erro ao buscar contador: " + contadorRes.status);

    const contadorData = await contadorRes.json();
    console.group("📊 [PEDIDO] Resposta do contador");
    console.log("Dados completos:", contadorData);
    console.groupEnd();

    const numeroPedido = String(contadorData.pedido_proximo ?? contadorData.numero ?? contadorData.pedido ?? "");

    if (!numeroPedido) {
      console.warn("[PEDIDO] Número não encontrado na resposta:", contadorData);
      return;
    }

    console.log("[PEDIDO] Próximo número:", numeroPedido);

    // 3. Preenche o campo na tela
    if (inputPedido) inputPedido.value = numeroPedido;

    // 4. Envia para a Kommo
    const resposta = await fetch(
      `https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/kommo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campos: { kommo_numero_pedido: numeroPedido } })
      }
    );

    const resultado = await resposta.json();

    if (resposta.ok) {
      const lead = resultado.lead_atual;
      const cf   = lead?.custom_fields_values ?? [];
      const getField = (id) => cf.find(f => f.field_id === id)?.values?.[0]?.value ?? null;

      console.group("✅ [PEDIDO] Sucesso — estado atual na Kommo");
      console.log("Lead ID:          ", resultado.lead_id);
      console.log("Lead nome:        ", resultado.lead_nome);
      console.log("Campos atualizados:", resultado.campos_atualizados);
      console.log("Nº Pedido salvo:  ", getField(1716834));
      console.log("Nº Orçamento:     ", getField(1710738));
      console.log("ID PDV:           ", getField(1793228));
      console.log("Lead atual completo:", lead);
      if (resultado.nao_mapeados?.length) {
        console.warn("Campos não mapeados:", resultado.nao_mapeados);
      }
      console.groupEnd();
    } else {
      console.group("❌ [PEDIDO] Erro do servidor");
      console.error("HTTP status:", resposta.status);
      console.error("Erro:", resultado?.error);
      console.error("Detalhes:", resultado?.details);
      console.error("Validation errors:", JSON.stringify(resultado?.details?.['validation-errors'], null, 2));
      console.groupEnd();
    }

    return resultado;

  } catch (err) {
    console.error("[PEDIDO] ❌ Erro de conexão:", err.message);
  }
}

/* Expor global */
window.enviarOSServico = enviarOSServico;

/* Botão "Enviar para Omie" — scripts defer rodam com o DOM já parseado,
   então o getElementById funciona direto, sem esperar DOMContentLoaded. */
(function () {
  var btn = document.getElementById('btn-gerar-pedido');
  if (btn) {
    btn.addEventListener('click', function () {
      atualizarNaOmie().catch(function (err) {
        console.error('[atualizarNaOmie] erro não tratado:', err);
        alert('Erro ao enviar para Omie: ' + (err?.message || err));
      });
    });
  }
})();
