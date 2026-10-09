function parcelasValidas() {
  const rows = document.querySelectorAll("#listaParcelas .row");
  if (rows.length === 0) return true;

  let soma = 0;
  rows.forEach(row => {
    const raw = row.querySelector(".valor-parcela")?.value.trim() || "";
    soma += parseFloat(raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
  });

  const totalGeral = (function() {
    const texto = document.querySelector("#valorFinalTotal")?.textContent.trim() || "0";
    const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
  })();

  if (Math.abs(soma - totalGeral) >= 1) {
    const diff = totalGeral - soma;
    const sinal = diff > 0 ? "faltam" : "excedem em";
    mostrarPopupCustomizado(
      "Parcelas incorretas",
      `As parcelas ${sinal} ${Math.abs(diff).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em relação ao total do orçamento. Corrija antes de continuar.`,
      "error"
    );
    return false;
  }
  return true;
}

function parcelasCompletasParaOmie() {
  const rows = document.querySelectorAll("#listaParcelas .row");
  if (rows.length === 0) return true;

  const incompletas = [];
  rows.forEach((row, idx) => {
    const tipo = row.querySelector(".tipo-item-parcela")?.value || "";
    if (tipo === "faturado-direto") return;

    const tipoMonetario = row.querySelector(".tipo-monetario")?.value || "";
    const condicao = row.querySelector(".condicao-pagto")?.value?.trim() || "";
    const valor = row.querySelector(".valor-parcela")?.value.trim() || "";
    const vencimento = row.querySelector(".data-parcela")?.value || "";

    const vazios = [];
    if (!tipo)         vazios.push("Tipo");
    if (!tipoMonetario) vazios.push("Tipo Monetário");
    if (!valor)        vazios.push("Valor");
    if (!vencimento)   vazios.push("Vencimento");

    if (vazios.length) incompletas.push(`Parcela ${idx + 1}: ${vazios.join(", ")}`);
  });

  if (incompletas.length) {
    mostrarPopupCustomizado(
      "Parcelas incompletas",
      `Preencha todos os campos antes de enviar para a Omie:\n\n${incompletas.join("\n")}`,
      "error"
    );
    return false;
  }
  return true;
}

async function salvarPropostaEditavel() {
  try {
    console.log("editaveis");

    mostrarCarregando();
    await new Promise(resolve => setTimeout(resolve, 2000));

    function extrairNumeroMoeda(texto) {
      if (!texto) return 0;

      return parseFloat(
        String(texto)
          .replace(/\u00A0/g, " ")
          .replace(/\s/g, "")
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
          .trim()
      ) || 0;
    }

    function obterValorSugeridoDoBloco(bloco) {
      const cards = bloco.querySelectorAll(".resumo-totalizador-interno .col");

      for (const col of cards) {
        const titulo = col.querySelector(".text-muted")?.textContent?.replace(/\s+/g, " ")?.trim() || "";
        const valorTexto = col.querySelector(".fw-bold")?.textContent?.trim() || "";

        if (titulo.toLowerCase().includes("valor sugerido")) {
          return extrairNumeroMoeda(valorTexto);
        }
      }

      return 0;
    }

    // 👥 Clientes
    const clientes = Array.from(document.querySelectorAll(".cliente-item")).map(el => ({
      nome_razao_social: el.querySelector(".razaoSocial")?.value || "",
      nome_contato: el.querySelector(".nomeContato")?.value || "",
      codigoOmie: el.querySelector(".codigoCliente")?.value || "",
      cpfCnpj: el.querySelector(".cpfCnpj")?.value || "",
      funcao: el.querySelector(".funcaoCliente")?.value || "",
      telefone: el.querySelector(".telefoneCliente")?.value || ""
    }));

    // 💳 Condição e parcelas
    const condicaoPagamento = document.getElementById("condicaoPagamento")?.value || "";
    let parcelas = [];

    if (condicaoPagamento === "parcelado") {
      const linhas = document.querySelectorAll("#listaParcelas .row");
      parcelas = Array.from(linhas).map(row => {
        const data = row.querySelector(".data-parcela")?.value || "";
        const valor = row.querySelector(".valor-parcela")?.value || "";
        const tipo = row.querySelector(".tipo-monetario")?.value || "";
        const tipoParcela = row.querySelector(".tipo-item-parcela")?.value || "";
        const condSelect = row.querySelector("select.condicao-pagto");
        const condInput = row.querySelector("input.condicao-pagto");
        const condicao = condSelect?.value || condInput?.value || "";
        return { data, valor, tipo, tipoParcela, condicao };
      });
    }

    const select = document.getElementById("vendedorResponsavel");
    const textoSelecionado = select?.options[select.selectedIndex]?.text || "";

    async function preencherNumeroOrcamento() {
      const campoNumero = document.getElementById("numeroOrcamento");
      const numeroExistente = campoNumero?.value?.trim();
      if (numeroExistente && numeroExistente !== "ERRO") {
        return numeroExistente;
      }

      try {
        const res = await fetch("https://contator-ulhoa-3d28d89efa68.herokuapp.com/orcamento");

        if (!res.ok) {
          throw new Error(`Erro HTTP: ${res.status}`);
        }

        const data = await res.json();
        const numFormatado = String(data.numero).padStart(5, "0");

        if (!campoNumero) {
          console.error("Campo #numeroOrcamento não encontrado no HTML.");
          return numFormatado;
        }

        campoNumero.value = numFormatado;
        return numFormatado;
      } catch (err) {
        console.error("Erro ao buscar número do orçamento:", err);

        if (campoNumero) {
          campoNumero.value = "ERRO";
        }

        alert("Erro ao buscar número do orçamento!");
        return "";
      }
    }

    // ⚠️ Número do orçamento NÃO é buscado aqui mais — só depois de passar nas validações
    const camposFormulario = {
      numeroOrcamento: "",
      dataOrcamento: document.getElementById("dataOrcamento")?.value || "",
      origemCliente: document.getElementById("origemCliente")?.value || "",
      clientes,
      cep: document.getElementById("cep")?.value || "",
      rua: document.getElementById("rua")?.value || "",
      numero: document.getElementById("numero")?.value || "",
      complemento: document.getElementById("complemento")?.value || "",
      bairro: document.getElementById("bairro")?.value || "",
      cidade: document.getElementById("cidade")?.value || "",
      estado: document.getElementById("estado")?.value || "",
      vendedorResponsavel: textoSelecionado,
      operadorInterno: document.getElementById("operadorInterno")?.value || "",
      prazosArea: document.getElementById("prazosArea")?.value || "",
      condicaoPagamento,
      condicoesGerais: document.getElementById("condicoesGerais")?.value || "",
      parcelas,

      prazoEntrega: document.getElementById("prazoEntrega")?.value || "",
      dataPedidoEnviadoCliente: document.getElementById("dataPedidoEnviadoCliente")?.value || "",
      meioEnvioPedido: document.getElementById("meioEnvioPedido")?.value || "",
      dataPedidoAssinado: document.getElementById("dataPedidoAssinado")?.value || "",
      obraLiberada: document.getElementById("obraLiberada")?.value || "",
      itensLiberacaoObra: document.getElementById("itensLiberacaoObra")?.value || "",
      dataLiberacaoObra: document.getElementById("dataLiberacaoObra")?.value || "",
      dataProjetoEnviado: document.getElementById("dataProjetoEnviado")?.value || "",
      dataProjetoAssinado: document.getElementById("dataProjetoAssinado")?.value || "",
      dataMedicaoRealizada: document.getElementById("dataMedicaoRealizada")?.value || ""
    };

    // 🔄 Grupos e produtos
    const grupos = [];
    document.querySelectorAll(".main-container").forEach(bloco => {
      const blocoId = bloco.id;
      const nomeGrupo = bloco.querySelector(`span[id^='titulo-accordion-']`)?.textContent?.trim() || blocoId;
      const ambiente = bloco.querySelector(`input[data-id-grupo="${blocoId}"]`)?.value?.trim() || "";

      const tabela = bloco.querySelector(`#tabela-${blocoId}`);
      if (!tabela) {
        console.warn(`⚠️ Tabela não encontrada no bloco ${blocoId}`);
        return;
      }

      const resumoTextarea = document.getElementById(`resumo-${blocoId}`);
      const resumoGrupo = resumoTextarea?.value?.trim() || "";
      const valorSugeridoGrupo = obterValorSugeridoDoBloco(bloco);

      const itens = [];
      tabela.querySelectorAll("tbody tr:not(.extra-summary-row)").forEach(tr => {
        const utilizacaoEl = tr.querySelector("td:nth-child(1) input, td:nth-child(1) textarea");
        const descricao_utilizacao = utilizacaoEl?.value?.trim() || "";

        const nome_produto = tr.querySelector("td:nth-child(2)")?.textContent?.trim() || "";

        const custoStr = tr.querySelector("td:nth-child(3)")?.textContent?.replace("R$", "").replace(/\s/g, "") || "0";
        const precoStr = tr.querySelector("td:nth-child(4)")?.textContent?.replace("R$", "").replace(/\s/g, "") || "0";

        const custo = parseFloat(custoStr.replace(",", ".")) || 0;
        const preco = parseFloat(precoStr.replace(",", ".")) || 0;

        const codigo_omie = tr.querySelector("td:nth-child(5)")?.textContent?.trim() || "";
        const quantidade = parseFloat(tr.querySelector("input.quantidade")?.value || "0");
        const inputQtdDesejada = tr.querySelector("input.quantidade-desejada");

        const quantidade_desejada = parseFloat(inputQtdDesejada?.value || "0");
        const formula_quantidade = inputQtdDesejada?.dataset.formula || "";

        const formula_custo = resumoGrupo;
        const formula_preco = tr.querySelector("td:nth-child(4)")?.dataset.formula || "";

        itens.push({
          descricao_utilizacao,
          nome_produto,
          custo,
          preco,
          codigo_omie,
          unidade: tr.querySelector(".unidade-medida")?.textContent?.trim() || "",
          quantidade,
          quantidade_desejada,
          formula_quantidade,
          formula_custo,
          formula_preco,
          valor_total_produto: valorSugeridoGrupo
        });
      });

   const parametros = {};
      bloco.querySelectorAll(".tab-pane input[name]").forEach(input => {
        const nome = input.name;
        let valor = input.value?.trim();
        if (valor?.includes(",")) valor = valor.replace(",", ".");
        parametros[nome] = isNaN(valor) ? valor : parseFloat(valor);
      });

      // [CAMPO NOVO] Informações do Produto (textarea — o seletor "input[name]" acima não pega textarea)
      const textareaInformacoes = bloco.querySelector(`textarea[name="informacoesProduto"]`);
      if (textareaInformacoes) parametros.informacoesProduto = textareaInformacoes.value?.trim() || "";

      // [CAMPO NOVO] Previsão de Entrega — já é capturado automaticamente pelo loop acima
      // (input[name="previsaoEntrega"] é um <input>, então cai no querySelectorAll(".tab-pane input[name]"))

      const camposPopupExtras = {};
      bloco.querySelectorAll(".tab-pane .campo-resultado").forEach(el => {
        const nome = el.id?.replace("campo-", "") || "";
        const valor = el.textContent?.replace("R$", "").replace(",", ".").trim();
        camposPopupExtras[nome] = parseFloat(valor) || 0;
      });

      const dadosPopupSalvos = window.groupPopupsData?.[blocoId] || {};

       if (itens.length > 0) {
        grupos.push({
          nome: nomeGrupo,
          ambiente,
          itens,
          parametros,
          camposPopupExtras,
          dadosPopupSalvos
        });
      }
    });

    const errosObrigatorios = [];

    const selectVendedor = document.getElementById("vendedorResponsavel");
    const valorSelecionado = selectVendedor?.value?.trim() || "";

    if (
      !textoSelecionado ||
      !textoSelecionado.trim() ||
      textoSelecionado.trim().toLowerCase() === "selecione" ||
      !valorSelecionado
    ) {
      errosObrigatorios.push("O campo Vendedor Responsável é obrigatório.");
    }

    if (!clientes.length) {
      errosObrigatorios.push(
        "É obrigatório informar pelo menos um Cliente (Nome / Razão Social e Função)."
      );
    } else {
      clientes.forEach((c, idx) => {
        const linha = idx + 1;

        if (!c.nome_razao_social || !c.nome_razao_social.trim()) {
          errosObrigatorios.push(
            `O campo Nome / Razão Social do cliente ${linha} é obrigatório.`
          );
        }

        if (!c.funcao || !c.funcao.trim()) {
          errosObrigatorios.push(`O campo Função do cliente ${linha} é obrigatório.`);
        }
      });
    }

    const containerProdutos = document.getElementById("blocosProdutosContainer");
    const linhasProdutos = containerProdutos
      ? containerProdutos.querySelectorAll("table tbody tr:not(.extra-summary-row)").length
      : 0;

    if (!containerProdutos || linhasProdutos === 0) {
      errosObrigatorios.push("Inclua pelo menos 1 produto na proposta antes de salvar.");
    }

    if (errosObrigatorios.length) {
      const mensagem =
        "Preencha os seguintes campos obrigatórios:\n\n" +
        errosObrigatorios.map(msg => `• ${msg}`).join("\n");

      ocultarCarregando();
      mostrarPopupCustomizado("⚠️ Campos obrigatórios", mensagem, "warning");

      return {
        erro: "Campos obrigatórios não preenchidos",
        detalhes: errosObrigatorios
      };
    }

    // Limpa os números para forçar geração nova na duplicação (evita herdar números da proposta original)
    const _campoNum = document.getElementById("numeroOrcamento");
    if (_campoNum) _campoNum.value = "";
    const _campoPedido = document.getElementById("numeroPedido");
    if (_campoPedido) _campoPedido.value = "";

    // ✅ Só busca/gera (e queima) o número do orçamento depois que passou em TODAS as validações
    const numeroOrcamento = await preencherNumeroOrcamento();
    camposFormulario.numeroOrcamento = numeroOrcamento;

    const numeroProposta = camposFormulario.numeroOrcamento || Date.now().toString();
    const proposta = {
      tipoProposta: "editavel",
      numeroProposta,
      camposFormulario,
      grupos
    };

   console.log('📤 Enviando proposta:', JSON.stringify(proposta, null, 2));

const resposta = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/api/propostas", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(proposta)
});

const resultado = await resposta.json();
console.log('📦 Proposta salva com sucesso:', JSON.stringify(resultado, null, 2));
console.log('🆔 ID:', resultado._id);
ocultarCarregando();
mostrarPopupCustomizado("✅ Sucesso", "Proposta atualizada com sucesso!", "success");

    if (resultado && resultado._id) {
      window.location.href = `editar.html?id=${resultado._id}`;
    }

    const btn = document.createElement("button");
    btn.textContent = "Editar";
    btn.onclick = () => {
      if (resultado && resultado._id) {
        window.location.href = `editar.html?id=${resultado._id}`;
      }
    };
    document.body.appendChild(btn);

    return resultado;

  } catch (erro) {
    console.error("❌ Erro ao salvar proposta:", erro);
    ocultarCarregando();
    mostrarPopupCustomizado("❌ Erro", "Erro ao atualizar proposta. Verifique o console.", "error");
    return { erro: "Erro inesperado ao salvar proposta." };
  }
}
function extrairNumeroMoeda(texto) {
  if (!texto) return 0;

  return parseFloat(
    texto
      .replace(/\u00A0/g, " ")
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

window.atualizarPropostaEditavel = async function () {
  // ── Validação: itens com custo zero (exceto o 1º de cada grupo) ──────────
  const _idAtual = new URLSearchParams(window.location.search).get("id");
  if (_idAtual === "68746e305b9691a7ed3b3f97") { // modelo — pula validação
    // vai direto para o try abaixo
  } else {
  const itensZerados = [];
  document.querySelectorAll("tbody").forEach(tbody => {
    const linhas = tbody.querySelectorAll("tr");
    linhas.forEach((tr, idx) => {
      if (idx === 0) return; // primeiro item de cada grupo é isento
      const custoTd = tr.querySelector("td.custo-unitario");
      if (!custoTd) return;
      const texto = custoTd.textContent.replace(/[^\d,\.]/g, "").replace(",", ".");
      const valor = parseFloat(texto) || 0;
      if (valor === 0) {
        const nomeTd = tr.querySelectorAll("td")[1];
        itensZerados.push(nomeTd?.textContent?.trim() || `Linha ${idx + 1}`);
      }
    });
  });

  if (itensZerados.length > 0) {
    await new Promise(resolve => {
      const ov = document.createElement("div");
      ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;";
      const lista = itensZerados.map(n => `<li style="margin-bottom:4px;">${n}</li>`).join("");
      ov.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:28px;width:min(480px,92vw);box-shadow:0 16px 48px rgba(0,0,0,.25);max-height:80vh;overflow-y:auto;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">⚠️ Produtos com custo zero</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Os seguintes produtos estão com custo zerado. Corrija os valores antes de salvar:</div>
          <ul style="font-size:13px;color:#ef4444;font-weight:600;padding-left:18px;margin-bottom:24px;">${lista}</ul>
          <div style="display:flex;justify-content:flex-end;">
            <button id="_zero_ok" style="padding:9px 24px;border:none;border-radius:8px;background:#475569;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Entendido</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      document.getElementById("_zero_ok").onclick = () => { document.body.removeChild(ov); resolve(); };
    });
    return;
  }
  } // fim else (não é modelo)

  try {
    //abrirTodasSanfonas();
    mostrarCarregando();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const idProposta = new URLSearchParams(window.location.search).get("id");
    if (!idProposta) {
      alert("❌ ID da proposta não encontrado na URL.");
      return { erro: "ID da proposta não encontrado." };
    }

    function extrairNumeroMoeda(texto) {
      if (!texto) return 0;

      return parseFloat(
        String(texto)
          .replace(/\u00A0/g, " ")
          .replace(/\s/g, "")
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
          .trim()
      ) || 0;
    }

    function obterValorSugeridoDoBloco(bloco) {
      const cards = bloco.querySelectorAll(".resumo-totalizador-interno .col");

      for (const col of cards) {
        const titulo = col.querySelector(".text-muted")?.textContent?.replace(/\s+/g, " ")?.trim() || "";
        const valorTexto = col.querySelector(".fw-bold")?.textContent?.trim() || "";

        if (titulo.toLowerCase().includes("valor sugerido")) {
          return extrairNumeroMoeda(valorTexto);
        }
      }

      return 0;
    }

    const select = document.getElementById("vendedorResponsavel");
    const textoSelecionado = select?.options[select.selectedIndex]?.text?.trim() || "";

  const clientes = Array.from(document.querySelectorAll(".cliente-item")).map(el => ({
  nome_razao_social: el.querySelector(".razaoSocial")?.value || "",
  nome_contato: el.querySelector(".nomeContato")?.value || "",
  codigoOmie: el.querySelector(".codigoCliente")?.value || "",
  cpfCnpj: el.querySelector(".cpfCnpj")?.value || "",
  funcao: el.querySelector(".funcaoCliente")?.value || "",
  telefone: el.querySelector(".telefoneCliente")?.value || "",
  email: el.querySelector(".emailCliente")?.value || ""
}));

    const condicaoPagamento = document.getElementById("condicaoPagamento")?.value?.trim() || "";
    const linhas = document.querySelectorAll("#listaParcelas .row");
    const parcelas = Array.from(linhas).map(row => {
      const tipo = row.querySelector(".tipo-monetario")?.value || "";
      const tipoParcela = row.querySelector(".tipo-item-parcela")?.value || "";
      const condicao = row.querySelector(".condicao-pagto")?.value || "";
      const valor = row.querySelector(".valor-parcela")?.value || "";
      const data = row.querySelector(".data-parcela")?.value || "";
      return { tipo, tipoParcela, condicao, valor, data };
    });

    const desconto = document.querySelector("#campoDescontoFinal")?.value || "";

    const numeroOrcamentoEl = document.getElementById("numeroOrcamento");
    const numeroPedidoEl = document.getElementById("numeroPedido");

   const camposFormulario = {
  numeroOrcamento:
    numeroOrcamentoEl?.value?.trim() ||
    numeroOrcamentoEl?.getAttribute("data-valor-original")?.trim() ||
    "",

  // Sem fallback em data-valor-original — limpeza intencional pelo usuário deve passar
  numeroPedido: numeroPedidoEl?.value?.trim() ?? "",

  dataOrcamento: document.getElementById("dataOrcamento")?.value || "",
  origemCliente: document.getElementById("origemCliente")?.value || "",
  clientes,

  // Endereço de cobrança
  cep: document.getElementById("cep")?.value || "",
  rua: document.getElementById("rua")?.value || "",
  numero: document.getElementById("numero")?.value || "",
  complemento: document.getElementById("complemento")?.value || "",
  bairro: document.getElementById("bairro")?.value || "",
  cidade: document.getElementById("cidade")?.value || "",
  estado: document.getElementById("estado")?.value || "",

  // Endereço da obra
  cepObra: document.getElementById("cepObra")?.value || "",
  ruaObra: document.getElementById("ruaObra")?.value || "",
  numeroObra: document.getElementById("numeroObra")?.value || "",
  complementoObra: document.getElementById("complementoObra")?.value || "",
  bairroObra: document.getElementById("bairroObra")?.value || "",
  cidadeObra: document.getElementById("cidadeObra")?.value || "",
  estadoObra: document.getElementById("estadoObra")?.value || "",

  vendedorResponsavel: textoSelecionado,
  operadorInterno: document.getElementById("operadorInterno")?.value || "",

  prazosArea: document.getElementById("prazosArea")?.value || "",
  condicaoPagamento,
  condicoesGerais: document.getElementById("condicoesGerais")?.value || "",

  desconto,
  parcelas,

  prazoEntrega: document.getElementById("prazoEntrega")?.value || "",
  dataPedidoEnviadoCliente: document.getElementById("dataPedidoEnviadoCliente")?.value || "",
  meioEnvioPedido: document.getElementById("meioEnvioPedido")?.value || "",
  dataPedidoAssinado: document.getElementById("dataPedidoAssinado")?.value || "",
  prazoPrevisto: document.getElementById("prazoPrevisto")?.value || "",
  dataEntregaProjeto: document.getElementById("dataEntregaProjeto")?.value || "",
  dataInicioProjeto: document.getElementById("dataInicioProjeto")?.value || "",
  dataLiberacaoConferencia: document.getElementById("dataLiberacaoConferencia")?.value || "",
  dataConferencia: document.getElementById("dataConferencia")?.value || "",

  obraLiberada: document.getElementById("obraLiberada")?.value || "",
  itensLiberacaoObra: document.getElementById("itensLiberacaoObra")?.value || "",
  dataLiberacaoObra: document.getElementById("dataLiberacaoObra")?.value || "",
  dataProjetoEnviado: document.getElementById("dataProjetoEnviado")?.value || "",
  dataProjetoAssinado: document.getElementById("dataProjetoAssinado")?.value || "",
  dataMedicaoRealizada: document.getElementById("dataMedicaoRealizada")?.value || ""
};

    const grupos = [];
    document.querySelectorAll(".main-container").forEach(bloco => {
      const blocoId = bloco.id;
      const nomeGrupo = bloco.querySelector(`span[id^='titulo-accordion-']`)?.textContent?.trim() || blocoId;
      const ambiente = bloco.querySelector(`input[data-id-grupo="${blocoId}"]`)?.value?.trim() || "";

      const tabela = bloco.querySelector(`#tabela-${blocoId}`);
      if (!tabela) {
        console.warn(`⚠️ Tabela não encontrada no bloco ${blocoId}`);
        return;
      }

      const resumoEl = bloco.querySelector(`#resumo-${blocoId}`);
      const resumoGrupo = resumoEl?.value?.trim() || "";
      const valorSugeridoGrupo = obterValorSugeridoDoBloco(bloco);

      const itens = [];
      tabela.querySelectorAll("tbody tr:not(.extra-summary-row)").forEach(tr => {
        const utilizacaoEl = tr.querySelector("td:nth-child(1) input, td:nth-child(1) textarea");
        const descricao_utilizacao = utilizacaoEl?.value?.trim() || "";

        const nome_produto = tr.querySelector("td:nth-child(2)")?.textContent?.trim() || "";
        const custoStr = tr.querySelector("td:nth-child(3)")?.textContent?.replace("R$", "").replace(/\s/g, "") || "0";
        const precoStr = tr.querySelector("td:nth-child(4)")?.textContent?.replace("R$", "").replace(/\s/g, "") || "0";
        const custo = parseFloat(custoStr.replace(",", ".")) || 0;
        const preco = parseFloat(precoStr.replace(",", ".")) || 0;
        const codigo_omie = tr.querySelector("td:nth-child(5)")?.textContent?.trim() || "";
        const quantidade = parseFloat(tr.querySelector("input.quantidade")?.value || "0");
        const inputQtdDesejada = tr.querySelector("input.quantidade-desejada");
        const quantidade_desejada = parseFloat(inputQtdDesejada?.value || "0");
        const formula_quantidade = inputQtdDesejada?.dataset.formula || "";

        const formula_custo = resumoGrupo;
        const formula_preco = tr.querySelector("td:nth-child(4)")?.dataset.formula || "";

        itens.push({
          descricao_utilizacao,
          nome_produto,
          custo,
          preco,
          codigo_omie,
          unidade: tr.querySelector(".unidade-medida")?.textContent?.trim() || "",
          quantidade,
          quantidade_desejada,
          formula_quantidade,
          formula_custo,
          formula_preco,
          valor_total_produto: valorSugeridoGrupo
        });
      });

      const parametros = {};
      bloco.querySelectorAll(".tab-pane input[name]").forEach(input => {
        const nome = input.name;
        let valor = input.value?.trim();
        if (valor?.includes(",")) valor = valor.replace(",", ".");
        parametros[nome] = isNaN(valor) ? valor : parseFloat(valor);
      });

      const textareaInformacoes = bloco.querySelector(`textarea[name="informacoesProduto"]`);
      if (textareaInformacoes) parametros.informacoesProduto = textareaInformacoes.value?.trim() || "";

      const camposPopupExtras = {};
      bloco.querySelectorAll(".tab-pane .campo-resultado").forEach(el => {
        const nome = el.id?.replace("campo-", "") || "";
        const valor = el.textContent?.replace("R$", "").replace(",", ".").trim();
        camposPopupExtras[nome] = parseFloat(valor) || 0;
      });

      const dadosPopupSalvos = window.groupPopupsData?.[blocoId] || {};

      if (itens.length > 0) {
        grupos.push({
          nome: nomeGrupo,
          ambiente,
          itens,
          parametros,
          camposPopupExtras,
          dadosPopupSalvos
        });
      }
    });

    if (!grupos.length) {
      ocultarCarregando();
      mostrarPopupCustomizado("⚠️ Atenção", "Nenhum grupo ou item foi adicionado à proposta.", "warning");
      return { erro: "Nenhum produto informado." };
    }

    const numeroProposta = camposFormulario.numeroOrcamento || Date.now().toString();
    const numeroPedido = camposFormulario.numeroPedido ?? "";

    const propostaAtualizada = {
      tipoProposta: "editavel",
      numeroProposta,
      numeroPedido,
      camposFormulario,
      grupos
    };

    const resposta = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${idProposta}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(propostaAtualizada)
    });

    const resultado = await resposta.json();
    console.log("✅ Proposta atualizada com sucesso:", resultado);

    ocultarCarregando();
    mostrarPopupCustomizado("✅ Sucesso", "Proposta atualizada com sucesso!", "success");

    setTimeout(() => {
      criarBotaoUltimaAtualizacao(new Date());
    }, 2000);

    if (typeof sincronizarPDVparaKommo === "function") {
      sincronizarPDVparaKommo({ skipNumeroPedido: true }).catch(e => console.warn("[SYNC] Kommo (background):", e?.message || e));
    }

    return resultado;
  } catch (erro) {
    console.error("❌ Erro ao atualizar proposta:", erro);
    ocultarCarregando();
    mostrarPopupCustomizado("❌ Erro", "Erro ao atualizar proposta. Verifique o console.", "error");
    return { erro: erro.message };
  }
};



