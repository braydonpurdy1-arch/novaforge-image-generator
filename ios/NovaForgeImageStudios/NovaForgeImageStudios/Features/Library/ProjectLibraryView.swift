import SwiftUI

struct ProjectLibraryView: View {
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme
    let onOpen: (ProjectDraft) -> Void

    @State private var deleteCandidate: ProjectDraft?
    private let columns = [GridItem(.adaptive(minimum: 165, maximum: 320), spacing: 12)]

    var body: some View {
        ScrollView {
            if model.projects.isEmpty {
                emptyState
                    .padding(.top, 90)
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(model.projects) { project in
                        ProjectCard(project: project) {
                            onOpen(project)
                        } onDelete: {
                            deleteCandidate = project
                        }
                    }
                }
                .padding()
            }
        }
        .background(CosmicBackground())
        .navigationTitle("Projects")
        .alert("Delete local project?", item: $deleteCandidate) { project in
            Button("Cancel", role: .cancel) {}
            Button("Authenticate and delete", role: .destructive) {
                Task {
                    do { try await model.deleteProject(project) }
                    catch { show(error) }
                }
            }
        } message: { project in
            Text("\"\(project.title)\" will be removed from this device after owner authentication. Source image files are retained for safe recovery in this first release.")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "square.stack.3d.up.slash")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(theme.electricBlue)
            Text("No saved projects")
                .font(.title2.bold())
                .foregroundStyle(.white)
            Text("Build a controlled request in Studio, then save it locally.")
                .font(.subheadline)
                .foregroundStyle(theme.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(30)
    }

    private func show(_ error: Error) {
        model.notice = AppNotice(style: .error, message: error.localizedDescription)
    }
}

private struct ProjectCard: View {
    @Environment(ForgeTheme.self) private var theme
    let project: ProjectDraft
    let onOpen: () -> Void
    let onDelete: () -> Void

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    ZStack {
                        RoundedRectangle(cornerRadius: 13)
                            .fill(
                                LinearGradient(
                                    colors: [theme.plasmaViolet.opacity(0.8), theme.electricBlue.opacity(0.7)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        Image(systemName: project.preset.symbol)
                            .font(.title2)
                            .foregroundStyle(.white)
                    }
                    .frame(width: 48, height: 48)

                    Spacer()
                    Menu {
                        Button("Open", systemImage: "arrow.up.right.square", action: onOpen)
                        Button("Delete", systemImage: "trash", role: .destructive, action: onDelete)
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                            .foregroundStyle(theme.secondaryText)
                    }
                }

                Text(project.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                Text(project.prompt.isEmpty ? "No creative brief yet" : project.prompt)
                    .font(.caption)
                    .foregroundStyle(theme.secondaryText)
                    .lineLimit(3)

                Spacer(minLength: 0)
                HStack {
                    Label("\(project.references.count)", systemImage: "photo.stack")
                    Spacer()
                    Text(project.updatedAt, style: .date)
                }
                .font(.caption2)
                .foregroundStyle(theme.secondaryText)

                Button("Open in Studio", action: onOpen)
                    .buttonStyle(.borderedProminent)
                    .tint(theme.electricBlue.opacity(0.8))
                    .frame(maxWidth: .infinity)
            }
            .frame(minHeight: 230, alignment: .top)
        }
    }
}

