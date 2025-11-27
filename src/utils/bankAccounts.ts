import { ref, runTransaction, get, set, update, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

export interface BankAccount {
  id: string;
  bankName: string;
  holderName: string;
  cbu: string;
  alias?: string;
  description?: string;
  currency?: string;
}

// Valores por defecto que se pueden usar al inicio si no hay nada en DB.
// Se guardarán en /bankAccounts si el nodo está vacío.
export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-1',
    bankName: 'Banco Ejemplo 1',
    holderName: 'TU NOMBRE / EMPRESA',
    cbu: '0000000000000000000000',
    alias: 'TU.ALIAS.BANCO1',
    description: 'Cuenta corriente principal',
    currency: 'ARS'
  },
  {
    id: 'bank-2',
    bankName: 'Banco Ejemplo 2',
    holderName: 'TU NOMBRE / EMPRESA',
    cbu: '1111111111111111111111',
    alias: 'TU.ALIAS.BANCO2',
    description: 'Cuenta secundaria para balancear ingresos',
    currency: 'ARS'
  }
];

interface RotationState {
  lastIndex: number;
  updatedAt: string;
}

/**
 * Obtiene todas las cuentas bancarias desde Realtime DB.
 * Si no hay ninguna, inicializa con DEFAULT_BANK_ACCOUNTS.
 */
export const getAllBankAccounts = async (): Promise<BankAccount[]> => {
  const accountsRef = ref(realtimeDb, 'bankAccounts');
  const snapshot = await get(accountsRef);

  if (!snapshot.exists()) {
    // Inicializar con las cuentas por defecto
    const initialData: Record<string, BankAccount> = {};
    DEFAULT_BANK_ACCOUNTS.forEach((acc) => {
      initialData[acc.id] = acc;
    });
    await set(accountsRef, initialData);
    return DEFAULT_BANK_ACCOUNTS;
  }

  const data = snapshot.val() as Record<string, BankAccount>;
  return Object.values(data);
};

export const createBankAccount = async (account: Omit<BankAccount, 'id'>): Promise<BankAccount> => {
  const id = `bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newAccount: BankAccount = { ...account, id };
  const accountRef = ref(realtimeDb, `bankAccounts/${id}`);
  await set(accountRef, newAccount);
  return newAccount;
};

export const updateBankAccount = async (
  id: string,
  updates: Partial<Omit<BankAccount, 'id'>>
): Promise<void> => {
  if (!id) return;
  const accountRef = ref(realtimeDb, `bankAccounts/${id}`);
  await update(accountRef, updates);
};

export const deleteBankAccount = async (id: string): Promise<void> => {
  if (!id) return;
  const accountRef = ref(realtimeDb, `bankAccounts/${id}`);
  await remove(accountRef);
};

/**
 * Devuelve la próxima cuenta bancaria a usar, rotando de forma circular.
 * Usa un pequeño estado en Realtime DB para recordar el último índice usado.
 */
export const getNextBankAccount = async (): Promise<BankAccount> => {
  const accounts = await getAllBankAccounts();
  const total = accounts.length;
  if (total === 0) {
    throw new Error('No hay cuentas bancarias configuradas');
  }

  const rotationRef = ref(realtimeDb, 'bankAccountsMeta/rotation');

  const result = await runTransaction(rotationRef, (current: RotationState | null) => {
    if (total === 0) return current;
    const lastIndex = current?.lastIndex ?? -1;
    const nextIndex = (lastIndex + 1) % total;

    return {
      lastIndex: nextIndex,
      updatedAt: new Date().toISOString()
    };
  });

  const idx =
    (result.snapshot?.val()?.lastIndex as number | undefined) ??
    0;

  return accounts[idx] || accounts[0];
};


