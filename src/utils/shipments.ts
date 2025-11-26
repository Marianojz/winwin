import { ref, set, update, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Order, Shipment, ShipmentStatus } from '../types';

// Crea un envío a partir de una orden existente
export const createShipmentFromOrder = async (
  order: Order,
  overrides: Partial<Shipment> = {}
): Promise<Shipment> => {
  const id = overrides.id || `SHP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  const shipment: Shipment = {
    id,
    orderId: order.id,
    userId: order.userId,
    userName: order.userName,
    status: overrides.status || 'pending',
    carrier: overrides.carrier,
    trackingNumber: overrides.trackingNumber,
    trackingUrl: overrides.trackingUrl,
    productId: order.productId,
    productName: order.productName,
    productImage: order.productImage,
    quantity: order.quantity,
    deliveryMethod: order.deliveryMethod,
    address: order.address,
    notes: overrides.notes,
    createdAt: overrides.createdAt || now.toISOString(),
    updatedAt: overrides.updatedAt
  };

  // Guardar en Realtime Database (convertir fechas a string)
  const dataToSave: any = {
    ...shipment,
    createdAt: typeof shipment.createdAt === 'string' ? shipment.createdAt : shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt
      ? (typeof shipment.updatedAt === 'string' ? shipment.updatedAt : shipment.updatedAt.toISOString())
      : undefined,
    shippedAt: shipment.shippedAt
      ? (typeof shipment.shippedAt === 'string' ? shipment.shippedAt : shipment.shippedAt.toISOString())
      : undefined,
    deliveredAt: shipment.deliveredAt
      ? (typeof shipment.deliveredAt === 'string' ? shipment.deliveredAt : shipment.deliveredAt.toISOString())
      : undefined
  };

  // Eliminar undefined
  Object.keys(dataToSave).forEach((key) => {
    if (dataToSave[key] === undefined) {
      delete dataToSave[key];
    }
  });

  const shipmentRef = ref(realtimeDb, `shipments/${id}`);
  await set(shipmentRef, dataToSave);

  return shipment;
};

// Actualiza el estado y datos de tracking de un envío
export const updateShipment = async (
  shipmentId: string,
  updates: Partial<Shipment>
): Promise<void> => {
  if (!shipmentId) return;

  const updatesToSave: any = { ...updates };

  if (updates.status) {
    updatesToSave.status = updates.status;
  }

  const now = new Date().toISOString();
  updatesToSave.updatedAt = now;

  if (updates.shippedAt) {
    updatesToSave.shippedAt =
      typeof updates.shippedAt === 'string' ? updates.shippedAt : updates.shippedAt.toISOString();
  }

  if (updates.deliveredAt) {
    updatesToSave.deliveredAt =
      typeof updates.deliveredAt === 'string' ? updates.deliveredAt : updates.deliveredAt.toISOString();
  }

  // Eliminar undefined
  Object.keys(updatesToSave).forEach((key) => {
    if (updatesToSave[key] === undefined) {
      delete updatesToSave[key];
    }
  });

  const shipmentRef = ref(realtimeDb, `shipments/${shipmentId}`);
  await update(shipmentRef, updatesToSave);
};

// Mapea datos crudos de Firebase a Shipment tipado
const mapShipment = (data: any): Shipment => ({
  id: data.id,
  orderId: data.orderId,
  userId: data.userId,
  userName: data.userName,
  status: data.status as ShipmentStatus,
  carrier: data.carrier,
  trackingNumber: data.trackingNumber,
  trackingUrl: data.trackingUrl,
  productId: data.productId,
  productName: data.productName,
  productImage: data.productImage,
  quantity: data.quantity,
  deliveryMethod: data.deliveryMethod,
  address: data.address,
  notes: data.notes,
  createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
  shippedAt: data.shippedAt ? new Date(data.shippedAt) : undefined,
  deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined
});

// Suscribirse a los envíos de un usuario (panel de usuario)
export const subscribeUserShipments = (
  userId: string,
  callback: (shipments: Shipment[]) => void
): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const shipmentsRef = ref(realtimeDb, 'shipments');

  const unsubscribe = onValue(
    shipmentsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }

      const shipments: Shipment[] = Object.values(data)
        .filter((s: any) => s.userId === userId)
        .map((s: any) => mapShipment(s));

      callback(shipments);
    },
    () => {
      callback([]);
    }
  );

  return () => {
    off(shipmentsRef);
    unsubscribe();
  };
};

// Suscribirse a todos los envíos (panel admin)
export const subscribeAllShipments = (
  callback: (shipments: Shipment[]) => void
): (() => void) => {
  const shipmentsRef = ref(realtimeDb, 'shipments');

  const unsubscribe = onValue(
    shipmentsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }

      const shipments: Shipment[] = Object.values(data).map((s: any) => mapShipment(s));
      callback(shipments);
    },
    () => {
      callback([]);
    }
  );

  return () => {
    off(shipmentsRef);
    unsubscribe();
  };
};


