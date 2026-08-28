import React, { useState, useEffect, useCallback } from 'react';
import { Download, Upload, ShieldCheck, AlertTriangle, FileJson, CheckCircle2, RefreshCw, Lock, Database, History, Clock, FileText } from 'lucide-react';
import { exportDatabaseBackup, restoreDatabaseBackup, BackupMetadata, ORDERED_TABLES, getBackupHistoryAsync, HistoryEntry } from '../lib/backupService';
import { supabase } from '../lib/supabase';

const BackupManager: React.FC = () => {
    const [exporting, setExporting] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Live Stats
    const [stats, setStats] = useState<{ totalTables: number; totalRows: number; loading: boolean }>({
        totalTables: 0,
        totalRows: 0,
        loading: true
    });

    // History state
    const [history, setHistory] = useState<{ backups: HistoryEntry[]; restores: HistoryEntry[] }>({ backups: [], restores: [] });

    // Restore state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedBackup, setParsedBackup] = useState<BackupMetadata | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [progressText, setProgressText] = useState('');

    const CONFIRM_PHRASE = 'RESTAURAR BANCO DE DADOS';

    const refreshHistory = useCallback(async () => {
        const data = await getBackupHistoryAsync();
        setHistory(data);
    }, []);

    const loadStats = useCallback(async () => {
        setStats(prev => ({ ...prev, loading: true }));
        try {
            let total = 0;
            let activeTables = 0;

            for (const tbl of ORDERED_TABLES) {
                const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
                if (!error && count !== null) {
                    total += count;
                    if (count > 0) activeTables++;
                }
            }

            setStats({ totalTables: activeTables, totalRows: total, loading: false });
        } catch {
            setStats({ totalTables: 0, totalRows: 0, loading: false });
        }
    }, []);

    useEffect(() => {
        loadStats();
        refreshHistory();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        setMessage(null);
        const result = await exportDatabaseBackup();
        setExporting(false);

        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            loadStats();
            refreshHistory();
        } else {
            setMessage({ type: 'error', text: result.message });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setMessage({ type: 'error', text: 'Por favor, selecione um arquivo válido no formato .json' });
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = JSON.parse(event.target?.result as string);
                if (!content.tables || typeof content.tables !== 'object') {
                    throw new Error('Formato de backup inválido.');
                }
                setParsedBackup(content as BackupMetadata);
            } catch (err: any) {
                setMessage({ type: 'error', text: 'O arquivo selecionado está corrompido ou é inválido.' });
                setSelectedFile(null);
                setParsedBackup(null);
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmRestore = async () => {
        if (!parsedBackup) return;

        setShowConfirmModal(false);
        setRestoring(true);
        setMessage(null);

        const result = await restoreDatabaseBackup(parsedBackup, (stepText, current, total) => {
            setProgressText(`${stepText} (${current}/${total})`);
        });

        setRestoring(false);
        setProgressText('');

        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            setSelectedFile(null);
            setParsedBackup(null);
            setConfirmText('');
            loadStats();
            refreshHistory();
        } else {
            setMessage({ type: 'error', text: result.message });
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-4 sm:p-6">
            {/* Header Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                    <Database size={240} className="text-amber-500" />
                </div>
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck size={14} /> Segurança & Backup Blindado
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Central de Backup e Restauração
                    </h2>
                    <p className="text-slate-400 text-sm max-w-2xl">
                        Gere cópias de segurança completas da nuvem ou restaure seus dados por **Substituição Exata** com **Auto-Backup de Emergência automático**.
                    </p>
                </div>
            </div>

            {/* Alert Notification */}
            {message && (
                <div className={`p-4 rounded-2xl border flex items-start space-x-3 text-sm font-semibold transition-all ${
                    message.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div>{message.text}</div>
                </div>
            )}

            {/* Two Column Grid: EXPORT & RESTORE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. GERAR BACKUP (EXPORTAR) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Exportar Cópia de Segurança</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Baixa um arquivo contendo todas as vendas, compras, orçamentos, ordens de serviço, veículos e cadastros.
                            </p>
                        </div>

                        {/* Live Stat Box */}
                        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2">
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>Status do Banco Supabase:</span>
                                <button 
                                    onClick={loadStats}
                                    className="hover:text-amber-400 transition-colors flex items-center gap-1"
                                    title="Atualizar estatísticas"
                                >
                                    <RefreshCw size={12} className={stats.loading ? 'animate-spin' : ''} />
                                    Atualizar
                                </button>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-2xl font-black text-amber-400">
                                    {stats.loading ? '...' : `${stats.totalRows} registros`}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {stats.totalTables} tabelas ativas
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="w-full mt-6 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
                    >
                        {exporting ? (
                            <>
                                <RefreshCw size={20} className="animate-spin" /> Gerando Backup...
                            </>
                        ) : (
                            <>
                                <Download size={20} /> Baixar Backup Completo (.json)
                            </>
                        )}
                    </button>
                </div>

                {/* 2. RESTAURAR BACKUP (IMPORTAR - SUBSTITUIÇÃO EXATA) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Restaurar Banco de Dados</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Restauração por **Substituição Exata**. Retorna o banco 100% exatamente para o estado do arquivo baixado.
                            </p>
                        </div>

                        {/* File Picker */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Selecionar Arquivo de Backup
                            </label>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                disabled={restoring}
                                className="w-full text-xs text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer bg-slate-950/60 p-2 rounded-2xl border border-slate-800"
                            />
                        </div>

                        {/* File Preview */}
                        {parsedBackup && (
                            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                    <FileJson size={16} /> Arquivo Válido Carregado
                                </div>
                                <div className="text-slate-300">
                                    <strong>Data de Criação:</strong> {new Date(parsedBackup.createdAt).toLocaleString('pt-BR')}
                                </div>
                                <div className="text-slate-300">
                                    <strong>Total de Registros:</strong> {parsedBackup.totalRecords || 0}
                                </div>
                            </div>
                        )}

                        {restoring && progressText && (
                            <div className="text-xs text-amber-400 font-semibold flex items-center gap-2 animate-pulse">
                                <RefreshCw size={14} className="animate-spin" /> {progressText}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={!parsedBackup || restoring}
                        className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-600/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Upload size={20} /> Iniciar Restauração de Dados
                    </button>
                </div>
            </div>

            {/* 3. HISTÓRICO DE OPERAÇÕES (ÚLTIMOS 3 BACKUPS E ÚLTIMA RESTAURAÇÃO) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <History size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Histórico de Atividades</h3>
                            <p className="text-xs text-slate-400">Registro dos 3 últimos backups gerados e da última restauração efetuada.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lista dos Últimos 3 Backups */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Download size={14} className="text-amber-400" /> Últimos 3 Backups Exportados
                        </h4>
                        {history.backups.length === 0 ? (
                            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 text-xs text-slate-500 italic">
                                Nenhum backup registrado no histórico ainda.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.backups.map((item) => (
                                    <div key={item.id} className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                                        <div className="space-y-1">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <FileText size={14} className="text-amber-400" />
                                                <span className="truncate max-w-[180px] sm:max-w-[220px]" title={item.filename}>
                                                    {item.filename}
                                                </span>
                                            </div>
                                            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                                                <Clock size={12} /> {new Date(item.createdAt).toLocaleString('pt-BR')}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="inline-block px-2.5 py-0.5 bg-amber-500/10 text-amber-400 font-bold rounded-lg text-[11px]">
                                                {item.totalRecords} registros
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Última Restauração */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Upload size={14} className="text-blue-400" /> Última Restauração Efetuada
                        </h4>
                        {history.restores.length === 0 ? (
                            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 text-xs text-slate-500 italic">
                                Nenhuma restauração realizada recentemente.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.restores.slice(0, 1).map((item) => (
                                    <div key={item.id} className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                                        <div className="space-y-1">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <ShieldCheck size={14} className="text-blue-400" />
                                                Substituição Exata Concluída
                                            </div>
                                            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                                                <Clock size={12} /> {new Date(item.createdAt).toLocaleString('pt-BR')}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="inline-block px-2.5 py-0.5 bg-blue-500/10 text-blue-400 font-bold rounded-lg text-[11px]">
                                                {item.totalRecords} registros restaurados
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE CONFIRMAÇÃO DE SEGURANÇA */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
                            <AlertTriangle size={32} />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-white">Confirmação de Substituição Exata</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                O banco de dados retornará **100% exatamente** para o estado do backup selecionado. Lançamentos criados *após* a data deste backup serão revertidos.
                            </p>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-xs text-amber-300 flex items-center gap-2">
                            <ShieldCheck size={18} className="flex-shrink-0 text-amber-400" />
                            <span>
                                **Auto-Backup de Segurança Automático**: O sistema baixará uma cópia de emergência da sua base atual segundos antes de restaurar!
                            </span>
                        </div>

                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-xs text-rose-400 space-y-2">
                            <div className="font-bold flex items-center gap-1.5">
                                <Lock size={14} /> Digite a palavra de confirmação abaixo:
                            </div>
                            <code className="block text-center text-white bg-slate-950 py-1.5 rounded-lg font-mono font-bold tracking-widest text-sm">
                                {CONFIRM_PHRASE}
                            </code>
                        </div>

                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Digite a palavra de confirmação aqui..."
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm font-semibold text-center uppercase"
                        />

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setConfirmText('');
                                }}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmRestore}
                                disabled={confirmText.trim() !== CONFIRM_PHRASE}
                                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-rose-600/20"
                            >
                                Confirmar Restauração
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackupManager;
