import { Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

const REVENUECAT_API_KEY_IOS = 'test_jsbouKJlEVoEVDxZGbdKFavGHyd';
const REVENUECAT_API_KEY_ANDROID = 'test_jsbouKJlEVoEVDxZGbdKFavGHyd';

export const PRODUCT_IDS = {
  monthly: 'saybright_monthly',
  annual: 'saybright_annual',
};

export const ENTITLEMENT_ID = 'premium';

let configured = false;

export async function initializePurchases(): Promise<void> {
  if (configured) return;
  const apiKey =
    Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_IOS
      : REVENUECAT_API_KEY_ANDROID;
  try {
    await Purchases.configure({ apiKey });
    configured = true;
  } catch (error) {
    console.warn('RevenueCat configure failed', error);
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error: unknown) {
    const e = error as { userCancelled?: boolean };
    if (e?.userCancelled) {
      return false;
    }
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export type { PurchasesOffering, PurchasesPackage };
