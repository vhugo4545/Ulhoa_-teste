// visaoMacro.js — página "Visão macro" (pages/visao-macro.html). Só leitura.
// Para cada orçamento/pedido: em que etapa grande do processo ele está, do contato ao recebimento final.
// Os dados vêm do Dash (ulhoadash /api/externo/visao-macro), que junta Kommo, PDV, Sistema de Produção e Omie;
// o login é o do próprio PDV. Prazo de cada etapa: Ajustes → "Visão macro: prazo de cada etapa" (CFG.visaoMacroPrazos).
// Desempenho: situação, texto de busca e mês de cada pedido são calculados uma vez ao carregar; a lista desenha
// 100 linhas por vez ("Mostrar mais") e abrir o detalhe mexe só na linha clicada.
(function () {
  const DASH = "https://ulhoadash-2dcdb693d8eb.herokuapp.com";
  const PDV_EDITAR = "editar.html?id=";
  const PRODUCAO = "https://app-producao-b843a894d7ea.herokuapp.com/";
  const DIA = 86400000;
  const POR_VEZ = 100;
  // prazo padrão (dias corridos) de cada etapa; o Recebimento final não tem prazo (é o fim)
  const PRAZOS_PADRAO = [2, 7, 3, 5, 15, 5, 7, 10, 7, 15, 30, 10, 10, 30, null];
  const PARADO_DIAS = 7;
  const CORES = { feito: "#5DCAA5", prazo: "#378ADD", parado: "#EF9F27", atrasado: "#E24B4A", fim: "#3B6D11" };
  const ROTULO = { fim: "recebido", atrasado: "atrasado", parado: "parado", prazo: "no prazo" };

  let dados = null, modo = "linha", filtro = { sit: "", vend: "", mes: "", busca: "" }, erro = "";
  let PZ = PRAZOS_PADRAO.slice(), visiveis = [], mostrando = POR_VEZ, porLead = new Map();
  try { modo = localStorage.getItem("ulhoa_vm_modo") === "kanban" ? "kanban" : "linha"; } catch (_) {}

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");
  const fmtCurto = (ms) => { if (!ms) return ""; const d = new Date(ms); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
  const nomeCurto = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  const mesDe = (ms) => (ms ? new Date(ms).toISOString().slice(0, 7) : "");
  const nomeMes = (m) => { const [a, mm] = m.split("-"); return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(mm) - 1] + "/" + a; };
  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // prazos: lidos uma vez (a cópia do CFG é cara) e de novo quando as configurações do servidor chegam
  function lerPrazos() {
    let cfg = null;
    try { cfg = window.CFG?.visaoMacroPrazos || JSON.parse(localStorage.getItem("ulhoa_cfg_v1") || "null")?.visaoMacroPrazos; } catch (_) {}
    PZ = PRAZOS_PADRAO.map((p, i) => (cfg && cfg[i] !== undefined && cfg[i] !== null && cfg[i] !== "" ? Number(cfg[i]) : p));
  }
  function situacao(p) {
    if (p.atual === dados.etapas.length - 1) return "fim";
    const pz = PZ[p.atual];
    if (pz != null && p.diasNaEtapa != null && p.diasNaEtapa > pz) return "atrasado";
    if (p.diasSemMovimento != null && p.diasSemMovimento >= PARADO_DIAS) return "parado";
    return "prazo";
  }
  // calcula uma vez por pedido o que os filtros usam
  function preparar() {
    porLead = new Map();
    for (const p of dados.pedidos) {
      p._sit = situacao(p);
      p._vend = nomeCurto(p.vendedor);
      p._mes = mesDe(p.emissao);
      p._busca = semAcento([p.pedido, p.orcamento, p.nome, p.cliente, p.vendedor, p.lead].join(" "));
      porLead.set(p.lead, p);
    }
  }

  async function carregar(forcar) {
    erro = "";
    $("vm-corpo").innerHTML = `<div class="vm-vazio">Carregando Kommo, PDV, produção e Omie…</div>`;
    try {
      const r = await fetch(`${DASH}/api/externo/visao-macro${forcar ? "?refresh=1" : ""}`, {
        headers: { Authorization: "Bearer " + (localStorage.getItem("token") || localStorage.getItem("accessToken") || "") },
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "HTTP " + r.status);
      dados = b;
      lerPrazos();
      preparar();
    } catch (e) {
      erro = e.message || "falha";
    }
    montarFiltros();
    render();
  }

  function montarFiltros() {
    if (!dados) return;
    const vends = [...new Set(dados.pedidos.map((p) => p._vend).filter(Boolean))].sort();
    const meses = [...new Set(dados.pedidos.map((p) => p._mes).filter(Boolean))].sort().reverse();
    $("vm-vend").innerHTML = `<option value="">Todos os vendedores</option>` + vends.map((v) => `<option${v === filtro.vend ? " selected" : ""}>${esc(v)}</option>`).join("");
    $("vm-mes").innerHTML = `<option value="">Emitidos em: todos</option>` + meses.map((m) => `<option value="${m}"${m === filtro.mes ? " selected" : ""}>${nomeMes(m)}</option>`).join("");
  }

  function lista(semSit) {
    const q = semAcento(filtro.busca);
    return dados.pedidos.filter((p) =>
      (!filtro.vend || p._vend === filtro.vend) && (!filtro.mes || p._mes === filtro.mes) &&
      (!q || p._busca.includes(q)) && (semSit || !filtro.sit || p._sit === filtro.sit));
  }

  function render() {
    const corpo = $("vm-corpo");
    if (erro) { corpo.innerHTML = `<div class="vm-vazio vm-erro">Não foi possível carregar a visão macro: ${esc(erro)} <button class="vm-btn" onclick="VM.recarregar()">Tentar de novo</button></div>`; return; }
    if (!dados) return;
    const base = lista(true);
    const cont = { "": base.length, atrasado: 0, parado: 0, prazo: 0, fim: 0 };
    for (const p of base) cont[p._sit]++;
    document.querySelectorAll(".vm-chip").forEach((b) => {
      const s = b.dataset.sit;
      b.classList.toggle("on", s === filtro.sit);
      b.querySelector("b").textContent = cont[s] ?? 0;
    });
    const ult = dados.etapas.length - 1;
    const fins = dados.pedidos.filter((p) => p.etapas[0] && p.etapas[ult]);
    const media = fins.length ? Math.round(fins.reduce((s, p) => s + (p.etapas[ult].em - p.etapas[0].em), 0) / fins.length / DIA) : null;
    $("vm-kpis").innerHTML = `
      <div><span>Em andamento</span><b>${base.length - cont.fim}</b></div>
      <div><span>Passaram do prazo</span><b style="color:#dc2626">${cont.atrasado}</b></div>
      <div><span>Parados há ${PARADO_DIAS}+ dias</span><b style="color:#b45309">${cont.parado}</b></div>
      <div><span>Contato ao recebimento</span><b>${media != null ? media + " d" : "—"}</b><small>${fins.length ? "média de " + fins.length + " recebidos" : "nenhum recebido no período"}</small></div>`;
    $("vm-info").textContent = `Atualizado às ${new Date(dados.geradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    $("bt-linha").classList.toggle("on", modo === "linha");
    $("bt-kanban").classList.toggle("on", modo === "kanban");
    visiveis = lista(false);
    mostrando = POR_VEZ;
    if (!visiveis.length) { corpo.innerHTML = `<div class="vm-vazio">Nenhum pedido com estes filtros.</div>`; return; }
    corpo.innerHTML = modo === "kanban" ? kanbanHtml(visiveis) : cabecalhoHtml() + `<div id="vm-linhas">${visiveis.slice(0, mostrando).map(linhaHtml).join("")}</div>` + maisHtml() + legendaHtml();
  }

  function corEtapa(p, i) {
    if (i < p.atual) return p.etapas[i] ? CORES.feito : "";
    if (i > p.atual) return "";
    return p._sit === "fim" ? CORES.fim : CORES[p._sit];
  }
  const cabecalhoHtml = () => `<div class="vm-cab"><div></div><div class="vm-track vm-hd">${dados.etapas.map((n) => `<span title="${esc(n)}">${esc(n)}</span>`).join("")}</div></div>`;
  const maisHtml = () => (visiveis.length > mostrando ? `<button class="vm-btn vm-mais" id="vm-mais" onclick="VM.mais()">Mostrar mais ${Math.min(POR_VEZ, visiveis.length - mostrando)} de ${visiveis.length - mostrando} restantes</button>` : "");
  const legendaHtml = () => `<div class="vm-leg">
      <span><i style="background:${CORES.feito}"></i>Etapa concluída</span><span><i class="pulada"></i>Sem data registrada</span>
      <span><i style="background:${CORES.prazo}"></i>Etapa atual no prazo</span><span><i style="background:${CORES.parado}"></i>Parado</span>
      <span><i style="background:${CORES.atrasado}"></i>Passou do prazo</span><span><i style="background:#e2e8f0"></i>Ainda não chegou</span></div>`;

  function linhaHtml(p) {
    const E = dados.etapas, sit = p._sit, pz = PZ[p.atual];
    let track = "";
    for (let i = 0; i < E.length; i++) {
      const c = corEtapa(p, i), pulada = i < p.atual && !p.etapas[i];
      track += `<i class="${pulada ? "pulada" : ""}"${c ? ` style="background:${c}"` : ""} title="${esc(E[i])}"></i>`;
    }
    const titulo = p.pedido ? "Pedido " + p.pedido : p.orcamento ? "Orçamento " + p.orcamento : "Card #" + p.lead;
    return `<div class="vm-row" data-lead="${p.lead}" onclick="VM.abrir(${p.lead})">
        <div class="vm-id">
          <div class="vm-tit">${esc(titulo)} <span class="vm-tag t-${sit}">${ROTULO[sit]}</span></div>
          <div class="vm-sub">${esc(p.cliente || p.nome)}${p._vend ? " · " + esc(p._vend) : ""}</div>
        </div>
        <div>
          <div class="vm-track">${track}</div>
          <div class="vm-atual"><b>${esc(E[p.atual])}</b> desde ${fmtCurto(p.desde) || "—"} · <b>${p.diasNaEtapa ?? "—"} dia${p.diasNaEtapa === 1 ? "" : "s"}</b>${pz != null && sit !== "fim" ? ` de ${pz}` : ""} · ${esc(p.responsavel || "—")}${sit === "parado" ? ` · sem mudança há ${p.diasSemMovimento} dias` : ""}</div>
        </div>
      </div>`;
  }

  function detalheHtml(p) {
    const E = dados.etapas;
    const kommo = `https://${dados.dominioKommo || "ferreiraulhoacrm.kommo.com"}/leads/detail/${p.lead}`;
    let linhas = "";
    for (let i = 0; i < E.length; i++) {
      const e = p.etapas[i], prox = p.etapas.slice(i + 1).find(Boolean);
      const dias = e ? Math.floor(((i === p.atual ? Date.now() : prox ? prox.em : e.em) - e.em) / DIA) : null;
      linhas += `<tr class="${i === p.atual ? "atual" : e ? "" : "vazia"}"><td>${esc(E[i])}</td><td>${e ? fmt(e.em) : "—"}</td><td class="n">${dias != null && i <= p.atual ? dias + " d" : "—"}</td><td class="n">${PZ[i] != null ? PZ[i] + " d" : "—"}</td><td class="m">${e ? esc(e.fonte) : ""}</td></tr>`;
    }
    return `<div class="vm-det" onclick="event.stopPropagation()">
      <div class="vm-links">
        <a class="vm-btn" href="${kommo}" target="_blank" rel="noopener"><span class="material-icons-outlined">open_in_new</span> Kommo</a>
        ${p.proposta ? `<a class="vm-btn" href="${PDV_EDITAR}${encodeURIComponent(p.proposta)}" target="_blank" rel="noopener"><span class="material-icons-outlined">description</span> Proposta no PDV</a>` : ""}
        ${p.atual >= 10 ? `<a class="vm-btn" href="${PRODUCAO}" target="_blank" rel="noopener"><span class="material-icons-outlined">precision_manufacturing</span> Sistema de Produção</a>` : ""}
        <span class="vm-m">Kommo: ${esc(p.funilAtual)} · ${esc(p.etapaKommo)}${p.cards && p.cards.length > 1 ? ` · ${p.cards.length} cards juntados` : ""}${p.recebimento ? ` · Omie: ${p.recebimento.pagas}/${p.recebimento.parcelas} parcelas recebidas` : ""}</span>
      </div>
      <table class="vm-tb"><thead><tr><th>Etapa</th><th>Entrada</th><th class="n">Dias na etapa</th><th class="n">Prazo</th><th>De onde veio a data</th></tr></thead><tbody>${linhas}</tbody></table>
    </div>`;
  }

  function kanbanHtml(ps) {
    const E = dados.etapas, MAX = 40;
    const cols = E.map(() => []);
    for (const p of ps) cols[p.atual].push(p);
    return `<div class="vm-kb">${E.map((n, i) => `<div class="vm-col"><h4><span>${esc(n)}</span><b>${cols[i].length}</b></h4>${cols[i].slice(0, MAX).map((p) =>
      `<div class="vm-card c-${p._sit}" onclick="VM.abrirKanban(${p.lead})" title="Abrir na linha do tempo">
          <div class="vm-tit">${esc(p.pedido ? p.pedido : p.orcamento ? "Orç " + p.orcamento : "#" + p.lead)}</div>
          <div class="vm-sub">${esc(p.cliente || p.nome)}</div>
          <div class="vm-sub">${p.diasNaEtapa ?? "—"} d · ${esc(p._vend || p.responsavel || "")}</div></div>`).join("")}${cols[i].length > MAX ? `<div class="vm-m" style="padding:4px 2px">+${cols[i].length - MAX} (use a busca ou os filtros)</div>` : ""}${cols[i].length ? "" : `<div class="vm-m" style="padding:6px 2px">—</div>`}</div>`).join("")}</div>`;
  }

  // abre/fecha o detalhe só na linha clicada (sem redesenhar a lista)
  function alternarDetalhe(lead) {
    const linha = document.querySelector(`.vm-row[data-lead="${lead}"]`);
    if (!linha) return;
    const aberta = linha.classList.contains("aberto");
    document.querySelectorAll(".vm-row.aberto").forEach((r) => { r.classList.remove("aberto"); r.nextElementSibling?.classList.contains("vm-det") && r.nextElementSibling.remove(); });
    if (!aberta) { linha.classList.add("aberto"); linha.insertAdjacentHTML("afterend", detalheHtml(porLead.get(lead))); }
  }

  let tBusca = null;
  window.VM = {
    recarregar: () => carregar(true),
    modo: (m) => { modo = m; try { localStorage.setItem("ulhoa_vm_modo", m); } catch (_) {} render(); },
    sit: (s) => { filtro.sit = s; render(); },
    abrir: (lead) => alternarDetalhe(lead),
    abrirKanban: (lead) => {
      modo = "linha";
      // garante que a linha está entre as desenhadas
      filtro.busca = String(lead); $("vm-busca").value = String(lead);
      render(); alternarDetalhe(lead);
      document.querySelector(".vm-row.aberto")?.scrollIntoView({ block: "center" });
    },
    mais: () => {
      const de = mostrando; mostrando += POR_VEZ;
      $("vm-linhas").insertAdjacentHTML("beforeend", visiveis.slice(de, mostrando).map(linhaHtml).join(""));
      const b = $("vm-mais"); if (b) b.outerHTML = maisHtml();
    },
    filtrar: () => { filtro.vend = $("vm-vend").value; filtro.mes = $("vm-mes").value; render(); },
    buscar: () => { clearTimeout(tBusca); tBusca = setTimeout(() => { filtro.busca = $("vm-busca").value.trim(); render(); }, 120); },
  };
  document.addEventListener("DOMContentLoaded", () => {
    carregar(false);
    // configurações do servidor (prazos) chegam depois do cache local
    setTimeout(() => { if (!dados) return; lerPrazos(); preparar(); render(); }, 2000);
  });
})();
