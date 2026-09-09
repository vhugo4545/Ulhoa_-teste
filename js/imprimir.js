let contadorGlobal = 1;

// ── Validação compartilhada: itens com custo zero ────────────────────────────
async function validarItensZeradosParaImpressao() {
  const _idAtual = new URLSearchParams(window.location.search).get("id");
  if (_idAtual === "68746e305b9691a7ed3b3f97") return true; // modelo — não valida
  const itensZerados = [];
  document.querySelectorAll("tbody").forEach(tbody => {
    tbody.querySelectorAll("tr").forEach((tr, idx) => {
      if (idx === 0) return; // primeiro item de cada grupo isento
      const custoTd = tr.querySelector("td.custo-unitario");
      if (!custoTd) return;
      const valor = parseFloat(custoTd.textContent.replace(/[^\d,\.]/g, "").replace(",", ".")) || 0;
      if (valor === 0) {
        const nome = tr.querySelectorAll("td")[1]?.textContent?.trim() || `Linha ${idx + 1}`;
        itensZerados.push(nome);
      }
    });
  });

  if (itensZerados.length === 0) return true;

  return new Promise(resolve => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;";
    const lista = itensZerados.map(n => `<li style="margin-bottom:4px;">${n}</li>`).join("");
    ov.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:28px;width:min(480px,92vw);box-shadow:0 16px 48px rgba(0,0,0,.25);max-height:80vh;overflow-y:auto;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">⚠️ Produtos com custo zero</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Os seguintes produtos estão com custo zerado:</div>
        <ul style="font-size:13px;color:#ef4444;font-weight:600;padding-left:18px;margin-bottom:24px;">${lista}</ul>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="_imp_bloquear" style="padding:9px 24px;border:none;border-radius:8px;background:#475569;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Entendido</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById("_imp_bloquear").onclick = () => { document.body.removeChild(ov); resolve(false); };
  });
}

// 1. Função principal: chamada pelo botão "Visualizar Proposta"

