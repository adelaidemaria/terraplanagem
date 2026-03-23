
import React, { useState, useMemo } from 'react';
import { 
  Calculator, Receipt, Save, Info, TrendingUp, AlertTriangle, 
  Loader2, Printer, X, Filter, ChevronDown, Lock, Unlock 
} from 'lucide-react';
import { Sale, SimplesNacionalFaturamento } from '../types';
import { supabase } from '../lib/supabase';

// ===== TABELA SIMPLES NACIONAL - ANEXO III (LC 123/2006) =====
// issPercent = % da alíquota efetiva que corresponde ao ISS (só incide em Serviços, NÃO em Locação)
const ANEXO_III_FAIXAS = [
  { faixa: 1, limiteInf: 0,            limiteSup: 180000,    aliquota: 0.06,   deducao: 0,       issPercent: 0.335 },
  { faixa: 2, limiteInf: 180000.01,    limiteSup: 360000,    aliquota: 0.112,  deducao: 9360,    issPercent: 0.320 },
  { faixa: 3, limiteInf: 360000.01,    limiteSup: 720000,    aliquota: 0.135,  deducao: 17640,   issPercent: 0.325 },
  { faixa: 4, limiteInf: 720000.01,    limiteSup: 1800000,   aliquota: 0.16,   deducao: 35640,   issPercent: 0.325 },
  { faixa: 5, limiteInf: 1800000.01,   limiteSup: 3600000,   aliquota: 0.21,   deducao: 125640,  issPercent: 0.335 },
  { faixa: 6, limiteInf: 3600000.01,   limiteSup: 4800000,   aliquota: 0.33,   deducao: 648000,  issPercent: 0.000 },
];

interface SimplesNacionalManagerProps {
  sales: Sale[];
  faturamentos: SimplesNacionalFaturamento[];
  setFaturamentos: React.Dispatch<React.SetStateAction<SimplesNacionalFaturamento[]>>;
}

// Estilos para impressão profissional
const printStyles = `
  @media print {
    @page { 
      size: landscape; 
      margin: 0; /* Marginal zero para total controle via CSS */
    }

    /* Reset global absoluto */
    html, body, #root {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      display: block !important;
      }
  
      /* Esconder elementos de interface de forma agressiva (altura zero) */
      nav, header, aside, .print-hidden, .print-hidden-content, .print-hidden-wrapper, button {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      
      /* Converter o modal em fluxo comum e isolado */
      .fixed.inset-0, [role="dialog"], .print-modal-root {
        position: static !important;
        display: block !important;
        background: white !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        transform: none !important;
      }
  
      .max-h-\[90vh\], .max-w-4xl {
        max-height: none !important;
        max-width: none !important;
        width: 100% !important;
      }
  
      .rounded-2xl, .shadow-2xl, .border {
        border-radius: 0 !important;
        box-shadow: none !important;
      }
  
      /* Área do relatório - Com suas próprias margens de segurança */
      #print-area {
        display: block !important;
        visibility: visible !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 10mm !important; /* Ajustado */
      }
    }

    .print-grid-cols-2 {
      display: grid !important;
      grid-template-columns: 1fr 1.25fr !important;
      gap: 20px !important; /* Reduzido o gap */
    }

    .print-grid-cols-2 > section {
      grid-column: span 1 !important;
    }

    section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 20px !important;
    }

    section:last-of-type {
      margin-bottom: 0 !important;
      page-break-after: avoid !important;
    }

    /* Forçar cores e remover transbordos desnecessários */
    * { 
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
      border-style: solid !important; /* Garante que nada fique pontilhado acidentalmente */
    }

    /* Estilos de fundo fixos para impressão */
    .bg-slate-50 { background-color: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
    .bg-emerald-50 { background-color: #ecfdf5 !important; border-top: 2px solid #10b981 !important; }
    .bg-indigo-50\/50 { background-color: #f0f4ff !important; border: 1px solid #e0e7ff !important; }
    .bg-violet-50\/50 { background-color: #f5f3ff !important; border: 1px solid #ddd6fe !important; }
  }
  
  /* Números tabulares para melhor leitura de valores */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
`;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val * 100) + '%';

const parseCurrencyInput = (val: string): number => {
  const cleanValue = val.replace(/\D/g, '');
  return Number(cleanValue) / 100;
};

