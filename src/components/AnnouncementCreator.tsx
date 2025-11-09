import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Link, Calendar, Users, Save, Eye, AlertCircle, Camera, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { AnnouncementFormData, AnnouncementType, AnnouncementPriority, TargetUsers, SchedulingType } from '../types/announcements';
import { createAnnouncement, updateAnnouncement } from '../utils/announcements';
import { uploadImage } from '../utils/imageUpload';
import { compressImageToWebP, supportsWebP } from '../utils/imageCompression';
import { useIsMobile } from '../hooks/useMediaQuery';
import { auth } from '../config/firebase';
import './AnnouncementCreator.css';

interface AnnouncementCreatorProps {
  onClose: () => void;
  onSave: () => void;
  editingAnnouncement?: any; // Announcement type
}

const AnnouncementCreator = ({ onClose, onSave, editingAnnouncement }: AnnouncementCreatorProps) => {
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: editingAnnouncement?.title || '',
    content: editingAnnouncement?.content || '',
    type: editingAnnouncement?.type || 'text',
    imageUrl: editingAnnouncement?.imageUrl || '',
    linkUrl: editingAnnouncement?.linkUrl || '',
    targetUsers: editingAnnouncement?.targetUsers || 'all_users',
    expiresAt: editingAnnouncement?.expiresAt ? new Date(editingAnnouncement.expiresAt).toISOString().slice(0, 16) : '',
    scheduledAt: editingAnnouncement?.scheduledAt ? new Date(editingAnnouncement.scheduledAt).toISOString().slice(0, 16) : '',
    priority: editingAnnouncement?.priority || 'medium',
    scheduling: editingAnnouncement?.scheduling || 'immediate'
  });

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [customUsers, setCustomUsers] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const totalSteps = 4;
  const steps = [
    { id: 1, title: 'Tipo y Contenido', icon: '📝' },
    { id: 2, title: 'Imagen y Diseño', icon: '🖼️' },
    { id: 3, title: 'Destinatarios', icon: '👥' },
    { id: 4, title: 'Revisión', icon: '✅' }
  ];

  const handleChange = (field: keyof AnnouncementFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileUpload(file);
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileUpload(file);
  };

  const processFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // Comprimir si es soportado
      let fileToUpload = file;
      if (supportsWebP() && file.type.startsWith('image/')) {
        try {
          const compressedBlob = await compressImageToWebP(file, {
            maxWidth: 1200,
            maxHeight: 800,
            quality: 0.85
          });
          fileToUpload = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now()
          });
        } catch (compressionError) {
          console.warn('Error comprimiendo, usando original:', compressionError);
        }
      }

      const url = await uploadImage(fileToUpload, 'announcements');
      handleChange('imageUrl', url);
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.title.trim() && formData.content.trim() && formData.type);
      case 2:
        return true; // Imagen es opcional
      case 3:
        return !!(formData.targetUsers && formData.scheduling);
      case 4:
        return true; // Revisión
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && canProceedToNextStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Completá título y contenido');
      return;
    }

    try {
      const announcementData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        imageUrl: formData.imageUrl || undefined,
        linkUrl: formData.linkUrl?.trim() || undefined,
        targetUsers: (typeof formData.targetUsers === 'string' && formData.targetUsers === 'custom_segment' && customUsers)
          ? customUsers.split(',').map(id => id.trim()).filter(Boolean)
          : formData.targetUsers,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
        scheduledAt: formData.scheduling === 'scheduled_date' && formData.scheduledAt
          ? new Date(formData.scheduledAt)
          : undefined,
        createdBy: '', // Se completará en el backend
        priority: formData.priority,
        scheduling: formData.scheduling
      };

      // Obtener usuario actual para createdBy
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, announcementData);
      } else {
        await createAnnouncement(announcementData, currentUser.uid);
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error guardando anuncio:', error);
      alert('Error al guardar anuncio: ' + error.message);
    }
  };

  return (
    <div className="announcement-creator-overlay" onClick={onClose}>
      <div className="announcement-creator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="announcement-creator-header">
          <h2>{editingAnnouncement ? 'Editar Anuncio' : 'Crear Anuncio'}</h2>
          <button className="announcement-creator-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar (Mobile) */}
        {isMobile && (
          <div className="announcement-creator-progress">
            <div className="progress-steps">
              {steps.map((step, index) => (
                <div key={step.id} className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                  <div className="progress-step-circle">
                    {currentStep > step.id ? <Check size={16} /> : step.id}
                  </div>
                  {index < steps.length - 1 && <div className="progress-step-line" />}
                </div>
              ))}
            </div>
            <div className="progress-text">
              Paso {currentStep} de {totalSteps}: {steps[currentStep - 1].title}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`announcement-creator-form ${isMobile ? 'mobile-step-form' : ''}`}>
          {/* Step 1: Tipo y Contenido */}
          {(!isMobile || currentStep === 1) && (
            <div className={`form-step ${isMobile ? 'mobile-step' : ''}`}>
              {/* Tipo de Anuncio */}
              <div className="form-group">
            <label>Tipo de Anuncio *</label>
            <div className="radio-group">
              {(['text', 'image', 'urgent', 'promotional'] as AnnouncementType[]).map(type => (
                <label key={type} className="radio-option">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={() => handleChange('type', type)}
                  />
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Título del anuncio"
              required
            />
          </div>

          {/* Contenido */}
          <div className="form-group">
            <label htmlFor="content">Contenido *</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Descripción del anuncio"
              rows={4}
              required
            />
          </div>
            </div>
          )}

          {/* Step 2: Imagen y Diseño */}
          {(!isMobile || currentStep === 2) && (
            <div className={`form-step ${isMobile ? 'mobile-step' : ''}`}>
              {/* Imagen */}
              <div className="form-group">
                <label>Imagen</label>
                <div className="image-upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    style={{ display: 'none' }}
                  />
                  {isMobile ? (
                    <div className="mobile-upload-buttons">
                      <button
                        type="button"
                        className="upload-btn mobile-upload-btn"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Camera size={20} />
                        Cámara
                      </button>
                      <button
                        type="button"
                        className="upload-btn mobile-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <ImageIcon size={20} />
                        {uploading ? 'Subiendo...' : formData.imageUrl ? 'Cambiar' : 'Galería'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <ImageIcon size={18} />
                      {uploading ? 'Subiendo...' : formData.imageUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                    </button>
                  )}
                  {formData.imageUrl && (
                    <div className="image-preview">
                      <img src={formData.imageUrl} alt="Preview" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => handleChange('imageUrl', '')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {formData.imageUrl && isMobile && (
                    <button
                      type="button"
                      className="preview-fullscreen-btn"
                      onClick={() => setFullScreenPreview(true)}
                    >
                      <Eye size={18} />
                      Ver Preview Full-Screen
                    </button>
                  )}
                </div>
              </div>

              {/* Enlace */}
              <div className="form-group">
                <label htmlFor="linkUrl">
                  <Link size={16} />
                  Enlace (opcional)
                </label>
                <input
                  id="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => handleChange('linkUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Destinatarios y Programación */}
          {(!isMobile || currentStep === 3) && (
            <div className={`form-step ${isMobile ? 'mobile-step' : ''}`}>
              {/* Destinatarios */}
              <div className="form-group">
            <label>
              <Users size={16} />
              Destinatarios *
            </label>
            <select
              value={typeof formData.targetUsers === 'string' ? formData.targetUsers : 'custom_segment'}
              onChange={(e) => handleChange('targetUsers', e.target.value as TargetUsers)}
            >
              <option value="all_users">Todos los usuarios</option>
              <option value="new_users">Usuarios nuevos</option>
              <option value="premium_users">Usuarios premium</option>
              <option value="custom_segment">Segmento personalizado</option>
            </select>
            {(typeof formData.targetUsers === 'string' && formData.targetUsers === 'custom_segment') && (
              <input
                type="text"
                value={customUsers}
                onChange={(e) => setCustomUsers(e.target.value)}
                placeholder="IDs de usuario separados por comas"
                style={{ marginTop: '0.5rem' }}
              />
            )}
          </div>

          {/* Programación */}
          <div className="form-group">
            <label>
              <Calendar size={16} />
              Programación *
            </label>
            <select
              value={formData.scheduling}
              onChange={(e) => handleChange('scheduling', e.target.value as SchedulingType)}
            >
              <option value="immediate">Inmediato</option>
              <option value="scheduled_date">Fecha programada</option>
              <option value="recurring">Recurrente</option>
            </select>
            {formData.scheduling === 'scheduled_date' && (
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => handleChange('scheduledAt', e.target.value)}
                style={{ marginTop: '0.5rem' }}
              />
            )}
          </div>

          {/* Fecha de expiración */}
          <div className="form-group">
            <label htmlFor="expiresAt">Fecha de Expiración (opcional)</label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => handleChange('expiresAt', e.target.value)}
            />
          </div>
            </div>
          )}

          {/* Step 4: Revisión */}
          {(!isMobile || currentStep === 4) && (
            <div className={`form-step ${isMobile ? 'mobile-step' : ''}`}>
              {/* Prioridad */}
              <div className="form-group">
                <label>Prioridad *</label>
                <div className="radio-group">
                  {(['low', 'medium', 'high'] as AnnouncementPriority[]).map(priority => (
                    <label key={priority} className="radio-option">
                      <input
                        type="radio"
                        name="priority"
                        value={priority}
                        checked={formData.priority === priority}
                        onChange={() => handleChange('priority', priority)}
                      />
                      <span>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vista Previa */}
              <div className="form-group">
                <button
                  type="button"
                  className="preview-btn"
                  onClick={() => setPreview(!preview)}
                >
                  <Eye size={18} />
                  {preview ? 'Ocultar' : 'Mostrar'} Vista Previa
                </button>
              </div>

              {preview && (
                <div className="announcement-preview">
                  <div className={`announcement-card-preview ${formData.type} ${formData.priority === 'high' ? 'urgent' : ''}`}>
                    {formData.imageUrl && (
                      <div className="announcement-image-preview">
                        <img src={formData.imageUrl} alt="Preview" />
                      </div>
                    )}
                    <div className="announcement-text-preview">
                      <h3>{formData.title || 'Título del anuncio'}</h3>
                      <p>{formData.content || 'Contenido del anuncio'}</p>
                      {formData.linkUrl && (
                        <div className="announcement-link-preview">
                          <Link size={16} />
                          <span>Ver más información</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen de configuración (Mobile) */}
              {isMobile && (
                <div className="announcement-review-summary">
                  <h4>Resumen</h4>
                  <div className="review-item">
                    <strong>Tipo:</strong> {formData.type}
                  </div>
                  <div className="review-item">
                    <strong>Destinatarios:</strong> {
                      formData.targetUsers === 'all_users' ? 'Todos los usuarios' :
                      formData.targetUsers === 'new_users' ? 'Usuarios nuevos' :
                      formData.targetUsers === 'premium_users' ? 'Usuarios premium' :
                      'Segmento personalizado'
                    }
                  </div>
                  <div className="review-item">
                    <strong>Programación:</strong> {
                      formData.scheduling === 'immediate' ? 'Inmediato' :
                      formData.scheduling === 'scheduled_date' ? 'Fecha programada' :
                      'Recurrente'
                    }
                  </div>
                  <div className="review-item">
                    <strong>Prioridad:</strong> {formData.priority}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons (Mobile) */}
          {isMobile && (
            <div className="announcement-creator-mobile-nav">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn-nav btn-nav-prev"
                  onClick={prevStep}
                >
                  <ChevronLeft size={20} />
                  Anterior
                </button>
              )}
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  className="btn-nav btn-nav-next"
                  onClick={nextStep}
                  disabled={!canProceedToNextStep()}
                >
                  Siguiente
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-nav btn-nav-submit"
                  disabled={!canProceedToNextStep()}
                >
                  <Save size={20} />
                  {editingAnnouncement ? 'Actualizar' : 'Crear'} Anuncio
                </button>
              )}
            </div>
          )}

          {/* Botones (Desktop) */}
          {!isMobile && (
            <div className="announcement-creator-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              {editingAnnouncement ? 'Actualizar' : 'Crear'} Anuncio
            </button>
          </div>
          )}

          {/* Full-Screen Preview Modal (Mobile) */}
          {isMobile && fullScreenPreview && formData.imageUrl && (
            <div 
              className="announcement-preview-fullscreen"
              onClick={() => setFullScreenPreview(false)}
            >
              <div className="announcement-preview-fullscreen-content" onClick={(e) => e.stopPropagation()}>
                <button
                  className="announcement-preview-fullscreen-close"
                  onClick={() => setFullScreenPreview(false)}
                >
                  <X size={24} />
                </button>
                <div className={`announcement-card-preview ${formData.type} ${formData.priority === 'high' ? 'urgent' : ''}`}>
                  {formData.imageUrl && (
                    <div className="announcement-image-preview">
                      <img src={formData.imageUrl} alt="Preview" />
                    </div>
                  )}
                  <div className="announcement-text-preview">
                    <h3>{formData.title || 'Título del anuncio'}</h3>
                    <p>{formData.content || 'Contenido del anuncio'}</p>
                    {formData.linkUrl && (
                      <div className="announcement-link-preview">
                        <Link size={16} />
                        <span>Ver más información</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AnnouncementCreator;

