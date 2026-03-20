import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ConfiguracaoEmpresa } from '../types';
import { Building2, Save, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const ConfiguracaoEmpresaManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + err.message });
    } finally {
      setSaving(false);
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
      
      // Update DB automatically with new logo URL
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
        <span className="text-slate-500 font-medium">Carregando dados da empresa...</span>
      </div>
    );
  }

  if (!config) return <div>Erro ao carregar configurações.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-6 flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-lg shadow-lg shadow-amber-500/20">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Dados da Empresa</h2>
            <p className="text-slate-400 text-xs">Personalize o logotipo e as informações que aparecem nos orçamentos e documentos.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-bold text-sm">{message.text}</span>
            </div>
          )}

          {/* Logo Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col items-center">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 w-full text-center md:text-left">Logotipo da Empresa</label>
              <div className="relative group w-full h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all hover:border-amber-500/50">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="text-center p-4">
                    <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
                    <span className="text-[10px] text-slate-400 font-medium italic">Nenhum logo enviado</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <div className="bg-white text-slate-900 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                    {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    {uploading ? 'Enviando...' : 'Alterar Logo'}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 text-center italic">Retangular (aprox. 300x120px).</p>

              {/* Signature Section */}
              <div className="mt-8 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 w-full text-center md:text-left">Assinatura no Orçamento</label>
                
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-4">
                  <button 
                    type="button"
                    onClick={() => setConfig({...config, assinatura_tipo: 'digital'})}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${config.assinatura_tipo === 'digital' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Digital (Fonte)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setConfig({...config, assinatura_tipo: 'imagem'})}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${config.assinatura_tipo === 'imagem' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Imagem (Upload)
                  </button>
                </div>

                {config.assinatura_tipo === 'digital' ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Texto da Assinatura Digital</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-medium signature text-blue-900"
                      value={config.responsavel_assinatura_digital || ''}
                      onChange={e => setConfig({ ...config, responsavel_assinatura_digital: e.target.value })}
                      placeholder="Ex: Wellington M. Ferreira"
                    />
                  </div>
                ) : (
                  <div className="relative group w-full h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all hover:border-amber-500/50">
                    {config.assinatura_url ? (
                      <img src={config.assinatura_url} alt="Assinatura" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Upload className="mx-auto mb-1 opacity-50" size={20} />
                        <span className="text-[9px] font-medium">Subir imagem da assinatura</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <div className="bg-white text-slate-900 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5">
                        <Upload size={12} /> Alterar Imagem
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          const fileName = `${config.id}-sign-${Math.random()}.${file.name.split('.').pop()}`;
                          const { error } = await supabase.storage.from('assinaturas').upload(fileName, file);
                          if (!error) {
                            const { data: { publicUrl } } = supabase.storage.from('assinaturas').getPublicUrl(fileName);
                            setConfig({...config, assinatura_url: publicUrl});
                            await supabase.from('configuracao_empresa').update({ assinatura_url: publicUrl }).eq('id', config.id);
                          }
                          setUploading(false);
                        }} 
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Fantasia (Aparece ao lado do logo se logo oculto)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-800"
                  value={config.nome_fantasia}
                  onChange={e => setConfig({ ...config, nome_fantasia: e.target.value })}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Responsável (Ex: Wellington Maycon Ferreira (Alemão))</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-700 bg-amber-50/30"
                  value={config.responsavel_nome || ''}
                  onChange={e => setConfig({ ...config, responsavel_nome: e.target.value })}
                  placeholder="Nome completo e apelido"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  value={config.razao_social || ''}
                  onChange={e => setConfig({ ...config, razao_social: e.target.value })}
                  placeholder="Nome oficial da empresa"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  value={config.cnpj || ''}
                  onChange={e => setConfig({ ...config, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">I.M. (Insc. Municipal)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  value={config.inscricao_municipal || ''}
                  onChange={e => setConfig({ ...config, inscricao_municipal: e.target.value })}
                  placeholder="Se houver"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  value={config.endereco || ''}
                  onChange={e => setConfig({ ...config, endereco: e.target.value })}
                  placeholder="Rua, nº, Bairro, Cidade/UF"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone Principal</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  value={config.telefone || ''}
                  onChange={e => setConfig({ ...config, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail de Contato</label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
                  value={config.email || ''}
                  onChange={e => setConfig({ ...config, email: e.target.value })}
                  placeholder="email@empresa.com.br"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Gravando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
        <div className="bg-amber-500 text-white p-2 rounded-lg shrink-0">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-amber-800 font-bold text-sm">Informação Importante</h4>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed italic">
            Estas informações são utilizadas automaticamente em todos os orçamentos gerados pelo sistema. 
            Ao atualizar o logotipo aqui, ele será alterado instantaneamente em todos os documentos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracaoEmpresaManager;
