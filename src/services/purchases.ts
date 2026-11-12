import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

const REVENUECAT_API_KEY_IOS = 'appl_VOVMWNILkJsFKGXyPDbtCmZYBJb';
const REVENUECAT_API_KEY_ANDROID = 'test_jsbouKJlEVoEVDxZGbdKFavGHyd';

// These must match the App Store Connect product IDs exactly, and the same
// strings must be set as the product identifiers in the RevenueCat dashboard.
export const PRODUCT_IDS = {
  monthly: 'saybright_monthly',
  annual: 'saybright_yearly',
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
    // Verbose logs surface the underlying StoreKit reason when offerings come
    // back empty, which is otherwise swallowed and looks like "no products".
    if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    // Local simulator and emulator builds set EXPO_PUBLIC_REVENUECAT_TEST_KEY (eas.json
    // simulator profiles) so agents see real plans from the RevenueCat Test Store.
    await Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY || apiKey });
    configured = true;
    // Apple Search Ads attribution, so installs from ads can be measured
    if (Platform.OS === 'ios') {
      Purchases.enableAdServicesAttributionTokenCollection().catch(() => {});
    }
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
      // Distinguish the three ways this comes back empty: no offerings at all
      // (dashboard/config problem), no Current offering (nothing marked
      // Current), or a Current offering whose products StoreKit refused to
      // return (App Store Connect problem).
      const all = Object.keys(offerings.all);
      console.log('[Purchases] all offering identifiers:', all);
      console.log('[Purchases] current offering:', offerings.current?.identifier ?? null);
      console.log(
        '[Purchases] current packages:',
        offerings.current?.availablePackages.map(
          (p) => `${p.identifier} -> ${p.product.identifier} @ ${p.product.priceString}`
        ) ?? []
      );
      if (all.length === 0) {
        console.warn(
          '[Purchases] No offerings returned. Check the RevenueCat dashboard has an Offering with products attached, and that the bundle ID matches.'
        );
      } else if (!offerings.current) {
        console.warn(
          '[Purchases] Offerings exist but none is marked Current in the RevenueCat dashboard.'
        );
      } else if (offerings.current.availablePackages.length === 0) {
        console.warn(
          '[Purchases] Current offering has no available packages. StoreKit returned no products: check the Paid Applications Agreement is Active, the products are Ready to Submit, and that you are on a real device signed into a Sandbox account.'
        );
      }
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

/** A charge for Premium failed and Apple is still retrying it. */
export interface BillingIssue {
  /** Premium is still on (Apple's billing grace period) */
  inGrace: boolean;
  /** Apple's page to update the payment method or manage the subscription */
  url: string;
}

const SUBSCRIPTIONS_URL =
  Platform.OS === 'android'
    ? 'https://play.google.com/store/account/subscriptions'
    : 'https://apps.apple.com/account/subscriptions';

export function billingIssueFrom(info: CustomerInfo): BillingIssue | null {
  const ent = info.entitlements?.all?.[ENTITLEMENT_ID];
  // Only while Apple still retries: renewal on and the issue not resolved by a renewal
  if (!ent || !ent.billingIssueDetectedAt || !ent.willRenew || ent.unsubscribeDetectedAt) return null;
  return { inGrace: ent.isActive, url: info.managementURL ?? SUBSCRIPTIONS_URL };
}

export function isPremiumFrom(info: CustomerInfo): boolean {
  return info.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
}

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.warn('[Purchases] getCustomerInfo error:', error);
    return null;
  }
}

/**
 * RevenueCat pushes new customer info (renewal, expiry, billing issue) while the
 * app is open. Returns the unsubscribe function.
 */
export function onCustomerInfoUpdate(listener: (info: CustomerInfo) => void): () => void {
  try {
    Purchases.addCustomerInfoUpdateListener(listener);
  } catch {
    return () => {};
  }
  return () => {
    try {
      Purchases.removeCustomerInfoUpdateListener?.(listener);
    } catch {
      // ignore
    }
  };
}

export type { PurchasesOffering, PurchasesPackage };
