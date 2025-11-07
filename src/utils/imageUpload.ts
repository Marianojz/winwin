import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Sube una imagen a Firebase Storage y retorna la URL de descarga
 * @param file - Archivo a subir (File o Blob)
 * @param folder - Carpeta donde se guardará (ej: 'auctions', 'products', 'avatars')
 * @returns URL pública de la imagen
 */
export const uploadImage = async (file: File | Blob, folder: string = 'images'): Promise<string> => {
  try {
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen debe pesar menos de 5MB');
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Formato no válido. Use JPG, PNG, WEBP o SVG');
    }

    // Generar nombre único
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    let extension = file.type.split('/')[1];
    // Corregir extensión para SVG
    if (extension === 'svg+xml') {
      extension = 'svg';
    }
    const fileName = `${folder}/${timestamp}_${randomStr}.${extension}`;

    // Crear referencia en Storage
    const storageRef = ref(storage, fileName);

    // Subir archivo
    console.log(`📤 Subiendo imagen a Firebase Storage: ${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`✅ Imagen subida exitosamente: ${downloadURL}`);

    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error subiendo imagen:', error);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }
};

/**
 * Sube múltiples imágenes a Firebase Storage
 * @param files - Array de archivos a subir
 * @param folder - Carpeta donde se guardarán
 * @returns Array de URLs públicas
 */
export const uploadMultipleImages = async (
  files: File[],
  folder: string = 'images'
): Promise<string[]> => {
  try {
    console.log(`📤 Subiendo ${files.length} imágenes...`);
    
    // Subir todas las imágenes en paralelo
    const uploadPromises = files.map(file => uploadImage(file, folder));
    const urls = await Promise.all(uploadPromises);

    console.log(`✅ ${urls.length} imágenes subidas exitosamente`);
    return urls;
  } catch (error: any) {
    console.error('❌ Error subiendo múltiples imágenes:', error);
    throw new Error(`Error al subir imágenes: ${error.message}`);
  }
};

/**
 * Elimina una imagen de Firebase Storage usando su URL
 * @param imageUrl - URL de la imagen a eliminar
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extraer el path de la URL
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log(`🗑️ Imagen eliminada: ${imageUrl}`);
  } catch (error: any) {
    console.error('❌ Error eliminando imagen:', error);
    // No lanzar error si la imagen no existe
    if (error.code !== 'storage/object-not-found') {
      throw error;
    }
  }
};

/**
 * Convierte un File a base64 (para preview antes de subir)
 * @param file - Archivo a convertir
 * @returns String en base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Valida un archivo antes de subirlo
 * @param file - Archivo a validar
 * @param maxSizeMB - Tamaño máximo en MB
 * @returns true si es válido, lanza error si no
 */
export const validateImageFile = (file: File, maxSizeMB: number = 5): boolean => {
  // Validar tipo
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Formato no válido. Use JPG, PNG o WEBP');
  }

  // Validar tamaño
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`La imagen debe pesar menos de ${maxSizeMB}MB`);
  }

  return true;
};
