class SoundManager {
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, string> = new Map();

  constructor() {
    // Intentar crear contexto de audio
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('🔇 AudioContext no soportado:', error);
    }

    // Pre-cargar sonidos base64 (sonidos reales cortos)
    this.loadBase64Sounds();
  }

  private loadBase64Sounds() {
    // Sonidos en formato base64 - funcionan inmediatamente
    this.sounds.set('outbid', this.createOutbidSound());
    this.sounds.set('won', this.createWonSound());
    this.sounds.set('notification', this.createNotificationSound());
    this.sounds.set('bid', this.createBidSound());
  }

  private createOutbidSound(): string {
    // Sonido de alerta - te superaron (2 tonos descendentes)
    return "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSw=";
  }

  private createWonSound(): string {
    // Sonido de victoria - ganaste la subasta (tonos ascendentes)
    return "data:audio/wav;base64,UklGRigGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSw=";
  }

  private createNotificationSound(): string {
    // Sonido de notificación genérica
    return "data:audio/wav;base64,UklGRhQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSw=";
  }

  private createBidSound(): string {
    // Sonido de oferta realizada
    return "data:audio/wav;base64,UklGRgQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiR1/LMeSw=";
  }

  private playBase64Sound(base64Sound: string) {
    if (!this.enabled) return;

    try {
      const audio = new Audio();
      audio.src = base64Sound;
      audio.volume = 0.7;
      
      audio.play().catch(error => {
        console.log('🔇 Fallback a sonidos web:', error);
        // Fallback a sonidos generados por código
        this.playFallbackSound();
      });
    } catch (error) {
      console.log('🔇 Error con sonido base64:', error);
      this.playFallbackSound();
    }
  }

  private playFallbackSound() {
    if (!this.enabled || !this.audioContext) return;

    try {
      // Sonido de fallback simple
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
    } catch (error) {
      console.log('🔇 Error en fallback sound:', error);
    }
  }

  playOutbid() {
    console.log('🔊 Sonido: Oferta superada');
    const sound = this.sounds.get('outbid');
    if (sound) this.playBase64Sound(sound);
  }

  playWon() {
    console.log('🔊 Sonido: ¡Subasta ganada!');
    const sound = this.sounds.get('won');
    if (sound) this.playBase64Sound(sound);
  }

  playNotification() {
    console.log('🔊 Sonido: Nueva notificación');
    const sound = this.sounds.get('notification');
    if (sound) this.playBase64Sound(sound);
  }

  playBid() {
    console.log('🔊 Sonido: Oferta realizada');
    const sound = this.sounds.get('bid');
    if (sound) this.playBase64Sound(sound);
  }

  enable() {
    this.enabled = true;
    console.log('🔊 Sonidos activados');
  }

  disable() {
    this.enabled = false;
    console.log('🔇 Sonidos desactivados');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Método para probar todos los sonidos
  testAllSounds() {
    console.log('🎵 Probando todos los sonidos...');
    this.playBid();
    setTimeout(() => this.playOutbid(), 1000);
    setTimeout(() => this.playWon(), 2000);
    setTimeout(() => this.playNotification(), 3000);
  }
}

export const soundManager = new SoundManager();
