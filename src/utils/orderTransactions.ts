/**
 * Sistema de log de transacciones de pedidos
 * Guarda cada cambio de estado como una línea de log en Firebase
 */

import { ref, push, set as firebaseSet, get, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { OrderTransaction, OrderStatus } from '../types';

/**
 * Crea una entrada de transacción en el log
 */
export async function logOrderTransaction(
  orderId: string,
  orderNumber: string,
  userId: string,
  userName: string,
  status: OrderStatus,
  amount: number,
  actionType: 'created' | 'status_changed' | 'payment_received' | 'shipped' | 'delivered' | 'cancelled',
  options: {
    previousStatus?: OrderStatus;
    newStatus?: OrderStatus;
    notes?: string;
    adminId?: string;
    adminName?: string;
  } = {}
): Promise<void> {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0]; // HH:mm:ss

    const transaction: OrderTransaction = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      orderNumber,
      userId,
      userName,
      status,
      amount,
      timestamp,
      date,
      time,
      actionType,
      ...options
    };

    // Guardar en Firebase: orderTransactions/{date}/{transactionId}
    const transactionRef = push(ref(realtimeDb, `orderTransactions/${date}`));
    await firebaseSet(transactionRef, transaction);

    // También guardar una referencia por orderId para búsqueda rápida
    const orderTransactionRef = push(ref(realtimeDb, `orderTransactionsByOrder/${orderId}`));
    await firebaseSet(orderTransactionRef, {
      ...transaction,
      transactionId: transactionRef.key
    });

    console.log(`✅ Transacción registrada: ${transaction.id} para pedido ${orderNumber}`);
  } catch (error) {
    console.error('❌ Error registrando transacción:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Crea una transacción de creación de pedido
 */
export async function logOrderCreated(
  orderId: string,
  orderNumber: string,
  userId: string,
  userName: string,
  amount: number
): Promise<void> {
  await logOrderTransaction(
    orderId,
    orderNumber,
    userId,
    userName,
    'pending_payment',
    amount,
    'created'
  );
}

/**
 * Crea una transacción de cambio de estado
 */
export async function logOrderStatusChange(
  orderId: string,
  orderNumber: string,
  userId: string,
  userName: string,
  status: OrderStatus,
  amount: number,
  previousStatus: OrderStatus,
  newStatus: OrderStatus,
  adminId?: string,
  adminName?: string
): Promise<void> {
  await logOrderTransaction(
    orderId,
    orderNumber,
    userId,
    userName,
    newStatus,
    amount,
    'status_changed',
    {
      previousStatus,
      newStatus,
      adminId,
      adminName
    }
  );
}

/**
 * Carga todas las transacciones de un pedido específico
 */
export function loadOrderTransactions(
  orderId: string,
  callback: (transactions: OrderTransaction[]) => void
): () => void {
  const transactionsRef = ref(realtimeDb, `orderTransactionsByOrder/${orderId}`);
  
  const unsubscribe = onValue(transactionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const transactions: OrderTransaction[] = Object.values(data).map((txn: any) => ({
        id: txn.id || txn.transactionId,
        orderId: txn.orderId,
        orderNumber: txn.orderNumber,
        userId: txn.userId,
        userName: txn.userName,
        status: txn.status,
        amount: txn.amount,
        timestamp: txn.timestamp,
        date: txn.date,
        time: txn.time,
        actionType: txn.actionType,
        previousStatus: txn.previousStatus,
        newStatus: txn.newStatus,
        notes: txn.notes,
        adminId: txn.adminId,
        adminName: txn.adminName
      }));
      
      // Ordenar por timestamp (más reciente primero)
      transactions.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      callback(transactions);
    } else {
      callback([]);
    }
  }, (error: any) => {
    // Solo mostrar error si no es un error de permisos (que es esperado para usuarios no admin)
    if (error?.code !== 'PERMISSION_DENIED' && !error?.message?.includes('permission_denied')) {
      console.error('Error cargando transacciones:', error);
    }
    // Siempre devolver array vacío en caso de error
    callback([]);
  });
  
  return () => off(transactionsRef);
}

