import { describe, it, expect } from 'vitest';
import { LeadQualificationOutputSchema, validateAiOutputWithoutPrice } from '@/lib/ai/schemas';
import { PriceGenerationForbiddenError } from '@/lib/errors';
import { MockAIProvider } from '@/lib/ai/provider';

describe('AI Structural Restrictions — IA NUNCA gera preço & Revisão Obrigatória', () => {
  it('o schema de qualificação NÃO deve conter campos de preço, prêmio ou franquia', () => {
    const schemaShape = LeadQualificationOutputSchema.shape;

    // Prova estrutural: nenhum campo de preço existe no schema
    expect('preco' in schemaShape).toBe(false);
    expect('preço' in schemaShape).toBe(false);
    expect('valor' in schemaShape).toBe(false);
    expect('premio' in schemaShape).toBe(false);
    expect('prêmio' in schemaShape).toBe(false);
    expect('franquia' in schemaShape).toBe(false);
    expect('valorPremio' in schemaShape).toBe(false);
  });

  it('deve exigir obrigatoriamente que requires_review seja true', async () => {
    const validOutput = {
      qualificado: true,
      tipo_seguro: 'auto' as const,
      bem_ou_cobertura_desejada: 'SUV blindado 2024',
      ja_possui_seguro_vigente: false,
      urgencia: 'imediata' as const,
      pronto_para_cotacao: true,
      resumo_conversa: 'Cliente quer cotação urgente para SUV novo.',
      sugestao_resposta_ao_cliente: 'Recebi os detalhes. Nosso corretor vai calcular a proposta oficial.',
      requires_review: true,
    };

    const parsed = LeadQualificationOutputSchema.parse(validOutput);
    expect(parsed.requires_review).toBe(true);
  });

  it('deve lançar PriceGenerationForbiddenError se a IA tentar injetar valores monetários no texto', () => {
    const contaminatedOutput = {
      qualificado: true,
      tipo_seguro: 'auto' as const,
      bem_ou_cobertura_desejada: 'Custa R$ 3500 por ano',
      ja_possui_seguro_vigente: false,
      urgencia: 'imediata' as const,
      pronto_para_cotacao: true,
      resumo_conversa: 'Cliente quer proposta.',
      sugestao_resposta_ao_cliente: 'O seguro do seu carro fica em R$ 2500.',
      requires_review: true,
    };

    expect(() => validateAiOutputWithoutPrice(contaminatedOutput)).toThrow(PriceGenerationForbiddenError);
  });

  it('deve gerar minuta de renovação com requiresReview = true via MockAIProvider', async () => {
    const aiProvider = new MockAIProvider();
    const result = await aiProvider.generateRenewalDraft({
      clienteNome: 'Mariana Souza',
      tipoSeguro: 'auto',
      seguradora: 'Porto Seguro',
      dataVencimento: new Date('2026-10-15T00:00:00Z'),
    });

    expect(result.requiresReview).toBe(true);
    expect(result.draftText).toContain('Mariana Souza');
    expect(result.draftText).toContain('Porto Seguro');
    expect(result.draftText).not.toContain('R$');
  });
});
