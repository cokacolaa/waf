import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { config } from '../config';

export const generate2FASecret = (username: string) => {
  const secret = speakeasy.generateSecret({
    name: `${config.twoFactor.appName} (${username})`,
    length: 32,
  });
  
  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url!,
  };
};

export const generateQRCode = async (otpauth_url: string): Promise<string> => {
  return QRCode.toDataURL(otpauth_url);
};

export const verify2FAToken = (token: string, secret: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps for clock skew
  });
};

export const generateBackupCodes = (count: number = 5): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
                 '-' + Math.random().toString(36).substring(2, 6).toUpperCase() +
                 '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
};
