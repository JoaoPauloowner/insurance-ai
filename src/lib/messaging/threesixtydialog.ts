import { MessagingProvider, SendMessageOptions, SendMessageResult } from './provider';

export class ThreeSixtyDialogProvider implements MessagingProvider {
  public readonly name = 'dialog360' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://waba-v2.360dialog.io/v1') {
    if (!apiKey) {
      throw new Error('360dialog API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const cleanTo = options.to.replace(/[^\d]/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        body: options.text,
      },
    };

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`360dialog API error [${response.status}]: ${errorText}`);
    }

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
    };

    const messageId = data.messages?.[0]?.id || `d360-${Date.now()}`;

    return {
      messageId,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
  }
}
