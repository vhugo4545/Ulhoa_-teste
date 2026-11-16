// notificacoesAprovador.js — central de aprovações na listagem (popup laranja).
// Junta todos os pedidos num só lugar:
//   - valor e etapa (aprovacoes-valor): para os aprovadores definidos em Ajustes;
//     todos veem, só o responsável (faixa do total ou principal) decide;
//   - produto desatualizado na Omie (aprovacoes-produto), valor mínimo (aprovacoes-minimo)
//     e status do PDV pendente: para admins.
// Aba Histórico: tudo que já foi decidido, com a justificativa de quem pediu e a observação de quem decidiu.
// Quem pediu (sem ser aprovador nem admin): popup avisando quando o pedido foi aprovado ou negado.

(function () {
  const CFG_URL     = "https://utils-b488312867a6.herokuapp.com/api/configuracoes";
  const API_BASE    = "https://ulhoa-0a02024d350a.herokuapp.com/api";
  const API = {
    valor:   `${API_BASE}/aprovacoes-valor`,
    produto: `${API_BASE}/aprovacoes-produto`,
    minimo:  `${API_BASE}/aprovacoes-minimo`,
  };
  const STATUS_PDV_PENDENTE = "Pendente de aprovação";
  const POLL_INTERVAL = 20000;
  const LS_VISTOS    = "lv_aprov_vistos";     // ids de pendentes já mostrados ao aprovador
  const LS_DECISOES  = "lv_decisoes_vistas";  // ids de decisões já mostradas ao solicitante

  const emailUsuario = (localStorage.getItem("usuarioEmail") || "").toLowerCase();
  const nomeUsuario  = localStorage.getItem("usuarioNome") || "";
  const tipoUsuario  = localStorage.getItem("usuarioTipo") || "";
  const idUsuario    = (() => {
    try {
      const t = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
      const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p?.id ? String(p.id) : "";
    } catch { return ""; }
  })();
  if (!emailUsuario && !idUsuario) return;
  const ehAdmin = tipoUsuario === "admin";
  // Ajustes → Perfis (permissoes.js); sem ele, vale a regra antiga: só admin
  let cfgAtual = null;
  const pode = acao => window.Permissoes ? window.Permissoes.pode(acao, cfgAtual || undefined) : ehAdmin;
  const decideExcecoes = () => pode("liberarExcecoes");   // produto desatualizado e valor mínimo
  const aprovaStatus   = () => pode("aprovarOrcamento");  // status do PDV pendente

  const fmtBRL = n => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = d => d ? new Date(d).toLocaleString("pt-BR") : "";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lerSet = k => { try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch { return new Set(); } };
  const gravarSet = (k, set) => { try { localStorage.setItem(k, JSON.stringify([...set].slice(-300))); } catch {} };

  async function obterConfig() {
    try {
      const r = await fetch(CFG_URL);
      if (r.ok) return await r.json();
    } catch (_) {}
    try { return JSON.parse(localStorage.getItem("ulhoa_cfg_v1")); } catch { return null; }
  }

  // Responsável pelo pedido: o aprovador da faixa de valor que contém o total (a de maior "de"
  // se houver sobreposição). Sem faixa, ou em pedido de etapa (sem total), o aprovador principal.
  // Mesma regra do servidor (aprovacaoValorController.js)
  function responsavelPedido(lv, total) {
    const t = Number(total);
    const faixa = t > 0
      ? (lv?.faixas || [])
          .filter(f => f?.aprovadorId && t >= (Number(f.de) || 0) && (!(Number(f.ate) > 0) || t <= Number(f.ate)))
          .sort((a, b) => (Number(b.de) || 0) - (Number(a.de) || 0))[0]
      : null;
    const f = faixa || lv || {};
    return { id: String(f.aprovadorId || ""), nome: f.aprovadorNome || "o aprovador", email: (f.aprovadorEmail || "").toLowerCase() };
  }

  // Todos os aprovadores (principal e das faixas) recebem os avisos dos pedidos
  const aprovadoresDe = lv => [lv, ...(lv?.faixas || [])]
    .filter(a => a?.aprovadorId || a?.aprovadorEmail)
    .map(a => ({ id: String(a.aprovadorId || ""), email: (a.aprovadorEmail || "").toLowerCase() }));
  const souEu = a => (!!idUsuario && a.id === idUsuario) || (!!emailUsuario && !!a.email && a.email === emailUsuario);

  async function buscar(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch (_) { return null; }
  }

  // Cada pedido vira { origem, doc }: valor | etapa | produto | minimo | status
  const origemValor = d => (d.tipo === "etapa" ? "etapa" : d.tipo === "porcentagem" ? "porcentagem" : "valor");
  const ROTULO = { valor: "Valor acima do limite", etapa: "Etapa da Kommo", porcentagem: "Porcentagem mínima", produto: "Produto desatualizado", minimo: "Valor mínimo", status: "Status do PDV" };
  const fmtPct = n => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  const urlEditar = d => `editar.html?id=${encodeURIComponent(d.propostaId || d._id)}`;
  const urlModelo = d => `modelo.html?id=${encodeURIComponent(d.propostaId || d._id)}`;

  // ── Avisos fora da página (aba em segundo plano) ──────────────────────────
  const tituloOriginal = document.title;
  function marcarTitulo(n) {
    document.title = n ? `(${n}) ${tituloOriginal}` : tituloOriginal;
  }

  function notificarSistema(titulo, corpo, url) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const n = new Notification(titulo, { body: corpo, tag: "lv-aprov" });
      n.onclick = () => { window.focus(); if (url) location.href = url; n.close(); };
    } catch (_) {}
  }

  function bip() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.18);
    } catch (_) {}
  }

  // ── Textos de um pedido ───────────────────────────────────────────────────
  const etiqueta = (origem, cor = "#7c2d12", bg = "#ffedd5") =>
    `<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 8px;border-radius:999px;background:${bg};color:${cor};">${ROTULO[origem]}</span>`;

  function destaque(origem, d) {
    if (origem === "etapa")   return "Etapa: " + esc(d.nomeEtapa || d.statusId);
    if (origem === "porcentagem") { const n = (d.detalhes || []).length; return n === 1 ? "1 referencial abaixo" : `${n} referenciais abaixo`; }
    if (origem === "valor")   return fmtBRL(d.valorTotal);
    if (origem === "produto") return `${(d.produtos || []).length} produto(s)`;
    if (origem === "minimo")  return fmtBRL(d.valorFinal);
    return "Aguardando aprovação";
  }

  function descricao(origem, d) {
    if (origem === "etapa")   return "Desbloqueio da etapa da Kommo";
    if (origem === "porcentagem") return "Porcentagem abaixo da mínima do produto (proposta modelo)";
    if (origem === "valor")   return `Valor acima do limite de ${fmtBRL(d.valorLimite)}`;
    if (origem === "produto") return `Liberação do PDF · produtos alterados na Omie há mais de ${d.limiteDias || "—"} dias`;
    if (origem === "minimo")  return `Abaixo do valor mínimo de ${fmtBRL(d.valorMinimo)}`;
    return `Status do orçamento no PDV pendente de aprovação${d.updatedAt ? " · atualizado em " + fmtData(d.updatedAt) : ""}`;
  }

  // Porcentagem mínima: produto, referencial, atual e mínimo
  function listaPorcentagens(d) {
    const it = d.detalhes || [];
    if (!it.length) return "";
    return `<ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:#64748b;">${
      it.slice(0, 5).map(x => `<li>${esc(x.produto)}: ${esc(x.label)} <b>${fmtPct(x.atual)}</b> (mínimo ${fmtPct(x.minimo)})</li>`).join("")
    }${it.length > 5 ? `<li>… e mais ${it.length - 5}</li>` : ""}</ul>`;
  }

  function listaProdutos(d) {
    const prods = d.produtos || [];
    if (!prods.length) return "";
    return `<ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:#64748b;">${
      prods.slice(0, 3).map(p => `<li>${esc(p.descricao)} · ${esc(p.dataAlt)} (${p.dias} dias)</li>`).join("")
    }${prods.length > 3 ? `<li>… e mais ${prods.length - 3}</li>` : ""}</ul>`;
  }

  function escopoDecisao(origem, d) {
    if (d.status !== "aprovado") return "";
    if (origem === "etapa")   return d.modo === "sempre" ? " em qualquer etapa" : ` na etapa ${esc(d.nomeEtapa || "")}`;
    if (origem === "valor")   return d.modo === "sempre" ? " para qualquer valor" : ` até ${fmtBRL(d.valorAprovado)}`;
    if (origem === "porcentagem") return " enquanto as porcentagens não baixarem";
    if (origem === "produto") return " · PDF liberado";
    return "";
  }

  // Card de um pedido já decidido (histórico e aviso ao solicitante)
  function htmlDecidido({ origem, doc: d }) {
    const ok = d.status === "aprovado";
    const cliente = d.nomeCliente || "Cliente";
    return `
      <div class="lv-item" style="border-left:4px solid ${ok ? "#22c55e" : "#ef4444"};">
        <div class="lv-top">
          <span class="lv-nome">${esc(d.numeroProposta || "Sem número")} · ${esc(cliente)}</span>
          <span class="lv-valor" style="color:${ok ? "#16a34a" : "#b91c1c"};">${ok ? "✅ Liberado" : "⛔ Negado"}</span>
        </div>
        <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          ${etiqueta(origem, "#475569", "#f1f5f9")}
          <span class="lv-meta" style="margin:0;">${destaque(origem, d)} · ${descricao(origem, d)}</span>
        </div>
        ${origem === "produto" ? listaProdutos(d) : origem === "porcentagem" ? listaPorcentagens(d) : ""}
        <div class="lv-meta">Pedido por ${esc(d.solicitante || "—")} em ${fmtData(d.dataHora)}</div>
        ${d.justificativa ? `<div class="lv-meta" style="color:#334155;">💬 ${esc(d.justificativa)}</div>` : ""}
        <div class="lv-meta" style="color:#334155;font-weight:600;">${ok ? "Liberado" : "Negado"}${escopoDecisao(origem, d)} por ${esc(d.aprovador || "—")} em ${fmtData(d.dataAprovacao)}</div>
        ${d.observacao ? `<div class="lv-meta" style="color:#334155;">📝 Obs.: ${esc(d.observacao)}</div>` : ""}
        <div class="lv-acoes">
          <a href="${origem === "minimo" ? urlModelo(d) : urlEditar(d)}" style="background:#f1f5f9;color:#334155;">Abrir orçamento</a>
        </div>
      </div>`;
  }

  // ── Popup ────────────────────────────────────────────────────────────────
  function criarUI() {
    const wrap = document.createElement("div");
    wrap.id = "lv-aprov";
    wrap.innerHTML = `
      <style>
        #lv-aprov-pill{position:fixed;right:24px;bottom:30px;z-index:99997;display:none;align-items:center;gap:8px;
          background:#c2410c;color:#fff;border:none;border-radius:999px;padding:10px 16px;font-family:inherit;font-size:13px;font-weight:600;
          box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}
        #lv-aprov-overlay{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;
          background:rgba(15,23,42,.5);padding:16px}
        #lv-aprov-modal{background:#fff;border-radius:14px;width:min(660px,100%);max-height:85vh;display:flex;flex-direction:column;
          box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit;color:#1e293b;overflow:hidden}
        #lv-aprov-modal header{display:flex;align-items:center;gap:10px;padding:16px 20px;background:#fff7ed;border-bottom:1px solid #fed7aa}
        #lv-aprov-modal header h3{margin:0;font-size:16px;font-weight:700;color:#7c2d12;flex:1}
        #lv-aprov-abas{display:none;gap:4px;padding:8px 20px 0;border-bottom:1px solid #f1f5f9;align-items:flex-end}
        .lv-aba{border:none;background:none;padding:8px 12px;font-family:inherit;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;
          border-bottom:2px solid transparent;margin-bottom:-1px}
        .lv-aba.ativa{color:#c2410c;border-bottom-color:#c2410c}
        #lv-aprov-filtro{margin-left:auto;margin-bottom:6px;font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-family:inherit;color:#334155;background:#fff}
        #lv-aprov-lista{overflow:auto;padding:12px 20px;display:flex;flex-direction:column;gap:10px}
        .lv-item{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}
        .lv-item.novo{border-color:#fb923c;box-shadow:0 0 0 2px #ffedd5}
        .lv-item .lv-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}
        .lv-item .lv-nome{font-weight:700;font-size:14px}
        .lv-item .lv-valor{font-weight:700;color:#c2410c;font-size:15px}
        .lv-item .lv-meta{color:#64748b;font-size:12px;margin-top:3px}
        .lv-acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
        .lv-acoes button,.lv-acoes a{padding:7px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;
          font-family:inherit;border:1px solid transparent;text-decoration:none;display:inline-flex;align-items:center}
        .lv-motivo{display:none;margin-top:8px;gap:6px}
        .lv-motivo input{flex:1;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit}
        #lv-aprov-modal footer{display:flex;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid #f1f5f9;flex-wrap:wrap}
        #lv-aprov-modal footer .lv-dica{flex:1;font-size:11px;color:#64748b}
      </style>
      <button type="button" id="lv-aprov-pill">
        <span class="material-icons-outlined" style="font-size:18px;">price_check</span>
        <span id="lv-aprov-pill-txt"></span>
      </button>
      <div id="lv-aprov-overlay" role="dialog" aria-modal="true" aria-labelledby="lv-aprov-titulo">
        <div id="lv-aprov-modal">
          <header>
            <span class="material-icons-outlined" style="color:#c2410c;">price_check</span>
            <h3 id="lv-aprov-titulo"></h3>
            <button type="button" id="lv-aprov-fechar" aria-label="Fechar"
              style="border:none;background:none;cursor:pointer;color:#64748b;display:flex;">
              <span class="material-icons-outlined">close</span>
            </button>
          </header>
          <div id="lv-aprov-abas">
            <button type="button" class="lv-aba ativa" data-aba="pendentes">Pendentes</button>
            <button type="button" class="lv-aba" data-aba="historico">Histórico</button>
            <select id="lv-aprov-filtro" style="display:none;" aria-label="Filtrar histórico">
              <option value="todas">Todas as decisões</option>
              <option value="minhas">Só as minhas</option>
            </select>
          </div>
          <div id="lv-aprov-lista"></div>
          <footer>
            <span class="lv-dica" id="lv-aprov-dica"></span>
            <button type="button" id="lv-aprov-notif" style="display:none;padding:7px 12px;border:1px solid #fdba74;border-radius:8px;background:#fff7ed;color:#c2410c;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">
              Ativar avisos no computador
            </button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const ui = {
      pill: wrap.querySelector("#lv-aprov-pill"),
      pillTxt: wrap.querySelector("#lv-aprov-pill-txt"),
      overlay: wrap.querySelector("#lv-aprov-overlay"),
      titulo: wrap.querySelector("#lv-aprov-titulo"),
      abas: wrap.querySelector("#lv-aprov-abas"),
      filtro: wrap.querySelector("#lv-aprov-filtro"),
      lista: wrap.querySelector("#lv-aprov-lista"),
      dica: wrap.querySelector("#lv-aprov-dica"),
      notif: wrap.querySelector("#lv-aprov-notif"),
    };
    ui.abrir  = () => { ui.overlay.style.display = "flex"; };
    ui.fechar = () => { ui.overlay.style.display = "none"; ui.aoFechar?.(); };
    ui.pill.addEventListener("click", () => ui.abrir());
    wrap.querySelector("#lv-aprov-fechar").addEventListener("click", ui.fechar);
    ui.overlay.addEventListener("click", e => { if (e.target === ui.overlay) ui.fechar(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && ui.overlay.style.display === "flex") ui.fechar(); });

    if ("Notification" in window && Notification.permission === "default") {
      ui.notif.style.display = "";
      ui.notif.addEventListener("click", async () => {
        const p = await Notification.requestPermission();
        if (p !== "default") ui.notif.style.display = "none";
      });
    }
    return ui;
  }

  // ── Central de aprovações (aprovadores e admins) ──────────────────────────
  function iniciarCentral(lv) {
    const ui = criarUI();
    const vistos = lerSet(LS_VISTOS);
    let pendentes = [];      // [{ origem, doc }]
    let historico = [];
    let novosIds = new Set();
    let aba = "pendentes";

    const souAprovador = () => aprovadoresDe(lv).some(souEu);

    ui.abas.style.display = "flex";
    ui.abas.addEventListener("click", e => {
      const b = e.target.closest(".lv-aba");
      if (!b) return;
      aba = b.dataset.aba;
      ui.abas.querySelectorAll(".lv-aba").forEach(x => x.classList.toggle("ativa", x === b));
      ui.filtro.style.display = aba === "historico" ? "" : "none";
      if (aba === "historico") carregarHistorico(); else render();
    });
    ui.filtro.addEventListener("change", render);
    ui.abrir = (() => { const abrir = ui.abrir; return () => { abrir(); render(); }; })();
    ui.aoFechar = () => {
      pendentes.forEach(p => vistos.add(p.doc._id)); gravarSet(LS_VISTOS, vistos);
      novosIds = new Set(); render();
    };

    async function decidir(origem, id, status, modo, observacao) {
      const url = origem === "valor" || origem === "etapa" || origem === "porcentagem" ? API.valor : API[origem];
      const r = await fetch(`${url}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, modo, observacao, aprovador: nomeUsuario || emailUsuario }),
      }).catch(() => null);
      if (!r?.ok) {
        const err = await r?.json().catch(() => null);
        alert(err?.error || "Erro ao salvar a decisão.");
        return;
      }
      vistos.add(id); gravarSet(LS_VISTOS, vistos);
      historico = [];
      await atualizar();
    }

    function botoesDecisao(origem, d) {
      const negar = `<button type="button" data-a="negar" style="background:#fff;color:#b91c1c;border-color:#fca5a5;">Negar</button>`;
      if (origem === "valor" || origem === "etapa" || origem === "porcentagem") {
        // Todos veem o pedido, mas só o responsável (faixa do total ou principal) decide
        const resp = responsavelPedido(lv, origem === "valor" ? d.valorTotal : undefined);
        if (!souEu(resp)) {
          return `<span style="padding:7px 12px;border-radius:8px;font-size:12px;font-weight:600;background:#f1f5f9;color:#475569;display:inline-flex;align-items:center;gap:5px;"><span class="material-icons-outlined" style="font-size:15px;">person</span>Quem decide: ${esc(resp.nome)}</span>`;
        }
        if (origem === "porcentagem") return `<button type="button" data-a="porcentagem" style="background:#16a34a;color:#fff;">Liberar</button>${negar}`;
        return `<button type="button" data-a="sempre" style="background:#16a34a;color:#fff;">Liberar para sempre</button>
          ${origem === "etapa"
            ? `<button type="button" data-a="etapa" style="background:#0f766e;color:#fff;">Liberar só nesta etapa</button>`
            : `<button type="button" data-a="valor" style="background:#0f766e;color:#fff;">Liberar até ${fmtBRL(d.valorTotal)}</button>`}
          ${negar}`;
      }
      if (origem === "produto") return `<button type="button" data-a="aprovar" style="background:#16a34a;color:#fff;">Liberar o PDF</button>${negar}`;
      if (origem === "minimo")  return `<button type="button" data-a="aprovar" style="background:#16a34a;color:#fff;">Aprovar</button>${negar}`;
      return "";
    }

    function htmlPendente({ origem, doc: d }) {
      const novo = novosIds.has(d._id);
      const link = origem === "status"
        ? `<a href="${urlModelo(d)}" style="background:#1e40af;color:#fff;margin-left:auto;">Ver e aprovar</a>`
        : `<a href="${origem === "minimo" ? urlModelo(d) : urlEditar(d)}" style="background:#f1f5f9;color:#334155;margin-left:auto;">Abrir orçamento</a>`;
      const numero = origem === "status" ? (d.camposFormulario?.numero || d.numero || d.numeroProposta) : d.numeroProposta;
      const cliente = origem === "status"
        ? (d.camposFormulario?.clientes?.[0]?.nome_razao_social || d.camposFormulario?.nomeCliente || d.nomeCliente)
        : d.nomeCliente;
      return `
        <div class="lv-top">
          <span class="lv-nome">${esc(numero || "Sem número")} · ${esc(cliente || "Cliente")}${novo ? ' <span style="font-size:10px;background:#c2410c;color:#fff;border-radius:999px;padding:1px 7px;vertical-align:middle;">NOVO</span>' : ""}</span>
          <span class="lv-valor">${destaque(origem, d)}</span>
        </div>
        <div style="margin-top:4px;">${etiqueta(origem)}</div>
        <div class="lv-meta">${descricao(origem, d)}${d.solicitante ? ` · pedido por ${esc(d.solicitante)} em ${fmtData(d.dataHora)}` : ""}</div>
        ${origem === "produto" ? listaProdutos(d) : origem === "porcentagem" ? listaPorcentagens(d) : ""}
        ${d.justificativa ? `<div class="lv-meta" style="color:#334155;">💬 ${esc(d.justificativa)}</div>` : ""}
        <div class="lv-acoes">${botoesDecisao(origem, d)}${link}</div>
        <div class="lv-motivo">
          <input type="text" placeholder="Motivo da negativa (aparece para quem pediu)">
          <button type="button" data-a="confirmar-negar" style="padding:7px 12px;border-radius:8px;border:none;background:#b91c1c;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Confirmar</button>
        </div>`;
    }

    function render() {
      const n = pendentes.length;
      ui.pill.style.display = n ? "inline-flex" : "none";
      ui.pillTxt.textContent = n === 1 ? "1 aprovação pendente" : `${n} aprovações pendentes`;
      marcarTitulo(n);
      ui.abas.querySelector('[data-aba="pendentes"]').textContent = n ? `Pendentes (${n})` : "Pendentes";

      if (aba === "historico") {
        ui.titulo.textContent = "Histórico de aprovações";
        ui.dica.textContent = "💬 justificativa de quem pediu · 📝 observação de quem decidiu.";
        const minhas = ui.filtro.value === "minhas";
        const lista = historico.filter(({ doc: d }) => !minhas
          || (!!idUsuario && String(d.aprovadorId || "") === idUsuario)
          || (!!nomeUsuario && (d.aprovador || "").trim().toLowerCase() === nomeUsuario.trim().toLowerCase()));
        ui.lista.innerHTML = lista.length
          ? lista.slice(0, 150).map(htmlDecidido).join("")
          : `<div style="padding:24px;text-align:center;color:#64748b;font-size:13px;">${historico.carregando ? "Carregando…" : "Nenhuma decisão ainda."}</div>`;
        return;
      }

      ui.titulo.textContent = n
        ? (n === 1 ? "1 pedido aguardando aprovação" : `${n} pedidos aguardando aprovação`)
        : "Nenhuma aprovação pendente";
      ui.dica.textContent = "Valor: \"até o valor\" trava de novo se o total subir. Etapa: \"só nesta etapa\" trava de novo se o lead mudar para outra etapa bloqueada.";

      if (!n) {
        ui.lista.innerHTML = `<div style="padding:24px;text-align:center;color:#64748b;font-size:13px;">Tudo em dia ✅</div>`;
        return;
      }
      ui.lista.innerHTML = "";
      pendentes.forEach(p => {
        const d = p.doc;
        const item = document.createElement("div");
        item.className = "lv-item" + (novosIds.has(d._id) ? " novo" : "");
        item.innerHTML = htmlPendente(p);
        const motivo = item.querySelector(".lv-motivo");
        item.addEventListener("click", async e => {
          const btn = e.target.closest("button[data-a]");
          if (!btn) return;
          const a = btn.dataset.a;
          if (a === "negar") { motivo.style.display = "flex"; motivo.querySelector("input").focus(); return; }
          item.querySelectorAll("button").forEach(b => b.disabled = true);
          if (a === "confirmar-negar") await decidir(p.origem, d._id, "negado", undefined, motivo.querySelector("input").value.trim());
          else await decidir(p.origem, d._id, "aprovado", a === "aprovar" ? undefined : a);
          item.querySelectorAll("button").forEach(b => b.disabled = false);
        });
        ui.lista.appendChild(item);
      });
    }

    async function carregarHistorico() {
      if (!historico.length) { historico = []; historico.carregando = true; render(); }
      const fontes = [];
      if (souAprovador()) {
        fontes.push(buscar(`${API.valor}?status=aprovado`), buscar(`${API.valor}?status=negado`));
      }
      const excecoes = decideExcecoes();
      if (excecoes) fontes.push(buscar(API.produto), buscar(API.minimo));
      const res = await Promise.all(fontes);
      let i = 0;
      const lista = [];
      if (souAprovador()) {
        [...(res[i++] || []), ...(res[i++] || [])].forEach(d => lista.push({ origem: origemValor(d), doc: d }));
      }
      if (excecoes) {
        (res[i++] || []).forEach(d => lista.push({ origem: "produto", doc: d }));
        (res[i++] || []).forEach(d => lista.push({ origem: "minimo", doc: d }));
      }
      historico = lista
        .filter(({ doc: d }) => d.status === "aprovado" || d.status === "negado")
        .sort((a, b) => new Date(b.doc.dataAprovacao || b.doc.dataHora) - new Date(a.doc.dataAprovacao || a.doc.dataHora));
      render();
    }

    async function atualizar() {
      // Relê a configuração: as faixas e os aprovadores podem mudar em Ajustes
      const cfg = await obterConfig();
      if (cfg) cfgAtual = cfg;
      if (cfg?.limiteValor) lv = cfg.limiteValor;

      const [valor, produto, minimo, propostas] = await Promise.all([
        souAprovador() ? buscar(`${API.valor}?status=pendente`) : [],
        decideExcecoes() ? buscar(`${API.produto}?status=pendente`) : [],
        decideExcecoes() ? buscar(`${API.minimo}?status=pendente`) : [],
        aprovaStatus() ? buscar(`${API_BASE}/propostas`) : [],
      ]);
      if (valor === null && produto === null && minimo === null) return; // sem conexão: mantém a lista

      pendentes = [
        ...(valor || []).map(d => ({ origem: origemValor(d), doc: d })),
        ...(produto || []).map(d => ({ origem: "produto", doc: d })),
        ...(minimo || []).map(d => ({ origem: "minimo", doc: d })),
      ].sort((a, b) => new Date(b.doc.dataHora) - new Date(a.doc.dataHora));
      // Status do PDV pendente: vai no fim e não dispara aviso (não é um pedido de alguém)
      (propostas || []).filter(p => p.statusOrcamento === STATUS_PDV_PENDENTE)
        .forEach(p => pendentes.push({ origem: "status", doc: p }));

      const novos = pendentes.filter(p => p.origem !== "status" && !vistos.has(p.doc._id));
      novos.forEach(p => novosIds.add(p.doc._id));
      if (aba === "historico") carregarHistorico(); else render();
      if (novos.length) {
        ui.abrir();
        bip();
        const { origem, doc: d } = novos[0];
        notificarSistema(
          novos.length === 1 ? "Novo pedido de aprovação" : `${novos.length} novos pedidos de aprovação`,
          `${d.numeroProposta || ""} ${d.nomeCliente || ""} · ${ROTULO[origem]} · por ${d.solicitante}`.trim(),
          location.href
        );
      }
    }

    atualizar();
    setInterval(atualizar, POLL_INTERVAL);
  }

  // ── Solicitante: avisa quando o pedido foi decidido ───────────────────────
  function iniciarSolicitante() {
    let ui = null;
    const vistas = lerSet(LS_DECISOES);
    let primeira = !localStorage.getItem(LS_DECISOES);

    async function atualizar() {
      const [aprov, neg, produto, minimo] = await Promise.all([
        buscar(`${API.valor}?status=aprovado`), buscar(`${API.valor}?status=negado`),
        buscar(API.produto), buscar(API.minimo),
      ]);
      if (aprov === null && neg === null) return;
      const docs = [
        ...[...(aprov || []), ...(neg || [])].map(d => ({ origem: origemValor(d), doc: d })),
        ...(produto || []).map(d => ({ origem: "produto", doc: d })),
        ...(minimo || []).map(d => ({ origem: "minimo", doc: d })),
      ];
      const minhas = docs.filter(({ doc: d }) =>
        (d.status === "aprovado" || d.status === "negado") && (d.email || "").toLowerCase() === emailUsuario);

      // Primeiro uso: não despeja o histórico inteiro, só marca como visto
      if (primeira) {
        minhas.forEach(p => vistas.add(p.doc._id)); gravarSet(LS_DECISOES, vistas); primeira = false;
        return;
      }
      const novas = minhas.filter(p => !vistas.has(p.doc._id));
      if (!novas.length) return;

      if (!ui) {
        ui = criarUI();
        ui.aoFechar = () => { marcarTitulo(0); };
      }
      novas.forEach(p => vistas.add(p.doc._id)); gravarSet(LS_DECISOES, vistas);
      ui.titulo.textContent = novas.length === 1 ? "Seu pedido de aprovação foi respondido" : `${novas.length} pedidos de aprovação respondidos`;
      ui.dica.textContent = "";
      ui.lista.innerHTML = novas.map(htmlDecidido).join("");
      marcarTitulo(novas.length);
      ui.abrir();
      bip();
      const d = novas[0].doc;
      notificarSistema(
        novas.length === 1 ? `Pedido ${d.status === "aprovado" ? "liberado" : "negado"}` : `${novas.length} pedidos respondidos`,
        `${d.numeroProposta || ""} ${d.nomeCliente || ""}`.trim(),
        location.href
      );
    }

    atualizar();
    setInterval(atualizar, POLL_INTERVAL);
  }

  async function iniciar() {
    const cfg = await obterConfig();
    const lv = cfg?.limiteValor || {};
    // Aprovador (principal ou de faixa) ou admin: central de aprovações; os demais só recebem as respostas
    cfgAtual = cfg;
    if (decideExcecoes() || aprovaStatus() || aprovadoresDe(lv).some(souEu)) iniciarCentral(lv);
    else iniciarSolicitante();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