async function atualizarPropostaModelo() {
  try {
   // abrirTodasSanfonas();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const idProposta = "68746e305b9691a7ed3b3f97";
    if (!idProposta) {
      alert("❌ ID da proposta não encontrado.");
      return { erro: "ID da proposta não encontrado." };
    }

    // 👥 Clientes
    const clientes = Array.from(document.querySelectorAll(".cliente-item")).map(el => ({
      nome_razao_social: el.querySelector(".razaoSocial")?.value || "",
      nome_contato: el.querySelector(".nomeContato")?.value || "",
      codigoOmie: el.querySelector(".codigoCliente")?.value || "",
      cpfCnpj: el.querySelector(".cpfCnpj")?.value || "",
      funcao: el.querySelector(".funcaoCliente")?.value || "",
      telefone: el.querySelector(".telefoneCliente")?.value || ""
    }));

    // 💳 Condição e parcelas
    const condicaoPagamento = document.getElementById("condicaoPagamento")?.value || "";
    let parcelas = [];

    if (condicaoPagamento === "parcelado") {
      const linhas = document.querySelectorAll("#listaParcelas .row");
      parcelas = Array.from(linhas).map(row => {
        const data = row.querySelector(".data-parcela")?.value || "";
        const valor = row.querySelector(".valor-parcela")?.value || "";
        const tipo = row.querySelector(".tipo-monetario")?.value || "";
        const tipoParcela = row.querySelector(".tipo-item-parcela")?.value || "";
        const condSelect = row.querySelector("select.condicao-pagto");
        const condInput = row.querySelector("input.condicao-pagto");
        const condicao = condSelect?.value || condInput?.value || "";
        return { data, valor, tipo, tipoParcela, condicao };
      });
    }

   const desconto = document.querySelector("#campoDescontoFinal")?.value || "";
console.log("🔍 Desconto informado:", desconto);

const camposFormulario = {
  numeroOrcamento: document.getElementById("numeroOrcamento")?.value || "",
  dataOrcamento: document.getElementById("dataOrcamento")?.value || "",
  origemCliente: document.getElementById("origemCliente")?.value || "",
  clientes,
  cep: document.getElementById("cep")?.value || "",
  rua: document.getElementById("rua")?.value || "",
  numero: document.getElementById("numero")?.value || "",
  complemento: document.getElementById("complemento")?.value || "",
  bairro: document.getElementById("bairro")?.value || "",
  cidade: document.getElementById("cidade")?.value || "",
  estado: document.getElementById("estado")?.value || "",
  vendedorResponsavel: document.getElementById("vendedorResponsavel")?.value || "",
  operadorInterno: document.getElementById("operadorInterno")?.value || "",
  prazosArea: document.getElementById("prazosArea")?.value || "",
  condicaoPagamento,
  condicoesGerais: document.getElementById("condicoesGerais")?.value || "",
  desconto,
  parcelas,
};

    // 🔄 Grupos e produtos
    const grupos = [];
    document.querySelectorAll(".main-container").forEach(bloco => {
      const blocoId = bloco.id;
      const nomeGrupo = bloco.querySelector(`span[id^='titulo-accordion-']`)?.textContent?.trim() || blocoId;
      const ambiente = bloco.querySelector(`input[data-id-grupo="${blocoId}"]`)?.value?.trim() || "";

      const tabela = bloco.querySelector(`#tabela-${blocoId}`);
      if (!tabela) {
        console.warn(`⚠️ Tabela não encontrada no bloco ${blocoId}`);
        return;
      }

      const itens = [];
      tabela.querySelectorAll("tbody tr:not(.extra-summary-row)").forEach(tr => {
        const nome_produto = tr.querySelector("td:nth-child(2)")?.textContent?.trim() || "";
        const custoStr = tr.querySelector("td:nth-child(3)")?.textContent?.replace("R$", "").replace(/\s/g, "") || "0";
        const precoStr = tr.querySelector("td:nth-child(4)")?.textContent?.replace("R$", "").replace(/\s/g, "") || "0";
        const custo = parseFloat(custoStr.replace(",", ".")) || 0;
        const preco = parseFloat(precoStr.replace(",", ".")) || 0;
        const codigo_omie = tr.querySelector("td:nth-child(5)")?.textContent?.trim() || "";
        const unidade = tr.querySelector(".unidade-medida")?.textContent?.trim() || "";
        const quantidade = tr.querySelector("input.quantidade")?.value || "";
        const inputQtdDesejada = tr.querySelector("input.quantidade-desejada");
        const quantidade_desejada = inputQtdDesejada?.value || "";
        const formula_quantidade = inputQtdDesejada?.dataset.formula || "";
        const formula_custo = tr.querySelector("td:nth-child(3)")?.dataset.formula || "";
        const formula_preco = tr.querySelector("td:nth-child(4)")?.dataset.formula || "";

        itens.push({
          nome_produto,
          custo,
          preco,
          codigo_omie,
          unidade,
          quantidade,
          quantidade_desejada,
          formula_quantidade,
          formula_custo,
          formula_preco
        });
      });

      // 📐 Parâmetros do grupo
      const parametros = {};
      bloco.querySelectorAll(".tab-pane input[name]").forEach(input => {
        const nome = input.name;
        let valor = input.value?.trim();
        if (valor?.includes(",")) valor = valor.replace(",", ".");
        parametros[nome] = isNaN(valor) ? valor : parseFloat(valor);
      });

      const textareaInformacoes = bloco.querySelector(`textarea[name="informacoesProduto"]`);
      if (textareaInformacoes) parametros.informacoesProduto = textareaInformacoes.value?.trim() || "";

      // 🧮 Campos extras do popup (ex: #custoTotalMaterial, #precoMinimo)
      const camposPopupExtras = {};
      bloco.querySelectorAll(".tab-pane .campo-resultado").forEach(el => {
        const nome = el.id?.replace("campo-", "") || "";
        const valor = el.textContent?.replace("R$", "").replace(",", ".").trim();
        camposPopupExtras[nome] = parseFloat(valor) || 0;
      });

      // 💾 Dados salvos do popup (groupPopupsData)
      const dadosPopupSalvos = window.groupPopupsData?.[blocoId] || {};

      if (itens.length > 0) {
        grupos.push({
          nome: nomeGrupo,
          ambiente,
          itens,
          parametros,
          camposPopupExtras,
          dadosPopupSalvos
        });
      }
    });

    if (!grupos.length) {
      console.warn("⚠️ Nenhum grupo ou item para atualizar.");
      return { erro: "Nenhum produto informado." };
    }

    // 🧾 Proposta final
    const numeroProposta = camposFormulario.numeroOrcamento || Date.now().toString();
    const propostaAtualizada = {
      tipoProposta: "editavel",
      numeroProposta,
      camposFormulario,
      grupos
    };

    console.log("📦 Proposta que será enviada:", propostaAtualizada);
console.log("🔍 Desconto informado:", propostaAtualizada.camposFormulario.desconto);

    // 🚀 Envia para o backend com PUT
    const resposta = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${idProposta}`, {
      method: "PUT",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propostaAtualizada)
    });

    const resultado = await resposta.json();
    console.log("✅ Proposta atualizada com sucesso:", resultado);
    mostrarPopupCustomizado("✅ Sucesso", "Proposta atualizada com sucesso!", "success");

    if (typeof sincronizarPDVparaKommo === "function") {
      sincronizarPDVparaKommo({ skipNumeroPedido: true }).catch(e => console.warn("[SYNC] Kommo (background):", e?.message || e));
    }

    return resultado;

  } catch (erro) {
    console.error("❌ Erro ao atualizar proposta:", erro);
    alert("Erro ao atualizar proposta. Verifique o console.");
    return { erro: erro.message };
  }
}

// 3️⃣ Pedido Finalizado
async function marcarPedidoFinalizado() {
  mostrarCarregando();
  await atualizarStatus("Pedido Finalizado");
  ocultarCarregando();
}



function getIdDaURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// 1️⃣ Orçamento Iniciado
async function marcarOrcamentoIniciado() {
  mostrarCarregando()
  await atualizarStatus("Orçamento Iniciado");
  ocultarCarregando() 
}

// 2️⃣ Pendente de aprovação
async function marcarPendenteAprovacao() {
  mostrarCarregando();
  await atualizarStatus("Pendente de aprovação", { recarregarAoFinal: true });

  const idProposta = new URLSearchParams(window.location.search).get("id");
  if (idProposta) {
    try {
      await fetch(
        `https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/solicitar-aprovacao`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      console.warn("[solicitar-aprovacao] Kommo não atualizado:", e);
    }
  }

  ocultarCarregando();
}

// 3️⃣ Aprovado Pelo Gestor
async function marcarAprovadoPeloGestor() {
  const tipoUsuario = localStorage.getItem("usuarioTipo") || "usuario";
  if (tipoUsuario !== "admin") {
    alert("❌ Apenas administradores podem aprovar propostas.");
    return;
  }
  mostrarCarregando();
  await atualizarStatus("Aprovado Pelo Gestor", { recarregarAoFinal: true });

  const idProposta = new URLSearchParams(window.location.search).get("id");
  if (idProposta) {
    try {
      await fetch(
        `https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/aprovar-gestor`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
    } catch (e) {
      console.warn("[aprovar-gestor] Kommo não atualizado:", e);
    }
  }

  ocultarCarregando();
}

// 4️⃣ Enviado Para o Cliente
async function marcarEnviadoParaCliente() {
  // Valida ANTES do spinner para que o popup não fique atrás do overlay
  if (typeof validarOmieAtualizado === "function" && !await validarOmieAtualizado()) return;
  if (typeof validarValorMinimoPermitido === "function") {
    if (!await validarValorMinimoPermitido()) return;
  }
  mostrarCarregando();
  await atualizarStatus("Enviado Para o Cliente");
  ocultarCarregando();
  // Gera PDF sem validar valor mínimo novamente (já foi validado acima)
  if (typeof gerarPDFComPdfmake === "function") {
    gerarPDFComPdfmake(false, {}, { skipValorMinimo: true });
  }
}


// 5️⃣ Orçamento Aprovado pelo Cliente
async function marcarAprovadoPeloCliente() {
  mostrarCarregando();
  await atualizarStatus("Orçamento Aprovado pelo Cliente");
  const idProposta = new URLSearchParams(window.location.search).get("id");
  if (idProposta) {
    try {
      await fetch(`https://kommo-server-9f1243cbe450.herokuapp.com/proposta/${idProposta}/aprovado-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.warn('[APROVADO-CLIENTE] Erro ao mover lead na Kommo:', e?.message || e);
    }
  }
  ocultarCarregando();
}

