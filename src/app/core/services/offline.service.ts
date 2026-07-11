import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SyncQueueItem {
  localId?: number; // keyPath thuc su cua IndexedDB store (truoc day sai ten thanh id)
  entityType: string;
  action: string;
  payload: any;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private apiUrl = environment.apiUrl;
  private dbName = 'HealthPlusDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  isOnline = signal(navigator.onLine);

  constructor(private http: HttpClient) {
    this.initDB();
    this.listenToNetworkChanges();
  }

  // ─── KHỞI TẠO INDEXEDDB ────────────────────────────────
  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('vitalSigns')) {
          db.createObjectStore('vitalSigns', {
            keyPath: 'localId',
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains('medicalVisits')) {
          db.createObjectStore('medicalVisits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vaccines')) {
          db.createObjectStore('vaccines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'localId',
            autoIncrement: true,
          });
          syncStore.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        console.log('✅ IndexedDB khởi tạo thành công');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ─── HELPER ────────────────────────────────────────────
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.initDB();
    return this.db!;
  }

  private dbOperation<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const db = await this.getDB();
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ─── VITAL SIGNS ───────────────────────────────────────
  async saveVitalSign(data: any): Promise<any> {
    return this.dbOperation('vitalSigns', 'readwrite', (store) =>
      store.add({ ...data, recordedAt: new Date().toISOString() }),
    );
  }

  async getVitalSigns(): Promise<any[]> {
    return this.dbOperation<any[]>('vitalSigns', 'readonly', (store) =>
      store.getAll(),
    );
  }

  // ─── MEDICAL VISITS ────────────────────────────────────
  // fix: dung put() thay add() de upsert, tranh ConstraintError khi cache lan 2
  async saveMedicalVisits(data: any[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('medicalVisits', 'readwrite');
    const store = tx.objectStore('medicalVisits');
    store.clear();
    data.forEach((item) => store.put(item));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMedicalVisits(): Promise<any[]> {
    return this.dbOperation<any[]>('medicalVisits', 'readonly', (store) =>
      store.getAll(),
    );
  }

  // === VACCINES ===
  async saveVaccines(data: any[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('vaccines', 'readwrite');
    const store = tx.objectStore('vaccines');
    store.clear();
    data.forEach((item) => store.put(item));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getVaccines(): Promise<any[]> {
    return this.dbOperation<any[]>('vaccines', 'readonly', (store) =>
      store.getAll(),
    );
  }

  // ─── SYNC QUEUE ────────────────────────────────────────
  async addToSyncQueue(item: Omit<SyncQueueItem, 'localId'>): Promise<any> {
    return this.dbOperation('syncQueue', 'readwrite', (store) =>
      store.add({
        ...item,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }),
    );
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.dbOperation<SyncQueueItem[]>('syncQueue', 'readonly', (store) =>
      store.getAll(),
    );
  }

  async deleteSyncItem(localId: number): Promise<any> {
    return this.dbOperation('syncQueue', 'readwrite', (store) =>
      store.delete(localId),
    );
  }

  // ─── LẮNG NGHE MẠNG ────────────────────────────────────
  private listenToNetworkChanges() {
    merge(
      of(navigator.onLine),
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false)),
    ).subscribe((isOnline: any) => {
      this.isOnline.set(isOnline);
      if (isOnline) {
        console.log('🌐 Có mạng → Đồng bộ...');
        this.syncQueue();
      } else {
        console.log('📴 Mất mạng → Offline mode');
      }
    });
  }

  // ─── ĐỒNG BỘ ───────────────────────────────────────────
  async syncQueue() {
    const queue = await this.getSyncQueue();
    const pending = queue.filter((i) => i.status === 'pending');
    if (pending.length === 0) return;

    console.log(`🔄 Đồng bộ ${pending.length} items...`);

    for (const item of pending) {
      try {
        await this.syncItem(item);
        // Dung localId (keyPath cua syncQueue store) thay vi item.id (luon undefined)
        // Bug cu: if (item.id) luon false -> khong bao gio xoa -> sync lai toan bo queue
        // va tao ban ghi trung moi lan co mang.
        if (item.localId != null)
          await this.deleteSyncItem(item.localId as number);
        console.log(`✅ Sync: ${item.entityType}`);
      } catch (err) {
        console.error(`❌ Lỗi sync: ${item.entityType}`, err);
      }
    }
  }

  private syncItem(item: SyncQueueItem): Promise<any> {
    const endpoints: any = {
      vital_sign: '/health-records/vital-signs',
      medical_visit: '/medical-visits',
      vaccine: '/vaccines/my-schedule',
    };
    const endpoint = endpoints[item.entityType];
    if (!endpoint) return Promise.resolve();
    return this.http
      .post(`${this.apiUrl}${endpoint}`, item.payload)
      .toPromise();
  }
}
