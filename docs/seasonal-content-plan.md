# SayBright Seasonal Content Plan

Quarterly free affirmation packs that drive seasonal downloads, retention, and word of mouth. Packs ship via the seasonal content infrastructure (`src/services/remoteContent.ts`) without requiring an app update once the remote fetch is wired to a hosted JSON.

## January: New Year, New You
- 15 affirmations about fresh starts, goal setting, and leaving the past behind.
- Free for all users (marketing tool to drive January downloads).

## February: Self Love Month
- 15 affirmations about self love, worthiness, and inner beauty.
- Free for all users (Valentine's season traffic).

## May: Mental Health Awareness
- 15 affirmations about resilience, seeking help, and being gentle with yourself.
- Free for all users.

## September: Back to School
- 15 affirmations about learning, growth, and handling transitions.
- Free for all users.

## November: Gratitude Season
- 15 affirmations about thankfulness, abundance, and appreciation.
- Free for all users.

## December: Year in Review
- Personalized "Your Year with SayBright" summary screen.
- Total affirmations viewed, streak stats, most favorited category.
- Shareable year in review card.

## Cadence and Format

- One seasonal pack per quarter, minimum.
- Free seasonal packs drive downloads; the app converts them to premium via the normal paywall flow.
- Each pack is delivered as a JSON document hosted on GitHub Pages, fetched once per app open and cached locally.

## JSON Format (target)

```json
{
  "id": "pack_seasonal_january_2027",
  "name": "New Year, New You",
  "emoji": "🎉",
  "color": "#F5A623",
  "startDate": "2027-01-01",
  "endDate": "2027-01-31",
  "isFree": true,
  "affirmations": [
    { "id": "season_jan_01", "text": "..." }
  ]
}
```
