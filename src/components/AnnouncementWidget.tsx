import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react';
import { Announcement } from '../types/announcements';
import { getUserAnnouncements, markAnnouncementAsRead, dismissAnnouncement, getCachedAnnouncements, cacheAnnouncements } from '../utils/announcements';
import { trackAnnouncementEngagement } from '../utils/announcementAnalytics';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import './AnnouncementWidget.css';

const AnnouncementWidget = () => {
  const { user } = useStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const viewTracked = useRef<Set<string>>(new Set());
  const isMobile = useIsMobile();

  // Cargar anuncios con cache offline
  useEffect(() => {
    if (!user) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    const loadAnnouncements = async () => {
      setLoading(true);
      try {
        // Intentar cargar desde cache primero
        const cached = getCachedAnnouncements(user.id);
        if (cached && cached.length > 0) {
          setAnnouncements(cached);
          setCurrentIndex(0);
        }

        // Cargar desde Firebase
        const userAnnouncements = await getUserAnnouncements(user.id);
        setAnnouncements(userAnnouncements);
        setCurrentIndex(0);
        
        // Guardar en cache
        cacheAnnouncements(user.id, userAnnouncements);
      } catch (error) {
        console.error('Error cargando anuncios:', error);
        // En caso de error, usar cache si existe
        const cached = getCachedAnnouncements(user.id);
        if (cached && cached.length > 0) {
          setAnnouncements(cached);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadAnnouncements, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Auto-scroll al cambiar índice
  useEffect(() => {
    if (scrollContainerRef.current && announcements.length > 0) {
      const scrollPosition = currentIndex * scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, announcements.length]);

  // Manejar swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe izquierda - siguiente
        handleNext();
      } else {
        // Swipe derecha - anterior
        handlePrev();
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleDismiss = async (announcementId: string) => {
    if (!user) return;
    
    try {
      await dismissAnnouncement(user.id, announcementId);
      
      // Track engagement
      await trackAnnouncementEngagement(announcementId, user.id, 'dismiss', {
        device: isMobile ? 'mobile' : 'desktop'
      });
      
      // Remover del estado local
      setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
      
      // Limpiar cache para forzar recarga y asegurar que no vuelva a aparecer
      const { clearAnnouncementsCache } = await import('../utils/announcements');
      clearAnnouncementsCache(user.id);
      
      // Ajustar índice si es necesario
      if (currentIndex >= announcements.length - 1) {
        setCurrentIndex(Math.max(0, announcements.length - 2));
      }
    } catch (error) {
      console.error('Error descartando anuncio:', error);
    }
 };

  const handleClick = async (announcement: Announcement) => {
    if (!user) return;
    
    // Marcar como leído
    await markAnnouncementAsRead(user.id, announcement.id);
    
    // Track engagement
    await trackAnnouncementEngagement(announcement.id, user.id, 'click', {
      device: isMobile ? 'mobile' : 'desktop',
      userAgent: navigator.userAgent
    });
    
    // Si tiene enlace, abrir
    if (announcement.linkUrl) {
      await trackAnnouncementEngagement(announcement.id, user.id, 'link_click', {
        device: isMobile ? 'mobile' : 'desktop'
      });
      window.open(announcement.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleImageClick = async (e: React.MouseEvent, announcement: Announcement, imageUrl: string) => {
    e.stopPropagation();
    
    if (user) {
      await trackAnnouncementEngagement(announcement.id, user.id, 'image_click', {
        device: isMobile ? 'mobile' : 'desktop'
      });
    }
    
    // Abrir imagen en nueva ventana/tab
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  const currentAnnouncement = announcements[currentIndex] || null;
  
  // Track view when announcement is displayed
  useEffect(() => {
    if (!user || !currentAnnouncement) return;
    
    if (!viewTracked.current.has(currentAnnouncement.id)) {
      trackAnnouncementEngagement(currentAnnouncement.id, user.id, 'view', {
        device: isMobile ? 'mobile' : 'desktop',
        userAgent: navigator.userAgent
      });
      viewTracked.current.add(currentAnnouncement.id);
    }
  }, [currentAnnouncement, user, isMobile]);

  // Protección de acceso - DEBE IR DESPUÉS DE TODOS LOS HOOKS
  if (!user || loading || announcements.length === 0 || !currentAnnouncement) {
    return null;
  }

  const isUrgent = currentAnnouncement.type === 'urgent' || currentAnnouncement.priority === 'high';
  const unreadCount = announcements.length;

  return (
    <div className={`announcement-widget ${isUrgent ? 'urgent' : ''}`}>
      <div className="announcement-widget-header">
        <div className="announcement-widget-title">
          <AlertCircle size={18} />
          <span>Anuncios</span>
          {unreadCount > 0 && (
            <span className="announcement-badge">{unreadCount}</span>
          )}
        </div>
        <button
          className="announcement-dismiss-btn"
          onClick={() => handleDismiss(currentAnnouncement.id)}
          aria-label="Descartar anuncio"
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="announcement-widget-content"
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => handleClick(currentAnnouncement)}
      >
        {announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            className={`announcement-card ${index === currentIndex ? 'active' : ''} ${announcement.type}`}
          >
            {announcement.imageUrl && (
              <div
                className="announcement-image"
                onClick={(e) => handleImageClick(e, announcement, announcement.imageUrl!)}
              >
                <img
                  src={announcement.imageUrl}
                  alt={announcement.title}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(announcement.id)}
                  style={{ 
                    opacity: imageError === announcement.id ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
                {announcement.linkUrl && (
                  <div className="announcement-image-overlay">
                    <ExternalLink size={20} />
                    <span>Ver más</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="announcement-text">
              <h3 className="announcement-title">{announcement.title}</h3>
              <p className="announcement-content">{announcement.content}</p>
              {announcement.linkUrl && (
                <div className="announcement-link">
                  <ExternalLink size={16} />
                  <span>Ver más información</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {announcements.length > 1 && (
        <div className="announcement-widget-controls">
          <button
            className="announcement-nav-btn"
            onClick={handlePrev}
            aria-label="Anuncio anterior"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="announcement-indicators">
            {announcements.map((_, index) => (
              <button
                key={index}
                className={`announcement-indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ir al anuncio ${index + 1}`}
              />
            ))}
          </div>
          
          <button
            className="announcement-nav-btn"
            onClick={handleNext}
            aria-label="Siguiente anuncio"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnouncementWidget;

