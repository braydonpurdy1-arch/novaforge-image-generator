import SwiftUI

struct JobsView: View {
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if model.jobs.isEmpty {
                    emptyState
                        .padding(.top, 90)
                } else {
                    ForEach(model.jobs) { job in
                        JobCard(job: job)
                    }
                }
            }
            .padding()
        }
        .background(CosmicBackground())
        .navigationTitle("Jobs")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await refresh() }
                } label: {
                    if model.isBusy { ProgressView() }
                    else { Image(systemName: "arrow.clockwise") }
                }
                .disabled(model.isBusy || model.jobs.isEmpty)
                .accessibilityLabel("Refresh jobs")
            }
        }
        .refreshable { await refresh() }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(theme.electricBlue)
            Text("No generation jobs")
                .font(.title2.bold())
                .foregroundStyle(.white)
            Text("Review and approve a request in Studio. Its forward-only state will appear here.")
                .font(.subheadline)
                .foregroundStyle(theme.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(30)
    }

    @MainActor
    private func refresh() async {
        do { try await model.refreshJobs() }
        catch { model.notice = AppNotice(style: .error, message: error.localizedDescription) }
    }
}

private struct JobCard: View {
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme
    let job: GenerationJob

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 13) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(job.state.title)
                            .font(.headline)
                        Text(job.jobId)
                            .font(.caption2.monospaced())
                            .foregroundStyle(theme.secondaryText)
                            .textSelection(.enabled)
                    }
                    Spacer()
                    StatusPill(text: job.state.rawValue, symbol: stateSymbol, color: stateColor)
                }

                ProgressView(value: progress)
                    .tint(stateColor)

                if let provider = job.providerId {
                    ReviewLine(label: "Provider", value: provider)
                }
                if let modelName = job.model {
                    ReviewLine(label: "Model", value: modelName)
                }
                if let retention = job.providerRetention {
                    ReviewLine(label: "Provider retention", value: retention)
                }
                if let reason = job.failureReason ?? job.reasons?.first {
                    Label(reason, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(theme.ember)
                }

                if job.state == .waitingApproval {
                    costApproval
                }

                if let assetIDs = job.assetIds, !assetIDs.isEmpty {
                    Divider().overlay(theme.glassBorder)
                    Text("Output assets")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(theme.secondaryText)
                    ForEach(assetIDs, id: \.self) { assetID in
                        HStack {
                            Text(assetID)
                                .font(.caption2.monospaced())
                                .lineLimit(1)
                            Spacer()
                            Button("Delete local", role: .destructive) {
                                Task {
                                    do { try await model.deleteLocalCache(assetID: assetID) }
                                    catch { show(error) }
                                }
                            }
                            .font(.caption.weight(.semibold))
                        }
                    }
                }

                Text("Updated \(job.updatedAt)")
                    .font(.caption2)
                    .foregroundStyle(theme.secondaryText)
            }
        }
    }

    private var costApproval: some View {
        VStack(alignment: .leading, spacing: 10) {
            Divider().overlay(theme.glassBorder)
            Label("The stored request exceeded its budget and is paused.", systemImage: "creditcard.trianglebadge.exclamationmark")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(theme.ember)
            if let decision = job.costDecision {
                HStack {
                    if let estimate = decision.estimatedCredits {
                        StatusPill(text: "Estimate \(estimate.formatted()) credits")
                    }
                    if let budget = decision.budgetCredits {
                        StatusPill(text: "Budget \(budget.formatted())")
                    }
                }
            }
            HStack {
                Button("Reject", role: .destructive) { Task { await decide(false) } }
                    .buttonStyle(.bordered)
                Button("Authenticate & approve") { Task { await decide(true) } }
                    .buttonStyle(.borderedProminent)
                    .tint(theme.electricBlue)
            }
        }
    }

    private var progress: Double {
        switch job.state {
        case .queued: 0.08
        case .preflight: 0.2
        case .waitingApproval: 0.32
        case .running: 0.62
        case .qualityControl: 0.84
        case .completed, .failed: 1
        }
    }

    private var stateColor: Color {
        switch job.state {
        case .completed: theme.success
        case .failed: theme.ember
        case .waitingApproval: .orange
        default: theme.electricBlue
        }
    }

    private var stateSymbol: String {
        switch job.state {
        case .completed: "checkmark.circle.fill"
        case .failed: "xmark.octagon.fill"
        case .waitingApproval: "person.badge.key.fill"
        default: "waveform.path.ecg"
        }
    }

    @MainActor
    private func decide(_ approved: Bool) async {
        do { try await model.decideCost(for: job, approved: approved) }
        catch { show(error) }
    }

    private func show(_ error: Error) {
        model.notice = AppNotice(style: .error, message: error.localizedDescription)
    }
}

private struct ReviewLine: View {
    @Environment(ForgeTheme.self) private var theme
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label).foregroundStyle(theme.secondaryText)
            Spacer()
            Text(value).fontWeight(.semibold)
        }
        .font(.caption)
    }
}
