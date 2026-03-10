import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle, AlertTriangle, X, Loader2,
  Building2, FileSpreadsheet, ArrowRight, RotateCcw, Info
} from 'lucide-react';
import { Sale, Customer, AccountPlan, SaleItem } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';

// Worker local (arquivo copiado para /public/pdf.worker.min.mjs pelo setup)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface NfImportManagerProps {
  customers: Customer[];
  accountPlan: AccountPlan[];
  onImportSale: (sale: Omit<Sale, 'id' | 'status' | 'createdAt'>) => void;
  onNavigateToSales: () => void;
}

type NfType = 'prefeitura' | 'locacao' | null;

interface ExtractedData {
  nfNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerId: string;
  description: string;
  grossValue: number;
  deductions: number;
  saleType: 'Serviço' | 'Locação';
  accountPlanId: string;
  rawText: string;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function parseBRDate(str: string): string {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return new Date().toLocaleDateString('en-CA');
}

function parseBRCurrency(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function findAccountPlan(accountPlan: AccountPlan[], keywords: string[]): string {
  const receitas = accountPlan.filter(p => p.type === 'Receita');
  for (const kw of keywords) {
    const found = receitas.find(p =>
      `${p.category} ${p.subcategory} ${p.description}`.toUpperCase().includes(kw.toUpperCase())
    );
    if (found) return found.id;
  }
  return receitas.length > 0 ? receitas[0].id : '';
}

function findCustomer(customers: Customer[], name: string): { customerId: string } {
  if (!name) return { customerId: '' };
  const norm = name.toUpperCase().replace(/\s+/g, ' ').trim();
  const exact = customers.find(c => c.name.toUpperCase() === norm);
  if (exact) return { customerId: exact.id };
  const firstWord = norm.split(' ').find(w => w.length > 3);
  if (firstWord) {
    const partial = customers.find(c => c.name.toUpperCase().includes(firstWord));
    if (partial) return { customerId: partial.id };
  }
  return { customerId: '' };
}

// ─── Extração: NFS-e da Prefeitura ───────────────────────────────────────────
// Formato real DANFSe v1.0 (Bauru):
//   "Número da NFS-e\n57"
//   "Data da emissão da NFS-e\n04/02/2026"
//   "Nome / Nome Empresarial\nIGREJA DO EVANGELHO QUADRANGULAR"
//   "Valor do Serviço\nR$ 720,00"
//   "Retenção do ISSQN\nRetido pelo Tomador"
//   "ISSQN Apurado\nR$ 27,86"

function extractPrefeituraData(text: string, customers: Customer[], accountPlan: AccountPlan[]): ExtractedData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Helper para buscar o valor que está na mesma "posição" na linha de baixo ou na mesma linha
  const getFieldBelow = (label: string, type: 'number' | 'date' | 'currency' | 'text' = 'text') => {
    const indices: number[] = [];
    lines.forEach((l, i) => {
      if (l.toLowerCase().includes(label.toLowerCase())) indices.push(i);
    });

    if (indices.length === 0) return '';

    for (const idx of indices) {
      const labelLine = lines[idx];
      // Tenta estimar a posição horizontal (coluna) do rótulo na linha
      const labelPos = labelLine.toLowerCase().indexOf(label.toLowerCase());
      const relativePos = labelPos / Math.max(1, labelLine.length);

      for (let i = 0; i <= 5; i++) {
          const line = lines[idx + i];
          if (!line) continue;
          
          if (i > 0 && (line.includes(':') || line.includes('Inscrição') || line.includes('Série') || line.includes('Município'))) {
             if (type === 'currency' && !line.match(/R\$\s*[\d.,]+/)) continue;
          }

          const tokens = line.split(/\s+/).filter(t => t.length > 0);
          
          if (type === 'number') {
              const numMatch = line.match(/\b(\d{1,8})\b/);
              if (numMatch && numMatch[1].length <= 6) return numMatch[1];
          }
          if (type === 'date') {
              const regex = /(\d{2}\/\d{2}\/\d{4})/g;
              const dateMatches: {val: string, index: number}[] = [];
              let m;
              while ((m = regex.exec(line)) !== null) {
                  dateMatches.push({ val: m[1], index: m.index });
              }
              
              if (dateMatches.length > 0) {
                  // Prioridade 1: Se estiver na mesma linha do rótulo, 
                  // pega a data que aparece DEPOIS do texto do rótulo
                  if (i === 0) {
                      const following = dateMatches.filter(d => d.index > labelPos).sort((a,b) => a.index - b.index)[0];
                      if (following) return following.val;
                  }
                  
                  // Prioridade 2: Se houver várias datas (ex: Competência e Emissão), 
                  // seleciona a que estiver mais próxima da mesma coluna (alinhamento vertical)
                  const closest = dateMatches.sort((a, b) => Math.abs(a.index - labelPos) - Math.abs(b.index - labelPos))[0];
                  return closest.val;
              }
          }
          if (type === 'currency') {
              if (line === '-' || line === '0,00' || line === '0.00') return '0';

              // Busca todos os valores monetários na linha
              const matches = line.match(/R\$\s*([\d.,]+)|([\d]{1,3}(?:\.[\d]{3})*,[\d]{2})/g) || [];
              
              if (matches.length > 1) {
                  // Se houver múltiplos valores, escolhe o que está mais alinhado com o rótulo
                  const matchIdx = Math.min(matches.length - 1, Math.floor(relativePos * matches.length));
                  return matches[matchIdx].replace(/R\$\s*/g, '');
              }

              const priceMatch = line.match(/R\$\s*([\d.,]+)/) || line.match(/([\d.,]*\d,\d{2})/);
              if (priceMatch) {
                  const val = (priceMatch[1] || priceMatch[2] || priceMatch[0]).replace(/R\$\s*/g, '');
                  if (i === 0 && val.length < 3) continue; 
                  return val;
              }
              
              for (const token of tokens) {
                  if (token.includes(',') && token.match(/^[\d.,]+$/)) return token;
              }
          }
          if (type === 'text' && i > 0) {
              if (line.length > 2 && !line.toLowerCase().includes(label.toLowerCase())) return line;
          }
      }
    }
    return '';
  };

  // ─── 1. Número da NFS-e (57, 59, etc) ───
  const nfNumber = getFieldBelow('Número da NFS-e', 'number');

  // ─── 2. Data de Emissão (04/02/2026) ───
  let date = new Date().toLocaleDateString('en-CA');
  const dateVal = getFieldBelow('Data da emissão da NFS-e', 'date') 
               || getFieldBelow('Data da emissão', 'date') 
               || getFieldBelow('Data de emissão', 'date')
               || getFieldBelow('Emissão:', 'date');
  if (dateVal) date = parseBRDate(dateVal);

  // ─── 3. Cliente (Igreja...) ───
  let customerNameRaw = '';
  const tomadorIdx = lines.findIndex(l => l.includes('TOMADOR DO SERVIÇO'));
  if (tomadorIdx >= 0) {
    const nomeLabelIdx = lines.slice(tomadorIdx).findIndex(l => l.includes('Nome / Nome Empresarial'));
    if (nomeLabelIdx >= 0) {
      customerNameRaw = lines[tomadorIdx + nomeLabelIdx + 1] || '';
    }
  }

  // ─── 4. Valor do Serviço (Bruto) ───
  let grossValue = 0;
  const grossVal = getFieldBelow('Valor do Serviço', 'currency');
  if (grossVal) grossValue = parseBRCurrency(grossVal);

  // ─── 5. ISSQN Retido (Deduções) ───
  let deductions = 0;
  // Tenta primeiro o rótulo mais específico
  let issVal = getFieldBelow('Valor do ISSQN Retido', 'currency');
  
  // Se não encontrou ou veio zerado, tenta o rótulo genérico mas valida se não pegou o bruto por erro de coluna
  if (!issVal || parseBRCurrency(issVal) === 0) {
      const genericIss = getFieldBelow('ISSQN Retido', 'currency');
      if (genericIss && parseBRCurrency(genericIss) !== grossValue) {
          issVal = genericIss;
      }
  }

  if (issVal && issVal !== '0') {
    const parsed = parseBRCurrency(issVal);
    // Validação CRÍTICA: imposto retido nunca é IGUAL ao valor bruto da nota.
    // Se for igual, é erro de leitura de coluna no PDF.
    if (parsed > 0 && parsed < grossValue) {
        deductions = parsed;
    }
  }

  // Se ainda estiver zero, tenta buscar por "Deduções" genérico
  if (deductions === 0) {
    const dedVal = getFieldBelow('Valor das Deduções', 'currency') || getFieldBelow('Deduções', 'currency');
    if (dedVal && dedVal !== '0') {
        const parsed = parseBRCurrency(dedVal);
        if (parsed > 0 && parsed < grossValue) { // Bloqueia se for igual ao bruto
            deductions = parsed;
        }
    }
  }

  const description = 'SERVIÇOS DE TERRAPLANAGEM';
  const accountPlanId = findAccountPlan(accountPlan, ['LIMPEZA', 'TERRENO', 'SERVIÇO', 'SERVICO', 'TERRAPLANAGEM']);
  const { customerId } = findCustomer(customers, customerNameRaw);

  return { nfNumber, date, dueDate: date, customerName: customerNameRaw, customerId, description, grossValue, deductions, saleType: 'Serviço', accountPlanId, rawText: text };
}

// ─── Extração: NF de Locação (Fatura Interna) ────────────────────────────────
// Formato real (Terraplanagem Bauru):
//   "Nº: 068/2026"
//   "Emissão: 09/02/2026"
//   "CLIENTE\nZANCHETTA INDUSTRIA DE ALIMENTOS LTDA\nCNPJ..."
//   "Descrição da Locação Total R$\n[ITENS]\nTotal:\n..."
//   "Valor Total a Pagar:\nR$ 1.150,00"
//   "BOLETO ANEXO: vencimento dia 24/02/2026"
//   "FORMA DE PAGAMENTO: 15 DIAS"

function extractLocacaoData(text: string, customers: Customer[], accountPlan: AccountPlan[]): ExtractedData {
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Número da Fatura ("Nº: 068/2026")
  let nfNumber = '';
  const nfMatch = t.match(/N[º°]\s*:\s*(\d+\/\d{4})/i)
    || t.match(/N[º°]\s+(\d+\/\d{4})/i)
    || t.match(/(\d{3}\/\d{4})/);
  if (nfMatch) nfNumber = nfMatch[1].trim();

  // Data de emissão ("Emissão: 09/02/2026")
  let date = new Date().toLocaleDateString('en-CA');
  const dateMatch = t.match(/Emiss[aã]o\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)
    || t.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) date = parseBRDate(dateMatch[1]);

