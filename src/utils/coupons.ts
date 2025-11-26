import { ref, get, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

export type CouponDiscountType = 'percent' | 'amount';

export interface Coupon {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  value: number; // porcentaje (0-100) o monto fijo
  minAmount?: number;
  maxUses?: number;
  usedCount?: number;
  active: boolean;
  validFrom?: string; // ISO
  validTo?: string;   // ISO
}

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  coupon?: Coupon;
  errorMessage?: string;
}

export const getCouponByCode = async (code: string): Promise<Coupon | null> => {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const couponRef = ref(realtimeDb, `coupons/${normalized}`);
  const snapshot = await get(couponRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  return {
    code: normalized,
    description: data.description,
    discountType: data.discountType,
    value: data.value,
    minAmount: data.minAmount,
    maxUses: data.maxUses,
    usedCount: data.usedCount,
    active: data.active,
    validFrom: data.validFrom,
    validTo: data.validTo
  };
};

export const validateCouponForAmount = async (
  rawCode: string,
  amount: number
): Promise<CouponValidationResult> => {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount,
      errorMessage: 'Ingresá un código de cupón válido.'
    };
  }

  const coupon = await getCouponByCode(code);
  if (!coupon || !coupon.active) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount,
      errorMessage: 'Cupón inválido o inactivo.'
    };
  }

  const now = Date.now();
  if (coupon.validFrom) {
    const from = Date.parse(coupon.validFrom);
    if (!isNaN(from) && now < from) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        coupon,
        errorMessage: 'Este cupón aún no está vigente.'
      };
    }
  }
  if (coupon.validTo) {
    const to = Date.parse(coupon.validTo);
    if (!isNaN(to) && now > to) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        coupon,
        errorMessage: 'Este cupón ya venció.'
      };
    }
  }

  if (coupon.minAmount && amount < coupon.minAmount) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount,
      coupon,
      errorMessage: `El monto mínimo para usar este cupón es de $${coupon.minAmount.toLocaleString('es-AR')}.`
    };
  }

  if (
    typeof coupon.maxUses === 'number' &&
    typeof coupon.usedCount === 'number' &&
    coupon.usedCount >= coupon.maxUses
  ) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: amount,
      coupon,
      errorMessage: 'Este cupón ya alcanzó el máximo de usos.'
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percent') {
    discountAmount = Math.round((amount * coupon.value) / 100);
  } else {
    discountAmount = Math.min(amount, coupon.value);
  }

  const finalAmount = Math.max(0, amount - discountAmount);

  return {
    valid: true,
    discountAmount,
    finalAmount,
    coupon
  };
};

export const incrementCouponUsage = async (code: string): Promise<void> => {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  const couponRef = ref(realtimeDb, `coupons/${normalized}`);
  const snapshot = await get(couponRef);
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  const usedCount = typeof data.usedCount === 'number' ? data.usedCount : 0;
  await update(couponRef, { usedCount: usedCount + 1 });
};


