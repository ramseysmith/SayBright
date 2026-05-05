export interface SeasonalPack {
  id: string;
  name: string;
  emoji: string;
  color: string;
  startDate: string;
  endDate: string;
  affirmations: { id: string; text: string }[];
  isFree: boolean;
}

const SEASONAL_PACKS: SeasonalPack[] = [];

export function getActiveSeasonalPacks(): SeasonalPack[] {
  const now = new Date();
  return SEASONAL_PACKS.filter((pack) => {
    const start = new Date(pack.startDate);
    const end = new Date(pack.endDate);
    return now >= start && now <= end;
  });
}

export async function fetchSeasonalPacks(): Promise<SeasonalPack[]> {
  return getActiveSeasonalPacks();
}