  // Vencimento: "vencimento dia 24/02/2026" ou calculado por "FORMA DE PAGAMENTO: 15 DIAS"
  let dueDate = date;
  const vencMatch = t.match(/vencimento\s+dia\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (vencMatch) {
    dueDate = parseBRDate(vencMatch[1]);
  } else {
    const diasMatch = t.match(/FORMA DE PAGAMENTO\s*:\s*(\d+)\s*DIAS/i);
    if (diasMatch) {
      const dias = parseInt(diasMatch[1]);
      const d = new Date(date + 'T12:00:00');
      d.setDate(d.getDate() + dias);
      dueDate = d.toLocaleDateString('en-CA');
    }
  }

  // Cliente: linha imediatamente após "CLIENTE"
  let customerNameRaw = '';
  const lines = t.split('\n').map(l => l.trim());
  const clienteIdx = lines.findIndex(l => /^CLIENTE$/i.test(l));
  if (clienteIdx >= 0) {
    for (let i = clienteIdx + 1; i < Math.min(clienteIdx + 5, lines.length); i++) {
      if (lines[i].length > 3) {
        customerNameRaw = lines[i];
        break;
      }
    }
  }

  // Valor Total a Pagar
  let grossValue = 0;
  const totalMatch = t.match(/Valor Total a Pagar\s*:\s*\n?\s*R\$\s*([\d.,]+)/i)
    || t.match(/Valor Total a Pagar[^\d]*([\d]+[.,][\d.,]+)/i);
  if (totalMatch) grossValue = parseBRCurrency(totalMatch[1]);

  // Descrição dos itens (bloco entre "Descrição da Locação Total R$" e "Total:")
  let description = 'SERVIÇOS DE LOCAÇÃO';
  const descBlock = t.match(/Descri[çc][aã]o da Loca[çc][aã]o Total R\$\s*\n([\s\S]{0,600}?)\nTotal:/i);
  if (descBlock) {
    const descLines = descBlock[1]
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 6 && !l.match(/^R\$\s*[\d.,]+$/))
      .map(l => l.replace(/\s*R\$\s*[\d.,]+$/g, '').trim())
      .filter(l => l.length > 3);
    if (descLines.length > 0) description = descLines.join(' | ');
  }

