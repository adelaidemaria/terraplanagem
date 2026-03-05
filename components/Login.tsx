import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
    onLogin: (username: string, pass: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await onLogin(email, password);
        if (!success) {
            setError('Credenciais inválidas. Tente novamente.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 sm:p-12 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700">
                <div className="flex justify-center mb-8">
                    <Logo size="lg" className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50" />
                </div>

                <h2 className="text-2xl font-black text-white text-center mb-8 tracking-tight">
                    Acesso Restrito
                </h2>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl mb-6 flex items-start text-sm">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            E-mail
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                placeholder="E-mail"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            Senha
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyRound size={18} className="text-slate-500" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-amber-500 text-slate-900 font-black py-4 rounded-xl hover:bg-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed mt-8 shadow-xl shadow-amber-500/20"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Lock size={20} className="mr-2" /> Entrar no Sistema
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
