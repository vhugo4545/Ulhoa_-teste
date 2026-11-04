// Regra "Só gestores criam propostas fora da Kommo" (Ajustes → CFG.criarPropostaSoGestor).
// Ligada: o botão "Criar Proposta" da listagem some e criar.html volta para a listagem
// para quem não é gestor nem admin. Propostas vindas da Kommo não passam por aqui.
(function () {
  const CFG_URL = "https://utils-b488312867a6.herokuapp.com/api/configuracoes";
  const CFG_LS = "ulhoa_cfg_v1";
  const tipo = String(localStorage.getItem("usuarioTipo") || "usuario").toLowerCase();
  const podeSempre = tipo === "gestor" || tipo === "admin";

  const lerCache = () => { try { return JSON.parse(localStorage.getItem(CFG_LS)) || {}; } catch { return {}; } };
  const bloqueado = cfg => !podeSempre && cfg?.criarPropostaSoGestor === true;

  function aplicar(cfg) {
    const travar = bloqueado(cfg);
    if (/criar\.html$/.test(location.pathname) && travar) {
      alert("A criação de propostas fora da Kommo está liberada só para gestores.");
      location.replace("listagem.html");
      return;
    }
    const btn = document.getElementById("save-proposal");
    if (btn && /listagem\.html$/.test(location.pathname)) btn.style.display = travar ? "none" : "";
  }

  // Cache primeiro (sem piscar o botão); depois confere a versão do servidor
  const aoCarregar = fn => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn();
  aoCarregar(() => aplicar(lerCache()));
  fetch(CFG_URL).then(r => r.ok ? r.json() : null).then(cfg => {
    if (!cfg || typeof cfg !== "object") return;
    try { localStorage.setItem(CFG_LS, JSON.stringify({ ...lerCache(), ...cfg })); } catch {}
    aoCarregar(() => aplicar(cfg));
  }).catch(() => {});
})();
