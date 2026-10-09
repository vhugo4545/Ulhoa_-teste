// 📦 carregarProdutosModelo.js

const loadingOverlay = document.createElement("div");
loadingOverlay.id = "loadingOverlay";
loadingOverlay.style.position = "fixed";
loadingOverlay.style.top = 0;
loadingOverlay.style.left = 0;
loadingOverlay.style.width = "100%";
loadingOverlay.style.height = "100%";
loadingOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
loadingOverlay.style.zIndex = 9999;
loadingOverlay.style.display = "flex";
loadingOverlay.style.justifyContent = "center";
loadingOverlay.style.alignItems = "center";
loadingOverlay.innerHTML = `
  <div class="text-center">
    <div class="spinner-border text-primary mb-3" role="status"></div>
    <p class="text-primary fw-semibold">Carregando proposta modelo...</p>
  </div>`;
document.body.appendChild(loadingOverlay);

let grupos = [];
carregarPropostaModelo();

async function carregarPropostaModelo() {
  //68746e305b9691a7ed3b3f97
  const id = "68746e305b9691a7ed3b3f97"; // ID fixo da proposta
  const url = `https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${id}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro ao buscar proposta por ID");

    const proposta = await res.json();
    console.log(proposta)
    console.log("proposta")
    if (!proposta?.grupos) {
      console.warn("❌ Proposta com ID não encontrada ou sem grupos.");
      return;
    }

    grupos = proposta.grupos;
    requestIdleCallback(() => renderLista());
  } catch (err) {
    console.error("❌ Erro ao carregar proposta por ID:", err);
  } finally {
    loadingOverlay.remove();
  }
}

function formatarNome(nome) {
  if (!nome || typeof nome !== "string") return "";
  return nome
    .toLowerCase()
    .split(" ")
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
}


function renderLista(filtro = "") {

  const searchInput = document.getElementById("buscaProduto");
  const grupoList = document.getElementById("sugestoesProdutos");
  grupoList.innerHTML = "";
  const nomesUnicos = new Set();

  grupos
    .filter(grupo => grupo.nome?.toLowerCase().includes(filtro.toLowerCase()))
    .forEach(grupo => {
      if (!nomesUnicos.has(grupo.nome)) {
        nomesUnicos.add(grupo.nome);

        const li = document.createElement("li");
        const nomeFormatado = formatarNome(grupo.nome);
        li.textContent = nomeFormatado;
        li.className = "list-group-item list-group-item-action";
        li.style.cursor = "pointer";

        li.addEventListener("click", () => {
          const grupoSelecionado = grupos.find(g => g.nome === grupo.nome);
          if (!grupoSelecionado) return;

          searchInput.value = "";
          grupoList.style.display = "none";

          criarBlocoDeProposta(nomeFormatado);

          setTimeout(() => {
            const ultimoBloco = document.querySelector("#blocosProdutosContainer .main-container:last-child");
            if (!ultimoBloco) return;

            const parametros = grupoSelecionado.parametros || {};
            console.log("os paramentros",grupoSelecionado.itens[0].formula_custo)
            const inputs = ultimoBloco.querySelectorAll(`input[name]`);
            inputs.forEach(input => {
              const param = input.name;
              if (parametros[param] !== undefined) {
                input.value = parametros[param];
              }
            });

            const tabela = ultimoBloco.querySelector(`table tbody`);
            const totalTd = ultimoBloco.querySelector(`table tfoot td[colspan="7"], table tfoot td:last-child`);
            tabela.innerHTML = "";

            let total = 0;
           (grupoSelecionado.itens || []).forEach(item => {
  const quantidadeCalculada = calcularQuantidadeDesejada(item, { groupId: ultimoBloco.id });
  const quantidadeArredondada = Math.ceil(quantidadeCalculada || item.quantidade || 1);
  const custoUnitario = parseFloat(item.custo) || 0;

  // ✅ Agora usa a quantidade ARREDONDADA no cálculo
  const valorTotal = custoUnitario * quantidadeArredondada;

  const tr = document.createElement("tr");
  tr.dataset.idSuffix = ultimoBloco.id;

 const unidadeItem = item.unidade || (window._produtosUnidadeMap && window._produtosUnidadeMap[String(item.codigo_omie || "").trim()]) || "—";

 tr.innerHTML = `
 <td>
  <textarea class="form-control form-control-sm" rows="3">
${item.descricao_utilizacao|| "Utilização Barra de pesquisa"}
  </textarea>
</td>


  <td>${item.nome_produto || item.nome || ""}</td>
  <td class="custo-unitario">R$ ${valorTotal.toFixed(2)}</td>
  <td class="venda-unitaria">R$ ${custoUnitario.toFixed(2)}</td>
  <td>${item.codigo_omie || ""}</td>
  <td class="unidade-medida">${unidadeItem}</td>
  <td>
    <input type="number" class="form-control form-control-sm quantidade"
           value="${quantidadeArredondada}" min="1">
  </td>
  <td>
    <input type="text" class="form-control form-control-sm quantidade-desejada"
           value="${quantidadeCalculada}"
           data-formula="${item.formula_quantidade || ""}">
  </td>
  <td>
    <button class="btn btn-sm btn-danger d-block mb-1" onclick="this.closest('tr').remove()">Remover</button>
    <button class="btn btn-sm btn-secondary d-block" onclick="abrirSubstituirProduto(this)">Substituir</button>
  </td>`;


  // resumo 
  const resumoTextarea = ultimoBloco.querySelector(`textarea[id^="resumo-"]`);

if (resumoTextarea) {
  const texto = grupoSelecionado?.itens?.[0]?.formula_custo || "";
  resumoTextarea.value = texto;
  resumoTextarea.dataset.valorOriginal = texto; // opcional
}


  
  tabela.appendChild(tr);
  total += valorTotal;
});


            if (totalTd) {
              totalTd.innerHTML = `<strong>R$ ${total.toFixed(2)}</strong>`;
            }

            new Sortable(tabela, {
              animation: 100,
              handle: "td",
              ghostClass: "bg-warning-subtle"
            });

            inicializarCamposDeFormulaQuantidade(ultimoBloco, { groupId: ultimoBloco.id });

          }, 100);
        });

        grupoList.appendChild(li);
      }
    });

  grupoList.style.display = (filtro.trim() && grupoList.children.length > 0) ? "block" : "none";
}



document.addEventListener("DOMContentLoaded", () => {
  carregarMapaUnidades();

  const searchInput = document.getElementById("buscaProduto");
  const grupoList = document.getElementById("sugestoesProdutos");

  searchInput.addEventListener("input", () => renderLista(searchInput.value));

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#sugestoesProdutos") && e.target.id !== "buscaProduto") {
      grupoList.style.display = "none";
    }
  });

  new Sortable(document.getElementById("blocosProdutosContainer"), {
    animation: 200,
    handle: ".accordion-header",
    ghostClass: "bg-light"
  });
});

window.blocoIndex ??= 1;

// 💾 Cache global dos produtos da Omie
window._produtosOmieCache = null;

async function carregarMapaUnidades() {
  try {
    if (!window._produtosOmieCache) {
      const res = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/produtos/visualizar");
      if (!res.ok) return;
      window._produtosOmieCache = await res.json();
    }
    if (!window._produtosUnidadeMap) window._produtosUnidadeMap = {};
    window._produtosOmieCache.forEach((p) => {
      const codigo = String(p.codigo_produto || p.codigo || "").trim();
      if (codigo) window._produtosUnidadeMap[codigo] = p.unidade || "";
    });
  } catch (e) { /* silent */ }
}
window.carregarMapaUnidades = carregarMapaUnidades;

function _mostrarUltimaAtualizacaoOmie() {
  const btn = document.getElementById("btn-omie-preco-atualizacao");
  if (!btn) return;
  const ts = window.CFgAPI?.obter()?.ultimaAtualizacaoOmie;
  if (!ts) return;

  const tipoUsuario = localStorage.getItem("usuarioTipo") || "usuario";
  const isGestor = ["admin", "gestor"].includes(tipoUsuario);
  const aprovado = !!window.propostaAtual?.aprovadoPeloGestor;
  const cur = isGestor ? "pointer" : "default";

  btn.innerHTML =
    `<span>Atualização de valores Omie: ${new Date(ts).toLocaleString("pt-BR")}</span>` +
    `<span style="margin-left:10px;display:inline-flex;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.25);">` +
      `<span id="badge-nao-aprovado" data-val="false" style="padding:2px 9px;font:600 11px Inter,Arial;user-select:none;cursor:${cur};` +
        `background:${!aprovado ? "rgba(255,255,255,.25)" : "transparent"};` +
        `color:${!aprovado ? "#fff" : "rgba(255,255,255,.45)"};border-right:1px solid rgba(255,255,255,.2);">` +
        `${!aprovado ? "✓" : "○"} não aprovado</span>` +
      `<span id="badge-aprovado" data-val="true" style="padding:2px 9px;font:600 11px Inter,Arial;user-select:none;cursor:${cur};` +
        `background:${aprovado ? "rgba(255,255,255,.25)" : "transparent"};` +
        `color:${aprovado ? "#fff" : "rgba(255,255,255,.45)"};">` +
        `${aprovado ? "✓" : "○"} aprovado pelo gestor</span>` +
    `</span>`;

  btn.style.display = "";
  btn.style.pointerEvents = "auto";

  if (isGestor) {
    ["badge-nao-aprovado", "badge-aprovado"].forEach(badgeId => {
      document.getElementById(badgeId)?.addEventListener("click", async e => {
        e.stopPropagation();
        const novoValor = e.currentTarget.dataset.val === "true";
        if (novoValor === !!window.propostaAtual?.aprovadoPeloGestor) return;
        const label = novoValor ? "aprovado pelo gestor" : "não aprovado";
        if (!confirm(`Confirmar alteração para "${label}"?`)) return;
        await _salvarAprovadoGestor(novoValor);
      });
    });
  }
}
window.atualizarPillOmie = _mostrarUltimaAtualizacaoOmie;

