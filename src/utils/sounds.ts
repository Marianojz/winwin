class SoundManager {
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Intentar crear contexto de audio
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('🔇 AudioContext no soportado:', error);
    }
  }

  private ensureAudioContext(): boolean {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.log('🔇 No se pudo crear AudioContext:', error);
        return false;
      }
    }
    
    // Reactivar contexto si está suspendido (requerido por algunos navegadores)
    if (this.audioContext.state === 'suspended') {
      // Intentar reactivar silenciosamente (sin await para no bloquear)
      this.audioContext.resume().catch(() => {
        // Si falla, el sonido simplemente no se reproducirá
        // Esto es normal en navegadores que bloquean autoplay
      });
    }
    
    return this.audioContext.state === 'running' || this.audioContext.state === 'suspended';
  }

  // Sonido suave de oferta - campanita elegante
  private playBidSound() {
    if (!this.enabled || !this.ensureAudioContext() || !this.audioContext) return;

    try {
      // Si el contexto está suspendido, intentar reactivarlo (requiere interacción del usuario)
      if (this.audioContext.state === 'suspended') {
        // Silenciosamente intentar reactivar, pero no bloquear si falla
        this.audioContext.resume().catch(() => {
          // El navegador bloquea el audio hasta que el usuario interactúe
          return;
        });
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Frecuencia suave (600Hz - tono cálido)
      oscillator.frequency.value = 600;
      oscillator.type = 'sine'; // Onda senoidal (más suave)
      
      // Envolvente suave y elegante - volumen aún más bajo
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05); // Volumen muy bajo (0.12)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18); // Fade out suave
      
      oscillator.start(now);
      oscillator.stop(now + 0.18);
    } catch (error) {
      // Silenciar errores de autoplay (es normal en navegadores modernos)
      // No mostrar error si es por restricciones del navegador
    }
  }

  // Sonido suave de oferta superada - dos tonos descendentes elegantes
  private playOutbidSound() {
    if (!this.enabled || !this.ensureAudioContext() || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {
          return;
        });
      }

      const now = this.audioContext.currentTime;
      
      // Primer tono (más alto)
      const osc1 = this.audioContext.createOscillator();
      const gain1 = this.audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);
      
      osc1.frequency.value = 700;
      osc1.type = 'sine';
      
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.1, now + 0.05); // Volumen más bajo
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc1.start(now);
      osc1.stop(now + 0.15);
      
      // Segundo tono (más bajo, más suave)
      const osc2 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(this.audioContext.destination);
      
      osc2.frequency.value = 550;
      osc2.type = 'sine';
      
      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.15); // Volumen aún más bajo
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);
    } catch (error) {
      // Silenciar errores de autoplay
    }
  }

  // Sonido elegante de victoria - acorde mayor suave
  private playWonSound() {
    if (!this.enabled || !this.ensureAudioContext() || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {
          return;
        });
      }

      const now = this.audioContext.currentTime;
      
      // Acorde mayor suave (Do-Mi-Sol) - sonido celebratorio pero elegante
      const frequencies = [523.25, 659.25, 783.99]; // Do, Mi, Sol
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        // Cada nota empieza ligeramente después para crear un efecto arpegiado suave
        const startTime = now + (index * 0.05);
        const duration = 0.35; // Un poco más corto
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05); // Volumen aún más bajo
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (error) {
      // Silenciar errores de autoplay
    }
  }

  // Sonido discreto de notificación - ping muy suave
  private playNotificationSound() {
    if (!this.enabled || !this.ensureAudioContext() || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {
          return;
        });
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Frecuencia suave y discreta (800Hz)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      // Envolvente muy suave y corta
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.03); // Volumen más bajo
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      // Silenciar errores de autoplay
    }
  }

  playOutbid() {
    console.log('🔊 Sonido: Oferta superada');
    this.playOutbidSound();
  }

  playWon() {
    console.log('🔊 Sonido: ¡Subasta ganada!');
    this.playWonSound();
  }

  playNotification() {
    console.log('🔊 Sonido: Nueva notificación');
    this.playNotificationSound();
  }

  playBid() {
    console.log('🔊 Sonido: Oferta realizada');
    this.playBidSound();
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
