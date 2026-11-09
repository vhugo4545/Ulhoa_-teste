const KOMMO_SERVER = "https://kommo-server-9f1243cbe450.herokuapp.com";
console.log("[bloqueioKommo] script carregado ✓");

function verificarBloqueioKommo() {
  const tipoUsuario = localStorage.getItem("usuarioTipo") || "(não definido)";
  const idProposta  = new URLSearchParams(window.location.search).get("id");
  console.log(`[kommo-lock] usuarioTipo: ${tipoUsuario} | idProposta: ${idProposta}`);

  // Perfis sem travas (Ajustes → Perfis); padrão: admin e gestor
  const isSuperUser = (window.Permissoes ? window.Permissoes.pode("semTravas") : (tipoUsuario === "admin" || tipoUsuario === "gestor"));
  if (!idProposta) {
    console.warn("[kommo-lock] ID da proposta não encontrado na URL.");
    return;
  }

  // Pedidos de desbloqueio por etapa (decididos pelo aprovador definido em Ajustes)
  const API_APROV = "https://ulhoa-0a02024d350a.herokuapp.com/api/aprovacoes-valor";
  // Espera no máximo 4s: se a API demorar, o bloqueio por etapa não pode atrasar
  function buscarAprovacoesEtapa() {
    const busca = fetch(`${API_APROV}?propostaId=${idProposta}&tipo=etapa`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => []);
    const limite = new Promise(resolve => setTimeout(() => resolve([]), 4000));
    return Promise.race([busca, limite]);
  }

  function mostrarBanner(bloqueado, nomeEtapa, bloquearPdfs, liberadoPor) {
    const existente = document.getElementById("aviso-bloqueio-kommo");
    if (existente) existente.remove();
    const aviso = document.createElement("div");
    aviso.id = "aviso-bloqueio-kommo";
    if (bloqueado) {
      const detalhe = bloquearPdfs ? "ajustes e PDFs bloqueados" : "ajustes bloqueados · PDFs liberados";
      aviso.innerHTML = `
        <div style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:14px 18px;border-radius:10px;margin-bottom:16px;font-weight:700;font-size:14px;">
          🔒 Orçamento bloqueado — etapa: <strong>${nomeEtapa}</strong>
          <span style="font-weight:400;font-size:12px;margin-left:8px;">(${detalhe})</span>
        </div>`;
    } else {
      aviso.innerHTML = `
        <div style="background:#dcfce7;color:#166534;border:1px solid #86efac;padding:14px 18px;border-radius:10px;margin-bottom:16px;font-weight:700;font-size:14px;">
          🔓 ${liberadoPor ? "Etapa desbloqueada" : "Etapa sem bloqueio"} — etapa: <strong>${nomeEtapa}</strong>
          ${liberadoPor ? `<span style="font-weight:400;font-size:12px;margin-left:8px;">(${liberadoPor})</span>` : ""}
        </div>`;
    }
    const main = document.querySelector("main") || document.body;
    main.insertBefore(aviso, main.firstChild);
  }

  function aplicarBloqueio(bloquearPdfs, apenasVisual = false) {
    const idsLivres = new Set(["btn-pedido-finalizado"]);
    const idsPdf = ["btn-visualizar-proposta", "btn-folhas-impressao"];
    if (!bloquearPdfs) {
      idsPdf.forEach(id => idsLivres.add(id));
    }

    if (!apenasVisual) {
      document.querySelectorAll("input, select, textarea, button").forEach(el => {
        if (idsLivres.has(el.id)) return;
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
        if (idsLivres.has(el.id)) return;
        el.dataset.onclickOriginal = el.getAttribute("onclick") || "";
        el.removeAttribute("onclick");
      });
    }

    // Aplica badge nos botões de PDF conforme estado
    idsPdf.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (bloquearPdfs) {
        btn.classList.add("btn-bloqueado");
        btn.classList.remove("btn-pdf-livre");
      } else {
        btn.classList.remove("btn-bloqueado");
        btn.classList.add("btn-pdf-livre");
        btn.style.pointerEvents = "";
        btn.style.opacity = "";
        btn.style.cursor = "";
        btn.disabled = false;
      }
    });
  }

  // Data Pedido Assinado = campo "Contrato Assinado" da Kommo, mesmo que o PDV tenha salvo outra.
  // O campo fica só leitura e o salvar grava esta data por cima da anterior.
  // preencher.js usa window._kommoContratoAssinado se a proposta carregar depois do lead.
  function aplicarContratoAssinado(data) {
    window._kommoContratoAssinado = data;
    const el = document.getElementById("dataPedidoAssinado");
    if (el) {
      el.value = data;
      el.dataset.valorOriginal = data;
      el.readOnly = true;
      el.style.background = "#f3f3f3";
      el.title = "Vem do campo \"Contrato Assinado\" da Kommo";
    }
    document.querySelectorAll('.tab-pane input[name="dataPedidoAssinado"]').forEach(inp => { inp.value = data; });
    window.atualizarPrazosPDV?.();
  }

  // "Assinatura do cliente no projeto" (aba Prazos de cada grupo) = campo "Assinatura de Projeto" da Kommo.
  // Fica só leitura em todos os grupos; preencher.js e criarBlocoDeProposta usam window._kommoAssinaturaProjeto.
  function aplicarAssinaturaProjeto(data) {
    window._kommoAssinaturaProjeto = data;
    document.querySelectorAll('.tab-pane input[name="dataAssinaturaCliente"]').forEach(inp => window.travarAssinaturaProjetoKommo?.(inp));
  }

  function checar() {
    const cfgServer = window.CFgAPI?.obter()?.travamentoKommo;
    const cfgKommo = (cfgServer && Object.keys(cfgServer).length)
      ? cfgServer
      : (() => { try { return JSON.parse(localStorage.getItem("cfg_travamento_kommo")) || {}; } catch { return {}; } })();

    const cfgOmieServer = window.CFgAPI?.obter()?.omieEtapas;
    const cfgOmie = (cfgOmieServer && Object.keys(cfgOmieServer).length)
      ? cfgOmieServer
      : (() => { try { return JSON.parse(localStorage.getItem("cfg_omie_etapas")) || {}; } catch { return {}; } })();

    const cfgBotoesServer = window.CFgAPI?.obter()?.botoesKommo;
    const cfgBotoes = (cfgBotoesServer && Object.keys(cfgBotoesServer).length)
      ? cfgBotoesServer
      : (() => { try { return JSON.parse(localStorage.getItem("cfg_botoes_kommo")) || {}; } catch { return {}; } })();

    const cfgModServer = window.CFgAPI?.obter()?.travamentoModificacoes;
    const cfgModificacoes = (cfgModServer && Object.keys(cfgModServer).length)
      ? cfgModServer
      : (() => { try { return JSON.parse(localStorage.getItem("cfg_travamento_modificacoes")) || {}; } catch { return {}; } })();

    const token = localStorage.getItem("accessToken") || "";

    Promise.all([
      fetch(`${KOMMO_SERVER}/proposta/${idProposta}/lead`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null),
      buscarAprovacoesEtapa(),
    ])
    .then(([lead, aprovacoes]) => {
      if (!lead) { console.warn("[kommo-lock] Lead não encontrado."); return; }
      console.log("[kommo-lock] Resposta do lead:", lead);

      if ("contratoAssinado" in lead) aplicarContratoAssinado(lead.contratoAssinado || "");
      if ("assinaturaProjeto" in lead) aplicarAssinaturaProjeto(lead.assinaturaProjeto || "");

      const statusId = String(lead.status_id);
      const nomeEtapa = lead.nomeEtapa || statusId;
      window._kommoStatusAtual = { statusId, nomeEtapa };

      // Liberação aprovada: "sempre" vale em qualquer etapa; "etapa" só nesta etapa
      const liberacao = (aprovacoes || []).find(a => a.status === "aprovado" &&
        (a.modo === "sempre" || (a.modo === "etapa" && String(a.statusId) === statusId))) || null;
      const liberado = !!liberacao && !isSuperUser;

      const tipoBloqueio = liberado ? false : cfgKommo[statusId]; // false | "ajustes" | "tudo"
      const bloqueado    = tipoBloqueio === "ajustes" || tipoBloqueio === "tudo";
      const bloquearPdfs = tipoBloqueio === "tudo";
      console.log(`[kommo-lock] Etapa: ${nomeEtapa} (${statusId}) — tipo: ${tipoBloqueio || "livre"}${liberado ? " (liberado por aprovação)" : ""}`);
      console.log("[kommo-lock] Config travamentoKommo:", cfgKommo);

      const liberadoPor = liberado
        ? `liberado por ${liberacao.aprovador || "aprovador"} · ${liberacao.modo === "sempre" ? "em qualquer etapa" : "nesta etapa"}`
        : "";
      mostrarBanner(bloqueado, nomeEtapa, bloquearPdfs, liberadoPor);
      if (bloqueado) aplicarBloqueio(bloquearPdfs, isSuperUser);

      // Estado para o botão flutuante de desbloqueio (desbloqueioFlutuante.js)
      const botoesTravados = (cfgBotoes[statusId] && typeof cfgBotoes[statusId] === "object")
        ? Object.values(cfgBotoes[statusId]).some(Boolean) : false;
      const ultima = (aprovacoes || []).find(a => a.status !== "cancelado");
      window._kommoBloqueio = {
        statusId, nomeEtapa,
        travado: !isSuperUser && !liberado && (bloqueado || !!cfgModificacoes[statusId] || botoesTravados),
        liberacao,
        pendente: (aprovacoes || []).find(a => a.status === "pendente") || null,
        negado: ultima?.status === "negado" ? ultima : null,
      };
      document.dispatchEvent(new CustomEvent("kommo-bloqueio:atualizado"));

      // Bloqueia botão "Salvar Proposta" conforme config de modificação
      if (cfgModificacoes[statusId] && !isSuperUser && !liberado) {
        const btnEditar = document.getElementById("btn-editar");
        if (btnEditar) {
          btnEditar.disabled = true;
          btnEditar.style.pointerEvents = "none";
          btnEditar.style.opacity = "0.6";
          btnEditar.style.cursor = "not-allowed";
          btnEditar.title = "Modificações bloqueadas nesta etapa";
        }
      }

      // Controla botão "Enviar para Omie" conforme permissão da etapa
      const omiePermitido = !!cfgOmie[statusId];
      const btnOmie = document.getElementById("btn-gerar-pedido");
      if (btnOmie) {
        if (omiePermitido) {
          btnOmie.style.display = "";
          btnOmie.disabled = false;
          btnOmie.style.pointerEvents = "";
          btnOmie.style.opacity = "";
          btnOmie.classList.remove("btn-bloqueado");
        } else {
          btnOmie.style.display = "none";
        }
      }

      // Bloqueio por botão PDF individual
      const botoesEtapa = (!liberado && cfgBotoes[statusId] && typeof cfgBotoes[statusId] === "object") ? cfgBotoes[statusId] : {};
      const TODOS_BOTOES_PDF = [
        "btn-visualizar-proposta",
        "btn-folhas-impressao",
        "btn-folha-ordem-servico",
        "btn-etapas-processo",
        "btn-historico-producao",
      ];
      // As folhas do popup "Folhas de Impressão" só existem com ele aberto: o popup chama de novo
      const aplicarPdfsEtapa = () => TODOS_BOTOES_PDF.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (botoesEtapa[id]) {
          el.classList.add("btn-bloqueado");
          el.classList.remove("btn-pdf-livre");
          if (!isSuperUser) {
            el.disabled = true;
            el.style.pointerEvents = "none";
            el.style.opacity = "0.85";
            el.style.cursor = "not-allowed";
          }
        } else {
          el.classList.remove("btn-bloqueado");
          if (!el.classList.contains("btn-pdf-livre")) {
            el.classList.add("btn-pdf-livre");
          }
          el.style.pointerEvents = "";
          el.style.opacity = "";
          el.style.cursor = "";
          el.disabled = false;
        }
      });
      window._kommoAplicarPdfs = aplicarPdfsEtapa;
      aplicarPdfsEtapa();
    })
    .catch(e => console.warn("[kommo-lock] Erro ao verificar etapa:", e.message));
  }

  checar();
  document.addEventListener("cfgapi:pronto", () => checar(), { once: true });
}
