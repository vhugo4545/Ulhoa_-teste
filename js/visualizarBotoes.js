async function controlarBotoesSidebar() {
  const tipoUsuario = localStorage.getItem("usuarioTipo") || "usuario";
  const paginaAtual = window.location.pathname.split("/").pop();

  const botoes = {
    criar: document.getElementById("btn-criar"),
    editarModelo: document.getElementById("btn-editar-modelo"),
    atualizar: document.getElementById("btn-atualizar"),
    solicitar: document.getElementById("btn-solicitar"),
    autorizar: document.getElementById("btn-autorizar"),
    enviarCliente: document.getElementById("btn-enviar-cliente"),
    aprovadoCliente: document.getElementById("btn-aprovado-cliente"),
    gerarPedido: document.getElementById("btn-gerar-pedido"),
    atualizarPrecos: document.getElementById("btn-atualizar-precos"),
    auditar: document.getElementById("btn-auditar-valores")
  };


  function esconderTodos() {
    Object.values(botoes).forEach(btn => btn && (btn.style.display = "none"));
  }

  esconderTodos();

  // 📝 Página de criação
  if (paginaAtual === "criar.html" || paginaAtual === "criarPropostaV2.html") {
    if (botoes.criar) botoes.criar.style.display = "block";
    return;
  }

  // 🔄 Carrega proposta se não estiver em window
  if (!window.proposta && !window.propostaEmEdicao && !window.propostaAtual) {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return;

    try {
      const resposta = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${id}`);
      const dados = await resposta.json();
      window.proposta = dados;
    } catch (erro) {
      console.error("❌ Erro ao carregar proposta:", erro);
      return;
    }
  }

  const status = (
    window.proposta?.statusOrcamento ||
    window.propostaEmEdicao?.statusOrcamento ||
    window.propostaAtual?.statusOrcamento ||
    ""
  );

  // 🔒 Botões que exigem aprovação do gestor ou superior
  const statusBloqueado = ["Orçamento Iniciado", "Pendente de aprovação"].includes(status);
  const idsBloqueados = [
    "btn-visualizar-proposta", "btn-folhas-impressao", "btn-pedido-finalizado",
    "btn-enviar-cliente", "btn-aprovado-cliente",
    "btn-gerar-pedido", "btn-gerar-pedido-kommo"
  ];
  idsBloqueados.forEach(id => {
    document.querySelectorAll(`#${id}`).forEach(btn => {
      btn.classList.toggle("btn-bloqueado", statusBloqueado);
    });
  });

  // Ajustes → Perfis; sem permissoes.js carregado, vale a regra antiga (só admin)
  const _pode = (acao, antigo) => window.Permissoes ? window.Permissoes.pode(acao) : antigo;
  const verTodos = _pode("verTodosBotoes", tipoUsuario === "admin");
  const podeAprovar = _pode("aprovarOrcamento", tipoUsuario === "admin");
  const semTravas = _pode("semTravas", tipoUsuario === "admin" || tipoUsuario === "gestor");
  // Modo da barra (Ajustes em abas → Perfis): "apagar" mostra apagado com motivo; padrão esconde, como antes
  MODO_APAGAR = modoBotoes() === "apagar";
  if (MODO_APAGAR) estilosIndisponivel();

  // Botões que esperam a aprovação do gestor mostram o motivo embaixo
  idsBloqueados.forEach(id => {
    document.querySelectorAll(`#${id}`).forEach(btn => motivoBotao(btn, statusBloqueado && !semTravas ? "aguarda aprovação do gestor" : ""));
  });

  // Na página de edição: todos os botões ficam sempre na barra. O que não pode ser usado
  // aparece apagado, com o motivo embaixo (Ajustes → botões por status e Perfis)
  if (paginaAtual === "editar.html") {
    Object.values(botoes).forEach(btn => disponivel(btn));

    // Perfil de consulta (Visualização)
    if (!_pode("editarSalvar", true)) {
      [...Object.values(botoes), ...["btn-editar", "btn-destravar", "btn-pedido-finalizado", "btn-aprovado-cliente", "btn-gerar-pedido-kommo", "btn-sincronizar-kommo"].map(id => document.getElementById(id))]
        .forEach(btn => indisponivel(btn, "perfil só de consulta"));
      return;
    }
    // Pendente de aprovação: para o vendedor, só Duplicar fica liberado
    const STATUS_TRAVADO = ["Pendente de aprovação"];
    if (STATUS_TRAVADO.includes(status) && !verTodos && !podeAprovar) {
      Object.values(botoes).forEach(btn => { if (btn !== botoes.criar) indisponivel(btn, "aguardando aprovação do gestor"); });
      return;
    }

    if (!_pode("criarDuplicar", true)) indisponivel(botoes.criar, "seu perfil não pode");
    if (!podeAprovar) indisponivel(botoes.autorizar, "só Admin");

    if (!verTodos) {
      // Aplica configuração de botões por status do servidor
      const cfgVis = window.CFgAPI?.obter()?.visibilidadeBotoes ||
                     (() => { try { return JSON.parse(localStorage.getItem("cfg_visibilidade_botoes")) || {}; } catch { return {}; } })();

      // Itera todos os botões configurados, buscando diretamente no DOM pelo ID
      Object.entries(cfgVis).forEach(([btnId, btnCfg]) => {
        if (btnId.startsWith("_")) return;
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (btn === botoes.autorizar && podeAprovar) return;

        // Botões exclusivos de admin
        const publico = btnCfg._publico || "ambos";
        if (publico === "admin") {
          indisponivel(btn, "só Admin");
          return;
        }

        // Liberado só nos status marcados; nenhum marcado = desligado em Ajustes
        const statusEntries = Object.entries(btnCfg).filter(([k]) => !k.startsWith("_"));
        const algumVisivel = statusEntries.some(([, v]) => v === true);
        const nenhum = statusEntries.length > 0 && !algumVisivel;

        if (nenhum) indisponivel(btn, "desligado em Ajustes");
        else if (status && btnCfg[status] === false) indisponivel(btn, motivoStatus(btnCfg));
      });
    }
    return;
  }

  // 👑 Admin fora da edição: mostra auditar
  if (tipoUsuario === "admin") {
    if (botoes.auditar) botoes.auditar.style.display = "block";
  }

  if (status === "Orçamento Iniciado") {
    if (botoes.editar) botoes.editar.style.display = "block";
    if (botoes.solicitar) botoes.solicitar.style.display = "block";
    return;
  }
}

