
import React, { useState, useMemo } from 'react';
import { 
  HandCoins, Search, Trash2, ArrowDownCircle, X, History, Building2, AlertTriangle
} from 'lucide-react';
import { Sale, Payment, Customer, BankAccount } from '../types';

interface ReceivablesManagerProps {
  sales: Sale[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  bankAccounts: BankAccount[];
}

const ReceivablesManager: React.FC<ReceivablesManagerProps> = ({ sales, payments, setPayments, setSales, customers, bankAccounts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [payAmount, setPayAmount] = useState(0);
  const [payFee, setPayFee] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('PIX');
  const [bankAccountId, setBankAccountId] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const formatInputCurrency = (value: number) => {
    return (value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const getSaleBalance = (sale: Sale) => {
    const totalPaid = payments.filter(p => p.saleId === sale.id).reduce((sum, p) => sum + p.amount, 0);
    return sale.totalValue - totalPaid;
  };

  const pendingSales = useMemo(() => {
    return sales
      .filter(s => {
        const balance = getSaleBalance(s);
        return balance > 0.01 && (s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nfNumber?.includes(searchTerm));
      })
      .map(s => ({ ...s, balance: getSaleBalance(s) }));
  }, [sales, payments, searchTerm]);

  const selectedSale = sales.find(s => s.id === selectedSaleId);
  const currentBalance = selectedSale ? getSaleBalance(selectedSale) : 0;

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId || payAmount <= 0) return;
    if (!bankAccountId) return alert('Selecione o banco de destino.');

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      saleId: selectedSaleId,
      bankAccountId,
      amount: Number(payAmount),
      fee: payMethod === 'Cartão' ? Number(payFee) : 0,
      date: payDate,
      method: payMethod,
      createdAt: Date.now()
    };

    const newPayments = [newPayment, ...payments];
    setPayments(newPayments);

    const totalPaid = newPayments.filter(p => p.saleId === selectedSaleId).reduce((sum, p) => sum + p.amount, 0);
    const newStatus: Sale['status'] = totalPaid >= (selectedSale?.totalValue || 0) - 0.01 ? 'Pago' : totalPaid > 0 ? 'Parcial' : 'Pendente';
    
    setSales(prev => prev.map(s => s.id === selectedSaleId ? { ...s, status: newStatus } : s));
    setIsModalOpen(false);
  };

  const handleDeletePayment = (pId: string) => {
    const pToDelete = payments.find(p => p.id === pId);
    if (!pToDelete) return;
    const sId = pToDelete.saleId;
    const updatedPayments = payments.filter(p => p.id !== pId);
    setPayments(updatedPayments);
    const sale = sales.find(s => s.id === sId);
    if (sale) {
      const totalPaid = updatedPayments.filter(p => p.saleId === sId).reduce((sum, p) => sum + p.amount, 0);
      const newStatus: Sale['status'] = totalPaid >= sale.totalValue - 0.01 ? 'Pago' : totalPaid > 0 ? 'Parcial' : 'Pendente';
      setSales(prev => prev.map(s => s.id === sId ? { ...s, status: newStatus } : s));
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Pesquisar pendentes..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center"><HandCoins className="mr-2 text-emerald-500" /> Contas a Receber</h3>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Cliente / NF</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Saldo Aberto</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{sale.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">NF: {sale.nfNumber || 'S/N'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-rose-600">{formatCurrency(sale.balance)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { 
                        setSelectedSaleId(sale.id); 
                        setPayAmount(sale.balance); 
                        setPayMethod(sale.paymentMethod || 'PIX');
                        setPayFee(0);
                        setIsModalOpen(true); 
                      }} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center ml-auto">
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
            {payments.map(p => {
              const sale = sales.find(s => s.id === p.saleId);
              const bank = bankAccounts.find(b => b.id === p.bankAccountId);
              return (
                <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 relative group">
                  <button onClick={() => setDeleteConfirmId(p.id)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span>{p.method} - {new Date(p.date).toLocaleDateString()}</span>
                    <span className="text-blue-600 flex items-center"><Building2 size={10} className="mr-0.5" /> {bank?.bankName || 'BANCO'}</span>
                  </div>
                  <p className="text-sm font-bold truncate text-slate-800">{sale?.customerName}</p>
                  <p className="text-base font-black text-emerald-600">{formatCurrency(p.amount)}</p>
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
            <h2 className="text-xl font-bold text-slate-800 mb-6">Baixa de Título</h2>
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Devedor</p>
                <p className="font-bold text-slate-800 text-lg">{selectedSale.customerName}</p>
                <p className="text-sm text-rose-600 font-bold mt-1">Saldo Aberto: {formatCurrency(currentBalance)}</p>
              </div>

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
                <label className="block text-sm font-semibold mb-1 text-slate-700">Conta Destino (Banco) *</label>
                <select required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                  <option value="">Selecione o Banco de Destino...</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Data Baixa</label>
                  <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Forma</label>
                  <select className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">TED/DOC</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>
              </div>

              {payMethod === 'Cartão' && (
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
                  <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">O valor líquido a ser creditado será: {formatCurrency(payAmount - payFee)}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-lg shadow-xl shadow-emerald-200">Confirmar Recebimento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivablesManager;