async function validarOmieAtualizado() {
  const ts = window.CFgAPI?.obter()?.ultimaAtualizacaoOmie;
  if (!ts) return true; // sem registro de atualização, não bloqueia

  const aprovado = !!window.propostaAtual?.aprovadoPeloGestor;
  if (aprovado) return true; // gestor aprovou, libera

  try {
    const res = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/api/server-time");
    if (!res.ok) return true; // se backend falhar, não bloqueia
    const { now } = await res.json();
    const diasDesde = (new Date(now) - new Date(ts)) / (1000 * 60 * 60 * 24);
    if (diasDesde > 30) {
      alert(
        `⚠️ Os preços da Omie foram atualizados há ${Math.floor(diasDesde)} dias.\n\n` +
        `Propostas com preços desatualizados (mais de 30 dias) precisam ser aprovadas pelo gestor ou ter os preços atualizados antes de gerar o PDF.`
      );
      return false;
    }
  } catch (e) {
    return true; // erro de rede não bloqueia
  }
  return true;
}
window.validarOmieAtualizado = validarOmieAtualizado;

async function _salvarAprovadoGestor(novoValor) {
  const id = new URLSearchParams(window.location.search).get("id") || window.propostaAtual?._id;
  if (!id) { alert("ID da proposta não encontrado."); return; }
  try {
    const res = await fetch(
      `https://ulhoa-0a02024d350a.herokuapp.com/api/propostas/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovadoPeloGestor: novoValor })
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (window.propostaAtual) window.propostaAtual.aprovadoPeloGestor = novoValor;
    _mostrarUltimaAtualizacaoOmie();
  } catch (err) {
    console.error("Erro ao salvar aprovadoPeloGestor:", err);
    alert("Erro ao salvar. Tente novamente.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.CFgAPI?.obter()?.ultimaAtualizacaoOmie) {
    _mostrarUltimaAtualizacaoOmie();
  } else {
    document.addEventListener("cfgapi:pronto", _mostrarUltimaAtualizacaoOmie, { once: true });
    setTimeout(() => _mostrarUltimaAtualizacaoOmie(), 2000);
    setTimeout(() => _mostrarUltimaAtualizacaoOmie(), 5000);
  }
});

async function atualizarPrecosOmieNaDOM() {
  const ENDPOINT = "https://ulhoa-0a02024d350a.herokuapp.com/produtos/visualizar";

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

  try {
    // ⚡ Usa cache se já estiver carregado
    if (!window._produtosOmieCache) {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`Erro ao buscar produtos: ${res.status}`);
      const listaAPI = await res.json();
      window._produtosOmieCache = listaAPI;
    }

    const listaAPI = window._produtosOmieCache;

    // Monta dicionários por código: preço e unidade de medida
    const lookup = {};
    if (!window._produtosUnidadeMap) window._produtosUnidadeMap = {};
    listaAPI.forEach((p) => {
      const codigo = String(p.codigo_produto || p.codigo || "").trim();
      const preco = p.preco_unitario ?? p.valor_unitario ?? p.preco ?? p.price ?? 0;
      if (codigo) {
        lookup[codigo] = toNumber(preco);
        window._produtosUnidadeMap[codigo] = p.unidade || "";
      }
    });

    const linhasCorrigidas = [];

    document.querySelectorAll("table[id^='tabela-'] tbody tr").forEach((tr) => {
      const codigoCell = tr.querySelector("td:nth-child(5)");
      const custoTd = tr.querySelector("td:nth-child(3)");
      const unitarioTd = tr.querySelector("td:nth-child(4)");
      const inputQtd = tr.querySelector("td:nth-child(7) input");

      if (!codigoCell || !unitarioTd || !custoTd || !inputQtd) return;

      const codigo = String(codigoCell.textContent || "").trim();
      const precoAPI = lookup[codigo];
      if (!precoAPI) return;

      const precoAtual = toNumber(unitarioTd?.textContent);
      if (Math.abs(precoAtual - precoAPI) > 0.009) {
        const qtd = parseFloat(inputQtd?.value?.replace(",", ".") || "1") || 1;
        const novoCustoFinal = precoAPI * qtd;

        unitarioTd.textContent = `R$ ${precoAPI.toFixed(2)}`;
        custoTd.textContent = `R$ ${novoCustoFinal.toFixed(2)}`;

        tr.style.backgroundColor = "#e5ffe5";
        unitarioTd.style.color = "green";
        custoTd.style.color = "green";

        linhasCorrigidas.push(codigo);
      }
    });

    // ⏳ Aguarda DOM se estabilizar antes de reativar sanfonas
    setTimeout(() => {
      document.querySelectorAll(".accordion-collapse").forEach(el => {
        const instance = bootstrap.Collapse.getOrCreateInstance(el);
        if (!el.classList.contains("show")) {
          instance.hide();
        } else {
          instance.show();
        }
      });
    }, 500); // ⏱️ Ajuste o tempo se necessário

    // Preenche células de unidade que estão vazias ou "—" (propostas antigas sem o campo salvo)
    document.querySelectorAll("table[id^='tabela-'] tbody tr").forEach((tr) => {
      const codigoCell = tr.querySelector("td:nth-child(5)");
      const unidadeCell = tr.querySelector(".unidade-medida");
      if (!codigoCell || !unidadeCell) return;
      const codigo = String(codigoCell.textContent || "").trim();
      if (!codigo) return;
      const unidade = window._produtosUnidadeMap[codigo];
      if (unidade && (!unidadeCell.textContent.trim() || unidadeCell.textContent.trim() === "—")) {
        unidadeCell.textContent = unidade;
      }
    });

    // Recalcula totais
    if (typeof ativarRecalculoEmTodasTabelas === "function") {
      ativarRecalculoEmTodasTabelas();
    }

    const mensagem = `${linhasCorrigidas.length} produto(s) com preço atualizado com sucesso.`;

    if (!window.location.pathname.includes("criar.html")) {
      if (linhasCorrigidas.length > 0) {
        mostrarPopupCustomizado("✅ Preços Atualizados", mensagem, "success");
        
        mostrarPopupCustomizado("⚠️ Ajustes Realizados", "Os preços foram atualizados com a Omie. Por conta disso, os campos de desconto e parcelas foram resetados para garantir consistência nos valores.", "warning");
        ativarEventosDescricao()
      } else {
        alert("✔️ Todos os preços já estavam atualizados.");
      }
    }

    // Salva timestamp no servidor (MongoDB via CFgAPI)
    if (window.CFgAPI) {
      const cfgAtual = window.CFgAPI.obter() || {};
      cfgAtual.ultimaAtualizacaoOmie = new Date().toISOString();
      window.CFgAPI.salvar(cfgAtual).catch(() => {});
    }
    _mostrarUltimaAtualizacaoOmie();

  } catch (err) {
    console.error("❌ Erro ao atualizar preços:", err);
    if (!window.location.pathname.includes("criar.html")) {
      alert("Erro ao atualizar preços com a Omie.");
    }
  }
}

function ativarEventosDescricao() {
  setTimeout(() => {
    console.log("Campos Ajustados")
    const campos = document.querySelectorAll('input[name="descricao"]');

    campos.forEach(campo => {
      campo.dispatchEvent(new Event('focus',  { bubbles: true }));
      campo.dispatchEvent(new Event('input',  { bubbles: true }));
      campo.dispatchEvent(new Event('change', { bubbles: true }));
      campo.dispatchEvent(new Event('blur',   { bubbles: true }));
    });
  }, 2000); // 2 segundos de espera
}



function forcarEventosDescricao(input) {
  if (!input) return;

  const valorOriginal = input.value;
  
  // Foco
  input.focus();

  // Simula digitação (sem mudar valor)
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  
  // Foco perdido
  input.blur();

  // Força DOM reatividade (alguns sistemas precisam disso)
  input.value = valorOriginal + " ";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.value = valorOriginal;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
