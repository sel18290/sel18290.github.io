// Durée réelle visible, sans date de départ persistée ni rattrapage hors onglet.
export class RoomClock {
  constructor(elapsed = 0, now = 0, visible = true) {
    this.elapsed = Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
    this.anchor = now; this.visible = visible;
  }
  read(now) { return this.elapsed + (this.visible ? Math.max(0, now - this.anchor) : 0); }
  checkpoint(now, visible = this.visible) {
    this.elapsed = this.read(now); this.anchor = now; this.visible = visible;
    return this.elapsed;
  }
  time(now) {
    const minutes = (390 + Math.floor(this.read(now) * 2 / 60000)) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
  }
}
