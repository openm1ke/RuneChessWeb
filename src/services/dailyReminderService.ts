import { dailyChallengeKey } from '../game/dailyChallengeLevels';
import { pickReminderMessage } from './dailyReminderMessages';

/**
 * Browser-notification counterpart of the mobile app's
 * `DailyReminderService`. The two are built on fundamentally different
 * platforms: `flutter_local_notifications` schedules real OS alarms that
 * fire up to 14 days ahead even while the app is fully closed. A plain
 * static site has no such capability — a background push would need a
 * service worker registered for Push API *and* a server to trigger it,
 * which this project does not have (see docs/WEB_PORT_PLAN.md).
 *
 * Instead this service does the honest, best-effort equivalent for a
 * client-only site: it asks for the browser's `Notification` permission
 * (only from a real user gesture — the Settings toggle), then, while the
 * tab is open, periodically checks whether "today's reminder" is due (past
 * the chosen hour, today not yet solved, not already shown once today) and
 * fires a single `Notification` if so. Closing the tab/browser stops it —
 * there is no way around that without a server, and pretending otherwise
 * would be dishonest. See `startWatching`'s doc comment for the exact
 * check cadence.
 */
export class DailyReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  permission(): NotificationPermission {
    return this.isSupported() ? Notification.permission : 'denied';
  }

  isGranted(): boolean {
    return this.permission() === 'granted';
  }

  /** Once a browser's Notification permission is denied, it cannot be
   * re-prompted from JavaScript at all (unlike Android, there is also no
   * cross-browser API to jump straight to the site's permission settings) —
   * the player must change it themselves via the browser's own UI. Mirrors
   * the mobile app's `isPermanentlyDenied`, used the same way: skip a silent
   * re-prompt and show guidance instead. */
  isPermanentlyDenied(): boolean {
    return this.permission() === 'denied';
  }

  /** Must be called from a direct user gesture (the Settings toggle's click
   * handler) — browsers silently ignore `requestPermission()` calls that
   * aren't. Returns whether it ended up granted. */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Starts (or restarts) watching for a due reminder while this tab stays
   * open: checks immediately, then every 15 minutes — frequent enough that
   * the chosen hour is never missed by more than that margin during an open
   * session, without waking the tab needlessly often. Each check fires at
   * most one `Notification`, and at most once per calendar day (tracked via
   * `lastShownDate`), regardless of how many times the interval fires.
   * Always call `stopWatching()` first when reminders are turned off — this
   * only arms/re-arms, it never disarms itself.
   */
  startWatching(getState: () => ReminderCheckState): void {
    this.stopWatching();
    const check = () => this.checkAndMaybeNotify(getState());
    check();
    this.timer = setInterval(check, 15 * 60 * 1000);
  }

  stopWatching(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private checkAndMaybeNotify(state: ReminderCheckState): void {
    if (!state.enabled || !this.isGranted() || state.solvedToday) return;
    const now = new Date();
    if (now.getHours() < state.hour) return;
    const todayKey = dailyChallengeKey(now);
    if (state.lastShownDate === todayKey) return;

    const body = pickReminderMessage({
      currentStreak: state.currentStreak,
      freezeAvailable: state.freezeAvailable,
      previous: state.lastMessage,
    });
    try {
      new Notification('RuneChess', { body, icon: '/favicon.ico', tag: 'daily-challenge-reminder' });
    } catch {
      // A blocked/unsupported constructor call must never crash the app —
      // there's simply no reminder shown this time.
      return;
    }
    state.onShown(todayKey, body);
  }
}

export interface ReminderCheckState {
  enabled: boolean;
  hour: number;
  currentStreak: number;
  freezeAvailable: boolean;
  solvedToday: boolean;
  /** Calendar-day key (see `dailyChallengeKey`) the last reminder was shown
   * for, or null if none has been shown yet — caps this at one per day. */
  lastShownDate: string | null;
  /** The exact text last shown, so the next pick avoids repeating it. */
  lastMessage: string | null;
  /** Called once a notification actually fires, so the caller can persist
   * the new `lastShownDate`/`lastMessage`. */
  onShown: (shownDate: string, message: string) => void;
}
