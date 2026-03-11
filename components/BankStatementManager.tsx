import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, FileType, Check, AlertCircle, Trash2, Edit2, Save, Plus, Search, X, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { BankAccount, AccountPlan, Expense, Payment, Sale, BankStatementItem, Customer, Vendor } from '../types';

interface BankStatementManagerProps {
  bankAccounts: BankAccount[];
  accountPlan: AccountPlan[];
  expenses: Expense[];
  payments: Payment[];
  customers: Customer[];
  vendors: Vendor[];
  onImportExits: (expenses: Expense[]) => void;
  onImportEntries: (sales: Sale[], payments: Payment[]) => void;
  onNavigateToReports?: () => void;
}

// Custom Searchable Select for inside a table
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  error = false
}: {
  options: { id: string, label: string }[],
  value: string,
  onChange: (val: string) => void,
  placeholder: string,
  error?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    (opt.label || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const selectedOption = options.find(o => o.id === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={`w-full border rounded p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500 cursor-pointer flex justify-between items-center bg-white ${error ? 'border-rose-400 bg-rose-50 text-rose-600' : !value ? 'border-amber-300 bg-amber-50 text-slate-500' : 'border-slate-300 text-slate-700'}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
      >
        <span className="truncate pr-2 font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full min-w-[200px] md:w-[300px] mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 flex flex-col overflow-hidden max-h-60">
          <div className="p-2 border-b bg-slate-50">
            <input
              autoFocus
              type="text"
              placeholder="Pesquisar..."
              className="w-full px-2 py-1.5 border rounded outline-none focus:ring-2 focus:ring-amber-500 flex-1 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.id}
                  className={`px-3 py-2 hover:bg-amber-50 cursor-pointer text-xs truncate ${value === opt.id ? 'bg-amber-100 font-bold text-amber-900 border-l-2 border-amber-500' : 'text-slate-700'}`}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400 italic text-center">Nenhum resultado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


const BankStatementManager: React.FC<BankStatementManagerProps> = ({
  bankAccounts,
  accountPlan,
  expenses,
  payments,
  customers,
  vendors,
  onImportExits,
  onImportEntries
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [items, setItems] = useState<BankStatementItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // For inline editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDescValue, setEditDescValue] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identify "Sem Cadastro" defaults
  const defaultCustomer = useMemo(() => (customers || []).find(c => c.name?.toLowerCase().includes('sem cadastro')), [customers]);
  const defaultVendor = useMemo(() => (vendors || []).find(v => v.name?.toLowerCase().includes('sem cadastro')), [vendors]);
  
  const defaultIncomeAccountPlan = useMemo(() => {
    const receitas = accountPlan.filter(ap => ap.type === 'Receita');
    return receitas.find(ap => ap.description.toLowerCase().includes('limpeza') || ap.subcategory.toLowerCase().includes('limpeza')) || receitas[0];
  }, [accountPlan]);

  const isDuplicateId = (id?: string) => {
    if (!id) return false;
    const inExpenses = expenses.some(e => e.bankTransId === id);
    const inPayments = payments.some(p => p.bankTransId === id);
    return inExpenses || inPayments;
  };

  const parseItemDescription = (descriptionRaw: string, isExpense: boolean) => {
    let type: 'Entrada' | 'Saída' = isExpense ? 'Saída' : 'Entrada';
    let finalDescription = descriptionRaw;
    
    if (type === 'Saída' && finalDescription.startsWith('Transferência enviada pelo Pix - ')) {
        const receiver = finalDescription.replace('Transferência enviada pelo Pix - ', '').split(' - ')[0];
        finalDescription = `PG: ${receiver.trim()} / Nubank`;
    } else if (type === 'Entrada' && finalDescription.startsWith('Transferência recebida pelo Pix - ')) {
        const sender = finalDescription.replace('Transferência recebida pelo Pix - ', '').split(' - ')[0];
        finalDescription = `Recebto Pix Nubank: ${sender.trim()}`;
    } else if (type === 'Entrada' && finalDescription.startsWith('Transferência Recebida - ')) {
        const sender = finalDescription.replace('Transferência Recebida - ', '').split(' - ')[0];
        finalDescription = `Recebto Pix Nubank: ${sender.trim()}`;
    }

    return finalDescription;
  };

  const findContactByDescription = (description: string, type: 'Entrada' | 'Saída') => {
    const descLower = description.toLowerCase();
    
    if (type === 'Entrada') {
      const matched = customers.find(c => {
         const name = (c.name || '').toLowerCase();
         if (name.length < 3) return false;
         return descLower.includes(name);
      });
      return matched ? { contactId: matched.id, accountPlanId: defaultIncomeAccountPlan?.id } : { contactId: defaultCustomer?.id, accountPlanId: defaultIncomeAccountPlan?.id };
    } else {
      const matched = vendors.find(v => {
         const name = (v.name || '').toLowerCase();
         if (name.length < 3) return false;
         return descLower.includes(name);
      });
      return matched ? { contactId: matched.id, accountPlanId: matched.categoryId || undefined } : { contactId: defaultVendor?.id, accountPlanId: undefined };
    }
  };

  const processCsv = (text: string) => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    const parsedItems: BankStatementItem[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      
      let parts = [];
      let currentPart = '';
      let inQuotes = false;
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(currentPart);
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      parts.push(currentPart);

      if (parts.length >= 4) {
        const [dateStr, valueStr, identifier, descriptionRaw] = parts;
        
        let value = parseFloat(valueStr);
        if (isNaN(value)) continue;

        let type: 'Entrada' | 'Saída' = value < 0 ? 'Saída' : 'Entrada';
        value = Math.abs(value);
        
        let date = dateStr;
        if (dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          date = `${y}-${m}-${d}`;
        }

        const validIdentifier = identifier?.trim() || undefined;
        const isDup = isDuplicateId(validIdentifier);
        const descriptionParsed = parseItemDescription(descriptionRaw, type === 'Saída');
        const contactMatch = findContactByDescription(descriptionParsed, type);

        parsedItems.push({
          id: crypto.randomUUID(),
          date,
          type,
          description: descriptionParsed,
          value,
          originalId: validIdentifier,
          isDuplicate: isDup,
          isValidated: !isDup,
          contactId: contactMatch.contactId,
          accountPlanId: contactMatch.accountPlanId
        });
      }
    }
    return parsedItems;
  };

  const processOfx = (text: string) => {
    const parsedItems: BankStatementItem[] = [];
    const trnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/g;
    const typeRegex = /<TRNTYPE>(.*?)<\/TRNTYPE>/;
    const dateRegex = /<DTPOSTED>(.*?)\[/; 
    const amtRegex = /<TRNAMT>(.*?)<\/TRNAMT>/;
    const fitidRegex = /<FITID>(.*?)<\/FITID>/;
    const memoRegex = /<MEMO>(.*?)<\/MEMO>/;

    let match;
    while ((match = trnRegex.exec(text)) !== null) {
      const trnBlock = match[0];
      
      const typeMatch = typeRegex.exec(trnBlock);
      const dateMatch = dateRegex.exec(trnBlock);
      const amtMatch = amtRegex.exec(trnBlock);
      const fitidMatch = fitidRegex.exec(trnBlock);
      const memoMatch = memoRegex.exec(trnBlock);

      if (typeMatch && dateMatch && amtMatch && fitidMatch && memoMatch) {
        let value = parseFloat(amtMatch[1]);
        const isExpense = value < 0;
        value = Math.abs(value);

        const dateStr = dateMatch[1];
        const date = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
        
        const identifier = fitidMatch[1];
        const type: 'Entrada' | 'Saída' = isExpense ? 'Saída' : 'Entrada';
        const isDup = isDuplicateId(identifier);
        const descriptionParsed = parseItemDescription(memoMatch[1], isExpense);
        const contactMatch = findContactByDescription(descriptionParsed, type);

        parsedItems.push({
            id: crypto.randomUUID(),
            date,
            type,
            description: descriptionParsed,
            value,
            originalId: identifier,
            isDuplicate: isDup,
            isValidated: !isDup,
            contactId: contactMatch.contactId,
            accountPlanId: contactMatch.accountPlanId
        });
      }
    }

    return parsedItems;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedBankAccountId) {
      alert("Por favor, selecione a Conta Bancária primeiro.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let newItems: BankStatementItem[] = [];

        if (file.name.toLowerCase().endsWith('.csv')) {
          newItems = processCsv(text);
        } else if (file.name.toLowerCase().endsWith('.ofx')) {
          newItems = processOfx(text);
        } else {
          throw new Error("Formato de arquivo não suportado. Envie .csv ou .ofx");
        }

        setItems(newItems);
        if (newItems.length > 0) {
           setStep(2);
        } else {
           setParseError('O arquivo não continha transações válidas.');
        }
      } catch (err: any) {
        setParseError(err.message || 'Erro ao processar arquivo.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Erro ao ler arquivo.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateItemField = (id: string, field: 'accountPlanId' | 'contactId', value: string) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const toggleValidation = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, isValidated: !it.isValidated } : it));
  };

  const toggleAllValidation = () => {
    const validatableItems = items.filter(it => !it.isDuplicate);
    const allValidated = validatableItems.every(it => it.isValidated);

    setItems(items.map(it => {
      if (it.isDuplicate) return it;
      return { ...it, isValidated: !allValidated }; 
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
    if (items.length === 1) setStep(1); // Go back if empty
  };

  const startEditing = (item: BankStatementItem) => {
    setEditingItemId(item.id);
    setEditDescValue(item.description);
  };

  const saveEditing = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, description: editDescValue } : it));
    setEditingItemId(null);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
  };

  const handleProceedToStep3 = () => {
    const validItemsToImport = items.filter(it => it.isValidated && !it.isDuplicate);
    
    if (validItemsToImport.length === 0) {
      alert("Selecione pelo menos um item Validado para prosseguir.");
      return;
    }

    const missingCats = validItemsToImport.filter(it => !it.accountPlanId);
    if (missingCats.length > 0) {
      alert(`Existem ${missingCats.length} linhas MARCADAS faltantes de Plano de Contas. Corrija na tabela antes de avançar.`);
      return;
    }

    const missingContacts = validItemsToImport.filter(it => !it.contactId);
    if (missingContacts.length > 0) {
      alert(`Existem ${missingContacts.length} linhas MARCADAS faltantes de Cliente/Fornecedor. Corrija na tabela antes de avançar.`);
      return;
    }

    setStep(3);
  };

  const handleAcceptImport = () => {
    const validItemsToImport = items.filter(it => it.isValidated && !it.isDuplicate);
    
    const newExpenses: Expense[] = [];
    const newSales: Sale[] = [];
    const newPayments: Payment[] = [];

    const now = Date.now();

    validItemsToImport.forEach(item => {
      // Append tag
      const finalDesc = `${item.description} (S/N) [IMPORTADO]`;

      if (item.type === 'Saída') {
        const vendor = vendors.find(v => v.id === item.contactId);
        newExpenses.push({
          id: crypto.randomUUID(),
          vendorId: item.contactId!,
          vendorName: vendor ? vendor.name : 'Desconhecido',
          accountPlanId: item.accountPlanId!,
          items: [{
            id: crypto.randomUUID(),
            description: finalDesc,
            value: item.value
          }],
          totalValue: item.value,
          date: item.date,
          docNumber: 'S/N',
          isNoDoc: true,
          paymentMethod: 'Pix',
          paymentCondition: 'A Vista',
          status: 'Pago',
          dueDate: item.date,
          bankAccountId: selectedBankAccountId,
          paymentDate: item.date,
          amountPaid: item.value,
          bankTransId: item.originalId,
          createdAt: now
        });
      } else {
        const saleId = crypto.randomUUID();
        const customer = customers.find(c => c.id === item.contactId);
        
        newSales.push({
          id: saleId,
          customerId: item.contactId!,
          customerName: customer ? customer.name : 'Desconhecido',
          accountPlanId: item.accountPlanId!,
          items: [{
            id: crypto.randomUUID(),
            description: finalDesc,
            value: item.value
          }],
          totalValue: item.value,
          date: item.date,
          nfNumber: 'S/N',
          isNoNf: true,
          saleType: 'Serviço',
          paymentMethod: 'Pix',
          paymentCondition: 'A Vista',
          installments: 1,
          status: 'Pago',
          createdAt: now
        });

        newPayments.push({
          id: crypto.randomUUID(),
          saleId: saleId,
          bankAccountId: selectedBankAccountId,
          amount: item.value,
          date: item.date,
          method: 'Pix',
          bankTransId: item.originalId,
          createdAt: now
        });
      }
    });

    if (newExpenses.length > 0) onImportExits(newExpenses);
    if (newSales.length > 0) onImportEntries(newSales, newPayments);

    alert(`Sucesso! Foram importados para o sistema:\n- ${newSales.length} Entradas\n- ${newExpenses.length} Saídas`);
    
    setItems([]);
    setStep(1);
    setSelectedBankAccountId('');
  };

  // Maps for Selects
  const categoriesEntrada = useMemo(() => (accountPlan || []).filter(ap => ap.type === 'Receita').map(ap => ({
    id: ap.id,
    label: `${ap.subcategory || 'Sem Subcategoria'} / ${ap.description || 'Sem Conta'}`
  })), [accountPlan]);

  const categoriesSaida = useMemo(() => (accountPlan || []).filter(ap => ap.type === 'Despesa').map(ap => ({
    id: ap.id,
    label: `${ap.subcategory || 'Sem Subcategoria'} / ${ap.description || 'Sem Conta'}`
  })), [accountPlan]);

  const customerOptions = useMemo(() => (customers || []).map(c => ({ id: c.id, label: c.name || 'Sem Nome' })), [customers]);
  const vendorOptions = useMemo(() => (vendors || []).map(v => ({ id: v.id, label: v.name || 'Sem Nome' })), [vendors]);

  const validatableItems = items.filter(it => !it.isDuplicate);
  const allValidated = validatableItems.length > 0 && validatableItems.every(it => it.isValidated);
  const validatedCount = items.filter(it => it.isValidated).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Importação de Extrato Bancário
          </h2>
          <p className="text-slate-500">
            Assistente em 3 passos para importar e conciliar lançamentos NUBANK / OFX.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center max-w-2xl w-full">
          <div className={`flex flex-col items-center flex-1 relative z-10 ${step >= 1 ? 'text-amber-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold bg-white mb-2 ${step >= 1 ? 'border-amber-500 text-amber-600' : 'border-slate-300'}`}>1</div>
            <span className="text-xs font-bold uppercase tracking-wider">Arquivo</span>
          </div>
          <div className={`flex-1 h-1 -mx-8 bg-slate-200 relative z-0 ${step >= 2 ? 'bg-amber-500' : ''}`}></div>
          <div className={`flex flex-col items-center flex-1 relative z-10 ${step >= 2 ? 'text-amber-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold bg-white mb-2 ${step >= 2 ? 'border-amber-500 text-amber-600' : 'border-slate-300'}`}>2</div>
            <span className="text-xs font-bold uppercase tracking-wider">Validação</span>
          </div>
          <div className={`flex-1 h-1 -mx-8 bg-slate-200 relative z-0 ${step >= 3 ? 'bg-amber-500' : ''}`}></div>
          <div className={`flex flex-col items-center flex-1 relative z-10 ${step >= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold bg-white mb-2 ${step >= 3 ? 'border-amber-500 text-amber-600' : 'border-slate-300'}`}>3</div>
            <span className="text-xs font-bold uppercase tracking-wider">Confirmação</span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="border border-slate-200 bg-white p-8 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
             <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
                <Building2 size={32} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Conta Bancária Origem</h3>
             <p className="text-sm text-slate-500 mb-6 w-3/4">Qual é a origem deste extrato que você pretende importar para o sistema?</p>
             <select
                value={selectedBankAccountId}
                onChange={e => setSelectedBankAccountId(e.target.value)}
                className="w-full max-w-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">-- Selecione o Banco --</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - Ag {b.agency} CC {b.accountNumber}
                  </option>
                ))}
            </select>
          </div>

          <div className="border border-slate-200 bg-white p-8 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center min-h-[300px] relative">
            {!selectedBankAccountId && (
               <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center p-6 border border-slate-200">
                  <span className="bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-xl flex items-center"><ChevronLeft className="mr-2" /> Selecione primeiro o banco</span>
               </div>
            )}
            <input
              type="file"
              accept=".csv,.ofx"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || !selectedBankAccountId}
              className={`w-full h-full border-2 border-dashed ${!selectedBankAccountId ? 'border-slate-300 bg-slate-50' : 'border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-500'} rounded-xl p-6 flex flex-col items-center justify-center transition-all group`}
            >
              {isProcessing ? (
                <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4 shadow-lg shadow-amber-200/50"></div>
              ) : (
                <UploadCloud size={48} className={`mb-4 ${selectedBankAccountId ? 'text-amber-500 group-hover:scale-110 transition-transform' : 'text-slate-300'}`} />
              )}
              <span className={`font-bold text-lg mb-1 ${selectedBankAccountId ? 'text-slate-800' : 'text-slate-400'}`}>
                 {isProcessing ? "Processando..." : "Anexar Arquivo Extrato"}
              </span>
              <span className={`text-sm ${selectedBankAccountId ? 'text-slate-500' : 'text-slate-300'}`}>Arquivos CSV ou OFX</span>
            </button>
            {parseError && (
              <p className="text-rose-500 text-sm mt-4 flex justify-center items-center bg-rose-50 w-full py-2 rounded-lg font-bold border border-rose-100">
                <AlertCircle size={14} className="mr-1" /> {parseError}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="border border-slate-200 bg-white rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
           <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center">
                 <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white mr-4 bg-slate-700/50 hover:bg-slate-700 p-2 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                 <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      Revisão dos Lançamentos (Em Validação)
                    </h3>
                    <p className="text-slate-400 text-xs">Ajuste Categorias, Contatos e Descrições se necessário.</p>
                 </div>
             </div>
             <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
               <div className="flex flex-col items-center px-4 py-1">
                 <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Encontrados</span>
                 <span className="text-white font-black text-lg leading-none">{items.length}</span>
               </div>
               <div className="w-[1px] bg-slate-700 mx-1"></div>
               <div className="flex flex-col items-center px-4 py-1">
                 <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Validados</span>
                 <span className="text-emerald-400 font-black text-lg leading-none">{validatedCount}</span>
               </div>
             </div>
           </div>

           <div className="flex-1 overflow-auto bg-slate-50 min-h-[500px]">
             {items.length === 0 ? (
                <div className="h-full min-h-[400px] flex items-center justify-center text-slate-400 flex-col">
                  <Search size={32} className="mb-2 opacity-50" />
                  Nenhum item carregado.
                </div>
             ) : (
               <table className="w-full divide-y divide-slate-200 text-left min-w-[1100px]">
                  <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center text-xs font-bold text-slate-500 uppercase bg-slate-100" title="Marcar/Desmarcar Todos">
                         <input 
                            type="checkbox"
                            checked={allValidated}
                            disabled={validatableItems.length === 0}
                            onChange={toggleAllValidation}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-400 focus:ring-emerald-500 cursor-pointer"
                         />
                      </th>
                      <th className="px-3 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Data</th>
                      <th className="px-3 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Tipo / Valor</th>
                      <th className="px-3 py-3 w-[250px] text-xs font-bold tracking-wider text-slate-500 uppercase">Descrição</th>
                      <th className="px-3 py-3 text-left w-[200px] text-xs font-bold tracking-wider text-slate-500 uppercase">Plano de Contas</th>
                      <th className="px-3 py-3 text-left w-[200px] text-xs font-bold tracking-wider text-slate-500 uppercase">Contato (Cliente/Forn.)</th>
                      <th className="px-3 py-3 text-center text-xs font-bold tracking-wider text-slate-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-sm">
                    {items.map(item => (
                      <tr key={item.id} className={`${item.isDuplicate ? 'bg-rose-50/50 opacity-70' : item.isValidated ? 'bg-emerald-50/30' : 'hover:bg-slate-50'} transition-colors group`}>
                        <td className="px-3 py-3 text-center relative">
                          <input 
                            type="checkbox" 
                            disabled={!!item.isDuplicate}
                            checked={!!item.isValidated}
                            onChange={() => toggleValidation(item.id)}
                            className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium text-xs">
                          {item.date.split('-').reverse().join('/')}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                             {item.type === 'Entrada' ? (
                               <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px] uppercase">Entrada</span>
                             ) : (
                               <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[10px] uppercase">Saída</span>
                             )}
                             <span className={`font-black text-sm tracking-tight ${item.type === 'Entrada' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {item.type === 'Saída' ? '-' : ''} R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-800 relative align-top">
                           {editingItemId === item.id ? (
                             <div className="flex flex-col gap-2 w-full mt-1">
                               <textarea
                                 className="w-full text-xs font-medium border border-amber-400 bg-amber-50 rounded p-2 outline-none resize-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                                 value={editDescValue}
                                 onChange={(e) => setEditDescValue(e.target.value)}
                                 rows={3}
                                 autoFocus
                               />
                               <div className="flex justify-end gap-1">
                                  <button onClick={cancelEditing} className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 hover:bg-slate-200 rounded">Cancelar</button>
                                  <button onClick={() => saveEditing(item.id)} className="px-2 py-1 text-[10px] uppercase font-bold bg-amber-500 hover:bg-amber-600 text-white rounded">Salvar</button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <div className="line-clamp-3 text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors" title={item.description}>{item.description}</div>
                               {item.isDuplicate && (
                                 <div className="text-[10px] text-rose-500 font-bold flex items-center mt-1">
                                   <AlertCircle size={10} className="mr-0.5"/> Duplicado - Já Gravado
                                 </div>
                               )}
                             </>
                           )}
                        </td>
                        <td className="px-3 py-3 relative align-top">
                          {!item.isDuplicate ? (
                            <div className="mt-1">
                               <SearchableSelect 
                                 options={item.type === 'Entrada' ? categoriesEntrada : categoriesSaida}
                                 value={item.accountPlanId || ''}
                                 onChange={(val) => updateItemField(item.id, 'accountPlanId', val)}
                                 placeholder="Selecione Categoria..."
                                 error={item.isValidated && !item.accountPlanId}
                               />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic mt-2 block">Ignorado</span>
                          )}
                        </td>
                        <td className="px-3 py-3 relative align-top">
                          {!item.isDuplicate ? (
                            <div className="mt-1">
                               <SearchableSelect 
                                 options={item.type === 'Entrada' ? customerOptions : vendorOptions}
                                 value={item.contactId || ''}
                                 onChange={(val) => updateItemField(item.id, 'contactId', val)}
                                 placeholder={item.type === 'Entrada' ? "Selecione Cliente..." : "Selecione Fornecedor..."}
                                 error={item.isValidated && !item.contactId}
                               />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic mt-2 block">Ignorado</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center align-top">
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            {editingItemId === item.id ? (
                               <span className="text-[10px] text-amber-500 font-bold uppercase animate-pulse">Editando...</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(item)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Editar Descrição"
                                  disabled={!!item.isDuplicate}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Remover Entrada"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             )}
           </div>

           <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
             <div className="text-sm text-slate-500 font-medium">Todos os itens preenchidos automaticamente com "Sem Cadastro" (se existirem na base).</div>
             <button
               onClick={handleProceedToStep3}
               disabled={validatedCount === 0}
               className="flex justify-center items-center px-8 py-3 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition duration-300 shadow-xl shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
             >
               Confirmar & Avançar <ChevronRight size={18} className="ml-1" />
             </button>
           </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-3xl mx-auto border border-emerald-200 bg-white rounded-2xl shadow-xl overflow-hidden shadow-emerald-500/10">
           <div className="bg-emerald-500 px-8 py-6 text-center shadow-inner relative overflow-hidden">
               <div className="absolute -top-10 -right-10 text-emerald-400 opacity-20">
                  <Check size={180} />
               </div>
               <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Pronto para Importar!</h3>
                  <p className="text-emerald-50 font-medium">Os selecionados abaixo serão integrados ao banco de dados e aparecerão em Tesouraria e Lançamentos.</p>
               </div>
           </div>
           
           <div className="p-8">
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Entradas (Receitas)</span>
                    <span className="text-3xl font-black text-emerald-600">
                       {items.filter(it => it.isValidated && !it.isDuplicate && it.type === 'Entrada').length}
                    </span>
                 </div>
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Saídas (Despesas)</span>
                    <span className="text-3xl font-black text-rose-600">
                       {items.filter(it => it.isValidated && !it.isDuplicate && it.type === 'Saída').length}
                    </span>
                 </div>
              </div>

              <div className="flex gap-4">
                 <button
                   onClick={() => setStep(2)}
                   className="flex-1 py-4 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors group flex items-center justify-center"
                 >
                   <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Voltar à Tabela
                 </button>
                 <button
                   onClick={handleAcceptImport}
                   className="flex-[2] flex justify-center items-center py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition duration-300 shadow-xl shadow-emerald-500/30 uppercase tracking-wider text-sm"
                 >
                   <Check size={20} className="mr-2" /> Efetivar Importação
                 </button>
              </div>

              <p className="text-center text-[10px] text-slate-400 mt-6 uppercase font-bold tracking-widest leading-relaxed">
                 Todos os itens serão salvos com sufixo final [IMPORTADO] <br/>e a tag "isNoDoc" como verdadeira (DOCUMENTOS S/N).
              </p>
           </div>
        </div>
      )}

    </div>
  );
};

export default BankStatementManager;
