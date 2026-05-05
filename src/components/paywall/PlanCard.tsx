import { Pressable, Text, View } from 'react-native';
import { paywallStyles as s } from './sharedStyles';

interface PlanCardProps {
  label: string;
  price: string;
  saving?: string;
  bestValue?: boolean;
  selected: boolean;
  onPress: () => void;
  badgeText?: string;
  strikethroughPrice?: string;
}

export function PlanCard({
  label,
  price,
  saving,
  bestValue,
  selected,
  onPress,
  badgeText,
  strikethroughPrice,
}: PlanCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.planCard,
        bestValue && s.planCardBestBg,
        selected && s.planCardSelected,
      ]}
    >
      {bestValue || badgeText ? (
        <View style={s.bestBadge}>
          <Text style={s.bestBadgeText}>
            {badgeText ?? 'Best Value'}
          </Text>
        </View>
      ) : null}
      <Text style={s.planLabel}>{label}</Text>
      {strikethroughPrice ? (
        <Text style={s.planPriceStrike}>{strikethroughPrice}</Text>
      ) : null}
      <Text style={s.planPrice}>{price}</Text>
      {saving ? <Text style={s.planSaving}>{saving}</Text> : null}
    </Pressable>
  );
}
