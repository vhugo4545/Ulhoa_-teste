// bloqueioValor.js — trava o orçamento quando o total passa do valor-limite
// configurado em Ajustes (CFG.limiteValor) até o aprovador liberar.
// Admins e gestores não são afetados. O aprovador decide se a liberação vale
// "para sempre" ou "só até este valor".

(function () {
  const API_APROV = "https://ulhoa-0a02024d350a.herokuapp.com/api/aprovacoes-valor";
  const TICK_MS = 1000;
  const CARGA_MAX_MS = 20000; // depois disso, considera a página carregada mesmo sem total estável

  const TODOS_PDFS = [
    "btn-visualizar-proposta",
    "btn-folhas-impressao",
    "btn-folha-ordem-servico",
    "btn-etapas-processo",
    "btn-historico-producao",
  ];

  const idProposta = new URLSearchParams(location.search).get("id");
  if (!idProposta) return;

  const tipoUsuario  = localStorage.getItem("usuarioTipo") || "";
  const emailUsuario = (localStorage.getItem("usuarioEmail") || "").toLowerCase();
  const nomeUsuario  = localStorage.getItem("usuarioNome") || "";
  // Perfis sem travas (Ajustes → Perfis); padrão: admin e gestor
  const isSuperUser  = (window.Permissoes ? window.Permissoes.pode("semTravas") : (tipoUsuario === "admin" || tipoUsuario === "gestor"));

  const estado = {
    aprovacoes: [],
    carregado: false,        // aprovações já buscadas
    paginaPronta: false,     // total da proposta já carregado
    inicio: Date.now(),
    ultimoTotal: null,
    ticksEstaveis: 0,
    camposTravados: false,   // trava de campos só é aplicada na abertura
    assinaturaBanner: "",
  };

  const fmtBRL = n => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const parseBRL = txt => {
    const s = String(txt || "").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  function obterConfig() {
    const s = window.CFgAPI?.obter()?.limiteValor;
    if (s && typeof s === "object" && Object.keys(s).length) return s;
    try { return JSON.parse(localStorage.getItem("cfg_limite_valor")) || null; } catch { return null; }
  }

  // Regra da etapa atual da Kommo; sem etapa conhecida, vale a regra padrão
  // A trava vale sempre que houver regra configurada (o antigo "Ativar" não é mais usado)
  function temRegra(cfg) {
    return Number(cfg?.global?.valorLimite) > 0
      || Object.values(cfg?.etapas || {}).some(r => r?.modo === "personalizado" && Number(r.valorLimite) > 0);
  }

  function obterRegra(cfg) {
    if (!cfg) return null;
    const statusId = window._kommoStatusAtual?.statusId;
    const daEtapa = statusId ? cfg.etapas?.[statusId] : null;
    if (daEtapa?.modo === "desativado") return null;
    const regra = daEtapa?.modo === "personalizado" ? daEtapa : cfg.global;
    if (!regra || !(Number(regra.valorLimite) > 0)) return null;
    return regra;
  }

  function lerTotal() {
    const el = document.getElementById("valorFinalTotal");
    return el ? parseBRL(el.textContent) : null;
  }

  // id do usuário logado, lido do token (JWT) salvo no login
  function idUsuarioLogado() {
    try {
      const t = localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
      const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p?.id ? String(p.id) : "";
    } catch { return ""; }
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

  function isAprovador(resp) {
    const id = idUsuarioLogado();
    return (!!id && resp.id === id) || (!!emailUsuario && !!resp.email && resp.email === emailUsuario);
  }

  // Liberação vigente para o total atual
  function liberacaoValida(total) {
    const aprovadas = estado.aprovacoes.filter(a => a.status === "aprovado");
    const sempre = aprovadas.find(a => a.modo === "sempre");
    if (sempre) return sempre;
    return aprovadas
      .filter(a => a.modo === "valor" && total <= (Number(a.valorAprovado) || 0) + 0.005)
      .sort((a, b) => (b.valorAprovado || 0) - (a.valorAprovado || 0))[0] || null;
  }

  async function buscarAprovacoes() {
    try {
      const r = await fetch(`${API_APROV}?propostaId=${idProposta}&tipo=valor`);
      if (r.ok) estado.aprovacoes = (await r.json()) || [];
    } catch (_) {}
    estado.carregado = true;
    estado.assinaturaBanner = "";
  }

  // ── Aplicação das travas ──────────────────────────────────────────────────
  // Guarda o estado anterior para não desfazer travas de outras regras (ex.: bloqueio por etapa)
  function travarElemento(el, motivo) {
    if (!el.dataset.lvTravado) {
      el.dataset.lvAnterior = JSON.stringify({
        disabled: el.disabled, pe: el.style.pointerEvents, op: el.style.opacity, cur: el.style.cursor,
        cls: el.classList.contains("btn-bloqueado"), title: el.getAttribute("title"),
      });
    }
    el.disabled = true;
    el.dataset.lvTravado = "1";
    el.style.pointerEvents = "none";
    el.style.opacity = "0.6";
    el.style.cursor = "not-allowed";
    el.classList.add("btn-bloqueado");
    if (motivo) el.title = motivo;
  }

  function destravarElemento(el) {
    if (!el.dataset.lvTravado) return;
    let ant = {};
    try { ant = JSON.parse(el.dataset.lvAnterior || "{}"); } catch (_) {}
    delete el.dataset.lvTravado;
    delete el.dataset.lvAnterior;
    el.disabled = !!ant.disabled;
    el.style.pointerEvents = ant.pe || "";
    el.style.opacity = ant.op || "";
    el.style.cursor = ant.cur || "";
    el.classList.toggle("btn-bloqueado", !!ant.cls);
    if (ant.title) el.setAttribute("title", ant.title); else el.removeAttribute("title");
  }

  // Botões: reaplicado a cada tick porque o bloqueioKommo e o re-render dos totais podem reabilitá-los
  function aplicarBotoes(regra, travado) {
    const motivo = "Bloqueado: valor acima do limite, aguardando aprovação";
    const pdfs = new Set(regra.tipoBloqueio === "tudo"
      ? TODOS_PDFS
      : TODOS_PDFS.filter(id => regra.pdfs?.[id]));

    TODOS_PDFS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (travado && pdfs.has(id)) travarElemento(el, motivo); else destravarElemento(el);
    });

    const salvar = document.getElementById("btn-editar");
    if (salvar) {
      // Se a trava surgiu durante a edição, deixa salvar para não perder o trabalho
      if (travado && regra.bloquearSalvar && estado.camposTravados) travarElemento(salvar, motivo);
      else destravarElemento(salvar);
    }

    const omie = document.getElementById("btn-gerar-pedido");
    if (omie) {
      if (travado && regra.bloquearOmie) travarElemento(omie, motivo); else destravarElemento(omie);
    }
  }

  // Trava de campos: só na abertura da proposta (igual ao bloqueio por etapa)
  function aplicarCampos(regra) {
    if (!regra.tipoBloqueio) return;
    const livres = new Set(["btn-pedido-finalizado", "btn-folha-projeto"]);
    if (regra.tipoBloqueio !== "tudo") {
      TODOS_PDFS.filter(id => !regra.pdfs?.[id]).forEach(id => livres.add(id));
    }
    if (!regra.bloquearOmie) livres.add("btn-gerar-pedido");

    const dentroBanner = el => !!el.closest("#aviso-bloqueio-valor, #desbloqueio-flutuante");
    document.querySelectorAll("input, select, textarea, button").forEach(el => {
      if (livres.has(el.id) || dentroBanner(el)) return;
      el.disabled = true;
      el.setAttribute("readonly", "readonly");
      el.style.pointerEvents = "none";
      el.style.opacity = "0.85";
      el.style.cursor = "not-allowed";
    });
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.setAttribute("contenteditable", "false");
      el.style.pointerEvents = "none";
      el.style.opacity = "0.85";
    });
    document.querySelectorAll("[onclick]").forEach(el => {
      if (livres.has(el.id) || dentroBanner(el)) return;
      el.dataset.onclickOriginal = el.getAttribute("onclick") || "";
      el.removeAttribute("onclick");
    });
    estado.camposTravados = true;
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

  function removerBanner() {
    document.getElementById("aviso-bloqueio-valor")?.remove();
    estado.assinaturaBanner = "";
  }

  function mostrarBanner({ tom, titulo, detalhe, acoes = [] }) {
    const assinatura = JSON.stringify([tom, titulo, detalhe, acoes.map(a => a.texto)]);
    if (assinatura === estado.assinaturaBanner && document.getElementById("aviso-bloqueio-valor")) return;
    estado.assinaturaBanner = assinatura;

    document.getElementById("aviso-bloqueio-valor")?.remove();
    const c = CORES[tom];
    const aviso = document.createElement("div");
    aviso.id = "aviso-bloqueio-valor";
    aviso.innerHTML = `
      <div style="background:${c.bg};color:${c.fg};border:1px solid ${c.border};padding:14px 18px;border-radius:10px;margin-bottom:16px;font-size:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div style="font-weight:700;">${titulo}</div>
          ${detalhe ? `<div style="font-size:12px;font-weight:400;margin-top:3px;">${detalhe}</div>` : ""}
        </div>
        <div class="lv-acoes" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      </div>`;
    const box = aviso.querySelector(".lv-acoes");
    acoes.forEach(a => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = a.texto;
      b.style.cssText = a.css;
      b.addEventListener("click", async () => {
        b.dataset.ocupado = "1";
        b.disabled = true;
        try { await a.onClick(); } finally { delete b.dataset.ocupado; b.disabled = false; }
      });
      box.appendChild(b);
    });
    const main = document.querySelector("main") || document.body;
    const kommo = document.getElementById("aviso-bloqueio-kommo");
    if (kommo && kommo.parentNode === main) kommo.after(aviso);
    else main.insertBefore(aviso, main.firstChild);
  }

  // O bloqueio por etapa (bloqueioKommo) desabilita todos os botões da página; os do banner ficam sempre ativos
  function reativarBanner() {
    document.querySelectorAll("#aviso-bloqueio-valor button").forEach(b => {
      if (b.dataset.ocupado) return;
      b.disabled = false;
      b.removeAttribute("readonly");
      b.style.pointerEvents = "";
      b.style.opacity = "";
      b.style.cursor = "pointer";
    });
  }

  // ── Ações ────────────────────────────────────────────────────────────────
  async function solicitar(total, regra, justificativa = "") {
    const proposta = window.propostaAtual || window.propostaEmEdicao || {};
    const r = await fetch(API_APROV, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo:           "valor",
        justificativa,
        propostaId:     idProposta,
        numeroProposta: proposta.numeroProposta || proposta.camposFormulario?.numeroOrcamento || "",
        nomeCliente:    proposta.camposFormulario?.clientes?.[0]?.nome_razao_social || "",
        solicitante:    nomeUsuario || emailUsuario || "Usuário",
        email:          emailUsuario,
        valorTotal:     total,
        valorLimite:    Number(regra.valorLimite),
      }),
    }).catch(() => null);
    if (!r?.ok) { alert("Não foi possível enviar a solicitação de aprovação."); return null; }
    const doc = await r.json();
    await buscarAprovacoes();
    return doc;
  }

  async function resolver(id, status, modo) {
    let observacao = "";
    if (status === "negado") {
      const motivo = prompt("Motivo da negativa (opcional):");
      if (motivo === null) return;
      observacao = motivo;
    }
    const r = await fetch(`${API_APROV}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, modo, observacao, aprovador: nomeUsuario || emailUsuario }),
    }).catch(() => null);
    if (!r?.ok) {
      const err = await r?.json().catch(() => null);
      alert(err?.error || "Erro ao salvar a decisão.");
      return;
    }
    await buscarAprovacoes();
    if (status === "aprovado") {
      // Recarrega para desfazer a trava de campos aplicada na abertura
      if (estado.camposTravados) location.reload();
    }
  }

  async function liberarDireto(total, regra, modo) {
    const doc = await solicitar(total, regra);
    if (doc?._id) await resolver(doc._id, "aprovado", modo);
  }

  // ── Ciclo ────────────────────────────────────────────────────────────────
  function avaliar() {
    const cfg = obterConfig();
    const regra = obterRegra(cfg);
    const total = lerTotal();

    // Detecta fim do carregamento: total > 0 estável por 2 ticks, ou tempo esgotado
    if (!estado.paginaPronta) {
      if (total && total === estado.ultimoTotal) estado.ticksEstaveis++;
      else estado.ticksEstaveis = 0;
      estado.ultimoTotal = total;
      if (estado.ticksEstaveis >= 2 || Date.now() - estado.inicio > CARGA_MAX_MS) estado.paginaPronta = true;
      else return;
    }

    if (!estado.carregado) return;

    // A primeira avaliação completa é a "abertura": só nela a trava de campos pode ser aplicada
    const naAbertura = !estado.avaliadoNaAbertura;
    estado.avaliadoNaAbertura = true;

    if (!regra || total === null || total <= Number(regra.valorLimite)) {
      window._lvBloqueio = { travado: false };
      removerBanner();
      if (regra) aplicarBotoes(regra, false);
      return;
    }
    reativarBanner();

    const limite = Number(regra.valorLimite);
    const liberacao = liberacaoValida(total);
    const pendente = estado.aprovacoes.find(a => a.status === "pendente");
    const ultima = estado.aprovacoes.find(a => a.status !== "cancelado");
    const negado = ultima?.status === "negado" ? ultima : null;
    // Quem decide este total: o aprovador da faixa de valor, ou o principal
    const resp = responsavelPedido(cfg, total);
    const aprovador = isAprovador(resp);
    const nomeAprovador = resp.nome;
    // Sem aprovador definido em Ajustes não há quem decida: não oferece o pedido
    const podePedir = !isSuperUser && !!resp.id;
    const resumo = `Total ${fmtBRL(total)} · limite ${fmtBRL(limite)}`;

    if (liberacao) {
      window._lvBloqueio = { travado: false, liberacao };
      aplicarBotoes(regra, false);
      const dt = liberacao.dataAprovacao ? new Date(liberacao.dataAprovacao).toLocaleString("pt-BR") : "";
      const escopo = liberacao.modo === "sempre" ? "para qualquer valor" : `até ${fmtBRL(liberacao.valorAprovado)}`;
      mostrarBanner({
        tom: "liberado",
        titulo: `✅ Valor liberado por ${liberacao.aprovador || nomeAprovador} (${escopo})`,
        detalhe: `${resumo}${dt ? " · " + dt : ""}`,
      });
      return;
    }

    // Admin, gestor e o próprio aprovador seguem sem trava
    const isento = isSuperUser || aprovador;
    // Estado para o botão flutuante de desbloqueio (desbloqueioFlutuante.js)
    window._lvBloqueio = {
      travado: !isento, total, limite, pendente: pendente || null, negado, nomeAprovador, idAprovador: resp.id,
      solicitar: justificativa => solicitar(total, regra, justificativa),
    };
    if (!isento) {
      if (naAbertura) aplicarCampos(regra);
      aplicarBotoes(regra, true);
    }

    const acoesAprovador = id => [
      { texto: "Liberar para sempre", css: btnCss("#16a34a"),
        onClick: () => id ? resolver(id, "aprovado", "sempre") : liberarDireto(total, regra, "sempre") },
      { texto: `Liberar até ${fmtBRL(total)}`, css: btnCss("#0f766e"),
        onClick: () => id ? resolver(id, "aprovado", "valor") : liberarDireto(total, regra, "valor") },
      ...(id ? [{ texto: "Negar", css: btnCss("#fff", "#b91c1c", "#fca5a5"), onClick: () => resolver(id, "negado") }] : []),
    ];

    if (pendente) {
      const dt = new Date(pendente.dataHora).toLocaleString("pt-BR");
      mostrarBanner({
        tom: "pendente",
        titulo: aprovador
          ? `⏳ ${pendente.solicitante} pediu aprovação de ${fmtBRL(pendente.valorTotal)}`
          : `⏳ Aguardando aprovação de ${nomeAprovador}`,
        detalhe: `${resumo} · solicitado em ${dt}`,
        acoes: aprovador ? acoesAprovador(pendente._id) : [],
      });
      return;
    }

    const solicitarAcao = { texto: negado ? "Solicitar novamente" : "Solicitar aprovação",
      css: btnCss("#c2410c"), onClick: () => solicitar(total, regra) };

    if (negado && !aprovador) {
      mostrarBanner({
        tom: "negado",
        titulo: `⛔ Aprovação negada por ${negado.aprovador || nomeAprovador}`,
        detalhe: `${resumo}${negado.observacao ? " · Motivo: " + negado.observacao : ""}`,
        acoes: podePedir ? [solicitarAcao] : [],
      });
      return;
    }

    if (aprovador) {
      mostrarBanner({
        tom: "info",
        titulo: "🔒 Orçamento acima do limite — você é o aprovador",
        detalhe: `${resumo} · ninguém pediu aprovação ainda; você pode liberar direto.`,
        acoes: acoesAprovador(null),
      });
      return;
    }

    mostrarBanner({
      tom: isSuperUser ? "info" : "travado",
      titulo: isSuperUser
        ? "ℹ️ Orçamento acima do limite — gestores não são bloqueados"
        : `🔒 Orçamento travado: valor acima do limite`,
      detalhe: isSuperUser
        ? `${resumo} · usuários comuns precisam da aprovação de ${nomeAprovador}.`
        : resp.id
          ? `${resumo} · precisa da aprovação de ${nomeAprovador}.${estado.camposTravados ? "" : " Salve a proposta antes de solicitar."}`
          : `${resumo} · nenhum aprovador definido em Ajustes; fale com o gestor.`,
      acoes: podePedir ? [solicitarAcao] : [],
    });
  }

  function iniciar(tentativa = 0) {
    // Sem regra em Ajustes: não faz nada nesta página. A config do servidor chega depois
    // do cache local (configuracoes.js), então tenta de novo a cada 2s por até 30s
    if (!temRegra(obterConfig())) {
      if (tentativa < 15) setTimeout(() => iniciar(tentativa + 1), 2000);
      return;
    }
    buscarAprovacoes().then(avaliar);
    setInterval(avaliar, TICK_MS);
    // Atualiza decisões tomadas em outra aba/máquina
    setInterval(() => { if (document.visibilityState === "visible") buscarAprovacoes(); }, 30000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => iniciar());
  else iniciar();
})();
