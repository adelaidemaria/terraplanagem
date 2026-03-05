import React, { useState, useMemo } from 'react';
import {
    Wallet, Search, Trash2, ArrowUpCircle, X, History, Building2, AlertTriangle, Edit, FileText
} from 'lucide-react';
import { Expense, Vendor, BankAccount } from '../types';
import { supabase } from '../lib/supabase';

interface PayablesManagerProps {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    vendors: Vendor[];
    bankAccounts: BankAccount[];
    onNavigateToReports?: () => void;
}

const formatDateDisplay = (dateStr: string | undefined) => {
    if (!dateStr) return '---';
    if (!dateStr.includes('-')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

const PayablesManager: React.FC<PayablesManagerProps> = ({ expenses, setExpenses, vendors, bankAccounts, onNavigateToReports }) => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA');

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [filterLabel, setFilterLabel] = useState('Hoje');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const [payDate, setPayDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [payMethod, setPayMethod] = useState('');
    const [bankAccountId, setBankAccountId] = useState('');
    const [payValue, setPayValue] = useState<number>(0);
    const [isInterestFee, setIsInterestFee] = useState(false);
    const [isEditingRecent, setIsEditingRecent] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | undefined>(undefined);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const formatInputCurrency = (value: number) => {
        return (value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const pendingExpenses = useMemo(() => {
        return expenses
            .filter(e => {
                const docDate = e.dueDate || e.date;
                const matchesSearch = e.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || (e.docNumber && e.docNumber.includes(searchTerm));
                const matchesDate = (!startDate || docDate >= startDate) && (!endDate || docDate <= endDate);
                return e.status === 'Pendente' && matchesSearch && matchesDate;
            })
            .sort((a, b) => new Date(a.dueDate || a.date).getTime() - new Date(b.dueDate || b.date).getTime());
    }, [expenses, searchTerm, startDate, endDate]);

    const paidExpenses = useMemo(() => {
        return expenses
            .filter(e => e.status === 'Pago' || (e.amountPaid && e.amountPaid > 0)) // Inclui parciais e pagos
            .sort((a, b) => new Date(b.paymentDate || b.date).getTime() - new Date(a.paymentDate || a.date).getTime())
            .slice(0, 10); // Limita aos últimos 10
    }, [expenses]);

    const selectedExpense = expenses.find(e => e.id === selectedExpenseId);

    const handleRegisterPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExpenseId || !selectedExpense) return;
        if (!bankAccountId) return alert('Selecione o banco de origem.');

        setExpenses(prev => {
            const originalValue = selectedExpense.totalValue;

            let newTotalPaid = payValue;
            if (!isEditingRecent) {
                newTotalPaid = (selectedExpense.amountPaid || 0) + payValue;
            }

            const diffOpen = originalValue - newTotalPaid;
            const isFullPayment = diffOpen <= 0.01;

            const isOverpaid = newTotalPaid > originalValue;
            const interest = (isOverpaid && isInterestFee) ? (newTotalPaid - originalValue) : 0;

            const updated = prev.map(exp => exp.id === selectedExpenseId ? {
                ...exp,
                status: isFullPayment ? 'Pago' : 'Pendente',
                bankAccountId,
                paymentMethod: payMethod,
                paymentDate: payDate,
                amountPaid: newTotalPaid,
                interestAmount: interest,
                paymentReceiptUrl: currentReceiptUrl
            } : exp);

            return updated;
        });

        setIsModalOpen(false);
        setIsInterestFee(false);
    };

    const handleUndoPayment = (id: string) => {
        setExpenses(prev => prev.map(exp => exp.id === id ? {
            ...exp,
            status: 'Pendente',
            bankAccountId: undefined,
            paymentDate: undefined,
            amountPaid: 0,
            interestAmount: 0,
            paymentReceiptUrl: undefined
        } : exp));
        setDeleteConfirmId(null);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Pesquisar contas a pagar..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        <Wallet className="mr-2 text-rose-500" />
                        Contas a Pagar ({filterLabel === 'Personalizado' ? `${formatDateDisplay(startDate)} a ${formatDateDisplay(endDate)}` : filterLabel})
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Fornecedor / Doc</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Valor a Pagar</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Vencimento</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingExpenses.map(expense => (
                                    <tr key={expense.id} className="group hover:bg-slate-200/70 transition-colors cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{expense.vendorName}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Doc: {expense.docNumber || 'S/N'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-rose-600">{formatCurrency(expense.totalValue - (expense.amountPaid || 0))}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{formatDateDisplay(expense.dueDate)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => {
                                                setSelectedExpenseId(expense.id);
                                                setPayMethod(expense.paymentMethod || 'PIX');
                                                setPayDate(new Date().toLocaleDateString('en-CA'));
                                                setBankAccountId('');
                                                const saldoAberto = expense.totalValue - (expense.amountPaid || 0);
                                                setPayValue(saldoAberto > 0 ? saldoAberto : expense.totalValue);
                                                setIsModalOpen(true);
                                                setIsInterestFee(false);
                                                setIsEditingRecent(false);
                                                setCurrentReceiptUrl(expense.paymentReceiptUrl);
                                                setUploadError(null);
                                            }} className="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center ml-auto transition-colors">
                                                <ArrowUpCircle size={16} className="mr-1" /> PAGAR
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pendingExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">Nenhuma conta pendente para este período.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center"><History size={20} className="mr-2 text-blue-500" /> Pagamentos Recentes</h3>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[500px] overflow-y-auto space-y-3">
                        {paidExpenses.map(expense => {
                            const bank = bankAccounts.find(b => b.id === expense.bankAccountId);
                            return (
                                <div key={expense.id} className="p-4 bg-white rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-slate-50/80 transition-all group shadow-sm cursor-default">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{expense.paymentMethod || 'OUTRO'} • Pago em: {formatDateDisplay(expense.paymentDate || expense.date)}</span>
                                            <p className="text-sm font-black text-slate-800 truncate max-w-[140px]">{expense.vendorName}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Nº Docto: {expense.docNumber || 'S/N'}</p>
                                            {expense.paymentReceiptUrl && (
                                                <a href={expense.paymentReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline font-bold mt-1 flex items-center">
                                                    <FileText size={12} className="mr-1" /> COMPROVANTE
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-base font-black text-rose-600">{formatCurrency(expense.amountPaid || expense.totalValue)}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <div className="flex items-center text-blue-600 font-black text-[10px] uppercase truncate max-w-[200px]">
                                            <Building2 size={12} className="mr-1 flex-shrink-0" />
                                            {bank?.bankName || 'BANCO'}
                                            {bank?.isBlocked && <span className="ml-1 text-rose-500 font-bold">(BLOQUEADO)</span>}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => {
                                                    setSelectedExpenseId(expense.id);
                                                    setPayDate(expense.paymentDate || expense.date);
                                                    setPayMethod(expense.paymentMethod || '');
                                                    setBankAccountId(expense.bankAccountId || '');
                                                    setPayValue(expense.amountPaid || expense.totalValue); // Define o valor pago
                                                    setIsModalOpen(true);
                                                    setIsInterestFee(!!expense.interestAmount && expense.interestAmount > 0);
                                                    setIsEditingRecent(true);
                                                    setCurrentReceiptUrl(expense.paymentReceiptUrl);
                                                    setUploadError(null);
                                                }}
                                                className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(expense.id)}
                                                className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                                title="Estornar (Voltar para Pendente)"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {paidExpenses.length === 0 && (
                            <div className="text-center text-slate-500 font-medium py-8">Nenhum pagamento registrado.</div>
                        )}
                    </div>
                </div>
            </div>

            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
                        <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Estorno?</h3>
                        <p className="text-sm text-slate-600 mb-6">Confirma o estorno deste pagamento? A despesa voltará para a lista de Contas a Pagar.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                            <button onClick={() => handleUndoPayment(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Estorno</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && selectedExpense && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{selectedExpense.status === 'Pago' ? 'Alterar Pagamento' : 'Baixar Pagamento'}</h2>
                            <button onClick={() => { setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleRegisterPayment} className="space-y-4">
                            <div className="bg-rose-50 p-4 rounded-xl mb-4 border border-rose-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pagar a</p>
                                <p className="font-bold text-slate-800 text-lg">{selectedExpense.vendorName}</p>
                                <p className="text-sm text-slate-500 mt-1">Valor Original: <span className="font-bold">{formatCurrency(selectedExpense.totalValue)}</span></p>
                                <p className="text-sm text-rose-600 font-bold mt-1">Saldo em Aberto: {formatCurrency(Math.max(0, selectedExpense.totalValue - (selectedExpense.amountPaid || 0)))}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Valor Pagamento *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-rose-600">R$</span>
                                        <input
                                            required
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg font-black text-rose-600 text-xl bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={formatInputCurrency(payValue)}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setPayValue(Number(val) / 100);
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Nº Docto</label>
                                    <input
                                        readOnly
                                        className="w-full px-4 py-2 border rounded-lg bg-slate-50 outline-none font-medium text-slate-600"
                                        value={selectedExpense.docNumber || 'S/N'}
                                    />
                                </div>
                            </div>

                            {payValue > (selectedExpense.totalValue - (isEditingRecent ? 0 : (selectedExpense.amountPaid || 0))) && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4 space-y-2">
                                    <p className="text-sm text-amber-800 font-bold flex items-center"><AlertTriangle className="mr-2" size={16} /> Valor Maior que o Saldo Original</p>
                                    <p className="text-sm text-amber-700 font-medium">Você está pagando {formatCurrency(payValue - (selectedExpense.totalValue - (isEditingRecent ? 0 : (selectedExpense.amountPaid || 0))))} a mais.</p>
                                    <label className="flex items-center space-x-2 mt-2 cursor-pointer text-sm font-bold text-amber-900 border-t border-amber-200/50 pt-3">
                                        <input type="checkbox" className="w-4 h-4 text-amber-600 rounded" checked={isInterestFee} onChange={e => setIsInterestFee(e.target.checked)} />
                                        <span>Esse valor extra é referente a Multas/Juros?</span>
                                    </label>
                                    {!isInterestFee && (
                                        <p className="text-xs text-amber-600 italic mt-1 ml-6">Marcando como Não, o valor integrará como Saldo Pago a Maior.</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold mb-1 text-slate-700">Pagar Com (Banco) *</label>
                                <select autoFocus required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                                    <option value="">Selecione a Conta Origem...</option>
                                    {bankAccounts
                                        .filter(b => !b.isBlocked || b.id === bankAccountId)
                                        .map(b => <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Data Pagamento</label>
                                    <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700">Forma Pagto</label>
                                    <select className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                                        <option value="PIX">PIX</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Boleto">Boleto</option>
                                        <option value="Transferência">Transferência (TED/DOC)</option>
                                        <option value="Cartão Corporativo">Cartão Corporativo</option>
                                        <option value="Débito">Débito</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-semibold mb-1 text-slate-700 flex items-center justify-between">
                                    <span>Comprovante de Pagamento</span>
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

                            <div className="flex justify-end space-x-3 mt-8">
                                <button type="button" onClick={() => { setIsModalOpen(false); }} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                                <button type="submit" disabled={isUploading} className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-lg shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">{selectedExpense.status === 'Pago' ? 'Salvar Alteração' : 'Confirmar Pagamento'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayablesManager;
