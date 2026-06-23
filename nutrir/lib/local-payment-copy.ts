export function getPaymentMethodBanner(isLocal: boolean, isPatient: boolean): string {
  if (!isLocal) {
    return "Pix e cartão online: a produção começa após a confirmação do pagamento.";
  }
  if (isPatient) {
    return "Pacientes da Paula Pastorino: produção prioritária e pagamento na retirada (dinheiro ou cartão físico).";
  }
  return "A produção só começa após a confirmação do pagamento no local.";
}

export function getLocalPaymentNotice(isPatient: boolean): string {
  if (isPatient) {
    return "Benefício para pacientes da Paula Pastorino: ao escolher pagamento no local, você declara estar em acompanhamento com ela e cadastrado no site com dados corretos. Identificamos seu perfil, a produção é prioritária e o pagamento (dinheiro ou cartão físico) pode ser feito na retirada do pedido.";
  }
  return "Ao selecionar essa opção você concorda que precisa realizar o pagamento no local dentro de 24h, dentro do horário de funcionamento e que atraso no pagamento pode ocasionar atraso na produção e entrega.";
}

export function getLocalOptionHint(isPatient: boolean): string {
  return isPatient ? "Pague na retirada (pacientes)" : "Produção mediante pagamento";
}

export function getReviewLocalPaymentNote(isPatient: boolean): string {
  if (isPatient) {
    return "Produção prioritária para pacientes. Pagamento em dinheiro ou cartão na retirada.";
  }
  return "Após a confirmação, efetue o pagamento em até 48 horas";
}