const formatInputCurrency = (value: number): string => {
  return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatAsYouType = (rawInput: string): string => {
  const numericValue = parseCurrencyInput(rawInput);
  return formatInputCurrency(numericValue);
};

const MESES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const getAnoMesKey = (year: number, month: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
};

const getAnoMesLabel = (anoMes: string): string => {
  const [year, month] = anoMes.split('-');
  return `${MESES_NOMES[parseInt(month) - 1]}/${year}`;
};

const getAnoMesLabelShort = (anoMes: string): string => {
  const [year, month] = anoMes.split('-');
  return `${month}/${year}`;
};

// Encontra a faixa baseada no RBT12
function encontrarFaixa(rbt12: number) {
  let faixaEncontrada = ANEXO_III_FAIXAS[ANEXO_III_FAIXAS.length - 1];
  for (const f of ANEXO_III_FAIXAS) {
    if (rbt12 <= f.limiteSup) {
      faixaEncontrada = f;
      break;
    }
  }
  return faixaEncontrada;
}

// Calcula o DAS separando Serviço (com ISS) e Locação (sem ISS)
function calcularSimplesNacional(rbt12: number, fatServico: number, fatLocacao: number) {
  const fatTotal = fatServico + fatLocacao;
  if (rbt12 <= 0 || fatTotal <= 0) {
    return { faixa: 0, aliquotaNominal: 0, deducao: 0, aliquotaEfetiva: 0, aliquotaSemIss: 0, dasServico: 0, dasLocacao: 0, das: 0, issPercent: 0 };
  }

  const faixaEncontrada = encontrarFaixa(rbt12);
  const aliquotaEfetiva = (rbt12 * faixaEncontrada.aliquota - faixaEncontrada.deducao) / rbt12;

  // Alíquota SEM ISS (para locação) = alíquota efetiva × (1 - % ISS da faixa)
  const aliquotaSemIss = aliquotaEfetiva * (1 - faixaEncontrada.issPercent);

  // DAS = Serviço × alíquota completa + Locação × alíquota sem ISS
  const dasServico = aliquotaEfetiva * fatServico;
  const dasLocacao = aliquotaSemIss * fatLocacao;
  const das = dasServico + dasLocacao;

  return {
    faixa: faixaEncontrada.faixa,
    aliquotaNominal: faixaEncontrada.aliquota,
    deducao: faixaEncontrada.deducao,
    aliquotaEfetiva,
    aliquotaSemIss,
    issPercent: faixaEncontrada.issPercent,
    dasServico,
    dasLocacao,
    das
  };
}

const SimplesNacionalManager: React.FC<SimplesNacionalManagerProps> = ({ sales, faturamentos, setFaturamentos }) => {
  return (
    <>
      <style>{printStyles}</style>
      <SimplesNacionalContent 
        sales={sales} 
        faturamentos={faturamentos} 
        setFaturamentos={setFaturamentos} 
      />
    </>
  );
};

const SimplesNacionalContent: React.FC<SimplesNacionalManagerProps> = ({ sales, faturamentos, setFaturamentos }) => {
  const [activeTab, setActiveTab] = useState<'faturamento' | 'simples'>('faturamento');
  const [faturamentoFilter, setFaturamentoFilter] = useState<'atual' | 'ano' | '12meses' | 'todos'>('12meses');
  const [unlockedRows, setUnlockedRows] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState<string | null>(null);

  // Gera lista de meses para faturamento: filtrados pelo estado faturamentoFilter
  const mesesFaturamento = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-indexed

    const meses: string[] = [];
    
    // Base inicial variando pelo filtro
    let mesesParaTras = 11; // Default 12 meses (0 a 11)
    if (faturamentoFilter === 'atual') mesesParaTras = 0;
    if (faturamentoFilter === 'ano') mesesParaTras = mesAtual;
    if (faturamentoFilter === 'todos') mesesParaTras = 23; // 24 meses como base para "Todos"

    for (let i = mesesParaTras; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      meses.push(getAnoMesKey(d.getFullYear(), d.getMonth()));
    }

    // Incluir meses que possuem vendas lançadas (inclusive futuros)
    for (const sale of sales) {
      if (!sale.date) continue;
      const d = new Date(sale.date);
      const saleKey = getAnoMesKey(d.getFullYear(), d.getMonth());
      
      // Se for "Todos", inclui qualquer mês de venda
      if (faturamentoFilter === 'todos') {
        meses.push(saleKey);
      } else if (faturamentoFilter === 'ano') {
        if (d.getFullYear() === anoAtual) meses.push(saleKey);
      }
    }

    // Incluir meses que já possuem faturamento salvo no banco
    for (const f of faturamentos) {
      if (!f.anoMes) continue;
      const [year, month] = f.anoMes.split('-').map(Number);
      const fKey = f.anoMes; // Ja está no formato YYYY-MM
      
      if (faturamentoFilter === 'todos') {
        meses.push(fKey);
      } else if (faturamentoFilter === 'ano') {
        if (year === anoAtual) meses.push(fKey);
      }
    }

    // Remove duplicatas e ordena (decrescente para faturamento)
    return [...new Set(meses)].sort().reverse();
  }, [sales, faturamentos, faturamentoFilter]);

  // Faturamento automático separado por tipo (Serviço vs Locação) — só NFs
  // IMPORTANTE: Para o Simples Nacional, usamos sempre o VALOR BRUTO (Total + DeduçÍµes) como base de cálculo
  const faturamentoVendas = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sale of sales) {
      if (!sale.date || sale.isNoNf) continue;
      const [year, month] = sale.date.split('-');
      const key = `${year}-${month}`;
      const valorBruto = sale.totalValue + (sale.deductions || 0);
      map[key] = (map[key] || 0) + valorBruto;
    }
    return map;
  }, [sales]);

  // Faturamento separado por tipo para cálculo correto do ISS
  const faturamentoPorTipo = useMemo(() => {
    const map: Record<string, { servico: number; locacao: number; deducoes: number }> = {};
    for (const sale of sales) {
      if (!sale.date || sale.isNoNf) continue;
      const [year, month] = sale.date.split('-');
      const key = `${year}-${month}`;
      if (!map[key]) map[key] = { servico: 0, locacao: 0, deducoes: 0 };
      
      const valorBruto = sale.totalValue + (sale.deductions || 0);
      const isRetido = (sale.deductions || 0) > 0;

      if (sale.saleType === 'Locação') {
        map[key].locacao += valorBruto;
      } else {
        map[key].servico += valorBruto;
        if (isRetido) {
          map[key].deducoes += (sale.deductions || 0);
        }
      }
    }
    return map;
  }, [sales]);

  // Monta mapa completo: primeiro manual, depois automático
  const faturamentoMap = useMemo(() => {
    const map: Record<string, { valor: number; origem: 'manual' | 'automatico'; id?: string }> = {};

    // Primeiro, preenche com dados das vendas (automático)
    for (const [key, valor] of Object.entries(faturamentoVendas)) {
      map[key] = { valor: valor as number, origem: 'automatico' };
    }

    // Depois, sobrescreve com dados salvos no banco (manual tem prioridade)
    for (const f of faturamentos) {
      map[f.anoMes] = { valor: f.valor, origem: f.origem as 'manual' | 'automatico', id: f.id };
    }

    return map;
  }, [faturamentoVendas, faturamentos]);

  // Obter faturamento de um mês (prioriza dados salvos, fallback para vendas)
  const getFaturamentoMes = (anoMes: string): number => {
    const saved = faturamentos.find(f => f.anoMes === anoMes);
    if (saved) return saved.valor;
    return faturamentoVendas[anoMes] || 0;
  };

  // Calcula RBT12 para um determinado mês (soma dos 12 meses ANTERIORES)
  const calcularRBT12 = (anoMes: string): number => {
    const list = getRBT12Months(anoMes);
    return list.reduce((acc, item) => acc + item.valor, 0);
  };

  // Retorna a lista dos 12 meses e seus faturamentos usados para o RBT12
  const getRBT12Months = (anoMes: string) => {
    const [year, month] = anoMes.split('-').map(Number);
    const months: { label: string; valor: number }[] = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(year, month - 1 - i, 1);
      const key = getAnoMesKey(d.getFullYear(), d.getMonth());
      months.push({ 
        label: getAnoMesLabelShort(key), 
        valor: getFaturamentoMes(key) 
      });
    }
    return months.reverse(); // Do mais antigo para o mais recente
  };

  const handleValueChange = (anoMes: string, rawValue: string) => {
    // Formata em tempo real com separador de milhar
    const formatted = formatAsYouType(rawValue);
    setEditValues(prev => ({ ...prev, [anoMes]: formatted }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Montar registros para salvar
      const recordsToSave = [];
      for (const [anoMes, rawValue] of Object.entries(editValues)) {
        const valor = parseCurrencyInput(rawValue as string);
        const existing = faturamentos.find(f => f.anoMes === anoMes);
        recordsToSave.push({
          id: existing?.id || crypto.randomUUID(),
          ano_mes: anoMes,
          valor: valor,
          origem: 'manual',
          created_at: existing?.createdAt || Date.now()
        });
      }

      if (recordsToSave.length === 0) {
        setEditValues({});
        setIsSaving(false);
        return;
      }

      // Salvar direto no Supabase com onConflict para evitar erro de chave duplicada
      const { error } = await supabase
        .from('simples_nacional_faturamento')
        .upsert(recordsToSave, { onConflict: 'ano_mes' });

      if (error) {
        alert(`Erro ao salvar: ${error.message}`);
        setIsSaving(false);
        return;
      }

      // Recarregar dados do banco para sincronizar estado local
      const { data: refreshed } = await supabase
        .from('simples_nacional_faturamento')
        .select('*');

      if (refreshed) {
        const converted: SimplesNacionalFaturamento[] = refreshed.map((r: any) => ({
          id: r.id,
          anoMes: r.ano_mes,
          valor: Number(r.valor),
          origem: r.origem,
          createdAt: Number(r.created_at)
        }));
        setFaturamentos(converted);
      }

      setEditValues({});
      setUnlockedRows({}); // Trava os campos novamente após salvar
      setSaveMessage('Faturamento salvo com sucesso!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Erro inesperado: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Meses para a aba "Simples a Pagar" (de 01/2026 ao mês atual), respeitando o filtro global
  const mesesSimples = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesesBase: string[] = [];
    
    const anoInicio = 2026;
    const mesInicio = 0; 

    let curr = new Date(anoInicio, mesInicio, 1);
    while (curr <= hoje) {
      mesesBase.push(getAnoMesKey(curr.getFullYear(), curr.getMonth()));
      curr.setMonth(curr.getMonth() + 1);
    }

    for (const sale of sales) {
      if (!sale.date || sale.isNoNf) continue;
      const d = new Date(sale.date);
      if (d.getFullYear() >= 2026) {
        mesesBase.push(getAnoMesKey(d.getFullYear(), d.getMonth()));
      }
    }

    // Filtra com base no faturamentoFilter
    const todosResultados = [...new Set(mesesBase)].sort();
    
    let filtrados = todosResultados;
    if (faturamentoFilter === 'atual') {
      const chaveAtual = getAnoMesKey(anoAtual, mesAtual);
      filtrados = todosResultados.filter(m => m === chaveAtual);
    } else if (faturamentoFilter === 'ano') {
      filtrados = todosResultados.filter(m => m.startsWith(String(anoAtual)));
    } else if (faturamentoFilter === '12meses') {
      const limite = new Date(anoAtual, mesAtual - 11, 1);
      const limiteChave = getAnoMesKey(limite.getFullYear(), limite.getMonth());
      filtrados = todosResultados.filter(m => m >= limiteChave);
    }

    return filtrados.reverse();
  }, [sales, faturamentoFilter]);

  const hasUnsavedChanges = Object.keys(editValues).length > 0;

  return (
    <div className="space-y-6">
      {/* Container de fundo (escondido na impressão) */}
      <div className="print-hidden-content flex flex-col gap-6">
        {/* Header Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setActiveTab('faturamento')}
              className={`flex items-center space-x-2 px-6 py-3 font-bold text-sm transition-all ${
                activeTab === 'faturamento'
                  ? 'bg-amber-500 text-white shadow-inner'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <TrendingUp size={18} />
              <span>Faturamento Mensal</span>
            </button>
            <button
              onClick={() => setActiveTab('simples')}
              className={`flex items-center space-x-2 px-6 py-3 font-bold text-sm transition-all ${
                activeTab === 'simples'
                  ? 'bg-emerald-600 text-white shadow-inner'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Calculator size={18} />
              <span>Simples a Pagar</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter size={16} className="text-slate-400" />
              </div>
              <select
                value={faturamentoFilter}
                onChange={(e) => setFaturamentoFilter(e.target.value as any)}
                className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl appearance-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300"
              >
                <option value="atual">Mês Atual</option>
                <option value="ano">Ano Atual</option>
                <option value="12meses">Últimos 12 meses</option>
                <option value="todos">Todos Meses</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ===== ABA FATURAMENTO MENSAL ===== */}
        {activeTab === 'faturamento' && (
          <div className="space-y-4">
            {/* Info Box */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Como funciona?</p>
                <p className="text-xs text-amber-700 mt-1">
                  Informe o faturamento bruto de cada mês. Meses com vendas lançadas no <strong>"Faturamento"</strong> do sistema já aparecem preenchidos automaticamente (tag <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">AUTO</span>).
                  Você pode sobrescrever qualquer valor manualmente. Os últimos 12 meses são usados para calcular o RBT12 na aba "Simples a Pagar".
                </p>
              </div>
            </div>

            {/* Grid de Faturamento */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Receipt size={18} className="text-amber-400" />
                Faturamento Mensal — {
                  faturamentoFilter === 'atual' ? 'Mês Atual' :
                  faturamentoFilter === 'ano' ? 'Ano Atual' :
                  faturamentoFilter === '12meses' ? 'Últimos 12 meses' :
                  'Todos os Meses'
                }
                <span className="ml-3 text-[10px] font-medium bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600 uppercase tracking-tighter">
                  Trava de Segurança (Edição Protegida)
                </span>
              </h3>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg transition-colors"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
            </div>

            {saveMessage && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 text-sm font-bold text-emerald-700 flex items-center gap-2">
                <span>✅</span> {saveMessage}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase w-48">Mês/Ano</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase text-right">Faturamento Bruto (R$)</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase text-center w-32">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mesesFaturamento.map((anoMes) => {
                    const data = faturamentoMap[anoMes];
                    const valorSalvo = data?.valor || 0;
                    const origem = data?.origem || (faturamentoVendas[anoMes] ? 'automatico' : 'manual');
                    const isEditing = editValues[anoMes] !== undefined;
                    const displayValue = isEditing ? editValues[anoMes] : formatInputCurrency(valorSalvo);

                    const hoje = new Date();
                    const [year, month] = anoMes.split('-').map(Number);
                    const isFuturo = new Date(year, month - 1, 1) > hoje;
                    const isAtual = year === hoje.getFullYear() && month - 1 === hoje.getMonth();

                    return (
                      <tr
                        key={anoMes}
                        className={`hover:bg-slate-50 transition-colors ${isAtual ? 'bg-amber-50/50' : ''} ${isFuturo ? 'opacity-50' : ''}`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isAtual ? 'text-amber-700' : 'text-slate-800'}`}>
                              {getAnoMesLabel(anoMes)}
                            </span>
                            {isAtual && (
                              <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                                Mês Atual
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end items-center gap-3">
                            <button
                              onClick={() => {
                                if (!unlockedRows[anoMes]) {
                                  setConfirmUnlock(anoMes);
                                } else {
                                  setUnlockedRows(prev => ({ ...prev, [anoMes]: false }));
                                }
                              }}
                              className={`p-2 rounded-lg transition-all ${
                                unlockedRows[anoMes] 
                                  ? 'bg-amber-100 text-amber-600 shadow-sm border border-amber-200' 
                                  : 'text-amber-500 hover:bg-amber-50 hover:text-amber-600'
                              }`}
                              title={unlockedRows[anoMes] ? "Valor desbloqueado para edição" : "Cadeado de Segurança: Clique para editar"}
                            >
                              {unlockedRows[anoMes] ? <Unlock size={18} /> : <Lock size={18} />}
                            </button>

                            <div className="relative w-48">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                disabled={!unlockedRows[anoMes]}
                                className={`w-full text-right pr-4 pl-8 py-2 border rounded-lg text-sm font-bold outline-none transition-all ${
                                  unlockedRows[anoMes]
                                    ? 'border-amber-400 bg-white text-slate-800 shadow-md ring-2 ring-amber-500/10'
                                    : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed border-dashed'
                                }`}
                                value={displayValue}
                                onChange={(e) => handleValueChange(anoMes, e.target.value)}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {origem === 'automatico' ? (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-black uppercase">
                              Auto
                            </span>
                          ) : valorSalvo > 0 ? (
                            <span className="text-[10px] bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-black uppercase">
                              Manual
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-400 px-2.5 py-1 rounded-full font-black uppercase">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé com totais */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-slate-500">
                <strong className="text-slate-700">{mesesFaturamento.length}</strong> meses listados
              </div>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg transition-colors"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Salvando...' : 'Salvar Todas as AlteraçÍµes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== ABA SIMPLES A PAGAR ===== */}
      {activeTab === 'simples' && (
        <div className="space-y-4">
          {/* Tabela de referência */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <Info size={16} />
              Tabela de Referência — Anexo III (Serviços e Locação)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-emerald-700">
                    <th className="text-left py-1.5 px-3 font-bold">Faixa</th>
                    <th className="text-left py-1.5 px-3 font-bold">RBT12</th>
                    <th className="text-right py-1.5 px-3 font-bold">Alíq. Nominal</th>
                    <th className="text-right py-1.5 px-3 font-bold">Parcela Deduzir</th>
                    <th className="text-right py-1.5 px-3 font-bold">ISS %</th>
                  </tr>
                </thead>
                <tbody className="text-emerald-900 font-medium">
                  {ANEXO_III_FAIXAS.map(f => (
                    <tr key={f.faixa} className="border-t border-emerald-200/50">
                      <td className="py-1.5 px-3 font-bold">{f.faixa}ª</td>
                      <td className="py-1.5 px-3">
                        {f.limiteInf === 0 ? 'Até' : `De ${formatCurrency(f.limiteInf)} a`} {formatCurrency(f.limiteSup)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold">{(f.aliquota * 100).toFixed(1)}%</td>
                      <td className="py-1.5 px-3 text-right">{formatCurrency(f.deducao)}</td>
                      <td className="py-1.5 px-3 text-right">{(f.issPercent * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-emerald-600 font-medium">
                <strong>Fórmula:</strong> Alíq. Efetiva = (RBT12 × Alíq. Nominal − Dedução) ÷ RBT12
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">
                <strong>DAS</strong> = (Serviço × Alíq. Efetiva) + (Locação × Alíq. Efetiva × (1 − ISS%))
              </p>
              <p className="text-[11px] text-amber-700 font-bold bg-amber-50 inline-block px-2 py-0.5 rounded">
                ⚠️ Notas de Locação NÃO pagam ISS — só incidem os demais tributos (IRPJ, CSLL, COFINS, PIS, CPP)
              </p>
            </div>
          </div>

          {/* Tabela de cálculo mês a mês */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-700 text-white px-6 py-4">
              <h3 className="font-bold flex items-center gap-2">
                <Calculator size={18} className="text-emerald-300" />
                Simples a Pagar — {
                  faturamentoFilter === 'atual' ? 'Mês Atual' :
                  faturamentoFilter === 'ano' ? 'Ano Atual' :
                  faturamentoFilter === '12meses' ? 'Últimos 12 meses' :
                  'Todos os Meses'
                }
              </h3>
              <p className="text-xs text-emerald-200 mt-1">
                {faturamentoFilter === 'todos' ? 'Todo o histórico a partir de 2026.' : 'Período filtrado conforme seleção no topo.'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1300px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase">Mês Ref.</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-right">Serviço (NF)</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-right">Locação (NF)</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-emerald-700 uppercase text-right">Total NF</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-rose-500 uppercase text-right">ISS Retido</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-right">RBT12</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-center">Faixa</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-right">Alíq. Efet.</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-right">Alíq. s/ISS</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-right font-black">DAS a Pagar</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase text-center">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mesesSimples.map((anoMes) => {
                    const tipoData = faturamentoPorTipo[anoMes] || { servico: 0, locacao: 0, deducoes: 0 };
                    const fatServico = tipoData.servico;
                    const fatLocacao = tipoData.locacao;
                    const fatTotal = fatServico + fatLocacao;
                    const rbt12 = calcularRBT12(anoMes);
                    const result = calcularSimplesNacional(rbt12, fatServico, fatLocacao);
                    
                    // Abate o ISS Retido do DAS final
                    const issRetido = tipoData.deducoes;
                    const dasFinal = Math.max(0, result.das - issRetido);

                    const [year, month] = anoMes.split('-').map(Number);
                    const vencDate = new Date(year, month, 20);
                    const vencStr = `${String(vencDate.getDate()).padStart(2, '0')}/${String(vencDate.getMonth() + 1).padStart(2, '0')}/${vencDate.getFullYear()}`;

                    const semFaturamento = fatTotal <= 0;
                    const semRbt12 = rbt12 <= 0;

                    return (
                      <tr
                        key={anoMes}
                        className={`transition-colors ${semFaturamento ? 'bg-slate-50/50 opacity-60' : 'hover:bg-emerald-50/30'}`}
                      >
                        <td className="px-3 py-3">
                          <span className="font-bold text-sm text-slate-800">{getAnoMesLabelShort(anoMes)}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {fatServico > 0 ? (
                            <span className="text-sm font-bold text-slate-700">{formatCurrency(fatServico)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {fatLocacao > 0 ? (
                            <span className="text-sm font-bold text-slate-700">{formatCurrency(fatLocacao)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {fatTotal > 0 ? (
                            <span className="text-sm font-black text-emerald-700">{formatCurrency(fatTotal)}</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sem fat.</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {issRetido > 0 ? (
                            <span className="text-sm font-bold text-rose-500">{formatCurrency(issRetido)}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {semRbt12 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs text-slate-700 font-medium">{formatCurrency(rbt12)}</span>
                              <button 
                                onClick={() => setReportMonth(anoMes)}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all flex-shrink-0"
                                title="Ver Memória de Cálculo"
                              >
                                <Printer size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {result.faixa > 0 ? (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              result.faixa <= 2 ? 'bg-emerald-100 text-emerald-700' :
                              result.faixa <= 4 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {result.faixa}ª
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {result.aliquotaEfetiva > 0 ? (
                            <span className="text-xs font-bold text-indigo-700">{formatPercent(result.aliquotaEfetiva)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {result.aliquotaSemIss > 0 ? (
                            <span className="text-xs font-bold text-violet-600">{formatPercent(result.aliquotaSemIss)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {dasFinal > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                                {formatCurrency(dasFinal)}
                              </span>
                              {!semFaturamento && (
                                <span className="text-[9px] text-slate-500">
                                  Serv: {formatCurrency(result.dasServico)} + Loc: {formatCurrency(result.dasLocacao)}
                                </span>
                              )}
                            </div>
                          ) : semFaturamento ? (
                            <span className="text-xs text-slate-400 italic">—</span>
                          ) : (
                            <span className="text-xs text-amber-600 flex items-center justify-end gap-1">
                              <AlertTriangle size={12} />
                              Sem RBT12
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {dasFinal > 0 ? (
                            <span className="text-xs font-bold text-slate-600">{vencStr}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-emerald-50 border-t-2 border-emerald-300">
                  <tr>
                    <td className="px-6 py-4 text-sm text-slate-800 uppercase tracking-wider font-black" colSpan={9}>
                      Total DAS no Período
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className="text-lg font-black text-emerald-800 bg-emerald-100/50 px-4 py-1.5 rounded-xl border border-emerald-200">
                        {formatCurrency(
                          mesesSimples.reduce((acc, anoMes) => {
                            const tipoData = faturamentoPorTipo[anoMes] || { servico: 0, locacao: 0, deducoes: 0 };
                            const rbt = calcularRBT12(anoMes);
                            const res = calcularSimplesNacional(rbt, tipoData.servico, tipoData.locacao);
                            return acc + Math.max(0, res.das - tipoData.deducoes);
                          }, 0)
                        )}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div> {/* Fim do print-hidden-content */}

      {/* ===== MODAL DE RELATÓRIO (MEMÓRIA DE CÍLCULO) ===== */}
      {reportMonth && (() => {
        const tipoData = faturamentoPorTipo[reportMonth] || { servico: 0, locacao: 0 };
        const fatServico = tipoData.servico;
        const fatLocacao = tipoData.locacao;
        const rbt12 = calcularRBT12(reportMonth);
        const rbtList = getRBT12Months(reportMonth);
        const result = calcularSimplesNacional(rbt12, fatServico, fatLocacao);
        const faixaObj = ANEXO_III_FAIXAS.find(f => f.faixa === result.faixa);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] overflow-y-auto p-2 sm:p-6 py-10 sm:py-16 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col h-auto min-h-fit border border-slate-200 print:shadow-none print:border-none print:p-0 print:static print:block">
              
              {/* Header Modal - Sticky para facilitar navegação */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur rounded-t-2xl sticky top-0 z-10 print:hidden transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                    <Calculator size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">CÁLCULO SIMPLES NACIONAL</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Competência: {getAnoMesLabel(reportMonth)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Printer size={18} />
                    Imprimir Relatório
                  </button>
                  <button
                    onClick={() => setReportMonth(null)}
                    className="p-2.5 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all active:scale-90"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Conteúdo Relatório */}
              <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
                <div id="print-area" className="space-y-8 pb-16">
                  
                  {/* Cabeçalho de Impressão (Oculto na tela) */}
                  <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
                    <div className="flex justify-between items-center whitespace-nowrap gap-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-white flex-shrink-0">
                          <Calculator size={22} />
                        </div>
                        <div>
                          <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">TERRAPLANAGEM BAURU</h1>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Gestão Administrativa & Financeira</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <h2 className="text-sm font-black text-slate-900 uppercase">Extrato de Memória de Cálculo</h2>
                        <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-0.5 uppercase">EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-6 text-sm">
                      <p className="bg-slate-100 px-3 py-1 rounded font-bold">COMPETÊNCIA: {getAnoMesLabel(reportMonth).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="print-grid-cols-2 lg:grid lg:grid-cols-12 lg:gap-8">
                    <section className="lg:col-span-5 print:mb-0">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-3">
                        1. Apuração da Receita Bruta (RBT12)
                      </h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 bg-slate-50 p-5 rounded-xl border border-slate-200 print:bg-white print:border-slate-200 print:p-0 print:border-none">
                        {rbtList.map((m, idx) => (
                          <div key={idx} className={`flex justify-between text-xs py-1.5 tabular-nums ${idx === rbtList.length - 1 ? '' : 'border-b border-slate-200'}`}>
                            <span className="text-slate-500 font-medium">{m.label}</span>
                            <span className="font-bold text-slate-800">{formatCurrency(m.valor)}</span>
                          </div>
                        ))}
                        <div className="col-span-2 mt-4 p-3 bg-white border-2 border-slate-800 flex justify-between items-center print:mt-2 print:p-2">
                          <span className="font-black text-slate-900 text-[10px] uppercase">RBT12 ACUMULADO:</span>
                          <span className="text-lg font-black text-slate-900 tabular-nums">{formatCurrency(rbt12)}</span>
                        </div>
                      </div>
                    </section>

                    <section className="lg:col-span-7 print:mb-0">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-3">
                        2. Parametrização do Cálculo (Anexo III)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 print:bg-white print:border-slate-100">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">RBT12 Apurado:</span>
                            <span className="font-bold">{formatCurrency(rbt12)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Faixa de Tributação:</span>
                            <span className="font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] uppercase">{result.faixa}ª Faixa</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Alíquota Nominal:</span>
                            <span className="font-bold">{(result.aliquotaNominal * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Parcela a Deduzir:</span>
                            <span className="font-bold">{formatCurrency(result.deducao)}</span>
                          </div>
                        </div>

                        <div className="space-y-3 bg-violet-50/50 p-5 rounded-xl border border-violet-100 print:bg-white print:border-slate-100">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Alíquota Efetiva:</span>
                            <span className="font-black text-indigo-700">{formatPercent(result.aliquotaEfetiva)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Parcela ISS na Faixa:</span>
                            <span className="font-bold text-slate-700">{(result.issPercent * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-violet-200/50 pt-2 mt-2">
                            <span className="text-slate-800 font-bold">Alíquota s/ ISS:</span>
                            <span className="font-black text-violet-700">{formatPercent(result.aliquotaSemIss)}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 italic mt-1 leading-tight">
                            *Alíquota s/ ISS = Efetiva × (1 − {(result.issPercent * 100).toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Seção 3: Detalhamento do DAS por Natureza */}
                  <section>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-3">
                      3. Apuração Final do DAS (Documento de Arrecadação)
                    </h4>
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3 font-bold text-slate-600">Natureza da Receita</th>
                            <th className="px-5 py-3 font-bold text-slate-600 text-right">Base de Cálculo (R$)</th>
                            <th className="px-5 py-3 font-bold text-slate-600 text-right">Alíquota Efetiva</th>
                            <th className="px-5 py-3 font-bold text-slate-600 text-right">Imposto Devido (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-5 py-4 font-medium text-slate-700">Prestação de Serviços (com ISS)</td>
                            <td className="px-5 py-4 text-right font-medium">{formatCurrency(fatServico)}</td>
                            <td className="px-5 py-4 text-right font-bold text-indigo-700">{formatPercent(result.aliquotaEfetiva)}</td>
                            <td className="px-5 py-4 text-right font-bold">{formatCurrency(result.dasServico)}</td>
                          </tr>
                          <tr>
                            <td className="px-5 py-4 font-medium text-slate-700">Locação de Bens Móveis (sem ISS)</td>
                            <td className="px-5 py-4 text-right font-medium">{formatCurrency(fatLocacao)}</td>
                            <td className="px-5 py-4 text-right font-bold text-violet-600">{formatPercent(result.aliquotaSemIss)}</td>
                            <td className="px-5 py-4 text-right font-bold">{formatCurrency(result.dasLocacao)}</td>
                          </tr>
                          {tipoData.deducoes > 0 && (
                            <tr className="bg-slate-50/50 italic text-slate-500">
                              <td colSpan={3} className="px-5 py-2 text-right text-xs">(-) ISS RETIDO s/ NFS (já pago pelo cliente):</td>
                              <td className="px-5 py-2 text-right text-xs">(- {formatCurrency(tipoData.deducoes)})</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-emerald-50 border-t-2 border-emerald-300">
                          <tr>
                            <td colSpan={3} className="px-5 py-4 font-black text-emerald-900 uppercase">Valor Total do DAS a Recolher:</td>
                            <td className="px-5 py-4 text-right font-black text-lg text-emerald-900">
                              {formatCurrency(Math.max(0, result.das - tipoData.deducoes))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ===== MODAL DE CONFIRMAÇÃO DE DESBLOQUEIO (TRAVA DE SEGURANÇA) ===== */}
      {confirmUnlock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-amber-500 h-2 w-full"></div>
            <div className="p-8">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6 mx-auto">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 text-center mb-3">
                Trava de Segurança
              </h3>
              <p className="text-slate-600 text-center text-sm leading-relaxed mb-8">
                Tem certeza que deseja habilitar a edição para <strong className="text-slate-900 font-bold">{getAnoMesLabel(confirmUnlock)}</strong>? <br/>
                <span className="text-amber-700 font-medium">Alterar valores manuais pode impactar o cálculo do Simples Nacional.</span>
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmUnlock(null)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setUnlockedRows(prev => ({ ...prev, [confirmUnlock]: true }));
                    setConfirmUnlock(null);
                  }}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm shadow-md shadow-amber-500/20 transition-all active:scale-95"
                >
                  Sim, Desbloquear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplesNacionalManager;
