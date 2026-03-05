
import React, { useState } from 'react';
import { Plus, Trash2, Building2, X, Edit, AlertTriangle, Wallet, Lock } from 'lucide-react';
import { BankAccount, Payment, Expense } from '../types';

interface BankAccountManagerProps {
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  payments?: Payment[];
  expenses?: Expense[];
}

const BankAccountManager: React.FC<BankAccountManagerProps> = ({ bankAccounts, setBankAccounts, payments = [], expenses = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    bankName: '',
    agency: '',
    accountNumber: '',
    initialBalance: 0,
    isBlocked: false
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatInputCurrency = (value: number) => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ bankName: '', agency: '', accountNumber: '', initialBalance: 0, isBlocked: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bank: BankAccount) => {
    setEditingId(bank.id);
    setFormData(bank);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setBankAccounts(prev => prev.filter(b => b.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankName) return alert('O nome do banco é obrigatório.');

    const bankData = {
      ...formData,
      initialBalance: formData.initialBalance || 0
    } as BankAccount;

    if (editingId) {
      setBankAccounts(prev => prev.map(b => b.id === editingId ? { ...b, ...bankData } : b));
    } else {
      setBankAccounts(prev => [...prev, { id: crypto.randomUUID(), ...bankData }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <Building2 size={20} className="mr-2 text-amber-500" /> Contas Bancárias
        </h3>
        <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md transition-all">
          <Plus size={18} /> <span>Nova Conta</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Instituição</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Agência / Conta</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Saldo Inicial</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bankAccounts.length > 0 ? bankAccounts.map(bank => (
              <tr key={bank.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4 font-bold text-slate-800">
                  {bank.bankName}
                  {bank.isBlocked && <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold inline-flex items-center"><Lock size={10} className="mr-1" /> BLOQUEADO</span>}
                </td>
                <td className="px-6 py-4 text-slate-600">{bank.agency} / {bank.accountNumber}</td>
                <td className="px-6 py-4 font-semibold text-slate-700">{formatCurrency(bank.initialBalance || 0)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenEdit(bank)} className="p-2 text-slate-400 hover:text-amber-500"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(bank.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic font-medium">Cadastre aqui os bancos onde você recebe seus pagamentos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            {payments.some(p => p.bankAccountId === deleteConfirmId) || expenses.some(e => e.bankAccountId === deleteConfirmId) ? (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> EXCLUSÃO NÃO AUTORIZADA</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Existem lançamentos vinculados a esta conta bancária. Bloqueie a conta se não for mais utilizá-la.</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-300">Voltar</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Remover Banco?</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Isso pode afetar o histórico de recebimentos. Confirma a exclusão?</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Alterar Conta' : 'Nova Conta Bancária'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Nome do Banco / Instituição *</label>
                <input
                  autoFocus
                  required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Ex: Santander, Nubank, Itaú..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Agência</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.agency} onChange={(e) => setFormData({ ...formData, agency: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Conta Corrente</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Saldo Inicial (Sistêmico) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                  <input
                    required
                    className="w-full pl-10 pr-4 py-2 border rounded-lg font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formatInputCurrency(formData.initialBalance || 0)}
                    onChange={(e) => setFormData({ ...formData, initialBalance: parseCurrencyInput(e.target.value) })}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter italic">Esse valor será o ponto de partida para todos os extratos.</p>
              </div>

              <div className="mt-4 border-t pt-4">
                <label className="flex items-center cursor-pointer space-x-3 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.isBlocked || false}
                      onChange={(e) => setFormData({ ...formData, isBlocked: e.target.checked })}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isBlocked ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isBlocked ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 select-none">Conta Bloqueada</span>
                </label>
                {formData.isBlocked && <p className="text-xs text-rose-500 mt-2 font-medium">Ao bloquear a conta, ela deixará de aparecer como opção para novos lançamentos de despesas e receitas.</p>}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-lg">Confirmar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountManager;
