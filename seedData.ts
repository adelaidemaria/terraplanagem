
import { 
  Customer, Vendor, VendorCategory, Sale, Expense, Payment, AccountPlan, BankAccount, Equipment, MaintenanceRecord 
} from './types';

export const seedDatabase = () => {
  const customers: Customer[] = [
    { id: crypto.randomUUID(), name: 'Construtora Silva Ltda', personType: 'PJ', document: '12.345.678/0001-90', address: 'Av. Nações Unidas, 1234, Bauru - SP', contactPerson: 'Ricardo Silva', phone: '(14) 99876-5432', email: 'contato@silvaconstrutora.com.br', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'João Pereira dos Santos', personType: 'PF', document: '123.456.789-00', address: 'Rua das Flores, 45, Bauru - SP', contactPerson: 'João', phone: '(14) 3222-1111', email: 'joao.pereira@gmail.com', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Agropecuária Vale Verde', personType: 'PJ', document: '98.765.432/0001-10', address: 'Rodovia Marechal Rondon, Km 340', contactPerson: 'Marcos', phone: '(14) 99123-4455', email: 'fazenda@valeverde.com.br', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Prefeitura Municipal de Bauru', personType: 'PJ', document: '45.678.901/0001-22', address: 'Praça das Cerejeiras, 1-59', contactPerson: 'Secretaria de Obras', phone: '(14) 3235-1000', email: 'obras@bauru.sp.gov.br', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Residencial Alphaville Bauru', personType: 'PJ', document: '11.222.333/0001-44', address: 'Av. Affonso José Aiello, 2000', contactPerson: 'Síndico Geral', phone: '(14) 98111-2233', email: 'adm@alphavillebauru.com.br', createdAt: Date.now() }
  ];

  const vendorCategories: VendorCategory[] = [
    { id: crypto.randomUUID(), name: 'Combustível' },
    { id: crypto.randomUUID(), name: 'Manutenção Mecânica' },
    { id: crypto.randomUUID(), name: 'Peças e Acessórios' },
    { id: crypto.randomUUID(), name: 'Escritório' },
    { id: crypto.randomUUID(), name: 'Serviços Terceirizados' }
  ];

  const vendors: Vendor[] = [
    { id: crypto.randomUUID(), name: 'Posto do Interior Ltda', personType: 'PJ', categoryId: vendorCategories[0].id, document: '10.200.300/0001-55', address: 'Av. Duque de Caxias, 500', contactPerson: 'Gerente Carlos', phone: '(14) 3232-4455', email: 'financeiro@postointernior.com.br', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Mecânica do Giba', personType: 'PF', categoryId: vendorCategories[1].id, document: '222.333.444-55', address: 'Rua Wenceslau Braz, 10-20', contactPerson: 'Gilberto', phone: '(14) 99777-8899', email: 'mecanicagiba@hotmail.com', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Casa das Peças Bauru', personType: 'PJ', categoryId: vendorCategories[2].id, document: '33.444.555/0001-66', address: 'Rua Bandeirantes, 15-30', contactPerson: 'Vendas', phone: '(14) 3223-9900', email: 'vendas@casadaspecas.com.br', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Papelaria Central', personType: 'PJ', categoryId: vendorCategories[3].id, document: '44.555.666/0001-77', address: 'Rua Batista de Carvalho, 5-10', contactPerson: 'Ana', phone: '(14) 3234-5566', email: 'contato@papelariacentral.com.br', createdAt: Date.now() },
    { id: crypto.randomUUID(), name: 'Segurança Patrimonial Forte', personType: 'PJ', categoryId: vendorCategories[4].id, document: '55.666.777/0001-88', address: 'Av. Getúlio Vargas, 10-50', contactPerson: 'Sérgio', phone: '(14) 3200-1010', email: 'adm@forteseguranca.com.br', createdAt: Date.now() }
  ];

  const accountPlan: AccountPlan[] = [
    { id: crypto.randomUUID(), type: 'Receita', category: 'Serviços', subcategory: 'Terraplanagem', description: 'Serviços gerais de terraplanagem' },
    { id: crypto.randomUUID(), type: 'Receita', category: 'Locação', subcategory: 'Máquinas Pesadas', description: 'Locação de escavadeiras e retro' },
    { id: crypto.randomUUID(), type: 'Receita', category: 'Serviços', subcategory: 'Limpeza de Terreno', description: 'Limpeza e remoção de entulho' },
    { id: crypto.randomUUID(), type: 'Despesa', category: 'Operacional', subcategory: 'Combustível', description: 'Diesel para máquinas' },
    { id: crypto.randomUUID(), type: 'Despesa', category: 'Manutenção', subcategory: 'Peças', description: 'Compra de peças de reposição' }
  ];

  const bankAccounts: BankAccount[] = [
    { id: crypto.randomUUID(), bankName: 'Itaú Unibanco', agency: '0123', accountNumber: '45678-9', initialBalance: 15000 },
    { id: crypto.randomUUID(), bankName: 'Banco do Brasil', agency: '4321', accountNumber: '98765-4', initialBalance: 8500 },
    { id: crypto.randomUUID(), bankName: 'Santander', agency: '5566', accountNumber: '11223-3', initialBalance: 3200 },
    { id: crypto.randomUUID(), bankName: 'Bradesco', agency: '9988', accountNumber: '77665-5', initialBalance: 12400 },
    { id: crypto.randomUUID(), bankName: 'Caixa Econômica', agency: '1010', accountNumber: '55443-2', initialBalance: 5000 }
  ];

  const fleet: Equipment[] = [
    { id: crypto.randomUUID(), type: 'Escavadeira Hidráulica', model: 'CAT 320', intervals: { oilChange: 6, dieselFilter: 3, oilFilter: 3, internalAirFilter: 12, externalAirFilter: 6, bleedDieselFilter: 1, others: 12 }, createdAt: Date.now() },
    { id: crypto.randomUUID(), type: 'Retroescavadeira', model: 'JCB 3CX', intervals: { oilChange: 4, dieselFilter: 2, oilFilter: 2, internalAirFilter: 10, externalAirFilter: 5, bleedDieselFilter: 1, others: 10 }, createdAt: Date.now() },
    { id: crypto.randomUUID(), type: 'Caminhão Basculante', model: 'VW Constellation', intervals: { oilChange: 12, dieselFilter: 6, oilFilter: 6, internalAirFilter: 24, externalAirFilter: 12, bleedDieselFilter: 3, others: 24 }, createdAt: Date.now() },
    { id: crypto.randomUUID(), type: 'Pá Carregadeira', model: 'Volvo L60', intervals: { oilChange: 6, dieselFilter: 3, oilFilter: 3, internalAirFilter: 12, externalAirFilter: 6, bleedDieselFilter: 1, others: 12 }, createdAt: Date.now() },
    { id: crypto.randomUUID(), type: 'Mini Carregadeira', model: 'Bobcat S450', intervals: { oilChange: 3, dieselFilter: 2, oilFilter: 2, internalAirFilter: 6, externalAirFilter: 3, bleedDieselFilter: 1, others: 6 }, createdAt: Date.now() }
  ];

  const sales: Sale[] = [
    { id: crypto.randomUUID(), customerId: customers[0].id, customerName: customers[0].name, accountPlanId: accountPlan[0].id, items: [{ id: crypto.randomUUID(), description: 'Terraplanagem Loteamento', value: 15000 }], totalValue: 15000, date: new Date().toISOString().split('T')[0], nfNumber: '1001', saleType: 'Serviço', paymentMethod: 'Boleto', paymentCondition: 'A Prazo', installments: 3, dueDate: new Date().toISOString().split('T')[0], status: 'Pendente', createdAt: Date.now() },
    { id: crypto.randomUUID(), customerId: customers[1].id, customerName: customers[1].name, accountPlanId: accountPlan[1].id, items: [{ id: crypto.randomUUID(), description: 'Locação Bobcat 2 dias', value: 1200 }], totalValue: 1200, date: new Date().toISOString().split('T')[0], nfNumber: '1002', saleType: 'Locação', paymentMethod: 'PIX', paymentCondition: 'A Vista', installments: 1, status: 'Pago', createdAt: Date.now() },
    { id: crypto.randomUUID(), customerId: customers[2].id, customerName: customers[2].name, accountPlanId: accountPlan[2].id, items: [{ id: crypto.randomUUID(), description: 'Limpeza de Terreno', value: 3500 }], totalValue: 3500, date: new Date().toISOString().split('T')[0], nfNumber: '1003', saleType: 'Serviço', paymentMethod: 'Cartão', paymentCondition: 'A Vista', installments: 1, status: 'Pendente', createdAt: Date.now() },
    { id: crypto.randomUUID(), customerId: customers[3].id, customerName: customers[3].name, accountPlanId: accountPlan[0].id, items: [{ id: crypto.randomUUID(), description: 'Nivelamento de Rua', value: 25000 }], totalValue: 25000, date: new Date().toISOString().split('T')[0], nfNumber: '1004', saleType: 'Serviço', paymentMethod: 'Transferência', paymentCondition: 'A Prazo', installments: 1, dueDate: new Date().toISOString().split('T')[0], status: 'Pendente', createdAt: Date.now() },
    { id: crypto.randomUUID(), customerId: customers[4].id, customerName: customers[4].name, accountPlanId: accountPlan[1].id, items: [{ id: crypto.randomUUID(), description: 'Locação Escavadeira 1 semana', value: 8000 }], totalValue: 8000, date: new Date().toISOString().split('T')[0], nfNumber: '1005', saleType: 'Locação', paymentMethod: 'Boleto', paymentCondition: 'A Prazo', installments: 2, dueDate: new Date().toISOString().split('T')[0], status: 'Parcial', createdAt: Date.now() }
  ];

  const payments: Payment[] = [
    { id: crypto.randomUUID(), saleId: sales[1].id, bankAccountId: bankAccounts[0].id, amount: 1200, date: new Date().toISOString().split('T')[0], method: 'PIX', createdAt: Date.now() },
    { id: crypto.randomUUID(), saleId: sales[4].id, bankAccountId: bankAccounts[1].id, amount: 4000, date: new Date().toISOString().split('T')[0], method: 'Boleto', createdAt: Date.now() }
  ];

  const expenses: Expense[] = [
    { id: crypto.randomUUID(), vendorId: vendors[0].id, vendorName: vendors[0].name, accountPlanId: accountPlan[3].id, items: [{ id: crypto.randomUUID(), description: 'Diesel S10 500L', value: 3000 }], totalValue: 3000, date: new Date().toISOString().split('T')[0], docNumber: '5544', paymentMethod: 'Boleto', paymentCondition: 'A Prazo', dueDate: new Date().toISOString().split('T')[0], status: 'Pendente', createdAt: Date.now() },
    { id: crypto.randomUUID(), vendorId: vendors[1].id, vendorName: vendors[1].name, accountPlanId: accountPlan[4].id, items: [{ id: crypto.randomUUID(), description: 'Troca de Óleo CAT 320', value: 1500 }], totalValue: 1500, date: new Date().toISOString().split('T')[0], docNumber: '998', paymentMethod: 'Dinheiro', paymentCondition: 'A Vista', status: 'Pago', bankAccountId: bankAccounts[0].id, paymentDate: new Date().toISOString().split('T')[0], createdAt: Date.now() },
    { id: crypto.randomUUID(), vendorId: vendors[2].id, vendorName: vendors[2].name, accountPlanId: accountPlan[4].id, items: [{ id: crypto.randomUUID(), description: 'Filtros diversos', value: 850 }], totalValue: 850, date: new Date().toISOString().split('T')[0], docNumber: '1234', paymentMethod: 'PIX', paymentCondition: 'A Vista', status: 'Pago', bankAccountId: bankAccounts[1].id, paymentDate: new Date().toISOString().split('T')[0], createdAt: Date.now() },
    { id: crypto.randomUUID(), vendorId: vendors[3].id, vendorName: vendors[3].name, accountPlanId: accountPlan[3].id, items: [{ id: crypto.randomUUID(), description: 'Material de escritório', value: 200 }], totalValue: 200, date: new Date().toISOString().split('T')[0], docNumber: '443', paymentMethod: 'Cartão Corporativo', paymentCondition: 'A Vista', status: 'Pago', paymentDate: new Date().toISOString().split('T')[0], createdAt: Date.now() },
    { id: crypto.randomUUID(), vendorId: vendors[4].id, vendorName: vendors[4].name, accountPlanId: accountPlan[3].id, items: [{ id: crypto.randomUUID(), description: 'Segurança Mensal', value: 1200 }], totalValue: 1200, date: new Date().toISOString().split('T')[0], docNumber: '887', paymentMethod: 'Boleto', paymentCondition: 'A Prazo', dueDate: new Date().toISOString().split('T')[0], status: 'Pendente', createdAt: Date.now() }
  ];

  const maintenanceRecords: MaintenanceRecord[] = [
    { id: crypto.randomUUID(), equipmentId: fleet[0].id, date: new Date().toISOString().split('T')[0], nfNumber: '998', performedItems: ['oilChange', 'oilFilter'], observations: 'Troca preventiva realizada na oficina do Giba', createdAt: Date.now() },
    { id: crypto.randomUUID(), equipmentId: fleet[1].id, date: new Date().toISOString().split('T')[0], nfNumber: '101', performedItems: ['dieselFilter'], observations: 'Filtro saturado', createdAt: Date.now() },
    { id: crypto.randomUUID(), equipmentId: fleet[2].id, date: new Date().toISOString().split('T')[0], nfNumber: '556', performedItems: ['others'], observations: 'Revisão de freios', createdAt: Date.now() },
    { id: crypto.randomUUID(), equipmentId: fleet[3].id, date: new Date().toISOString().split('T')[0], nfNumber: '778', performedItems: ['externalAirFilter'], observations: 'Limpeza e troca', createdAt: Date.now() },
    { id: crypto.randomUUID(), equipmentId: fleet[4].id, date: new Date().toISOString().split('T')[0], nfNumber: '223', performedItems: ['bleedDieselFilter'], observations: 'Drenagem de água', createdAt: Date.now() }
  ];

  localStorage.setItem('tb_customers', JSON.stringify(customers));
  localStorage.setItem('tb_vendors', JSON.stringify(vendors));
  localStorage.setItem('tb_vendorCategories', JSON.stringify(vendorCategories));
  localStorage.setItem('tb_sales', JSON.stringify(sales));
  localStorage.setItem('tb_expenses', JSON.stringify(expenses));
  localStorage.setItem('tb_payments', JSON.stringify(payments));
  localStorage.setItem('tb_accountPlan', JSON.stringify(accountPlan));
  localStorage.setItem('tb_banks', JSON.stringify(bankAccounts));
  localStorage.setItem('tb_fleet', JSON.stringify(fleet));
  localStorage.setItem('tb_maintenance', JSON.stringify(maintenanceRecords));

  return {
    customers, vendors, vendorCategories, sales, expenses, payments, accountPlan, bankAccounts, fleet, maintenanceRecords
  };
};
