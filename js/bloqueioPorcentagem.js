// bloqueioPorcentagem.js — trava o orçamento quando alguma porcentagem de um produto fica abaixo da
// porcentagem mínima cadastrada para esse produto na proposta modelo (totais.js → CFG.percentuaisMinimos),
// até o aprovador principal (Ajustes → Trava por valor) liberar.
// Regra em Ajustes: CFG.regraPorcentagemMinima = { ativo, pdfs: { idDoBotao: true }, bloquearOmie, bloquearSalvar }.
// Desligada por padrão. Admins e gestores não são afetados. A liberação vale enquanto nenhuma porcentagem
// ficar abaixo do que foi aprovado; se baixar mais (ou outro referencial ficar abaixo), trava de novo.
// Os pedidos usam a mesma API da trava por valor, com tipo "porcentagem" (notificacoesAprovador.js).

(function () {
  const API_APROV = "https://ulhoa-0a02024d350a.herokuapp.com/api/aprovacoes-valor";
  const ID_MODELO = "68746e305b9691a7ed3b3f97";
  const TICK_MS = 1500;
  const CARGA_MAX_MS = 20000;

  const TODOS_PDFS = ["btn-visualizar-proposta", "btn-folhas-impressao", "btn-folha-ordem-servico", "btn-etapas-processo", "btn-historico-producao"];

  // Referenciais: mesmas porcentagens dos cartões do Resumo de cada produto (gerarHtmlTotalizador, totais.js)
  const REFERENCIAIS = [
    { chave: "miudezas",           label: "Miudezas",            valor: v => v.campoValorMiudezas },
    { chave: "gastosOperacionais", label: "Gastos Operacionais", valor: v => v.campoValorGastosOperacionais },
    { chave: "impostos",           label: "Impostos",            valor: v => v.campoValorImpostos },
    { chave: "margemSeguranca",    label: "Mg. Segurança",       valor: v => v.margem_seguranca },
    { chave: "comissaoArquiteta",  label: "Comissão Arquiteta",  valor: v => v.comissao_arquiteta },
    { chave: "negociacao",         label: "Negociação",          valor: v => v.campoNegociacao, base: v => v.campoValorFinal },
    { chave: "valorSugerido",      label: "Valor Sugerido",      valor: v => v.campoValorFinal },
    { chave: "margemLucro",        label: "Margem de Lucro",     valor: v => v.campoValorMargemLucro },
  ];

  const idProposta = new URLSearchParams(location.search).get("id");
  if (!idProposta || idProposta === ID_MODELO) return;   // o modelo é onde os mínimos são definidos

  const tipoUsuario  = localStorage.getItem("usuarioTipo") || "";
  const emailUsuario = (localStorage.getItem("usuarioEmail") || "").toLowerCase();
  const nomeUsuario  = localStorage.getItem("usuarioNome") || "";
  const isSuperUser  = (window.Permissoes ? window.Permissoes.pode("semTravas") : (tipoUsuario === "admin" || tipoUsuario === "gestor"));

  const estado = { aprovacoes: [], carregado: false, paginaPronta: false, inicio: Date.now(), ultimoTotal: null, ticksEstaveis: 0, assinaturaBanner: "" };

  const fmtPct = n => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const normNome = s => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase().replace(/\s+/g, " ");
  const parseBRL = txt => { const n = parseFloat(String(txt || "").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };

  const cfgAtual = () => window.CFgAPI?.obter?.() || window.CFG || {};
  function regraAtiva() {
    const r = cfgAtual().regraPorcentagemMinima;
    return r && r.ativo ? r : null;
  }
  function minimosDoProduto(nome) {
    if (typeof window.percentuaisMinimosDoProduto === "function") return window.percentuaisMinimosDoProduto(nome);
    const todos = cfgAtual().percentuaisMinimos || {};
    const v = todos[normNome(nome)];
    return v && typeof v === "object" ? v : {};
  }

  // Porcentagens de cada produto abaixo do mínimo: [{ produto, chave, label, atual, minimo }]
  function abaixoDoMinimo() {
    if (typeof calcularValoresFinanceirosDiretoDaTabela !== "function") return null;
    const lista = [];
    document.querySelectorAll("[id^='bloco-']").forEach(bloco => {
      if (!/^bloco-\d+$/.test(bloco.id) || !document.getElementById("tabela-" + bloco.id)) return;   // só o bloco do produto (não as abas)
      const nome = document.getElementById("titulo-accordion-" + bloco.id)?.textContent?.trim() || "";
      const minimos = minimosDoProduto(nome);
      if (!Object.keys(minimos).some(k => typeof minimos[k] === "number")) return;   // produto sem mínimo no modelo
      const v = calcularValoresFinanceirosDiretoDaTabela(bloco.id);
      if (!v) return;
      for (const r of REFERENCIAIS) {
        const min = minimos[r.chave];
        if (typeof min !== "number") continue;
        const base = Number(r.base ? r.base(v) : v.campoValorMinimo);
        if (!(base > 0)) continue;
        const atual = Math.round((Number(r.valor(v)) || 0) / base * 10000) / 100;
        if (atual < min) lista.push({ produto: nome, chave: r.chave, label: r.label, atual, minimo: min });
      }
    });
    return lista;
  }

  // Aprovação vigente: a mais recente aprovada cobre tudo que está abaixo agora (mesmo produto e referencial,
  // e a porcentagem atual não baixou do que foi aprovado)
  function liberacaoValida(lista) {
    const ultima = estado.aprovacoes.filter(a => a.status === "aprovado")
      .sort((a, b) => new Date(b.dataAprovacao || b.dataHora) - new Date(a.dataAprovacao || a.dataHora))[0];
    if (!ultima) return null;
    const aprovados = Array.isArray(ultima.detalhes) ? ultima.detalhes : [];
    const cobre = x => aprovados.some(d => normNome(d.produto) === normNome(x.produto) && d.chave === x.chave && x.atual >= Number(d.atual) - 0.005);
    return lista.every(cobre) ? ultima : null;
  }

  function idUsuarioLogado() {
    try {
      const t = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
      const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p?.id ? String(p.id) : "";
    } catch { return ""; }
  }
  // Pedido de porcentagem não tem total: decide o aprovador principal (Ajustes → Trava por valor)
  function aprovadorPrincipal() {
    const lv = cfgAtual().limiteValor || {};
    return { id: String(lv.aprovadorId || ""), nome: lv.aprovadorNome || "o aprovador", email: (lv.aprovadorEmail || "").toLowerCase() };
  }
  const souAprovador = resp => { const id = idUsuarioLogado(); return (!!id && resp.id === id) || (!!emailUsuario && !!resp.email && resp.email === emailUsuario); };

  async function buscarAprovacoes() {
    try {
      const r = await fetch(`${API_APROV}?propostaId=${idProposta}&tipo=porcentagem`);
      if (r.ok) estado.aprovacoes = (await r.json()) || [];
    } catch (_) {}
    estado.carregado = true;
    estado.assinaturaBanner = "";
  }

  // ── Travas dos botões (sem desfazer a de outras regras) ───────────────────
  function travar(el, motivo) {
    if (!el.dataset.pmTravado) el.dataset.pmAnterior = el.dataset.lvAnterior || JSON.stringify({
      disabled: el.disabled, pe: el.style.pointerEvents, op: el.style.opacity, cur: el.style.cursor,
      cls: el.classList.contains("btn-bloqueado"), title: el.getAttribute("title"),
    });
    el.disabled = true;
    el.dataset.pmTravado = "1";
    el.style.pointerEvents = "none"; el.style.opacity = "0.6"; el.style.cursor = "not-allowed";
    el.classList.add("btn-bloqueado");
    if (motivo) el.title = motivo;
  }
  function destravar(el) {
    if (!el.dataset.pmTravado) return;
    let ant = {};
    try { ant = JSON.parse(el.dataset.pmAnterior || "{}"); } catch (_) {}
    delete el.dataset.pmTravado; delete el.dataset.pmAnterior;
    if (el.dataset.lvTravado) return;   // a trava por valor continua valendo
    el.disabled = !!ant.disabled;
    el.style.pointerEvents = ant.pe || ""; el.style.opacity = ant.op || ""; el.style.cursor = ant.cur || "";
    el.classList.toggle("btn-bloqueado", !!ant.cls);
    if (ant.title) el.setAttribute("title", ant.title); else el.removeAttribute("title");
  }
  function aplicarBotoes(regra, travado) {
    const motivo = "Bloqueado: porcentagem abaixo da mínima, aguardando aprovação";
    const ids = [...TODOS_PDFS.map(id => [id, !!regra.pdfs?.[id]]), ["btn-gerar-pedido", !!regra.bloquearOmie], ["btn-editar", !!regra.bloquearSalvar]];
    for (const [id, bloqueia] of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (travado && bloqueia) travar(el, motivo); else destravar(el);
    }
  }
  function destravarTudo() {
    [...TODOS_PDFS, "btn-gerar-pedido", "btn-editar"].forEach(id => { const el = document.getElementById(id); if (el) destravar(el); });
  }

  // ── Banner ────────────────────────────────────────────────────────────────
  const CORES = {
    travado:  { bg: "#fff7ed", fg: "#9a3412", border: "#fdba74" },
    pendente: { bg: "#fffbeb", fg: "#92400e", border: "#fcd34d" },
    negado:   { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
    liberado: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
    info:     { bg: "#f1f5f9", fg: "#334155", border: "#cbd5e1" },
  };
  const btnCss = (bg, fg = "#fff", border = bg) =>
    `padding:7px 14px;border:1px solid ${border};border-radius:8px;background:${bg};color:${fg};font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;`;

  function removerBanner() { document.getElementById("aviso-bloqueio-pct")?.remove(); estado.assinaturaBanner = ""; }

  function mostrarBanner({ tom, titulo, detalhe, acoes = [] }) {
    const assinatura = JSON.stringify([tom, titulo, detalhe, acoes.map(a => a.texto)]);
    if (assinatura === estado.assinaturaBanner && document.getElementById("aviso-bloqueio-pct")) return;
    estado.assinaturaBanner = assinatura;
    document.getElementById("aviso-bloqueio-pct")?.remove();
    const c = CORES[tom];
    const aviso = document.createElement("div");
    aviso.id = "aviso-bloqueio-pct";
    aviso.innerHTML = `
      <div style="background:${c.bg};color:${c.fg};border:1px solid ${c.border};padding:14px 18px;border-radius:10px;margin-bottom:16px;font-size:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div style="font-weight:700;">${titulo}</div>
          ${detalhe ? `<div style="font-size:12px;font-weight:400;margin-top:3px;">${detalhe}</div>` : ""}
        </div>
        <div class="pm-acoes" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      </div>`;
    const box = aviso.querySelector(".pm-acoes");
    acoes.forEach(a => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = a.texto; b.style.cssText = a.css;
      b.addEventListener("click", async () => {
        b.dataset.ocupado = "1"; b.disabled = true;
        try { await a.onClick(); } finally { delete b.dataset.ocupado; b.disabled = false; }
      });
      box.appendChild(b);
    });
    const main = document.querySelector("main") || document.body;
    const antes = document.getElementById("aviso-bloqueio-valor") || document.getElementById("aviso-bloqueio-kommo");
    if (antes && antes.parentNode === main) antes.after(aviso);
    else main.insertBefore(aviso, main.firstChild);
  }
  // Outras regras (bloqueio por etapa) desabilitam todos os botões da página; os do banner ficam ativos
  function reativarBanner() {
    document.querySelectorAll("#aviso-bloqueio-pct button").forEach(b => {
      if (b.dataset.ocupado) return;
      b.disabled = false; b.removeAttribute("readonly");
      b.style.pointerEvents = ""; b.style.opacity = ""; b.style.cursor = "pointer";
    });
  }

  const textoItens = lista => {
    const linhas = lista.slice(0, 4).map(x => `${esc(x.produto)}: ${esc(x.label)} ${fmtPct(x.atual)} (mín. ${fmtPct(x.minimo)})`);
    if (lista.length > 4) linhas.push(`… e mais ${lista.length - 4}`);
    return linhas.join(" · ");
  };

  // ── Ações ────────────────────────────────────────────────────────────────
  async function solicitar(lista, justificativa = "") {
    const proposta = window.propostaAtual || window.propostaEmEdicao || {};
    const r = await fetch(API_APROV, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "porcentagem",
        justificativa,
        propostaId: idProposta,
        numeroProposta: proposta.numeroProposta || proposta.camposFormulario?.numeroOrcamento || "",
        nomeCliente: proposta.camposFormulario?.clientes?.[0]?.nome_razao_social || "",
        solicitante: nomeUsuario || emailUsuario || "Usuário",
        email: emailUsuario,
        detalhes: lista,
      }),
    }).catch(() => null);
    if (!r?.ok) { alert("Não foi possível enviar a solicitação de aprovação."); return null; }
    const doc = await r.json();
    await buscarAprovacoes();
    return doc;
  }

  async function resolver(id, status) {
    let observacao = "";
    if (status === "negado") {
      const motivo = prompt("Motivo da negativa (opcional):");
      if (motivo === null) return;
      observacao = motivo;
    }
    const r = await fetch(`${API_APROV}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, modo: status === "aprovado" ? "porcentagem" : undefined, observacao, aprovador: nomeUsuario || emailUsuario }),
    }).catch(() => null);
    if (!r?.ok) {
      const err = await r?.json().catch(() => null);
      alert(err?.error || "Erro ao salvar a decisão.");
      return;
    }
    await buscarAprovacoes();
  }

  // ── Ciclo ────────────────────────────────────────────────────────────────
  function avaliar() {
    const regra = regraAtiva();
    if (!regra) { window._pmBloqueio = { travado: false }; removerBanner(); destravarTudo(); return; }

    // Espera a página carregar: total estável por 2 leituras, ou tempo esgotado
    if (!estado.paginaPronta) {
      const total = parseBRL(document.getElementById("valorFinalTotal")?.textContent);
      if (total && total === estado.ultimoTotal) estado.ticksEstaveis++; else estado.ticksEstaveis = 0;
      estado.ultimoTotal = total;
      if (estado.ticksEstaveis >= 2 || Date.now() - estado.inicio > CARGA_MAX_MS) estado.paginaPronta = true;
      else return;
    }
    if (!estado.carregado) return;

    const lista = abaixoDoMinimo();
    if (!lista || !lista.length) { window._pmBloqueio = { travado: false }; removerBanner(); aplicarBotoes(regra, false); return; }
    reativarBanner();

    const resp = aprovadorPrincipal();
    const aprovador = souAprovador(resp);
    const itens = textoItens(lista);
    const liberacao = liberacaoValida(lista);

    if (liberacao) {
      window._pmBloqueio = { travado: false, liberacao };
      aplicarBotoes(regra, false);
      const dt = liberacao.dataAprovacao ? new Date(liberacao.dataAprovacao).toLocaleString("pt-BR") : "";
      mostrarBanner({
        tom: "liberado",
        titulo: `✅ Porcentagem mínima liberada por ${esc(liberacao.aprovador || resp.nome)}`,
        detalhe: `${itens}${dt ? " · " + dt : ""} · trava de novo se alguma porcentagem baixar.`,
      });
      return;
    }

    const pendente = estado.aprovacoes.find(a => a.status === "pendente");
    const ultima = estado.aprovacoes.find(a => a.status !== "cancelado");
    const negado = ultima?.status === "negado" ? ultima : null;
    const isento = isSuperUser || aprovador;
    const podePedir = !isSuperUser && !!resp.id;
    window._pmBloqueio = { travado: !isento, lista, pendente: pendente || null, negado };
    aplicarBotoes(regra, !isento);

    const acoesAprovador = id => [
      { texto: "Liberar", css: btnCss("#16a34a"),
        onClick: async () => { if (id) return resolver(id, "aprovado"); const d = await solicitar(lista); if (d?._id) await resolver(d._id, "aprovado"); } },
      ...(id ? [{ texto: "Negar", css: btnCss("#fff", "#b91c1c", "#fca5a5"), onClick: () => resolver(id, "negado") }] : []),
    ];

    if (pendente) {
      mostrarBanner({
        tom: "pendente",
        titulo: aprovador ? `⏳ ${esc(pendente.solicitante)} pediu aprovação da porcentagem mínima` : `⏳ Porcentagem mínima: aguardando aprovação de ${esc(resp.nome)}`,
        detalhe: `${itens} · solicitado em ${new Date(pendente.dataHora).toLocaleString("pt-BR")}`,
        acoes: aprovador ? acoesAprovador(pendente._id) : [],
      });
      return;
    }

    const solicitarAcao = { texto: negado ? "Solicitar novamente" : "Solicitar aprovação", css: btnCss("#c2410c"),
      onClick: () => { const j = prompt("Justificativa para o aprovador (opcional):"); if (j === null) return; return solicitar(lista, j); } };

    if (negado && !aprovador) {
      mostrarBanner({
        tom: "negado",
        titulo: `⛔ Porcentagem mínima negada por ${esc(negado.aprovador || resp.nome)}`,
        detalhe: `${itens}${negado.observacao ? " · Motivo: " + esc(negado.observacao) : ""}`,
        acoes: podePedir ? [solicitarAcao] : [],
      });
      return;
    }
    if (aprovador) {
      mostrarBanner({ tom: "info", titulo: "🔒 Porcentagem abaixo da mínima — você é o aprovador",
        detalhe: `${itens} · ninguém pediu aprovação ainda; você pode liberar direto.`, acoes: acoesAprovador(null) });
      return;
    }
    mostrarBanner({
      tom: isSuperUser ? "info" : "travado",
      titulo: isSuperUser ? "ℹ️ Porcentagem abaixo da mínima — gestores não são bloqueados" : "🔒 Orçamento travado: porcentagem abaixo da mínima",
      detalhe: isSuperUser
        ? `${itens} · usuários comuns precisam da aprovação de ${esc(resp.nome)}.`
        : resp.id ? `${itens} · precisa da aprovação de ${esc(resp.nome)}.` : `${itens} · nenhum aprovador definido em Ajustes; fale com o gestor.`,
      acoes: podePedir ? [solicitarAcao] : [],
    });
  }

  function iniciar() {
    buscarAprovacoes().then(avaliar);
    setInterval(avaliar, TICK_MS);
    setInterval(() => { if (document.visibilityState === "visible" && regraAtiva()) buscarAprovacoes(); }, 30000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