document.addEventListener("DOMContentLoaded", controlarBotoesSidebar);

document.addEventListener("DOMContentLoaded", function () {
  const btnAjuste = document.getElementById("btn-ajuste-nomenclatura");
  if (!btnAjuste) return;

  const tipoUsuario = localStorage.getItem("usuarioTipo") || "usuario";
  const idProposta = new URLSearchParams(location.search).get("id");
  const paginaAtual = window.location.pathname.split("/").pop();

  if (
    paginaAtual !== "editar.html" ||
    idProposta !== "68746e305b9691a7ed3b3f97" ||
    !["gestor", "admin"].includes(tipoUsuario)
  ) return;

  btnAjuste.style.display = "";

  function tornarEditavel(span) {
    if (span.contentEditable === "true") return;
    span.contentEditable = "true";
    span.style.cssText += ";cursor:text;border-bottom:1px dashed #94a3b8;padding:2px 6px;border-radius:2px;min-width:60px;display:inline-block;outline:none;";

    // impede que o clique no span abra/feche o accordion
    span.addEventListener("click", e => e.stopPropagation());
    span.addEventListener("mousedown", e => e.stopPropagation());

    span.addEventListener("focus", () => span.style.borderBottom = "1px solid #475569");
    span.addEventListener("blur",  () => span.style.borderBottom = "1px dashed #94a3b8");
    span.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); span.blur(); } });
  }

  let observer = null;

  btnAjuste.addEventListener("click", function () {
    // torna editáveis todos os spans existentes
    document.querySelectorAll("span[id^='titulo-accordion-bloco-']").forEach(tornarEditavel);

    // observa novos blocos adicionados ao container
    if (!observer) {
      const container = document.getElementById("blocosProdutosContainer");
      if (container) {
        observer = new MutationObserver(mutations => {
          mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            node.querySelectorAll("span[id^='titulo-accordion-bloco-']").forEach(tornarEditavel);
          }));
        });
        observer.observe(container, { childList: true, subtree: false });
      }
    }

    // feedback visual no botão
    btnAjuste.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">edit</span> Edição ativa';
    btnAjuste.style.opacity = "0.7";
    btnAjuste.disabled = true;
  });
});

