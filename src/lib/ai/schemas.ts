import { z } from 'zod';
import { PriceGenerationForbiddenError } from '../errors';

/**
 * REGRA CRÍTICA E NÃO-NEGOCIÁVEL: A IA NUNCA GERA PREÇO.
 *
 * Este schema Pydantic/Zod define estruturalmente a saída do motor de IA.
 * Note que NÃO EXISTE nenhum campo do tipo "valor", "preço", "prêmio" ou "franquia".
 * Fisicamente, a IA não tem como preenchê-los pois eles não constam no schema.
 */
export const LeadQualificationOutputSchema = z.object({
  qualificado: z.boolean().describe('Indica se o lead forneceu dados mínimos suficientes para cotação'),
  tipo_seguro: z
    .enum(['auto', 'residencial', 'vida', 'saude', 'empresarial', 'outros'])
    .describe('Ramo de seguro solicitado pelo segurado'),
  bem_ou_cobertura_desejada: z.string().describe('Descrição do bem a ser segurado ou coberturas pleiteadas'),
  ja_possui_seguro_vigente: z.boolean().describe('Se o segurado já possui apólice ativa com outra seguradora'),
  urgencia: z
    .enum(['imediata', 'proximos_30_dias', 'cotacao_futura'])
    .describe('Prazo estimado de contratação pelo cliente'),
  pronto_para_cotacao: z
    .boolean()
    .describe('Alerta ao corretor humano: cliente apto a receber proposta formal na tela de cotações'),
  resumo_conversa: z.string().describe('Resumo executivo em 1-2 frases para o corretor responsável'),
  sugestao_resposta_ao_cliente: z
    .string()
    .describe('Rascunho de resposta cordial. NUNCA deve conter valores ou estimativas de preço.'),
  requires_review: z
    .boolean()
    .default(true)
    .describe('Obrigatório true: nenhuma mensagem gerada pela IA é enviada sem revisão humana.'),
});

export type LeadQualificationOutput = z.infer<typeof LeadQualificationOutputSchema>;

/**
 * Validador estrito que inspeciona o texto gerado pela IA e garante
 * que nenhuma tentativa de alucinação de preço passe despercebida.
 * Suporta tanto o objeto de saída de qualificação quanto strings de texto livre.
 */
export function validateAiOutputWithoutPrice(output: LeadQualificationOutput | string): void {
  const prohibitedPatterns = [
    /R\$\s*\d+/i,
    /\b(preço|premio|prêmio|franquia|mensalidade|parcela)\s*:\s*\d+/i,
    /\b(custa|valor de|fica em)\s*R?\$/i,
    /\b\d+\s*reais\b/i,
  ];

  if (typeof output === 'string') {
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(output)) {
        throw new PriceGenerationForbiddenError(
          'A resposta gerada pela IA continha menção ou cálculo de preço/valor, violando a regra de compliance da SUSEP.'
        );
      }
    }
    return;
  }

  for (const pattern of prohibitedPatterns) {
    if (
      pattern.test(output.sugestao_resposta_ao_cliente) ||
      pattern.test(output.resumo_conversa) ||
      pattern.test(output.bem_ou_cobertura_desejada)
    ) {
      throw new PriceGenerationForbiddenError(
        'A resposta gerada pela IA continha menção ou cálculo de preço/valor, violando a regra de compliance da SUSEP.'
      );
    }
  }
}
