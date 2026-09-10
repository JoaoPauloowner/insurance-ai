import crypto from 'crypto';

/**
 * Validação de assinatura criptográfica HMAC-SHA256 (X-Hub-Signature-256)
 * Utilizado por Meta Cloud API e 360dialog para assegurar a autenticidade dos webhooks recebidos.
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const signatureHex = signatureHeader.slice('sha256='.length).trim();
  const hmac = crypto.createHmac('sha256', appSecret);
  const digestHex = hmac.update(rawBody, 'utf8').digest('hex');

  try {
    const sigBuffer = Buffer.from(signatureHex, 'hex');
    const digestBuffer = Buffer.from(digestHex, 'hex');

    if (sigBuffer.length !== digestBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuffer, digestBuffer);
  } catch {
    return false;
  }
}
