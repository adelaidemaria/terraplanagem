import React, { useState, useMemo } from 'react';
import { AgendaItem } from '../types';
import { Plus, Trash2, CheckCircle, Circle, AlertCircle, Clock, CalendarIcon, X, Filter, Calendar, Printer } from 'lucide-react';

interface AgendaManagerProps {
    agendaItems: AgendaItem[];
    setAgendaItems: React.Dispatch<React.SetStateAction<AgendaItem[]>>;
    onNavigateToReports: () => void;
}

type DateFilterType = 'all' | 'today' | '7days' | 'custom';
type StatusFilterType = 'all' | 'pending' | 'scheduled' | 'completed';

const AgendaManager: React.FC<AgendaManagerProps> = ({ agendaItems, setAgendaItems, onNavigateToReports }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');

    // Filters State
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
    const [dateFilterType, setDateFilterType] = useState<DateFilterType>('7days');
    const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
    const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduledDate: todayStr,
        category: 'Lembrete' as 'Lembrete' | 'Urgente'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const dataToSave = {
            ...formData,
            title: formData.title.toUpperCase()
        };

        if (editingItemId) {
            setAgendaItems(prev => prev.map(item =>
                item.id === editingItemId
                    ? { ...item, ...dataToSave }
                    : item
            ));
        } else {
            const newItem: AgendaItem = {
                id: crypto.randomUUID(),
                title: dataToSave.title,
                description: dataToSave.description,
                scheduledDate: dataToSave.scheduledDate,
                category: dataToSave.category,
                completed: false,
                createdAt: Date.now()
            };
            setAgendaItems(prev => [...prev, newItem]);
        }

        setIsModalOpen(false);
        setEditingItemId(null);
        setFormData({
            title: '',
            description: '',
            scheduledDate: todayStr,
            category: 'Lembrete'
        });
    };

    const handleEdit = (item: AgendaItem) => {
        setFormData({
            title: item.title,
            description: item.description || '',
            scheduledDate: item.scheduledDate,
            category: item.category
        });
        setEditingItemId(item.id);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setFormData({
            title: '',
            description: '',
            scheduledDate: todayStr,
            category: 'Lembrete'
        });
        setEditingItemId(null);
        setIsModalOpen(true);
    };

    const toggleComplete = (id: string, currentStatus: boolean) => {
        setAgendaItems(prev => prev.map(i => i.id === id ? { ...i, completed: !currentStatus } : i));
    };

    const deleteItem = (id: string) => {
        if (confirm('Tem certeza que deseja apagar este compromisso?')) {
            setAgendaItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const getStatusInfo = (item: AgendaItem) => {
        if (item.completed) {
            return { label: 'CONCLUÍDO', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle size={14} className="mr-1" />, value: 'completed' };
        }
        if (item.scheduledDate < todayStr) {
            return { label: 'PENDENTE', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: <AlertCircle size={14} className="mr-1" />, value: 'pending' };
        }
        return { label: 'AGENDADO', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock size={14} className="mr-1" />, value: 'scheduled' };
    };

    const filteredItems = useMemo(() => {
        let result = [...agendaItems];

        // Status Filter
        if (statusFilter !== 'all') {
            result = result.filter(item => {
                const status = getStatusInfo(item).value;
                return status === statusFilter;
            });
        } else {
            // "TODOS" shows only non-completed (Scheduled and Pending)
            result = result.filter(item => !item.completed);
        }

        // Date Filter
        if (dateFilterType === 'today') {
            result = result.filter(i => i.scheduledDate === todayStr);
        } else if (dateFilterType === '7days') {
            const sevenDaysLater = new Date();
            sevenDaysLater.setDate(sevenDaysLater.getDate() + 6);
            const sevenDaysLaterStr = sevenDaysLater.toLocaleDateString('en-CA');
            result = result.filter(i => i.scheduledDate >= todayStr && i.scheduledDate <= sevenDaysLaterStr);
        } else if (dateFilterType === 'custom') {
            result = result.filter(i => i.scheduledDate >= customStartDate && i.scheduledDate <= customEndDate);
        }

        result.sort((a, b) => {
            if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.category !== b.category) return a.category === 'Urgente' ? -1 : 1;
            return b.createdAt - a.createdAt;
        });
        return result;
    }, [agendaItems, statusFilter, dateFilterType, customStartDate, customEndDate]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Filters Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-indigo-100 p-3 rounded-xl">
                            <CalendarIcon className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Agenda de Tarefas</h2>
                            <p className="text-sm text-slate-500">Gerencie seus lembretes e compromissos</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row items-end gap-4 w-full xl:w-auto">
                        {/* Status Filter */}
                        <div className="flex flex-col space-y-1.5 flex-1 lg:w-48">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
                                <Filter size={12} className="mr-1" /> Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                                className="w-full rounded-xl border-slate-200 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium"
                            >
                                <option value="all">TODOS OS STATUS</option>
                                <option value="pending">PENDENTE</option>
                                <option value="scheduled">AGENDADO</option>
                                <option value="completed">CONCLUÍDO</option>
                            </select>
                        </div>

                        {/* Date Preset Filter */}
                        <div className="flex flex-col space-y-1.5 flex-1 lg:w-48">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
                                <Calendar size={12} className="mr-1" /> Período
                            </label>
                            <select
                                value={dateFilterType}
                                onChange={(e) => setDateFilterType(e.target.value as DateFilterType)}
                                className="w-full rounded-xl border-slate-200 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium"
                            >
                                <option value="all">TODAS AS DATAS</option>
                                <option value="today">HOJE</option>
                                <option value="7days">PRÓXIMOS 7 DIAS</option>
                                <option value="custom">PERSONALIZADO</option>
                            </select>
                        </div>

                        {/* Custom Date Inputs */}
                        {dateFilterType === 'custom' && (
                            <div className="flex flex-row gap-2 flex-1 items-end lg:w-auto">
                                <div className="flex flex-col space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="rounded-xl border-slate-200 border px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium"
                                    />
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="rounded-xl border-slate-200 border px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-2 w-full sm:w-auto md:col-span-2 lg:col-span-1">
                            <button
                                onClick={onNavigateToReports}
                                className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md"
                            >
                                <Printer size={18} />
                                <span className="uppercase tracking-wide text-xs">Relatório</span>
                            </button>
                            <button
                                onClick={handleNew}
                                className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-md active:scale-95 shadow-indigo-200"
                            >
                                <Plus size={20} />
                                <span className="uppercase tracking-wide text-xs">Novo</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid of Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-inner">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 uppercase mb-1">Nenhum compromisso</h3>
                        <p className="text-sm text-slate-500">Tente ajustar seus filtros para encontrar o que procura.</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const status = getStatusInfo(item);
                        const isUrgente = item.category === 'Urgente';
                        const isToday = item.scheduledDate === todayStr;

                        // Format date for display
                        const [y, m, d] = item.scheduledDate.split('-');
                        const displayDate = `${d}/${m}/${y}`;

                        // Calculate if date is in next 7 days (from tomorrow)
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);

                        const sevenDaysLater = new Date();
                        sevenDaysLater.setDate(tomorrow.getDate() + 6);
                        sevenDaysLater.setHours(23, 59, 59, 999);

                        const itemDate = new Date(`${item.scheduledDate}T00:00:00`);
                        const isNext7Days = itemDate >= tomorrow && itemDate <= sevenDaysLater;

                        const dateStyle = isToday
                            ? "bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg"
                            : isNext7Days && !item.completed
                                ? "bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-lg"
                                : "text-slate-400";

                        return (
                            <div key={item.id} className={`bg-white p-6 rounded-3xl border transition-all flex flex-col h-full ${item.completed ? 'opacity-60 grayscale-[0.3]' : 'shadow-sm hover:shadow-xl hover:-translate-y-1'} ${isUrgente && !item.completed ? 'border-l-8 border-l-rose-500 border-rose-100' : 'border-slate-200 shadow-slate-200/50'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col space-y-1">
                                        <span className={`text-[11px] font-black tracking-widest uppercase w-fit ${dateStyle}`}>
                                            {displayDate} {isToday && '(HOJE)'}
                                        </span>
                                        <h3 className={`text-lg font-black text-slate-800 leading-tight uppercase ${item.completed ? 'line-through text-slate-400' : ''}`}>
                                            {item.title}
                                        </h3>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${isUrgente ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {item.category.toUpperCase()}
                                    </span>
                                </div>

                                {item.description && (
                                    <div className="bg-slate-50/80 p-3 rounded-2xl mb-6 flex-grow border border-slate-100">
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed italic">{item.description}</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center bg-white pt-4 mt-auto">
                                    <span className={`flex items-center text-[10px] font-black px-3 py-1.5 rounded-xl border tracking-widest uppercase ${status.color}`}>
                                        {status.icon} {status.label}
                                    </span>

                                    <div className="flex space-x-1.5">
                                        {!item.completed && (
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90 border border-transparent hover:border-indigo-100"
                                                title="Editar compromisso"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleComplete(item.id, item.completed)}
                                            className={`p-2 rounded-xl transition-all active:scale-90 border border-transparent ${item.completed ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'}`}
                                            title={item.completed ? 'Reverter conclusão' : 'Marcar como concluído'}
                                        >
                                            {item.completed ? <CheckCircle className="fill-emerald-100/50" size={20} /> : <Circle size={20} />}
                                        </button>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90 border border-transparent hover:border-rose-100"
                                            title="Apagar compromisso"
                                        >
                                            <Trash2 size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal for New/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                {editingItemId ? 'Editar Compromisso' : 'Novo Compromisso'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Título <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-2xl border-slate-200 border px-5 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-bold uppercase"
                                    placeholder="EX: REUNIÃO COM FORNECEDOR..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Descrição</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-2xl border-slate-200 border px-5 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400 font-medium italic"
                                    placeholder="Detalhes opcionais sobre a tarefa..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Data <span className="text-rose-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.scheduledDate}
                                        onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                                        className="w-full rounded-2xl border-slate-200 border px-5 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Categoria</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as 'Lembrete' | 'Urgente' })}
                                        className="w-full rounded-2xl border-slate-200 border px-5 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold bg-slate-50 uppercase"
                                    >
                                        <option value="Lembrete">LEMBRETE 📝</option>
                                        <option value="Urgente">URGENTE 🔥</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 active:scale-95 uppercase tracking-widest text-xs"
                                >
                                    {editingItemId ? 'Salvar Alterações' : 'Salvar Compromisso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaManager;
