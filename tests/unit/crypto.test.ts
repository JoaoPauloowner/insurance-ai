import { describe, it, expect } from 'vitest';
import { encryptSensitive, decryptSensitive, maskCpf, maskPhone } from '@/lib/crypto';

describe('Cryptographic & Privacy Utilities (SUSEP / LGPD)', () => {
  it('deve criptografar e descriptografar o CPF do segurado com sucesso via AES-256-GCM', () => {
    const cpfOriginal = '123.456.789-00';
    const encrypted = encryptSensitive(cpfOriginal);

    expect(encrypted).not.toBe(cpfOriginal);
    expect(encrypted).toContain(':'); // Formato iv:authTag:cipher

    const decrypted = decryptSensitive(encrypted);
    expect(decrypted).toBe(cpfOriginal);
  });

  it('deve criptografar e descriptografar chaves de API da 360dialog', () => {
    const apiKey = 'd360_live_sec_abcdef1234567890abcdef1234567890';
    const encrypted = encryptSensitive(apiKey);

    expect(encrypted).not.toContain('d360_live_sec');
    const decrypted = decryptSensitive(encrypted);
    expect(decrypted).toBe(apiKey);
  });

  it('deve mascarar CPF para logs preservando apenas dígitos centrais', () => {
    expect(maskCpf('123.456.789-00')).toBe('***.456.789-**');
    expect(maskCpf('12345678900')).toBe('***.456.789-**');
    expect(maskCpf('')).toBe('');
  });

  it('deve mascarar telefone para logs de auditoria', () => {
    expect(maskPhone('+5511998765432')).toBe('*****5432');
    expect(maskPhone('98765432')).toBe('*****5432');
    expect(maskPhone('')).toBe('');
  });
});
