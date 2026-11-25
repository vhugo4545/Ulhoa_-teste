// ── Folha de projeto ───────────────────────────────────────────────────────────
// Gera as folhas de impressão no padrão dos modelos "Com fixação", "Sem fixação" e "Vertical" (A4, moldura e carimbo
// com as medidas exatas, em pontos, tiradas dos PDFs dos modelos). Dentro de cada folha entra o projeto (imagem ou PDF).
// Botão: "Visualizar FOLHA DE PROJETO" em Folhas de impressão (editar.html). Tudo roda no navegador.
(function () {
  "use strict";

  const FONTE_CARIMBO = "Verdana, Geneva, sans-serif";
  const FONTE_ROTULO = "'Artifakt Element', Calibri, 'Segoe UI', Arial, sans-serif";
  const FONTE_PLANTA = "Calibri, 'Segoe UI', Arial, sans-serif";

  // Cada célula do carimbo: rótulo (x, y de cima, tamanho) e a caixa onde o valor é centralizado e quebrado em linhas
  const celula = (rotulo, rx, ry, caixa, tam) => ({ rotulo, rx, ry, caixa, tam });

  const MODELOS = {
    com: {
      nome: "Com fixação", paisagem: true, W: 841.89, H: 595.28,
      retangulos: [[28.3, 467.7, 813.4, 566.9], [28.3, 28.3, 813.4, 467.7]],
      linhas: [[307.6, 498.2, 630.9, 498.2], [307.7, 467.7, 307.7, 566.9], [442.1, 531.4, 442.1, 566.9],
               [630.9, 467.7, 630.9, 566.9], [725.4, 531.4, 725.4, 566.9], [307.7, 531.4, 813.4, 531.4]],
      logo: [43.5, 479.7, 298.7, 550.6],
      // cabeçalho da folha: item (nº do PDV) + nome, área, prazo do item e QR; o projeto ocupa o resto da moldura
      cab: { rot: [51.7, 43.2, 18], nomeFim: 725, area: [51.7, 72, 420, 90], prazo: [430, 72, 725, 90], qr: [737, 36, 801, 100] },
      area: [40, 104, 801, 430],
      cel: {
        cliente: celula("CLIENTE :", 309.7, 472, [309.7, 482, 629, 497.5], 10),
        endereco: celula("ENDEREÇO :", 309.6, 500.3, [309.6, 511, 629, 530.5], 10),
        fixacao: celula("TIPO DE FIXAÇÃO", 723.5, 471.9, [633, 482, 811.5, 530], 10),
        pedido: celula("PEDIDO Nº :", 309.7, 533.6, [309.7, 545, 440, 565.5], 10),
        desenho: celula("DESENHO :", 444.1, 533.5, [444.1, 545, 629, 565.5], 10),
        data: celula("DATA :", 632.9, 533.5, [632.9, 545, 723.5, 565.5], 10),
        folha: celula("FOLHA :", 727.4, 533.5, [727.4, 545, 811.5, 565.5], 10),
      },
      tamRotuloFixacao: 8,
      campos: ["item", "fixacao", "acabamento"],
    },
    sem: {
      nome: "Sem fixação", paisagem: true, W: 841.89, H: 595.28,
      retangulos: [[28.4, 497.9, 813.6, 567.3], [28.4, 28.2, 813.7, 497.8]],
      linhas: [[307.1, 498.4, 307.1, 567.1], [435.2, 531.4, 435.2, 566.9], [556.1, 498.4, 556.1, 531.6],
               [623.4, 531.8, 623.4, 567.3], [729.6, 531.4, 729.6, 566.9], [307.3, 531.4, 813.5, 531.4]],
      logo: [41.1, 504.5, 296.3, 559],
      cab: { rot: [35.1, 44.8, 18], nomeFim: 725, area: [35.1, 72, 420, 90], prazo: [430, 72, 725, 90], qr: [737, 36, 801, 100] },
      area: [40, 104, 801, 398],
      cel: {
        cliente: celula("CLIENTE :", 309.1, 502.1, [309.1, 511.5, 554, 530.5], 10),
        endereco: celula("ENDEREÇO :", 559.3, 501.3, [559.3, 513, 811.5, 530.5], 10),
        pedido: celula("PEDIDO Nº :", 308.3, 533.3, [308.3, 545, 433, 565.5], 10),
        desenho: celula("DESENHO :", 437.2, 533.5, [437.2, 545, 621, 565.5], 10),
        data: celula("DATA :", 625.4, 533.9, [625.4, 545, 727.5, 565.5], 10),
        folha: celula("FOLHA :", 731.6, 533.5, [731.6, 545, 811.5, 565.5], 10),
      },
      campos: ["itens", "acabamento"],
    },
    ver: {
      nome: "Vertical", paisagem: false, W: 595.28, H: 841.89,
      retangulos: [[28.3, 28.3, 566.9, 822]],
      linhas: [[28.3, 754, 567.1, 754], [254.9, 754, 254.9, 822.7], [254.9, 787.2, 566.9, 787.2], [377, 754, 377, 787.2],
               [341.8, 787.2, 341.8, 822.7], [440.1, 787, 440.1, 822.5], [502, 786.6, 502, 822]],
      logo: [33.7, 762.1, 240.9, 816.6],
      cab: { rot: [40, 40, 14], nomeFim: 480, area: [40, 66, 290, 84], prazo: [290, 66, 480, 84], qr: [490, 34, 555, 99] },
      area: [40, 106, 555, 745],
      cel: {
        cliente: celula("CLIENTE :", 256.9, 755.7, [256.9, 766, 375.5, 786.5], 8),
        endereco: celula("ENDEREÇO :", 379, 756.9, [379, 766, 565.5, 786.5], 8),
        pedido: celula("PEDIDO Nº :", 256.9, 790.4, [256.9, 799, 340.5, 821.5], 8),
        desenho: celula("DESENHO :", 343.8, 790.1, [343.8, 799, 438.6, 821.5], 8),
        data: celula("DATA :", 442.1, 789.9, [442.1, 799, 500.5, 821.5], 8),
        folha: celula("FOLHA :", 504, 789.4, [504, 799, 565.5, 821.5], 8),
      },
      campos: ["item"],
    },
  };

  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // ── Texto que sempre cabe: quebra em linhas e, se preciso, reduz a fonte (nunca corta no meio da célula) ──
  let _cv = null;
  const larguraPt = (texto, tamPt, fam) => {
    _cv = _cv || document.createElement("canvas");
    const ctx = _cv.getContext("2d");
    ctx.font = tamPt + "pt " + fam;
    return ctx.measureText(texto).width * 0.75;           // px → pt
  };

  // cortarPalavra=false: se uma palavra sozinha não cabe na linha, devolve null (quem chama reduz a fonte em vez de partir a palavra)
  function quebrar(texto, larg, tam, fam, cortarPalavra) {
    // quebra de linha pedida de propósito ("\n"): cada trecho é ajustado separado
    if (/\n/.test(String(texto))) {
      const partes = String(texto).split(/\n+/).map((p) => quebrar(p, larg, tam, fam, cortarPalavra));
      return partes.some((p) => p === null) ? null : [].concat(...partes);
    }
    const medir = (t) => larguraPt(t, tam, fam);
    const palavras = String(texto).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const linhas = [];
    let atual = "";
    for (let p of palavras) {
      const tent = atual ? atual + " " + p : p;
      if (medir(tent) <= larg) { atual = tent; continue; }
      if (atual) { linhas.push(atual); atual = ""; }
      if (!cortarPalavra && medir(p) > larg) return null;
      // palavra maior que a linha (só no último recurso): quebra por letras
      while (medir(p) > larg && p.length > 1) {
        let i = p.length - 1;
        while (i > 1 && medir(p.slice(0, i)) > larg) i--;
        linhas.push(p.slice(0, i));
        p = p.slice(i);
      }
      atual = p;
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  const ALTURA_LINHA = 1.16;
  function ajustar(texto, larg, alt, max, min, fam) {
    const margem = larg * 0.96;                              // folga: a impressão pode medir um pouco diferente
    // 1º tenta manter as palavras inteiras (reduzindo a fonte); 2º, se nada coube, aceita partir palavra comprida
    for (const cortar of [false, true]) {
      for (let t = max; t >= min - 1e-6; t -= 0.5) {
        const linhas = quebrar(texto, margem, t, fam, cortar);
        if (linhas && linhas.length * t * ALTURA_LINHA <= alt) return { linhas, tam: t };
      }
    }
    // não coube nem no menor tamanho: fica no menor e termina com "…" na última linha que couber
    let linhas = quebrar(texto, margem, min, fam, true);
    const max_l = Math.max(1, Math.floor(alt / (min * ALTURA_LINHA)));
    let cortado = false;
    if (linhas.length > max_l) {
      cortado = true;
      linhas = linhas.slice(0, max_l);
      let ult = linhas[max_l - 1];
      while (ult.length > 1 && larguraPt(ult + "…", min, fam) > margem) ult = ult.slice(0, -1);
      linhas[max_l - 1] = ult + "…";
    }
    return { linhas, tam: min, cortado };
  }

  // Quais campos vão sair cortados com "…" mesmo na menor fonte (para avisar antes de gerar)
  const NOMES = { cliente: "Cliente", endereco: "Endereço", pedido: "Pedido Nº", desenho: "Desenho", fixacao: "Tipo de fixação", acabamento: "Acabamento" };
  function camposCortados(m, valores) {
    const cortados = [];
    Object.entries(m.cel).forEach(([chave, c]) => {
      const v = valores[chave];
      if (!v) return;
      const [a, b, e, f] = c.caixa;
      if (ajustar(v, e - a, f - b, c.tam, c.tam <= 8 ? 5 : 6, FONTE_CARIMBO).cortado) cortados.push(NOMES[chave]);
    });
    if (valores.acabamento && m.campos.includes("acabamento")) {
      const larg = 801 - 51.7 - larguraPt("ACABAMENTO", 18, FONTE_ROTULO) - 10;
      if (ajustar(valores.acabamento, larg, 25, 12, 6, FONTE_CARIMBO).cortado) cortados.push(NOMES.acabamento);
    }
    return cortados;
  }

  // ── Uma folha em HTML (posições em pt, como no modelo) ──
  function htmlFolha(m, d, ult) {
    const W = m.W, H = m.H;
    let svg = "";
    m.retangulos.forEach(([a, b, c, e]) => { svg += `<rect x="${a}" y="${b}" width="${c - a}" height="${e - b}" fill="none" stroke="#000" stroke-width="0.5"/>`; });
    m.linhas.forEach(([a, b, c, e]) => { svg += `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}" stroke="#000" stroke-width="0.5"/>`; });

    let html = `<section class="pag${ult ? " ultima" : ""}" style="width:${(W - 0.09).toFixed(2)}pt;height:${(H - 0.09).toFixed(2)}pt">`;
    html += `<svg class="abs" style="left:0;top:0" width="${W}pt" height="${H}pt" viewBox="0 0 ${W} ${H}">${svg}</svg>`;

    // projeto dentro da moldura (cabe inteiro, centralizado)
    if (d.imagem) {
      const [a, b, c, e] = m.area;
      html += `<div class="abs proj" style="left:${a}pt;top:${b}pt;width:${c - a}pt;height:${e - b}pt"><img src="${d.imagem}" alt=""></div>`;
    }

    // logo
    const [lx, ly, lx1, ly1] = m.logo;
    html += `<img class="abs" src="${d.logo}" alt="" style="left:${lx}pt;top:${ly}pt;width:${(lx1 - lx).toFixed(1)}pt;height:${(ly1 - ly).toFixed(1)}pt">`;

    // rótulos grandes (item / itens / planta / acabamento) — o texto digitado vem logo depois
    const rotulo = (txt, x, y, tam, fam) => `<div class="abs rot" style="left:${x}pt;top:${y}pt;font:${tam}pt ${fam}">${esc(txt)}</div>`;
    const complemento = (rot, x, y, tam, fam, valor, xmax, ymax) => {
      if (!valor) return "";
      const x0 = x + larguraPt(rot, tam, fam) + 10;
      const caixa = [x0, y, xmax, ymax];
      const aj = ajustar(valor, caixa[2] - caixa[0], caixa[3] - caixa[1], 12, 6, FONTE_CARIMBO);
      return `<div class="abs val esq" style="left:${x0}pt;top:${y}pt;width:${xmax - x0}pt;height:${ymax - y}pt;font-size:${aj.tam}pt">${esc(aj.linhas.join("\n"))}</div>`;
    };
    // cabeçalho: ITEM nº (numeração do PDV) + nome do item, ÁREA, PRAZO DO ITEM e QR do item
    const h = m.cab;
    const rotItem = m === MODELOS.sem ? (d.itens || "ITENS") : (d.item || (m === MODELOS.com ? "ITEM 01" : ""));
    if (rotItem) {
      html += rotulo(rotItem, h.rot[0], h.rot[1], h.rot[2], FONTE_ROTULO);
      if (d.itemNome) {
        const x0 = h.rot[0] + larguraPt(rotItem, h.rot[2], FONTE_ROTULO) + 12, y0 = h.rot[1] - 2, y1 = h.rot[1] + h.rot[2] + 8;
        const aj = ajustar(d.itemNome, h.nomeFim - x0, y1 - y0, 12, 6, FONTE_CARIMBO);
        html += `<div class="abs val esq" style="left:${x0}pt;top:${y0}pt;width:${h.nomeFim - x0}pt;height:${y1 - y0}pt;font-size:${aj.tam}pt">${esc(aj.linhas.join("\n"))}</div>`;
      }
    }
    const linhaCab = (txt, [a, b, e, f]) => {
      const aj = ajustar(txt, e - a, f - b, 10, 6, FONTE_CARIMBO);
      return `<div class="abs val esq" style="left:${a}pt;top:${b}pt;width:${e - a}pt;height:${f - b}pt;font-size:${aj.tam}pt">${esc(aj.linhas.join("\n"))}</div>`;
    };
    if (d.area) html += linhaCab("ÁREA: " + d.area, h.area);
    if (d.prazo) html += linhaCab("PRAZO DO ITEM: " + d.prazo, h.prazo);
    if (d.qr) html += `<div class="abs" style="left:${h.qr[0]}pt;top:${h.qr[1]}pt;width:${h.qr[2] - h.qr[0]}pt;height:${h.qr[3] - h.qr[1]}pt">${d.qr}</div>`;

    if (m === MODELOS.com) {
      html += rotulo("ACABAMENTO", 51.7, 437.9, 18, FONTE_ROTULO);
      html += complemento("ACABAMENTO", 51.7, 437.9, 18, FONTE_ROTULO, d.acabamento, 801, 463);
    } else if (m === MODELOS.sem) {
      html += rotulo("PLANTA", 46.1, 408, 16, FONTE_PLANTA);
      html += rotulo("ACABAMENTO", 42.3, 468.9, 18, FONTE_ROTULO);
      html += complemento("ACABAMENTO", 42.3, 468.9, 18, FONTE_ROTULO, d.acabamento, 801, 495);
    }

    // carimbo: rótulos fixos + valores quebrados/ajustados dentro de cada célula
    Object.entries(m.cel).forEach(([chave, c]) => {
      const tamRot = chave === "fixacao" ? (m.tamRotuloFixacao || 8) : c.tam;
      html += `<div class="abs rotc" style="left:${c.rx}pt;top:${c.ry}pt;font-size:${tamRot}pt">${esc(c.rotulo)}</div>`;
      const valor = d[chave];
      if (!valor) return;
      const [a, b, e, f] = c.caixa;
      const aj = ajustar(valor, e - a, f - b, c.tam, c.tam <= 8 ? 5 : 6, FONTE_CARIMBO);   // células estreitas (vertical) descem até 5 pt antes de cortar
      html += `<div class="abs val" style="left:${a}pt;top:${b}pt;width:${e - a}pt;height:${f - b}pt;font-size:${aj.tam}pt">${esc(aj.linhas.join("\n"))}</div>`;
    });
    return html + "</section>";
  }

  // Documento completo (uma folha por item de "folhas"); abre a impressão ao carregar
  function montarHtml(modeloChave, folhas, logo, cabecalho, autoImprimir) {
    const m = MODELOS[modeloChave];
    const css = `
      @page { size: A4 ${m.paisagem ? "landscape" : "portrait"}; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .pag { position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
      .pag.ultima { page-break-after: auto; break-after: auto; }
      .abs { position: absolute; }
      .rot { color: #000; white-space: nowrap; line-height: 1; }
      .rotc { font-family: ${FONTE_CARIMBO}; color: #000; white-space: nowrap; line-height: 1; }
      .val { font-family: ${FONTE_CARIMBO}; color: #000; display: flex; align-items: center; justify-content: center;
             text-align: center; white-space: pre; line-height: ${ALTURA_LINHA}; overflow: hidden; }
      .val.esq { justify-content: flex-start; text-align: left; }
      .proj { display: flex; align-items: center; justify-content: center; }
      .proj img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
      @media screen { body { background: #e5e7eb; } .pag { margin: 12px auto; box-shadow: 0 2px 10px rgba(0,0,0,.25); } }
      @media print { .pag { margin: 0; box-shadow: none; } }`;
    const n = folhas.length;
    const corpo = folhas.map((f, i) => htmlFolha(m, Object.assign({}, cabecalho, f, {
      logo, folha: String(i + 1).padStart(2, "0") + "/" + String(n).padStart(2, "0"),
    }), i === n - 1)).join("");
    const script = autoImprimir
      ? `<script>window.addEventListener("load",function(){var im=[].slice.call(document.images);Promise.all(im.map(function(i){return i.complete?1:new Promise(function(r){i.onload=i.onerror=r;});})).then(function(){setTimeout(function(){window.print();},400);});});<\/script>`
      : "";
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de projeto - Pedido ${esc(cabecalho.pedido || "")}</title><style>${css}</style></head><body>${corpo}${script}</body></html>`;
  }

  // ── Dados do pedido que está aberto no editar.html ──
  const valorDe = (id) => (document.getElementById(id)?.value || "").trim();
  function dadosDoPedido() {
    const rua = valorDe("ruaObra") || valorDe("rua"), num = valorDe("numeroObra") || valorDe("numero");
    const bairro = valorDe("bairroObra") || valorDe("bairro"), cidade = valorDe("cidadeObra") || valorDe("cidade");
    const comp = valorDe("complementoObra") || valorDe("complemento"), uf = valorDe("estadoObra") || valorDe("estado");
    const endereco = [[rua, num].filter(Boolean).join(", "), comp, bairro, [cidade, uf].filter(Boolean).join("/")].filter(Boolean).join(" - ");
    const cliente = (document.querySelector("input.razaoSocial")?.value || document.querySelector("input.razaoSocial")?.dataset?.valorOriginal || "").trim();
    const hoje = new Date();
    const data = String(hoje.getDate()).padStart(2, "0") + "/" + String(hoje.getMonth() + 1).padStart(2, "0") + "/" + String(hoje.getFullYear()).slice(-2);
    return {
      cliente, endereco, pedido: valorDe("numeroPedido"), data,
      desenho: (localStorage.getItem("usuarioNome") || localStorage.getItem("nomeUsuario") || "").trim(),
    };
  }

  // ── Projeto: imagem direto; PDF vira imagem (leitor de PDF carregado só quando precisa) ──
  const lerComoDataUrl = (file) => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => erro(fr.error); fr.readAsDataURL(file); });
  async function carregarPdfJs() {
    if (window.pdfjsLib) return;
    await new Promise((ok, erro) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = ok; s.onerror = () => erro(new Error("Não consegui carregar o leitor de PDF. Confira a internet ou use uma imagem."));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  async function projetoParaImagem(file, pagina) {
    if (!file) return "";
    if (/^image\//.test(file.type)) return lerComoDataUrl(file);
    if (file.type !== "application/pdf") throw new Error(`"${file.name}" não é imagem nem PDF.`);
    await carregarPdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const n = Math.min(Math.max(1, parseInt(pagina, 10) || 1), pdf.numPages);
    const pg = await pdf.getPage(n);
    const v0 = pg.getViewport({ scale: 1 });
    const v = pg.getViewport({ scale: Math.min(3, 2400 / Math.max(v0.width, v0.height)) });
    const cv = document.createElement("canvas");
    cv.width = Math.round(v.width); cv.height = Math.round(v.height);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: ctx, viewport: v }).promise;
    return cv.toDataURL("image/jpeg", 0.92);
  }
  async function logoDataUrl() {
    try { if (typeof carregarLogoBase64 === "function") { const b = await carregarLogoBase64("../js/logo.jpg"); if (b) return b; } } catch (_) {}
    return new URL("../js/logo.jpg", window.location.href).href;
  }

  // ── Itens do pedido: a numeração é a do PDV (a mesma da OS e do apontamento: "pedido-item", ex.: 26203-3) ──
  // O QR aponta para o Sistema de Produção (?pedido=&item=). ATENÇÃO: a Produção ainda não abre o pedido/item por esse link.
  const URL_PRODUCAO = "https://app-producao-b843a894d7ea.herokuapp.com/";
  function itensDoPedido() {
    const base = typeof window.codigosApontamento === "function" ? window.codigosApontamento() : [];
    return base.map((c) => {
      const gid = c.grupoId;
      const area = (document.querySelector(`input[data-id-grupo='${gid}'][placeholder='Ambiente']`)?.value || document.getElementById("titulo-accordion-" + gid)?.textContent || "").trim();
      const prazo = (document.querySelector(`#${gid}-aba3 input[name="previsaoEntrega"]`)?.value || "").trim();
      return { item: c.item, nome: c.nome, area, prazo, codigo: c.codigo };
    });
  }
  const prazoTexto = (p) => (/^\d+$/.test(String(p || "")) ? p + " dias úteis" : String(p || ""));
  const dataBR = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : ""; };
  const hojeISO = () => { const h = new Date(); return h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") + "-" + String(h.getDate()).padStart(2, "0"); };
  async function qrSvg(texto) {
    try {
      if (!window.qrcode) await new Promise((ok, erro) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
      const q = window.qrcode(0, "M"); q.addData(texto); q.make();
      const n = q.getModuleCount(); let p = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c},${r}h1v1h-1z`;
      return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" width="100%" height="100%" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><path d="${p}" fill="#000"/></svg>`;
    } catch (_) { return ""; }       // sem internet para carregar a biblioteca do QR: a folha sai sem QR
  }

  // ── Janelas: 1) escolher o modelo  2) quantidade de folhas e dados de cada uma ──
  const ESTILO_BTN = "width:100%;border:none;color:#fff;padding:14px 16px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;";
  const ESTILO_IN = "width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:inherit;";

  function janela(largura) {
    document.getElementById("popup-folha-projeto")?.remove();
    const ov = document.createElement("div");
    ov.id = "popup-folha-projeto";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;z-index:99999;padding:16px;overflow-y:auto;";
    const box = document.createElement("div");
    box.style.cssText = `width:100%;max-width:${largura}px;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:20px;font-family:Inter,Arial,sans-serif;margin:auto 0;`;
    ov.appendChild(box);
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    return { ov, box, fechar: () => ov.remove() };
  }

  function cabecalhoJanela(titulo, fechar) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;">
      <h3 style="margin:0;font-size:18px;font-weight:700;color:#111827;">${esc(titulo)}</h3>
      <button type="button" data-fp="fechar" style="border:none;background:#e5e7eb;color:#111827;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px;font-weight:700;">×</button></div>`;
  }

  function abrirFolhaDeProjeto() {
    const j = janela(420);
    j.box.innerHTML = cabecalhoJanela("Folha de projeto: escolha o modelo", j.fechar) + `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button type="button" data-modelo="com" style="${ESTILO_BTN}background:#b45309;">Com fixação<br><span style="font-weight:400;font-size:12px;">A4 paisagem · item, acabamento e tipo de fixação</span></button>
        <button type="button" data-modelo="sem" style="${ESTILO_BTN}background:#92400e;">Sem fixação<br><span style="font-weight:400;font-size:12px;">A4 paisagem · itens, planta e acabamento</span></button>
        <button type="button" data-modelo="ver" style="${ESTILO_BTN}background:#78350f;">Vertical<br><span style="font-weight:400;font-size:12px;">A4 retrato · item, área e prazo no alto, carimbo no rodapé</span></button>
      </div>`;
    j.box.querySelector('[data-fp="fechar"]').onclick = j.fechar;
    j.box.querySelectorAll("[data-modelo]").forEach((b) => (b.onclick = () => formulario(j, b.dataset.modelo)));
  }

  function formulario(j, chave) {
    const m = MODELOS[chave];
    const d = dadosDoPedido();
    const faltando = [];
    if (!d.cliente) faltando.push("cliente");
    if (!d.pedido) faltando.push("número do pedido");
    if (!d.endereco) faltando.push("endereço da obra");
    if (!d.desenho) faltando.push("seu nome (DESENHO)");
    const longos = camposCortados(m, d);
    j.box.style.maxWidth = "640px";
    j.box.innerHTML = cabecalhoJanela("Folha de projeto · " + m.nome, j.fechar) + `
      <div style="font-size:12px;color:#374151;background:#f3f4f6;border-radius:10px;padding:10px 12px;margin-bottom:14px;line-height:1.5;">
        <b>Cliente:</b> ${esc(d.cliente) || "—"}<br><b>Endereço:</b> ${esc(d.endereco) || "—"}<br>
        <b>Pedido Nº:</b> ${esc(d.pedido) || "—"} · <b>Desenho:</b> ${esc(d.desenho) || "—"} · <b>Data:</b> ${esc(d.data)}
        ${faltando.length ? `<div style="color:#b45309;margin-top:4px;">Sem ${esc(faltando.join(", "))}: o campo sai em branco na folha.</div>` : ""}
        ${longos.length ? `<div style="color:#b91c1c;margin-top:4px;">Texto longo demais para a célula (${esc(longos.join(", "))}): vai sair cortado com “…”. Abrevie no pedido antes de gerar.</div>` : ""}
      </div>
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#111827;margin-bottom:12px;">Quantidade de folhas
        <input type="number" id="fp-qtd" min="1" max="30" value="1" style="${ESTILO_IN}width:80px;"></label>
      <div id="fp-folhas" style="display:flex;flex-direction:column;gap:12px;max-height:55vh;overflow-y:auto;padding-right:4px;"></div>
      <div id="fp-erro" style="color:#b91c1c;font-size:12px;margin-top:10px;display:none;"></div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button type="button" id="fp-voltar" style="flex:1;border:1px solid #d1d5db;background:#fff;color:#111827;padding:12px;border-radius:12px;cursor:pointer;font-weight:600;">Voltar</button>
        <button type="button" id="fp-gerar" style="flex:2;border:none;background:#b45309;color:#fff;padding:12px;border-radius:12px;cursor:pointer;font-weight:700;">Gerar folhas</button>
      </div>`;
    j.box.querySelector('[data-fp="fechar"]').onclick = j.fechar;
    j.box.querySelector("#fp-voltar").onclick = () => { j.box.style.maxWidth = "420px"; abrirFolhaDeProjeto(); };

    const lista = j.box.querySelector("#fp-folhas");
    const itens = itensDoPedido();
    const campo = (rot, id, ph, valor, tipo) => `<label style="display:block;font-size:11px;color:#4b5563;">${rot}<input type="${tipo || "text"}" data-c="${id}" placeholder="${esc(ph)}" value="${esc(valor || "")}" style="${ESTILO_IN}margin-top:3px;"></label>`;
    const opcoes = itens.map((it) => `<option value="${it.item}">${String(it.item).padStart(2, "0")} · ${esc(it.nome)}${it.area ? " (" + esc(it.area) + ")" : ""}</option>`).join("");
    // escolher o item do pedido preenche item, nome, área e prazo (continuam editáveis)
    const preencher = (div, it, folhaNum) => {
      const set = (c, v) => { const el = div.querySelector(`[data-c="${c}"]`); if (el) el.value = v || ""; };
      const nn = it ? String(it.item).padStart(2, "0") : "";
      set("item", it ? "ITEM " + nn : (m === MODELOS.com ? "ITEM " + String(folhaNum).padStart(2, "0") : ""));
      set("itens", it ? "ITENS " + nn : "ITENS");
      set("itemNome", it ? it.nome : "");
      set("area", it ? it.area : "");
      set("prazo", it ? prazoTexto(it.prazo) : "");
    };
    const desenharLinhas = () => {
      const n = Math.min(30, Math.max(1, parseInt(j.box.querySelector("#fp-qtd").value, 10) || 1));
      const atuais = Array.from(lista.children);
      while (lista.children.length > n) lista.lastElementChild.remove();
      for (let i = lista.children.length; i < n; i++) {
        const div = document.createElement("div");
        div.style.cssText = "border:1px solid #e5e7eb;border-radius:12px;padding:12px;";
        const ant = atuais.length ? atuais[atuais.length - 1] : null;
        const herda = (c) => (ant?.querySelector(`[data-c="${c}"]`)?.value || "");
        const dois = "display:grid;grid-template-columns:1fr 1fr;gap:8px;";
        div.innerHTML = `<div style="font-size:12px;font-weight:700;color:#111827;margin-bottom:8px;">Folha ${String(i + 1).padStart(2, "0")}</div>
          <div style="display:grid;grid-template-columns:1fr 90px;gap:8px;align-items:end;margin-bottom:8px;">
            <label style="display:block;font-size:11px;color:#4b5563;">Projeto (imagem ou PDF)<input type="file" data-c="arquivo" accept="image/*,application/pdf" style="${ESTILO_IN}margin-top:3px;"></label>
            <label style="display:block;font-size:11px;color:#4b5563;">Página do PDF<input type="number" data-c="pagina" min="1" value="${i + 1}" style="${ESTILO_IN}margin-top:3px;"></label>
          </div>
          <label style="display:block;font-size:11px;color:#4b5563;margin-bottom:8px;">Item do pedido (numeração do PDV)
            <select data-c="itemSel" style="${ESTILO_IN}margin-top:3px;"><option value="">${itens.length ? "Sem vincular a um item" : "Nenhum item encontrado no pedido"}</option>${opcoes}</select></label>
          <div style="${dois}margin-bottom:8px;">
            ${m.campos.includes("itens") ? campo("Itens (texto no alto)", "itens", "ITENS") : campo("Item (texto no alto)", "item", "ITEM 01")}
            ${campo("Nome do item", "itemNome", "nome como no PDV")}
          </div>
          <div style="${dois}margin-bottom:8px;">
            ${campo("Área", "area", "área do pedido")}
            ${campo("Prazo do item", "prazo", "ex.: 15 dias úteis")}
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:8px;">
            ${m.campos.includes("fixacao") ? campo("Tipo de fixação", "fixacao", "ex.: chumbador químico", herda("fixacao")) : ""}
            ${m.campos.includes("acabamento") ? campo("Acabamento", "acabamento", "ex.: aço inox escovado", herda("acabamento")) : ""}
          </div>
          <div style="${dois}">
            ${campo("Revisão do desenho", "revisao", "ex.: 00", herda("revisao") || "00")}
            ${campo("Data do desenho", "dataDesenho", "", herda("dataDesenho") || hojeISO(), "date")}
          </div>`;
        lista.appendChild(div);
        const sel = div.querySelector('[data-c="itemSel"]');
        sel.onchange = () => preencher(div, itens.find((x) => String(x.item) === sel.value), i + 1);
        if (itens[i]) sel.value = String(itens[i].item);          // a folha n começa vinculada ao item n do pedido
        preencher(div, itens[i], i + 1);
      }
    };
    j.box.querySelector("#fp-qtd").addEventListener("input", desenharLinhas);
    desenharLinhas();

    j.box.querySelector("#fp-gerar").onclick = async () => {
      const erro = j.box.querySelector("#fp-erro");
      const btn = j.box.querySelector("#fp-gerar");
      erro.style.display = "none";
      // fixação/acabamento digitados longos demais para a célula: avisa antes (nada sai cortado sem você saber)
      const cortes = [];
      Array.from(lista.children).forEach((div, i) => {
        const val = (c) => (div.querySelector(`[data-c="${c}"]`)?.value || "").trim();
        const lc = camposCortados(m, { fixacao: val("fixacao"), acabamento: val("acabamento") });
        if (lc.length) cortes.push(`Folha ${String(i + 1).padStart(2, "0")}: ${lc.join(", ")}`);
      });
      if (cortes.length && !confirm("Estes textos são longos demais e vão sair cortados com “…”:\n\n" + cortes.join("\n") + "\n\nGerar assim mesmo?")) return;
      // a janela de impressão abre já (dentro do clique), senão o navegador bloqueia
      const w = window.open("", "_blank");
      if (!w) { erro.textContent = "O navegador bloqueou a janela. Libere pop-ups para este site e tente de novo."; erro.style.display = "block"; return; }
      w.document.write("<p style='font-family:Arial;padding:24px'>Gerando as folhas…</p>");
      btn.disabled = true; btn.textContent = "Gerando…";
      try {
        const folhas = [];
        for (const div of Array.from(lista.children)) {
          const val = (c) => (div.querySelector(`[data-c="${c}"]`)?.value || "").trim();
          const arq = div.querySelector('[data-c="arquivo"]').files[0];
          const itemNum = val("itemSel");
          const rev = val("revisao");
          // QR do item: abre o pedido (e o item) no Sistema de Produção
          const link = d.pedido ? URL_PRODUCAO + "?pedido=" + encodeURIComponent(d.pedido) + (itemNum ? "&item=" + itemNum : "") : "";
          folhas.push({
            imagem: await projetoParaImagem(arq, val("pagina")),
            item: val("item"), itens: val("itens"), itemNome: val("itemNome"), area: val("area"), prazo: val("prazo"),
            fixacao: val("fixacao"), acabamento: val("acabamento"),
            data: (dataBR(val("dataDesenho")) || d.data) + (rev ? (chave === "ver" ? "\nREV " : " · REV ") + rev : ""),   // vertical: célula estreita, revisão numa linha própria
            qr: link ? await qrSvg(link) : "",
          });
        }
        const html = montarHtml(chave, folhas, await logoDataUrl(), d, true);
        w.document.open(); w.document.write(html); w.document.close();
        j.fechar();
      } catch (e) {
        w.close();
        erro.textContent = e.message || "Não consegui gerar as folhas.";
        erro.style.display = "block";
        btn.disabled = false; btn.textContent = "Gerar folhas";
      }
    };
  }

  window.abrirFolhaDeProjeto = abrirFolhaDeProjeto;
  window.FolhaProjeto = { MODELOS, montarHtml, ajustar, quebrar, itensDoPedido, qrSvg, prazoTexto, URL_PRODUCAO };
})();
