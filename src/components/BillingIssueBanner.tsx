import { useEffect, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tap from './Tap';
import { usePremium } from '../context/PremiumContext';
import { trackEvent } from '../services/analytics';
import { FONTS } from '../constants/theme';
import { C, RADIUS } from '../theme/colors';

/**
 * One calm line on Today while Apple retries a failed Premium charge. RevenueCat's
 * own Apple billing message still shows too; this stays until the charge goes
 * through or the subscription ends. Same piece as Drift (HQ templates/ui).
 */
export default function BillingIssueBanner() {
  const { billingIssue: issue } = usePremium();
  const seen = useRef(false);

  useEffect(() => {
    if (issue && !seen.current) {
      seen.current = true;
      trackEvent('billing_issue_view', { inGrace: issue.inGrace });
    }
  }, [issue]);

  if (!issue) return null;

  return (
    <View style={styles.box}>
      <Ionicons name="card-outline" size={18} color={C.goldDeep} />
      <View style={styles.copy}>
        <Text style={styles.title}>Payment did not go through</Text>
        <Text style={styles.body}>
          {issue.inGrace ? 'Premium stays on for now. Update it to keep it.' : 'Update it to get Premium back.'}
        </Text>
      </View>
      <Tap
        onPress={() => {
          trackEvent('billing_issue_tap', { inGrace: issue.inGrace });
          Linking.openURL(issue.url).catch(() => {});
        }}
        hitSlop={6}
        accessibilityRole="link"
        accessibilityLabel="Update payment"
        style={styles.button}
      >
        <Text style={styles.buttonText}>Update</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: RADIUS.md,
    backgroundColor: C.surfaceStrong,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  copy: { flex: 1, marginLeft: 10, marginRight: 8 },
  title: { color: C.text, fontFamily: FONTS.bodyBold, fontSize: 14 },
  body: { color: C.textSecondary, fontFamily: FONTS.bodyRegular, fontSize: 13, marginTop: 2 },
  button: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.goldDim, justifyContent: 'center' },
  buttonText: { color: C.goldDeep, fontFamily: FONTS.bodyBold, fontSize: 14 },
});