document.addEventListener("click", function (e) {
  const btn = e.target.closest("button, a");
  if (btn && btn.classList.contains("btn-bloqueado")) {
    // Admin e gestor não têm trava: para eles o cadeado é só indicação visual
    const tipo = localStorage.getItem("usuarioTipo") || "";
    if (window.Permissoes ? window.Permissoes.pode("semTravas") : (tipo === "admin" || tipo === "gestor")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    alert("⚠️ Esta ação só está disponível após a proposta ser aprovada pelo gestor.");
  }
}, true);

// ── Botão indisponível ─────────────────────────────────────────────────────
// Modo "apagar": fica na barra, apagado, com o motivo embaixo. Modo padrão: some, como antes.
let MODO_APAGAR = false;

function modoBotoes() {
  const cfg = window.CFgAPI?.obter() || (() => { try { return JSON.parse(localStorage.getItem("ulhoa_cfg_v1")) || {}; } catch { return {}; } })();
  return cfg.botoesModo || "esconder";
}

const STATUS_ORDEM = [
  ["Orçamento Iniciado", "Orç. iniciado"],
  ["Pendente de aprovação", "Pend. aprovação"],
  ["Aprovado Pelo Gestor", "Aprov. gestor"],
  ["Enviado Para o Cliente", "Enviado ao cliente"],
  ["Orçamento Aprovado pelo Cliente", "Aprov. cliente"],
  ["Pedido Finalizado", "Ped. finalizado"],
];

// "a partir de X" quando liberado do status X até o fim; senão "só em X, Y"
function motivoStatus(btnCfg) {
  const lib = STATUS_ORDEM.map(([k]) => btnCfg[k] !== false);
  const primeiro = lib.indexOf(true);
  if (primeiro < 0) return "desligado em Ajustes";
  if (lib.slice(primeiro).every(Boolean)) return `só a partir de ${STATUS_ORDEM[primeiro][1]}`;
  return "só em " + STATUS_ORDEM.filter((_, i) => lib[i]).map(([, r]) => r).join(", ");
}

function motivoBotao(btn, texto) {
  if (!btn) return;
  if (!MODO_APAGAR) texto = "";
  let m = btn.querySelector(":scope > .motivo-btn");
  if (!texto) { m?.remove(); return; }
  if (!m) {
    m = document.createElement("small");
    m.className = "motivo-btn";
    btn.appendChild(m);
  }
  m.textContent = texto;
}

function indisponivel(btn, motivo) {
  if (!btn) return;
  if (!MODO_APAGAR) { btn.style.display = "none"; return; }
  btn.style.display = "";
  btn.classList.add("btn-indisponivel");
  btn.dataset.motivo = motivo;
  motivoBotao(btn, motivo);
}

function disponivel(btn) {
  if (!btn) return;
  btn.style.display = MODO_APAGAR ? "" : "block";
  btn.classList.remove("btn-indisponivel");
  delete btn.dataset.motivo;
  motivoBotao(btn, "");
}

function estilosIndisponivel() {
  if (document.getElementById("estilo-indisponivel")) return;
  const st = document.createElement("style");
  st.id = "estilo-indisponivel";
  st.textContent = `
    .sidebar-button { flex-wrap: wrap; }
    .sidebar-button.btn-indisponivel { opacity: .45; cursor: not-allowed; }
    .sidebar-button.btn-indisponivel:hover { background: rgba(255,255,255,.06); color: #cbd5e1; }
    .sidebar-button .motivo-btn { flex-basis: 100%; padding-left: 26px; margin-top: -3px; font-size: 10px;
      font-weight: 500; font-style: italic; color: #fbbf24; line-height: 1.2; }`;
  document.head.appendChild(st);
}

// Clique num botão indisponível: não executa e explica o motivo
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".btn-indisponivel");
  if (!btn) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  alert(`⚠️ Indisponível: ${btn.dataset.motivo || "não liberado para o seu perfil"}.`);
}, true);
