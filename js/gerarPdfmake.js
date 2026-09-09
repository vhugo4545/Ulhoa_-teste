// gerarPdfmake.js — geração de PDF do orçamento via pdfmake

async function carregarPdfmake() {
  if (window.pdfMake) return;
  await new Promise((resolve, reject) => {
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.min.js';
      s2.onload = resolve;
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    s1.onerror = reject;
    document.head.appendChild(s1);
  });
}

async function gerarPDFComPdfmake(gruposOcultarProduto, totais = {}) {
  mostrarCarregando && mostrarCarregando();

  try { await carregarPdfmake(); }
  catch (e) {
    ocultarCarregando && ocultarCarregando();
    alert('Erro ao carregar biblioteca de PDF. Verifique a conexão.');
    return;
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const parseBRL = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/ /g, ' ').trim();
    if (s.includes(',')) return parseFloat(s.replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.')) || 0;
    return parseFloat(s.replace(/[^\d.-]/g,'')) || 0;
  };
  const fmtBRL = (n) => {
    const num = typeof n === 'number' ? n : parseBRL(n);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  const fmtData = (iso) => {
    if (!iso) return '-';
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return '-';
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  };
  const getValue       = (id) => document.getElementById(id)?.value?.trim() || '-';
  const getTextOrValue = (el) => {
    if (!el) return '';
    const v = (typeof el.value === 'string' ? el.value : '').trim();
    if (v) return v;
    return (typeof el.textContent === 'string' ? el.textContent : '').trim();
  };
  const normCond = (txt) => {
    const t = String(txt || '').trim();
    return /^selecione/i.test(t) ? '' : t;
  };

  // Remove/substitui caracteres fora do subset Roboto empacotado pelo pdfmake
  const sanitize = (txt) => {
    if (!txt) return '';
    return String(txt)
      // entidades HTML cruas
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      // box drawing Unicode (U+2500-U+257F) -> traco (1 pra 1, preserva comprimento visual)
      .replace(/[\u2500-\u257F]/g, '-')
      // non-breaking space
      .replace(/\u00A0/g, ' ')
      // en dash / em dash
      .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
      // aspas curvas
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
      // bullet, ponto medio, reticencias
      .replace(/\u2022/g, '-').replace(/\u00B7/g, '-').replace(/\u2026/g, '...')
      // caracteres de controle (exceto \n \r \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  };
  const dataHoje = (() => {
    const h = new Date();
    return `${String(h.getDate()).padStart(2,'0')}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`;
  })();

  // ── dados gerais ───────────────────────────────────────────────────────────
  const dados = {
    numero:          getValue('numeroOrcamento'),
    numeroPedido:    getValue('numeroPedido'),
    vendedor:        document.getElementById('vendedorResponsavel')?.selectedOptions[0]?.textContent?.trim() || '-',
    prazos:          sanitize(getValue('prazosArea')),
    condicao:        sanitize(document.getElementById('condicaoPagamento')?.selectedOptions[0]?.textContent?.trim() || '-'),
    condicoesGerais: sanitize(getValue('condicoesGerais')),
    enderecoObra:    sanitize(`${getValue('rua')}, ${getValue('numero')} - ${getValue('bairro')} - ${getValue('complemento')} - ${getValue('cidade')}/${getValue('estado')} - CEP: ${getValue('cep')}`),
  };

  // ── clientes ───────────────────────────────────────────────────────────────
  const clientes = Array.from(document.querySelectorAll('#clientesWrapper .cliente-item'))
    .map(row => ({
      nomeCliente:  getTextOrValue(row.querySelector('.razaoSocial')),
      cpfCnpj:      getTextOrValue(row.querySelector('.cpfCnpj')),
      nomeContato:  getTextOrValue(row.querySelector('.nomeContato')),
      funcao:       getTextOrValue(row.querySelector('.funcaoCliente')),
      telefone:     getTextOrValue(row.querySelector('.telefoneCliente')),
    }))
    .filter(c => c.nomeCliente || c.nomeContato || c.cpfCnpj);

  const principal   = clientes[0] || {};
  const nomeCliente = principal.nomeCliente || '-';
  const cpfCnpj     = principal.cpfCnpj    || '-';

  // ── grupos ─────────────────────────────────────────────────────────────────
  const gruposDados = [];
  document.querySelectorAll("table[id^='tabela-bloco-']").forEach(tabela => {
    const grupoId      = tabela.id.replace('tabela-', '').trim();
    const inputAmb     = document.querySelector(`input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`);
    const nomeAmbiente = inputAmb?.value.trim() || 'Sem Ambiente';
    const linhaProd    = tabela.querySelector('tbody tr');
    const colunas      = linhaProd?.querySelectorAll('td');
    const descricao    = sanitize(colunas?.[1]?.textContent.trim() || '-');
    const qtd          = linhaProd?.querySelector('input.quantidade')?.value || '1';
    const resumo       = sanitize(document.getElementById(`resumo-${grupoId}`)?.value?.trim() || '');
    const infosProd    = sanitize(document.querySelector(`#${grupoId}-aba3 textarea[name="informacoesProduto"]`)?.value?.trim() || '');
    const prazoGrupo   = sanitize(document.querySelector(`#${grupoId}-aba3 input[name="previsaoEntrega"]`)?.value?.trim() || '');
    const totalTexto   = tabela.querySelector("tfoot td[colspan='6'] strong")?.textContent || 'R$ 0,00';
    const totalGrupo   = parseBRL(totalTexto);
    const ocultar      = !!(gruposOcultarProduto && gruposOcultarProduto[grupoId]);
    gruposDados.push({ grupoId, nomeAmbiente, totalGrupo, descricao, qtd, resumo, infosProd, prazoGrupo, ocultar });
  });

  const ambientesMap = {};
  gruposDados.forEach(g => {
    if (!ambientesMap[g.nomeAmbiente]) ambientesMap[g.nomeAmbiente] = [];
    ambientesMap[g.nomeAmbiente].push(g);
  });

  // ── parcelas ───────────────────────────────────────────────────────────────
  const parcelas = Array.from(document.querySelectorAll('#listaParcelas .row'))
    .map((row, idx) => {
      const selTipo  = row.querySelector('select.tipo-monetario');
      const tipo     = selTipo?.selectedOptions?.[0]?.textContent?.trim() || selTipo?.value?.trim() || '-';
      const wrapC    = row.querySelector('.condicao-wrapper');
      const selC     = wrapC?.querySelector('select.condicao-pagto');
      const inpC     = wrapC?.querySelector('input, textarea');
      const condicao = sanitize(normCond(inpC ? getTextOrValue(inpC) : (selC?.selectedOptions?.[0]?.textContent?.trim() || '')));
      const valorRaw = (row.querySelector('input.valor-parcela')?.value || '').trim();
      const valorExib = valorRaw && !valorRaw.includes('%') ? fmtBRL(parseBRL(valorRaw)) : (valorRaw || '-');
      const venc = fmtData((row.querySelector('input.data-parcela')?.value || '').trim());
      if (!tipo && !valorRaw && venc === '-') return null;
      return { idx: idx + 1, tipo, condicao, valorExib, venc };
    })
    .filter(Boolean);

  // ── totais ─────────────────────────────────────────────────────────────────
  let totalGeral = 0;
  Object.values(ambientesMap).forEach(gs => gs.forEach(g => { totalGeral += g.totalGrupo; }));
  const valorFinalComDesconto = parseBRL(document.getElementById('valorFinalTotal')?.textContent || '0');
  const campoDesconto = document.getElementById('campoDescontoFinal')?.value?.trim();
  const temDesconto   = campoDesconto && valorFinalComDesconto > 0 && valorFinalComDesconto < totalGeral;
  const descontoAplicado = temDesconto ? (totalGeral - valorFinalComDesconto) : 0;

  const logoBase64 = totais.logoBase64 || null;

  // ── cores ──────────────────────────────────────────────────────────────────
  const COR_BORDA  = '#1e293b';
  const COR_HEADER = '#f1f5f9';
  const COR_TOTAL  = '#f0fdf4';

  // ── HEADER compacto (todas as páginas via callback) ────────────────────────
  // Margem top pequena para não desperdiçar espaço nas páginas 2+
  const TOP_MARGIN = 70;

  const headerFn = (currentPage, pageCount) => {
    // Página 1 já tem o cabeçalho completo no conteúdo — não duplicar
    if (currentPage === 1) return {};

    const logoCol = logoBase64
      ? { image: logoBase64, fit: [130, 45], margin: [0, 0, 6, 0] }
      : { text: 'FERREIRA ULHOA', bold: true, fontSize: 8, margin: [0, 2, 6, 0] };

    return {
      margin: [30, 6, 30, 0],
      stack: [
        {
          columns: [
            logoCol,
            {
              text: [
                { text: 'Orçamento: ', bold: true, fontSize: 8 }, { text: `${dados.numero}  `, fontSize: 8 },
                { text: 'Pedido: ',    bold: true, fontSize: 8 }, { text: `${dados.numeroPedido}  `, fontSize: 8 },
                { text: 'Data: ',      bold: true, fontSize: 8 }, { text: `${dataHoje}  `, fontSize: 8 },
                { text: 'Proposta válida por 7 dias úteis', fontSize: 8, color: '#475569' }
              ],
              margin: [0, 4, 0, 0]
            },
            { text: `Pág. ${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0] }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 535, y2: 3, lineWidth: 2, lineColor: COR_BORDA }] }
      ]
    };
  };

  // ── conteúdo ───────────────────────────────────────────────────────────────
  const content = [];

  // ─── BLOCO CABEÇALHO COMPLETO (página 1, dentro do conteúdo) ────────────
  // Logo grande + telefone | Orçamento/Pedido/Data
  const logoGrandeCol = logoBase64
    ? { image: logoBase64, fit: [185, 75], alignment: 'center' }
    : { text: 'FERREIRA ULHOA', bold: true, fontSize: 12, alignment: 'center' };

  content.push({
    table: {
      widths: ['38%', '62%'],
      body: [[
        {
          stack: [logoGrandeCol, { text: '(31) 98457-7573', fontSize: 9, alignment: 'center', margin: [0, 3, 0, 0] }],
          margin: [4, 4, 4, 4],
          alignment: 'center',
          vAlignment: 'center'
        },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              [{ text: 'Orçamento:', bold: true, fontSize: 10 }, { text: dados.numero, fontSize: 10 }],
              [{ text: 'Pedido:',    bold: true, fontSize: 10 }, { text: dados.numeroPedido, fontSize: 10 }],
              [{ text: 'Data:',      bold: true, fontSize: 10 }, { text: dataHoje, fontSize: 10 }],
              [{ text: 'Proposta válida por 7 dias úteis', bold: true, fontSize: 9, color: '#475569', colSpan: 2 }, {}],
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [6, 4, 4, 4]
        }
      ]]
    },
    layout: { defaultBorder: true },
    margin: [0, 0, 0, 2]
  });

  // Tabela de dados do cliente
  content.push({
    table: {
      widths: ['30%', '70%'],
      body: [
        [{ text: 'Cliente (Responsável):', bold: true, fontSize: 9 }, { text: nomeCliente, fontSize: 9 }],
        [{ text: 'CPF/CNPJ:',             bold: true, fontSize: 9 }, { text: cpfCnpj, fontSize: 9 }],
        [{ text: 'Endereço da Obra:',      bold: true, fontSize: 9 }, { text: dados.enderecoObra, fontSize: 8 }],
        [{ text: 'Vendedor:',              bold: true, fontSize: 9 }, { text: dados.vendedor, fontSize: 9 }],
      ]
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 0]
  });

  // Linha separadora grossa (encerra o bloco de cabeçalho)
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 3, lineColor: COR_BORDA }],
    margin: [0, 4, 0, 10]
  });

  // ─── tabela de contatos (somente se houver mais de 1) ────────────────────
  if (clientes.length > 1) {
    content.push({ text: 'Clientes', style: 'secTitle' });
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', '*', 'auto', 'auto'],
        body: [
          [
            { text: 'Nome / Razão Social', style: 'thCell' },
            { text: 'CPF / CNPJ',          style: 'thCell' },
            { text: 'Contato',             style: 'thCell' },
            { text: 'Função',              style: 'thCell' },
            { text: 'Telefone',            style: 'thCell' },
          ],
          ...clientes.map((c, i) => [
            { text: i === 0 ? `${c.nomeCliente} (Responsável)` : (c.nomeCliente || '-'), fontSize: 8 },
            { text: c.cpfCnpj || '-',     fontSize: 8 },
            { text: c.nomeContato || '-', fontSize: 8 },
            { text: c.funcao || '-',      fontSize: 8 },
            { text: c.telefone || '-',    fontSize: 8 },
          ])
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    });
  }

  // ─── grupos por ambiente (sem pageBreak forçado) ──────────────────────────
  let contador = 1;
  let ultimoAmbiente = null;
  Object.entries(ambientesMap).forEach(([nomeAmbiente, grupos]) => {
    const visiveis = grupos.filter(g => !g.ocultar);
    if (!visiveis.length) return;
    const totalAmbiente = visiveis.reduce((s, g) => s + g.totalGrupo, 0);

    visiveis.forEach((g, idx) => {
      const isFirst = idx === 0;
      const isLast  = idx === visiveis.length - 1;
      const num = contador++;

      // título do ambiente — só na primeira linha do grupo
      if (isFirst) {
        content.push({
          table: {
            widths: ['*'],
            body: [[{
              text: `AMBIENTE: ${nomeAmbiente.toUpperCase()}`,
              bold: true, fontSize: 10, fillColor: COR_HEADER, alignment: 'center'
            }]]
          },
          layout: 'noBorders',
          margin: [0, nomeAmbiente !== ultimoAmbiente ? 8 : 2, 0, 2]
        });
        ultimoAmbiente = nomeAmbiente;
      }

      const bodyRows = [
        [
          { text: '#',          style: 'thCell', alignment: 'center' },
          { text: 'Descrição',  style: 'thCell' },
          { text: 'Quantidade', style: 'thCell', alignment: 'center' },
        ],
        [
          { text: String(num),   fontSize: 9, alignment: 'center' },
          { text: g.descricao,   fontSize: 9 },
          { text: String(g.qtd), fontSize: 9, alignment: 'center' },
        ]
      ];

      if (g.resumo) {
        bodyRows.push([{}, { text: g.resumo, fontSize: 8, italics: true, color: '#444', colSpan: 2 }, {}]);
      }

      if (g.prazoGrupo || g.infosProd) {
        const prazoTxt = [
          g.prazoGrupo ? `Prazo Previsto: ${g.prazoGrupo}` : '',
          g.infosProd  ? g.infosProd : ''
        ].filter(Boolean).join('  |  ');
        bodyRows.push([{}, { text: prazoTxt, fontSize: 8, bold: true, alignment: 'center', colSpan: 2 }, {}]);
      }

      content.push({
        table: { headerRows: 1, widths: [20, '*', 80], body: bodyRows },
        layout: 'lightHorizontalLines',
        margin: [0, 2, 0, 2]
      });

      if (isLast) {
        content.push({
          table: {
            widths: ['*'],
            body: [[{
              text: `Total do Ambiente ${nomeAmbiente.toUpperCase()}: ${fmtBRL(totalAmbiente)}`,
              alignment: 'right', bold: true, fontSize: 9, fillColor: COR_TOTAL, margin: [0, 3, 4, 3]
            }]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 6]
        });
      }
    });
  });

  // ─── parcelas ─────────────────────────────────────────────────────────────
  if (parcelas.length) {
    content.push({ text: 'Parcelas', style: 'secTitle', margin: [0, 10, 0, 4] });
    content.push({
      table: {
        headerRows: 1,
        widths: [16, 80, '*', 80, 70],
        body: [
          [
            { text: '#',          style: 'thCell', alignment: 'center' },
            { text: 'Tipo',       style: 'thCell' },
            { text: 'Condição',   style: 'thCell' },
            { text: 'Valor',      style: 'thCell', alignment: 'right' },
            { text: 'Vencimento', style: 'thCell', alignment: 'center' },
          ],
          ...parcelas.map(p => [
            { text: String(p.idx), fontSize: 9, alignment: 'center' },
            { text: p.tipo,        fontSize: 9 },
            { text: p.condicao || '', fontSize: 9 },
            { text: p.valorExib,   fontSize: 9, alignment: 'right' },
            { text: p.venc,        fontSize: 9, alignment: 'center' },
          ])
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10]
    });
  }

  // ─── totais ───────────────────────────────────────────────────────────────
  const totaisRows = [];
  if (temDesconto) {
    totaisRows.push([{ text: `Total líquido: ${fmtBRL(totalGeral)}`, alignment: 'right', fontSize: 9 }]);
    totaisRows.push([{ text: `Desconto aplicado: ${fmtBRL(descontoAplicado)}`, alignment: 'right', fontSize: 9, color: '#dc2626' }]);
    totaisRows.push([{ text: `Total líquido com desconto aplicado: ${fmtBRL(valorFinalComDesconto)}`, alignment: 'right', bold: true, fontSize: 11, color: '#16a34a', fillColor: COR_TOTAL }]);
  } else {
    totaisRows.push([{ text: `Total líquido: ${fmtBRL(totalGeral)}`, alignment: 'right', bold: true, fontSize: 11, fillColor: COR_TOTAL }]);
  }
  content.push({ table: { widths: ['*'], body: totaisRows }, layout: 'noBorders', margin: [0, 4, 0, 14] });

  // ─── prazo / condições ────────────────────────────────────────────────────
  const condicaoTexto = normCond(dados.condicao) || '-';
  content.push({
    table: {
      widths: ['*'],
      body: [
        [{ text: 'PRAZO PREVISTO:',          bold: true, fontSize: 9, fillColor: COR_HEADER }],
        [{ text: dados.prazos || '-',          fontSize: 9, preserveLeadingSpaces: true }],
        [{ text: 'CONDIÇÕES DE PAGAMENTO:',   bold: true, fontSize: 9, fillColor: COR_HEADER }],
        [{ text: condicaoTexto,                fontSize: 9, preserveLeadingSpaces: true }],
        [{ text: 'CONDIÇÕES GERAIS:',         bold: true, fontSize: 9, fillColor: COR_HEADER }],
        [{ text: dados.condicoesGerais || '-', fontSize: 9, preserveLeadingSpaces: true }],
      ]
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 20]
  });

  // ─── assinaturas ──────────────────────────────────────────────────────────
  content.push({
    unbreakable: true,
    stack: [{
      columns: [
        {
          stack: [
            { text: 'Assinatura Contratante', fontSize: 8, alignment: 'center', margin: [0, 0, 0, 18] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#64748b' }] },
          ],
          width: '50%'
        },
        {
          stack: [
            { text: 'Assinatura Contratada', fontSize: 8, alignment: 'center', margin: [0, 0, 0, 18] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#64748b' }] },
          ],
          width: '50%'
        }
      ]
    }],
    margin: [0, 10, 0, 0]
  });

  // ── documento ──────────────────────────────────────────────────────────────
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, TOP_MARGIN, 30, 40],
    header: headerFn,
    content,
    styles: {
      secTitle: { bold: true, fontSize: 10, margin: [0, 8, 0, 4] },
      thCell:   { bold: true, fontSize: 9, fillColor: '#f1f5f9' },
    },
    defaultStyle: { fontSize: 9, font: 'Roboto' }
  };

  ocultarCarregando && ocultarCarregando();
  pdfMake.createPdf(docDefinition).download(`Orcamento_${dados.numero}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDEM DE SERVIÇO — pdfmake
// ══════════════════════════════════════════════════════════════════════════════
async function gerarOrdemDeServicoPdfmake(gruposOcultarProduto) {
  mostrarCarregando && mostrarCarregando();

  try { await carregarPdfmake(); }
  catch (e) {
    ocultarCarregando && ocultarCarregando();
    alert('Erro ao carregar biblioteca de PDF. Verifique a conexão.');
    return;
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const getValue = (id) => document.getElementById(id)?.value?.trim() || '-';
  const getTextOrValue = (el) => {
    if (!el) return '';
    const v = (typeof el.value === 'string' ? el.value : '').trim();
    if (v) return v;
    return (typeof el.textContent === 'string' ? el.textContent : '').trim();
  };
  const fmtData = (iso) => {
    if (!iso || iso === '-') return '-';
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return '-';
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  };
  const sanitize = (txt) => {
    if (!txt) return '';
    return String(txt)
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/[─-╿]/g, '-')
      .replace(/ /g, ' ')
      .replace(/–/g, '-').replace(/—/g, '--')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/•/g, '-').replace(/·/g, '-').replace(/…/g, '...')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  };

  // ── dados gerais ───────────────────────────────────────────────────────────
  const numeroPedido    = getValue('numeroPedido');
  const numeroOrcamento = getValue('numeroOrcamento');
  const dataOrc         = getValue('dataOrcamento');
  const data            = dataOrc !== '-' ? fmtData(dataOrc) : (() => {
    const h = new Date();
    return `${String(h.getDate()).padStart(2,'0')}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`;
  })();
  const vendedor = document.getElementById('vendedorResponsavel')?.selectedOptions?.[0]?.textContent?.trim() || '-';
  const operador = getValue('operadorInterno');
  const origem   = getValue('origemCliente');
  const prazos   = sanitize(getValue('prazosArea'));

  // ── clientes ───────────────────────────────────────────────────────────────
  const clientes = Array.from(document.querySelectorAll('#clientesWrapper .cliente-item'))
    .map(row => ({
      nome:        getTextOrValue(row.querySelector('.razaoSocial')),
      cpfCnpj:     getTextOrValue(row.querySelector('.cpfCnpj')),
      nomeContato: getTextOrValue(row.querySelector('.nomeContato')),
      funcao:      getTextOrValue(row.querySelector('.funcaoCliente')),
      telefone:    getTextOrValue(row.querySelector('.telefoneCliente')),
      email:       getTextOrValue(row.querySelector('.emailCliente')),
    }))
    .filter(c => c.nome || c.nomeContato || c.telefone || c.cpfCnpj || c.email);

  const principal   = clientes[0] || {};
  const nomeCliente = (document.querySelector('input.razaoSocial')?.value || '').trim() || '-';
  const cpfCnpj     = principal.cpfCnpj || '-';
  const enderecoObra = sanitize(
    `Rua/Avenida: ${getValue('rua')}, Número: ${getValue('numero')}, Bairro: ${getValue('bairro')} - Complemento: ${getValue('complemento')} - Cidade: ${getValue('cidade')}/${getValue('estado')} - CEP: ${getValue('cep')}`
  );

  // ── grupos ─────────────────────────────────────────────────────────────────
  const gruposDados = [];
  document.querySelectorAll("table[id^='tabela-bloco-']").forEach(tabela => {
    const grupoId = tabela.id.replace('tabela-', '').trim();
    if (gruposOcultarProduto && gruposOcultarProduto[grupoId]) return;

    const nomeAmbiente      = document.querySelector(`input[data-id-grupo='${grupoId}'][placeholder='Ambiente']`)?.value?.trim() || 'Sem Ambiente';
    const resumoGrupo       = sanitize(document.getElementById(`resumo-${grupoId}`)?.value?.trim() || '');
    const informacoesProduto = sanitize(document.querySelector(`#${grupoId}-aba3 textarea[name="informacoesProduto"]`)?.value?.trim() || '');
    const previsaoEntrega    = sanitize(document.querySelector(`#${grupoId}-aba3 input[name="previsaoEntrega"]`)?.value?.trim() || '');

    const itens = Array.from(tabela.querySelectorAll('tbody tr'))
      .filter(tr => !tr.querySelector('td[colspan]') && !tr.classList.contains('extra-summary-row') && tr.querySelectorAll('td').length >= 2)
      .map(tr => {
        const tds = Array.from(tr.querySelectorAll('td'));
        const utilizacao = sanitize(getTextOrValue(tds[0]?.querySelector('textarea')) || tds[0]?.textContent?.trim() || '-');
        const descricao  = sanitize(tds[1]?.textContent?.trim() || '-');
        const qtdInput   = tr.querySelector('input.quantidade') || tr.querySelector('input.quantidade_sugerida');
        return { utilizacao, descricao, qtd: qtdInput?.value?.trim() || '1' };
      })
      .filter(x => x.descricao && x.descricao !== '-');

    gruposDados.push({ grupoId, nomeAmbiente, resumoGrupo, informacoesProduto, previsaoEntrega, itens });
  });

  const logoBase64 = await carregarLogoBase64('../js/logo.jpg');

  // ── cores / medidas ────────────────────────────────────────────────────────
  const COR_BORDA    = '#111111';
  const COR_HEADER   = '#f2f2f2';
  const ITEM_ROW_H   = 32;   // pt — equivale ≈ 45px
  const TOP_MARGIN   = 68;   // espaço reservado para o header compacto (págs 2+)

  // ── header compacto (págs 2+) ──────────────────────────────────────────────
  const headerFn = (currentPage, pageCount) => {
    if (currentPage === 1) return {};
    const logoCol = logoBase64
      ? { image: logoBase64, fit: [110, 38], margin: [0, 20, 6, 0] }
      : { text: 'FERREIRA ULHOA', bold: true, fontSize: 8, margin: [0, 46, 0, 0] };
    return {
      margin: [30, 4, 30, 0],
      stack: [
        {
          columns: [
            { stack: [logoCol], width: 'auto' },
            { text: 'ORDEM DE SERVIÇO / PRODUÇÃO', bold: true, fontSize: 10, alignment: 'center', margin: [0, 46, 0, 0] },
            { stack: [
                { text: numeroPedido || '-', bold: true, fontSize: 36, alignment: 'right' },
                { text: [{ text: 'Orç: ', bold: true, fontSize: 7 }, { text: `${numeroOrcamento}   Data: ${data}`, fontSize: 7 }], alignment: 'right' },
                { text: `Pág. ${currentPage} / ${pageCount}`, fontSize: 7, alignment: 'right', color: '#64748b' }
              ], width: 'auto'
            }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 535, y2: 2, lineWidth: 2, lineColor: COR_BORDA }] }
      ]
    };
  };

  // ── conteúdo ───────────────────────────────────────────────────────────────
  const content = [];

  // ── CABEÇALHO COMPLETO (página 1 no conteúdo) ────────────────────────────
  const logoGrandeCol = logoBase64
    ? { image: logoBase64, fit: [160, 62], alignment: 'center' }
    : { text: 'FERREIRA ULHOA', bold: true, fontSize: 14, alignment: 'center' };

  content.push({
    table: {
      widths: ['30%', '70%'],
      body: [[
        {
          stack: [logoGrandeCol, { text: '(31) 98457-7573', fontSize: 8, alignment: 'center', margin: [0, 4, 0, 0] }],
          vAlignment: 'center', alignment: 'center'
        },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'ORDEM DE SERVIÇO / PRODUÇÃO', bold: true, fontSize: 13, alignment: 'center', colSpan: 2 }, {}],
              [
                { stack: [
                    { text: 'Nº do Pedido', fontSize: 8, bold: true },
                    { text: numeroPedido || '-', fontSize: 48, bold: true, margin: [0, -4, 0, 0] }
                  ]
                },
                { stack: [
                    { text: [{ text: 'Nº do orçamento: ', bold: true, fontSize: 9 }, { text: numeroOrcamento, fontSize: 9 }] },
                    { text: [{ text: 'Data: ', bold: true, fontSize: 9 }, { text: data, fontSize: 9 }] }
                  ], alignment: 'right', margin: [0, 6, 0, 0]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [6, 4, 4, 4]
        }
      ]]
    },
    layout: {
      defaultBorder: true,
      paddingLeft:   (i) => i === 0 ? 8 : 0,
      paddingRight:  (i) => i === 0 ? 8 : 0,
      paddingTop:    () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 2]
  });

  // Indicador de seção
  content.push({
    table: {
      widths: ['*'],
      body: [[{ text: 'ORDEM DE SERVIÇO / PRODUÇÃO', bold: true, fontSize: 10, alignment: 'center', fillColor: '#f8f8f8', margin: [0, 3, 0, 3] }]]
    },
    layout: { defaultBorder: true },
    margin: [0, 0, 0, 2]
  });

  // Tabela de dados do cliente (6 colunas)
  const clienteBody = [
    [
      { text: 'Nome / Razão social:', bold: true, fontSize: 9 },
      { text: nomeCliente, fontSize: 9 },
      { text: 'CPF / CNPJ:', bold: true, fontSize: 9 },
      { text: cpfCnpj, fontSize: 9 },
      { text: 'Origem:', bold: true, fontSize: 9 },
      { text: origem, fontSize: 9 }
    ],
    [
      { text: 'Endereço da obra:', bold: true, fontSize: 9 },
      { text: enderecoObra, fontSize: 8, colSpan: 5 }, {}, {}, {}, {}
    ],
  ];

  content.push({
    table: { widths: ['auto', '*', '*', 'auto', '*', '*'], body: clienteBody },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 2]
  });

  // Contatos — cada um em mini-tabela com borda própria
  const listaContatos = clientes.length ? clientes : [{ nome: '-', cpfCnpj: '-', nomeContato: '-', funcao: '-', telefone: '-', email: '-' }];
  listaContatos.forEach((c, idx) => {
    const label = idx === 0 ? 'Contato (Responsável)' : `Contato ${idx + 1}`;
    content.push({
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            { text: `${label}:`, bold: true, fontSize: 9, fillColor: '#f0f4f8' },
            { text: c.nomeContato || c.nome || '-', fontSize: 9, fillColor: '#f0f4f8' },
            { text: 'Função:', bold: true, fontSize: 9, fillColor: '#f0f4f8' },
            { text: c.funcao || '-', fontSize: 9, fillColor: '#f0f4f8' }
          ],
          [
            { text: 'Telefone:', bold: true, fontSize: 9 },
            { text: c.telefone || '-', fontSize: 9 },
            { text: 'E-mail:', bold: true, fontSize: 9 },
            { text: c.email || '-', fontSize: 9 }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 1, vLineWidth: () => 1,
        hLineColor: () => '#b0bec5', vLineColor: () => '#b0bec5'
      },
      margin: [0, idx === 0 ? 0 : 4, 0, 0]
    });
  });

  // Operador / Vendedor
  content.push({
    columns: [
      { table: { widths: ['*'], body: [[{ text: [{ text: 'Operador: ', bold: true, fontSize: 9 }, { text: operador, fontSize: 9 }], margin: [0, 2, 0, 2] }]] }, layout: { defaultBorder: true }, margin: [0, 0, 3, 0] },
      { table: { widths: ['*'], body: [[{ text: [{ text: 'Vendedor: ', bold: true, fontSize: 9 }, { text: vendedor, fontSize: 9 }], margin: [0, 2, 0, 2] }]] }, layout: { defaultBorder: true }, margin: [3, 0, 0, 0] }
    ],
    margin: [0, 6, 0, 2]
  });

  // Prazos
  content.push({
    table: {
      widths: ['*'],
      body: [
        [{ text: 'Prazo Previsto por Área:', bold: true, fontSize: 10, fillColor: COR_HEADER, margin: [0, 2, 0, 2] }],
        [{ text: prazos || '-', fontSize: 11, bold: true, preserveLeadingSpaces: true }]
      ]
    },
    layout: { defaultBorder: true },
    margin: [0, 0, 0, 6]
  });

  // ── Etapas do Processo ────────────────────────────────────────────────────
  const ETAPA_ROW_H = 26;
  content.push({
    table: {
      headerRows: 2,
      widths: [45, 45, 28, 45, 45, 28, '*', '*', 55],
      body: [
        [
          { text: 'Pedido',          bold: true, fontSize: 9, fillColor: '#f0f0f0', alignment: 'center', colSpan: 2 }, {},
          { text: 'Projeto',         bold: true, fontSize: 9, fillColor: '#f0f0f0', alignment: 'center', colSpan: 3 }, {}, {},
          { text: 'Obra / Medição',  bold: true, fontSize: 9, fillColor: '#f0f0f0', alignment: 'center', colSpan: 4 }, {}, {}, {}
        ],
        [
          { text: 'Enviado',           bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Assinado',          bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Item',              bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Enviado',           bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Assinado',          bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Item',              bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Liberação Obra',    bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Medição Realizada', bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' },
          { text: 'Medidor',           bold: true, fontSize: 8, fillColor: COR_HEADER, alignment: 'center' }
        ],
        ...Array.from({ length: 3 }, () => Array(9).fill({ text: '', fontSize: 8 })),
        [{ text: 'Descrição:', bold: true, fontSize: 8, colSpan: 9 }, {}, {}, {}, {}, {}, {}, {}, {}],
        [{ text: '', fontSize: 8, colSpan: 9 }, {}, {}, {}, {}, {}, {}, {}, {}]
      ],
      heights: [null, null, ETAPA_ROW_H, ETAPA_ROW_H, ETAPA_ROW_H, null, 60]
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => COR_BORDA,
      vLineColor: () => COR_BORDA
    },
    margin: [0, 0, 0, 8]
  });

  // ── ITENS ─────────────────────────────────────────────────────────────────
  let contador = 1;
  gruposDados.forEach(g => {
    const num = contador++;
    const prazoFrase = [g.previsaoEntrega, g.informacoesProduto].filter(Boolean).join('  |  ');
    const prazoTexto = prazoFrase || '-';

    const nomeAmbUp = String(g.nomeAmbiente || '').toUpperCase();

    // Cabeçalho bold (bloco separado — NÃO repete quando a tabela quebra)
    content.push({
      table: {
        widths: ['*'],
        body: [[
          { text: `ITEM ${num}   |   AMBIENTE: ${nomeAmbUp}`, bold: true, fontSize: 11, fillColor: '#e5e7eb', alignment: 'center', margin: [0, 5, 0, 5] }
        ]]
      },
      layout: { defaultBorder: true },
      margin: [0, 8, 0, 0]
    });

    // Tabela com headerRows:1 — só a linha de colunas repete em continuações
    const bodyRows = [
      [
        { text: '#',          bold: true, fontSize: 9, fillColor: COR_HEADER, alignment: 'center' },
        { text: 'Utilização', bold: true, fontSize: 9, fillColor: COR_HEADER },
        { text: 'Descrição',  bold: true, fontSize: 9, fillColor: COR_HEADER },
        { text: 'Quantidade', bold: true, fontSize: 9, fillColor: COR_HEADER, alignment: 'center' }
      ]
    ];

    const itensExibir = g.itens.length ? g.itens : [{ utilizacao: '-', descricao: '-', qtd: '-' }];
    itensExibir.forEach(it => {
      bodyRows.push([
        { text: '',             fontSize: 9, alignment: 'center' },
        { text: it.utilizacao,  fontSize: 9 },
        { text: it.descricao,   fontSize: 9 },
        { text: it.qtd,         fontSize: 9, alignment: 'center' }
      ]);
    });

    // Footer: Prazo | Pedido | ITEM N
    bodyRows.push([
      { text: `Prazo Previsto: ${prazoTexto}   |   Pedido: ${numeroPedido}   |   ITEM ${num}`, bold: true, fontSize: 9, fillColor: '#f0f0f0', colSpan: 4, alignment: 'center', margin: [0, 4, 0, 4] }, {}, {}, {}
    ]);

    if (g.resumoGrupo) {
      bodyRows.push([
        { text: [{ text: 'Observações: ', bold: true, fontSize: 9 }, { text: g.resumoGrupo, italics: true, fontSize: 9 }], fillColor: '#fefce8', colSpan: 4, color: '#333', preserveLeadingSpaces: true, margin: [4, 4, 4, 4] }, {}, {}, {}
      ]);
    }

    const rowHeights = [null, ...Array(itensExibir.length).fill(ITEM_ROW_H), null, g.resumoGrupo ? null : undefined].filter(v => v !== undefined);

    content.push({
      table: {
        headerRows: 1,
        widths: [30, 120, '*', 70],
        body: bodyRows,
        heights: rowHeights
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc'
      },
      margin: [0, 0, 0, 0]
    });
  });

  // ── PÁGINA 2: FATURAMENTO DIRETO + SERVIÇOS DE TERCEIROS ─────────────────
  const LINHAS_FAT  = 6;
  const LINHAS_SERV = 3;
  const ALTURA_FAT  = 30;
  const ALTURA_SERV = 30;

  content.push({ text: 'Faturamento Direto', bold: true, fontSize: 11, alignment: 'center', pageBreak: 'before', margin: [0, 0, 0, 3] });
  content.push({
    table: {
      headerRows: 1,
      widths: [25, 52, '*', 52, 52, 35, 55],
      body: [
        [
          { text: 'Item',        bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Data Compra', bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Fornecedor',  bold: true, fontSize: 8, fillColor: '#fafafa' },
          { text: 'Previsto',    bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Tipo',        bold: true, fontSize: 8, fillColor: '#fafafa' },
          { text: 'Quant.',      bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'right' },
          { text: 'Na Empresa',  bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' }
        ],
        ...Array.from({ length: LINHAS_FAT }, () => Array(7).fill({ text: '', fontSize: 8 }))
      ],
      heights: [null, ...Array(LINHAS_FAT).fill(ALTURA_FAT)]
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => COR_BORDA, vLineColor: () => COR_BORDA },
    margin: [0, 0, 0, 12]
  });

  content.push({ text: 'Serviço(s) de Terceiros', bold: true, fontSize: 11, alignment: 'center', margin: [0, 0, 0, 3] });
  content.push({
    table: {
      headerRows: 1,
      widths: [18, '*', '*', 50, 42, 42, 48, 56, 46, 46],
      body: [
        [
          { text: 'Item',                  bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Fornecedor',            bold: true, fontSize: 7, fillColor: '#fafafa' },
          { text: 'Nome do Contato',       bold: true, fontSize: 7, fillColor: '#fafafa' },
          { text: 'Telefone do Contato',   bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Data Saída',            bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Previsão',              bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Data Retorno',          bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Retorno Conferido por', bold: true, fontSize: 7, fillColor: '#fafafa' },
          { text: 'Ass. Interno',          bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Ass. Terceiro',         bold: true, fontSize: 7, fillColor: '#fafafa', alignment: 'center' }
        ],
        ...Array.from({ length: LINHAS_SERV }, () => Array(10).fill({ text: '', fontSize: 7 }))
      ],
      heights: [null, ...Array(LINHAS_SERV).fill(ALTURA_SERV)]
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => COR_BORDA, vLineColor: () => COR_BORDA },
    margin: [0, 0, 0, 0]
  });

  // ── documento ──────────────────────────────────────────────────────────────
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, TOP_MARGIN, 30, 40],
    header: headerFn,
    content,
    defaultStyle: { fontSize: 9, font: 'Roboto' }
  };

  ocultarCarregando && ocultarCarregando();
  pdfMake.createPdf(docDefinition).download(`OrdemServico_${numeroPedido}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE ENTREGA / INSTALAÇÃO — pdfmake
// ══════════════════════════════════════════════════════════════════════════════
async function gerarRelatorioEntregaPdfmake() {
  mostrarCarregando && mostrarCarregando();

  try { await carregarPdfmake(); }
  catch (e) {
    ocultarCarregando && ocultarCarregando();
    alert('Erro ao carregar biblioteca de PDF. Verifique a conexão.');
    return;
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const getValue = (id) => document.getElementById(id)?.value?.trim() || '-';
  const getTextOrValue = (el) => {
    if (!el) return '';
    const v = (typeof el.value === 'string' ? el.value : '').trim();
    if (v) return v;
    return (typeof el.textContent === 'string' ? el.textContent : '').trim();
  };
  const fmtData = (iso) => {
    if (!iso || iso === '-') return '-';
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return '-';
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  };
  const sanitize = (txt) => {
    if (!txt) return '';
    return String(txt)
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/[─-╿]/g, '-').replace(/ /g, ' ')
      .replace(/–/g, '-').replace(/—/g, '--')
      .replace(/['']/g, "'").replace(/[""]/g, '"')
      .replace(/•/g, '-').replace(/·/g, '-').replace(/…/g, '...')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  };

  // ── dados gerais ───────────────────────────────────────────────────────────
  const numeroPedido    = getValue('numeroPedido');
  const numeroOrcamento = getValue('numeroOrcamento');
  const dataOrc         = getValue('dataOrcamento');
  const data = dataOrc !== '-' ? fmtData(dataOrc) : (() => {
    const h = new Date();
    return `${String(h.getDate()).padStart(2,'0')}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`;
  })();
  const vendedor = document.getElementById('vendedorResponsavel')?.selectedOptions?.[0]?.textContent?.trim() || '-';
  const operador = getValue('operadorInterno');
  const origem   = getValue('origemCliente');

  // ── clientes ───────────────────────────────────────────────────────────────
  const clientes = Array.from(document.querySelectorAll('#clientesWrapper .cliente-item'))
    .map(row => ({
      nome:        getTextOrValue(row.querySelector('.razaoSocial')),
      cpfCnpj:     getTextOrValue(row.querySelector('.cpfCnpj')),
      nomeContato: getTextOrValue(row.querySelector('.nomeContato')),
      funcao:      getTextOrValue(row.querySelector('.funcaoCliente')),
      telefone:    getTextOrValue(row.querySelector('.telefoneCliente')),
      email:       getTextOrValue(row.querySelector('.emailCliente')),
    }))
    .filter(c => c.nome || c.nomeContato || c.telefone || c.cpfCnpj || c.email);

  const nomeCliente  = (document.querySelector('input.razaoSocial')?.value || '').trim() || '-';
  const enderecoObra = sanitize(
    `Rua/Avenida: ${getValue('rua')}, Número: ${getValue('numero')}, Bairro: ${getValue('bairro')} - Complemento: ${getValue('complemento')} - Cidade: ${getValue('cidade')}/${getValue('estado')} - CEP: ${getValue('cep')}`
  );

  // ── produtos ───────────────────────────────────────────────────────────────
  const produtos = Array.from(document.querySelectorAll("#blocosProdutosContainer .main-container[id^='bloco-']"))
    .map((blocoEl, idx) => {
      const id     = blocoEl.id;
      const titulo = document.getElementById(`titulo-accordion-${id}`)?.textContent?.trim() || 'Produto sem nome';
      const tabela = document.getElementById(`tabela-${id}`);
      const linha  = tabela
        ? Array.from(tabela.querySelectorAll('tbody tr')).find(tr => !tr.querySelector('td[colspan]') && tr.querySelectorAll('td').length >= 2)
        : null;
      const qtd  = linha?.querySelector('input.quantidade')?.value?.trim() || '-';
      const desc = document.getElementById(`resumo-${id}`)?.value?.trim() || '-';
      return { seq: idx + 1, titulo: sanitize(titulo), qtd, descricao: sanitize(desc) };
    });

  const logoBase64 = await carregarLogoBase64('../js/logo.jpg');

  // ── cores / medidas ────────────────────────────────────────────────────────
  const COR_BORDA  = '#111111';
  const COR_HEADER = '#f2f2f2';
  const TOP_MARGIN = 68;
  const PROD_ROW_H = 34;   // ≈ 45px
  const HIST_ROW_H = 71;   // ≈ 95px
  const LINHAS_HIST = 8;

  // ── header compacto (págs 2+) ──────────────────────────────────────────────
  const TITULO = 'RELATÓRIO DE ENTREGA / INSTALAÇÃO';
  const headerFn = (currentPage, pageCount) => {
    if (currentPage === 1) return {};
    const logoCol = logoBase64
      ? { image: logoBase64, fit: [110, 38], margin: [0, 2, 6, 0] }
      : { text: 'FERREIRA ULHOA', bold: true, fontSize: 8 };
    return {
      margin: [30, 4, 30, 0],
      stack: [
        { columns: [
          logoCol,
          { text: TITULO, bold: true, fontSize: 9, alignment: 'center', margin: [0, 12, 0, 0] },
          { stack: [
            { text: numeroPedido || '-', bold: true, fontSize: 36, alignment: 'right', margin: [0, -4, 0, 0] },
            { text: [{ text: 'Orç: ', bold: true, fontSize: 7 }, { text: `${numeroOrcamento}   Data: ${data}`, fontSize: 7 }], alignment: 'right' },
            { text: `Pág. ${currentPage} / ${pageCount}`, fontSize: 7, alignment: 'right', color: '#64748b' }
          ] }
        ]},
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 535, y2: 2, lineWidth: 2, lineColor: COR_BORDA }] }
      ]
    };
  };

  // ── conteúdo ───────────────────────────────────────────────────────────────
  const content = [];

  // ── CABEÇALHO COMPLETO (página 1) ─────────────────────────────────────────
  const logoGrandeCol = logoBase64
    ? { image: logoBase64, fit: [160, 62], alignment: 'center' }
    : { text: 'FERREIRA ULHOA', bold: true, fontSize: 14, alignment: 'center' };

  content.push({
    table: {
      widths: ['30%', '70%'],
      body: [[
        { stack: [logoGrandeCol, { text: '(31) 98457-7573', fontSize: 8, alignment: 'center', margin: [0, 2, 0, 0] }], margin: [4, 6, 4, 6], vAlignment: 'center', alignment: 'center' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: TITULO, bold: true, fontSize: 12, alignment: 'center', colSpan: 2 }, {}],
              [
                { stack: [{ text: 'Nº do Pedido', fontSize: 8, bold: true }, { text: numeroPedido || '-', fontSize: 48, bold: true, margin: [0, -4, 0, 0] }] },
                { stack: [
                    { text: [{ text: 'Nº do orçamento: ', bold: true, fontSize: 9 }, { text: numeroOrcamento, fontSize: 9 }] },
                    { text: [{ text: 'Data: ', bold: true, fontSize: 9 }, { text: data, fontSize: 9 }] }
                  ], alignment: 'right', margin: [0, 6, 0, 0]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [6, 4, 4, 4]
        }
      ]]
    },
    layout: { defaultBorder: true },
    margin: [0, 0, 0, 2]
  });

  // Tabela de cliente (4 colunas)
  const clienteBody = [
    [{ text: 'Nome / Razão social:', bold: true, fontSize: 9 }, { text: nomeCliente, fontSize: 9 }, { text: 'Origem:', bold: true, fontSize: 9 }, { text: origem, fontSize: 9 }],
    [{ text: 'Endereço da obra:', bold: true, fontSize: 9 }, { text: enderecoObra, fontSize: 8, colSpan: 3 }, {}, {}]
  ];
  const listaContatos = clientes.length ? clientes : [{ nome: '-', nomeContato: '-', funcao: '-', telefone: '-', email: '-' }];
  listaContatos.forEach((c, idx) => {
    const label = idx === 0 ? 'Contato (Responsável)' : `Contato ${idx + 1}`;
    clienteBody.push([{ text: `${label}:`, bold: true, fontSize: 9 }, { text: c.nomeContato || c.nome || '-', fontSize: 9 }, { text: 'Função:', bold: true, fontSize: 9 }, { text: c.funcao || '-', fontSize: 9 }]);
    clienteBody.push([{ text: 'Telefone:', bold: true, fontSize: 9 }, { text: c.telefone || '-', fontSize: 9 }, { text: 'E-mail:', bold: true, fontSize: 9 }, { text: c.email || '-', fontSize: 9 }]);
  });

  content.push({ table: { widths: ['auto', '*', 'auto', '*'], body: clienteBody }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => COR_BORDA, vLineColor: () => COR_BORDA }, margin: [0, 0, 0, 2] });
  content.push({
    columns: [
      { table: { widths: ['*'], body: [[{ text: [{ text: 'Operador: ', bold: true, fontSize: 9 }, { text: operador, fontSize: 9 }], margin: [0, 2, 0, 2] }]] }, layout: { defaultBorder: true }, margin: [0, 0, 3, 0] },
      { table: { widths: ['*'], body: [[{ text: [{ text: 'Vendedor: ', bold: true, fontSize: 9 }, { text: vendedor, fontSize: 9 }], margin: [0, 2, 0, 2] }]] }, layout: { defaultBorder: true }, margin: [3, 0, 0, 0] }
    ],
    margin: [0, 0, 0, 6]
  });

  // ── Resumo dos Produtos ───────────────────────────────────────────────────
  const listaProd = produtos.length ? produtos : [{ seq: 1, titulo: '-', qtd: '-', descricao: '-' }];
  const prodBody = [
    [
      { text: 'Itens',      bold: true, fontSize: 9, fillColor: '#fafafa', alignment: 'center' },
      { text: 'Produto',    bold: true, fontSize: 9, fillColor: '#fafafa' },
      { text: 'Quantidade', bold: true, fontSize: 9, fillColor: '#fafafa', alignment: 'center' },
      { text: 'Descrição',  bold: true, fontSize: 9, fillColor: '#fafafa' }
    ],
    ...listaProd.map(p => [
      { text: String(p.seq), fontSize: 9, alignment: 'center', bold: true },
      { text: p.titulo, fontSize: 9 },
      { text: p.qtd, fontSize: 9, alignment: 'center' },
      { text: p.descricao, fontSize: 8 }
    ])
  ];

  content.push({ table: { widths: ['*'], body: [[{ text: 'Resumo dos Produtos', bold: true, fontSize: 10, alignment: 'center', fillColor: COR_HEADER, margin: [0, 3, 0, 3] }]] }, layout: { defaultBorder: true }, margin: [0, 0, 0, 0] });
  content.push({
    table: {
      headerRows: 1,
      widths: [50, 160, 82, '*'],
      body: prodBody,
      heights: [null, ...Array(listaProd.length).fill(PROD_ROW_H)]
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cccccc', vLineColor: () => '#cccccc' },
    margin: [0, 0, 0, 0]
  });

  // ── HISTÓRICO (última página) ──────────────────────────────────────────────
  const histBody = [
    [
      { text: 'Data',                               bold: true, fontSize: 9, fillColor: '#fafafa', alignment: 'center' },
      { text: 'RELATÓRIO DE ENTREGA / INSTALAÇÃO',  bold: true, fontSize: 9, fillColor: '#fafafa' }
    ],
    ...Array.from({ length: LINHAS_HIST }, () => [{ text: '', fontSize: 9 }, { text: '', fontSize: 9 }])
  ];

  content.push({ table: { widths: ['*'], body: [[{ text: 'HISTÓRICO', bold: true, fontSize: 11, alignment: 'center', fillColor: COR_HEADER, margin: [0, 4, 0, 4] }]] }, layout: { defaultBorder: true }, margin: [0, 0, 0, 0], pageBreak: 'before' });
  content.push({
    table: {
      headerRows: 1,
      widths: [90, '*'],
      body: histBody,
      heights: [null, ...Array(LINHAS_HIST).fill(HIST_ROW_H)]
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => COR_BORDA, vLineColor: () => COR_BORDA },
    margin: [0, 0, 0, 0]
  });

  // ── documento ──────────────────────────────────────────────────────────────
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, TOP_MARGIN, 30, 40],
    header: headerFn,
    content,
    defaultStyle: { fontSize: 9, font: 'Roboto' }
  };

  ocultarCarregando && ocultarCarregando();
  pdfMake.createPdf(docDefinition).download(`RelatorioEntrega_${numeroPedido}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// ETAPAS DO PROCESSO — pdfmake
// ══════════════════════════════════════════════════════════════════════════════
async function gerarEtapasDProcessoPdfmake() {
  mostrarCarregando && mostrarCarregando();

  try { await carregarPdfmake(); }
  catch (e) {
    ocultarCarregando && ocultarCarregando();
    alert('Erro ao carregar biblioteca de PDF. Verifique a conexão.');
    return;
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const getValue = (id) => document.getElementById(id)?.value?.trim() || '-';
  const getTextOrValue = (el) => {
    if (!el) return '';
    const v = (typeof el.value === 'string' ? el.value : '').trim();
    if (v) return v;
    return (typeof el.textContent === 'string' ? el.textContent : '').trim();
  };
  const fmtData = (iso) => {
    if (!iso || iso === '-') return '-';
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return '-';
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  };
  const sanitize = (txt) => {
    if (!txt) return '';
    return String(txt)
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/[─-╿]/g, '-').replace(/ /g, ' ')
      .replace(/–/g, '-').replace(/—/g, '--')
      .replace(/['']/g, "'").replace(/[""]/g, '"')
      .replace(/•/g, '-').replace(/·/g, '-').replace(/…/g, '...')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  };

  // ── dados gerais ───────────────────────────────────────────────────────────
  const numeroPedido    = getValue('numeroPedido');
  const numeroOrcamento = getValue('numeroOrcamento');
  const dataOrc         = getValue('dataOrcamento');
  const data = dataOrc !== '-' ? fmtData(dataOrc) : (() => {
    const h = new Date();
    return `${String(h.getDate()).padStart(2,'0')}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`;
  })();
  const vendedor = document.getElementById('vendedorResponsavel')?.selectedOptions?.[0]?.textContent?.trim() || '-';
  const operador = getValue('operadorInterno');
  const origem   = getValue('origemCliente');

  // ── clientes ───────────────────────────────────────────────────────────────
  const clientes = Array.from(document.querySelectorAll('#clientesWrapper .cliente-item'))
    .map(row => ({
      nome:        getTextOrValue(row.querySelector('.razaoSocial')),
      cpfCnpj:     getTextOrValue(row.querySelector('.cpfCnpj')),
      nomeContato: getTextOrValue(row.querySelector('.nomeContato')),
      funcao:      getTextOrValue(row.querySelector('.funcaoCliente')),
      telefone:    getTextOrValue(row.querySelector('.telefoneCliente')),
      email:       getTextOrValue(row.querySelector('.emailCliente')),
    }))
    .filter(c => c.nome || c.nomeContato || c.telefone || c.cpfCnpj || c.email);

  const nomeCliente  = (document.querySelector('input.razaoSocial')?.value || '').trim() || '-';
  const cpfCnpj      = (clientes[0] || {}).cpfCnpj || '-';
  const enderecoObra = sanitize(
    `Rua/Avenida: ${getValue('rua')}, Número: ${getValue('numero')}, Bairro: ${getValue('bairro')} - Complemento: ${getValue('complemento')} - Cidade: ${getValue('cidade')}/${getValue('estado')} - CEP: ${getValue('cep')}`
  );

  // ── produtos / descritivos ─────────────────────────────────────────────────
  const produtos = Array.from(document.querySelectorAll("#blocosProdutosContainer .main-container[id^='bloco-']"))
    .map(blocoEl => {
      const id     = blocoEl.id;
      const titulo = document.getElementById(`titulo-accordion-${id}`)?.textContent?.trim() || 'Produto sem nome';
      const tabela = document.getElementById(`tabela-${id}`);
      const linha  = tabela
        ? Array.from(tabela.querySelectorAll('tbody tr')).find(tr => !tr.querySelector('td[colspan]') && tr.querySelectorAll('td').length >= 2)
        : null;
      const qtd    = linha?.querySelector('input.quantidade')?.value?.trim() || '-';
      const desc   = document.getElementById(`resumo-${id}`)?.value?.trim() || '-';
      return { titulo: sanitize(titulo), qtd, descricao: sanitize(desc) };
    });

  const logoBase64 = await carregarLogoBase64('../js/logo.jpg');

  // ── cores / medidas ────────────────────────────────────────────────────────
  const COR_BORDA  = '#111111';
  const COR_HEADER = '#f2f2f2';
  const TOP_MARGIN = 68;
  const PROD_ROW_H = 29;
  const PROC_ROW_H = 19;

  // ── header compacto (págs 2+) ──────────────────────────────────────────────
  const headerFn = (currentPage, pageCount) => {
    if (currentPage === 1) return {};
    const logoCol = logoBase64
      ? { image: logoBase64, fit: [110, 38], margin: [0, 2, 6, 0] }
      : { text: 'FERREIRA ULHOA', bold: true, fontSize: 8 };
    return {
      margin: [30, 4, 30, 0],
      stack: [
        { columns: [
          logoCol,
          { text: 'ETAPAS DO PROCESSO', bold: true, fontSize: 10, alignment: 'center', margin: [0, 12, 0, 0] },
          { stack: [
            { text: numeroPedido || '-', bold: true, fontSize: 36, alignment: 'right', margin: [0, -4, 0, 0] },
            { text: [{ text: 'Orç: ', bold: true, fontSize: 7 }, { text: `${numeroOrcamento}   Data: ${data}`, fontSize: 7 }], alignment: 'right' },
            { text: `Pág. ${currentPage} / ${pageCount}`, fontSize: 7, alignment: 'right', color: '#64748b' }
          ], margin: [0, 0, 0, 0] }
        ]},
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 535, y2: 2, lineWidth: 2, lineColor: COR_BORDA }] }
      ]
    };
  };

  // ── conteúdo ───────────────────────────────────────────────────────────────
  const content = [];

  // ── CABEÇALHO COMPLETO (página 1) ─────────────────────────────────────────
  const logoGrandeCol = logoBase64
    ? { image: logoBase64, fit: [160, 62], alignment: 'center' }
    : { text: 'FERREIRA ULHOA', bold: true, fontSize: 14, alignment: 'center' };

  content.push({
    table: {
      widths: ['30%', '70%'],
      body: [[
        { stack: [logoGrandeCol, { text: '(31) 98457-7573', fontSize: 8, alignment: 'center', margin: [0, 2, 0, 0] }], margin: [4, 6, 4, 6], vAlignment: 'center', alignment: 'center' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'ETAPAS DO PROCESSO', bold: true, fontSize: 13, alignment: 'center', colSpan: 2 }, {}],
              [
                { stack: [{ text: 'Nº do Pedido', fontSize: 8, bold: true }, { text: numeroPedido || '-', fontSize: 48, bold: true, margin: [0, -4, 0, 0] }] },
                { stack: [
                    { text: [{ text: 'Nº do orçamento: ', bold: true, fontSize: 9 }, { text: numeroOrcamento, fontSize: 9 }] },
                    { text: [{ text: 'Data: ', bold: true, fontSize: 9 }, { text: data, fontSize: 9 }] }
                  ], alignment: 'right', margin: [0, 6, 0, 0]
                }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [6, 4, 4, 4]
        }
      ]]
    },
    layout: { defaultBorder: true },
    margin: [0, 0, 0, 2]
  });

  // Tabela de cliente (4 colunas)
  const clienteBody = [
    [{ text: 'Nome / Razão social:', bold: true, fontSize: 9 }, { text: nomeCliente, fontSize: 9 }, { text: 'Origem:', bold: true, fontSize: 9 }, { text: origem, fontSize: 9 }],
    [{ text: 'Endereço da obra:', bold: true, fontSize: 9 }, { text: enderecoObra, fontSize: 8, colSpan: 3 }, {}, {}]
  ];
  const listaContatos = clientes.length ? clientes : [{ nome: '-', nomeContato: '-', funcao: '-', telefone: '-', email: '-' }];
  listaContatos.forEach((c, idx) => {
    const label = idx === 0 ? 'Contato (Responsável)' : `Contato ${idx + 1}`;
    clienteBody.push([{ text: `${label}:`, bold: true, fontSize: 9 }, { text: c.nomeContato || c.nome || '-', fontSize: 9 }, { text: 'Função:', bold: true, fontSize: 9 }, { text: c.funcao || '-', fontSize: 9 }]);
    clienteBody.push([{ text: 'Telefone:', bold: true, fontSize: 9 }, { text: c.telefone || '-', fontSize: 9 }, { text: 'E-mail:', bold: true, fontSize: 9 }, { text: c.email || '-', fontSize: 9 }]);
  });

  content.push({ table: { widths: ['auto', '*', 'auto', '*'], body: clienteBody }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#111', vLineColor: () => '#111' }, margin: [0, 0, 0, 2] });
  content.push({
    columns: [
      { table: { widths: ['*'], body: [[{ text: [{ text: 'Operador: ', bold: true, fontSize: 9 }, { text: operador, fontSize: 9 }], margin: [0, 2, 0, 2] }]] }, layout: { defaultBorder: true }, margin: [0, 0, 3, 0] },
      { table: { widths: ['*'], body: [[{ text: [{ text: 'Vendedor: ', bold: true, fontSize: 9 }, { text: vendedor, fontSize: 9 }], margin: [0, 2, 0, 2] }]] }, layout: { defaultBorder: true }, margin: [3, 0, 0, 0] }
    ],
    margin: [0, 0, 0, 6]
  });

  // ── Produtos / Descritivos ─────────────────────────────────────────────────
  const listaProd = produtos.length ? produtos : [{ titulo: '-', qtd: '-', descricao: '-' }];
  const prodBody = [
    [
      { text: 'Item',       bold: true, fontSize: 9, fillColor: '#fafafa', alignment: 'center' },
      { text: 'Produto',    bold: true, fontSize: 9, fillColor: '#fafafa' },
      { text: 'Quantidade', bold: true, fontSize: 9, fillColor: '#fafafa', alignment: 'center' },
      { text: 'Descrição',  bold: true, fontSize: 9, fillColor: '#fafafa' }
    ],
    ...listaProd.map((p, i) => [
      { text: String(i + 1), fontSize: 9, alignment: 'center', bold: true },
      { text: p.titulo, fontSize: 9 },
      { text: p.qtd, fontSize: 9, alignment: 'center' },
      { text: p.descricao, fontSize: 8 }
    ])
  ];

  content.push({ table: { widths: ['*'], body: [[{ text: 'Produtos / Descritivos', bold: true, fontSize: 10, alignment: 'center', fillColor: COR_HEADER, margin: [0, 3, 0, 3] }]] }, layout: { defaultBorder: true }, margin: [0, 0, 0, 0] });
  content.push({
    table: {
      headerRows: 1,
      widths: [50, 160, 65, '*'],
      body: prodBody,
      heights: [null, ...Array(listaProd.length).fill(PROD_ROW_H)]
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#cccccc', vLineColor: () => '#cccccc' },
    margin: [0, 0, 0, 0]
  });

  // ── GRADE DE PROCESSOS (última página) ────────────────────────────────────
  const nomesProcessos = ['Desenho', 'Corte', 'Pré-Solda', 'Acabamento', 'Montagem', 'Finalização do Acabamento', 'Estrutura', 'Vidro'];
  const procTable = (titulo) => ({
    table: {
      widths: [28, 55, 55, '*'],
      body: [
        [{ text: titulo, bold: true, fontSize: 9, fillColor: COR_HEADER, colSpan: 4, alignment: 'center', margin: [0, 3, 0, 3] }, {}, {}, {}],
        [
          { text: 'Item',         bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Início',       bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Final',        bold: true, fontSize: 8, fillColor: '#fafafa', alignment: 'center' },
          { text: 'Responsáveis', bold: true, fontSize: 8, fillColor: '#fafafa' }
        ],
        ...Array.from({ length: 4 }, () => Array(4).fill({ text: '', fontSize: 8 }))
      ],
      heights: [null, null, PROC_ROW_H, PROC_ROW_H, PROC_ROW_H, PROC_ROW_H]
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => COR_BORDA, vLineColor: () => COR_BORDA },
    margin: [0, 0, 0, 4]
  });

  content.push({
    columns: [
      { width: '*', stack: nomesProcessos.slice(0, 4).map(procTable) },
      { width: 6,   text: '' },
      { width: '*', stack: nomesProcessos.slice(4).map(procTable) }
    ],
    pageBreak: 'before'
  });

  // ── documento ──────────────────────────────────────────────────────────────
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, TOP_MARGIN, 30, 40],
    header: headerFn,
    content,
    defaultStyle: { fontSize: 9, font: 'Roboto' }
  };

  ocultarCarregando && ocultarCarregando();
  pdfMake.createPdf(docDefinition).download(`EtapasProcesso_${numeroPedido}.pdf`);
}

