import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, AlertTriangle, ArrowRightLeft, X, Building2, Printer, PiggyBank, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { BankAccount, FinancialYield, AccountPlan } from '../types';

interface YieldManagerProps {
    bankAccounts: BankAccount[];
    yields: FinancialYield[];
    setYields: React.Dispatch<React.SetStateAction<FinancialYield[]>>;
    accountPlan: AccountPlan[];
    onGoToReports: (type?: string) => void;
}

const YieldManager: React.FC<YieldManagerProps> = ({ bankAccounts, yields, setYields, accountPlan, onGoToReports }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [yieldType, setYieldType] = useState<'Receita' | 'Despesa'>('Receita');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                dateInputRef.current?.focus();
            }, 100);
        }
    }, [isModalOpen]);

    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toLocaleDateString('en-CA'));
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [period, setPeriod] = useState<'7days' | 'current' | 'last' | 'thisYear' | 'custom'>('7days');

    const [formData, setFormData] = useState<Partial<FinancialYield>>({
        accountPlanId: '',
        bankAccountId: '',
        amount: 0,
        date: new Date().toLocaleDateString('en-CA'),
        description: ''
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
        setIsSubmitting(false);
        setYieldType('Receita');
        setFormData({
            accountPlanId: '',
            bankAccountId: '',
            amount: 0,
            date: new Date().toLocaleDateString('en-CA'),
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (financialYield: FinancialYield) => {
        setEditingId(financialYield.id);
        setIsSubmitting(false);
        const ap = accountPlan.find(p => p.id === financialYield.accountPlanId);
        setYieldType(ap?.type === 'Despesa' ? 'Despesa' : 'Receita');
        setFormData(financialYield);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setYields(prev => prev.filter(t => t.id !== id));
        setDeleteConfirmId(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.accountPlanId || !formData.bankAccountId) {
            alert('Selecione a conta de origem (Receita) e a conta de destino (Banco).');
            return;
        }

        if (!formData.amount || formData.amount <= 0) {
            alert('O valor do rendimento deve ser maior que zero.');
            return;
        }

        if (!formData.date) {
            alert('A data de lançamento é obrigatória.');
            return;
        }

        setIsSubmitting(true);

        const yieldData = {
            ...formData,
        } as FinancialYield;

        if (editingId) {
            setYields(prev => prev.map(t => t.id === editingId ? { ...t, ...yieldData } : t));
            setIsModalOpen(false);
        } else {
            const newId = crypto.randomUUID();
            const newCreatedAt = Date.now();
            setYields(prev => [{
                ...yieldData,
                id: newId,
                createdAt: newCreatedAt
            }, ...prev]);

            setFormData({
                accountPlanId: '',
                bankAccountId: formData.bankAccountId, // Mantém a conta de destino preenchida
                amount: 0,
                date: formData.date,
                description: ''
            });
        }

        setTimeout(() => {
            dateInputRef.current?.focus();
            setIsSubmitting(false);
        }, 500);
    };

    const filteredYields = useMemo(() => {
        return yields
            .filter(t => {
                const yieldDate = t.date;
                return (!startDate || yieldDate >= startDate) && (!endDate || yieldDate <= endDate);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [yields, startDate, endDate]);

    const financialAccounts = useMemo(() => {
        return accountPlan.filter(p => {
            if (p.type !== yieldType) return false;
            const catUpper = p.category.toUpperCase();
            const subUpper = p.subcategory.toUpperCase();
            
            if (yieldType === 'Receita') {
                if (catUpper.includes('FINANCEIR') || subUpper.includes('FINANCEIR')) return true;
                if (catUpper.includes('OPERACIONAL') || subUpper.includes('SERVIÇO') || subUpper.includes('LOCAÇÃO')) return false;
                return true;
            } else {
                // Return only financial expenses for Despesa
                return catUpper.includes('FINANCEIR') || subUpper.includes('FINANCEIR') || 
                       catUpper.includes('TAXA') || subUpper.includes('TAXA') || 
                       catUpper.includes('JURO') || subUpper.includes('JURO') || 
                       catUpper.includes('TARIFA') || subUpper.includes('TARIFA') ||
                       catUpper.includes('IRRF') || subUpper.includes('IOF');
            }
        });
    }, [accountPlan, yieldType]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <PiggyBank className="mr-2 text-indigo-500" /> Rendimentos e Juros de Aplicações
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Data Inicial"
                        />
                        <span className="text-slate-400 hidden sm:inline">até</span>
                        <input
                            type="date"
                            className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
                            title="Data Final"
                        />
                        <select
                            className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 font-bold focus:ring-2 focus:ring-indigo-500/20"
                            value={period}
                            onChange={(e) => {
                                const val = e.target.value as '7days' | 'current' | 'last' | 'thisYear' | 'custom';
                                setPeriod(val);
                                const today = new Date();
                                if (val === '7days') {
                                    setStartDate(new Date(new Date().setDate(today.getDate() - 7)).toLocaleDateString('en-CA'));
                                    setEndDate(today.toLocaleDateString('en-CA'));
                                } else if (val === 'current') {
                                    setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
                                    setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA'));
                                } else if (val === 'last') {
                                    setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-CA'));
                                    setEndDate(new Date(today.getFullYear(), today.getMonth(), 0).toLocaleDateString('en-CA'));
                                } else if (val === 'thisYear') {
                                    setStartDate(new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
                                    setEndDate(new Date(today.getFullYear(), 11, 31).toLocaleDateString('en-CA'));
                                }
                            }}
                        >
                            <option value="7days">Últimos 7 dias</option>
                            <option value="current">Mês Atual</option>
                            <option value="last">Mês Anterior</option>
                            <option value="thisYear">Ano Atual</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    <div className="flex space-x-3 w-full sm:w-auto">
                        <button
                            onClick={() => onGoToReports('bankStatement')}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md transition-colors justify-center w-full sm:w-auto whitespace-nowrap"
                        >
                            <Printer size={18} />
                            <span>Extrato Bancário</span>
                        </button>
                        <button onClick={handleOpenAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md transition-colors w-full sm:w-auto justify-center whitespace-nowrap">
                            <Plus size={18} /> <span>Novo Rendimento</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Data</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Conta Receita/Despesa</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Banco Vinculado</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Histórico</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Valor</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredYields.length > 0 ? filteredYields.map(trans => {
                            const sourcePlan = accountPlan.find(p => p.id === trans.accountPlanId);
                            const destBank = bankAccounts.find(b => b.id === trans.bankAccountId);

                            return (
                                <tr key={trans.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4 text-slate-600 font-bold whitespace-nowrap">
                                        {trans.date.split('-').reverse().join('/')}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-semibold">
                                        <div className={`flex items-center text-xs ${sourcePlan?.type === 'Despesa' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {sourcePlan ? `${sourcePlan.type} / ${sourcePlan.description}` : 'Plano Não Encontrado'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-semibold">
                                        <div className={`flex items-center text-xs ${sourcePlan?.type === 'Despesa' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            <Building2 size={12} className="mr-1" />
                                            {destBank?.bankName || 'Banco Excluído'} {sourcePlan?.type === 'Despesa' ? '(Débito)' : '(Crédito)'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[200px]">
                                        {trans.description || 'S/ Histórico'}
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-800">
                                        {formatCurrency(trans.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={() => handleOpenEdit(trans)} className="p-2 text-slate-400 hover:text-indigo-500"><Edit size={18} /></button>
                                            <button onClick={() => setDeleteConfirmId(trans.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic font-medium">Nenhum rendimento registrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
                        <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Rendimento?</h3>
                        <p className="text-sm text-slate-600 mb-6 font-medium">Tem certeza que deseja apagar este lançamento? Isso afetará o extrato do banco de destino.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                            <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-150">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Operação Financeira' : 'Nova Operação Financeira'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setYieldType('Receita')}
                                    className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${yieldType === 'Receita' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <ArrowUpCircle size={18} /> Receita (Rendimento)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setYieldType('Despesa')}
                                    className={`flex-1 py-2 font-bold text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${yieldType === 'Despesa' ? 'bg-rose-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <ArrowDownCircle size={18} /> Despesa (Taxas/IR)
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Data do Lançamento *</label>
                                    <input
                                        required
                                        ref={dateInputRef}
                                        autoFocus
                                        type="date"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Valor (R$) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                                        <input
                                            required
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formatInputCurrency(formData.amount || 0)}
                                            onChange={(e) => setFormData({ ...formData, amount: parseCurrencyInput(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 space-y-4">
                                <div>
                                    <label className={`block text-xs font-bold mb-1 uppercase ${yieldType === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {yieldType === 'Receita' ? 'Conta Destino (Crédito) *' : 'Conta Origem (Débito) *'}
                                    </label>
                                    <select
                                        required
                                        className={`w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 ${yieldType === 'Receita' ? 'focus:ring-emerald-400' : 'focus:ring-rose-400'}`}
                                        value={formData.bankAccountId}
                                        onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                                    >
                                        <option value="">{yieldType === 'Receita' ? 'Selecione o Banco onde vai Creditar...' : 'Selecione o Banco onde debitou...'}</option>
                                        {bankAccounts.filter(b => !b.isBlocked || b.id === formData.bankAccountId).map(b => (
                                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} {b.isBlocked ? '(BLOQUEADO)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold mb-1 uppercase ${yieldType === 'Receita' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {yieldType === 'Receita' ? 'Conta Receita (Plano de Contas) *' : 'Conta Despesa (Plano de Contas) *'}
                                    </label>
                                    <select
                                        required
                                        className={`w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 ${yieldType === 'Receita' ? 'focus:ring-rose-400' : 'focus:ring-emerald-400'}`}
                                        value={formData.accountPlanId}
                                        onChange={(e) => setFormData({ ...formData, accountPlanId: e.target.value })}
                                    >
                                        <option value="">{yieldType === 'Receita' ? 'Selecione a Receita Financeira...' : 'Selecione a Despesa Financeira...'}</option>
                                        {financialAccounts.map(p => (
                                            <option key={p.id} value={p.id}>{p.category} - {p.subcategory} - {p.description}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1 text-slate-700">Histórico do Lançamento</label>
                                <textarea
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="Ex: Rendimentos Nubank, Aplicação CDB..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold" disabled={isSubmitting}>Cancelar</button>
                                <button type="submit" className={`px-6 py-2 text-white font-bold rounded-lg shadow-lg ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-500'}`} disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar Operação'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YieldManager;
