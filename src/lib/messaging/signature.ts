import crypto from 'crypto';

/**
 * Módulo de segurança criptográfica para webhooks WhatsApp (Meta Cloud API / 360dialog).
 *
 * Responsabilidades:
 * - Verificação HMAC-SHA256 de assinatura (X-Hub-Signature-256) — timing-safe
 * - Criação de assinatura para testes e outbound webhooks
 * - Validação de timestamp anti-replay
 * - Sanitização de payload antes do processamento
 * - Factory de middleware fail-closed para rotas de webhook
 */

// ─────────────────────────────────────────────────────────
// Constantes de Segurança
// ─────────────────────────────────────────────────────────

/** Tolerância máxima de timestamp para proteção anti-replay (5 minutos em ms) */
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

/** Prefixo obrigatório do header X-Hub-Signature-256 */
const SIGNATURE_PREFIX = 'sha256=';

/** Tamanho esperado de um digest HMAC-SHA256 em hexadecimal (64 caracteres) */
const EXPECTED_HEX_LENGTH = 64;

// ─────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────

export interface SignatureValidationResult {
  valid: boolean;
  reason?: string;
}

export interface WebhookSecurityOptions {
  /** Secret da aplicação (WHATSAPP_APP_SECRET ou DIALOG360_WEBHOOK_SECRET) */
  appSecret: string;
  /** Se true, exige validação de timestamp anti-replay. Default: false */
  enforceTimestamp?: boolean;
  /** Tolerância customizada de drift em ms. Default: 5 minutos */
  maxTimestampDriftMs?: number;
}

// ─────────────────────────────────────────────────────────
// 1. Verificação de Assinatura (X-Hub-Signature-256)
// ─────────────────────────────────────────────────────────

/**
 * Validação de assinatura criptográfica HMAC-SHA256 (X-Hub-Signature-256)
 * Utilizado por Meta Cloud API e 360dialog para assegurar a autenticidade dos webhooks recebidos.
 *
 * Características de segurança:
 * - Usa `crypto.timingSafeEqual` para prevenir timing attacks
 * - Rejeita assinaturas com formato inválido (fail-closed)
 * - Rejeita assinaturas com comprimento incorreto
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const signatureHex = signatureHeader.slice(SIGNATURE_PREFIX.length).trim();

  // Rejeita assinaturas com comprimento inválido antes de computar HMAC
  if (signatureHex.length !== EXPECTED_HEX_LENGTH) {
    return false;
  }

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

/**
 * Verificação detalhada de assinatura com motivo de rejeição.
 * Útil para logging de auditoria sem expor dados sensíveis.
 */
