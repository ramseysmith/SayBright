import WidgetKit
import SwiftUI

// MARK: - Shared App Group constants and data loader (namespaced to avoid top level
// declarations alongside the @main widget bundle).

enum SayBrightWidgetStorage {
    static let appGroupID = "group.com.saybright.app"
    static let widgetDataKey = "saybright_widget_data"

    static func load() -> SayBrightWidgetData {
        guard
            let defaults = UserDefaults(suiteName: appGroupID),
            let raw = defaults.string(forKey: widgetDataKey),
            let data = raw.data(using: .utf8)
        else {
            return .placeholder
        }
        do {
            return try JSONDecoder().decode(SayBrightWidgetData.self, from: data)
        } catch {
            return .placeholder
        }
    }
}

// MARK: - Data model

struct SayBrightWidgetData: Codable {
    let affirmationText: String
    let categoryEmoji: String
    let categoryName: String
    let streakCount: Int
    let lastUpdated: String

    static let placeholder = SayBrightWidgetData(
        affirmationText: "You are exactly where you need to be.",
        categoryEmoji: "☀️",
        categoryName: "SayBright",
        streakCount: 0,
        lastUpdated: ""
    )
}

// MARK: - Timeline entry / provider

struct AffirmationEntry: TimelineEntry {
    let date: Date
    let data: SayBrightWidgetData
}

struct AffirmationProvider: TimelineProvider {
    func placeholder(in context: Context) -> AffirmationEntry {
        AffirmationEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (AffirmationEntry) -> Void) {
        completion(AffirmationEntry(date: Date(), data: SayBrightWidgetStorage.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AffirmationEntry>) -> Void) {
        let now = Date()
        let entry = AffirmationEntry(date: now, data: SayBrightWidgetStorage.load())
        // Refresh hourly as a fallback. The app reloads timelines whenever the affirmation rotates.
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now.addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Home screen views

struct HomeSmallView: View {
    let entry: AffirmationEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Text(entry.data.categoryEmoji)
                    .font(.system(size: 16))
                Text(entry.data.categoryName)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Text(entry.data.affirmationText)
                .font(.system(size: 14, weight: .semibold, design: .serif))
                .foregroundColor(.primary)
                .lineLimit(5)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 0)
            if entry.data.streakCount > 0 {
                HStack(spacing: 4) {
                    Text("🔥")
                        .font(.system(size: 12))
                    Text("\(entry.data.streakCount)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.primary)
                }
            }
        }
        .padding(12)
    }
}

struct HomeMediumView: View {
    let entry: AffirmationEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(entry.data.categoryEmoji)
                    .font(.system(size: 18))
                Text(entry.data.categoryName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                Spacer()
                if entry.data.streakCount > 0 {
                    HStack(spacing: 4) {
                        Text("🔥")
                            .font(.system(size: 13))
                        Text("\(entry.data.streakCount)")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.primary)
                }
            }
            Spacer(minLength: 0)
            Text(entry.data.affirmationText)
                .font(.system(size: 17, weight: .semibold, design: .serif))
                .foregroundColor(.primary)
                .lineLimit(4)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            Text("SayBright")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(red: 0.96, green: 0.65, blue: 0.14))
        }
        .padding(16)
    }
}

struct HomeLargeView: View {
    let entry: AffirmationEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Text(entry.data.categoryEmoji)
                    .font(.system(size: 22))
                Text(entry.data.categoryName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer()
                if entry.data.streakCount > 0 {
                    HStack(spacing: 5) {
                        Text("🔥")
                            .font(.system(size: 16))
                        Text("\(entry.data.streakCount) day streak")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(.primary)
                }
            }
            Spacer(minLength: 0)
            Text(entry.data.affirmationText)
                .font(.system(size: 22, weight: .bold, design: .serif))
                .foregroundColor(.primary)
                .lineLimit(8)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            HStack {
                Text("SayBright")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(red: 0.96, green: 0.65, blue: 0.14))
                Spacer()
                Text("Tap to open")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
        .padding(20)
    }
}

// MARK: - Lock screen views (iOS 16+)

@available(iOSApplicationExtension 16.0, *)
struct LockRectangularView: View {
    let entry: AffirmationEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text(entry.data.categoryEmoji)
                    .font(.system(size: 11))
                Text("SayBright")
                    .font(.system(size: 11, weight: .bold))
            }
            Text(entry.data.affirmationText)
                .font(.system(size: 12, weight: .semibold, design: .serif))
                .lineLimit(3)
                .minimumScaleFactor(0.8)
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct LockCircularView: View {
    let entry: AffirmationEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Text("🔥")
                    .font(.system(size: 14))
                Text("\(entry.data.streakCount)")
                    .font(.system(size: 14, weight: .bold))
            }
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct LockInlineView: View {
    let entry: AffirmationEntry

    var body: some View {
        Text("☀️ \(entry.data.affirmationText)")
            .lineLimit(1)
    }
}

// MARK: - Widget entry view router

struct AffirmationWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: AffirmationEntry

    var body: some View {
        switch family {
        case .systemSmall:
            HomeSmallView(entry: entry)
                .containerBackgroundCompat()
        case .systemMedium:
            HomeMediumView(entry: entry)
                .containerBackgroundCompat()
        case .systemLarge:
            HomeLargeView(entry: entry)
                .containerBackgroundCompat()
        case .systemExtraLarge:
            HomeLargeView(entry: entry)
                .containerBackgroundCompat()
        case .accessoryRectangular:
            if #available(iOSApplicationExtension 16.0, *) {
                LockRectangularView(entry: entry)
                    .containerBackgroundCompat()
            } else {
                EmptyView()
            }
        case .accessoryCircular:
            if #available(iOSApplicationExtension 16.0, *) {
                LockCircularView(entry: entry)
                    .containerBackgroundCompat()
            } else {
                EmptyView()
            }
        case .accessoryInline:
            if #available(iOSApplicationExtension 16.0, *) {
                LockInlineView(entry: entry)
            } else {
                EmptyView()
            }
        @unknown default:
            HomeSmallView(entry: entry)
                .containerBackgroundCompat()
        }
    }
}

// Helper to apply containerBackground only on iOS 17+ (required by Apple).
extension View {
    @ViewBuilder
    func containerBackgroundCompat() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) {
                Color("WidgetBackground")
            }
        } else {
            self.background(Color("WidgetBackground"))
        }
    }
}

// MARK: - Widget definition

struct AffirmationWidget: Widget {
    let kind: String = "SayBrightAffirmationWidget"

    var body: some WidgetConfiguration {
        let config = StaticConfiguration(kind: kind, provider: AffirmationProvider()) { entry in
            AffirmationWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Affirmation")
        .description("Your current affirmation and streak at a glance.")

        if #available(iOSApplicationExtension 16.0, *) {
            return config.supportedFamilies([
                .systemSmall,
                .systemMedium,
                .systemLarge,
                .accessoryRectangular,
                .accessoryCircular,
                .accessoryInline,
            ])
        } else {
            return config.supportedFamilies([
                .systemSmall,
                .systemMedium,
                .systemLarge,
            ])
        }
    }
}
