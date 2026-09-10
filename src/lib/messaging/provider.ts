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

// Provedor singleton para testes e mock em ambiente de dev
export const globalMockMessagingProvider = new MockMessagingProvider();

export function getMessagingProvider(apiKey?: string): MessagingProvider {
  if (apiKey && process.env.NODE_ENV === 'production') {
    return new ThreeSixtyDialogProvider(apiKey);
  }
  return globalMockMessagingProvider;
}
