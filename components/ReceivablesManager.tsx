
import React, { useState, useMemo } from 'react';
import {
  HandCoins, Search, Trash2, ArrowDownCircle, X, History, Building2, AlertTriangle, Edit, FileText
} from 'lucide-react';
import { Sale, Payment, Customer, BankAccount } from '../types';
import { supabase } from '../lib/supabase';

interface ReceivablesManagerProps {
  sales: Sale[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  bankAccounts: BankAccount[];
  onNavigateToReports?: () => void;
}

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const ReceivablesManager: React.FC<ReceivablesManagerProps> = ({ sales, payments, setPayments, setSales, customers, bankAccounts, onNavigateToReports }) => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA');

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [filterLabel, setFilterLabel] = useState('Hoje');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState(0);
  const [payFee, setPayFee] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [payMethod, setPayMethod] = useState('PIX');
  const [bankAccountId, setBankAccountId] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | undefined>(undefined);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatInputCurrency = (value: number) => {
    return (value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const getSaleBalance = (sale: Sale) => {
    const totalPaid = payments.filter(p => p.saleId === sale.id && !p.installmentId).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
    return Math.max(0, sale.totalValue - totalPaid);
  };

  const getInstallmentBalance = (saleId: string, instId: string, instValue: number) => {
    const totalPaid = payments.filter(p => p.saleId === saleId && p.installmentId === instId).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
    return Math.max(0, instValue - totalPaid);
  };

  interface ReceivableItem {
    id: string; // fake id for mapping: either sale.id or inst.id
    saleId: string;
    installmentId?: string;
    customerName: string;
    nfNumber: string;
    title: string;
    balance: number;
    refDate: string;
    sale: Sale;
  }

  const pendingSales = useMemo(() => {
    const items: ReceivableItem[] = [];
    sales.forEach(s => {
      if (s.installmentsList && s.installmentsList.length > 0) {
        s.installmentsList.forEach(inst => {
          const bal = getInstallmentBalance(s.id, inst.id, inst.value);
          if (bal > 0.01) {
            items.push({
              id: inst.id,
              saleId: s.id,
              installmentId: inst.id,
              customerName: s.customerName,
              nfNumber: s.nfNumber,
              title: `Parcela ${inst.number}/${s.installmentsList!.length}`,
              balance: bal,
              refDate: inst.dueDate,
              sale: s
            });
          }
        });
      } else {
        const bal = getSaleBalance(s);
        if (bal > 0.01) {
          items.push({
            id: s.id,
            saleId: s.id,
            customerName: s.customerName,
            nfNumber: s.nfNumber,
            title: s.paymentCondition === 'A Vista' ? 'À Vista' : 'Única',
            balance: bal,
            refDate: s.dueDate || s.date,
            sale: s
          });
        }
      }
    });

    return items
      .filter(item => {
        const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || (item.nfNumber && item.nfNumber.includes(searchTerm));
        const matchesDate = (!startDate || item.refDate >= startDate) && (!endDate || item.refDate <= endDate);
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(a.refDate).getTime() - new Date(b.refDate).getTime());
  }, [sales, payments, searchTerm, startDate, endDate]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [payments]);

  const selectedSale = sales.find(s => s.id === selectedSaleId);
  const currentBalance = selectedSale ? getSaleBalance(selectedSale) : 0;

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId || payAmount <= 0) return;
    if (!bankAccountId) return alert('Selecione o banco de destino.');

    const paymentData: Payment = {
      id: editingPaymentId || crypto.randomUUID(),
      saleId: selectedSaleId,
      installmentId: selectedInstallmentId || undefined,
      bankAccountId,
      amount: Number(payAmount),
      fee: (payMethod === 'Cartão' || payMethod === 'Cartão de Crédito' || payMethod === 'Cartão de Débito') ? Number(payFee) : 0,
      date: payDate,
      method: payMethod,
      receiptUrl: currentReceiptUrl,
      createdAt: editingPaymentId ? (payments.find(p => p.id === editingPaymentId)?.createdAt || Date.now()) : Date.now()
    };

    let newPayments;
    if (editingPaymentId) {
      newPayments = payments.map(p => p.id === editingPaymentId ? paymentData : p);
    } else {
      newPayments = [paymentData, ...payments];
    }

    setPayments(newPayments);

    // Update sale status (calc all payments for this sale)
    const sale = sales.find(s => s.id === selectedSaleId);
    if (sale) {
      if (sale.installmentsList && sale.installmentsList.length > 0) {
        let allPaid = true;
        let anyPaid = false;
        const updatedList = sale.installmentsList.map(inst => {
          const instPaid = newPayments.filter(p => p.saleId === sale.id && p.installmentId === inst.id).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
          const instStatus: Sale['status'] = instPaid >= inst.value - 0.01 ? 'Pago' : instPaid > 0 ? 'Parcial' : 'Pendente';
          if (instStatus !== 'Pago') allPaid = false;
          if (instStatus !== 'Pendente') anyPaid = true;
          return { ...inst, status: instStatus };
        });
        const newStatus: Sale['status'] = allPaid ? 'Pago' : anyPaid ? 'Parcial' : 'Pendente';
        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: newStatus, installmentsList: updatedList } : s));
      } else {
        const totalPaid = newPayments.filter(p => p.saleId === sale.id).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
        const newStatus: Sale['status'] = totalPaid >= sale.totalValue - 0.01 ? 'Pago' : totalPaid > 0 ? 'Parcial' : 'Pendente';
        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: newStatus } : s));
      }
    }

    setIsModalOpen(false);
    setEditingPaymentId(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setCurrentReceiptUrl(publicUrl);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadError(error.message || 'Erro ao enviar o comprovante.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePayment = (pId: string) => {
    const pToDelete = payments.find(p => p.id === pId);
    if (!pToDelete) return;
    const sId = pToDelete.saleId;
    const updatedPayments = payments.filter(p => p.id !== pId);
    setPayments(updatedPayments);

    const sale = sales.find(s => s.id === sId);
    if (sale) {
      if (sale.installmentsList && sale.installmentsList.length > 0) {
        let allPaid = true;
        let anyPaid = false;
        const updatedList = sale.installmentsList.map(inst => {
          const instPaid = updatedPayments.filter(p => p.saleId === sale.id && p.installmentId === inst.id).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
          const instStatus: Sale['status'] = instPaid >= inst.value - 0.01 ? 'Pago' : instPaid > 0 ? 'Parcial' : 'Pendente';
          if (instStatus !== 'Pago') allPaid = false;
          if (instStatus !== 'Pendente') anyPaid = true;
          return { ...inst, status: instStatus };
        });
        const newStatus: Sale['status'] = allPaid ? 'Pago' : anyPaid ? 'Parcial' : 'Pendente';
        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: newStatus, installmentsList: updatedList } : s));
      } else {
        const totalPaid = updatedPayments.filter(p => p.saleId === sId).reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);
        const newStatus: Sale['status'] = totalPaid >= sale.totalValue - 0.01 ? 'Pago' : totalPaid > 0 ? 'Parcial' : 'Pendente';
        setSales(prev => prev.map(s => s.id === sId ? { ...s, status: newStatus } : s));
      }
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar pendentes..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setFilterLabel('Personalizado');
            }}
            title="Data Inicial"
          />
          <span className="text-slate-400 hidden sm:inline">até</span>
          <input
            type="date"
            className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setFilterLabel('Personalizado');
            }}
            title="Data Final"
          />
          <button
            onClick={() => {
              const todayStr = new Date().toLocaleDateString('en-CA');
              setStartDate(todayStr);
              setEndDate(todayStr);
              setFilterLabel('Hoje');
            }}
            className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-200 transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            Hoje
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const next7 = new Date();
              next7.setDate(today.getDate() + 7);
              setStartDate(today.toLocaleDateString('en-CA'));
              setEndDate(next7.toLocaleDateString('en-CA'));
              setFilterLabel('Próximos 7 Dias');
            }}
            className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            Próximos 7 Dias
          </button>
          <button
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setStartDate(''); // Limpa a data inicial para pegar tudo desde o início
              setEndDate(yesterday.toLocaleDateString('en-CA'));
              setFilterLabel('Vencidos');
            }}
            className="px-3 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-bold hover:bg-rose-200 transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            Vencidos
          </button>
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-3 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <FileText size={16} className="text-amber-500" />
              <span>Relatórios</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <HandCoins className="mr-2 text-emerald-500" />
            Contas a Receber ({filterLabel === 'Personalizado' ? `${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}` : filterLabel})
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Cliente / NF</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Valor a Receber</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Vencimento</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingSales.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-200/70 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{item.customerName}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">NF: {item.nfNumber || 'S/N'}</span>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${item.installmentId ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                            {item.title}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-rose-600">{formatCurrency(item.balance)}</td>
                    <td className="px-6 py-4 font-bold text-slate-500">{formatDateDisplay(item.refDate)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => {
                        setSelectedSaleId(item.saleId);
                        setSelectedInstallmentId(item.installmentId || null);
                        setEditingPaymentId(null);
                        setPayAmount(item.balance);
                        setPayMethod(item.sale.paymentMethod || 'PIX');
                        setPayFee(0);
                        setCurrentReceiptUrl(undefined);
                        setUploadError(null);
                        setUploadError(null);
                        setIsModalOpen(true);
                      }} className="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center ml-auto transition-colors">
                        <ArrowDownCircle size={16} className="mr-1" /> DAR BAIXA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center"><History size={20} className="mr-2 text-blue-500" /> Recebimentos Recentes</h3>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[500px] overflow-y-auto space-y-3">
            {recentPayments.map(p => {
              const sale = sales.find(s => s.id === p.saleId);
              const bank = bankAccounts.find(b => b.id === p.bankAccountId);
              return (
                <div key={p.id} className="p-4 bg-white rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-slate-50/80 transition-all group shadow-sm cursor-default">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.method} • {formatDateDisplay(p.date)}</span>
                      <p className="text-sm font-black text-slate-800 truncate max-w-[140px]">{sale?.customerName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">
                        Nº Docto: {sale?.nfNumber || 'S/N'}
                        {p.installmentId && sale?.installmentsList ? ` - Parcela ${sale.installmentsList.find(i => i.id === p.installmentId)?.number || ''}` : ''}
                      </p>
                      {p.receiptUrl && (
                        <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline font-bold mt-1 flex items-center">
                          <FileText size={12} className="mr-1" /> COMPROVANTE
                        </a>
                      )}
                    </div>
                    <p className="text-base font-black text-emerald-600">{formatCurrency(p.amount)}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex items-center text-blue-600 font-black text-[10px] uppercase truncate max-w-[120px]">
                      <Building2 size={12} className="mr-1 flex-shrink-0" />
                      {bank?.bankName || 'BANCO'}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          const sale = sales.find(s => s.id === p.saleId);
                          if (!sale) return;
                          setEditingPaymentId(p.id);
                          setSelectedSaleId(p.saleId);
                          setPayAmount(p.amount);
                          setPayFee(p.fee || 0);
                          setPayDate(p.date);
                          setPayMethod(p.method);
                          setBankAccountId(p.bankAccountId);
                          setCurrentReceiptUrl(p.receiptUrl);
                          setUploadError(null);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Estorno?</h3>
            <p className="text-sm text-slate-600 mb-6">Confirma a exclusão deste recebimento? O saldo retornará para a venda.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDeletePayment(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Estorno</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingPaymentId ? 'Alterar Recebimento' : 'Baixa de Título'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingPaymentId(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Devedor</p>
                <p className="font-bold text-slate-800 text-lg">{selectedSale.customerName}</p>
                <p className="text-sm text-rose-600 font-bold mt-1">
                  Valor a Receber: {formatCurrency(currentBalance)} <span className="text-slate-300 mx-1">|</span> Nº Docto: {selectedSale.nfNumber || 'S/N'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Valor Recebido *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-600">R$</span>
                    <input
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-2 border rounded-lg font-black text-emerald-600 text-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formatInputCurrency(payAmount)}
                      onChange={(e) => setPayAmount(parseCurrencyInput(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase text-[10px]">Condição / Parcela</label>
                  <input
                    readOnly
                    className="w-full px-4 py-2 border rounded-lg bg-slate-100 outline-none font-bold text-slate-600 cursor-not-allowed text-sm uppercase"
                    value={(() => {
                      if (!selectedInstallmentId) return selectedSale.paymentCondition === 'A Vista' ? 'À VISTA' : 'ÚNICA';
                      const inst = selectedSale.installmentsList?.find(i => i.id === selectedInstallmentId);
                      return inst ? `PARCELA ${inst.number}/${selectedSale.installmentsList?.length}` : 'PARCELA';
                    })()}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Conta Destino (Banco) *</label>
                <select required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                  <option value="">Selecione o Banco de Destino...</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Data Recebido</label>
                  <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Forma Pagto</label>
                  <select className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência (TED/DOC)</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão">Outro Cartão</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold mb-1 text-slate-700 flex items-center justify-between">
                  <span>Comprovante de Recebimento</span>
                  {isUploading && <span className="text-[10px] text-emerald-500 font-bold animate-pulse">Enviando...</span>}
                </label>
                <div className="flex items-center gap-3 w-full px-4 py-2 border rounded-lg bg-slate-50 border-slate-200">
                  {currentReceiptUrl ? (
                    <div className="flex items-center justify-between w-full">
                      <a href={currentReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-bold flex items-center truncate max-w-[250px]" title="Ver Comprovante">
                        <FileText size={16} className="mr-1 flex-shrink-0" /> Comprovante Anexado
                      </a>
                      <button type="button" onClick={() => setCurrentReceiptUrl(undefined)} className="text-rose-500 hover:text-rose-700 p-1 rounded-full hover:bg-rose-100 transition-colors" title="Remover Comprovante">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 w-full">
                      <input
                        type="file"
                        disabled={isUploading}
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 disabled:opacity-50 outline-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
                {uploadError && <p className="text-[10px] text-rose-500 mt-1 font-bold">{uploadError}</p>}
              </div>

              {(payMethod === 'Cartão' || payMethod === 'Cartão de Crédito' || payMethod === 'Cartão de Débito') && (
                <div className="animate-in fade-in zoom-in duration-200">
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Taxas do Cartão (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-rose-400">R$</span>
                    <input
                      required
                      className="w-full pl-10 pr-4 py-2 border rounded-lg font-bold text-rose-500 focus:ring-2 focus:ring-rose-500 outline-none"
                      value={formatInputCurrency(payFee)}
                      onChange={(e) => setPayFee(parseCurrencyInput(e.target.value))}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Líquido a creditar: {formatCurrency(payAmount)} | Abatimento no saldo: {formatCurrency(payAmount + payFee)}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-8">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingPaymentId(null); }} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" disabled={isUploading} className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-lg shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">{editingPaymentId ? 'Salvar Alteração' : 'Confirmar Recebimento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivablesManager;
