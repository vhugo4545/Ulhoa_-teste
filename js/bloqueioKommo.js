const KOMMO_SERVER = "https://kommo-server-9f1243cbe450.herokuapp.com";

function verificarBloqueioKommo() {
  const tipoUsuario = localStorage.getItem("usuarioTipo") || "(não definido)";
  const idProposta  = new URLSearchParams(window.location.search).get("id");
  console.log(`[kommo-lock] usuarioTipo: ${tipoUsuario} | idProposta: ${idProposta}`);

  if (tipoUsuario === "admin") {
    console.log("[kommo-lock] Admin detectado — bloqueio não aplicado.");
    return;
  }
  if (!idProposta) {
    console.warn("[kommo-lock] ID da proposta não encontrado na URL.");
    return;
  }

  function mostrarBanner(bloqueado, nomeEtapa) {
    const existente = document.getElementById("aviso-bloqueio-kommo");
    if (existente) existente.remove();
    const aviso = document.createElement("div");
    aviso.id = "aviso-bloqueio-kommo";
    if (bloqueado) {
      aviso.innerHTML = `
        <div style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:14px 18px;border-radius:10px;margin-bottom:16px;font-weight:700;font-size:14px;">
          🔒 Orçamento bloqueado — etapa: <strong>${nomeEtapa}</strong>
        </div>`;
    } else {
      aviso.innerHTML = `
        <div style="background:#dcfce7;color:#166534;border:1px solid #86efac;padding:14px 18px;border-radius:10px;margin-bottom:16px;font-weight:700;font-size:14px;">
          🔓 Orçamento desbloqueado — etapa: <strong>${nomeEtapa}</strong>
        </div>`;
    }
    const main = document.querySelector("main") || document.body;
    main.insertBefore(aviso, main.firstChild);
  }

  function aplicarBloqueio() {
    document.querySelectorAll("input, select, textarea, button").forEach(el => {
      if (el.id === "btn-pedido-finalizado") return;
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
      if (el.id === "btn-pedido-finalizado") return;
      el.dataset.onclickOriginal = el.getAttribute("onclick") || "";
      el.removeAttribute("onclick");
    });
  }

  function checar() {
    const cfgServer = window.CFgAPI?.obter()?.travamentoKommo;
    const cfgKommo = (cfgServer && Object.keys(cfgServer).length)
      ? cfgServer
      : (() => { try { return JSON.parse(localStorage.getItem("cfg_travamento_kommo")) || {}; } catch { return {}; } })();

    const token = localStorage.getItem("accessToken") || "";

    Promise.all([
      fetch(`${KOMMO_SERVER}/proposta/${idProposta}/lead`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null),
      fetch(`${KOMMO_SERVER}/kommo/pipelines`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
    ])
    .then(([lead, pipelines]) => {
      if (!lead) { console.warn("[kommo-lock] Lead não encontrado."); return; }
      console.log("[kommo-lock] Resposta do lead:", lead);

      const statusId = String(lead.status_id);
      let nomeEtapa  = statusId;
      for (const p of (pipelines || [])) {
        const etapa = (p.etapas || []).find(e => String(e.status_id) === statusId);
        if (etapa) { nomeEtapa = etapa.nome; break; }
      }

      const bloqueado = cfgKommo[statusId] === true;
      console.log(`[kommo-lock] Etapa: ${nomeEtapa} (${statusId}) — bloqueada: ${bloqueado}`);
      console.log("[kommo-lock] Config travamentoKommo:", cfgKommo);

      mostrarBanner(bloqueado, nomeEtapa);
      if (bloqueado) aplicarBloqueio();
    })
    .catch(e => console.warn("[kommo-lock] Erro ao verificar etapa:", e.message));
  }

  checar();
  document.addEventListener("cfgapi:pronto", () => checar(), { once: true });
}
