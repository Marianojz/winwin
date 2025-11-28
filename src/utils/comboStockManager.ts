import { ref, runTransaction, get } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { ComboProduct } from '../types';

export interface ComboStockResult {
  success: boolean;
  message?: string;
  failedProducts?: Array<{ productId: string; productName: string; reason: string }>;
}

/**
 * Verifica si hay stock suficiente para todos los productos de un combo
 */
export const checkComboStock = async (
  comboProducts: ComboProduct[]
): Promise<ComboStockResult> => {
  try {
    if (!comboProducts || comboProducts.length === 0) {
      return {
        success: false,
        message: 'El combo no tiene productos'
      };
    }

    const failedProducts: Array<{ productId: string; productName: string; reason: string }> = [];

    // Verificar stock de cada producto del combo
    for (const comboProduct of comboProducts) {
      const productRef = ref(realtimeDb, `products/${comboProduct.productId}`);
      const snapshot = await productRef.get();
      
      if (!snapshot.exists()) {
        failedProducts.push({
          productId: comboProduct.productId,
          productName: comboProduct.productName,
          reason: 'Producto no encontrado'
        });
        continue;
      }

      const product = snapshot.val();
      const currentStock = typeof product.stock === 'number' ? product.stock : 0;

      if (currentStock < comboProduct.quantity) {
        failedProducts.push({
          productId: comboProduct.productId,
          productName: comboProduct.productName,
          reason: `Stock insuficiente: ${currentStock} disponible, ${comboProduct.quantity} requerido`
        });
      }
    }

    if (failedProducts.length > 0) {
      return {
        success: false,
        message: 'No hay stock suficiente para algunos productos del combo',
        failedProducts
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error verificando stock del combo:', error);
    return {
      success: false,
      message: 'Error verificando stock del combo'
    };
  }
};

/**
 * Reserva stock para todos los productos de un combo
 * Si algún producto no tiene stock suficiente, revierte todos los cambios
 */
export const reserveComboStock = async (
  comboProducts: ComboProduct[],
  orderId?: string
): Promise<ComboStockResult> => {
  try {
    if (!comboProducts || comboProducts.length === 0) {
      return {
        success: false,
        message: 'El combo no tiene productos'
      };
    }

    // Primero verificar que todos tengan stock
    const checkResult = await checkComboStock(comboProducts);
    if (!checkResult.success) {
      return checkResult;
    }

    const failedProducts: Array<{ productId: string; productName: string; reason: string }> = [];
    const reservedProducts: Array<{ productId: string; quantity: number }> = [];

    // Intentar reservar stock de cada producto
    for (const comboProduct of comboProducts) {
      try {
        const productRef = ref(realtimeDb, `products/${comboProduct.productId}`);
        
        const txResult = await runTransaction(productRef, (current: any) => {
          if (!current) {
            return; // Producto no encontrado
          }

          const currentStock = typeof current.stock === 'number' ? current.stock : 0;

          if (currentStock < comboProduct.quantity) {
            return; // Stock insuficiente
          }

          const updated: any = {
            ...current,
            stock: currentStock - comboProduct.quantity
          };

          // Si el producto se maneja por bultos, recalcular bundles
          if (current.unitsPerBundle && current.unitsPerBundle > 0 && current.bundles != null) {
            const unitsPerBundle = current.unitsPerBundle as number;
            const currentBundles = current.bundles as number;
            const bundlesVendidos = Math.ceil(comboProduct.quantity / unitsPerBundle);
            const newBundles = Math.max(0, currentBundles - bundlesVendidos);
            updated.bundles = newBundles;
          }

          // Actualizar stockTotal si no existe
          if (updated.stockTotal == null) {
            updated.stockTotal = currentStock;
          }

          return updated;
        });

        if (!txResult.committed || !txResult.snapshot.exists()) {
          failedProducts.push({
            productId: comboProduct.productId,
            productName: comboProduct.productName,
            reason: 'No se pudo reservar stock (producto no encontrado o stock insuficiente)'
          });
        } else {
          reservedProducts.push({
            productId: comboProduct.productId,
            quantity: comboProduct.quantity
          });
        }
      } catch (error) {
        console.error(`❌ Error reservando stock para producto ${comboProduct.productId}:`, error);
        failedProducts.push({
          productId: comboProduct.productId,
          productName: comboProduct.productName,
          reason: 'Error al procesar la reserva'
        });
      }
    }

    // Si algún producto falló, revertir todos los cambios
    if (failedProducts.length > 0) {
      // Restaurar stock de los productos que se reservaron exitosamente
      for (const reserved of reservedProducts) {
        await restoreComboProductStock(reserved.productId, reserved.quantity);
      }

      return {
        success: false,
        message: 'No se pudo reservar stock para todos los productos del combo',
        failedProducts
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error reservando stock del combo:', error);
    return {
      success: false,
      message: 'Error inesperado reservando stock del combo'
    };
  }
};

/**
 * Restaura stock para un producto del combo (cuando se cancela un pedido)
 */
const restoreComboProductStock = async (
  productId: string,
  quantity: number
): Promise<void> => {
  try {
    if (!productId || quantity <= 0) return;

    const productRef = ref(realtimeDb, `products/${productId}`);

    await runTransaction(productRef, (current: any) => {
      if (!current) return current;

      const currentStock = typeof current.stock === 'number' ? current.stock : 0;
      const updated: any = {
        ...current,
        stock: currentStock + quantity
      };

      if (current.unitsPerBundle && current.unitsPerBundle > 0 && current.bundles != null) {
        const unitsPerBundle = current.unitsPerBundle as number;
        const currentBundles = current.bundles as number;
        const bundlesToAdd = Math.ceil(quantity / unitsPerBundle);
        updated.bundles = currentBundles + bundlesToAdd;
      }

      return updated;
    });
  } catch (error) {
    console.error(`❌ Error restaurando stock para producto ${productId}:`, error);
  }
};

/**
 * Restaura stock para todos los productos de un combo (cuando se cancela un pedido)
 */
export const restoreComboStock = async (
  comboProducts: ComboProduct[]
): Promise<void> => {
  try {
    if (!comboProducts || comboProducts.length === 0) return;

    // Restaurar stock de cada producto del combo
    await Promise.all(
      comboProducts.map(comboProduct =>
        restoreComboProductStock(comboProduct.productId, comboProduct.quantity)
      )
    );
  } catch (error) {
    console.error('❌ Error restaurando stock del combo:', error);
  }
};

