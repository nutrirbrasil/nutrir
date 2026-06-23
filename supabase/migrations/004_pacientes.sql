-- Pacientes VIP (Paula Pastorino): identificação por CPF

CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pacientes_cpf_unique UNIQUE (cpf),
  CONSTRAINT pacientes_cpf_len CHECK (char_length(cpf) = 11)
);

CREATE INDEX IF NOT EXISTS pacientes_cpf_idx ON public.pacientes (cpf);

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- Leitura/escrita apenas via service_role (API Next.js). anon/authenticated sem políticas.

INSERT INTO public.pacientes (nome, cpf)
VALUES ('Pedro Azevedo', '02950269010')
ON CONFLICT (cpf) DO NOTHING;