export function verifySignatureDetailed(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): SignatureValidationResult {
  if (!signatureHeader) {
    return { valid: false, reason: 'Header X-Hub-Signature-256 ausente.' };
  }

  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return { valid: false, reason: 'Prefixo sha256= ausente no header de assinatura.' };
  }

  const signatureHex = signatureHeader.slice(SIGNATURE_PREFIX.length).trim();

  if (signatureHex.length !== EXPECTED_HEX_LENGTH) {
    return { valid: false, reason: 'Comprimento da assinatura hexadecimal inválido.' };
  }

  // Validação de formato hex (apenas caracteres 0-9, a-f)
  if (!/^[0-9a-f]+$/i.test(signatureHex)) {
    return { valid: false, reason: 'Assinatura contém caracteres não-hexadecimais.' };
  }

  const isValid = verifyWhatsAppSignature(rawBody, signatureHeader, appSecret);

  if (!isValid) {
    return { valid: false, reason: 'Assinatura HMAC-SHA256 não corresponde ao payload.' };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────
// 2. Criação de Assinatura (para testes e outbound)
// ─────────────────────────────────────────────────────────

/**
 * Gera uma assinatura HMAC-SHA256 no formato X-Hub-Signature-256.
 * Usado em testes de integração e para assinar outbound webhooks.
 *
 * @returns Header completo no formato "sha256=<hex>"
 */
export function createWebhookSignature(rawBody: string, appSecret: string): string {
  const hmac = crypto.createHmac('sha256', appSecret);
  const digestHex = hmac.update(rawBody, 'utf8').digest('hex');
  return `${SIGNATURE_PREFIX}${digestHex}`;
}

// ─────────────────────────────────────────────────────────
// 3. Validação de Timestamp Anti-Replay
// ─────────────────────────────────────────────────────────

/**
 * Valida o timestamp de um webhook para proteção contra ataques de replay.
 *
 * Webhooks com timestamp muito antigo (> MAX_TIMESTAMP_DRIFT_MS) ou no futuro
 * são rejeitados. Isso protege contra reenvio malicioso de payloads capturados.
 *
 * @param webhookTimestamp - Timestamp Unix em segundos (campo `timestamp` do webhook)
 * @param maxDriftMs - Tolerância máxima em ms (default: 5 minutos)
 * @returns true se o timestamp está dentro do intervalo aceitável
 */
export function validateWebhookTimestamp(
  webhookTimestamp: number | string,
  maxDriftMs: number = MAX_TIMESTAMP_DRIFT_MS
): boolean {
  const tsSeconds = typeof webhookTimestamp === 'string'
    ? parseInt(webhookTimestamp, 10)
    : webhookTimestamp;

  if (isNaN(tsSeconds) || tsSeconds <= 0) {
    return false;
  }

  const webhookTimeMs = tsSeconds * 1000;
  const nowMs = Date.now();
  const drift = Math.abs(nowMs - webhookTimeMs);

  return drift <= maxDriftMs;
}

/**
 * Validação detalhada de timestamp com motivo de rejeição.
 */
export function validateTimestampDetailed(
  webhookTimestamp: number | string,
  maxDriftMs: number = MAX_TIMESTAMP_DRIFT_MS
): SignatureValidationResult {
  const tsSeconds = typeof webhookTimestamp === 'string'
    ? parseInt(webhookTimestamp, 10)
    : webhookTimestamp;

  if (isNaN(tsSeconds) || tsSeconds <= 0) {
    return { valid: false, reason: 'Timestamp do webhook ausente ou inválido.' };
  }

  const webhookTimeMs = tsSeconds * 1000;
  const nowMs = Date.now();
  const drift = Math.abs(nowMs - webhookTimeMs);

  if (drift > maxDriftMs) {
    const driftSeconds = Math.round(drift / 1000);
    const maxSeconds = Math.round(maxDriftMs / 1000);
    return {
      valid: false,
      reason: `Timestamp do webhook expirado. Drift: ${driftSeconds}s, máximo: ${maxSeconds}s.`,
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────
// 4. Sanitização de Payload
// ─────────────────────────────────────────────────────────

/**
 * Sanitiza e valida o payload bruto do webhook antes do processamento.
 *
 * Proteções:
 * - Limita tamanho máximo do payload (proteção contra DoS)
 * - Valida formato JSON
 * - Rejeita payloads vazios
 *
 * @param rawBody - Body bruto da requisição
 * @param maxSizeBytes - Tamanho máximo aceito em bytes (default: 1MB)
 * @returns Objeto parseado ou null se inválido
 */
export function sanitizeWebhookPayload<T = unknown>(
  rawBody: string,
  maxSizeBytes: number = 1024 * 1024
): { data: T; error: null } | { data: null; error: string } {
  if (!rawBody || rawBody.trim() === '') {
    return { data: null, error: 'Payload do webhook vazio.' };
  }

  const bodyBytes = Buffer.byteLength(rawBody, 'utf8');
  if (bodyBytes > maxSizeBytes) {
    return {
      data: null,
      error: `Payload excede o tamanho máximo permitido (${bodyBytes} bytes > ${maxSizeBytes} bytes).`,
    };
  }

  try {
    const parsed = JSON.parse(rawBody) as T;
    return { data: parsed, error: null };
  } catch {
    return { data: null, error: 'Payload JSON inválido ou malformado.' };
  }
}

// ─────────────────────────────────────────────────────────
// 5. Middleware Factory — Validação Fail-Closed
// ─────────────────────────────────────────────────────────

/**
 * Resultado da validação completa de segurança de um webhook.
 * Encapsula assinatura + timestamp + sanitização em uma única chamada.
 */
export interface WebhookValidationResult<T = unknown> {
  /** Se true, o webhook passou em todas as validações de segurança */
  authenticated: boolean;
  /** Payload parseado e sanitizado (disponível apenas se authenticated === true) */
  payload?: T;
  /** HTTP status code sugerido para a resposta de rejeição */
  statusCode: number;
  /** Mensagem de erro segura para resposta HTTP (sem dados sensíveis) */
  errorMessage?: string;
  /** Detalhes internos para logging (nunca expor ao cliente) */
  internalReason?: string;
}

/**
 * Valida completamente um webhook recebido aplicando todas as camadas de segurança.
 *
 * Ordem de validação (fail-closed — para na primeira falha):
 * 1. Verificação de assinatura HMAC-SHA256
 * 2. Validação de timestamp anti-replay (opcional)
 * 3. Sanitização e parsing do payload
 *
 * @example
 * ```ts
 * const result = validateIncomingWebhook<WhatsAppWebhookPayload>(rawBody, signatureHeader, {
 *   appSecret: process.env.WHATSAPP_APP_SECRET!,
 *   enforceTimestamp: true,
 * });
 *
 * if (!result.authenticated) {
 *   console.error('[Webhook] Rejeitado:', result.internalReason);
 *   return NextResponse.json({ error: result.errorMessage }, { status: result.statusCode });
 * }
 *
 * // result.payload contém o WhatsAppWebhookPayload validado
 * ```
 */
export function validateIncomingWebhook<T = unknown>(
  rawBody: string,
  signatureHeader: string | null,
  options: WebhookSecurityOptions
): WebhookValidationResult<T> {
  // 1. Verificação de assinatura
  const sigResult = verifySignatureDetailed(rawBody, signatureHeader, options.appSecret);
  if (!sigResult.valid) {
    return {
      authenticated: false,
      statusCode: 401,
      errorMessage: 'Assinatura criptográfica X-Hub-Signature-256 inválida ou ausente.',
      internalReason: sigResult.reason,
    };
  }

  // 2. Validação de timestamp (se habilitada)
  if (options.enforceTimestamp) {
    const maxDrift = options.maxTimestampDriftMs ?? MAX_TIMESTAMP_DRIFT_MS;
    try {
      const parsed = JSON.parse(rawBody);
      const timestamp = extractTimestampFromPayload(parsed);
      if (timestamp !== null) {
        const tsResult = validateTimestampDetailed(timestamp, maxDrift);
        if (!tsResult.valid) {
          return {
            authenticated: false,
            statusCode: 401,
            errorMessage: 'Webhook expirado ou timestamp inválido.',
            internalReason: tsResult.reason,
          };
        }
      }
    } catch {
      // Se não conseguir parsear para extrair timestamp, a sanitização abaixo vai capturar
    }
  }

  // 3. Sanitização e parsing do payload
  const sanitized = sanitizeWebhookPayload<T>(rawBody);
  if (sanitized.error) {
    return {
      authenticated: false,
      statusCode: 400,
      errorMessage: sanitized.error,
      internalReason: sanitized.error,
    };
  }

  return {
    authenticated: true,
    payload: sanitized.data!,
    statusCode: 200,
  };
}

// ─────────────────────────────────────────────────────────
// Helpers Internos
// ─────────────────────────────────────────────────────────

/**
 * Extrai o timestamp mais recente de um payload de webhook WhatsApp.
 * Busca em: entry[].changes[].value.messages[].timestamp ou messages[].timestamp (360dialog flat)
 */
function extractTimestampFromPayload(payload: any): number | null {
  // Formato Meta Cloud API: entry[].changes[].value.messages[].timestamp
  const metaTimestamp = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.timestamp;
  if (metaTimestamp) {
    const ts = parseInt(metaTimestamp, 10);
    if (!isNaN(ts)) return ts;
  }

  // Formato 360dialog flat: messages[].timestamp
  const flatTimestamp = payload?.messages?.[0]?.timestamp;
  if (flatTimestamp) {
    const ts = parseInt(flatTimestamp, 10);
    if (!isNaN(ts)) return ts;
  }

  return null;
}