// 6️⃣ Pedido Enviado para a Omie
async function marcarPedidoEnviadoParaOmie() {
  if (!parcelasValidas()) return;
  if (!parcelasCompletasParaOmie()) return;
  mostrarCarregando()
  await atualizarStatus("Pedido Enviado para a Omie");
  ocultarCarregando()
}


// 🔁 Função base reutilizável
async function atualizarStatus(novoStatus, { recarregarAoFinal = false } = {}) {
  try {
    const id = getIdDaURL();
    if (!id) {
      alert("❌ ID da proposta não encontrado na URL.");
      return;
    }

    const resposta = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ statusOrcamento: novoStatus })
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    const resultado = await resposta.json();
    console.log(`✅ Status atualizado para "${novoStatus}":`, resultado);

    const onClose = recarregarAoFinal ? () => location.reload() : null;
    mostrarPopupCustomizado("✅ Sucesso", `Status atualizado para "${novoStatus}".`, "success", onClose);
    if (recarregarAoFinal) setTimeout(() => location.reload(), 1800);
    return resultado;

  } catch (erro) {
    console.error("❌ Erro ao atualizar status:", erro);
    alert("Erro ao atualizar status da proposta. Verifique o console.");
    return { erro: erro.message };
  }
}


function mostrarPopupCustomizado(titulo, mensagem, tipo = "info", onClose = null) {
  if (typeof ocultarCarregando === "function") ocultarCarregando();
  const popupExistente = document.getElementById("popup-status-omie");
  if (popupExistente) popupExistente.remove();

  const overlay = document.createElement("div");
  overlay.id = "popup-status-omie";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;

  const box = document.createElement("div");
  box.style.backgroundColor = "#fff";
  box.style.borderRadius = "8px";
  box.style.padding = "24px";
  box.style.boxShadow = "0 0 15px rgba(0, 0, 0, 0.2)";
  box.style.maxWidth = "500px";
  box.style.width = "90%";
  box.style.textAlign = "center";
  box.style.fontFamily = "Arial, sans-serif";

  const tituloEl = document.createElement("h2");
  tituloEl.textContent = titulo;
  tituloEl.style.color = tipo === "success" ? "green" : tipo === "error" ? "red" : "#333";
  tituloEl.style.marginBottom = "12px";

  const mensagemEl = document.createElement("p");
  mensagemEl.textContent = mensagem;
  mensagemEl.style.marginBottom = "20px";

  const botao = document.createElement("button");
  botao.textContent = "Fechar";
  botao.style.padding = "8px 20px";
  botao.style.border = "none";
  botao.style.backgroundColor = "#007BFF";
  botao.style.color = "#fff";
  botao.style.borderRadius = "4px";
  botao.style.cursor = "pointer";
  botao.addEventListener("click", () => { overlay.remove(); if (typeof onClose === "function") onClose(); });

  box.appendChild(tituloEl);
  box.appendChild(mensagemEl);
  box.appendChild(botao);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}