  // Deduções (O usuário solicitou que em locações seja sempre 0,00)
  const deductions = 0;

  const accountPlanId = findAccountPlan(accountPlan, ['LOCA', 'ALUGUEL', 'MAQUINA', 'EQUIPAMENTO']);
  const { customerId } = findCustomer(customers, customerNameRaw);

  return { nfNumber, date, dueDate, customerName: customerNameRaw, customerId, description, grossValue, deductions, saleType: 'Locação', accountPlanId, rawText: t };
}

// ─── Extração de texto do PDF via pdfjs-dist ──────────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // ORDENAÇÃO CRÍTICA: Os itens do PDF nem sempre vêm na ordem de leitura.
    // Ordenamos por Y (cima para baixo) e depois por X (esquerda para direita).
    const items = (content.items as any[]).sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    let lastY: number | null = null;
    let line = '';
    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      
      // Se mudar de linha (diferença de Y > 5 pixels aprox)
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        if (line.trim()) fullText += line.trimEnd() + '\n';
        line = '';
      }
      
      line += item.str + ' ';
      lastY = item.transform[5];
    }
    if (line.trim()) fullText += line.trimEnd() + '\n';
  }
  return fullText;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

const NfImportManager: React.FC<NfImportManagerProps> = ({
  customers, accountPlan, onImportSale, onNavigateToSales,
}) => {
  const [nfType, setNfType] = useState<NfType>(null);
  const [step, setStep] = useState<'select' | 'upload' | 'preview' | 'done'>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [formData, setFormData] = useState<Partial<ExtractedData>>({});
  const [fileName, setFileName] = useState('');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (d: string) => {
    if (!d || !d.includes('-')) return d;
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v || 0);

  const formatInputCurrency = (v: number) =>
    (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const parseCurrencyInput = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return Number(clean) / 100;
  };

  const handleFileProcess = useCallback(async (file: File) => {
    if (!file || !nfType) return;
    if (file.type !== 'application/pdf') {
      setError('Apenas arquivos PDF são aceitos.');
      return;
    }
    setFileName(file.name);
    setOriginalFile(file);
    setIsProcessing(true);
    setError(null);
    try {
      const text = await extractTextFromPdf(file);
      const data = nfType === 'prefeitura'
        ? extractPrefeituraData(text, customers, accountPlan)
        : extractLocacaoData(text, customers, accountPlan);
      setExtracted(data);
      setFormData(data);
      setCustomerSearch(data.customerName);
      setStep('preview');
    } catch (err: any) {
      console.error('Erro ao processar PDF:', err);
      setError(`Erro: ${err?.message || String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [nfType, customers, accountPlan]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileProcess(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleConfirm = async () => {
    if (!formData.customerId) { setError('Selecione um cliente antes de confirmar.'); return; }
    if (!formData.accountPlanId) { setError('Selecione uma Conta de Receitas antes de confirmar.'); return; }
    if (!formData.grossValue || formData.grossValue <= 0) { setError('O valor da nota deve ser maior que zero.'); return; }

    setIsUploading(true);
    setError(null);
    
    try {
      let receiptUrl = '';
      
      // Upload do arquivo para o Supabase
      if (originalFile) {
        const fileExt = originalFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, originalFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
          
        receiptUrl = publicUrl;
      }

      const customer = customers.find(c => c.id === formData.customerId);
      const netValue = Math.max(0, (formData.grossValue || 0) - (formData.deductions || 0));

      const salePayload: Omit<Sale, 'id' | 'status' | 'createdAt'> = {
        customerId: formData.customerId!,
        customerName: customer?.name || formData.customerName || '',
        accountPlanId: formData.accountPlanId!,
        items: [{ id: crypto.randomUUID(), description: formData.description || 'SERVIÇOS REALIZADOS', value: formData.grossValue || 0 } as SaleItem],
        totalValue: netValue,
        deductions: formData.deductions || 0,
        date: formData.date || new Date().toLocaleDateString('en-CA'),
        nfNumber: formData.nfNumber || '',
        isNoNf: false,
        saleType: formData.saleType || 'Serviço',
        paymentMethod: 'PIX',
        paymentCondition: 'A Vista',
        installments: 1,
        dueDate: formData.dueDate || formData.date,
        observations: `Importado de NF ${nfType === 'prefeitura' ? 'da Prefeitura' : 'de Locação'}`,
        receiptUrl: receiptUrl || undefined
      };

      onImportSale(salePayload);
      setStep('done');
    } catch (err: any) {
      console.error('Erro ao realizar upload ou salvar:', err);
      setError(`Erro ao finalizar importação: ${err?.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setNfType(null); setStep('select'); setExtracted(null);
    setFormData({}); setError(null); setFileName(''); setOriginalFile(null); setCustomerSearch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredCustomers = customers
    .filter(c => c.isActive !== false)
    .filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.document && c.document.includes(customerSearch)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sortedRevenueAccounts = accountPlan
    .filter(p => p.type === 'Receita')
    .sort((a, b) => `${a.subcategory}/${a.description}`.localeCompare(`${b.subcategory}/${b.description}`));

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const netValue = Math.max(0, (formData.grossValue || 0) - (formData.deductions || 0));

  // ─── PASSO 1: Seleção ────────────────────────────────────────────────────────
  const renderSelectStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-800 mb-2">Qual tipo de Nota Fiscal?</h3>
        <p className="text-slate-500 text-sm">Selecione o tipo para configurar a extração corretamente</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <button onClick={() => { setNfType('prefeitura'); setStep('upload'); }}
          className="group flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:bg-amber-50/50 transition-all shadow-sm hover:shadow-md">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
            <Building2 size={32} className="text-amber-600" />
          </div>
          <span className="font-black text-slate-800 text-lg">NF da Prefeitura</span>
          <span className="text-xs text-slate-500 mt-2 text-center leading-relaxed">NFS-e / DANFSe<br />Nota Fiscal de Serviços Eletrônica</span>
          <div className="mt-4 text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-full font-bold">Tipo: Serviço</div>
        </button>
        <button onClick={() => { setNfType('locacao'); setStep('upload'); }}
          className="group flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all shadow-sm hover:shadow-md">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <FileSpreadsheet size={32} className="text-blue-600" />
          </div>
          <span className="font-black text-slate-800 text-lg">NF de Locação</span>
          <span className="text-xs text-slate-500 mt-2 text-center leading-relaxed">Fatura de Locação<br />de Máquinas e Equipamentos</span>
          <div className="mt-4 text-xs text-blue-700 bg-blue-100 px-3 py-1 rounded-full font-bold">Tipo: Locação</div>
        </button>
      </div>
    </div>
  );

  // ─── PASSO 2: Upload ─────────────────────────────────────────────────────────
  const renderUploadStep = () => (
    <div className="space-y-6">
      <button onClick={() => setStep('select')} className="flex items-center text-sm text-slate-500 hover:text-amber-600 font-medium">
        <RotateCcw size={14} className="mr-1" /> Trocar tipo de NF
      </button>
      <div className="text-center">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold mb-4 ${nfType === 'prefeitura' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
          {nfType === 'prefeitura' ? <><Building2 size={14} className="mr-2" />NF da Prefeitura (NFS-e)</> : <><FileSpreadsheet size={14} className="mr-2" />NF de Locação</>}
        </div>
        <h3 className="text-xl font-black text-slate-800">Faça upload do PDF da Nota Fiscal</h3>
        <p className="text-slate-500 text-sm mt-1">O sistema irá ler automaticamente os dados da nota</p>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50/40'}`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 size={48} className="text-amber-500 animate-spin" />
            <span className="font-bold text-slate-600">Processando PDF...</span>
            <span className="text-xs text-slate-400">Extraindo dados da nota fiscal</span>
          </div>
        ) : (
          <>
            <Upload size={48} className={`mb-4 ${isDragging ? 'text-amber-500' : 'text-slate-300'}`} />
            <p className="font-bold text-slate-600 text-lg">Arraste o PDF aqui</p>
            <p className="text-slate-400 text-sm mt-1">ou clique para selecionar o arquivo</p>
            <p className="text-xs text-slate-400 mt-3">Apenas arquivos .pdf</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      </div>
      {error && (
        <div className="flex items-start space-x-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-bold mb-1">Como funciona:</p>
          <p>O sistema extrai automaticamente os dados do PDF e pré-preenche o formulário. Você poderá revisar e editar todos os campos antes de confirmar.</p>
        </div>
      </div>
    </div>
  );

  // ─── PASSO 3: Revisão ────────────────────────────────────────────────────────
  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <CheckCircle size={22} className="text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Dados extraídos com sucesso!</p>
            <p className="text-xs text-emerald-600">{fileName}</p>
          </div>
        </div>
        <button onClick={handleReset} className="text-xs text-slate-500 hover:text-rose-500 font-bold flex items-center">
          <RotateCcw size={12} className="mr-1" /> Nova importação
        </button>
      </div>

      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${nfType === 'prefeitura' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
        {nfType === 'prefeitura' ? <><Building2 size={12} className="mr-1.5" />NF da Prefeitura</> : <><FileSpreadsheet size={12} className="mr-1.5" />NF de Locação</>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Data Emissão *</label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              value={formData.date || ''} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nº Nota / Fatura</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              value={formData.nfNumber || ''} onChange={e => setFormData(p => ({ ...p, nfNumber: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tipo de Venda</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              value={formData.saleType || 'Serviço'} onChange={e => setFormData(p => ({ ...p, saleType: e.target.value as any }))}>
              <option value="Serviço">Serviço</option>
              <option value="Locação">Locação</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Data Vencimento</label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              value={formData.dueDate || ''} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Cliente *</label>
            <input type="text" placeholder="Pesquisar cliente..."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none ${formData.customerId ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'}`}
              value={selectedCustomer ? selectedCustomer.name : customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setFormData(p => ({ ...p, customerId: '' })); setShowCustomerDropdown(true); }}
              onFocus={() => setShowCustomerDropdown(true)}
            />
            {!formData.customerId && extracted?.customerName && (
              <p className="text-xs text-amber-600 mt-0.5 flex items-center">
                <AlertTriangle size={10} className="mr-1" />
                Extraído da NF: <strong className="ml-1">"{extracted.customerName}"</strong> — selecione o cliente
              </p>
            )}
            {showCustomerDropdown && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0
                  ? <div className="px-4 py-3 text-sm text-slate-500 italic text-center">Nenhum cliente encontrado</div>
                  : filteredCustomers.map(c => (
                    <div key={c.id} className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm font-medium text-slate-700 border-b border-slate-50"
                      onClick={() => { setFormData(p => ({ ...p, customerId: c.id, customerName: c.name })); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}>
                      {c.name}{c.document && <span className="text-xs text-slate-400 ml-2">{c.document}</span>}
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Conta de Receitas *</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              value={formData.accountPlanId || ''} onChange={e => setFormData(p => ({ ...p, accountPlanId: e.target.value }))}>
              <option value="">Selecione a conta...</option>
              {sortedRevenueAccounts.map(p => <option key={p.id} value={p.id}>{p.subcategory} / {p.description}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Condições PG</label>
              <div className="w-full px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-500">À Vista</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Forma Pag.</label>
              <div className="w-full px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-500">PIX</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center">
          <FileText size={14} className="mr-2 text-amber-500" /> Descrição e Valores
        </h4>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição dos Serviços</label>
          <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Bruto (NF)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
              <input type="text" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-right font-bold bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={formatInputCurrency(formData.grossValue || 0)}
                onChange={e => setFormData(p => ({ ...p, grossValue: parseCurrencyInput(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Deduções / ISS Retido</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-rose-400 font-bold">R$</span>
              <input type="text" className="w-full pl-8 pr-3 py-2 border border-rose-200 rounded-lg text-sm text-right font-bold text-rose-600 bg-white focus:ring-2 focus:ring-rose-400 outline-none"
                value={formatInputCurrency(formData.deductions || 0)}
                onChange={e => setFormData(p => ({ ...p, deductions: parseCurrencyInput(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Valor Líquido</label>
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-right">
              <span className="text-lg font-black text-emerald-700">R$ {formatCurrency(netValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resumo do Lançamento</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Data Emissão', value: formData.date ? formatDate(formData.date) : '---' },
            { label: 'NF / Fatura', value: formData.nfNumber || 'S/N' },
            { label: 'Tipo', value: formData.saleType || '---' },
            { label: 'Vencimento', value: formData.dueDate ? formatDate(formData.dueDate) : '---' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-lg p-2 border border-slate-100">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="font-bold text-slate-700 text-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-200">
        <button onClick={handleReset} className="flex items-center text-slate-400 hover:text-slate-600 font-bold text-sm">
          <X size={16} className="mr-1" /> Cancelar
        </button>
        <button onClick={handleConfirm}
          disabled={isUploading}
          className={`flex items-center bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-amber-500/30 transition-all w-full sm:w-auto justify-center ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
          {isUploading ? (
            <><Loader2 size={18} className="mr-2 animate-spin" /> Salvando e Anexando...</>
          ) : (
            <><CheckCircle size={18} className="mr-2" /> Confirmar e Lançar Venda <ArrowRight size={16} className="ml-2" /></>
          )}
        </button>
      </div>
    </div>
  );

  // ─── PASSO 4: Concluído ──────────────────────────────────────────────────────
  const renderDoneStep = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle size={52} className="text-emerald-500" />
      </div>
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-800">Venda lançada com sucesso!</h3>
        <p className="text-slate-500 mt-2 text-sm">A nota fiscal foi importada e a venda foi registrada no sistema.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleReset} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50 text-sm transition-colors">
          Importar outra NF
        </button>
        <button onClick={onNavigateToSales}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-500/30 flex items-center transition-all">
          Ver em Faturamento <ArrowRight size={16} className="ml-2" />
        </button>
      </div>
    </div>
  );

  // ─── Progress Steps ──────────────────────────────────────────────────────────
  const steps = [
    { key: 'select', label: 'Tipo NF' },
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Revisar' },
    { key: 'done', label: 'Concluído' },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="max-w-4xl mx-auto space-y-6" onClick={() => setShowCustomerDropdown(false)}>
      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                  ${i < currentStepIndex ? 'bg-emerald-500 text-white' : i === currentStepIndex ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 'bg-slate-100 text-slate-400'}`}>
                  {i < currentStepIndex ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold mt-1 ${i === currentStepIndex ? 'text-amber-600' : 'text-slate-400'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-all ${i < currentStepIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {step === 'select' && renderSelectStep()}
        {step === 'upload' && renderUploadStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'done' && renderDoneStep()}
      </div>
    </div>
  );
};

export default NfImportManager;
