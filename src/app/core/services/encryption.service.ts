import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EncryptionService {
  private secretKey = environment.encryptionKey;

  // Mã hóa dữ liệu
  encrypt(data: any): string {
    const jsonStr = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonStr, this.secretKey).toString();
  }

  // Giải mã dữ liệu
  decrypt(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedStr);
    } catch {
      return null;
    }
  }

  // Mã hóa lưu vào localStorage
  setEncrypted(key: string, value: any): void {
    const encrypted = this.encrypt(value);
    localStorage.setItem(key, encrypted);
  }

  // Giải mã từ localStorage
  getDecrypted(key: string): any {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }
}