async function marcarPrecosDivergentesOmie() {
  const ENDPOINT = "https://ulhoa-0a02024d350a.herokuapp.com/produtos/visualizar";
  const LOGIN_URL = "https://ulhoa-0a02024d350a.herokuapp.com/api/auth/login";

  const toNumber = (v) => {
    if (v === undefined || v === null) return 0;
    let s = String(v).replace(/\s+/g, "").replace("R$", "");
    const hasDot = s.includes(".");
    const hasComma = s.includes(",");
    if (hasDot && hasComma) s = s.replace(/\./g, "").replace(",", ".");
    else if (!hasDot && hasComma) s = s.replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const mostrarPopupGestor = () => {
    return new Promise((resolve) => {
      const fundo = document.createElement("div");
      fundo.style.position = "fixed";
      fundo.style.top = "0";
      fundo.style.left = "0";
      fundo.style.width = "100vw";
      fundo.style.height = "100vh";
      fundo.style.backgroundColor = "rgba(0,0,0,0.5)";
      fundo.style.zIndex = "10000";
      fundo.style.display = "flex";
      fundo.style.alignItems = "center";
      fundo.style.justifyContent = "center";

      const popup = document.createElement("div");
      popup.style.background = "white";
      popup.style.padding = "20px";
      popup.style.borderRadius = "8px";
      popup.style.width = "300px";
      popup.innerHTML = `
        <h5>⚠️ Orçamento antigo</h5>
        <p>Digite e-mail e senha do gestor:</p>
        <input id="email-gestor" type="email" placeholder="E-mail" class="form-control mb-2">
        <input id="senha-gestor" type="password" placeholder="Senha" class="form-control mb-3">
        <div class="d-flex justify-content-end">
          <button id="verificar-credenciais" class="btn btn-primary btn-sm">Verificar</button>
        </div>
      `;

      fundo.appendChild(popup);
      document.body.appendChild(fundo);

      document.getElementById("verificar-credenciais").onclick = async () => {
        const email = document.getElementById("email-gestor").value;
        const senha = document.getElementById("senha-gestor").value;
        try {
          const res = await fetch(LOGIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha }),
          });
          if (!res.ok) throw new Error("Credenciais inválidas");
          const data = await res.json();

          // Limpa e insere os botões de decisão após autenticação
          popup.innerHTML = `
            <h5>✅ Acesso autorizado</h5>
            <p>Deseja atualizar os valores ou manter os atuais?</p>
            <div class="d-flex justify-content-end gap-2">
              <button id="cancelar-popup" class="btn btn-secondary btn-sm">Manter valores</button>
              <button id="confirmar-popup" class="btn btn-primary btn-sm">Atualizar valores</button>
            </div>
          `;

          document.getElementById("cancelar-popup").onclick = () => {
            fundo.remove();
            resolve(false);
          };

          document.getElementById("confirmar-popup").onclick = () => {
            fundo.remove();
            resolve(true);
          };
        } catch (err) {
          alert("❌ Falha na autenticação do gestor: " + err.message);
        }
      };
    });
  };

  try {
    let exigirAutorizacao = false;
    let podeAtualizarValores = false;

    const inputData = document.querySelector("#dataOrcamento");
    if (inputData && inputData.value) {
      const dataOrc = new Date(inputData.value);
      const hoje = new Date();
      const diffDias = Math.floor((hoje - dataOrc) / (1000 * 60 * 60 * 24));
      if (diffDias > 10) exigirAutorizacao = true;
    }

    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const listaAPI = await res.json();

    const lookup = {};
    listaAPI.forEach((p) => {
      const codigo = String(p.codigo_produto || p.codigo || "").trim();
      const preco = p.preco_unitario ?? p.valor_unitario ?? p.preco ?? p.price ?? 0;
      if (codigo) lookup[codigo] = toNumber(preco);
    });

    document.querySelectorAll(".accordion-collapse").forEach(div => div.classList.add("show"));

    let linhasDivergentes = [];

    document.querySelectorAll("table[id^='tabela-'] tbody tr").forEach((tr) => {
      const codigoCell = tr.querySelector("td:nth-child(5)");
      const custoTd = tr.querySelector("td:nth-child(3)");
      const unitarioTd = tr.querySelector("td:nth-child(4)");
      const inputQtd = tr.querySelector("input.quantidade");

      if (!codigoCell || !unitarioTd || !custoTd || !inputQtd) return;

      const codigo = String(codigoCell.textContent || "").trim();
      const precoAPI = lookup[codigo];
      if (!precoAPI) return;

      const precoAtual = toNumber(unitarioTd?.textContent);
      if (Math.abs(precoAtual - precoAPI) > 0.009) {
        linhasDivergentes.push({ tr, precoAPI, precoAtual, codigo, inputQtd, custoTd, unitarioTd });
      }
    });

    if (linhasDivergentes.length === 0) {
     mostrarPopupCustomizado("✅ Preços Atualizados", "Todos os preços estão atualizados com sucesso.", "success");

      return;
    }

    if (exigirAutorizacao) {
      const tokenOuFalse = await mostrarPopupGestor();
      podeAtualizarValores = !!tokenOuFalse;
    } else {
      podeAtualizarValores = false;
      mostrarPopupCustomizado("⚠️ Preços Divergentes", "Há preços divergentes. As linhas afetadas foram destacadas para revisão.", "warning");

    }

    linhasDivergentes.forEach(({ tr, precoAPI, precoAtual, inputQtd, custoTd, unitarioTd, codigo }) => {
      const qtd = parseFloat(inputQtd.value || "1");

      if (podeAtualizarValores) {
        unitarioTd.textContent = `R$ ${precoAPI.toFixed(2)}`;
        const novoCustoFinal = precoAPI * qtd;
        custoTd.textContent = `R$ ${novoCustoFinal.toFixed(2)}`;
        tr.style.backgroundColor = "#e5ffe5";
        unitarioTd.style.color = "green";
        custoTd.style.color = "green";
        const prejuizo = precoAtual - precoAPI;
        console.log(`⚠️ Código ${codigo}: valor atualizado. Diferença de R$ ${prejuizo.toFixed(2)}`);
      } else {
        tr.style.backgroundColor = "#ffe5e5";
        unitarioTd.style.color = "red";
        custoTd.style.color = "red";
        console.log(`❌ Código ${codigo}: divergente. Mantido valor antigo R$ ${precoAtual.toFixed(2)} vs Omie R$ ${precoAPI.toFixed(2)}`);
      }
    });

    console.log("🔍 Verificação finalizada. Atualizações aplicadas conforme autorização.");
    ativarRecalculoEmTodasTabelas() 
    aguardarTabelasEExecutar(forcarEventosDescricao);
  } catch (err) {
    console.error("❌ Erro ao verificar preços:", err);
    alert("Erro ao verificar preços na Omie. Tente novamente mais tarde.");
  }
}

