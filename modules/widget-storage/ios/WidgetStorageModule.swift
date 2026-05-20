import ExpoModulesCore
import WidgetKit

public class WidgetStorageModule: Module {
    private let appGroupID = "group.com.saybright.app"
    private let widgetDataKey = "saybright_widget_data"

    public func definition() -> ModuleDefinition {
        Name("WidgetStorage")

        Function("setWidgetData") { (json: String) -> Bool in
            guard let defaults = UserDefaults(suiteName: self.appGroupID) else {
                return false
            }
            defaults.set(json, forKey: self.widgetDataKey)
            self.reloadAllTimelines()
            return true
        }

        Function("clearWidgetData") { () -> Bool in
            guard let defaults = UserDefaults(suiteName: self.appGroupID) else {
                return false
            }
            defaults.removeObject(forKey: self.widgetDataKey)
            self.reloadAllTimelines()
            return true
        }

        Function("reloadWidgets") { () -> Void in
            self.reloadAllTimelines()
        }
    }

    private func reloadAllTimelines() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
