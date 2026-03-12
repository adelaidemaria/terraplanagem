-- Criação da tabela de cartões corporativos
create table corporate_cards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  due_day integer not null,
  created_at bigint default ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint
);

-- Criação da tabela de pagamentos de faturas
create table corporate_card_payments (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references corporate_cards(id),
  date date not null,
  amount numeric not null,
  bank_account_id uuid not null references bank_accounts(id),
  description text,
  created_at bigint default ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint
);

-- Adicionando a coluna card_id nas despesas para vincular as compras ao cartão
alter table expenses add column card_id uuid references corporate_cards(id);
