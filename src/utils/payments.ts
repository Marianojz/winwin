import { ref, push, set, get, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { Order } from '../types';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentOperation {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  amount: number;
  bankAccountId?: string;
  bankAccountAlias?: string;
  bankAccountCbu?: string;
  proofUrl: string;
  status: PaymentStatus;
  autoChecked: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Crea un registro de pago para una orden con transferencia bancaria y
 * puede, opcionalmente, aprobar automáticamente el pago.
 */
export const createPaymentForOrder = async (
  order: Order,
  proofUrl: string,
  options: { autoApprove?: boolean } = {}
): Promise<PaymentOperation> => {
  const paymentsRef = ref(realtimeDb, 'payments');
  const newRef = push(paymentsRef);
  const id = newRef.key || `PAY-${Date.now()}`;

  const now = new Date().toISOString();

  const operation: PaymentOperation = {
    id,
    orderId: order.id,
    userId: order.userId,
    userName: order.userName,
    amount: order.amount,
    bankAccountId: order.bankAccountId,
    bankAccountAlias: order.bankAccountAlias,
    bankAccountCbu: order.bankAccountCbu,
    proofUrl,
    status: options.autoApprove ? 'approved' : 'pending',
    autoChecked: !!options.autoApprove,
    notes: options.autoApprove ? 'Aprobado automáticamente por el sistema' : undefined,
    createdAt: now,
    updatedAt: now
  };

  await set(newRef, operation);

  // Actualizar la orden con la URL del comprobante y estado de verificación
  const orderRef = ref(realtimeDb, `orders/${order.id}`);
  await update(orderRef, {
    paymentProofUrl: proofUrl,
    paymentVerificationStatus: options.autoApprove ? 'approved' : 'pending',
    status: options.autoApprove ? 'payment_confirmed' : order.status,
    updatedAt: now
  });

  return operation;
};

export const getPayments = async (): Promise<PaymentOperation[]> => {
  const paymentsRef = ref(realtimeDb, 'payments');
  const snapshot = await get(paymentsRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val() as Record<string, PaymentOperation>;
  return Object.values(data).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const updatePaymentStatus = async (
  id: string,
  status: PaymentStatus,
  options: { notes?: string } = {}
): Promise<void> => {
  if (!id) return;

  const paymentRef = ref(realtimeDb, `payments/${id}`);
  const snapshot = await get(paymentRef);
  if (!snapshot.exists()) return;

  const payment = snapshot.val() as PaymentOperation;
  const now = new Date().toISOString();

  await update(paymentRef, {
    status,
    notes: options.notes ?? payment.notes,
    updatedAt: now
  });

  // Sincronizar con la orden relacionada
  if (payment.orderId) {
    const orderRef = ref(realtimeDb, `orders/${payment.orderId}`);
    await update(orderRef, {
      paymentVerificationStatus: status,
      status: status === 'approved' ? 'payment_confirmed' : status === 'rejected' ? 'cancelled' : undefined,
      updatedAt: now
    });
  }
};


