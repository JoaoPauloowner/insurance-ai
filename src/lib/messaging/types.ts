export interface WhatsAppProfile {
  name: string;
}

export interface WhatsAppContact {
  profile?: WhatsAppProfile;
  wa_id: string;
}

export interface WhatsAppTextMessage {
  body: string;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'audio' | string;
  text?: WhatsAppTextMessage;
}

export interface WhatsAppMetadata {
  display_phone_number?: string;
  phone_number_id?: string;
}

export interface WhatsAppChangeValue {
  messaging_product: 'whatsapp';
  metadata?: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }>;
}

export interface WhatsAppWebhookChange {
  value: WhatsAppChangeValue;
  field: string;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: WhatsAppWebhookEntry[];
  // Também suporta formato simplificado comum em parceiros 360dialog
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
}
