import SwiftUI

@main
@MainActor
struct NovaForgeImageStudiosApp: App {
    @State private var model = AppModel()
    @State private var theme = ForgeTheme()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(theme)
        }
    }
}
