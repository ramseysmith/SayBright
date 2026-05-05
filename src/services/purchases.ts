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

export async function purchasePack(productId: string): Promise<boolean> {
  try {
    const products = await Purchases.getProducts([productId]);
    if (products.length === 0) return false;
    const result = await Purchases.purchaseStoreProduct(products[0]);
    const owned = Object.keys(
      result.customerInfo.nonSubscriptionTransactions ?? {}
    ).some((id) => id === productId);
    return owned;
  } catch (error: unknown) {
    const e = error as { userCancelled?: boolean };
    if (e?.userCancelled) return false;
    throw error;
  }
}

export async function getPurchasedPacks(): Promise<string[]> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const txs = customerInfo.nonSubscriptionTransactions ?? [];
    const ids = new Set<string>();
    for (const tx of txs) {
      if (tx.productIdentifier) ids.add(tx.productIdentifier);
    }
    return Array.from(ids);
  } catch {
    return [];
  }
}

export type PaywallVariant = 'A' | 'B' | 'C';

export async function getPaywallVariant(): Promise<PaywallVariant> {
  try {
    const offerings = await Purchases.getOfferings();
    const id = offerings.current?.identifier;
    if (id === 'social_proof') return 'B';
    if (id === 'urgency') return 'C';
    return 'A';
  } catch {
    return 'A';
  }
}

export type { PurchasesOffering, PurchasesPackage };
