-- CPF unico por cliente (quando preenchido). Telefone e e-mail ja tinham indice
-- unico (nutrir_customers_phone_unique, nutrir_customers_email_idx); faltava o
-- CPF, que permitia a mesma pessoa aparecer em mais de uma conta (uma por
-- e-mail, outra por telefone) sem o sistema perceber.
create unique index if not exists nutrir_customers_cpf_unique
  on nutrir_customers (cpf)
  where cpf is not null and cpf <> '';
