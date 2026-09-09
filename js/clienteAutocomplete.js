// clienteAutocomplete.js

let listaCompletaClientes = [];

/**
 * Busca a lista de clientes apenas uma vez.
 */

async function carregarClientes() {
  if (listaCompletaClientes.length > 0) {
    return listaCompletaClientes.filter(cliente => cliente.inativo === "N");
  }

  try {
    const resposta = await fetch("https://ulhoa-0a02024d350a.herokuapp.com/clientes/visualizar");
    const dados = await resposta.json();
    if (!Array.isArray(dados)) throw new Error("Resposta inválida");

    listaCompletaClientes = dados;

    const ativos = dados.filter(cliente => cliente.inativo === "N");
    console.log(`✅ ${ativos.length} clientes ativos carregados.`);
    return ativos;
  } catch (error) {
    console.error("❌ Erro ao buscar clientes:", error);
    return [];
  }
}


/**
 * Aplica o autocomplete a um campo de cliente dentro do container fornecido.
 */
async function aplicarAutocompleteCliente(container) {
  const input = container.querySelector(".razaoSocial");
  const codigoInput = container.querySelector(".codigoCliente");
  const cpfInput = container.querySelector(".cpfCnpj");
  const telefoneInput = container.querySelector(".telefoneCliente");
  const emailInput = container.querySelector(".emailCliente");

  let sugestoes = container.querySelector(".sugestoesCliente");

  if (!input || !codigoInput) {
    console.warn("⚠️ Campos obrigatórios de autocomplete não encontrados.");
    return;
  }

  if (!sugestoes) {
    sugestoes = document.createElement("ul");
    sugestoes.className = "list-group sugestoesCliente position-absolute w-100 zindex-dropdown";
    sugestoes.style.display = "none";
    sugestoes.style.maxHeight = "200px";
    sugestoes.style.overflowY = "auto";
    input.parentElement.appendChild(sugestoes);
  }

  const resposta = await carregarClientes();

  const clientesAtivos = Array.isArray(resposta?.clientes_cadastro)
    ? resposta.clientes_cadastro
    : Array.isArray(resposta)
      ? resposta
      : [];

  if (clientesAtivos.length === 0) {
    fetch("https://ulhoa-0a02024d350a.herokuapp.com/clientes/atualizar", { method: "GET" }).catch(() => {});

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.45);
      display:flex; align-items:center; justify-content:center; z-index:99999;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      background:#fff; border-radius:16px; padding:36px 32px; max-width:420px; width:90%;
      box-shadow:0 20px 60px rgba(0,0,0,.25); font-family:'Poppins',sans-serif;
      text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px;
    `;

    const icone = document.createElement("div");
    icone.textContent = "🔄";
    icone.style.fontSize = "40px";

    const titulo = document.createElement("div");
    titulo.textContent = "Atualizando histórico de clientes";
    titulo.style.cssText = "font-size:16px; font-weight:700; color:#0f172a;";

    const mensagem = document.createElement("div");
    mensagem.textContent = "A atualização foi iniciada. Daqui a alguns minutos o histórico de clientes já estará disponível para busca.";
    mensagem.style.cssText = "font-size:13px; color:#64748b; line-height:1.6;";

    const btn = document.createElement("button");
    btn.textContent = "Entendi";
    btn.style.cssText = `
      margin-top:8px; padding:10px 28px; border:none; border-radius:8px;
      background:#0f172a; color:#fff; font-family:'Poppins',sans-serif;
      font-size:13px; font-weight:600; cursor:pointer;
    `;
    btn.onclick = () => document.body.removeChild(overlay);

    box.appendChild(icone);
    box.appendChild(titulo);
    box.appendChild(mensagem);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function mostrarSugestoes(termo) {
    const termoLower = termo.toLowerCase();

    const resultados = clientesAtivos.filter(c =>
      (c.nome_fantasia || "").toLowerCase().includes(termoLower) ||
      (c.razao_social || "").toLowerCase().includes(termoLower)
    );

    sugestoes.innerHTML = "";

    resultados.forEach(cliente => {
      const item = document.createElement("li");
      item.className = "list-group-item list-group-item-action";
      item.textContent = cliente.nome_fantasia || cliente.razao_social || "";
      item.dataset.nome = cliente.nome_fantasia || cliente.razao_social || "";
      item.dataset.codigo = cliente.codigo_cliente_omie || "";
      item.dataset.cpfcnpj = cliente.cnpj_cpf || "";
      item.dataset.telefone = cliente.telefone1_numero || "";
      item.dataset.email = cliente.email || "";

      item.addEventListener("click", () => {
        input.value = item.dataset.nome;
        codigoInput.value = item.dataset.codigo;
        if (cpfInput) cpfInput.value = item.dataset.cpfcnpj;
        if (telefoneInput) telefoneInput.value = item.dataset.telefone;
        if (emailInput) emailInput.value = item.dataset.email;
        sugestoes.style.display = "none";
        input.dispatchEvent(new Event("input"));
        console.log(`✅ Cliente selecionado: ${item.dataset.nome}`);
      });

      sugestoes.appendChild(item);
    });

    sugestoes.style.display = resultados.length ? "block" : "none";
  }

  input.addEventListener("input", () => {
    const termo = input.value.trim();
    if (!termo) {
      sugestoes.innerHTML = "";
      sugestoes.style.display = "none";
      return;
    }
    mostrarSugestoes(termo);
  });

  input.addEventListener("focus", () => {
    const termo = input.value.trim();
    if (termo.length >= 1) mostrarSugestoes(termo);
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      sugestoes.style.display = "none";
    }
  });

  // ── Busca por CPF/CNPJ ao sair do campo ──────────────────────────────────
  if (cpfInput) {
    cpfInput.addEventListener("blur", async () => {
      const raw = (cpfInput.value || "").replace(/\D/g, "");
      if (raw.length !== 11 && raw.length !== 14) return;

      // Se razão social já está preenchida, o cliente já foi selecionado — não sobrescrever
      if ((input.value || "").trim()) return;

      // Primeiro tenta no cache local (já carregado pelo autocomplete)
      let encontrado = clientesAtivos.find(c => (c.cnpj_cpf || "").replace(/\D/g, "") === raw);

      // Se não encontrou, consulta servidor
      if (!encontrado) {
        try {
          const resp = await fetch(`https://ulhoa-0a02024d350a.herokuapp.com/clientes/buscar?cnpj_cpf=${raw}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.encontrado && data.clientes?.length > 0) encontrado = data.clientes[0];
          }
        } catch { /* silencioso */ }
      }

      if (!encontrado) return;

      const nome = encontrado.razao_social || encontrado.nome_fantasia || "Cliente";

      const confirmou = await new Promise(resolve => {
        const ov = document.createElement("div");
        ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;";
        ov.innerHTML = `
          <div style="background:#fff;border-radius:14px;padding:28px;width:min(400px,92vw);box-shadow:0 16px 48px rgba(0,0,0,.25);">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">Cliente encontrado</div>
            <div style="font-size:13px;color:#64748b;margin-bottom:6px;">Este CPF/CNPJ pertence a:</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;background:#f1f5f9;border-radius:8px;padding:10px 14px;margin-bottom:20px;">${nome}</div>
            <div style="font-size:13px;color:#64748b;margin-bottom:24px;">Deseja incluir este cliente no orçamento?</div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button id="_cpf_nao" style="padding:9px 20px;border:1px solid #e2e8f0;border-radius:8px;background:#f1f5f9;font-family:inherit;font-size:13px;font-weight:600;color:#475569;cursor:pointer;">Não</button>
              <button id="_cpf_sim" style="padding:9px 20px;border:none;border-radius:8px;background:#475569;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Sim, incluir</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
        document.getElementById("_cpf_nao").onclick  = () => { document.body.removeChild(ov); resolve(false); };
        document.getElementById("_cpf_sim").onclick  = () => { document.body.removeChild(ov); resolve(true); };
      });

      if (!confirmou) return;

      // Preenche todos os campos do container
      input.value = encontrado.razao_social || encontrado.nome_fantasia || "";
      codigoInput.value = encontrado.codigo_cliente_omie || "";
      cpfInput.value = encontrado.cnpj_cpf || raw;
      if (telefoneInput) {
        const ddd = encontrado.telefone1_ddd || "";
        const tel = encontrado.telefone1_numero || "";
        telefoneInput.value = ddd ? `(${ddd}) ${tel}` : tel;
      }
      if (emailInput) emailInput.value = encontrado.email || "";

      input.dispatchEvent(new Event("input"));
      console.log("✅ Cliente preenchido via CPF/CNPJ:", nome);
    });
  }
}

/**
 * Adiciona um novo bloco de cliente relacionado ao formulário.
 */
function adicionarClienteRelacionado() {
  const wrapper = document.getElementById("clientesWrapper");
  if (!wrapper) {
    console.warn("⚠️ Wrapper de clientes não encontrado.");
    return;
  }

  const clienteBase = wrapper.querySelector(".cliente-item");
  if (!clienteBase) {
    console.warn("⚠️ Cliente base não encontrado para clonagem.");
    return;
  }

  // Clona o bloco .cliente-item completo
  const novo = clienteBase.cloneNode(true);

  // Limpa os valores dos campos de input
  novo.querySelectorAll("input").forEach(input => input.value = "");

  // Remove botão de incluir cliente (popup) se existir
  const botaoMais = novo.querySelector("button[onclick='abrirPopupIncluirCliente()']");
 

  // Remove sugestão de autocomplete duplicada, se houver
  const sugestoesAntigas = novo.querySelector(".sugestoesCliente");
  if (sugestoesAntigas) sugestoesAntigas.remove();

  // Recria a lista de sugestões vazia
  const novaLista = document.createElement("ul");
  novaLista.className = "sugestoesCliente list-group position-absolute w-100 shadow bg-white";
  novaLista.style.zIndex = "10";
  novaLista.style.maxHeight = "200px";
  novaLista.style.overflowY = "auto";
  novaLista.style.display = "none";

  // Reinsere a lista de sugestões abaixo do input de Razão Social
  const inputRazaoSocial = novo.querySelector(".razaoSocial");
  if (inputRazaoSocial) {
    inputRazaoSocial.insertAdjacentElement("afterend", novaLista);
  }

  // Reaplica autocomplete ao novo bloco
  aplicarAutocompleteCliente(novo);

  // Insere uma linha separadora visual
  wrapper.appendChild(document.createElement("hr"));

  // Adiciona o novo bloco ao wrapper
  wrapper.appendChild(novo);

  console.log("➕ Cliente relacionado adicionado.");
}

function abrirPopupExcluirClienteRelacionado() {
  const wrapper = document.getElementById("clientesWrapper");
  if (!wrapper) {
    console.warn("⚠️ Wrapper de clientes não encontrado.");
    return;
  }

  const itens = Array.from(wrapper.querySelectorAll(".cliente-item"));
  if (!itens.length) {
    alert("Nenhum cliente para excluir.");
    return;
  }

  // Injeta estilos do modal 1x (se você já tem vv-modal/vv-modal-backdrop, pode remover isso)
  if (!document.getElementById("vv-modal-style")) {
    const st = document.createElement("style");
    st.id = "vv-modal-style";
    st.textContent = `
      .vv-modal-backdrop{
        position:fixed; inset:0; background:rgba(0,0,0,.45);
        display:flex; align-items:center; justify-content:center; z-index:9999;
        padding:16px;
      }
      .vv-modal{
        width:min(720px, 100%); background:#fff; border-radius:14px;
        box-shadow:0 10px 30px rgba(0,0,0,.2); overflow:hidden;
      }
      .vv-modal header{ padding:14px 16px; border-bottom:1px solid #e5e7eb; }
      .vv-modal header h3{ margin:0; font-size:16px; }
      .vv-body{ padding:14px 16px; }
      .vv-footer{ padding:12px 16px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; }
      .vv-help{ color:#6b7280; font-size:12px; }
      .vv-list{ display:grid; gap:8px; max-height:320px; overflow:auto; margin-top:10px; }
      .vv-item{ border:1px solid #e5e7eb; border-radius:12px; padding:10px; display:flex; gap:10px; align-items:flex-start; }
      .vv-item strong{ font-size:13px; }
      .vv-btn{ border:1px solid #cbd5e1; background:#fff; padding:8px 12px; border-radius:10px; cursor:pointer; }
      .vv-btn.danger{ border-color:#ef4444; color:#ef4444; }
      .vv-btn.primary{ border-color:#2563eb; background:#2563eb; color:#fff; }
    `;
    document.head.appendChild(st);
  }

  // Helpers para ler "nome" do bloco
  function resumoDoCliente(el, idx) {
    const razao = el.querySelector(".razaoSocial")?.value?.trim()
      || el.querySelector('input[name="razao_social"]')?.value?.trim()
      || el.querySelector('input[name="nome_fantasia"]')?.value?.trim()
      || "";

    const doc = el.querySelector(".cnpjCpf")?.value?.trim()
      || el.querySelector('input[name="cnpj"]')?.value?.trim()
      || el.querySelector('input[name="cpf"]')?.value?.trim()
      || "";

    const titulo = razao || `Cliente ${idx + 1}`;
    const subt = doc ? `Documento: ${doc}` : "Sem documento";
    return { titulo, subt };
  }

  function removerComHr(el) {
    // remove <hr> "colado" ao bloco (preferência: o anterior; senão o próximo)
    const prev = el.previousElementSibling;
    const next = el.nextElementSibling;

    if (prev && prev.tagName === "HR") prev.remove();
    else if (next && next.tagName === "HR") next.remove();

    el.remove();
  }

  const bd = document.createElement("div");
  bd.className = "vv-modal-backdrop";

  const md = document.createElement("div");
  md.className = "vv-modal";

  const hd = document.createElement("header");
  hd.innerHTML = `<h3>Excluir cliente relacionado</h3>`;

  const by = document.createElement("div");
  by.className = "vv-body";

  const lista = itens.map((el, idx) => {
    const { titulo, subt } = resumoDoCliente(el, idx);
    return `
      <label class="vv-item">
        <input type="radio" name="vv-del-cli" value="${idx}" style="margin-top:2px;">
        <div>
          <strong>${titulo.replace(/</g,"&lt;")}</strong><br>
          <span class="vv-help">${subt.replace(/</g,"&lt;")}</span>
        </div>
      </label>
    `;
  }).join("");

  by.innerHTML = `
    <div class="vv-help">Selecione o cliente que deseja excluir e confirme.</div>
    <div class="vv-list">${lista}</div>
    <div class="vv-help" style="margin-top:10px;">
      Obs: se existir apenas 1 cliente, o sistema limpa os campos em vez de remover o bloco.
    </div>
  `;

  const ft = document.createElement("div");
  ft.className = "vv-footer";
  ft.innerHTML = `
    <button class="vv-btn" id="vv-del-cancel">Cancelar</button>
    <button class="vv-btn danger" id="vv-del-confirm">Excluir</button>
  `;

  md.appendChild(hd);
  md.appendChild(by);
  md.appendChild(ft);
  bd.appendChild(md);
  document.body.appendChild(bd);

  ft.querySelector("#vv-del-cancel").addEventListener("click", () => {
    document.body.removeChild(bd);
  });

  ft.querySelector("#vv-del-confirm").addEventListener("click", () => {
    const idx = Number(by.querySelector('input[name="vv-del-cli"]:checked')?.value);
    if (Number.isNaN(idx)) {
      alert("Selecione um cliente para excluir.");
      return;
    }

    const atuais = Array.from(wrapper.querySelectorAll(".cliente-item"));
    const alvo = atuais[idx];
    if (!alvo) {
      alert("Cliente não encontrado.");
      return;
    }

    if (atuais.length === 1) {
      // Se só tem 1, limpa ao invés de remover
      alvo.querySelectorAll("input").forEach(i => i.value = "");
      alvo.querySelectorAll("textarea").forEach(t => t.value = "");
      console.log("🧹 Único cliente: campos limpos.");
    } else {
      removerComHr(alvo);
      console.log("🗑️ Cliente removido.");
    }

    document.body.removeChild(bd);
  });
}


// Inicializa o autocomplete no cliente principal ao carregar a página
document.addEventListener("DOMContentLoaded", async () => {
  const primeiro = document.querySelector(".cliente-item");
  if (primeiro) {
    await aplicarAutocompleteCliente(primeiro);
    console.log("✅ Autocomplete de cliente inicial aplicado.");
  } else {
    console.warn("⚠️ Nenhum cliente inicial encontrado.");
  }
});
