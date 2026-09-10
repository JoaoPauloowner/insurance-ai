export class TenantAccessError extends Error {
  constructor(message = 'Acesso não autorizado: entidade não pertence à organização do usuário.') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export class PriceGenerationForbiddenError extends Error {
  constructor(message = 'Violação Crítica de Compliance: A IA é estritamente proibida de gerar, sugerir ou estimar valores monetários de seguros.') {
    super(message);
    this.name = 'PriceGenerationForbiddenError';
  }
}

export class HumanReviewRequiredError extends Error {
  constructor(message = 'Revisão Humana Obrigatória: Esta mensagem requer aprovação do corretor antes de ser enviada ao WhatsApp.') {
    super(message);
    this.name = 'HumanReviewRequiredError';
  }
}
