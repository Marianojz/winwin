import { useState } from 'react';
import { Package, X, Upload } from 'lucide-react';
import { uploadMultipleImages, validateImageFile } from '../utils/imageUpload';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

const ImageUploader = ({ images, onChange, maxImages = 3, maxSizeMB = 5 }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      // Validar cantidad
      if (images.length + files.length > maxImages) {
        alert(`⚠️ Solo puedes agregar ${maxImages - images.length} imagen(es) más. Máximo total: ${maxImages} imágenes`);
        e.target.value = '';
        return;
      }

      // Validar cada archivo
      for (const file of files) {
        try {
          validateImageFile(file, maxSizeMB);
        } catch (error: any) {
          alert(`⚠️ ${file.name}: ${error.message}`);
          e.target.value = '';
          return;
        }
      }

      // Subir imágenes a Firebase
      setUploading(true);
      setUploadProgress(0);

      const uploadedUrls = await uploadMultipleImages(files, 'auctions');
      
      setUploadProgress(100);
      onChange([...images, ...uploadedUrls]);
      
      // Limpiar input
      e.target.value = '';
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error: any) {
      console.error('Error subiendo imágenes:', error);
      alert(`❌ Error al subir imágenes: ${error.message}`);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
        Imágenes del Producto * (Máximo {maxImages})
      </label>
      
      <div style={{ 
        border: '2px dashed var(--border)', 
        borderRadius: '0.75rem', 
        padding: '2rem', 
        textAlign: 'center',
        background: 'var(--bg-tertiary)',
        position: 'relative'
      }}>
        <input 
          type="file" 
          id="image-uploader" 
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          style={{ display: 'none' }}
        />
        
        <label 
          htmlFor="image-uploader" 
          style={{ 
            cursor: uploading || images.length >= maxImages ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            opacity: uploading || images.length >= maxImages ? 0.5 : 1
          }}
        >
          {uploading ? (
            <>
              <Upload size={48} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  Subiendo imágenes... {uploadProgress}%
                </div>
                <div style={{ 
                  width: '200px', 
                  height: '4px', 
                  background: 'var(--border)', 
                  borderRadius: '2px',
                  overflow: 'hidden',
                  margin: '0 auto'
                }}>
                  <div style={{ 
                    width: `${uploadProgress}%`, 
                    height: '100%', 
                    background: 'var(--primary)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Package size={48} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  {images.length > 0 
                    ? `Agregar más imágenes (${images.length}/${maxImages})` 
                    : 'Haz clic para seleccionar imágenes'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  JPG, PNG o WEBP • Máximo {maxSizeMB}MB por imagen • Hasta {maxImages} imágenes
                </div>
              </div>
            </>
          )}
        </label>
      </div>

      {images.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: '1rem',
          marginTop: '1rem' 
        }}>
          {images.map((img: string, idx: number) => (
            <div key={idx} style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <img 
                src={img} 
                alt={`Preview ${idx + 1}`}
                style={{ width: '100%', height: '150px', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
        💡 Las imágenes se suben automáticamente a Firebase Storage y son permanentes
      </div>
    </div>
  );
};

export default ImageUploader;
