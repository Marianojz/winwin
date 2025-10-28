class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Pre-cargar sonidos
    this.loadSound('outbid', '/sounds/outbid.mp3');
    this.loadSound('won', '/sounds/won.mp3');
    this.loadSound('notification', '/sounds/notification.mp3');
    this.loadSound('bid', '/sounds/bid.mp3');
  }

  private loadSound(name: string, path: string) {
    // Crear sonidos base64 para no depender de archivos externos
    const audio = new Audio();
    
    // Sonidos base64 (podés cambiar estos por tus propios sonidos después)
    const soundData = this.getBase64Sound(name);
    if (soundData) {
      audio.src = soundData;
      this.sounds.set(name, audio);
    }
  }

  private getBase64Sound(name: string): string {
    // Sonidos simples generados programáticamente (fallback)
    // En producción, podés reemplazar con archivos MP3 reales
    const sounds: { [key: string]: string } = {
      // Sonido corto para "te superaron"
      outbid: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==",
      
      // Sonido de victoria más alegre
      won: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==",
      
      // Sonido de notificación genérica
      notification: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==",
      
      // Sonido de oferta colocada
      bid: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
    };
    
    return sounds[name] || '';
  }

  play(soundName: string) {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      // Reiniciar si ya se está reproduciendo
      sound.currentTime = 0;
      
      // Reproducir con manejo de errores
      sound.play().catch(error => {
        console.log('🔇 Sonido no disponible:', error);
      });
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Sonidos específicos con descripción
  playOutbid() {
    this.play('outbid');
    console.log('🔊 Sonido: Oferta superada');
  }

  playWon() {
    this.play('won');
    console.log('🔊 Sonido: ¡Subasta ganada!');
  }

  playNotification() {
    this.play('notification');
    console.log('🔊 Sonido: Nueva notificación');
  }

  playBid() {
    this.play('bid');
    console.log('🔊 Sonido: Oferta realizada');
  }
}

// Instancia global del administrador de sonidos
export const soundManager = new SoundManager();
