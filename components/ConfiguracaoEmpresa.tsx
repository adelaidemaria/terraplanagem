import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ConfiguracaoEmpresa, AdminUser } from '../types';
import { Building2, Save, Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert, User, Menu } from 'lucide-react';

interface ConfiguracaoEmpresaManagerProps {
  adminUser?: AdminUser | null;
  onUpdateUser?: () => void;
}

const ConfiguracaoEmpresaManager: React.FC<ConfiguracaoEmpresaManagerProps> = ({ adminUser, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'empresa' | 'acesso'>('empresa');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);
  const [uploading, setUploading] = useState(false);

  // Security States (from SettingsManager)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
    if (adminUser) {
      setEmail(adminUser.username || '');
    }
  }, [adminUser]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracao_empresa')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setConfig(data);
    } catch (err: any) {
      console.error('Erro ao buscar configurações:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('configuracao_empresa')
        .update({
          nome_fantasia: config.nome_fantasia,
          razao_social: config.razao_social,
          cnpj: config.cnpj,
          inscricao_municipal: config.inscricao_municipal,
          endereco: config.endereco,
          telefone: config.telefone,
          email: config.email,
          logo_url: config.logo_url,
          responsavel_nome: config.responsavel_nome,
          responsavel_assinatura_digital: config.responsavel_assinatura_digital,
          assinatura_tipo: config.assinatura_tipo,
          assinatura_url: config.assinatura_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Configurações da empresa salvas com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityLoading(true);
    setSecurityMessage(null);

    try {
      const updates: any = {};
      if (email && adminUser && email !== adminUser.username) {
        updates.email = email;
      }
      if (password.trim() !== '') {
        updates.password = password;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;
      }

      setSecurityMessage({ type: 'success', text: 'Credenciais atualizadas com sucesso! Talvez seja necessário confirmar o email ou relogar.' });
      setPassword(''); 
      if (onUpdateUser) onUpdateUser();
    } catch (err: any) {
      setSecurityMessage({ type: 'error', text: err.message || 'Erro ao atualizar credenciais.' });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    try {
      setUploading(true);
      setMessage(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${config.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logotipos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logotipos')
        .getPublicUrl(filePath);

      setConfig({ ...config, logo_url: publicUrl });
      
      await supabase
        .from('configuracao_empresa')
        .update({ logo_url: publicUrl })
        .eq('id', config.id);

      setMessage({ type: 'success', text: 'Logotipo atualizado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro no upload: ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-amber-500 mr-2" size={24} />
        <span className="text-slate-500 font-medium">Carregando configurações...</span>
      </div>
    );
  }

  if (!config) return <div>Erro ao carregar configurações.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header com Abas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20">
              <Building2 className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Configurações</h2>
              <p className="text-slate-400 text-sm font-medium">Gerencie os dados da sua empresa e o acesso de segurança.</p>
            </div>
          </div>

          <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700/50 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('empresa')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'empresa'
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Building2 size={18} />
              Dados da Empresa
            </button>
            <button
              onClick={() => setActiveTab('acesso')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'acesso'
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <ShieldAlert size={18} />
              Acesso ao Sistema
            </button>
          </div>
        </div>

        {activeTab === 'empresa' && (
          <form onSubmit={handleSaveConfig} className="p-8 space-y-8 animate-in fade-in duration-300">
            {message && (
              <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <span className="font-bold text-sm">{message.text}</span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-12 items-start text-start">
              <div className="w-full lg:w-1/3 space-y-8">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Logotipo Principal</label>
                  <div className="relative group w-full h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all hover:border-amber-500/50 group">
                    {config.logo_url ? (
                      <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-6" />
                    ) : (
                      <div className="text-center p-4">
                        <Building2 className="mx-auto text-slate-300 mb-2" size={40} />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Sem logotipo</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                      <div className="bg-white text-slate-900 p-2 rounded-full mb-2 shadow-xl">
                        {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                      </div>
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">
                        {uploading ? 'Enviando...' : 'Trocar Imagem'}
                      </span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 italic text-center">Formato ideal: PNG/JPG transparente 300x120px.</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Assinatura no Orçamento</label>
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl mb-6">
                    <button 
                      type="button"
                      onClick={() => setConfig({...config, assinatura_tipo: 'digital'})}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${config.assinatura_tipo === 'digital' ? 'bg-white text-amber-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Digital
                    </button>
                    <button 
                      type="button"
                      onClick={() => setConfig({...config, assinatura_tipo: 'imagem'})}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${config.assinatura_tipo === 'imagem' ? 'bg-white text-amber-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Upload
                    </button>
                  </div>

                  {config.assinatura_tipo === 'digital' ? (
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">Assinatura Manuscrita</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 text-lg font-medium signature text-indigo-900 bg-indigo-50/20"
                        value={config.responsavel_assinatura_digital || ''}
                        onChange={e => setConfig({ ...config, responsavel_assinatura_digital: e.target.value })}
                        placeholder="Nome na assinatura"
                      />
                    </div>
                  ) : (
                    <div className="relative group w-full h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden hover:border-amber-500/50 transition-all">
                      {config.assinatura_url ? (
                        <img src={config.assinatura_url} alt="Assinatura" className="w-full h-full object-contain p-3" />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <Upload className="mx-auto mb-1 opacity-50" size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Subir assinatura</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <div className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5">
                          <Upload size={14} /> Alterar
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          const fileName = `${config.id}-sign-${Math.random()}.${file.name.split('.').pop()}`;
                          const { error } = await supabase.storage.from('assinaturas').upload(fileName, file);
                          if (!error) {
                            const { data: { publicUrl } } = supabase.storage.from('assinaturas').getPublicUrl(fileName);
                            setConfig({...config, assinatura_url: publicUrl});
                          }
                          setUploading(false);
                        }} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome Fantasia do Negócio</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-bold text-slate-800 text-lg"
                    value={config.nome_fantasia}
                    onChange={e => setConfig({ ...config, nome_fantasia: e.target.value })}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Responsável pela Empresa</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 bg-indigo-50/10"
                    value={config.responsavel_nome || ''}
                    onChange={e => setConfig({ ...config, responsavel_nome: e.target.value })}
                    placeholder="Nome completo e apelido"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Razão Social Oficial</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 font-medium text-slate-700"
                    value={config.razao_social || ''}
                    onChange={e => setConfig({ ...config, razao_social: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CNPJ</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-500/10 font-medium text-slate-700"
                    value={config.cnpj || ''}
                    onChange={e => setConfig({ ...config, cnpj: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Inscrição Municipal</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-500/10 font-medium text-slate-700"
                    value={config.inscricao_municipal || ''}
                    onChange={e => setConfig({ ...config, inscricao_municipal: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Endereço da Sede Administrava</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-500/10 font-medium text-slate-700"
                    value={config.endereco || ''}
                    onChange={e => setConfig({ ...config, endereco: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Telefone Principal</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-500/10 font-medium text-slate-700"
                    value={config.telefone || ''}
                    onChange={e => setConfig({ ...config, telefone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">E-mail Administrativo</label>
                  <input
                    type="email"
                    className="w-full px-5 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-500/10 font-medium text-slate-700"
                    value={config.email || ''}
                    onChange={e => setConfig({ ...config, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-slate-100 mt-10">
              <button
                type="submit"
                disabled={saving}
                className="bg-amber-500 text-slate-900 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'Gravando...' : 'Atualizar Dados da Empresa'}
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start gap-4 mt-8">
              <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0 shadow-lg shadow-amber-500/20">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="text-amber-900 font-black text-xs uppercase tracking-widest">Aviso Operacional</h4>
                <p className="text-amber-800 text-[11px] mt-1 leading-relaxed font-medium italic">
                  Informações registradas aqui serão propagadas automaticamente para cabeçalhos e rodapés de orçamentos e outros documentos fiscais gerados.
                </p>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'acesso' && (
          <div className="p-8 space-y-8 animate-in fade-in duration-300">
            {/* Header de Segurança */}
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-start gap-5">
              <div className="bg-rose-500 text-white p-3 rounded-2xl shadow-lg shadow-rose-500/20 flex-shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Segurança de Acesso</h3>
                <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">
                  Gerencie as credenciais de login para este painel. <br/>
                  <span className="text-rose-600 font-bold uppercase text-[10px] tracking-widest">Cuidado: Alterar seu e-mail ou senha afetará seu próximo login.</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSecurity} className="max-w-2xl space-y-8">
               {securityMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                  securityMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {securityMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  <span className="font-bold text-sm">{securityMessage.text}</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail de Login</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nova Senha de Acesso</label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Deixe vazio para manter a atual"
                      className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-slate-800 font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold ml-1 italic">Dica: Use pelo menos 8 caracteres com letras e números.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {securityLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {securityLoading ? 'Processando...' : 'Atualizar Credenciais'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfiguracaoEmpresaManager;
