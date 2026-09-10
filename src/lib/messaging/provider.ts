import { ThreeSixtyDialogProvider } from './threesixtydialog';

export interface SendMessageOptions {
  to: string; // Número de telefone formato E.164 (ex: +5511999998888 ou 5511999998888)
  text: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface SendMessageResult {
  messageId: string;
  status: 'sent' | 'queued' | 'delivered';
  timestamp: string;
}

export interface MessagingProvider {
  name: 'dialog360' | 'cloudapi';
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
}

/**
 * Erro lançado quando o provider de mensageria real não pode ser instanciado.
 * Indica configuração incompleta (apiKey ausente, decrypt falhou, etc.)
 */
export class MessagingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessagingConfigError';
  }
}

export class MockMessagingProvider implements MessagingProvider {
  name: 'dialog360' | 'cloudapi' = 'dialog360';
  public sentMessages: Array<SendMessageOptions & { id: string; timestamp: string }> = [];

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const id = `wamid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();

    this.sentMessages.push({ ...options, id, timestamp });

    return {
      messageId: id,
      status: 'sent',
      timestamp,
    };
  }

  clear(): void {
    this.sentMessages = [];
  }
}

// Provedor singleton APENAS para uso em testes (NODE_ENV === 'test')
export const globalMockMessagingProvider = new MockMessagingProvider();

/**
 * Obtém o provider de mensageria WhatsApp.
 *
 * Regras:
 * - Se `apiKey` for fornecida e válida → retorna ThreeSixtyDialogProvider real.
 * - Se `apiKey` for ausente/vazia → lança MessagingConfigError (fail-closed).
 *   O código chamador DEVE tratar esse erro e NÃO marcar a mensagem como enviada.
 *
 * O MockMessagingProvider NUNCA é retornado implicitamente. Apenas testes devem
 * instanciá-lo diretamente ou injetá-lo via parâmetro de DI.
 */
export function getMessagingProvider(apiKey?: string): MessagingProvider {
  if (apiKey && apiKey.trim() !== '') {
    return new ThreeSixtyDialogProvider(apiKey);
  }
  throw new MessagingConfigError(
    'Falha ao enviar: credencial do WhatsApp (API key 360dialog) indisponível ou inválida. ' +
    'Configure a WhatsappConnection com uma apiKey criptografada válida para esta organização.'
  );
}