async function carregarLogoBase64(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function () {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      } catch (e) {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}

async function gerarOrcamentoParaImpressaoCompleta() {
  if (!await validarItensZeradosParaImpressao()) return;
  const logoAbsUrl = new URL("../js/logo.jpg", window.location.href).href;
  const logoBase64 = await carregarLogoBase64(logoAbsUrl) || logoAbsUrl;
  function moedaBRParaNumero(valor) {
    if (valor == null || valor === "") return 0;

    // Se já for número, retorna direto
    if (typeof valor === "number") return valor;

    const texto = String(valor).trim();

    // Se vier no formato BR: 162.782,72
    if (texto.includes(",")) {
      return parseFloat(
        texto
          .replace(/[^\d,.-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
      ) || 0;
    }

    // Se vier no formato JS: 162782.72
    return parseFloat(
      texto.replace(/[^\d.-]/g, "")
    ) || 0;
  }

  function numeroParaMoedaBR(valor) {
    const numero = typeof valor === "number" ? valor : moedaBRParaNumero(valor);

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  const idsObrigatorios = [
    "numeroOrcamento",
    "dataOrcamento",
    "origemCliente",
    "nomeOrigem",
    "telefoneOrigem",
    "emailOrigem",
    "operadorInterno",
    "vendedorResponsavel"
  ];

  const pendentes = [];

  idsObrigatorios.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const valor = (el.value || el.textContent || "").trim();

    if (!valor) {
      pendentes.push(el);
      el.classList.add("campo-pendente");
    } else {
      el.classList.remove("campo-pendente");
    }
  });

  if (pendentes.length) {
    const continuar = confirm(
      `Existem ${pendentes.length} campo(s) obrigatório(s) vazio(s).\nEles foram destacados em vermelho.\n\nDeseja continuar mesmo assim?`
    );
    if (!continuar) return;
  }

  const grupos = [];

  document.querySelectorAll("table[id^='tabela-bloco-']").forEach(tabela => {
    const grupoId = tabela.id.replace("tabela-", "").trim();

    const inputAmbiente = document.querySelector(
      `input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`
    );

    const nomeAmbiente = inputAmbiente?.value.trim() || "Sem Ambiente";

    const linhaProduto = tabela.querySelector("tbody tr");
    let nomeProduto = "";

    if (linhaProduto) {
      const colunas = linhaProduto.querySelectorAll("td");
      nomeProduto = (colunas[1]?.textContent || colunas[0]?.textContent || "").trim();
    }

    const totalGrupoTexto =
      tabela.querySelector("tfoot td[colspan='6'] strong")?.textContent || "R$ 0,00";

    const totalGrupo = moedaBRParaNumero(totalGrupoTexto);

    grupos.push({
      grupoId,
      nomeAmbiente,
      totalGrupo,
      nomeProduto
    });
  });

  const totalBrutoTexto =
    document.getElementById("valorTotalSemDesconto")?.textContent ||
    document.getElementById("valorBrutoTotal")?.textContent ||
    "R$ 0,00";

  const totalFinalTexto =
    document.getElementById("valorFinalTotal")?.textContent ||
    document.getElementById("totalComDesconto")?.textContent ||
    document.getElementById("valorTotalFinal")?.textContent ||
    "R$ 0,00";

  const totalBruto = moedaBRParaNumero(totalBrutoTexto);
  const totalComDesconto = moedaBRParaNumero(totalFinalTexto);
  const desconto = totalBruto - totalComDesconto;

  console.log("DEBUG VALORES IMPRESSÃO:", {
    totalBrutoTexto,
    totalFinalTexto,
    totalBruto,
    totalComDesconto,
    desconto,
    totalBrutoFormatado: numeroParaMoedaBR(totalBruto),
    totalComDescontoFormatado: numeroParaMoedaBR(totalComDesconto),
    descontoFormatado: numeroParaMoedaBR(desconto)
  });

  // Notificação: prazos não preenchidos
  const semPrazo = grupos.filter(g => {
    const prazo = document.querySelector(`#${g.grupoId}-aba3 input[name="previsaoEntrega"]`)?.value?.trim();
    const info  = document.querySelector(`#${g.grupoId}-aba3 textarea[name="informacoesProduto"]`)?.value?.trim();
    return !prazo && !info;
  });
  if (semPrazo.length) {
    const nomes = semPrazo.map(g => `• ${g.nomeAmbiente}`).join("\n");
    alert(`Atenção: os itens abaixo estão sem Prazo Previsto preenchido:\n\n${nomes}\n\nA impressão continuará normalmente.`);
  }

  mostrarPopupSelecaoGruposEstetico(
    grupos,
    totalComDesconto,
    function(gruposOcultarProduto) {
      gerarPDFComPdfmake(gruposOcultarProduto, {
        totalBruto,
        desconto,
        totalComDesconto,
        logoBase64
      });
    }
  );
}
// 2. Função de popup estético para ocultar produtos
function mostrarPopupSelecaoGruposEstetico(grupos, valorFinal, onConfirmar) {
  // CSS do popup (apenas uma vez)
  if (!document.getElementById("estetico-popup-style")) {
    const style = document.createElement("style");
    style.id = "estetico-popup-style";
    style.innerHTML = `
#popup-overlay-custom {
  position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;
  background:rgba(34,37,51,0.79);display:flex;align-items:center;justify-content:center;
  animation:popupfadein .12s;
}
@keyframes popupfadein{from{opacity:0}to{opacity:1}}
#popup-modal-custom {
  background:#fff;border-radius:15px;box-shadow:0 6px 38px #1118;
  padding:0;min-width:320px;max-width:430px;width:98%;overflow:hidden;max-height:96vh;display:flex;flex-direction:column;
}
#popup-modal-custom .header {
  background:linear-gradient(90deg,#377dff 0,#2a4d94 100%);
  color:#fff;padding:20px 25px 14px 25px;border-radius:15px 15px 0 0;
  font-size:1.22rem;font-weight:600;letter-spacing:.01em;box-shadow:0 2px 16px #2132;
}
#popup-modal-custom .body {
  padding:22px 18px 7px 22px;flex:1;overflow-y:auto;max-height:400px;
}
#popup-modal-custom .grupo-row {
  display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:9px;border-bottom:1px solid #f2f4f7;
  padding-bottom:10px;
}
#popup-modal-custom .grupo-row:last-child{border-bottom:0}
#popup-modal-custom .grupo-info strong{font-size:1.07em;}
#popup-modal-custom .grupo-info {flex:1;}
#popup-modal-custom .grupo-info .produto{color:#222;font-size:.96em;}
#popup-modal-custom .grupo-info .valor{color:#2a4d94;font-size:.99em;font-weight:600;}
#popup-modal-custom .grupo-checkbox {margin-left:8px;white-space:nowrap;min-width:125px;}
#popup-modal-custom .footer {
  border-top:1px solid #f4f6fa;padding:14px 22px 18px 22px;display:flex;flex-direction:column;align-items:flex-end;background:#f8fafb;
}
#popup-modal-custom .footer .total {
  font-weight:bold;font-size:1.09em;color:#345;letter-spacing:.01em;margin-bottom:5px;
}
#popup-modal-custom .btn-row {
  display:flex;gap:11px;margin-top:10px;
}
#popup-modal-custom button {
  padding:8px 24px;border-radius:8px;border:none;outline:none;font-size:1em;
  font-weight:500;cursor:pointer;transition:background .16s;
}
#popup-modal-custom .btn-cancelar {background:#f2f2f2;color:#234;}
#popup-modal-custom .btn-cancelar:hover {background:#ececec;}
#popup-modal-custom .btn-confirmar {background:#377dff;color:#fff;}
#popup-modal-custom .btn-confirmar:hover {background:#2656af;}
    `;
    document.head.appendChild(style);
  }

  // HTML do popup
  let overlay = document.getElementById("popup-overlay-custom");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "popup-overlay-custom";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div id="popup-modal-custom" tabindex="0">
      <div class="header">Opções de Impressão dos Ambientes</div>
      <form class="body" id="form-opcoes-grupos-custom">
        ${grupos.map(g => `
        <div class="grupo-row">
          <div class="grupo-info">
            <strong>${g.nomeAmbiente}</strong>
            <div class="valor">R$ ${g.totalGrupo.toFixed(2).replace('.', ',')}</div>
            <div class="produto">${g.nomeProduto ? `<span style="color:#375;">Produto:</span> ${g.nomeProduto}` : ''}</div>
          </div>
          <label class="grupo-checkbox">
            <input type="checkbox" name="ocultarProduto" data-grupoid="${g.grupoId}" checked>
            <span style="font-size:.99em;">Ocultar produto principal</span>
          </label>
        </div>`).join('')}
      </form>
      <div class="footer">
        <div class="total">Valor Final Geral: R$ ${valorFinal.toFixed(2).replace('.', ',')}</div>
        <div class="btn-row">
          <button type="button" class="btn-cancelar" id="btnCancelarModalCustom">Cancelar</button>
          <button type="button" class="btn-confirmar" id="btnConfirmarModalCustom">Visualizar</button>
        </div>
      </div>
    </div>
  `;

  overlay.style.display = "flex";
  overlay.querySelector("#popup-modal-custom").focus();
 overlay.querySelector("#btnCancelarModalCustom").onclick = function() {
    overlay.style.display = "none";
  };
 overlay.querySelector("#btnConfirmarModalCustom").onclick = function() {
  const checkboxes = overlay.querySelectorAll("input[name='ocultarProduto']");
  const opcoes = {};
  checkboxes.forEach(cb => {
    const key = (cb.dataset.grupoid || "").trim();
    // ✅ marcado = ocultar (false para exibir, true para ocultar – conforme sua lógica atual)
    opcoes[key] = !cb.checked;
  });
  overlay.style.display = "none";
  onConfirmar(opcoes);
};

}



// Função auxiliar para formatar valores em Real
function formatarReal(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}// ==========================
// VALIDAÇÃO: INSUMOS COM VALOR OU QUANTIDADE ZERADOS
// (ignora a linha 1 de cada tabela = Produto Acabado / máscara)
// ==========================
function validarInsumosZerados() {
  const parseBRLLocal = (valor) => {
    if (valor == null || valor === "") return 0;
    const str = String(valor).replace(/\u00A0/g, " ").trim();
    if (str.includes(",")) {
      const limpo = str.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number(limpo);
      return isNaN(n) ? 0 : n;
    }
    const limpo = str.replace(/[^\d.-]/g, "");
    const n = Number(limpo);
    return isNaN(n) ? 0 : n;
  };
  const problemas = [];
  document.querySelectorAll("table[id^='tabela-bloco-']").forEach(tabela => {
    const grupoId = tabela.id.replace("tabela-", "").trim();
    const inputAmbiente = document.querySelector(`input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`);
    const nomeAmbiente = inputAmbiente?.value?.trim() || "Sem Ambiente";
    const linhas = Array.from(tabela.querySelectorAll("tbody tr"));
    linhas.forEach((linha, idx) => {
      if (idx === 0) return; // linha 1 = Produto Acabado (máscara), não valida
      const descricao = linha.querySelectorAll("td")?.[1]?.textContent.trim() || "(sem descrição)";
      const custoFinal = parseBRLLocal(linha.querySelector("td.custo-unitario")?.textContent);
      const qtdInput = linha.querySelector("input.quantidade");
      const quantidade = qtdInput ? parseFloat(qtdInput.value) : 0;
      if (custoFinal === 0) {
        problemas.push(`${nomeAmbiente} → ${descricao}: Valor de Custo Final zerado`);
      }
      if (!quantidade || quantidade === 0) {
        problemas.push(`${nomeAmbiente} → ${descricao}: Quantidade zerada`);
      }
    });
  });
  return problemas;
}

// ==========================
// VALIDAÇÃO: INSUMOS COM VALOR OU QUANTIDADE ZERADOS
// (ignora a linha 1 de cada tabela = Produto Acabado / máscara)
// ==========================
function validarInsumosZerados() {
  const _idAtual = new URLSearchParams(window.location.search).get("id");
  if (_idAtual === "68746e305b9691a7ed3b3f97") return []; // modelo — não valida
  const parseBRLLocal = (valor) => {
    if (valor == null || valor === "") return 0;
    const str = String(valor).replace(/\u00A0/g, " ").trim();
    if (str.includes(",")) {
      const limpo = str.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number(limpo);
      return isNaN(n) ? 0 : n;
    }
    const limpo = str.replace(/[^\d.-]/g, "");
    const n = Number(limpo);
    return isNaN(n) ? 0 : n;
  };
  const problemas = [];
  document.querySelectorAll("table[id^='tabela-bloco-']").forEach(tabela => {
    const grupoId = tabela.id.replace("tabela-", "").trim();
    const inputAmbiente = document.querySelector(`input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`);
    const nomeAmbiente = inputAmbiente?.value?.trim() || "Sem Ambiente";
    const linhas = Array.from(tabela.querySelectorAll("tbody tr"));
    linhas.forEach((linha, idx) => {
      if (idx === 0) return; // linha 1 = Produto Acabado (máscara), não valida
      const descricao = linha.querySelectorAll("td")?.[1]?.textContent.trim() || "(sem descrição)";
      const custoFinal = parseBRLLocal(linha.querySelector("td.custo-unitario")?.textContent);
      const qtdInput = linha.querySelector("input.quantidade");
      const quantidade = qtdInput ? parseFloat(qtdInput.value) : 0;
      if (custoFinal === 0) {
        problemas.push(`${nomeAmbiente} → ${descricao}: Valor de Custo Final zerado`);
      }
      if (!quantidade || quantidade === 0) {
        problemas.push(`${nomeAmbiente} → ${descricao}: Quantidade zerada`);
      }
    });
  });
  return problemas;
}

function gerarHTMLParaImpressao(gruposOcultarProduto, totais = {}) {
  const logoSrc = totais.logoBase64 || "../js/logo.jpg";
  // ==========================
  // VALIDAÇÃO ANTES DE IMPRIMIR
  // ==========================
  const problemas = validarInsumosZerados();
  if (problemas.length > 0) {
    const continuar = confirm(
      "Atenção! Os seguintes insumos estão com Valor de Custo Final ou Quantidade zerados:\n\n" +
      problemas.map(p => `• ${p}`).join("\n") +
      "\n\nDeseja continuar mesmo assim?"
    );
    if (!continuar) return;
  }
  const getValue = id => document.getElementById(id)?.value || "-";
  const getTextOrValue = (el) => {
    if (!el) return "";
    if (typeof el.value === "string" && el.value.trim()) return el.value.trim();
    if (typeof el.textContent === "string" && el.textContent.trim()) return el.textContent.trim();
    return "";
  };
  // ==========================
  // HELPERS MONETÁRIOS AJUSTADOS
  // ==========================
  const parseBRL = (valor) => {
    if (valor == null || valor === "") return 0;
    if (typeof valor === "number") return valor;
    const str = String(valor).replace(/\u00A0/g, " ").trim();
    // formato BR: 162.782,72
    if (str.includes(",")) {
      const limpo = str
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const n = Number(limpo);
      return isNaN(n) ? 0 : n;
    }
    // formato numérico JS: 162782.72
    const limpo = str.replace(/[^\d.-]/g, "");
    const n = Number(limpo);
    return isNaN(n) ? 0 : n;
  };
  const fmtBRL = (n) => {
    const numero = typeof n === "number" ? n : parseBRL(n);
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };
  const formatarDataBR = (iso) => {
    if (!iso) return "-";
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return "-";
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  };
  const normalizarCondicao = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "";
    if (/^selecione/i.test(t)) return "";
    return t;
  };
  const multilineToBR = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "";
    return t.replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
  };
  const formatarReal = (n) => {
    try {
      return fmtBRL(n);
    } catch {
      return `R$ ${(Number(n) || 0).toFixed(2)}`;
    }
  };
  // ==========================
  // DADOS GERAIS
  // ==========================
  const dados = {
    numero: getValue("numeroOrcamento"),
    numeroPedido: getValue("numeroPedido"),
    data: formatarDataBR(getValue("dataOrcamento")),
    origem: getValue("origemCliente"),
    nomeOrigem: getValue("nomeOrigem"),
    codigoOrigem: getValue("codigoOrigem"),
    telefoneOrigem: getValue("telefoneOrigem"),
    emailOrigem: getValue("emailOrigem"),
    comissao: getValue("comissaoArquiteto"),
    operador: getValue("operadorInterno"),
    enderecoObra: `Rua/Avenida: ${getValue("rua")}, Número: ${getValue("numero")}, Bairro: ${getValue("bairro")} - Complemento: ${getValue("complemento")} - Cidade: ${getValue("cidade")}/${getValue("estado")} - CEP: ${getValue("cep")}`,
    prazos: getValue("prazosArea"),
    condicao: document.getElementById("condicaoPagamento")?.selectedOptions[0]?.textContent.trim() || "-",
    condicoesGerais: getValue("condicoesGerais"),
    vendedor: document.getElementById("vendedorResponsavel")?.selectedOptions[0]?.textContent || "-"
  };
  dados.prazos = (dados.prazos && dados.prazos !== "-") ? multilineToBR(dados.prazos) : "-";
  // ==========================
  // CLIENTES / CONTATOS
  // ==========================
  const clientes = Array.from(document.querySelectorAll("#clientesWrapper .cliente-item"))
    .map(row => ({
      nomeCliente: getTextOrValue(row.querySelector(".razaoSocial")),
      cpfCnpj: getTextOrValue(row.querySelector(".cpfCnpj")),
      codigo: getTextOrValue(row.querySelector(".codigoCliente")),
      nomeContato: getTextOrValue(row.querySelector(".nomeContato")),
      funcao: getTextOrValue(row.querySelector(".funcaoCliente")),
      telefone: getTextOrValue(row.querySelector(".telefoneCliente")),
      email: getTextOrValue(row.querySelector(".emailCliente")),
    }))
    .filter(c => c.nomeCliente || c.nomeContato || c.telefone || c.cpfCnpj);
  const principal = clientes[0] || {};
  dados.nomeCliente = principal.nomeCliente || "-";
  dados.cpfCnpj = principal.cpfCnpj || "-";
  dados.telefoneCliente = principal.telefone || "-";
  dados.contatos = clientes.map((c, idx) => ({
    cliente: idx === 0 ? `${c.nomeCliente || "-"} (Responsável)` : (c.nomeCliente || "-"),
    cpfCnpj: c.cpfCnpj || "-",
    contato: c.nomeContato || "-",
    funcao: c.funcao || "-",
    telefone: c.telefone || "-",
    email: c.email || "-",
  }));
  // ==========================
  // GRUPOS
  // ==========================
  let gruposDados = [];
  document.querySelectorAll("table[id^='tabela-bloco-']").forEach(tabela => {
    const grupoId = tabela.id.replace("tabela-", "").trim();
    const inputAmbiente = document.querySelector(`input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`);
    const nomeAmbiente = inputAmbiente?.value.trim() || "Sem Ambiente";
    const linhaProduto = tabela.querySelector("tbody tr");
    let resumoGrupo = document.getElementById(`resumo-${grupoId}`)?.value?.trim() || "";
    resumoGrupo = resumoGrupo.replace(/\n/g, "<br>");
    const totalGrupoTexto =
      tabela.querySelector("tfoot td[colspan='6'] strong")?.textContent || "R$ 0,00";
    const totalGrupo = parseBRL(totalGrupoTexto);
    let colunas = linhaProduto?.querySelectorAll("td");
    let descricao = colunas?.[1]?.textContent.trim() || "-";
    let qtd = linhaProduto?.querySelector("input.quantidade")?.value || "1";
    const ocultar = !!(gruposOcultarProduto && gruposOcultarProduto[grupoId]);
    const informacoesProduto = document.querySelector(`#${grupoId}-aba3 textarea[name="informacoesProduto"]`)?.value?.trim() || "";
    const previsaoEntrega = document.querySelector(`#${grupoId}-aba3 input[name="previsaoEntrega"]`)?.value?.trim() || "";
    gruposDados.push({
      grupoId,
      nomeAmbiente,
      totalGrupo,
      descricao,
      qtd,
      resumoGrupo,
      informacoesProduto,
      previsaoEntrega,
      ocultar
    });
  });
  // ==========================
  // AGRUPA POR AMBIENTE
  // ==========================
  let ambientes = {};
  gruposDados.forEach(g => {
    if (!ambientes[g.nomeAmbiente]) ambientes[g.nomeAmbiente] = [];
    ambientes[g.nomeAmbiente].push(g);
  });
  let totalGeral = 0;
  let corpoHTML = "";
  let contadorGlobal = 1;
  Object.entries(ambientes).forEach(([nomeAmbiente, grupos]) => {
    const valorTotalAmbiente = grupos.reduce((soma, x) => soma + x.totalGrupo, 0);
    totalGeral += valorTotalAmbiente;
    const gruposVisiveis = grupos.filter(g => !g.ocultar);
    if (gruposVisiveis.length === 0) return;
    gruposVisiveis.forEach((g, idx) => {
      const isFirst = idx === 0;
      const isLast  = idx === gruposVisiveis.length - 1;
      const num = contadorGlobal++;
      corpoHTML += `
        <div class="border mt-2">
          ${isFirst ? `<div class="fw-bold p-2 bg-light text-center" style="border-bottom:1px solid #dee2e6;">AMBIENTE: ${nomeAmbiente.toUpperCase()}</div>` : ""}
          <table class="table table-sm table-bordered w-100 mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:40px;">#</th>
                <th>Descrição</th>
                <th style="width:120px;">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${num}</td>
                <td>${g.descricao}</td>
                <td>${g.qtd}</td>
              </tr>
              ${g.resumoGrupo ? `<tr><td colspan="3"><em>${g.resumoGrupo}</em></td></tr>` : ""}
              ${(g.previsaoEntrega || g.informacoesProduto) ? `<tr><td colspan="3" style="font-size:20px;font-weight:700;text-align:center;background:#f8f8f8;padding:5px 8px;">${g.previsaoEntrega ? `<strong>Prazo Previsto:</strong> ${g.previsaoEntrega}` : ""}${g.previsaoEntrega && g.informacoesProduto ? " &nbsp;|&nbsp; " : ""}${g.informacoesProduto || ""}</td></tr>` : ""}
            </tbody>
            ${isLast ? `<tfoot><tr><td colspan="3" class="text-end fw-bold bg-light" style="padding:6px 8px;">Total do Ambiente ${nomeAmbiente.toUpperCase()}: ${formatarReal(valorTotalAmbiente)}</td></tr></tfoot>` : ""}
          </table>
        </div>`;
    });
  });
  // ==========================
  // PARCELAS
  // ==========================
  const parcelas = Array.from(document.querySelectorAll("#listaParcelas .row"))
    .map((row, idx) => {
      const selTipo = row.querySelector("select.tipo-monetario");
      const tipo = selTipo?.selectedOptions?.[0]?.textContent?.trim()
                || selTipo?.value?.trim()
                || "-";
      const wrapCond = row.querySelector(".condicao-wrapper");
      const selCond = wrapCond?.querySelector("select.condicao-pagto");
      const inputCond = wrapCond?.querySelector("input, textarea");
      let condicaoRaw = "";
      if (inputCond && getTextOrValue(inputCond)) {
        condicaoRaw = getTextOrValue(inputCond);
      } else {
        condicaoRaw = selCond?.selectedOptions?.[0]?.textContent?.trim()
                  || selCond?.value?.trim()
                  || "";
      }
      const condicao = normalizarCondicao(condicaoRaw);
      const valorRaw = (row.querySelector("input.valor-parcela")?.value || "").trim();
      let valorExib = valorRaw || "-";
      if (valorRaw && !valorRaw.includes("%")) {
        const num = parseBRL(valorRaw);
        valorExib = fmtBRL(num);
      }
      const vencISO = (row.querySelector("input.data-parcela")?.value || "").trim();
      const venc = vencISO ? formatarDataBR(vencISO) : "-";
      const temAlgo = (tipo !== "-" || condicao !== "" || valorExib !== "-" || venc !== "-");
      if (!temAlgo) return null;
      return { idx: idx + 1, tipo, condicao, valorExib, venc };
    })
    .filter(Boolean);
  const parcelasHTML = parcelas.length
    ? `
      <div class="mt-4">
        <h6 class="text-center fw-bold">Parcelas</h6>
        <table class="table table-bordered table-sm w-100">
          <thead class="table-light">
            <tr>
              <th style="width:40px;">#</th>
              <th style="width:140px;">Tipo</th>
              <th>Condição</th>
              <th style="width:140px;">Valor</th>
              <th style="width:130px;">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${parcelas.map(p => `
              <tr>
                <td>${p.idx}</td>
                <td>${p.tipo}</td>
                <td>${p.condicao || ""}</td>
                <td>${p.valorExib}</td>
                <td>${p.venc}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `
    : "";
  // ==========================
  // TOTAIS GERAIS
  // ==========================
  const valorFinalComDescontoStr =
    document.getElementById("valorFinalTotal")?.textContent || "R$ 0,00";
  const valorFinalComDesconto = parseBRL(valorFinalComDescontoStr);
  const campoDesconto = document.getElementById("campoDescontoFinal")?.value?.trim();
  const temDescontoValido =
    campoDesconto &&
    valorFinalComDesconto > 0 &&
    valorFinalComDesconto < totalGeral;
  const descontoAplicado = temDescontoValido
    ? (totalGeral - valorFinalComDesconto)
    : 0;
  let totalizadoresHTML = temDescontoValido
    ? `
      <div class="border p-2 text-end mt-4 bg-light">
        <div><strong>Total líquido: R$:</strong> ${formatarReal(totalGeral)}</div>
        <div><strong>Desconto Aplicado:</strong> ${formatarReal(descontoAplicado)}</div>
        <div class="fw-bold fs-5 text-success"><strong>Total líquido com desconto aplicado: </strong> ${formatarReal(valorFinalComDesconto)}</div>
      </div>`
    : `
      <div class="border p-2 text-end mt-4 bg-light">
        <div class="fw-bold">Total líquido: R$: ${formatarReal(totalGeral)}</div>
      </div>`;
  // ==========================
  // TABELA DE CONTATOS
  // ==========================
  const tabelaContatosHTML = (dados.contatos && dados.contatos.length)
    ? `
      <h6 class="mt-3 text-center fw-bold">Clientes & Contatos</h6>
      <table class="table table-bordered table-sm w-100">
        <thead class="table-light">
          <tr>
            <th>Nome / Razão Social</th>
            <th>CPF / CNPJ</th>
            <th>Nome do Contato</th>
            <th>Função</th>
            <th>Telefone</th>
          </tr>
        </thead>
        <tbody>
          ${dados.contatos.map(c => `
            <tr>
              <td>${c.cliente}</td>
              <td>${c.cpfCnpj}</td>
              <td>${c.contato}</td>
              <td>${c.funcao}</td>
              <td>${c.telefone}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    : "";
  // ==========================
  // HTML COMPLETO
  // ==========================
  const condicoesGeraisFormatada = multilineToBR(dados.condicoesGerais || "");
  const dataHoje = (() => { const h = new Date(); return `${String(h.getDate()).padStart(2,"0")}/${String(h.getMonth()+1).padStart(2,"0")}/${h.getFullYear()}`; })();
  const nomeCliente = document.querySelector("input.razaoSocial")?.value || document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "-";

  /* ── Cabeçalho página 1: logo + dados do orçamento + dados do cliente ── */
  const cabHTML = `
    <div style="border-bottom:3px solid #1e293b;padding-bottom:6px;margin-bottom:10px;">
      <table class="table table-bordered table-sm w-100" style="margin-bottom:4px;font-size:12px;">
        <tr>
          <td style="width:40%;text-align:center;vertical-align:middle;">
            <img src="${logoSrc}" style="max-height:55px;"><br>
            (31) 98457-7573
          </td>
          <td style="width:60%;">
            <table class="table table-sm w-100 mb-0">
              <tr><td><strong>Orçamento:</strong></td><td>${dados.numero}</td></tr>
              <tr><td><strong>Pedido:</strong></td><td>${dados.numeroPedido}</td></tr>
              <tr><td><strong>Data:</strong></td><td>${dataHoje}</td></tr>
              <tr><td colspan="2"><strong>Proposta válida por 7 dias úteis</strong></td></tr>
            </table>
          </td>
        </tr>
      </table>
      <table class="table table-bordered table-sm w-100" style="margin-bottom:0;font-size:12px;">
        <tr><td style="width:35%;"><strong>Cliente (Responsável):</strong></td><td>${nomeCliente}</td></tr>
        <tr><td><strong>CPF/CNPJ:</strong></td><td>${dados.cpfCnpj}</td></tr>
        <tr><td><strong>Endereço da Obra:</strong></td><td>${dados.enderecoObra}</td></tr>
        <tr><td><strong>Vendedor:</strong></td><td>${dados.vendedor}</td></tr>
      </table>
    </div>`;

  /* ── Cabeçalho páginas 2+: logo + dados do orçamento ── */
  const cabHTMLSimples = `
    <div style="border-bottom:2px solid #1e293b;padding-bottom:6px;margin-bottom:10px;display:flex;align-items:center;gap:14px;">
      <img src="${logoSrc}" style="max-height:38px;flex-shrink:0;">
      <div style="font-size:12px;">
        <strong>Orçamento:</strong> ${dados.numero} &nbsp;|&nbsp;
        <strong>Pedido:</strong> ${dados.numeroPedido} &nbsp;|&nbsp;
        <strong>Data:</strong> ${dataHoje} &nbsp;|&nbsp;
        Proposta válida por 7 dias úteis
      </div>
    </div>`;

  /* Escapa backticks/$ para embed seguro no <script> inline */
  const cabHTMLEsc = cabHTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const cabHTMLSimplesEsc = cabHTMLSimples.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

  const htmlCompleto = `
    <html>
      <head>
        <title>Orçamento ${dados.numero}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          @page { size: A4; margin: 10mm; }

          body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 12px; }

          /* Cada página é um bloco explícito */
          .pagina {
            width: 100%;
            box-sizing: border-box;
            page-break-after: always;
          }
          .pagina:last-child { page-break-after: avoid; }

          /* Número de página */
          .pg-num {
            text-align: left;
            margin: 0 0 10px 0;
            padding: 0;
            clear: both;
            font-size: 16px;
            font-weight: 900;
            font-family: Arial, sans-serif;
            color: #111;
            letter-spacing: 0.5px;
          }

          /* Quebra de página livre dentro das tabelas de conteúdo */
          .pagina table { page-break-inside: auto; }
          .pagina thead { display: table-header-group; }
          .pagina tr { page-break-inside: avoid; page-break-after: auto; }
          img { page-break-inside: avoid; }
          em { color: #444; font-style: italic; }

          /* Conteúdo bruto fica fora da tela para medição */
          #raw { position: absolute; top: -9999px; left: 0; width: 754px; visibility: hidden; }
        </style>
      </head>
      <body>

        <!-- Conteúdo bruto: medido e depois repartido em páginas pelo script -->
        <div id="raw">
          ${tabelaContatosHTML}
          ${corpoHTML}
          ${parcelasHTML}
          ${totalizadoresHTML}
          <div style="border:1px solid #dee2e6;padding:10px;margin-top:14px;font-size:12px;">
            <strong>PRAZO PREVISTO:</strong><br>${dados.prazos}<br><br>
            <strong>Condições de Pagamento:</strong><br>${dados.condicao}<br><br>
            <strong>Condições Gerais:</strong><br>${condicoesGeraisFormatada}
          </div>
          <br>
          <center>Assinatura Contratante:<br><br>_______________________________________________________________</center>
          <br>
          <center>Assinatura Contratada:<br><br>_______________________________________________________________</center>
        </div>

        <script>
        (function () {
          var CAB_HTML = \`${cabHTMLEsc}\`;
          var CAB_HTML_SIMPLES = \`${cabHTMLSimplesEsc}\`;

          /* A4 px @ 96dpi = 1122px; margens 10mm × 2 ≈ 76px; útil = 1046px.
             Todas as págs: cabeçalho completo ~200px + pg-num ~30px → sobra ~816px → limite 720. */
          var ALTURA_PAG1 = 720;
          var ALTURA_PAG_N = 720;

          window.addEventListener('load', function () {
            setTimeout(function () {
              construirPaginas();
              window.print();
            }, 1800);
          });

          function construirPaginas() {
            var raw = document.getElementById('raw');
            var filhos = Array.from(raw.children);

            /* Torna visível para medir corretamente */
            raw.style.visibility = 'visible';

            var paginas = [[]];
            var alturas  = [0];

            filhos.forEach(function (el) {
              var h = el.getBoundingClientRect().height || el.offsetHeight || 40;
              var idx = paginas.length - 1;
              var limite = idx === 0 ? ALTURA_PAG1 : ALTURA_PAG_N;
              if (alturas[idx] + h > limite && paginas[idx].length > 0) {
                paginas.push([el]);
                alturas.push(h);
              } else {
                paginas[idx].push(el);
                alturas[idx] += h;
              }
            });

            var total = paginas.length;
            raw.remove();

            paginas.forEach(function (els, i) {
              var pDiv = document.createElement('div');
              pDiv.className = 'pagina';

              /* Número de página */
              var numDiv = document.createElement('div');
              numDiv.className = 'pg-num';
              numDiv.textContent = 'Pág. ' + (i + 1) + ' / ' + total;
              pDiv.appendChild(numDiv);

              /* Cabeçalho: completo em todas as páginas */
              var cabDiv = document.createElement('div');
              cabDiv.innerHTML = CAB_HTML;
              pDiv.appendChild(cabDiv);

              /* Elementos de conteúdo */
              els.forEach(function (el) {
                el.style.visibility = 'visible';
                pDiv.appendChild(el);
              });

              document.body.appendChild(pDiv);
            });
          }
        })();
        </script>

      </body>
    </html>`;
  // ==========================
  // IMPRESSÃO
  // ==========================
  async function abrirJanelaParaImpressao(htmlCompleto) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(htmlCompleto);
    printWindow.document.close();
    // A impressão é acionada pelo script inline no HTML (window.addEventListener 'load' + setTimeout 1800ms)
    // que também chama construirPaginas() antes de imprimir. Não duplicar aqui.
  }
  abrirJanelaParaImpressao(htmlCompleto);
}



function gerarOrdemDeServicoParaImpressao(gruposOcultarProduto) {
  const getValue = (id) => document.getElementById(id)?.value?.trim() || "-";

  const getTextOrValue = (el) => {
    if (!el) return "";
    const v = (typeof el.value === "string" ? el.value : "").trim();
    if (v) return v;
    const t = (typeof el.textContent === "string" ? el.textContent : "").trim();
    if (t) return t;
    return "";
  };

  const multilineToBR = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "-";
    return t.replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
  };

  const formatarDataBR = (iso) => {
    if (!iso) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("pt-BR");
  };

  const padVisual = (txt, minLen = 18) => {
    const t = String(txt || "").trim();
    if (t.length >= minLen) return t;
    const faltam = Math.max(0, minLen - t.length);
    return (t || "-") + "&nbsp;".repeat(faltam);
  };

  // ================== 1) DADOS CABEÇALHO (DINÂMICO) ==================
  const numeroPedido = getValue("numeroPedido"); // no seu layout atual é o "pedido"
  const dataOrc = getValue("dataOrcamento");
  const data = dataOrc !== "-" ? formatarDataBR(dataOrc) : "-";

  // ✅ se você tiver um campo real de orçamento separado, use aqui
  const numeroOrcamento = getValue("numeroOrcamento2") !== "-" ? getValue("numeroOrcamento2") : numeroPedido;

  const vendedorEl = document.getElementById("vendedorResponsavel");
  const vendedor =
    vendedorEl?.selectedOptions?.[0]?.textContent?.trim() ||
    getTextOrValue(vendedorEl) ||
    "-";

  const operador = getValue("operadorInterno");
  const origem = getValue("origemCliente");

  const nomeClienteResponsavel =
    (document.querySelector("input.razaoSocial")?.value || "")?.trim() ||
    (document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "")?.trim() ||
    "-";

  const enderecoObra = `Rua/Avenida: ${getValue("rua")}, Número: ${getValue("numero")}, Bairro: ${getValue("bairro")} - Complemento: ${getValue("complemento")} - Cidade: ${getValue("cidade")}/${getValue("estado")} - CEP: ${getValue("cep")}`;

  // ================== 2) CLIENTES/CONTATOS ==================
  const clientes = Array.from(document.querySelectorAll("#clientesWrapper .cliente-item"))
    .map((row) => ({
      nomeCliente:
        getTextOrValue(row.querySelector(".nomeContato")) ||
        getTextOrValue(row.querySelector(".razaoSocial")),
      cpfCnpj: getTextOrValue(row.querySelector(".cpfCnpj")),
      nomeContato: getTextOrValue(row.querySelector(".nomeContato")),
      funcao: getTextOrValue(row.querySelector(".funcaoCliente")),
      telefone: getTextOrValue(row.querySelector(".telefoneCliente")),
      email: getTextOrValue(row.querySelector(".emailCliente")),
    }))
    .filter((c) => c.nomeCliente || c.nomeContato || c.telefone || c.cpfCnpj || c.email || c.funcao);

  const principal = clientes[0] || {};
  const cpfCnpj = principal.cpfCnpj || "-";

  const contatosHTML = clientes.length
    ? clientes
        .map((c, idx) => {
          const label = idx === 0 ? "Contato (Responsável)" : `Contato ${idx + 1}`;
          const nome = padVisual(c.nomeContato || c.nomeCliente || "-", 22);
          const funcao = padVisual(c.funcao || "-", 18);
          const tel = padVisual(c.telefone || "-", 16);
          const email = padVisual(c.email || "-", 22);

          return `
            <tr>
              <td class="k">${label}:</td>
              <td class="v">${nome}</td>
              <td class="k">Função:</td>
              <td class="v">${funcao}</td>
            </tr>
            <tr>
              <td class="k">Telefone:</td>
              <td class="v">${tel}</td>
              <td class="k">E-mail:</td>
              <td class="v">${email}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td class="k">Contato:</td><td class="v">${padVisual("-", 22)}</td>
        <td class="k">Função:</td><td class="v">${padVisual("-", 18)}</td>
      </tr>
      <tr>
        <td class="k">Telefone:</td><td class="v">${padVisual("-", 16)}</td>
        <td class="k">E-mail:</td><td class="v">${padVisual("-", 22)}</td>
      </tr>
    `;

  // ================== 3) PRAZOS ==================
  const prazosRaw = getValue("prazosArea");
  const prazosHTML = prazosRaw !== "-" ? multilineToBR(prazosRaw) : "-";

  // ================== 4) COLETA ITENS (GRUPOS) ==================
  const gruposDados = [];

  document.querySelectorAll("table[id^='tabela-bloco-']").forEach((tabela) => {
    const grupoId = tabela.id.replace("tabela-", "").trim();

    const ocultar = !!(gruposOcultarProduto && gruposOcultarProduto[grupoId]);
    if (ocultar) return;

    const inputAmbiente = document.querySelector(
      `input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`
    );
    const nomeAmbiente = inputAmbiente?.value?.trim() || "Sem Ambiente";

    let resumoGrupo = document.getElementById(`resumo-${grupoId}`)?.value?.trim() || "";
    resumoGrupo = resumoGrupo ? resumoGrupo.replace(/\r\n/g, "\n").replace(/\n/g, "<br>") : "";

    const linhas = Array.from(tabela.querySelectorAll("tbody tr"))
      .filter((tr) => {
        if (tr.querySelector("td[colspan]")) return false;
        if (tr.classList.contains("extra-summary-row")) return false;
        const tds = tr.querySelectorAll("td");
        return tds && tds.length >= 2;
      })
      .map((tr) => {
        const tds = Array.from(tr.querySelectorAll("td"));

        let descricao = (tds[1]?.textContent || "").trim();
        if (!descricao) {
          const candidato = tds
            .map((td) => (td.textContent || "").trim())
            .sort((a, b) => b.length - a.length)[0];
          descricao = candidato || "-";
        }

        const qtdInput =
          tr.querySelector("input.quantidade") ||
          tr.querySelector("input.quantidade_sugerida") ||
          tr.querySelector("input[name='quantidade']") ||
          tr.querySelector("input[data-campo='quantidade']");

        let qtd = (qtdInput?.value || "").trim();
        if (!qtd) qtd = "1";

        return { descricao, qtd };
      })
      .filter((x) => x.descricao && x.descricao !== "-");

    gruposDados.push({
      grupoId,
      nomeAmbiente,
      resumoGrupo,
      itens: linhas,
    });
  });

  const qtdLinhas = Math.max(1, gruposDados.length);

  // ================== 5) ITENS P1 (COM QTD) ==================
  let contadorGrupo = 1;
  const itensHTML_ComQtd = gruposDados
    .map((g) => {
      let contadorInsumo = 1;

      const linhasHTML = g.itens?.length
        ? g.itens.map((it) => `
            <tr>
              <td class="num">${contadorInsumo++}</td>
              <td>${it.descricao}</td>
              <td class="qtd">${it.qtd}</td>
            </tr>
          `).join("")
        : `
          <tr>
            <td class="num">1</td>
            <td>-</td>
            <td class="qtd">-</td>
          </tr>
        `;

      const resumoHTML = g.resumoGrupo
        ? `<div class="obs"><strong>Observações:</strong><br>${g.resumoGrupo}</div>`
        : "";

      return `
        <div class="item">
          <div class="item-head">
            <div class="item-title">ITEM ${contadorGrupo++}</div>
            <div class="item-sub">AMBIENTE: ${String(g.nomeAmbiente || "").toUpperCase()}</div>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:44px;">#</th>
                <th>Descrição</th>
                <th style="width:110px;">Quantidade</th>
              </tr>
            </thead>
            <tbody>${linhasHTML}</tbody>
          </table>

          ${resumoHTML}
        </div>
      `;
    })
    .join("");

  // ================== 6) ITENS P3 (SEM QTD) ==================
  let contadorGrupoP3 = 1;
  const itensHTML_SemQtd = gruposDados
    .map((g) => {
      let c = 1;
      const linhasHTML = g.itens?.length
        ? g.itens.map((it) => `
            <tr>
              <td class="num">${c++}</td>
              <td>${it.descricao}</td>
            </tr>
          `).join("")
        : `
            <tr>
              <td class="num">1</td>
              <td>-</td>
            </tr>
          `;

      const obs = g.resumoGrupo
        ? `<div class="obs"><strong>Observações:</strong><br>${g.resumoGrupo}</div>`
        : "";

      return `
        <div class="item">
          <div class="item-head">
            <div class="item-title">ITEM ${contadorGrupoP3++}</div>
            <div class="item-sub">AMBIENTE: ${String(g.nomeAmbiente || "").toUpperCase()}</div>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:44px;">#</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>${linhasHTML}</tbody>
          </table>

          ${obs}
        </div>
      `;
    })
    .join("");

  // ================== CABEÇALHOS ==================

  const cabecalhoCompletoSemPrazosHTML = (titulo) => `
  <div class="topbar">
    <div class="logoBox"><img src="../js/logo.jpg" alt="Logo"></div>
    <div class="opBox">
      <div class="opTitle">${titulo}</div>
      <div class="opRow">
    <div>
          Nº do Pedido
          <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
        </div>
        <div class="metaRight">
          <div><strong>Nº do orçamento:</strong> <span class="muted">${numeroOrcamento}</span></div>
          <div><strong>Data:</strong> <span class="muted">${data}</span></div>
        </div>
      </div>
    </div>
  </div>

  <table class="tblInfo">
    <tr>
      <td class="k">Nome / Razão social:</td>
      <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
      <td class="k">CPF / CNPJ:</td>
      <td class="vSmall">${padVisual(cpfCnpj, 18)}</td>
      <td class="k">Origem:</td>
      <td class="vSmall">${padVisual(origem, 18)}</td>
    </tr>
    <tr>
      <td class="k">Endereço da obra:</td>
      <td colspan="5">${enderecoObra}</td>
    </tr>
    ${contatosHTML}
  </table>

  <div class="line2col">
    <div class="miniBox">Operador: <span class="muted">${padVisual(operador, 18)}</span></div>
    <div class="miniBox">Vendedor: <span class="muted">${padVisual(vendedor, 18)}</span></div>
  </div>
`;

  const cabecalhoCompletoHTML = (titulo) => `
    <div class="topbar">
      <div class="logoBox"><img src="../js/logo.jpg" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
      <div>
          Nº do Pedido
          <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
        </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted">${data}</span></div>
          </div>
        </div>
      </div>
    </div>

    <table class="tblInfo">
      <tr>
        <td class="k">Nome / Razão social:</td>
        <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
        <td class="k">CPF / CNPJ:</td>
        <td class="vSmall">${padVisual(cpfCnpj, 18)}</td>
        <td class="k">Origem:</td>
        <td class="vSmall">${padVisual(origem, 18)}</td>
      </tr>
      <tr>
        <td class="k">Endereço da obra:</td>
        <td colspan="5">${enderecoObra}</td>
      </tr>
      ${contatosHTML}
    </table>

    <div class="line2col">
      <div class="miniBox">Operador: <span class="muted">${padVisual(operador, 18)}</span></div>
      <div class="miniBox">Vendedor: <span class="muted">${padVisual(vendedor, 18)}</span></div>
    </div>

    <div class="prazos">
      <div class="t">Prazo Previsto por Área:</div>
      <div class="c">${prazosHTML}</div>
    </div>
  `;

  const cabecalhoBasicoHTML = (titulo) => `
    <div class="topbar">
      <div class="opBox" style="width:100%;">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
          Nº do Pedido
          <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
        </div>
          <div class="metaRight">
            <div><strong>Data:</strong> <span class="muted">${data}</span></div>
            <div><strong>Nº do orçamento:</strong> <span class="muted">${numeroOrcamento}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ================== PÁGINA 2: FAT DIRETO + TERCEIROS ==================
  const faturamentoDiretoHTML = `
    <div class="fullBox">
      <div class="gridTitle">Faturamento Direto</div>
      <table class="bigTbl">
        <thead>
          <tr>
            <th style="width:44px;">Item</th>
            <th style="width:110px;">Data Compra</th>
            <th>Fornecedor</th>
            <th style="width:110px;">Previsto</th>
            <th style="width:110px;">Tipo</th>
            <th style="width:90px;">Quant.</th>
            <th style="width:120px;">Na Empresa</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 6 }).map((_, i) => `
            <tr>
              <td class="cItem">${i + 1}</td>
              <td class="cData"></td>
              <td></td>
              <td class="cData"></td>
              <td></td>
              <td class="cQtd"></td>
              <td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const servicosTerceirosHTML = `
    <div class="fullBox">
      <div class="gridTitle">Serviço(s) de Terceiros</div>
      <table class="bigTbl">
        <thead>
          <tr>
            <th style="width:44px;">Item</th>
            <th>Fornecedor</th>
            <th>Nome do Contato</th>
            <th style="width:120px;">Telefone do Contato</th>
            <th style="width:100px;">Data Saída</th>
            <th style="width:100px;">Previsão</th>
            <th style="width:110px;">Data Retorno</th>
            <th style="width:140px;">Retorno Conferido por</th>
            <th style="width:120px;">Assinatura Interno</th>
            <th style="width:120px;">Assinatura Terceiro</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: Math.max(3, qtdLinhas) }).map((_, i) => `
            <tr>
              <td class="cItem">${i + 1}</td>
              <td></td>
              <td></td>
              <td></td>
              <td class="cData"></td>
              <td class="cData"></td>
              <td class="cData"></td>
              <td class="cResp">&nbsp;</td>
              <td></td>
              <td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const pagina2HTML = `
    <!-- ======================= PAGINA 2 ======================= -->
    <div class="page-break"></div>
    ${cabecalhoBasicoHTML("ORDEM DE SERVIÇO / PRODUÇÃO")}
    ${faturamentoDiretoHTML}
    ${servicosTerceirosHTML}
  `;

  // ================== PÁGINA 4: PROCESSOS + INSTALAÇÃO ==================
  const linhasProcessoHTML = (titulo) => {
    const corpo = Array.from({ length: qtdLinhas }).map((_, i) => `
      <tr>
        <td class="cItem">${i + 1}</td>
        <td class="cData"></td>
        <td class="cData"></td>
        <td class="cResp">&nbsp;</td>
      </tr>
    `).join("");

    return `
      <div class="gridBox">
        <div class="gridTitle">${titulo}</div>
        <table class="gridTbl">
          <thead>
            <tr>
              <th style="width:44px;">Item</th>
              <th style="width:92px;">Inicio</th>
              <th style="width:92px;">Final</th>
              <th>Responsáveis</th>
            </tr>
          </thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
    `;
  };

  const tabelaInstalacaoHTML = (titulo, startIndex = 1) => {
    const corpo = Array.from({ length: qtdLinhas }).map((_, i) => `
      <tr>
        <td class="cItem">${startIndex + i}</td>
        <td class="cData"></td>
        <td class="cData"></td>
        <td class="cResp">&nbsp;</td>
      </tr>
    `).join("");

    return `
      <div class="instCol">
        <div class="instSub">${titulo}</div>
        <table class="gridTbl">
          <thead>
            <tr>
              <th style="width:44px;">Item</th>
              <th style="width:92px;">Inicio</th>
              <th style="width:92px;">Final</th>
              <th>Responsáveis</th>
            </tr>
          </thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
    `;
  };

  const pagina4ProcessosInstalacaoHTML = `
    <!-- ======================= PAGINA 4 (PROCESSOS + INSTALAÇÃO) ======================= -->
    <div class="page-break"></div>
    ${cabecalhoBasicoHTML("RELATÓRIO DE ENTREGA / INSTALAÇÃO")}

    <div class="procGrid">
      <div class="procRow">
        ${linhasProcessoHTML("Desenho")}
        ${linhasProcessoHTML("Corte")}
      </div>
      <div class="procRow">
        ${linhasProcessoHTML("Pré-Solda")}
        ${linhasProcessoHTML("Acabamento")}
      </div>
      <div class="procRow">
        ${linhasProcessoHTML("Montagem")}
        ${linhasProcessoHTML("Finalização do Acabamento")}
      </div>
    </div>

    <div class="linhaInstalacao">Instalação</div>

    <div class="instGrid">
      ${tabelaInstalacaoHTML("Estrutura", 1)}
      ${tabelaInstalacaoHTML("Vidro", Math.max(1, qtdLinhas))} 
    </div>
  `;

  // ================== PÁGINA 5: HISTÓRICO (DATA 15% / HIST 85%) ==================
const pagina5HistoricoHTML = `
  <div class="page-break"></div>

  <div class="page5">
    ${cabecalhoBasicoHTML("RELATÓRIO DE ENTREGA / INSTALAÇÃO")}

    <div class="fullBox relFull">
      <table class="relTbl">
        <thead>
          <tr>
            <th class="relData">Data</th>
            <th class="relHist">Histórico de Instalação</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 8 }).map(() => `
            <tr>
              <td class="relDataCell"></td>
              <td class="relHistCell"></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>
`;



 const etapasDoProcessoHTML = `
  <div class="etapas-box vv-etapas">
    <div class="etapas-title">Etapas do Processo</div>

    <table class="etapas-grid">
      <tr>
        <!-- PEDIDO -->
        <td class="etapas-col">
          <div class="etapas-col-title">Pedido</div>
          <table class="etapas-inner">
            <tr>
              <td class="etapas-cell">Enviado</td>
              <td class="etapas-cell">Assinado</td>
            </tr>

            <tr>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
          </table>
        </td>

        <!-- PROJETO -->
        <td class="etapas-col">
          <div class="etapas-col-title">Projeto</div>
          <table class="etapas-inner">
            <tr>
              <td class="etapas-cell w-item">Item</td>
              <td class="etapas-cell">Enviado</td>
              <td class="etapas-cell">Assinado</td>
            </tr>

            <tr>
              <td class="etapas-cell w-item center">1</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">2</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">3</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
          </table>
        </td>

        <!-- OBRA / MEDIÇÃO -->
        <td class="etapas-col">
          <div class="etapas-col-title">Obra / Medição</div>
          <table class="etapas-inner">
            <tr>
              <td class="etapas-cell w-item">Item</td>
              <td class="etapas-cell">Liberação Obra</td>
              <td class="etapas-cell">Medição Realizada</td>
              <td class="etapas-cell">Medidor</td>
            </tr>

            <tr>
              <td class="etapas-cell w-item center">1</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">2</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">3</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="etapas-obs"><strong>Observações:</strong></div>
    <div class="etapas-obs-area">&nbsp;</div>
  </div>
`;


  // ================== PÁGINA 1 e 3 (CONTEÚDO) ==================
 const pagina1HTML = `
  <!-- ======================= PAGINA 1 ======================= -->
  <div class="vv-page">
    <div>
      ${cabecalhoCompletoHTML("ORDEM DE SERVIÇO / PRODUÇÃO")}
      ${itensHTML_ComQtd || `<div class="item" style="padding:10px;"><strong>Nenhum item encontrado para impressão.</strong></div>`}
    </div>

    <!-- 🔻 bloco da foto no final da página 1 -->
    <div class="vv-page-footer">
      ${etapasDoProcessoHTML}
    </div>
  </div>

  <!-- força que a próxima página comece depois da página 1 -->
  <div class="vv-break-after"></div>
`;


// ================== PÁGINA 3 (RELATÓRIO) — SEM ITENS / SEM INSUMOS ==================
// ================== PÁGINA 3 (RELATÓRIO) — ITEM + AMBIENTE + OBSERVAÇÕES (SEM INSUMOS) ==================
const observacoesPorItemHTML = (() => {
  let n = 1;

  return (gruposDados || []).map((g) => {
    const ambienteUpper = String(g.nomeAmbiente || "Sem Ambiente").toUpperCase();
    const obs = String(g.resumoGrupo || "").trim();

    return `
      <div class="item item-obs-only">
        <div class="item-head item-obs-head">
          <div class="item-title">ITEM ${n++}</div>
          <div class="item-sub">AMBIENTE: ${ambienteUpper}</div>
        </div>

        <div class="obs obs-only">
          <div class="obs-label">Observações:</div>
          <div class="obs-text">${obs || "&nbsp;"}</div>
        </div>
      </div>
    `;
  }).join("") || `
    <div class="item item-obs-only">
      <div class="item-head item-obs-head">
        <div class="item-title">ITEM 1</div>
        <div class="item-sub">AMBIENTE: -</div>
      </div>

      <div class="obs obs-only">
        <div class="obs-label">Observações:</div>
        <div class="obs-text">&nbsp;</div>
      </div>
    </div>
  `;
})();

const pagina3HTML = `
  <!-- ======================= PAGINA 3 ======================= -->
  <div class="page-break"></div>

  ${cabecalhoBasicoHTML("RELATÓRIO DE ENTREGA / INSTALAÇÃO")}


  ${observacoesPorItemHTML}
`;


  // ================== HTML FINAL ==================
  const htmlCompleto = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>OS / Relatório - ${numeroPedido}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { margin: 0; }
body { padding: 40px; font-family: Arial, sans-serif; font-size: 13px; }
  em { color: #444; font-style: italic; }

  /* ======= PRIMEIRA PÁGINA (rodapé fixo no fim da página 1) ======= */
  .vv-page {
    min-height: 100vh;           /* ocupa a altura de 1 página */
    display: flex;
    flex-direction: column;
  }
  .vv-page-footer {
    margin-top: auto;            /* empurra pro final da página */
  }
  .vv-break-after {
    page-break-after: always;
    break-after: page;
  }

  /* ======= ETAPAS DO PROCESSO (igual a imagem) ======= */
  .etapas-box {
    border: 2px solid #000;
    padding: 0;
  }
  .etapas-title {
    text-align: center;
    font-weight: 700;
    padding: 6px 0;
    border-bottom: 2px solid #000;
  }
  .etapas-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .etapas-table th,
  .etapas-table td {
    border: 1px solid #000;
    padding: 6px 6px;
    vertical-align: middle;
  }
  .etapas-table th {
    text-align: center;
    font-weight: 700;
  }
  .etapas-sub th {
    font-weight: 600;
  }
  .obs-row {
    border-top: 1px solid #000;
    padding: 6px 8px;
    font-size: 24px;
    font-weight: 700;
  }

  @media print {
    body { padding: 25px; }
  }
        .print-scale {
          transform: scale(0.8);
          transform-origin: top left;
          width: 125%;
        }

        .wrap {
          border: 2px solid #111;
          padding: 10px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #111;
        }

        .page-break { page-break-before: always; }

        /* ====== HEADER ====== */
        .topbar { display: flex; align-items: stretch; gap: 10px; margin-bottom: 10px; }
        .logoBox {
          flex: 1;
          border: 2px solid #111;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 64px;
        }
        .logoBox img { max-height: 52px; }

        .opBox { width: 520px; border: 2px solid #111; padding: 8px 10px; }
        .opTitle { font-weight: 900; font-size: 14px; text-align: center; margin-bottom: 6px; }

        .opRow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-weight: 700;
          align-items: flex-start;
        }
        .metaRight { text-align: right; line-height: 1.25; }

      .numeroPedidoGigante {
  font-size: 20px;
  font-weight: 900; /* ✅ negrito */
  margin: 4px 0 0;
  line-height: 1;
}
.numeroPedidoGigante span{
  font-weight: 900; /* garante no texto interno */
}

        .muted { color: #333; font-weight: 400; }

        /* ====== INFO TABLE ====== */
        .tblInfo { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .tblInfo td { border: 1px solid #111; padding: 6px 8px; vertical-align: top; }
        .k { width: 160px; font-weight: 700; white-space: nowrap; }
        .v { min-width: 220px; }
        .vSmall { min-width: 160px; }

        .line2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
        .miniBox { border: 1px solid #111; padding: 8px; font-weight: 700; }

        .prazos { border: 1px solid #111; padding: 8px; margin-top: 8px; }
        .prazos .t { font-weight: 800; font-size: 20px; margin-bottom: 6px; }
        .prazos .c { font-weight: 700; font-size: 16px; line-height: 1.35; }

        /* ====== ITENS ====== */
        .item { border: 2px solid #111; margin-top: 12px; page-break-inside: avoid; }
        .item-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #111;
          padding: 8px 10px;
          font-weight: 900;
        }
        .item-title { font-size: 14px; }
        .item-sub { font-size: 12px; }

        .tbl { width: 100%; border-collapse: collapse; }
        .tbl th, .tbl td { border: 1px solid #111; padding: 6px 8px; }
        .tbl thead th { background: #f2f2f2; font-weight: 900; }
        .num { text-align: center; width: 44px; }
        .qtd { text-align: right; width: 110px; }

    .obs {
  border-top: 1px solid #111;
  padding: 8px 10px;
  font-style: italic;
  font-weight: 700;
  color: #333;
  line-height: 1.35;
  font-size: 20px;
}

        /* ====== BIG TABLES ====== */
        .fullBox { border: 1px solid #111; margin-top: 10px; }
        .bigTbl { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .bigTbl th, .bigTbl td { border: 1px solid #111; padding: 10px 6px; line-height: 1.6; }
        .bigTbl thead th { background: #fafafa; font-weight: 900; }

        .cItem { text-align: center; }
        .cData { text-align: center; white-space: nowrap; }
        .cQtd { text-align: right; }
        .cResp { color: #111; }

        /* ====== PROCESSOS (2 colunas, 3 linhas) ====== */
        .procGrid { margin-top: 10px; }
        .procRow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .gridBox { border: 1px solid #111; }
        .gridTitle {
          font-weight: 900;
          text-align: center;
          padding: 6px;
          border-bottom: 1px solid #111;
          background: #f2f2f2;
        }
        .gridTbl { width: 100%; border-collapse: collapse; font-size: 11px; }
        .gridTbl th, .gridTbl td { border: 1px solid #111; padding: 10px 6px; }
        .gridTbl thead th { background: #fafafa; font-weight: 900; }

        /* ====== LINHA INSTALAÇÃO (ponta a ponta) ====== */
        .linhaInstalacao{
          margin: 10px 0 6px;
          border: 2px solid #111;
          background: #f2f2f2;
          font-weight: 900;
          text-align: center;
          letter-spacing: 1px;
          padding: 10px 0;
        }

        /* ====== INSTALAÇÃO (2 colunas) ====== */
        .instGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .instCol { border: 1px solid #111; }
        .instSub {
          font-weight: 900;
          text-align: center;
          padding: 6px;
          border-bottom: 1px solid #111;
          background: #f2f2f2;
        }

        /* ====== HISTÓRICO (Data 15% / Histórico 85%) ====== */
        .relFull { margin-top: 10px; }
        .relTbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .relTbl th, .relTbl td { border: 2px solid #111; padding: 10px; vertical-align: top; }
        .relTbl thead th { background: #f2f2f2; font-weight: 900; }
        .relData { width: 15%; }
        .relHist { width: 85%; }
        .relTbl tbody tr { height: 92px; }

        @media print { .no-print { display: none !important; } }

        /* ===== Página 3: bloco como na imagem (sem tabela) ===== */
.item-obs-only { page-break-inside: avoid; }

.item-obs-head{
  border-bottom: 2px solid #111;
  padding: 8px 10px;
}

.item-obs-head .item-title{ font-size: 13px; font-weight: 900; }
.item-obs-head .item-sub{ font-size: 13px; font-weight: 900; }

.obs-only{
  border-top: 0;
  padding: 10px;
  font-style: normal;
  color: #111;
}

.obs-label{
  font-weight: 700;
  margin-bottom: 6px;
}

.obs-text{
  line-height: 1.35;
  min-height: 70px;
  font-size: 20px;
}

/* ======= PRIMEIRA PÁGINA (rodapé no final) ======= */
.vv-page{
  min-height: 100vh;
  display:flex;
  flex-direction:column;
}
.vv-page-footer{ margin-top:auto; }
.vv-break-after{ page-break-after: always; break-after: page; }

/* ======= ETAPAS DO PROCESSO (igual a imagem) ======= */
.vv-etapas{ margin-top: 10px; }

.etapas-box{
  border: 2px solid #000;
  padding: 0;
}

.etapas-title{
  text-align:center;
  font-weight:700;
  padding: 6px 0;
  border-bottom: 2px solid #000;
}

.etapas-grid{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
}

.etapas-col{
  vertical-align: top;
  border-right: 1px solid #000;
  padding: 0;
}
.etapas-col:last-child{ border-right:0; }

.etapas-col-title{
  text-align:center;
  font-weight:700;
  padding: 6px 0;
  border-bottom: 1px solid #000;
}

.etapas-inner{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
  font-size:12px;
}

.etapas-cell{
  border: 1px solid #000;
  padding: 6px 6px;
  text-align:center;
  vertical-align:middle;
}

.etapas-cell.blank{ height: 26px; }
.etapas-cell.w-item{ width: 52px; }
.etapas-cell.center{ text-align:center; }

.etapas-obs{
  border-top: 1px solid #000;
  padding: 6px 8px;
  font-size:12px;
}
.etapas-obs-area{
  height: 38px;
  border-top: 1px solid #000;
}
/* =========================
   NÃO QUEBRAR TABELAS NA IMPRESSÃO
   ========================= */
@media print {

  /* evita quebra dentro de qualquer tabela e seus blocos */
  table, thead, tbody, tfoot, tr, td, th {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* seus blocos principais (evita quebrar o item e as tabelas grandes) */
  .item,
  .fullBox,
  .gridBox,
  .instCol,
  .relFull,
  .vv-etapas,
  .prazos,
  .tblInfo,
  .topbar,
  .line2col {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}
/* =======================
   PÁGINA 5 MAIS "ALTA"
   (na prática: linhas bem maiores + mais área útil)
   ======================= */
.page5 .relFull{
  margin-top: 10px;
}

.page5 .relTbl tbody tr{
  height: 180px; /* antes era 92px -> aqui você "dobra" */
}

.page5 .relTbl td{
  padding: 14px; /* aumenta espaço pra escrita */
}

/* opcional: dá ainda mais área útil na folha (menos "respiro") */
@media print{
  body{ padding: 18px !important; } /* antes 25/40 -> mais área útil */
}
/* ====== Página 5 preenchendo a folha (sem ficar gigante) ====== */
.page5{
  height: 277mm;              /* altura útil aproximada do A4 com margem 10mm */
  display: flex;
  flex-direction: column;
}

.page5 .relFull{
  flex: 1;                    /* ocupa o espaço restante abaixo do cabeçalho */
  display: flex;
}

.page5 .relTbl{
  width: 100%;
  height: 100%;
  table-layout: fixed;
}

.page5 .relTbl tbody tr{
  height: calc(100% / 8);     /* 8 linhas preenchendo igualmente */
}

      </style>
    </head>

    <body>
      <div class="print-scale">
        <div class="wrap">

          ${pagina1HTML}

          ${pagina2HTML}

        
          ${pagina3HTML}

          ${pagina4ProcessosInstalacaoHTML}

          ${pagina5HistoricoHTML}

        </div>
      </div>

      <script>
        window.onload = function () {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 250);
        };
      </script>
    </body>
  </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(htmlCompleto);
  printWindow.document.close();
}




function gerarOrdemDeServicoParaImpressao(gruposOcultarProduto) {
  const getValue = (id) => document.getElementById(id)?.value?.trim() || "-";

  const getTextOrValue = (el) => {
    if (!el) return "";
    const v = (typeof el.value === "string" ? el.value : "").trim();
    if (v) return v;
    const t = (typeof el.textContent === "string" ? el.textContent : "").trim();
    if (t) return t;
    return "";
  };

  const multilineToBR = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "-";
    return t.replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
  };

  const formatarDataBR = (iso) => {
    if (!iso) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("pt-BR");
  };

  const padVisual = (txt, minLen = 18) => {
    const t = String(txt || "").trim();
    if (t.length >= minLen) return t;
    const faltam = Math.max(0, minLen - t.length);
    return (t || "-") + "&nbsp;".repeat(faltam);
  };

  // ================== 1) DADOS CABEÇALHO (DINÂMICO) ==================
 const numeroOrcamento = getValue("numeroOrcamento");
const numeroPedido = getValue("numeroPedido");

const dataOrc = getValue("dataOrcamento");
const data = dataOrc !== "-" ? formatarDataBR(dataOrc) : "-";
  const vendedorEl = document.getElementById("vendedorResponsavel");
  const vendedor =
    vendedorEl?.selectedOptions?.[0]?.textContent?.trim() ||
    getTextOrValue(vendedorEl) ||
    "-";

  const operador = getValue("operadorInterno");
  const origem = getValue("origemCliente");

  const nomeClienteResponsavel =
    (document.querySelector("input.razaoSocial")?.value || "")?.trim() ||
    (document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "")?.trim() ||
    "-";

  const enderecoObra = `Rua/Avenida: ${getValue("rua")}, Número: ${getValue("numero")}, Bairro: ${getValue("bairro")} - Complemento: ${getValue("complemento")} - Cidade: ${getValue("cidade")}/${getValue("estado")} - CEP: ${getValue("cep")}`;

  // ================== 2) CLIENTES/CONTATOS ==================
  const clientes = Array.from(document.querySelectorAll("#clientesWrapper .cliente-item"))
    .map((row) => ({
      nomeCliente:
        getTextOrValue(row.querySelector(".nomeContato")) ||
        getTextOrValue(row.querySelector(".razaoSocial")),
      cpfCnpj: getTextOrValue(row.querySelector(".cpfCnpj")),
      nomeContato: getTextOrValue(row.querySelector(".nomeContato")),
      funcao: getTextOrValue(row.querySelector(".funcaoCliente")),
      telefone: getTextOrValue(row.querySelector(".telefoneCliente")),
      email: getTextOrValue(row.querySelector(".emailCliente")),
    }))
    .filter((c) => c.nomeCliente || c.nomeContato || c.telefone || c.cpfCnpj || c.email || c.funcao);

  const principal = clientes[0] || {};
  const cpfCnpj = principal.cpfCnpj || "-";

  const contatosHTML = clientes.length
    ? clientes
        .map((c, idx) => {
          const label = idx === 0 ? "Contato (Responsável)" : `Contato ${idx + 1}`;
          const nome = padVisual(c.nomeContato || c.nomeCliente || "-", 22);
          const funcao = padVisual(c.funcao || "-", 18);
          const tel = padVisual(c.telefone || "-", 16);
          const email = padVisual(c.email || "-", 22);

          return `
            <tr>
              <td class="k">${label}:</td>
              <td class="v">${nome}</td>
              <td class="k">Função:</td>
              <td class="v">${funcao}</td>
            </tr>
            <tr>
              <td class="k">Telefone:</td>
              <td class="v">${tel}</td>
              <td class="k">E-mail:</td>
              <td class="v">${email}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td class="k">Contato:</td><td class="v">${padVisual("-", 22)}</td>
        <td class="k">Função:</td><td class="v">${padVisual("-", 18)}</td>
      </tr>
      <tr>
        <td class="k">Telefone:</td><td class="v">${padVisual("-", 16)}</td>
        <td class="k">E-mail:</td><td class="v">${padVisual("-", 22)}</td>
      </tr>
    `;

  // ================== 3) PRAZOS ==================
  const prazosRaw = getValue("prazosArea");
  const prazosHTML = prazosRaw !== "-" ? multilineToBR(prazosRaw) : "-";

  // ================== 4) COLETA ITENS (GRUPOS) ==================
  const gruposDados = [];

  document.querySelectorAll("table[id^='tabela-bloco-']").forEach((tabela) => {
    const grupoId = tabela.id.replace("tabela-", "").trim();

    const ocultar = !!(gruposOcultarProduto && gruposOcultarProduto[grupoId]);
    if (ocultar) return;

    const inputAmbiente = document.querySelector(
      `input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`
    );
    const nomeAmbiente = inputAmbiente?.value?.trim() || "Sem Ambiente";

    let resumoGrupo = document.getElementById(`resumo-${grupoId}`)?.value?.trim() || "";
    resumoGrupo = resumoGrupo ? resumoGrupo.replace(/\r\n/g, "\n").replace(/\n/g, "<br>") : "";

    const linhas = Array.from(tabela.querySelectorAll("tbody tr"))
      .filter((tr) => {
        if (tr.querySelector("td[colspan]")) return false;
        if (tr.classList.contains("extra-summary-row")) return false;
        const tds = tr.querySelectorAll("td");
        return tds && tds.length >= 2;
      })
      .map((tr) => {
        const tds = Array.from(tr.querySelectorAll("td"));

        let descricao = (tds[1]?.textContent || "").trim();
        if (!descricao) {
          const candidato = tds
            .map((td) => (td.textContent || "").trim())
            .sort((a, b) => b.length - a.length)[0];
          descricao = candidato || "-";
        }

        const qtdInput =
          tr.querySelector("input.quantidade") ||
          tr.querySelector("input.quantidade_sugerida") ||
          tr.querySelector("input[name='quantidade']") ||
          tr.querySelector("input[data-campo='quantidade']");

        let qtd = (qtdInput?.value || "").trim();
        if (!qtd) qtd = "1";

        return { descricao, qtd };
      })
      .filter((x) => x.descricao && x.descricao !== "-");

    gruposDados.push({
      grupoId,
      nomeAmbiente,
      resumoGrupo,
      itens: linhas,
    });
  });

  const qtdLinhas = Math.max(1, gruposDados.length);

  // ================== 5) ITENS P1 (COM QTD) ==================
  let contadorGrupo = 1;
  const itensHTML_ComQtd = gruposDados
    .map((g) => {
      let contadorInsumo = 1;

      const linhasHTML = g.itens?.length
        ? g.itens.map((it) => `
            <tr>
              <td class="num"></td>
              <td>${it.descricao}</td>
              <td class="qtd">${it.qtd}</td>
            </tr>
          `).join("")
        : `
          <tr>
            <td class="num">1</td>
            <td>-</td>
            <td class="qtd">-</td>
          </tr>
        `;

      const resumoHTML = g.resumoGrupo
        ? `<div class="obs"><strong>Observações:</strong><br>${g.resumoGrupo}</div>`
        : "";

      return `
        <div class="item">
          <div class="item-head">
            <div class="item-title">ITEM ${contadorGrupo++}</div>
            <div class="item-sub">AMBIENTE: ${String(g.nomeAmbiente || "").toUpperCase()}</div>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:44px;">#</th>
                <th>Descrição</th>
                <th style="width:110px;">Quantidade</th>
              </tr>
            </thead>
            <tbody>${linhasHTML}</tbody>
          </table>

          ${resumoHTML}
        </div>
      `;
    })
    .join("");

  // ================== 6) ITENS P3 (SEM QTD) ==================
  let contadorGrupoP3 = 1;
  const itensHTML_SemQtd = gruposDados
    .map((g) => {
      let c = 1;
      const linhasHTML = g.itens?.length
        ? g.itens.map((it) => `
            <tr>
              <td class="num"></td>
              <td>${it.descricao}</td>
            </tr>
          `).join("")
        : `
            <tr>
              <td class="num">1</td>
              <td>-</td>
            </tr>
          `;

      const obs = g.resumoGrupo
        ? `<div class="obs"><strong>Observações:</strong><br>${g.resumoGrupo}</div>`
        : "";

      return `
        <div class="item">
          <div class="item-head">
            <div class="item-title">ITEM ${contadorGrupoP3++}</div>
            <div class="item-sub">AMBIENTE: ${String(g.nomeAmbiente || "").toUpperCase()}</div>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:44px;">#</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>${linhasHTML}</tbody>
          </table>

          ${obs}
        </div>
      `;
    })
    .join("");

  // ================== CABEÇALHOS ==================

  const cabecalhoCompletoSemPrazosHTML = (titulo) => `
  <div class="topbar">
    <div class="logoBox"><img src="../js/logo.jpg" alt="Logo"></div>
    <div class="opBox">
      <div class="opTitle">${titulo}</div>
      <div class="opRow">
    <div>
          Nº do Pedido
          <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
        </div>
        <div class="metaRight">
          <div><strong>Nº do orçamento:</strong> <span class="muted">${numeroOrcamento}</span></div>
          <div><strong>Data:</strong> <span class="muted">${data}</span></div>
        </div>
      </div>
    </div>
  </div>

  <table class="tblInfo">
    <tr>
      <td class="k">Nome / Razão social:</td>
      <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
      <td class="k">CPF / CNPJ:</td>
      <td class="vSmall">${padVisual(cpfCnpj, 18)}</td>
      <td class="k">Origem:</td>
      <td class="vSmall">${padVisual(origem, 18)}</td>
    </tr>
    <tr>
      <td class="k">Endereço da obra:</td>
      <td colspan="5">${enderecoObra}</td>
    </tr>
    ${contatosHTML}
  </table>

  <div class="line2col">
    <div class="miniBox">Operador: <span class="muted">${padVisual(operador, 18)}</span></div>
    <div class="miniBox">Vendedor: <span class="muted">${padVisual(vendedor, 18)}</span></div>
  </div>
`;

  const cabecalhoCompletoHTML = (titulo) => `
    <div class="topbar">
      <div class="logoBox"><img src="../js/logo.jpg" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
      <div>
          Nº do Pedido
          <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
        </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted">${data}</span></div>
          </div>
        </div>
      </div>
    </div>

    <table class="tblInfo">
      <tr>
        <td class="k">Nome / Razão social:</td>
        <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
        <td class="k">CPF / CNPJ:</td>
        <td class="vSmall">${padVisual(cpfCnpj, 18)}</td>
        <td class="k">Origem:</td>
        <td class="vSmall">${padVisual(origem, 18)}</td>
      </tr>
      <tr>
        <td class="k">Endereço da obra:</td>
        <td colspan="5">${enderecoObra}</td>
      </tr>
      ${contatosHTML}
    </table>

    <div class="line2col">
      <div class="miniBox">Operador: <span class="muted">${padVisual(operador, 18)}</span></div>
      <div class="miniBox">Vendedor: <span class="muted">${padVisual(vendedor, 18)}</span></div>
    </div>

    <div class="prazos">
      <div class="t">Prazo Previsto por Área:</div>
      <div class="c">${prazosHTML}</div>
    </div>
  `;

  const cabecalhoBasicoHTML = (titulo) => `
    <div class="topbar">
      <div class="opBox" style="width:100%;">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
          Nº do Pedido
          <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
        </div>
          <div class="metaRight">
            <div><strong>Data:</strong> <span class="muted">${data}</span></div>
            <div><strong>Nº do orçamento:</strong> <span class="muted">${numeroOrcamento}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ================== PÁGINA 2: FAT DIRETO + TERCEIROS ==================
  const faturamentoDiretoHTML = `
    <div class="fullBox">
      <div class="gridTitle">Faturamento Direto</div>
      <table class="bigTbl">
        <thead>
          <tr>
            <th style="width:44px;">Item</th>
            <th style="width:110px;">Data Compra</th>
            <th>Fornecedor</th>
            <th style="width:110px;">Previsto</th>
            <th style="width:110px;">Tipo</th>
            <th style="width:90px;">Quant.</th>
            <th style="width:120px;">Na Empresa</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 6 }).map((_, i) => `
            <tr>
              <td class="cItem"></td>
              <td class="cData"></td>
              <td></td>
              <td class="cData"></td>
              <td></td>
              <td class="cQtd"></td>
              <td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const servicosTerceirosHTML = `
    <div class="fullBox">
      <div class="gridTitle">Serviço(s) de Terceiros</div>
      <table class="bigTbl">
        <thead>
          <tr>
            <th style="width:44px;">Item</th>
            <th>Fornecedor</th>
            <th>Nome do Contato</th>
            <th style="width:120px;">Telefone do Contato</th>
            <th style="width:100px;">Data Saída</th>
            <th style="width:100px;">Previsão</th>
            <th style="width:110px;">Data Retorno</th>
            <th style="width:140px;">Retorno Conferido por</th>
            <th style="width:120px;">Assinatura Interno</th>
            <th style="width:120px;">Assinatura Terceiro</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: Math.max(3, qtdLinhas) }).map((_, i) => `
            <tr>
              <td class="cItem"></td>
              <td></td>
              <td></td>
              <td></td>
              <td class="cData"></td>
              <td class="cData"></td>
              <td class="cData"></td>
              <td class="cResp">&nbsp;</td>
              <td></td>
              <td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const pagina2HTML = `
    <!-- ======================= PAGINA 2 ======================= -->
    <div class="page-break"></div>
    ${cabecalhoBasicoHTML("ORDEM DE SERVIÇO / PRODUÇÃO")}
    ${faturamentoDiretoHTML}
    ${servicosTerceirosHTML}
  `;

  // ================== PÁGINA 4: PROCESSOS + INSTALAÇÃO ==================
  const linhasProcessoHTML = (titulo) => {
    const corpo = Array.from({ length: qtdLinhas }).map((_, i) => `
      <tr>
        <td class="cItem"></td>
        <td class="cData"></td>
        <td class="cData"></td>
        <td class="cResp">&nbsp;</td>
      </tr>
    `).join("");

    return `
      <div class="gridBox">
        <div class="gridTitle">${titulo}</div>
        <table class="gridTbl">
          <thead>
            <tr>
              <th style="width:44px;">Item</th>
              <th style="width:92px;">Inicio</th>
              <th style="width:92px;">Final</th>
              <th>Responsáveis</th>
            </tr>
          </thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
    `;
  };

  const tabelaInstalacaoHTML = (titulo, startIndex = 1) => {
    const corpo = Array.from({ length: qtdLinhas }).map((_, i) => `
      <tr>
        <td class="cItem"></td>
        <td class="cData"></td>
        <td class="cData"></td>
        <td class="cResp">&nbsp;</td>
      </tr>
    `).join("");

    return `
      <div class="instCol">
        <div class="instSub">${titulo}</div>
        <table class="gridTbl">
          <thead>
            <tr>
              <th style="width:44px;">Item</th>
              <th style="width:92px;">Inicio</th>
              <th style="width:92px;">Final</th>
              <th>Responsáveis</th>
            </tr>
          </thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
    `;
  };

  const pagina4ProcessosInstalacaoHTML = `
    <!-- ======================= PAGINA 4 (PROCESSOS + INSTALAÇÃO) ======================= -->
    <div class="page-break"></div>
    ${cabecalhoBasicoHTML("RELATÓRIO DE ENTREGA / INSTALAÇÃO")}

    <div class="procGrid">
      <div class="procRow">
        ${linhasProcessoHTML("Desenho")}
        ${linhasProcessoHTML("Corte")}
      </div>
      <div class="procRow">
        ${linhasProcessoHTML("Pré-Solda")}
        ${linhasProcessoHTML("Acabamento")}
      </div>
      <div class="procRow">
        ${linhasProcessoHTML("Montagem")}
        ${linhasProcessoHTML("Finalização do Acabamento")}
      </div>
    </div>

    <div class="linhaInstalacao">Instalação</div>

    <div class="instGrid">
      ${tabelaInstalacaoHTML("Estrutura", 1)}
      ${tabelaInstalacaoHTML("Vidro", Math.max(1, qtdLinhas))} 
    </div>
  `;

  // ================== PÁGINA 5: HISTÓRICO (DATA 15% / HIST 85%) ==================
const pagina5HistoricoHTML = `
  <div class="page-break"></div>

  <div class="page5">
    ${cabecalhoBasicoHTML("RELATÓRIO DE ENTREGA / INSTALAÇÃO")}

    <div class="fullBox relFull">
      <table class="relTbl">
        <thead>
          <tr>
            <th class="relData">Data</th>
            <th class="relHist">Histórico de Instalação</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 8 }).map(() => `
            <tr>
              <td class="relDataCell"></td>
              <td class="relHistCell"></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>
`;



 const etapasDoProcessoHTML = `
  <div class="etapas-box vv-etapas">
    <div class="etapas-title">Etapas do Processo</div>

    <table class="etapas-grid">
      <tr>
        <!-- PEDIDO -->
        <td class="etapas-col">
          <div class="etapas-col-title">Pedido</div>
          <table class="etapas-inner">
            <tr>
              <td class="etapas-cell">Enviado</td>
              <td class="etapas-cell">Assinado</td>
            </tr>

            <tr>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
          </table>
        </td>

        <!-- PROJETO -->
        <td class="etapas-col">
          <div class="etapas-col-title">Projeto</div>
          <table class="etapas-inner">
            <tr>
              <td class="etapas-cell w-item">Item</td>
              <td class="etapas-cell">Enviado</td>
              <td class="etapas-cell">Assinado</td>
            </tr>

            <tr>
              <td class="etapas-cell w-item center">1</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">2</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">3</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
          </table>
        </td>

        <!-- OBRA / MEDIÇÃO -->
        <td class="etapas-col">
          <div class="etapas-col-title">Obra / Medição</div>
          <table class="etapas-inner">
            <tr>
              <td class="etapas-cell w-item">Item</td>
              <td class="etapas-cell">Liberação Obra</td>
              <td class="etapas-cell">Medição Realizada</td>
              <td class="etapas-cell">Medidor</td>
            </tr>

            <tr>
              <td class="etapas-cell w-item center">1</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">2</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
            <tr>
              <td class="etapas-cell w-item center">3</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
              <td class="etapas-cell blank">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="etapas-obs"><strong>Observações:</strong></div>
    <div class="etapas-obs-area">&nbsp;</div>
  </div>
`;


  // ================== PÁGINA 1 e 3 (CONTEÚDO) ==================
 const pagina1HTML = `
  <!-- ======================= PAGINA 1 ======================= -->
  <div class="vv-page">
    <div>
      ${cabecalhoCompletoHTML("ORDEM DE SERVIÇO / PRODUÇÃO")}
      ${itensHTML_ComQtd || `<div class="item" style="padding:10px;"><strong>Nenhum item encontrado para impressão.</strong></div>`}
    </div>

    <!-- 🔻 bloco da foto no final da página 1 -->
    <div class="vv-page-footer">
      ${etapasDoProcessoHTML}
    </div>
  </div>

  <!-- força que a próxima página comece depois da página 1 -->
  <div class="vv-break-after"></div>
`;


// ================== PÁGINA 3 (RELATÓRIO) — SEM ITENS / SEM INSUMOS ==================
// ================== PÁGINA 3 (RELATÓRIO) — ITEM + AMBIENTE + OBSERVAÇÕES (SEM INSUMOS) ==================
const observacoesPorItemHTML = (() => {
  let n = 1;

  return (gruposDados || []).map((g) => {
    const ambienteUpper = String(g.nomeAmbiente || "Sem Ambiente").toUpperCase();
    const obs = String(g.resumoGrupo || "").trim();

    return `
      <div class="item item-obs-only">
        <div class="item-head item-obs-head">
          <div class="item-title">ITEM ${n++}</div>
          <div class="item-sub">AMBIENTE: ${ambienteUpper}</div>
        </div>

        <div class="obs obs-only">
          <div class="obs-label">Observações:</div>
          <div class="obs-text">${obs || "&nbsp;"}</div>
        </div>
      </div>
    `;
  }).join("") || `
    <div class="item item-obs-only">
      <div class="item-head item-obs-head">
        <div class="item-title">ITEM 1</div>
        <div class="item-sub">AMBIENTE: -</div>
      </div>

      <div class="obs obs-only">
        <div class="obs-label">Observações:</div>
        <div class="obs-text">&nbsp;</div>
      </div>
    </div>
  `;
})();

const pagina3HTML = `
  <!-- ======================= PAGINA 3 ======================= -->
  <div class="page-break"></div>

  ${cabecalhoBasicoHTML("RELATÓRIO DE ENTREGA / INSTALAÇÃO")}


  ${observacoesPorItemHTML}
`;


  // ================== HTML FINAL ==================
  const htmlCompleto = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>OS / Relatório - ${numeroPedido}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { margin: 0; }
body { padding: 40px; font-family: Arial, sans-serif; font-size: 13px; }
  em { color: #444; font-style: italic; }

  /* ======= PRIMEIRA PÁGINA (rodapé fixo no fim da página 1) ======= */
  .vv-page {
    min-height: 100vh;           /* ocupa a altura de 1 página */
    display: flex;
    flex-direction: column;
  }
  .vv-page-footer {
    margin-top: auto;            /* empurra pro final da página */
  }
  .vv-break-after {
    page-break-after: always;
    break-after: page;
  }

  /* ======= ETAPAS DO PROCESSO (igual a imagem) ======= */
  .etapas-box {
    border: 2px solid #000;
    padding: 0;
  }
  .etapas-title {
    text-align: center;
    font-weight: 700;
    padding: 6px 0;
    border-bottom: 2px solid #000;
  }
  .etapas-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .etapas-table th,
  .etapas-table td {
    border: 1px solid #000;
    padding: 6px 6px;
    vertical-align: middle;
  }
  .etapas-table th {
    text-align: center;
    font-weight: 700;
  }
  .etapas-sub th {
    font-weight: 600;
  }
  .obs-row {
    border-top: 1px solid #000;
    padding: 6px 8px;
    font-size: 24px;
    font-weight: 700;
  }

  @media print {
    body { padding: 25px; }
  }
        .print-scale {
          transform: scale(0.8);
          transform-origin: top left;
          width: 125%;
        }

        .wrap {
          border: 2px solid #111;
          padding: 10px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #111;
        }

        .page-break { page-break-before: always; }

        /* ====== HEADER ====== */
        .topbar { display: flex; align-items: stretch; gap: 10px; margin-bottom: 10px; }
        .logoBox {
          flex: 1;
          border: 2px solid #111;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 64px;
        }
        .logoBox img { max-height: 52px; }

        .opBox { width: 520px; border: 2px solid #111; padding: 8px 10px; }
        .opTitle { font-weight: 900; font-size: 14px; text-align: center; margin-bottom: 6px; }

        .opRow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-weight: 700;
          align-items: flex-start;
        }
        .metaRight { text-align: right; line-height: 1.25; }

      .numeroPedidoGigante {
  font-size: 20px;
  font-weight: 900; /* ✅ negrito */
  margin: 4px 0 0;
  line-height: 1;
}
.numeroPedidoGigante span{
  font-weight: 900; /* garante no texto interno */
}

        .muted { color: #333; font-weight: 400; }

        /* ====== INFO TABLE ====== */
        .tblInfo { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .tblInfo td { border: 1px solid #111; padding: 6px 8px; vertical-align: top; }
        .k { width: 160px; font-weight: 700; white-space: nowrap; }
        .v { min-width: 220px; }
        .vSmall { min-width: 160px; }

        .line2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
        .miniBox { border: 1px solid #111; padding: 8px; font-weight: 700; }

        .prazos { border: 1px solid #111; padding: 8px; margin-top: 8px; }
        .prazos .t { font-weight: 800; font-size: 20px; margin-bottom: 6px; }
        .prazos .c { font-weight: 700; font-size: 16px; line-height: 1.35; }

        /* ====== ITENS ====== */
        .item { border: 2px solid #111; margin-top: 12px; page-break-inside: avoid; }
        .item-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #111;
          padding: 8px 10px;
          font-weight: 900;
        }
        .item-title { font-size: 14px; }
        .item-sub { font-size: 12px; }

        .tbl { width: 100%; border-collapse: collapse; }
        .tbl th, .tbl td { border: 1px solid #111; padding: 6px 8px; }
        .tbl thead th { background: #f2f2f2; font-weight: 900; }
        .num { text-align: center; width: 44px; }
        .qtd { text-align: right; width: 110px; }

.obs {
  border-top: 1px solid #111;
  padding: 8px 10px;
  font-style: italic;
  font-weight: 700;
  color: #333;
  line-height: 1.35;
  font-size: 20px;
}

        /* ====== BIG TABLES ====== */
        .fullBox { border: 1px solid #111; margin-top: 10px; }
        .bigTbl { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .bigTbl th, .bigTbl td { border: 1px solid #111; padding: 10px 6px; line-height: 1.6; }
        .bigTbl thead th { background: #fafafa; font-weight: 900; }

        .cItem { text-align: center; visibility: hidden; }
        .cData { text-align: center; white-space: nowrap; }
        .cQtd { text-align: right; }
        .cResp { color: #111; }

        /* ====== PROCESSOS (2 colunas, 3 linhas) ====== */
        .procGrid { margin-top: 10px; }
        .procRow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .gridBox { border: 1px solid #111; }
        .gridTitle {
          font-weight: 900;
          text-align: center;
          padding: 6px;
          border-bottom: 1px solid #111;
          background: #f2f2f2;
        }
        .gridTbl { width: 100%; border-collapse: collapse; font-size: 11px; }
        .gridTbl th, .gridTbl td { border: 1px solid #111; padding: 10px 6px; }
        .gridTbl thead th { background: #fafafa; font-weight: 900; }

        /* ====== LINHA INSTALAÇÃO (ponta a ponta) ====== */
        .linhaInstalacao{
          margin: 10px 0 6px;
          border: 2px solid #111;
          background: #f2f2f2;
          font-weight: 900;
          text-align: center;
          letter-spacing: 1px;
          padding: 10px 0;
        }

        /* ====== INSTALAÇÃO (2 colunas) ====== */
        .instGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .instCol { border: 1px solid #111; }
        .instSub {
          font-weight: 900;
          text-align: center;
          padding: 6px;
          border-bottom: 1px solid #111;
          background: #f2f2f2;
        }

        /* ====== HISTÓRICO (Data 15% / Histórico 85%) ====== */
        .relFull { margin-top: 10px; }
        .relTbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .relTbl th, .relTbl td { border: 2px solid #111; padding: 10px; vertical-align: top; }
        .relTbl thead th { background: #f2f2f2; font-weight: 900; }
        .relData { width: 15%; }
        .relHist { width: 85%; }
        .relTbl tbody tr { height: 92px; }

        @media print { .no-print { display: none !important; } }

        /* ===== Página 3: bloco como na imagem (sem tabela) ===== */
.item-obs-only { page-break-inside: avoid; }

.item-obs-head{
  border-bottom: 2px solid #111;
  padding: 8px 10px;
}

.item-obs-head .item-title{ font-size: 13px; font-weight: 900; }
.item-obs-head .item-sub{ font-size: 13px; font-weight: 900; }

.obs-only{
  border-top: 0;
  padding: 10px;
  font-style: normal;
  color: #111;
}

.obs-label{
  font-weight: 700;
  margin-bottom: 6px;
}

.obs-text{
  line-height: 1.35;
  min-height: 70px;
  font-size: 20px;
}

/* ======= PRIMEIRA PÁGINA (rodapé no final) ======= */
.vv-page{
  min-height: 100vh;
  display:flex;
  flex-direction:column;
}
.vv-page-footer{ margin-top:auto; }
.vv-break-after{ page-break-after: always; break-after: page; }

/* ======= ETAPAS DO PROCESSO (igual a imagem) ======= */
.vv-etapas{ margin-top: 10px; }

.etapas-box{
  border: 2px solid #000;
  padding: 0;
}

.etapas-title{
  text-align:center;
  font-weight:700;
  padding: 6px 0;
  border-bottom: 2px solid #000;
}

.etapas-grid{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
}

.etapas-col{
  vertical-align: top;
  border-right: 1px solid #000;
  padding: 0;
}
.etapas-col:last-child{ border-right:0; }

.etapas-col-title{
  text-align:center;
  font-weight:700;
  padding: 6px 0;
  border-bottom: 1px solid #000;
}

.etapas-inner{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
  font-size:12px;
}

.etapas-cell{
  border: 1px solid #000;
  padding: 6px 6px;
  text-align:center;
  vertical-align:middle;
}

.etapas-cell.blank{ height: 26px; }
.etapas-cell.w-item{ width: 52px; }
.etapas-cell.center{ text-align:center; }

.etapas-obs{
  border-top: 1px solid #000;
  padding: 6px 8px;
  font-size:12px;
}
.etapas-obs-area{
  height: 38px;
  border-top: 1px solid #000;
}
/* =========================
   NÃO QUEBRAR TABELAS NA IMPRESSÃO
   ========================= */
/* =========================
   IMPRESSÃO — PERMITIR QUEBRA NO MEIO DAS TABELAS
   (substitui/remova o bloco antigo que protegia tabelas)
   ========================= */
@media print {

  /* libera quebra normal dentro de tabelas */
  table, thead, tbody, tfoot, tr, td, th {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  /* libera quebra normal nos seus blocos principais também */
  .item,
  .fullBox,
  .gridBox,
  .instCol,
  .relFull,
  .vv-etapas,
  .prazos,
  .tblInfo,
  .topbar,
  .line2col {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  /* se algum navegador insistir em "segurar" linhas, isso ajuda */
  tr {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
}

/* ✅ Fora do @media print, você também tinha isso na .item:
   .item { page-break-inside: avoid; }
   Troque para liberar quebra */
.item {
  page-break-inside: auto;
  break-inside: auto;
}

/* =======================
   PÁGINA 5 MAIS "ALTA"
   (na prática: linhas bem maiores + mais área útil)
   ======================= */
.page5 .relFull{
  margin-top: 10px;
}

.page5 .relTbl tbody tr{
  height: 180px; /* antes era 92px -> aqui você "dobra" */
}

.page5 .relTbl td{
  padding: 14px; /* aumenta espaço pra escrita */
}

/* opcional: dá ainda mais área útil na folha (menos "respiro") */
@media print{
  body{ padding: 18px !important; } /* antes 25/40 -> mais área útil */
}
/* ====== Página 5 preenchendo a folha (sem ficar gigante) ====== */
.page5{
  height: 277mm;              /* altura útil aproximada do A4 com margem 10mm */
  display: flex;
  flex-direction: column;
}

.page5 .relFull{
  flex: 1;                    /* ocupa o espaço restante abaixo do cabeçalho */
  display: flex;
}

.page5 .relTbl{
  width: 100%;
  height: 100%;
  table-layout: fixed;
}

.page5 .relTbl tbody tr{
  height: calc(100% / 8);     /* 8 linhas preenchendo igualmente */
}
/* =========================
   IMPRESSÃO — PERMITIR QUEBRA NO MEIO DAS TABELAS
   (substitui/remova o bloco antigo que protegia tabelas)
   ========================= */
@media print {

  /* libera quebra normal dentro de tabelas */
  table, thead, tbody, tfoot, tr, td, th {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  /* libera quebra normal nos seus blocos principais também */
  .item,
  .fullBox,
  .gridBox,
  .instCol,
  .relFull,
  .vv-etapas,
  .prazos,
  .tblInfo,
  .topbar,
  .line2col {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  /* se algum navegador insistir em "segurar" linhas, isso ajuda */
  tr {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
}

/* ✅ Fora do @media print, você também tinha isso na .item:
   .item { page-break-inside: avoid; }
   Troque para liberar quebra */
.item {
  page-break-inside: auto;
  break-inside: auto;
}

      </style>
    </head>

    <body>
      <div class="print-scale">
        <div class="wrap">

          ${pagina1HTML}

          ${pagina2HTML}

        
          ${pagina3HTML}

          ${pagina4ProcessosInstalacaoHTML}

          ${pagina5HistoricoHTML}

        </div>
      </div>

      <script>
        window.onload = function () {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 250);
        };
      </script>
    </body>
  </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(htmlCompleto);
  printWindow.document.close();
}

async function gerarFolha4RelatorioEntrega() {
  return gerarEtapasDProcessoPdfmake();
  // ── código legado abaixo (mantido para referência) ──
  const getValue = (id) => document.getElementById(id)?.value?.trim() || "-";

  const getTextOrValue = (el) => {
    if (!el) return "";
    const v = (typeof el.value === "string" ? el.value : "").trim();
    if (v) return v;
    const t = (typeof el.textContent === "string" ? el.textContent : "").trim();
    if (t) return t;
    return "";
  };

  const formatarDataBR = (iso) => {
    if (!iso) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("pt-BR");
  };

  const padVisual = (txt, minLen = 18) => {
    const t = String(txt || "").trim();
    if (t.length >= minLen) return t;
    const faltam = Math.max(0, minLen - t.length);
    return (t || "-") + "&nbsp;".repeat(faltam);
  };

  const escapeHtml = (txt) =>
    String(txt || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const multilineToBR = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "-";
    return escapeHtml(t).replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
  };

  const logoBase64 = await carregarLogoBase64("../js/logo.jpg");
  const logoSrc = logoBase64 || "../js/logo.jpg";

  // ================== VARIÁVEIS VISUAIS ==================
  const TOTAL_PAGINAS = 2;

  const FONT_SIZE_BASE = 11.2;
  const FONT_SIZE_TABELA = 10.4;
  const FONT_SIZE_HEADER_TABELA = 10.4;
  const FONT_SIZE_TITULO_SECAO = 11.5;
  const FONT_SIZE_TITULO_DOC = 14;
  const FONT_SIZE_NUMERO_PEDIDO = 80;

  const ALTURA_LINHA_RESUMO = 39;
  const ALTURA_LINHA_PROCESSO = 26;
  const QTD_LINHAS_PROCESSO = 4;

  const PADDING_CELULA_RESUMO_Y = 4;
  const PADDING_CELULA_RESUMO_X = 8;

  const PADDING_CELULA_PROCESSO_Y = 4;
  const PADDING_CELULA_PROCESSO_X = 6;

  const PADDING_TITULO_BOX = 6;
  const GAP_GRID_PROCESSO = 8;
  const MARGEM_TOPO_TABELAS = 8;

  const LARGURA_COL_ITEM = 42;
  const LARGURA_COL_DATA = 82;
  const LARGURA_COL_ITEM_RESUMO = 70;
  const LARGURA_COL_PRODUTO = 220;
  const LARGURA_COL_QTD = 90;

  // ================== DADOS DO CABEÇALHO ==================

  
  const numeroPedido = getValue("numeroPedido");
  const dataOrc = getValue("dataOrcamento");
  const data = dataOrc !== "-" ? formatarDataBR(dataOrc) : "-";
  const numeroOrcamento = getValue("numeroOrcamento");

  const vendedorEl = document.getElementById("vendedorResponsavel");
  const vendedor =
    vendedorEl?.selectedOptions?.[0]?.textContent?.trim() ||
    getTextOrValue(vendedorEl) ||
    "-";

  const operador = getValue("operadorInterno");
  const origem = getValue("origemCliente");

  const nomeClienteResponsavel =
    (document.querySelector("input.razaoSocial")?.value || "").trim() ||
    (document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "").trim() ||
    "-";

  const enderecoObra = `Rua/Avenida: ${getValue("rua")}, Número: ${getValue(
    "numero"
  )}, Bairro: ${getValue("bairro")} - Complemento: ${getValue(
    "complemento"
  )} - Cidade: ${getValue("cidade")}/${getValue("estado")} - CEP: ${getValue("cep")}`;

  // ================== CLIENTES / CONTATOS ==================
  const clientes = Array.from(document.querySelectorAll("#clientesWrapper .cliente-item"))
    .map((row) => ({
      nomeCliente:
        getTextOrValue(row.querySelector(".nomeContato")) ||
        getTextOrValue(row.querySelector(".razaoSocial")),
      cpfCnpj: getTextOrValue(row.querySelector(".cpfCnpj")),
      nomeContato: getTextOrValue(row.querySelector(".nomeContato")),
      funcao: getTextOrValue(row.querySelector(".funcaoCliente")),
      telefone: getTextOrValue(row.querySelector(".telefoneCliente")),
      email: getTextOrValue(row.querySelector(".emailCliente")),
    }))
    .filter((c) => c.nomeCliente || c.nomeContato || c.telefone || c.cpfCnpj || c.email || c.funcao);

  const contatosHTML = clientes.length
    ? clientes
        .map((c, idx) => {
          const label = idx === 0 ? "Contato (Responsável)" : `Contato ${idx + 1}`;
          const nome = padVisual(c.nomeContato || c.nomeCliente || "-", 22);
          const funcao = padVisual(c.funcao || "-", 18);
          const tel = padVisual(c.telefone || "-", 16);
          const email = padVisual(c.email || "-", 22);

          return `
          <tr>
            <td class="k">${label}:</td>
            <td class="v">${nome}</td>
            <td class="k">Função:</td>
            <td class="v">${funcao}</td>
          </tr>
          <tr>
            <td class="k">Telefone:</td>
            <td class="v">${tel}</td>
            <td class="k">E-mail:</td>
            <td class="v">${email}</td>
          </tr>
        `;
        })
        .join("")
    : `
      <tr>
        <td class="k">Contato:</td><td class="v">${padVisual("-", 22)}</td>
        <td class="k">Função:</td><td class="v">${padVisual("-", 18)}</td>
      </tr>
      <tr>
        <td class="k">Telefone:</td><td class="v">${padVisual("-", 16)}</td>
        <td class="k">E-mail:</td><td class="v">${padVisual("-", 22)}</td>
      </tr>
    `;

  // ================== COLETA DOS BLOCOS / PRODUTOS ==================
  const produtosResumo = Array.from(
    document.querySelectorAll("#blocosProdutosContainer .main-container[id^='bloco-']")
  ).map((blocoEl) => {
    const blocoId = blocoEl.id;

    const titulo =
      document.getElementById(`titulo-accordion-${blocoId}`)?.textContent?.trim() ||
      "Produto sem nome";

    const tabela = document.getElementById(`tabela-${blocoId}`);

    const primeiraLinhaValida = tabela
      ? Array.from(tabela.querySelectorAll("tbody tr")).find((tr) => {
          if (!tr) return false;
          if (tr.querySelector("td[colspan]")) return false;
          const tds = tr.querySelectorAll("td");
          return tds.length >= 2;
        })
      : null;

    const quantidade =
      primeiraLinhaValida?.querySelector("input.quantidade")?.value?.trim() ||
      primeiraLinhaValida?.querySelector("td:nth-child(6) input")?.value?.trim() ||
      "-";

    const descricaoRaw =
      document.getElementById(`resumo-${blocoId}`)?.value?.trim() ||
      document.getElementById(`resumo-${blocoId}`)?.dataset?.valorOriginal?.trim() ||
      "-";

    return {
      titulo,
      quantidade,
      descricao: descricaoRaw,
    };
  });

  // ================== CABEÇALHOS ==================
  const cabecalhoCompletoHTML = (titulo) => `
    <div class="topbar">
      <div class="logoBox"><img src="${logoSrc}" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
            Nº do Pedido
            <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
          </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted-meta">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted-meta">${data}</span></div>
          </div>
        </div>
      </div>
    </div>

    <table class="tblInfo">
      <tr>
        <td class="k">Nome / Razão social:</td>
        <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
        <td class="k">Origem:</td>
        <td class="vSmall">${padVisual(origem, 18)}</td>
      </tr>
      <tr>
        <td class="k">Endereço da obra:</td>
        <td colspan="3">${enderecoObra}</td>
      </tr>
      ${contatosHTML}
    </table>

    <div class="line2col">
      <div class="miniBox">Operador: <span class="muted-meta">${padVisual(operador, 18)}</span></div>
      <div class="miniBox">Vendedor: <span class="muted-meta">${padVisual(vendedor, 18)}</span></div>
    </div>
  `;

  const cabecalhoBasicoHTML = (titulo) => `
    <div class="topbar">
      <div class="logoBox"><img src="${logoSrc}" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
            Nº do Pedido
            <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
          </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted-meta">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted-meta">${data}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ================== ROWS INDIVIDUAIS (medição dinâmica) ==================
  const COLGROUP_HTML = `<colgroup>
    <col style="width:${LARGURA_COL_ITEM_RESUMO}px">
    <col style="width:${LARGURA_COL_PRODUTO}px">
    <col style="width:${LARGURA_COL_QTD}px">
    <col>
  </colgroup>`;

  const THEAD_HTML = `<thead>
    <tr>
      <th style="width:${LARGURA_COL_ITEM_RESUMO}px;">Item</th>
      <th style="width:${LARGURA_COL_PRODUTO}px;">Produto</th>
      <th style="width:${LARGURA_COL_QTD}px;">Quantidade</th>
      <th>Descrição</th>
    </tr>
  </thead>`;

  const produtoRowsHTML = (produtosResumo.length
    ? produtosResumo.map((item, index) => `
      <table class="bigTbl resumoProdutosTbl mrow" style="table-layout:fixed;width:100%;border-top:none;">
        ${COLGROUP_HTML}
        <tbody>
          <tr>
            <td class="cItem">${index + 1}</td>
            <td>${escapeHtml(item.titulo)}</td>
            <td class="cQtd">${escapeHtml(item.quantidade)}</td>
            <td class="descCell">${multilineToBR(item.descricao)}</td>
          </tr>
        </tbody>
      </table>`)
    : [`<table class="bigTbl resumoProdutosTbl mrow" style="table-layout:fixed;width:100%;border-top:none;">
        ${COLGROUP_HTML}
        <tbody>
          <tr>
            <td class="cItem">1</td>
            <td>-</td>
            <td class="cQtd">-</td>
            <td class="descCell">-</td>
          </tr>
        </tbody>
      </table>`]
  ).join("");

  // ================== TABELAS DE PROCESSO ==================
  const gerarLinhasFixasProcesso = () => {
    let html = "";
    for (let i = 0; i < QTD_LINHAS_PROCESSO; i++) {
      html += `
        <tr>
          <td class="cItemEtapa">&nbsp;</td>
          <td class="cData">&nbsp;</td>
          <td class="cData">&nbsp;</td>
          <td class="cResp">&nbsp;</td>
        </tr>
      `;
    }
    return html;
  };

  const tabelaProcessoHTML = (titulo) => `
    <div class="procBox">
      <div class="procTitle">${titulo}</div>
      <table class="gridTbl">
        <thead>
          <tr>
            <th style="width:${LARGURA_COL_ITEM}px;">Item</th>
            <th style="width:${LARGURA_COL_DATA}px;">Início</th>
            <th style="width:${LARGURA_COL_DATA}px;">Final</th>
            <th>Responsáveis</th>
          </tr>
        </thead>
        <tbody>
          ${gerarLinhasFixasProcesso()}
        </tbody>
      </table>
    </div>
  `;

  // ================== PRÉ-RENDERIZA CABEÇALHOS PARA O SCRIPT ==================
  const cabCompletoStr = cabecalhoCompletoHTML("ETAPAS DO PROCESSO");
  const cabBasicoStr   = cabecalhoBasicoHTML("ETAPAS DO PROCESSO");
  const cabCompletoEsc = cabCompletoStr.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const cabBasicoEsc   = cabBasicoStr.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const colgroupEsc    = COLGROUP_HTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const theadEsc       = THEAD_HTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

  // ================== HTML FINAL ==================
  const htmlCompleto = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Etapas do Processo</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body {
            margin: 0;
            padding: 12px;
            font-family: Arial, sans-serif;
            font-size: ${FONT_SIZE_BASE}px;
            color: #111;
          }
          #raw { position: absolute; top: -9999px; left: 0; width: 760px; visibility: hidden; }
          #processes-page { display: none; }
          .pagina { page-break-after: always; break-after: page; }
          .pagina:last-child { page-break-after: auto; break-after: auto; }
          .pg-num {
            text-align: left;
            margin: 0 0 10px 0;
            padding: 0;
            clear: both;
            font-size: 16px;
            font-weight: 900;
            font-family: Arial, sans-serif;
            color: #111;
            letter-spacing: 0.5px;
          }
          .topbar { display: flex; align-items: stretch; gap: 10px; margin-bottom: 8px; }
          .logoBox {
            flex: 1; border: 2px solid #111; padding: 8px;
            display: flex; align-items: center; justify-content: center; min-height: 56px;
          }
          .logoBox img { max-height: 46px; }
          .opBox { width: 520px; border: 2px solid #111; padding: 8px 10px; }
          .opTitle { font-weight: 900; font-size: ${FONT_SIZE_TITULO_DOC}px; text-align: center; margin-bottom: 4px; }
          .opRow { display: flex; justify-content: space-between; gap: 10px; font-weight: 700; align-items: flex-start; }
          .metaRight { text-align: right; line-height: 1.2; }
          .numeroPedidoGigante { font-size: ${FONT_SIZE_NUMERO_PEDIDO}px; font-weight: 900; margin: 2px 0 0; line-height: .95; letter-spacing: 1px; }
          .numeroPedidoGigante span { font-weight: 900; }
          .muted { color: #111; font-weight: 900; }
          .muted-meta { color: #333; font-weight: 400; }
          .tblInfo { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          .tblInfo td { border: 1px solid #111; padding: 5px 7px; vertical-align: top; font-size: ${FONT_SIZE_BASE}px; }
          .k { width: 160px; font-weight: 700; white-space: nowrap; }
          .v { min-width: 220px; }
          .vSmall { min-width: 160px; }
          .line2col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0 8px; }
          .miniBox { border: 1px solid #111; padding: 6px 8px; font-weight: 700; font-size: ${FONT_SIZE_BASE}px; }
          .fullBox, .procBox { border: 1px solid #111; break-inside: avoid; page-break-inside: avoid; }
          .gridTitle, .procTitle {
            font-weight: 900; text-align: center;
            padding: ${PADDING_TITULO_BOX}px; border-bottom: 1px solid #111;
            background: #f2f2f2; font-size: ${FONT_SIZE_TITULO_SECAO}px;
          }
          .bigTbl, .gridTbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .bigTbl { font-size: ${FONT_SIZE_TABELA}px; }
          .gridTbl { font-size: ${FONT_SIZE_TABELA}px; }
          .bigTbl th, .bigTbl td { border: 1px solid #111; padding: ${PADDING_CELULA_RESUMO_Y}px ${PADDING_CELULA_RESUMO_X}px; line-height: 1.15; box-sizing: border-box; }
          .gridTbl th, .gridTbl td { border: 1px solid #111; padding: ${PADDING_CELULA_PROCESSO_Y}px ${PADDING_CELULA_PROCESSO_X}px; line-height: 1.1; vertical-align: middle; box-sizing: border-box; }
          .bigTbl thead th, .gridTbl thead th { background: #fafafa; font-weight: 900; font-size: ${FONT_SIZE_HEADER_TABELA}px; }
          .resumoProdutosTbl th, .resumoProdutosTbl td { vertical-align: middle; }
          .resumoProdutosTbl tbody tr { height: ${ALTURA_LINHA_RESUMO}px; }
          .resumoProdutosTbl td { height: ${ALTURA_LINHA_RESUMO}px; }
          .resumoProdutosTbl .cItem, .resumoProdutosTbl .cQtd { text-align: center; vertical-align: middle; font-weight: 700; }
          .resumoProdutosTbl .descCell { vertical-align: middle; white-space: normal; word-break: break-word; }
          .mrow { margin: 0; }
          .mrow td { border-top: none; }
          .gridTbl tbody tr { height: ${ALTURA_LINHA_PROCESSO}px; }
          .cItemEtapa, .cData, .cResp { font-size: ${FONT_SIZE_TABELA}px; }
          .cItemEtapa, .cData { text-align: center; }
          .procGridFull { margin-top: ${MARGEM_TOPO_TABELAS}px; display: grid; grid-template-columns: 1fr 1fr; gap: ${GAP_GRID_PROCESSO}px; }
          @media print {
            body { padding: 12px; }
            table { page-break-inside: avoid; break-inside: avoid; }
            tr, td, th { page-break-inside: avoid; break-inside: avoid; }
            .fullBox, .procBox, .procGridFull { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>

        <!-- Itens para medição off-screen -->
        <div id="raw">
          ${produtoRowsHTML}
        </div>

        <!-- Grade de processos (inserida como última página pelo script) -->
        <div id="processes-page">
          <div class="procGridFull">
            ${tabelaProcessoHTML("Desenho")}
            ${tabelaProcessoHTML("Corte")}
            ${tabelaProcessoHTML("Pré-Solda")}
            ${tabelaProcessoHTML("Acabamento")}
            ${tabelaProcessoHTML("Montagem")}
            ${tabelaProcessoHTML("Finalização do Acabamento")}
            ${tabelaProcessoHTML("Estrutura")}
            ${tabelaProcessoHTML("Vidro")}
          </div>
        </div>

        <script>
        (function () {
          var CAB_COMPLETO = \`${cabCompletoEsc}\`;
          var CAB_BASICO   = \`${cabBasicoEsc}\`;
          var COLGROUP     = \`${colgroupEsc}\`;
          var THEAD        = \`${theadEsc}\`;
          var ALTURA_PAG1 = 580;
          var ALTURA_PAG_N = 580;

          window.addEventListener('load', function () {
            setTimeout(function () {
              construirPaginas();
              window.print();
            }, 1800);
          });

          function construirPaginas() {
            var raw = document.getElementById('raw');
            raw.style.visibility = 'visible';
            var chunks = Array.from(raw.children);

            var pages = [[]];
            var alturas = [0];

            chunks.forEach(function (chunk) {
              var h = chunk.getBoundingClientRect().height || 40;
              var idx = pages.length - 1;
              var limite = idx === 0 ? ALTURA_PAG1 : ALTURA_PAG_N;
              if (alturas[idx] + h > limite && pages[idx].length > 0) {
                pages.push([chunk]);
                alturas.push(h);
              } else {
                pages[idx].push(chunk);
                alturas[idx] += h;
              }
            });

            // Mesclar última página se quase em branco (< 120px = menos de ~3 linhas)
            if (pages.length > 1 && pages[pages.length - 1].length > 0) {
              var altUlt = alturas[alturas.length - 1];
              if (altUlt < 120) {
                pages[pages.length - 2] = pages[pages.length - 2].concat(pages[pages.length - 1]);
                pages.pop();
                alturas.pop();
              }
            }

            raw.remove();

            var procPage = document.getElementById('processes-page');
            procPage.parentNode.removeChild(procPage);

            var totalPags = pages.length + 1;

            pages.forEach(function (chks, i) {
              var pDiv = document.createElement('div');
              pDiv.className = 'pagina';

              var pgNum = document.createElement('div');
              pgNum.className = 'pg-num';
              pgNum.textContent = 'Pág. ' + (i + 1) + ' / ' + totalPags;
              pDiv.appendChild(pgNum);

              var cabDiv = document.createElement('div');
              cabDiv.innerHTML = CAB_COMPLETO;
              pDiv.appendChild(cabDiv);

              var tableWrap = document.createElement('div');
              tableWrap.className = 'fullBox';
              tableWrap.style.marginTop = '10px';

              var titleDiv = document.createElement('div');
              titleDiv.className = 'gridTitle';
              titleDiv.textContent = 'Produtos / Descritivos';
              tableWrap.appendChild(titleDiv);

              var table = document.createElement('table');
              table.className = 'bigTbl resumoProdutosTbl';
              table.style.tableLayout = 'fixed';
              table.style.width = '100%';
              table.innerHTML = COLGROUP + THEAD + '<tbody></tbody>';
              var tbody = table.querySelector('tbody');

              chks.forEach(function (chunk) {
                var tr = chunk.querySelector('tr');
                if (tr) tbody.appendChild(tr);
              });

              tableWrap.appendChild(table);
              pDiv.appendChild(tableWrap);
              document.body.appendChild(pDiv);
            });

            // Página de processos — sempre a última
            var procDiv = document.createElement('div');
            procDiv.className = 'pagina';

            var pgNumProc = document.createElement('div');
            pgNumProc.className = 'pg-num';
            pgNumProc.textContent = 'Pág. ' + (pages.length + 1) + ' / ' + totalPags;
            procDiv.appendChild(pgNumProc);

            var cabProcDiv = document.createElement('div');
            cabProcDiv.innerHTML = CAB_COMPLETO;
            procDiv.appendChild(cabProcDiv);

            while (procPage.firstChild) {
              procDiv.appendChild(procPage.firstChild);
            }

            document.body.appendChild(procDiv);
          }
        })();
        </script>

      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(htmlCompleto);
  printWindow.document.close();
}



async function gerarHistoricoDeProducaoParaImpressao() {
  return gerarRelatorioEntregaPdfmake();
  // ── código legado abaixo (mantido para referência) ──
  const getValue = (id) => document.getElementById(id)?.value?.trim() || "-";

  const getTextOrValue = (el) => {
    if (!el) return "";
    const v = (typeof el.value === "string" ? el.value : "").trim();
    if (v) return v;
    const t = (typeof el.textContent === "string" ? el.textContent : "").trim();
    if (t) return t;
    return "";
  };

  const formatarDataBR = (iso) => {
    if (!iso) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("pt-BR");
  };

  const padVisual = (txt, minLen = 18) => {
    const t = String(txt || "").trim();
    if (t.length >= minLen) return t;
    const faltam = Math.max(0, minLen - t.length);
    return (t || "-") + "&nbsp;".repeat(faltam);
  };

  const escapeHtml = (txt) =>
    String(txt || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const multilineToBR = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "-";
    return escapeHtml(t).replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
  };

  const logoBase64 = await carregarLogoBase64("../js/logo.jpg");
  const logoSrc = logoBase64 || "../js/logo.jpg";

  // ================== CONFIG VISUAL ==================
  const TITULO_DOCUMENTO = "RELATÓRIO DE ENTREGA / INSTALAÇÃO";

  const FONT_SIZE_BASE = 12;
  const FONT_SIZE_TABELA = 10.5;
  const FONT_SIZE_HEADER = 10.5;
  const FONT_SIZE_TITULO = 14;
  const FONT_SIZE_RODAPE_LABEL = 11;
  const FONT_SIZE_RODAPE_VALOR = 20;
  const FONT_SIZE_NUMERO_PEDIDO = 80;

  const ALTURA_LINHA_RESUMO = 45;
  const ALTURA_LINHA_HISTORICO = 95;

  const PADDING_TABELA_Y = 5;
  const PADDING_TABELA_X = 7;
  const PADDING_HISTORICO_Y = 10;
  const PADDING_HISTORICO_X = 8;

  const LINHAS_PAGINAS_HISTORICO = 8; // ajuste solicitado

  // ================== DADOS DO CABEÇALHO ==================
  const numeroPedido = getValue("numeroPedido");
  const dataOrc = getValue("dataOrcamento");
  const data = dataOrc !== "-" ? formatarDataBR(dataOrc) : "-";
  const numeroOrcamento = getValue("numeroOrcamento");

  const vendedorEl = document.getElementById("vendedorResponsavel");
  const vendedor =
    vendedorEl?.selectedOptions?.[0]?.textContent?.trim() ||
    getTextOrValue(vendedorEl) ||
    "-";

  const operador = getValue("operadorInterno");
  const origem = getValue("origemCliente");

  const nomeClienteResponsavel =
    (document.querySelector("input.razaoSocial")?.value || "").trim() ||
    (document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "").trim() ||
    "-";

  const enderecoObra = `Rua/Avenida: ${getValue("rua")}, Número: ${getValue("numero")}, Bairro: ${getValue("bairro")} - Complemento: ${getValue("complemento")} - Cidade: ${getValue("cidade")}/${getValue("estado")} - CEP: ${getValue("cep")}`;

  // ================== CLIENTES / CONTATOS ==================
  const clientes = Array.from(document.querySelectorAll("#clientesWrapper .cliente-item"))
    .map((row) => ({
      nomeCliente:
        getTextOrValue(row.querySelector(".nomeContato")) ||
        getTextOrValue(row.querySelector(".razaoSocial")),
      cpfCnpj: getTextOrValue(row.querySelector(".cpfCnpj")),
      nomeContato: getTextOrValue(row.querySelector(".nomeContato")),
      funcao: getTextOrValue(row.querySelector(".funcaoCliente")),
      telefone: getTextOrValue(row.querySelector(".telefoneCliente")),
      email: getTextOrValue(row.querySelector(".emailCliente")),
    }))
    .filter((c) => c.nomeCliente || c.nomeContato || c.telefone || c.cpfCnpj || c.email || c.funcao);

  const contatosHTML = clientes.length
    ? clientes
        .map((c, idx) => {
          const label = idx === 0 ? "Contato (Responsável)" : `Contato ${idx + 1}`;
          const nome = padVisual(c.nomeContato || c.nomeCliente || "-", 22);
          const funcao = padVisual(c.funcao || "-", 18);
          const tel = padVisual(c.telefone || "-", 16);
          const email = padVisual(c.email || "-", 22);

          return `
          <tr>
            <td class="k">${label}:</td>
            <td class="v">${nome}</td>
            <td class="k">Função:</td>
            <td class="v">${funcao}</td>
          </tr>
          <tr>
            <td class="k">Telefone:</td>
            <td class="v">${tel}</td>
            <td class="k">E-mail:</td>
            <td class="v">${email}</td>
          </tr>
        `;
        })
        .join("")
    : `
      <tr>
        <td class="k">Contato:</td><td class="v">${padVisual("-", 22)}</td>
        <td class="k">Função:</td><td class="v">${padVisual("-", 18)}</td>
      </tr>
      <tr>
        <td class="k">Telefone:</td><td class="v">${padVisual("-", 16)}</td>
        <td class="k">E-mail:</td><td class="v">${padVisual("-", 22)}</td>
      </tr>
    `;

  // ================== COLETA PRODUTOS PARA RESUMO ==================
  const produtosResumo = Array.from(
    document.querySelectorAll("#blocosProdutosContainer .main-container[id^='bloco-']")
  ).map((blocoEl, index) => {
    const blocoId = blocoEl.id;

    const titulo =
      document.getElementById(`titulo-accordion-${blocoId}`)?.textContent?.trim() ||
      "Produto sem nome";

    const tabela = document.getElementById(`tabela-${blocoId}`);

    const primeiraLinhaValida = tabela
      ? Array.from(tabela.querySelectorAll("tbody tr")).find((tr) => {
          if (!tr) return false;
          if (tr.querySelector("td[colspan]")) return false;
          const tds = tr.querySelectorAll("td");
          return tds.length >= 6;
        })
      : null;

    const quantidade =
      primeiraLinhaValida?.querySelector("input.quantidade")?.value?.trim() ||
      primeiraLinhaValida?.querySelector("td:nth-child(6) input")?.value?.trim() ||
      "-";

    const descricaoRaw =
      document.getElementById(`resumo-${blocoId}`)?.value?.trim() ||
      document.getElementById(`resumo-${blocoId}`)?.dataset?.valorOriginal?.trim() ||
      "-";

    return {
      sequencia: index + 1,
      blocoId,
      titulo,
      quantidade,
      descricao: descricaoRaw,
    };
  });

  // ================== HISTÓRICO ==================
  const criarLinhasVazias = (quantidade) => {
    return Array.from({ length: quantidade }).map(() => ({
      data: "",
      relatorio: ""
    }));
  };

  const linhasHistorico = criarLinhasVazias(LINHAS_PAGINAS_HISTORICO);
  const totalPaginas = 2;

  // ================== CABEÇALHOS ==================
  const cabecalhoCompletoHTML = (titulo) => `
    <div class="topbar">
      <div class="logoBox"><img src="${logoSrc}" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
            Nº do Pedido
            <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
          </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted-meta">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted-meta">${data}</span></div>
          </div>
        </div>
      </div>
    </div>

    <table class="tblInfo">
      <tr>
        <td class="k">Nome / Razão social:</td>
        <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
        <td class="k">Origem:</td>
        <td class="vSmall">${padVisual(origem, 18)}</td>
      </tr>
      <tr>
        <td class="k">Endereço da obra:</td>
        <td colspan="3">${enderecoObra}</td>
      </tr>
      ${contatosHTML}
    </table>

    <div class="line2col">
      <div class="miniBox">Operador: <span class="muted-meta">${padVisual(operador, 18)}</span></div>
      <div class="miniBox">Vendedor: <span class="muted-meta">${padVisual(vendedor, 18)}</span></div>
    </div>
  `;

  const cabecalhoBasicoHTML = (titulo) => `
    <div class="topbar">
      <div class="logoBox"><img src="${logoSrc}" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
            Nº do Pedido
            <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
          </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted-meta">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted-meta">${data}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ================== ROWS INDIVIDUAIS (medição dinâmica) ==================
  const COLGROUP_HTML = `<colgroup>
    <col style="width:70px">
    <col style="width:220px">
    <col style="width:110px">
    <col>
  </colgroup>`;

  const THEAD_HTML = `<thead>
    <tr>
      <th style="width:70px;">Itens</th>
      <th style="width:220px;">Produto</th>
      <th style="width:110px;">Quantidade</th>
      <th>Descrição</th>
    </tr>
  </thead>`;

  const produtoRowsHTML = (produtosResumo.length
    ? produtosResumo.map((item) => `
      <table class="bigTbl resumoProdutosTbl mrow" style="table-layout:fixed;width:100%;border-top:none;">
        ${COLGROUP_HTML}
        <tbody>
          <tr>
            <td class="cItem">${item.sequencia}</td>
            <td>${escapeHtml(item.titulo)}</td>
            <td class="cQtd">${escapeHtml(item.quantidade)}</td>
            <td class="descCell">${multilineToBR(item.descricao)}</td>
          </tr>
        </tbody>
      </table>`)
    : [`<table class="bigTbl resumoProdutosTbl mrow" style="table-layout:fixed;width:100%;border-top:none;">
        ${COLGROUP_HTML}
        <tbody>
          <tr>
            <td class="cItem">1</td>
            <td>-</td>
            <td class="cQtd">-</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>`]
  ).join("");

  const tabelaHistoricoHTML = (linhasPagina) => `
    <div class="historicoBox">
      <div class="gridTitle">HISTÓRICO</div>
      <table class="historicoTbl">
        <thead>
          <tr>
            <th style="width:120px;">Data</th>
            <th>RELATÓRIO DE ENTREGA / INSTALAÇÃO</th>
          </tr>
        </thead>
        <tbody>
          ${linhasPagina
            .map(
              (linha) => `
            <tr>
              <td class="cData">${escapeHtml(linha.data)}</td>
              <td>${escapeHtml(linha.relatorio)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  // ================== PRÉ-RENDERIZA CABEÇALHOS PARA O SCRIPT ==================
  const cabCompletoStr = cabecalhoCompletoHTML(TITULO_DOCUMENTO);
  const cabBasicoStr   = cabecalhoBasicoHTML(TITULO_DOCUMENTO);
  const cabCompletoEsc = cabCompletoStr.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const cabBasicoEsc   = cabBasicoStr.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const colgroupEsc    = COLGROUP_HTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const theadEsc       = THEAD_HTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

  // ================== HTML FINAL ==================
  const htmlCompleto = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${TITULO_DOCUMENTO}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body {
            margin: 0;
            padding: 18px;
            font-family: Arial, sans-serif;
            font-size: ${FONT_SIZE_BASE}px;
            color: #111;
          }
          #raw { position: absolute; top: -9999px; left: 0; width: 760px; visibility: hidden; }
          #historico-page { display: none; }
          .pagina { page-break-after: always; break-after: page; }
          .pagina:last-child { page-break-after: auto; break-after: auto; }
          .pg-num {
            text-align: left;
            margin: 0 0 10px 0;
            padding: 0;
            clear: both;
            font-size: 16px;
            font-weight: 900;
            font-family: Arial, sans-serif;
            color: #111;
            letter-spacing: 0.5px;
          }
          .topbar { display: flex; align-items: stretch; gap: 10px; margin-bottom: 8px; }
          .logoBox { flex: 1; border: 2px solid #111; padding: 8px; display: flex; align-items: center; justify-content: center; min-height: 56px; }
          .logoBox img { max-height: 46px; }
          .opBox { width: 520px; border: 2px solid #111; padding: 8px 10px; }
          .opTitle { font-weight: 900; font-size: ${FONT_SIZE_TITULO}px; text-align: center; margin-bottom: 4px; }
          .opRow { display: flex; justify-content: space-between; gap: 10px; font-weight: 700; align-items: flex-start; }
          .metaRight { text-align: right; line-height: 1.2; }
          .numeroPedidoGigante { font-size: ${FONT_SIZE_NUMERO_PEDIDO}px; font-weight: 900; margin: 2px 0 0; line-height: 0.95; letter-spacing: 1px; }
          .numeroPedidoGigante span { font-weight: 900; }
          .muted { color: #111; font-weight: 900; }
          .muted-meta { color: #333; font-weight: 400; }
          .tblInfo { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          .tblInfo td { border: 1px solid #111; padding: ${PADDING_TABELA_Y}px ${PADDING_TABELA_X}px; vertical-align: top; }
          .k { width: 160px; font-weight: 700; white-space: nowrap; }
          .v { min-width: 220px; }
          .vSmall { min-width: 160px; }
          .line2col { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0; }
          .miniBox { border: 1px solid #111; padding: 6px 8px; font-weight: 700; }
          .fullBox, .historicoBox { border: 1px solid #111; margin-top: 10px; }
          .gridTitle { font-weight: 900; text-align: center; padding: 5px; border-bottom: 1px solid #111; background: #f2f2f2; }
          .bigTbl, .historicoTbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .bigTbl { font-size: ${FONT_SIZE_TABELA}px; }
          .historicoTbl { font-size: ${FONT_SIZE_TABELA}px; }
          .bigTbl th, .bigTbl td, .historicoTbl th, .historicoTbl td { border: 1px solid #111; box-sizing: border-box; }
          .bigTbl th, .bigTbl td { padding: ${PADDING_TABELA_Y}px ${PADDING_TABELA_X}px; }
          .historicoTbl th, .historicoTbl td { padding: ${PADDING_HISTORICO_Y}px ${PADDING_HISTORICO_X}px; }
          .bigTbl tbody tr { height: ${ALTURA_LINHA_RESUMO}px; }
          .bigTbl td { height: ${ALTURA_LINHA_RESUMO}px; vertical-align: middle; }
          .historicoTbl td { height: ${ALTURA_LINHA_HISTORICO}px; vertical-align: top; }
          .bigTbl thead th, .historicoTbl thead th { background: #fafafa; font-weight: 900; font-size: ${FONT_SIZE_HEADER}px; }
          .resumoProdutosTbl .descCell { white-space: normal; word-break: break-word; vertical-align: middle; }
          .mrow { margin: 0; }
          .mrow td { border-top: none; }
          .cItem { text-align: center; vertical-align: middle !important; font-weight: 700; }
          .cQtd { text-align: center; vertical-align: middle !important; }
          .cData { text-align: center; white-space: nowrap; }
          @media print {
            body { padding: 18px; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>

        <!-- Itens para medição off-screen -->
        <div id="raw">
          ${produtoRowsHTML}
        </div>

        <!-- Histórico (inserido como última página pelo script) -->
        <div id="historico-page">
          ${tabelaHistoricoHTML(linhasHistorico)}
        </div>

        <script>
        (function () {
          var CAB_COMPLETO = \`${cabCompletoEsc}\`;
          var CAB_BASICO   = \`${cabBasicoEsc}\`;
          var COLGROUP     = \`${colgroupEsc}\`;
          var THEAD        = \`${theadEsc}\`;
          var ALTURA_PAG1 = 650;
          var ALTURA_PAG_N = 650;

          window.addEventListener('load', function () {
            setTimeout(function () {
              construirPaginas();
              window.print();
            }, 1800);
          });

          function construirPaginas() {
            var raw = document.getElementById('raw');
            raw.style.visibility = 'visible';
            var chunks = Array.from(raw.children);

            var pages = [[]];
            var alturas = [0];

            chunks.forEach(function (chunk) {
              var h = chunk.getBoundingClientRect().height || 40;
              var idx = pages.length - 1;
              var limite = idx === 0 ? ALTURA_PAG1 : ALTURA_PAG_N;
              if (alturas[idx] + h > limite && pages[idx].length > 0) {
                pages.push([chunk]);
                alturas.push(h);
              } else {
                pages[idx].push(chunk);
                alturas[idx] += h;
              }
            });

            // Mesclar última página se quase em branco (< 120px = menos de ~3 linhas)
            if (pages.length > 1 && pages[pages.length - 1].length > 0) {
              var altUlt = alturas[alturas.length - 1];
              if (altUlt < 120) {
                pages[pages.length - 2] = pages[pages.length - 2].concat(pages[pages.length - 1]);
                pages.pop();
                alturas.pop();
              }
            }

            raw.remove();

            var histPage = document.getElementById('historico-page');
            histPage.parentNode.removeChild(histPage);

            var totalPags = pages.length + 1;

            pages.forEach(function (chks, i) {
              var pDiv = document.createElement('div');
              pDiv.className = 'pagina';

              var pgNum = document.createElement('div');
              pgNum.className = 'pg-num';
              pgNum.textContent = 'Pág. ' + (i + 1) + ' / ' + totalPags;
              pDiv.appendChild(pgNum);

              var cabDiv = document.createElement('div');
              cabDiv.innerHTML = CAB_COMPLETO;
              pDiv.appendChild(cabDiv);

              var tableWrap = document.createElement('div');
              tableWrap.className = 'fullBox';

              var titleDiv = document.createElement('div');
              titleDiv.className = 'gridTitle';
              titleDiv.textContent = 'Resumo dos Produtos';
              tableWrap.appendChild(titleDiv);

              var table = document.createElement('table');
              table.className = 'bigTbl resumoProdutosTbl';
              table.style.tableLayout = 'fixed';
              table.style.width = '100%';
              table.innerHTML = COLGROUP + THEAD + '<tbody></tbody>';
              var tbody = table.querySelector('tbody');

              chks.forEach(function (chunk) {
                var tr = chunk.querySelector('tr');
                if (tr) tbody.appendChild(tr);
              });

              tableWrap.appendChild(table);
              pDiv.appendChild(tableWrap);
              document.body.appendChild(pDiv);
            });

            // Página de histórico — sempre a última
            var histDiv = document.createElement('div');
            histDiv.className = 'pagina';

            var pgNumHist = document.createElement('div');
            pgNumHist.className = 'pg-num';
            pgNumHist.textContent = 'Pág. ' + (pages.length + 1) + ' / ' + totalPags;
            histDiv.appendChild(pgNumHist);

            var cabHistDiv = document.createElement('div');
            cabHistDiv.innerHTML = CAB_COMPLETO;
            histDiv.appendChild(cabHistDiv);

            while (histPage.firstChild) {
              histDiv.appendChild(histPage.firstChild);
            }

            document.body.appendChild(histDiv);
          }
        })();
        </script>

      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(htmlCompleto);
  printWindow.document.close();
}


async function gerarFolha1OrdemDeServico(gruposOcultarProduto) {
  return gerarOrdemDeServicoPdfmake(gruposOcultarProduto);
  // ── código legado abaixo (mantido para referência) ──
  const logoSrc = await carregarLogoBase64("../js/logo.jpg");
  const getValue = (id) => document.getElementById(id)?.value?.trim() || "-";

  const getTextOrValue = (el) => {
    if (!el) return "";
    const v = (typeof el.value === "string" ? el.value : "").trim();
    if (v) return v;
    const t = (typeof el.textContent === "string" ? el.textContent : "").trim();
    if (t) return t;
    return "";
  };

  const multilineToBR = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "-";
    return t.replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
  };

  const formatarDataBR = (iso) => {
    if (!iso) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("pt-BR");
  };

  const padVisual = (txt, minLen = 18) => {
    const t = String(txt || "").trim();
    if (t.length >= minLen) return t;
    const faltam = Math.max(0, minLen - t.length);
    return (t || "-") + "&nbsp;".repeat(faltam);
  };

  const escapeHtml = (txt) =>
    String(txt || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // ================== DADOS CABEÇALHO ==================
  const numeroPedido = getValue("numeroPedido");
  const dataOrc = getValue("dataOrcamento");
  const data = dataOrc !== "-" ? formatarDataBR(dataOrc) : "-";
  const numeroOrcamento = getValue("numeroOrcamento");

  const vendedorEl = document.getElementById("vendedorResponsavel");
  const vendedor =
    vendedorEl?.selectedOptions?.[0]?.textContent?.trim() ||
    getTextOrValue(vendedorEl) ||
    "-";

  const operador = getValue("operadorInterno");
  const origem = getValue("origemCliente");

  const nomeClienteResponsavel =
    (document.querySelector("input.razaoSocial")?.value || "").trim() ||
    (document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "").trim() ||
    "-";

  const enderecoObra = `Rua/Avenida: ${getValue("rua")}, Número: ${getValue("numero")}, Bairro: ${getValue("bairro")} - Complemento: ${getValue("complemento")} - Cidade: ${getValue("cidade")}/${getValue("estado")} - CEP: ${getValue("cep")}`;

  // ================== CLIENTES / CONTATOS ==================
  const clientes = Array.from(document.querySelectorAll("#clientesWrapper .cliente-item"))
    .map((row) => ({
      nomeCliente:
        getTextOrValue(row.querySelector(".nomeContato")) ||
        getTextOrValue(row.querySelector(".razaoSocial")),
      cpfCnpj: getTextOrValue(row.querySelector(".cpfCnpj")),
      nomeContato: getTextOrValue(row.querySelector(".nomeContato")),
      funcao: getTextOrValue(row.querySelector(".funcaoCliente")),
      telefone: getTextOrValue(row.querySelector(".telefoneCliente")),
      email: getTextOrValue(row.querySelector(".emailCliente")),
    }))
    .filter((c) => c.nomeCliente || c.nomeContato || c.telefone || c.cpfCnpj || c.email || c.funcao);

  const principal = clientes[0] || {};
  const cpfCnpj = principal.cpfCnpj || "-";

  const contatosHTML = clientes.length
    ? clientes
        .map((c, idx) => {
          const label = idx === 0 ? "Contato (Responsável)" : `Contato ${idx + 1}`;
          const nome = padVisual(c.nomeContato || c.nomeCliente || "-", 22);
          const funcao = padVisual(c.funcao || "-", 18);
          const tel = padVisual(c.telefone || "-", 16);
          const email = padVisual(c.email || "-", 22);

          return `
            <tr>
              <td class="k">${label}:</td>
              <td class="v">${nome}</td>
              <td class="k">Função:</td>
              <td class="v">${funcao}</td>
            </tr>
            <tr>
              <td class="k">Telefone:</td>
              <td class="v">${tel}</td>
              <td class="k">E-mail:</td>
              <td class="v">${email}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td class="k">Contato:</td><td class="v">${padVisual("-", 22)}</td>
        <td class="k">Função:</td><td class="v">${padVisual("-", 18)}</td>
      </tr>
      <tr>
        <td class="k">Telefone:</td><td class="v">${padVisual("-", 16)}</td>
        <td class="k">E-mail:</td><td class="v">${padVisual("-", 22)}</td>
      </tr>
    `;

  // ================== PRAZOS ==================
  const prazosRaw = getValue("prazosArea");
  const prazosHTML = prazosRaw !== "-" ? multilineToBR(prazosRaw) : "-";

  // ================== CONFIG ==================
  const LINHAS_FATURAMENTO_DIRETO = 6;
  const LINHAS_SERVICOS_TERCEIROS = 3;
  const TOTAL_PAGINAS = 2;

  // ================== ALTURA DAS LINHAS ==================
  const ALTURA_LINHA_ITENS = 45;
  const ALTURA_LINHA_FATURAMENTO = 50;
  const ALTURA_LINHA_SERVICOS = 50;
  const ALTURA_LINHA_ETAPAS = 35;

  // ================== COLETA ITENS ==================
  const gruposDados = [];

  document.querySelectorAll("table[id^='tabela-bloco-']").forEach((tabela) => {
    const grupoId = tabela.id.replace("tabela-", "").trim();

    const ocultar = !!(gruposOcultarProduto && gruposOcultarProduto[grupoId]);
    if (ocultar) return;

    const inputAmbiente = document.querySelector(
      `input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`
    );
    const nomeAmbiente = inputAmbiente?.value?.trim() || "Sem Ambiente";

    let resumoGrupo = document.getElementById(`resumo-${grupoId}`)?.value?.trim() || "";
    resumoGrupo = resumoGrupo ? resumoGrupo.replace(/\r\n/g, "\n").replace(/\n/g, "<br>") : "";

    const linhas = Array.from(tabela.querySelectorAll("tbody tr"))
      .filter((tr) => {
        if (tr.querySelector("td[colspan]")) return false;
        if (tr.classList.contains("extra-summary-row")) return false;
        const tds = tr.querySelectorAll("td");
        return tds && tds.length >= 2;
      })
      .map((tr) => {
        const tds = Array.from(tr.querySelectorAll("td"));

        let utilizacao =
          getTextOrValue(tds[0]?.querySelector("textarea")) ||
          (tds[0]?.textContent || "").trim() ||
          "-";

        let descricao = (tds[1]?.textContent || "").trim();
        if (!descricao) {
          const candidato = tds
            .map((td) => (td.textContent || "").trim())
            .sort((a, b) => b.length - a.length)[0];
          descricao = candidato || "-";
        }

        const qtdInput =
          tr.querySelector("input.quantidade") ||
          tr.querySelector("input.quantidade_sugerida") ||
          tr.querySelector("input[name='quantidade']") ||
          tr.querySelector("input[data-campo='quantidade']");

        let qtd = (qtdInput?.value || "").trim();
        if (!qtd) qtd = "1";

        return { utilizacao, descricao, qtd };
      })
      .filter((x) => x.descricao && x.descricao !== "-");

    const informacoesProduto = document.querySelector(`#${grupoId}-aba3 textarea[name="informacoesProduto"]`)?.value?.trim() || "";
    const previsaoEntrega = document.querySelector(`#${grupoId}-aba3 input[name="previsaoEntrega"]`)?.value?.trim() || "";

    gruposDados.push({
      grupoId,
      nomeAmbiente,
      resumoGrupo,
      informacoesProduto,
      previsaoEntrega,
      itens: linhas,
    });
  });

  // ================== ITENS DA PÁGINA 1 ==================
  let contadorGrupo = 1;
  const itensHTML_ComQtd = gruposDados
    .map((g) => {
      const linhasHTML = g.itens?.length
        ? g.itens
            .map(
              (it) => `
            <tr>
              <td class="num"></td>
              <td>${it.utilizacao || "-"}</td>
              <td>${it.descricao}</td>
              <td class="qtd">${it.qtd}</td>
            </tr>
          `
            )
            .join("")
        : `
          <tr>
            <td class="num">1</td>
            <td>-</td>
            <td>-</td>
            <td class="qtd">-</td>
          </tr>
        `;

      const numItem = contadorGrupo++;
      const prazoFrase = [g.previsaoEntrega, g.informacoesProduto].filter(Boolean).join(" ");
      const prazoTexto = prazoFrase || "-";
      const prazoFooterHTML = `<tr><td colspan="4" style="font-weight:700;font-size:20px;background:#f0f0f0;padding:6px 10px;border-top:1px solid #aaa;text-align:center;">Prazo Previsto:&nbsp;${prazoTexto}&nbsp;&nbsp;|&nbsp;&nbsp;Pedido:&nbsp;${numeroPedido}&nbsp;&nbsp;|&nbsp;&nbsp;ITEM&nbsp;${numItem}</td></tr>`;
      const obsRowHTML = g.resumoGrupo
        ? `<tr><td colspan="4" class="obs"><strong>Observações:</strong><br>${g.resumoGrupo}</td></tr>`
        : "";

      return `
        <div class="item">
          <div class="item-head">
            <div class="item-title">ITEM ${numItem}</div>
            <div class="item-sub">AMBIENTE: ${String(g.nomeAmbiente || "").toUpperCase()}</div>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:44px;">#</th>
                <th style="width:170px;">Utilização</th>
                <th>Descrição</th>
                <th style="width:110px;">Quantidade</th>
              </tr>
            </thead>
            <tbody>${linhasHTML}${prazoFooterHTML}${obsRowHTML}</tbody>
          </table>
        </div>
      `;
    })
    .join("");

  // ================== CABEÇALHOS ==================
  const cabecalhoCompletoHTML = (titulo, paginaAtual, totalPaginas) => `
    <div class="topbar">
      <div class="logoBox"><img src="${logoSrc}" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
            Nº do Pedido
            <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
          </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted-meta">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted-meta">${data}</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="pageIndicator">ORDEM DE SERVIÇO ${paginaAtual}/${totalPaginas}</div>

    <table class="tblInfo">
      <tr>
        <td class="k">Nome / Razão social:</td>
        <td class="v">${padVisual(nomeClienteResponsavel, 30)}</td>
        <td class="k">CPF / CNPJ:</td>
        <td class="vSmall">${padVisual(cpfCnpj, 18)}</td>
        <td class="k">Origem:</td>
        <td class="vSmall">${padVisual(origem, 18)}</td>
      </tr>
      <tr>
        <td class="k">Endereço da obra:</td>
        <td colspan="5">${enderecoObra}</td>
      </tr>
      ${contatosHTML}
    </table>

    <div class="line2col">
      <div class="miniBox">Operador: <span class="muted-meta">${padVisual(operador, 18)}</span></div>
      <div class="miniBox">Vendedor: <span class="muted-meta">${padVisual(vendedor, 18)}</span></div>
    </div>

    <div class="prazos">
      <div class="t">Prazo Previsto por Área:</div>
      <div class="c">${prazosHTML}</div>
    </div>
  `;

  const cabecalhoBasicoHTML = (titulo, paginaAtual, totalPaginas) => `
    <div class="topbar topbar-basico">
      <div class="logoBox"><img src="${logoSrc}" alt="Logo"></div>
      <div class="opBox">
        <div class="opTitle">${titulo}</div>
        <div class="opRow">
          <div>
            Nº do Pedido
            <div class="numeroPedidoGigante"><span class="muted">${numeroPedido}</span></div>
          </div>
          <div class="metaRight">
            <div><strong>Nº do orçamento:</strong> <span class="muted-meta">${numeroOrcamento}</span></div>
            <div><strong>Data:</strong> <span class="muted-meta">${data}</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="pageIndicator pageIndicator-basico">ORDEM DE SERVIÇO ${paginaAtual}/${totalPaginas}</div>
  `;

  // ================== ETAPAS DO PROCESSO ==================
  const etapasDoProcessoHTML = `
    <div class="vv-etapas">
      <table class="etapas-flat">
        <thead>
          <tr>
            <th colspan="2" class="etapas-group-header">Pedido</th>
            <th colspan="3" class="etapas-group-header etapas-border-left">Projeto</th>
            <th colspan="4" class="etapas-group-header etapas-border-left">Obra / Medição</th>
          </tr>
          <tr>
            <th>Enviado</th>
            <th>Assinado</th>
            <th class="etapas-border-left etapas-w-item">Item</th>
            <th>Enviado</th>
            <th>Assinado</th>
            <th class="etapas-border-left etapas-w-item">Item</th>
            <th>Liberação Obra</th>
            <th>Medição Realizada</th>
            <th>Medidor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td></td><td></td>
            <td class="etapas-border-left"></td><td></td><td></td>
            <td class="etapas-border-left"></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td></td><td></td>
            <td class="etapas-border-left"></td><td></td><td></td>
            <td class="etapas-border-left"></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td></td><td></td>
            <td class="etapas-border-left"></td><td></td><td></td>
            <td class="etapas-border-left"></td><td></td><td></td><td></td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="9" class="etapas-desc-label"><strong>Descrição:</strong></td></tr>
          <tr><td colspan="9" class="etapas-desc-area">&nbsp;</td></tr>
        </tfoot>
      </table>
    </div>
  `;

  // ================== BLOCOS DA PÁGINA 2 ==================
  const faturamentoDiretoHTML = `
    <div class="fullBox fullBox-tight">
      <div class="gridTitle">Faturamento Direto</div>
      <table class="bigTbl faturamentoTbl">
        <thead>
          <tr>
            <th style="width:44px;">Item</th>
            <th style="width:110px;">Data Compra</th>
            <th>Fornecedor</th>
            <th style="width:110px;">Previsto</th>
            <th style="width:110px;">Tipo</th>
            <th style="width:90px;">Quant.</th>
            <th style="width:120px;">Na Empresa</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: LINHAS_FATURAMENTO_DIRETO })
            .map(
              () => `
            <tr>
              <td class="cItem"></td>
              <td class="cData"></td>
              <td></td>
              <td class="cData"></td>
              <td></td>
              <td class="cQtd"></td>
              <td></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  const servicosTerceirosHTML = `
    <div class="fullBox fullBox-tight">
      <div class="gridTitle">Serviço(s) de Terceiros</div>
      <table class="bigTbl servicosTbl">
        <thead>
          <tr>
            <th style="width:44px;">Item</th>
            <th>Fornecedor</th>
            <th>Nome do Contato</th>
            <th style="width:120px;">Telefone do Contato</th>
            <th style="width:100px;">Data Saída</th>
            <th style="width:100px;">Previsão</th>
            <th style="width:110px;">Data Retorno</th>
            <th style="width:140px;">Retorno Conferido por</th>
            <th style="width:120px;">Assinatura Interno</th>
            <th style="width:120px;">Assinatura Terceiro</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: LINHAS_SERVICOS_TERCEIROS })
            .map(
              () => `
            <tr>
              <td class="cItem"></td>
              <td></td>
              <td></td>
              <td></td>
              <td class="cData"></td>
              <td class="cData"></td>
              <td class="cData"></td>
              <td class="cResp">&nbsp;</td>
              <td></td>
              <td></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  // ================== PÁGINAS ==================
  // Cabeçalho pré-renderizado para embutir no script de paginação
  const cabHTML = cabecalhoCompletoHTML("ORDEM DE SERVIÇO / PRODUÇÃO", 1, 1);
  const cabHTMLEsc = cabHTML.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const cabHTMLSimples = cabecalhoBasicoHTML("ORDEM DE SERVIÇO / PRODUÇÃO", "", "");
  const cabHTMLSimplesEsc = cabHTMLSimples.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

  const pagina2HTML = `
    <div class="page-break pagina2-break"></div>
    <div class="pagina pagina-secundaria">
      ${cabecalhoBasicoHTML("ORDEM DE SERVIÇO / PRODUÇÃO", 2, 2)}
      ${faturamentoDiretoHTML}
      ${servicosTerceirosHTML}
    </div>
  `;

  // ================== HTML FINAL ==================
  const htmlCompleto = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Folha 1 - Ordem de Serviço</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
            margin-bottom: 22mm;
          }

          body {
            margin: 0;
            padding: 18px;
            padding-bottom: 28mm;
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #111;
          }

          .pagina {
            display: block;
          }

          .page-break {
            page-break-before: always;
            break-before: page;
          }

          .topbar {
            display: flex;
            align-items: stretch;
            gap: 10px;
            margin-bottom: 8px;
          }

          .topbar-basico {
            margin-bottom: 2px;
          }

          .logoBox {
            flex: 1;
            border: 2px solid #111;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 56px;
          }

          .logoBox img { max-height: 46px; }

          .opBox {
            width: 520px;
            border: 2px solid #111;
            padding: 8px 10px;
          }

          .opTitle {
            font-weight: 900;
            font-size: 14px;
            text-align: center;
            margin-bottom: 4px;
          }

          .opRow {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
            align-items: flex-start;
          }

          .metaRight {
            text-align: right;
            line-height: 1.2;
          }

          .numeroPedidoGigante {
            font-size: 80px;
            font-weight: 900;
            margin: 2px 0 0;
            line-height: 0.95;
            letter-spacing: 1px;
          }

          .numeroPedidoGigante span {
            font-weight: 900;
          }

          .muted {
            color: #111;
            font-weight: 900;
          }

          .muted-meta {
            color: #333;
            font-weight: 400;
          }

          .pageIndicator {
            margin: 4px 0 8px;
            padding: 5px 8px;
            border: 1px solid #111;
            font-weight: 700;
            text-align: center;
            background: #f8f8f8;
          }

          .pageIndicator-basico {
            margin: 0 0 4px;
          }

          .tblInfo {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }

          .tblInfo td {
            border: 1px solid #111;
            padding: 5px 7px;
            vertical-align: top;
          }

          .k {
            width: 160px;
            font-weight: 700;
            white-space: nowrap;
          }

          .v { min-width: 220px; }
          .vSmall { min-width: 160px; }

          .line2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin: 6px 0;
          }

          .miniBox {
            border: 1px solid #111;
            padding: 6px 8px;
            font-weight: 700;
          }

          .prazos {
            border: 1px solid #111;
            padding: 6px 8px;
            margin-top: 6px;
          }

          .prazos .t {
            font-weight: 800;
            font-size: 20px;
            margin-bottom: 4px;
          }

          .prazos .c {
            font-weight: 700;
            font-size: 16px;
            line-height: 1.25;
          }

          .item {
            border: 2px solid #111;
            margin-top: 10px;
          }

          .item-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #111;
            padding: 7px 9px;
            font-weight: 900;
          }

          .item-title {
            font-size: 16px;
          }

          .item-sub {
            font-size: 14px;
          }

          .tbl {
            width: 100%;
            border-collapse: collapse;
          }

          .tbl th,
          .tbl td {
            border: 1px solid #111;
            padding: 5px 7px;
          }

          .tbl tbody tr {
            height: ${ALTURA_LINHA_ITENS}px;
          }

          .tbl thead th {
            background: #f2f2f2;
            font-weight: 900;
          }

          .num {
            text-align: center;
            width: 44px;
          }

          .qtd {
            text-align: right;
            width: 110px;
          }

.obs {
  border-top: 1px solid #111;
  padding: 8px 10px;
  font-style: italic;
  font-weight: 700;
  color: #333;
  line-height: 1.35;
  font-size: 20px;
}

          .fullBox {
            border: 1px solid #111;
            margin-top: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .fullBox-tight {
            margin-top: 4px;
          }

          .gridTitle {
            font-weight: 900;
            text-align: center;
            padding: 5px;
            border-bottom: 1px solid #111;
            background: #f2f2f2;
          }

          .bigTbl {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          .bigTbl th,
          .bigTbl td {
            border: 1px solid #111;
            padding: 7px 5px;
            line-height: 1.35;
            vertical-align: top;
          }

          .faturamentoTbl tbody tr {
            height: ${ALTURA_LINHA_FATURAMENTO}px;
          }

          .servicosTbl tbody tr {
            height: ${ALTURA_LINHA_SERVICOS}px;
          }

          .bigTbl thead th {
            background: #fafafa;
            font-weight: 900;
          }

          .cItem {
            text-align: center;
          }

          .cData {
            text-align: center;
            white-space: nowrap;
          }

          .cQtd {
            text-align: right;
          }

          .cResp {
            color: #111;
          }

          .vv-etapas {
            margin-top: 10px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .etapas-flat {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            border: 2px solid #000;
          }

          .etapas-flat th,
          .etapas-flat td {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
            vertical-align: middle;
          }

          .etapas-flat thead tr:first-child th {
            font-weight: 700;
            font-size: 13px;
            background: #f0f0f0;
            padding: 6px 5px;
          }

          .etapas-flat tbody tr { height: ${ALTURA_LINHA_ETAPAS}px; }

          .etapas-group-header { border-bottom: 2px solid #000; }
          .etapas-border-left { border-left: 2px solid #000; }
          .etapas-w-item { width: 46px; }
          .etapas-center { text-align: center; }

          .etapas-desc-label {
            text-align: left;
            font-size: 12px;
            padding: 4px 7px;
            border-top: 2px solid #000;
          }

          .etapas-desc-area {
            height: calc(${ALTURA_LINHA_ETAPAS}px * 3);
            border-top: none;
          }

          @media print {
            body { padding: 18px; }
            .pagina, .item, .fullBox, .vv-etapas {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }

          #raw {
            position: absolute;
            top: -9999px;
            left: 0;
            width: 754px;
            visibility: hidden;
          }

          .pg-num {
            text-align: left;
            margin: 0 0 10px 0;
            padding: 0;
            clear: both;
            font-size: 16px;
            font-weight: 900;
            font-family: Arial, sans-serif;
            color: #111;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>

        <!-- Conteúdo bruto: medido e distribuído em páginas pelo script -->
        <div id="raw">
          ${etapasDoProcessoHTML}
          ${itensHTML_ComQtd || `<div class="item" style="padding:10px;"><strong>Nenhum item encontrado para impressão.</strong></div>`}
        </div>

        ${pagina2HTML}

        <script>
        (function () {
          var CAB_HTML = \`${cabHTMLEsc}\`;
          var CAB_HTML_SIMPLES = \`${cabHTMLSimplesEsc}\`;
          /* Pág 1: cabeçalho completo ~280px + pg-num ~30px → conteúdo ~736px → limite 700.
             Pág 2+: cabeçalho básico ~80px + pg-num ~30px → conteúdo ~936px → limite 890. */
          var ALTURA_PAG1 = 700;
          var ALTURA_PAG_N = 700;
          var NUMERO_PEDIDO = "${numeroPedido}";
          var NUMERO_ORCAMENTO = "${numeroOrcamento}";

          window.addEventListener('load', function () {
            setTimeout(function () {
              construirPaginas();
              window.print();
            }, 1800);
          });

          // Tenta cortar um .item no ponto onde o espaço disponível se esgota.
          // Retorna [parte1, parte2] ou null se não for possível cortar.
          function cortarItem(el, espacoDisponivel) {
            var tbody = el.querySelector('tbody');
            if (!tbody) return null;
            var itemHead = el.querySelector('.item-head');
            var itemLabel = el.querySelector('.item-title') ? el.querySelector('.item-title').textContent.trim() : 'ITEM';
            var headH = itemHead ? (itemHead.getBoundingClientRect().height || 0) : 0;
            var espaco = espacoDisponivel - headH - 6;
            if (espaco <= 0) {
              console.log('[CORTE] ' + itemLabel + ': espaco insuficiente (' + espacoDisponivel.toFixed(1) + 'px disponivel, ' + headH.toFixed(1) + 'px so cabecalho) — nao corta');
              return null;
            }

            var trs = Array.from(tbody.querySelectorAll('tr'));
            var acum = 0;
            var corte = 0;
            for (var i = 0; i < trs.length; i++) {
              var trH = trs[i].getBoundingClientRect().height || 30;
              if (acum + trH > espaco) {
                console.log('[CORTE] ' + itemLabel + ' linha ' + (i + 1) + ': NAO cabe (acum=' + acum.toFixed(1) + ' + trH=' + trH.toFixed(1) + ' > espaco=' + espaco.toFixed(1) + ') — corte aqui');
                break;
              }
              acum += trH;
              corte = i + 1;
              console.log('[CORTE] ' + itemLabel + ' linha ' + corte + ': cabe (acum=' + acum.toFixed(1) + '/' + espaco.toFixed(1) + ')');
            }
            if (corte === 0 || corte >= trs.length) {
              console.log('[CORTE] ' + itemLabel + ': corte=' + corte + '/' + trs.length + ' — sem corte necessario');
              return null;
            }

            // Parte 1: cabeçalho + primeiras N linhas
            var p1 = el.cloneNode(true);
            var trs1 = Array.from(p1.querySelector('tbody').querySelectorAll('tr'));
            for (var j = corte; j < trs1.length; j++) trs1[j].remove();

            // Parte 2: sem item-head, linhas restantes + faixa de continuação
            var p2 = el.cloneNode(true);
            p2.dataset.continuacao = '1';
            var head2 = p2.querySelector('.item-head');
            var itemLabel = el.querySelector('.item-title') ? el.querySelector('.item-title').textContent.trim() : 'ITEM';
            if (head2) head2.remove();
            var tbody2 = p2.querySelector('tbody');
            var trs2 = Array.from(tbody2.querySelectorAll('tr'));
            for (var k = 0; k < corte; k++) trs2[k].remove();

            // Div de continuação antes da tabela
            var divCont = document.createElement('div');
            divCont.style.cssText = 'text-align:center;font-weight:700;font-size:10.5px;color:#000;padding:3px 8px;letter-spacing:0.3px;';
            divCont.textContent = 'Continuacao ' + itemLabel + '   |   Pedido: ' + NUMERO_PEDIDO + '   |   Orcamento: ' + NUMERO_ORCAMENTO;
            p2.insertBefore(divCont, p2.firstChild);

            return [p1, p2];
          }

          function construirPaginas() {
            var raw = document.getElementById('raw');
            if (!raw) return;
            var filhos = Array.from(raw.children);
            raw.style.visibility = 'visible';

            // Medir alturas brutas
            var hBrutos = filhos.map(function (el) {
              return el.getBoundingClientRect().height || el.offsetHeight || 40;
            });

            // Distribuição: etapas (filhos[0]) sempre abre a pg1;
            // todos os demais itens usam "cabe inteiro ou corta" em sequência.
            var todasPaginas = [[]];
            var altAtual = 0;
            var numPagina = 1;

            for (var i = 0; i < filhos.length; i++) {
              var el = filhos[i];
              var h  = hBrutos[i];
              var label = (el.querySelector('.item-title') ? el.querySelector('.item-title').textContent.trim() : (i === 0 ? 'Etapas' : 'bloco-' + i));

              if (i === 0) {
                // Etapas do Processo: sempre na pg1, não cortar
                console.log('[PG ' + numPagina + '] ' + label + ': ' + h.toFixed(1) + 'px (fixo, abre pg1)');
                todasPaginas[0].push(el);
                altAtual = h;
                continue;
              }

              var limitePag = numPagina === 1 ? ALTURA_PAG1 : ALTURA_PAG_N;
              if (altAtual + h <= limitePag) {
                // Cabe inteiro na página atual
                console.log('[PG ' + numPagina + '] ' + label + ': CABE inteiro (acum=' + altAtual.toFixed(1) + ' + h=' + h.toFixed(1) + ' = ' + (altAtual + h).toFixed(1) + '/' + limitePag + ')');
                todasPaginas[todasPaginas.length - 1].push(el);
                altAtual += h;
              } else if (altAtual === 0) {
                // Página vazia e item maior que limite — colocar e virar página
                console.log('[PG ' + numPagina + '] ' + label + ': maior que limite (' + h.toFixed(1) + 'px), coloca e vira pagina');
                todasPaginas[todasPaginas.length - 1].push(el);
                todasPaginas.push([]);
                numPagina++;
                console.log('--- Abrindo PG ' + numPagina + ' (cabecalho simplificado) ---');
                altAtual = 0;
              } else {
                // Tentar cortar o item no espaço restante
                console.log('[PG ' + numPagina + '] ' + label + ': NAO cabe inteiro (acum=' + altAtual.toFixed(1) + ' + h=' + h.toFixed(1) + ' > ' + limitePag + ') — tentando cortar com espaco=' + (limitePag - altAtual).toFixed(1) + 'px');
                var partes = cortarItem(el, limitePag - altAtual);
                if (partes) {
                  todasPaginas[todasPaginas.length - 1].push(partes[0]);
                  numPagina++;
                  console.log('--- Abrindo PG ' + numPagina + ' (cabecalho simplificado) — continuacao de ' + label + ' ---');
                  todasPaginas.push([partes[1]]);
                  altAtual = partes[1].getBoundingClientRect().height || 40;
                  console.log('[PG ' + numPagina + '] continuacao de ' + label + ': ' + altAtual.toFixed(1) + 'px');
                } else {
                  // Não foi possível cortar — item inteiro para próxima página
                  numPagina++;
                  console.log('--- Abrindo PG ' + numPagina + ' (cabecalho simplificado) — ' + label + ' inteiro ---');
                  todasPaginas.push([el]);
                  altAtual = h;
                }
              }
            }

            // Remover última página se ficou vazia
            if (todasPaginas[todasPaginas.length - 1].length === 0) todasPaginas.pop();

            // Validar cada página: se < 60% preenchida, PUXAR itens da próxima página
            // para preencher esta. Nunca ultrapassa o limite (sem overflow).
            // Repete até estabilizar (máx 15 iterações).
            (function validarPaginas() {
              function medirAltura(els) {
                return els.reduce(function (sum, el) {
                  return sum + (el.getBoundingClientRect().height || el.offsetHeight || 40);
                }, 0);
              }
              for (var iter = 0; iter < 15; iter++) {
                var mudou = false;
                for (var pi = 0; pi < todasPaginas.length - 1; pi++) {
                  var limitePi = pi === 0 ? ALTURA_PAG1 : ALTURA_PAG_N;
                  var altPi = medirAltura(todasPaginas[pi]);
                  if (altPi < limitePi * 0.6) {
                    // Puxar itens do início da próxima página até atingir 60% ou limite
                    var proxima = todasPaginas[pi + 1];
                    while (altPi < limitePi * 0.6 && proxima.length > 0) {
                      var candidato = proxima[0];
                      var hCand = candidato.getBoundingClientRect().height || candidato.offsetHeight || 40;
                      if (altPi + hCand > limitePi) break; // Não ultrapassa o limite
                      proxima.shift();
                      todasPaginas[pi].push(candidato);
                      altPi += hCand;
                    }
                    if (proxima.length === 0) todasPaginas.splice(pi + 1, 1);
                    console.log('[VALIDA] Pag ' + (pi + 1) + ' preenchida para ' + altPi.toFixed(1) + 'px (' + (100 * altPi / limitePi).toFixed(0) + '%). Iter ' + (iter + 1));
                    mudou = true;
                    break;
                  }
                }
                if (!mudou) break;
              }
              // Última página: se < 40% e há penúltima com espaço, absorve
              if (todasPaginas.length > 1) {
                var altUlt = medirAltura(todasPaginas[todasPaginas.length - 1]);
                var limPenult = todasPaginas.length === 2 ? ALTURA_PAG1 : ALTURA_PAG_N;
                var altPenult = medirAltura(todasPaginas[todasPaginas.length - 2]);
                if (altUlt < ALTURA_PAG_N * 0.4 && altPenult + altUlt <= limPenult * 1.05) {
                  todasPaginas[todasPaginas.length - 1].forEach(function (el) {
                    todasPaginas[todasPaginas.length - 2].push(el);
                  });
                  todasPaginas.pop();
                  console.log('[VALIDA] Ultima pag (' + altUlt.toFixed(1) + 'px) absorvida na penultima.');
                }
              }
            })();

            raw.remove();

            var total  = todasPaginas.length + 1;
            var anchor = document.querySelector('.pagina2-break');

            todasPaginas.forEach(function (els, i) {
              if (i > 0) {
                var br = document.createElement('div');
                br.className = 'page-break';
                document.body.insertBefore(br, anchor);
              }

              var pDiv = document.createElement('div');
              pDiv.className = 'pagina';

              var numDiv = document.createElement('div');
              numDiv.className = 'pg-num';
              numDiv.innerHTML = 'Pág. ' + (i + 1) + ' / ' + total;
              pDiv.appendChild(numDiv);

              var cabDiv = document.createElement('div');
              cabDiv.innerHTML = CAB_HTML;
              pDiv.appendChild(cabDiv);

              els.forEach(function (el) { el.style.visibility = 'visible'; pDiv.appendChild(el); });

              document.body.insertBefore(pDiv, anchor);
            });

            var pag2 = document.querySelector('.pagina-secundaria');
            if (pag2) {
              var cab2 = pag2.querySelector('.topbar');
              if (cab2) {
                var num2 = document.createElement('div');
                num2.className = 'pg-num';
                num2.innerHTML = 'Pág. ' + total + ' / ' + total;
                cab2.insertAdjacentElement('beforebegin', num2);
              }
            }
          }
        })();
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(htmlCompleto);
  printWindow.document.close();
}
