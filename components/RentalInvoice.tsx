
import React from 'react';
import { Sale, Customer } from '../types';
import Logo from './Logo';

interface RentalInvoiceProps {
  sale: Sale;
  customer?: Customer;
}

const RentalInvoice: React.FC<RentalInvoiceProps> = ({ sale, customer }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const deductions = sale.deductions || 0;
  const grandTotal = sale.totalValue - deductions;

  // Formatação amigável das condições de pagamento
  const paymentDetails = {
    condition: sale.paymentCondition === 'A Prazo' 
      ? `A PRAZO (${sale.installments}x)` 
      : 'À VISTA',
    method: sale.paymentMethod || 'NÃO INFORMADO',
    dueDate: sale.dueDate 
      ? new Date(sale.dueDate).toLocaleDateString('pt-BR') 
      : (sale.paymentCondition === 'A Vista' ? new Date(sale.date).toLocaleDateString('pt-BR') : '---')
  };

  return (
    <div className="bg-white text-black print:p-0 p-4 max-w-[210mm] mx-auto font-sans leading-tight">
      {/* Header Table */}
      <table className="w-full border-collapse border-2 border-black">
        <tbody>
          <tr>
            <td className="w-2/3 border-2 border-black p-4">
              <div className="flex items-start space-x-6">
                <Logo size="md" />
                <div className="text-[11px] font-bold">
                  <p className="text-sm font-black mb-1">TERRAPLANAGEM BAURU LTDA</p>
                  <p>Rua Batista de Carvalho, 4-33, Sl 705, Centro, Bauru/SP</p>
                  <p>CNPJ: 54.148.867/0001-18 &nbsp; Insc.Mun.: 641024</p>
                  <p>Tel: (14) 99188-5658 – terraplanagembauru@gmail.com</p>
                </div>
              </div>
            </td>
            <td className="w-1/3 border-2 border-black text-center align-middle bg-slate-50">
              <h2 className="text-xl font-black mb-1">FATURA DE LOCAÇÃO</h2>
              <p className="text-lg font-black tracking-widest">Nº: {sale.nfNumber || '---'}</p>
              <div className="mt-4 border-t-2 border-black pt-2">
                <p className="font-bold text-sm">Emissão: {new Date(sale.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Customer Info Box */}
      <div className="mt-2 border-2 border-black p-4">
        <h3 className="text-xs font-black uppercase mb-3 border-b border-black inline-block">CLIENTE</h3>
        <div className="space-y-1 text-sm font-bold">
          <p className="text-base font-black">{customer?.name || sale.customerName}</p>
          <p>CNPJ/CPF: {customer?.document || '---'}</p>
          <p>Endereço: {customer?.address || '---'}</p>
        </div>
      </div>

      {/* Service Table */}
      <table className="w-full mt-2 border-collapse border-2 border-black">
        <thead>
          <tr className="bg-slate-50">
            <th className="border-2 border-black p-2 text-left text-sm font-black">Descrição da Locação</th>
            <th className="border-2 border-black p-2 text-right text-sm font-black w-32">Total R$</th>
          </tr>
        </thead>
        <tbody className="min-h-[400px]">
          {sale.items.map((item, idx) => (
            <tr key={idx}>
              <td className="border-x-2 border-black p-2 text-sm font-medium h-10 align-top">
                {item.description}
              </td>
              <td className="border-x-2 border-black p-2 text-right text-sm font-bold align-top">
                {formatCurrency(item.value)}
              </td>
            </tr>
          ))}
          {/* Fill empty space if few items */}
          {Array.from({ length: Math.max(0, 8 - sale.items.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border-x-2 border-black p-2 h-8"></td>
              <td className="border-x-2 border-black p-2"></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="border-2 border-black p-1 text-right text-xs font-black uppercase">Total:</td>
            <td className="border-2 border-black p-1 text-right text-sm font-black">{formatCurrency(sale.totalValue)}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 text-right text-xs font-black uppercase">Retenções/Descontos:</td>
            <td className="border-2 border-black p-1 text-right text-sm font-black">{formatCurrency(deductions)}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-2 text-right text-base font-black uppercase bg-slate-50">Valor Total a Pagar:</td>
            <td className="border-2 border-black p-2 text-right text-lg font-black bg-slate-50">{formatCurrency(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Observations */}
      <div className="mt-2 border-2 border-black p-4 min-h-[150px]">
        <h3 className="text-xs font-black uppercase mb-3 border-b border-black inline-block">Observações</h3>
        <div className="text-xs font-bold leading-relaxed">
          <div className="mb-4 space-y-1 uppercase">
            <p>Condições de pagamento: {paymentDetails.condition}</p>
            <p>Forma de Pagamento: {paymentDetails.method}</p>
            <p>Vencimento: {paymentDetails.dueDate}</p>
          </div>
          
          <div className="whitespace-pre-line border-t border-slate-200 pt-3">
            {sale.observations || 'Sem observações adicionais.'}
          </div>

          <div className="mt-8 italic text-[10px] text-slate-500">
            Obs: EMPRESA OPTANTE PELO SIMPLES NACIONAL LC 123/2006. Anexo III
          </div>
        </div>
      </div>

      {/* Footer Receipt Slip */}
      <div className="mt-4 border-2 border-black">
        <div className="p-2 border-b-2 border-black text-center text-[10px] font-black uppercase tracking-widest bg-slate-50">
          RECEBI(EMOS) DE TERRAPLANAGEM BAURU LTDA, AS LOCAÇÕES CONSTANTES NESSA FATURA.
        </div>
        <div className="flex h-20">
          <div className="w-1/3 border-r-2 border-black p-2 flex flex-col justify-between">
            <span className="text-[9px] font-black">Data Recebimento</span>
            <div className="border-b border-black w-2/3 mb-2"></div>
          </div>
          <div className="w-1/2 border-r-2 border-black p-2 flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase">Identificação e Assinatura do Recebedor</span>
            <div className="border-b border-black w-4/5 mx-auto mb-2"></div>
          </div>
          <div className="w-1/6 p-2 text-center flex flex-col justify-center bg-slate-50">
            <p className="text-[10px] font-black">FATURA</p>
            <p className="text-xs font-black leading-none">Nº {sale.nfNumber || '---'}</p>
          </div>
        </div>
      </div>
      
      <div className="text-right mt-1 text-[8px] font-bold text-slate-400">
        Página: 1 de 1
      </div>
    </div>
  );
};

export default RentalInvoice;
