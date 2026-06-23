export function getPaymentMethodBanner(isLocal: boolean, isPatient: boolean): string {
  if (!isLocal) {
    return "Pix e cartão online: a produção começa após a confirmação do pagamento.";
  }
  if (isPatient) {
    return "";
  }
  return "A produção só começa após a confirmação do pagamento no local.";
}

export function getLocalPaymentNotice(isPatient: boolean): string {
  if (isPatient) {
    return "Benefício para pacientes VIP: ao escolher pagamento no local, você declara estar em acompanhamento nutricional com a nutricionista Paula Pastorino. Identificaremos seu pedido, a produção será prioritária e o pagamento pode ser feito tanto online quanto na retirada do pedido.";
  }
  return "Ao selecionar essa opção você concorda que precisa realizar o pagamento no local dentro de 24h, dentro do horário de funcionamento e que atraso no pagamento pode ocasionar atraso na produção e entrega.";
}

export function getLocalOptionHint(isPatient: boolean): string {
  return isPatient ? "Benefício VIP: Pague na retirada." : "Produção mediante pagamento";
}

export function getReviewLocalPaymentNote(isPatient: boolean): string {
  if (isPatient) {
    return "Produção prioritária para pacientes. Pagamento em dinheiro ou cartão na retirada.";
  }
  return "Após a confirmação, efetue o pagamento em até 48 horas";
}
