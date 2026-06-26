export type FaqBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | {
      type: "link";
      before?: string;
      label: string;
      message: string;
      after?: string;
    };

export type FaqItem = {
  id: string;
  question: string;
  blocks: FaqBlock[];
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "whatsapp",
    question: "O agendamento é só pelo WhatsApp?",
    blocks: [
      {
        type: "p",
        text: "Sim. O agendamento de consultas é realizado exclusivamente pelo WhatsApp, direto com a nutricionista, para que você possa esclarecer todas as suas dúvidas de forma clara e direta.",
      },
    ],
  },
  {
    id: "incluso",
    question: "O que está incluso em cada modalidade?",
    blocks: [
      {
        type: "p",
        text: "Cada modalidade terá uma abordagem diferente dependendo do objetivo e das individualidades. Porém, todos os planos contam com:",
      },
      {
        type: "ul",
        items: [
          "Anamnese completa",
          "Avaliação física (antropometria)",
          "Análise de exames (se houver)",
          "Plano alimentar individualizado",
          "Prescrição de suplementos (se necessário)",
          "Materiais didáticos",
          "Suporte Individual Contínuo (SIC): após a consulta, você pode enviar dúvidas, conquistas e sentimentos pelo WhatsApp",
        ],
      },
    ],
  },
  {
    id: "desconto",
    question: "Há desconto para planos mais longos?",
    blocks: [
      {
        type: "p",
        text: "Sim. Planos mais longos possuem preços por consulta mais baixos, assim como pagamentos à vista — em dinheiro ou via Pix. Valores e condições são informados no agendamento.",
      },
      {
        type: "link",
        before: "",
        label: "Entre em contato",
        message: "Olá Paula! Vim do seu site e gostaria de saber mais sobre valores e formas de pagamento.",
        after: " para mais informações.",
      },
    ],
  },
  {
    id: "local",
    question: "Atende só em Piçarras?",
    blocks: [
      {
        type: "p",
        text: "Atendimentos presenciais em Balneário Piçarras o ano inteiro. Atendimentos online para todo o Brasil e também para pessoas que moram fora do país. Além disso, há atendimentos presenciais esporádicos em Pelotas/RS.",
      },
      {
        type: "link",
        label: "Entre em contato",
        message:
          "Olá Paula! Moro em Pelotas ou região e gostaria de saber sobre consulta presencial.",
        before: "Mora em Pelotas ou região e quer agendar uma consulta presencial? ",
        after: " para saber mais informações.",
      },
    ],
  },
  {
    id: "online",
    question: "Como funciona a consulta online?",
    blocks: [
      {
        type: "p",
        text: "As consultas online são realizadas por videochamada, com a mesma estrutura da presencial: anamnese, avaliação e orientações personalizadas. Você recebe o material e o plano alimentar digitalmente, com o mesmo Suporte Individual Contínuo (SIC) pelo WhatsApp entre as consultas.",
      },
    ],
  },
  {
    id: "publico",
    question:
      "Atende apenas atletas ou também pessoas que não treinam? Tem experiência com dietas vegetarianas, veganas, restrições alimentares e tratamentos para enfermidades?",
    blocks: [
      {
        type: "p",
        text: "Sim. Meu atendimento é para qualquer pessoa que quer ter um acompanhamento nutricional e mudar hábitos, sem exceções. Estou sempre estudando e me atualizando em todas as áreas para atender todos os públicos com excelência — incluindo vegetarianos, veganos, restrições alimentares e condições clínicas, conforme avaliação individual.",
      },
    ],
  },
  {
    id: "remarcar",
    question: "Posso remarcar ou cancelar consulta?",
    blocks: [
      {
        type: "p",
        text: "Sim, você pode remarcar ou cancelar sua consulta. Alterações e cancelamentos devem ser feitos com antecedência mínima de 24 horas.",
      },
    ],
  },
];
