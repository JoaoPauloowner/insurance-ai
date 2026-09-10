import { LeadQualificationOutput, LeadQualificationOutputSchema, validateAiOutputWithoutPrice } from './schemas';

export interface AIProvider {
  name: 'openai' | 'gemini' | 'deepseek';
  qualifyInsuranceLead(history: { role: 'user' | 'assistant'; content: string }[]): Promise<LeadQualificationOutput>;
  generateRenewalDraft(data: {
    clienteNome: string;
    tipoSeguro: string;
    seguradora: string;
    dataVencimento: Date;
  }): Promise<{ draftText: string; requiresReview: boolean }>;
  generateClaimDraft(data: {
    clienteNome: string;
    relatoCliente: string;
  }): Promise<{ draftText: string; requiresReview: boolean }>;
}

export class MockAIProvider implements AIProvider {
  name: 'openai' | 'gemini' | 'deepseek' = 'openai';

  async qualifyInsuranceLead(history: { role: 'user' | 'assistant'; content: string }[]): Promise<LeadQualificationOutput> {
    const lastUserMsg = history.filter((h) => h.role === 'user').pop()?.content || '';

    // Detecção simplificada para testes
    let tipoSeguro: 'auto' | 'residencial' | 'vida' | 'saude' | 'empresarial' | 'outros' = 'auto';
    if (/casa|apartamento|residenc/i.test(lastUserMsg)) tipoSeguro = 'residencial';
    if (/vida/i.test(lastUserMsg)) tipoSeguro = 'vida';
    if (/empresa|comercial/i.test(lastUserMsg)) tipoSeguro = 'empresarial';
    if (/plano|saude|saúde/i.test(lastUserMsg)) tipoSeguro = 'saude';

    const output: LeadQualificationOutput = {
      qualificado: true,
      tipo_seguro: tipoSeguro,
      bem_ou_cobertura_desejada: 'Cobertura compreensiva básica solicitada pelo segurado',
      ja_possui_seguro_vigente: false,
      urgencia: 'imediata',
      pronto_para_cotacao: true,
      resumo_conversa: `Lead interessado em seguro ${tipoSeguro}. Qualificação inicial realizada com sucesso.`,
      sugestao_resposta_ao_cliente: `Olá! Recebi as informações sobre o seu seguro ${tipoSeguro}. Nosso corretor especialista já está preparando o estudo de mercado e entrará em contato em breve com as opções oficiais.`,
      requires_review: true, // REGRA: Sempre requer revisão humana
    };

    validateAiOutputWithoutPrice(output);
    return LeadQualificationOutputSchema.parse(output);
  }

  async generateRenewalDraft(data: {
    clienteNome: string;
    tipoSeguro: string;
    seguradora: string;
    dataVencimento: Date;
  }): Promise<{ draftText: string; requiresReview: boolean }> {
    const formattedDate = data.dataVencimento.toLocaleDateString('pt-BR');
    const draftText = `Olá ${data.clienteNome}! Sua apólice de seguro ${data.tipoSeguro} pela ${data.seguradora} vence em ${formattedDate}. Como seu corretor, já estou consultando as melhores condições para a sua renovação. Posso te apresentar as opções?`;

    validateAiOutputWithoutPrice(draftText);

    return {
      draftText,
      requiresReview: true, // Obrigatório: corretor deve aprovar antes de disparar
    };
  }

  async generateClaimDraft(data: {
    clienteNome: string;
    relatoCliente: string;
  }): Promise<{ draftText: string; requiresReview: boolean }> {
    const draftText = `Olá ${data.clienteNome}! Sinto muito pelo ocorrido. Antes de mais nada, você e todos os envolvidos estão bem fisicamente? Para iniciarmos o processo junto à seguradora com agilidade, por favor nos envie: fotos do local/veículo e o Boletim de Ocorrência se já tiver. Estamos cuidando de tudo para você.`;

    validateAiOutputWithoutPrice(draftText);

    return {
      draftText,
      requiresReview: true,
    };
  }
}

export const globalMockAIProvider = new MockAIProvider();

export function getAIProvider(): AIProvider {
  return globalMockAIProvider;
}
