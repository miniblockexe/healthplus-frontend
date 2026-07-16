import {
  Component,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

@Component({
  selector: 'app-ai-health',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ai-health.component.html',
})
export class AiHealthComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatBottom') chatBottom?: ElementRef;

  private apiUrl = environment.apiUrl;

  activeTab = signal<'chat' | 'analyze' | 'qa'>('chat');

  vitalSigns = signal<any[]>([]);
  medicalVisits = signal<any[]>([]);
  vaccines = signal<any[]>([]);
  isLoadingData = signal(true);

  chatMessages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI sức khỏe của Health+. ' +
        'Tôi có thể phân tích chỉ số sinh tồn, lịch sử khám và giải đáp các thắc mắc sức khỏe của bạn. ' +
        'Bạn cần tôi giúp gì hôm nay?',
      time: this.now(),
    },
  ]);
  chatInput = '';
  isChatLoading = signal(false);
  private shouldScrollChat = false;

  analysisResult = signal('');
  isAnalyzing = signal(false);
  analysisError = signal('');

  qaInput = '';
  qaAnswer = signal('');
  isQaLoading = signal(false);
  qaError = signal('');

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    public notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.loadHealthData();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollChat) {
      this.chatBottom?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScrollChat = false;
    }
  }

  loadHealthData() {
    this.isLoadingData.set(true);

    forkJoin({
      vitals: this.http
        .get<any>(`${this.apiUrl}/health-records/chart-data`)
        .pipe(
          map((r) => r.data ?? []),
          catchError(() => of([])),
        ),
      visits: this.http.get<any>(`${this.apiUrl}/medical-visits?limit=20`).pipe(
        map((r) => r.data ?? []),
        catchError(() => of([])),
      ),
      vaccines: this.http.get<any>(`${this.apiUrl}/vaccines/my-schedule`).pipe(
        map((r) => r.data ?? []),
        catchError(() => of([])),
      ),
    }).subscribe((result) => {
      this.vitalSigns.set(result.vitals);
      this.medicalVisits.set(result.visits);
      this.vaccines.set(result.vaccines);
      this.isLoadingData.set(false);
      this.cdr.markForCheck();
    });
  }

  private async callAi(
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/ai/chat/health`, { messages }),
    );
    return res?.data?.reply ?? 'Không nhận được phản hồi.';
  }

  async sendChat() {
    const input = this.chatInput.trim();
    if (!input || this.isChatLoading()) return;

    this.chatInput = '';
    this.isChatLoading.set(true);
    this.cdr.markForCheck();

    const history = this.chatMessages()
      .slice(1)
      .map((m) => ({ role: m.role, content: m.content }));

    this.chatMessages.update((msgs) => [
      ...msgs,
      { role: 'user', content: input, time: this.now() },
    ]);
    this.shouldScrollChat = true;

    try {
      const reply = await this.callAi([
        ...history,
        { role: 'user', content: input },
      ]);
      this.chatMessages.update((msgs) => [
        ...msgs,
        { role: 'assistant', content: reply, time: this.now() },
      ]);
    } catch {
      this.chatMessages.update((msgs) => [
        ...msgs,
        {
          role: 'assistant',
          content: 'Xin lỗi, có lỗi xảy ra khi kết nối AI. Vui lòng thử lại.',
          time: this.now(),
        },
      ]);
    } finally {
      this.isChatLoading.set(false);
      this.shouldScrollChat = true;
      this.cdr.markForCheck();
    }
  }

  onChatKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendChat();
    }
  }

  clearChat() {
    this.chatMessages.set([
      {
        role: 'assistant',
        content: 'Cuộc hội thoại đã được làm mới. Tôi có thể giúp gì cho bạn?',
        time: this.now(),
      },
    ]);
  }

  async analyzeHealth() {
    if (this.isAnalyzing()) return;
    this.isAnalyzing.set(true);
    this.analysisResult.set('');
    this.analysisError.set('');
    this.cdr.markForCheck();

    try {
      const result = await this.callAi([
        {
          role: 'user',
          content:
            'Hãy phân tích toàn diện dữ liệu sức khỏe của tôi và đưa ra báo cáo gồm: ' +
            '(1) Đánh giá tổng quan, (2) Điểm mạnh, (3) Điểm cần theo dõi, ' +
            '(4) Xu hướng, (5) Khuyến nghị cụ thể, (6) Lịch khám đề xuất.',
        },
      ]);
      this.analysisResult.set(result);
    } catch {
      this.analysisError.set(
        'Không thể kết nối AI. Vui lòng kiểm tra kết nối mạng và thử lại.',
      );
    } finally {
      this.isAnalyzing.set(false);
      this.cdr.markForCheck();
    }
  }

  async askQuestion() {
    const q = this.qaInput.trim();
    if (!q || this.isQaLoading()) return;

    this.isQaLoading.set(true);
    this.qaAnswer.set('');
    this.qaError.set('');
    this.cdr.markForCheck();

    try {
      const answer = await this.callAi([{ role: 'user', content: q }]);
      this.qaAnswer.set(answer);
    } catch {
      this.qaError.set('Không thể kết nối AI. Vui lòng thử lại.');
    } finally {
      this.isQaLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onQaKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.askQuestion();
    }
  }

  quickAsk(q: string) {
    this.qaInput = q;
    this.askQuestion();
  }

  now(): string {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatContent(text: string): string {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html
      .replace(
        /^### (.+)$/gm,
        '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>',
      )
      .replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
      .replace(/^# (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>');

    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>');

    html = html.replace(/((?:^[*-] .+$\n?)+)/gm, (block) => {
      const items = block
        .trim()
        .split('\n')
        .map(
          (line) =>
            `<li class="ml-4 list-disc">${line.replace(/^[*-] /, '')}</li>`,
        )
        .join('');
      return `<ul class="space-y-1 my-1">${items}</ul>`;
    });

    html = html.replace(/\n/g, '<br>');

    return html;
  }
}
