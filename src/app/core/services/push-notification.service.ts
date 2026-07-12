import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private apiUrl = environment.apiUrl;
  isSubscribed = signal(false);

  constructor(
    private http: HttpClient,
    private swPush: SwPush,
  ) {}

  async getVapidKey(): Promise<string> {
    const res: any = await this.http
      .get(`${this.apiUrl}/reminders/vapid-key`)
      .toPromise();
    return res.data.publicKey;
  }

  async subscribe() {
    try {
      const publicKey = await this.getVapidKey();

      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: publicKey,
      });

      // Gửi subscription lên server
      await this.http
        .post(`${this.apiUrl}/reminders/push-subscribe`, subscription)
        .toPromise();

      this.isSubscribed.set(true);

      // Lưu subscription vào localStorage để test
      localStorage.setItem('pushSubscription', JSON.stringify(subscription));

      return subscription;
    } catch (error) {
      console.error('Push subscription error:', error);
      throw error;
    }
  }

  async testPush() {
    const subStr = localStorage.getItem('pushSubscription');
    if (!subStr) {
      alert('Chưa đăng ký push notification!');
      return;
    }

    const subscription = JSON.parse(subStr);
    await this.http
      .post(`${this.apiUrl}/reminders/push-test`, { subscription })
      .toPromise();
  }

  listenToMessages() {
    this.swPush.messages.subscribe((message: any) => {
      console.log('Push message received:', message);
      const title = message?.title || message?.notification?.title || 'Health+';
      const body =
        message?.body || message?.notification?.body || 'Bạn có thông báo mới';
      alert(`🔔 ${title}\n${body}`);
    });
  }
}
