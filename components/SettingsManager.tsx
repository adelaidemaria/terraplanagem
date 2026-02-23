import React, { useState } from 'react';
import { ShieldAlert, Save, CheckCircle2 } from 'lucide-react';
import { AdminUser } from '../types';
import { supabase } from '../lib/supabase';

interface SettingsManagerProps {
    adminUser: AdminUser | null;
    onUpdateUser: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ adminUser, onUpdateUser }) => {
    const [username, setUsername] = useState(adminUser?.username || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUser) return;

        setLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const updates: any = { username };
            if (password.trim() !== '') {
                updates.password = password;
            }

            const { error } = await supabase
                .from('admin_users')
                .update(updates)
                .eq('id', adminUser.id);

            if (error) throw error;

            setSuccessMsg('Credenciais atualizadas com sucesso!');
            setPassword(''); // clear password field after save
            onUpdateUser(); // trigger a re-fetch of the user record to keep sync
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao atualizar credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-sm">
                <div className="bg-rose-100 p-3 rounded-full text-rose-600 flex-shrink-0">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">Acesso ao Sistema</h2>
                    <p className="text-slate-500 text-sm">
                        Gerencie o usuário e a senha utilizados para acessar o painel administrativo.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50/50 p-6 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 text-lg">Credenciais do Administrador</h3>
                </div>

                <form onSubmit={handleSave} className="p-8 sm:p-12 max-w-2xl">
                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-4 rounded-xl mb-8 flex items-center">
                            <CheckCircle2 size={18} className="mr-2 flex-shrink-0" />
                            <p className="font-medium text-sm">{successMsg}</p>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-4 rounded-xl mb-8 flex items-center">
                            <ShieldAlert size={18} className="mr-2 flex-shrink-0" />
                            <p className="font-medium text-sm">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                Nome de Usuário
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-medium text-slate-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                Nova Senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Deixe em branco para não alterar"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
                            />
                            <p className="text-xs text-slate-400 mt-2 font-medium">
                                Se não quiser alterar a senha atual, deixe este campo vazio.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center shadow-lg shadow-amber-500/20 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                            ) : (
                                <Save size={20} className="mr-2" />
                            )}
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsManager;
