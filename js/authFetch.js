/**
 * authFetch.js
 * Intercepta window.fetch e injeta Authorization: Bearer <token>
 * automaticamente em todas as chamadas para os backends protegidos,
 * exceto rotas públicas de autenticação.
 */
(function () {
  const PROTECTED_ORIGINS = [
    "https://ulhoa-0a02024d350a.herokuapp.com",
    "https://kommo-server-9f1243cbe450.herokuapp.com",
    "https://ulhoa-servico-ec4e1aa95355.herokuapp.com",
    "https://ulhoa-vidros-1ae0adcf5f73.herokuapp.com",
  ];

  // Rotas que NÃO exigem token (login, register, refresh)
  const PUBLIC_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/autenticacao",
  ];

  function getToken() {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  }

  function isPublic(urlStr) {
    return PUBLIC_PATHS.some((p) => urlStr.includes(p));
  }

  const _origFetch = window.fetch.bind(window);

  window.fetch = function (url, options) {
    try {
      const urlStr =
        typeof url === "string"
          ? url
          : url instanceof Request
          ? url.url
          : String(url);

      if (PROTECTED_ORIGINS.some(o => urlStr.startsWith(o)) && !isPublic(urlStr)) {
        const token = getToken();
        if (token) {
          options = options ? { ...options } : {};
          const existing =
            options.headers instanceof Headers
              ? Object.fromEntries(options.headers.entries())
              : options.headers || {};
          options.headers = {
            ...existing,
            Authorization: "Bearer " + token,
          };
        }
      }
    } catch (_) {
      // em caso de erro na interceptação, deixa o fetch original passar
    }

    const resp = _origFetch(url, options);
    _avisarProducao(url, options, resp);
    return resp;
  };

  // Proposta salva no PDV → avisa o app de produção para atualizar a cópia dele na hora
  // (datas de entrega, condição e prazo aparecem lá sem recarregar). Não interfere no salvar.
  function _avisarProducao(url, options, resp) {
    try {
      const urlStr = typeof url === "string" ? url : url instanceof Request ? url.url : String(url);
      const metodo = String(options?.method || (url instanceof Request ? url.method : "GET")).toUpperCase();
      const m = urlStr.match(/^https:\/\/ulhoa-0a02024d350a\.herokuapp\.com\/api\/propostas\/([a-f0-9]{24})(?:[?#]|$)/i);
      if (!m || (metodo !== "PUT" && metodo !== "PATCH")) return;
      resp.then(r => {
        if (!r.ok) return;
        _origFetch("https://app-producao-b843a894d7ea.herokuapp.com/api/proposals-cache/atualizar/" + m[1], { method: "POST" }).catch(() => {});
      }).catch(() => {});
    } catch (_) {}
  }
})();
