import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case studio
    case projects
    case jobs
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .studio: "Studio"
        case .projects: "Projects"
        case .jobs: "Jobs"
        case .settings: "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .studio: "wand.and.stars"
        case .projects: "square.grid.2x2.fill"
        case .jobs: "sparkles.rectangle.stack.fill"
        case .settings: "gearshape.fill"
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme
    @State private var selectedTab: AppTab = .studio
    @State private var activeDraft = ProjectDraft.blank

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                StudioView(draft: $activeDraft) {
                    selectedTab = .jobs
                }
            }
            .tabItem { Label(AppTab.studio.title, systemImage: AppTab.studio.symbol) }
            .tag(AppTab.studio)

            NavigationStack {
                ProjectLibraryView { project in
                    activeDraft = project
                    selectedTab = .studio
                }
            }
            .tabItem { Label(AppTab.projects.title, systemImage: AppTab.projects.symbol) }
            .tag(AppTab.projects)

            NavigationStack { JobsView() }
                .tabItem { Label(AppTab.jobs.title, systemImage: AppTab.jobs.symbol) }
                .badge(model.jobs.filter { $0.state == .waitingApproval }.count)
                .tag(AppTab.jobs)

            NavigationStack { SettingsView() }
                .tabItem { Label(AppTab.settings.title, systemImage: AppTab.settings.symbol) }
                .tag(AppTab.settings)
        }
        .tint(theme.electricBlue)
        .preferredColorScheme(.dark)
        .task { await model.bootstrap() }
        .overlay(alignment: .top) {
            if let notice = model.notice {
                NoticeOverlay(notice: notice)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: notice.id) {
                        try? await Task.sleep(for: .seconds(4))
                        guard model.notice?.id == notice.id else { return }
                        withAnimation { model.notice = nil }
                    }
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.86), value: model.notice)
    }
}

#Preview {
    RootView()
        .environment(AppModel())
        .environment(ForgeTheme())
}

