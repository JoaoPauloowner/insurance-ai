import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.trim() === '') {
    throw new Error('ENCRYPTION_KEY não configurada no ambiente. Operação criptográfica abortada por segurança.');
  }
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY deve possuir exatamente 64 caracteres hexadecimais (256 bits).');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Criptografa dados sensíveis (ex: CPF do segurado, API Token da 360dialog)
 * Formato retornado: ivHex:authTagHex:encryptedHex
 */
export function encryptSensitive(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96 bits recomendado para GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa dados sensíveis protegidos por AES-256-GCM
 */
export function decryptSensitive(cipherText: string): string {
  if (!cipherText || !cipherText.includes(':')) return '';
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Formato inválido de dados criptografados.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mascara CPF para exibição segura ou logs de auditoria (LGPD)
 * Ex: "123.456.789-00" -> "***.456.789-**"
 */
export function maskCpf(rawCpf: string): string {
  if (!rawCpf) return '';
  const digits = rawCpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Mascara Telefone para logs
 * Ex: "+5511998765432" -> "*****5432"
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '*****';
  return `*****${digits.slice(-4)}`;
}
