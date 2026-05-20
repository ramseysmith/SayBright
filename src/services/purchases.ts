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

export const ENTITLEMENT_ID = 'SayBright Premium';

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
    if (__DEV__) console.log('[Purchases] configured');
  } catch (error) {
    console.warn('RevenueCat configure failed', error);
  }
}

export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const active = Object.keys(customerInfo.entitlements.active);
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    if (__DEV__) {
      console.log('[Purchases] checkPremiumStatus active entitlements:', active);
      console.log('[Purchases] checkPremiumStatus isPremium:', isPremium);
    }
    return isPremium;
  } catch (error) {
    console.warn('[Purchases] checkPremiumStatus error:', error);
    return false;
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (__DEV__) {
      console.log(
        '[Purchases] offering packages:',
        offerings.current?.availablePackages.map((p) => p.identifier)
      );
    }
    return offerings.current ?? null;
  } catch (error) {
    console.warn('[Purchases] getOfferings error:', error);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    if (__DEV__) {
      console.log('[Purchases] purchasePackage starting:', pkg.identifier, pkg.product.identifier);
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = Object.keys(customerInfo.entitlements.active);
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    if (__DEV__) {
      console.log('[Purchases] purchasePackage active entitlements:', active);
      console.log('[Purchases] purchasePackage isPremium:', isPremium);
    }
    return isPremium;
  } catch (error: unknown) {
    const e = error as { userCancelled?: boolean };
    if (e?.userCancelled) {
      if (__DEV__) console.log('[Purchases] purchasePackage user cancelled');
      return false;
    }
    console.warn('[Purchases] purchasePackage error:', error);
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    if (__DEV__) console.log('[Purchases] restorePurchases isPremium:', isPremium);
    return isPremium;
  } catch (error) {
    console.warn('[Purchases] restorePurchases error:', error);
    return false;
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
