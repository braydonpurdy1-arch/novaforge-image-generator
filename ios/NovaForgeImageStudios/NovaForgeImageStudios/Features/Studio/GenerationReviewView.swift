import Foundation
import SwiftUI

struct GenerationReviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme
    let draft: ProjectDraft
    let onSubmitted: () -> Void

    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    approvalHeader
                    requestSummary
                    lockSummary
                    privacySummary

                    Button {
                        Task { await submit() }
                    } label: {
                        if isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Label("Authenticate and execute once", systemImage: "faceid")
                        }
                    }
                    .buttonStyle(ForgeButtonStyle())
                    .disabled(isSubmitting)

                    Text("Authentication approves only this exact request. Any later cost increase pauses for a separate approval.")
                        .font(.caption)
                        .foregroundStyle(theme.secondaryText)
                        .multilineTextAlignment(.center)
                }
                .padding()
            }
            .background(CosmicBackground())
            .navigationTitle("Review request")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var approvalHeader: some View {
        GlassCard {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(theme.success.opacity(0.15))
                        .frame(width: 82, height: 82)
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 38))
                        .foregroundStyle(theme.success)
                }
                Text("Owner approval required")
                    .font(.title2.bold())
                Text("NovaForge will not submit, switch providers, approve extra cost or delete assets without a direct owner action.")
                    .font(.subheadline)
                    .foregroundStyle(theme.secondaryText)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var requestSummary: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeading("Exact contract", eyebrow: "Request")
                ReviewRow(label: "Project", value: draft.title)
                ReviewRow(label: "Preset", value: draft.preset.title)
                ReviewRow(label: "Operation", value: draft.operation.title)
                ReviewRow(label: "Quality", value: draft.qualityTier.title)
                ReviewRow(label: "Aspect", value: draft.aspectRatio)
                ReviewRow(label: "Provider", value: draft.provider.title)
                if draft.providerRequired {
                    ReviewRow(label: "Fallback", value: "Forbidden")
                }
                if !draft.preferredModel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    ReviewRow(label: "Model", value: draft.preferredModel)
                }
                if !draft.budgetCreditsText.isEmpty {
                    ReviewRow(label: "Budget", value: "\(draft.budgetCreditsText) credits")
                }
                Divider().overlay(theme.glassBorder)
                Text(draft.prompt)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                if !draft.requestedTransformation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Divider().overlay(theme.glassBorder)
                    Text("ALLOWED DELTA")
                        .font(.caption2.weight(.bold))
                        .tracking(1.4)
                        .foregroundStyle(theme.electricBlue)
                    Text("\(draft.requestedTarget): \(draft.requestedTransformation)")
                        .font(.subheadline)
                }
                let forbidden = draft.forbiddenChangesText
                    .split(whereSeparator: \.isNewline)
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                if !forbidden.isEmpty {
                    Divider().overlay(theme.glassBorder)
                    Text("MUST NOT CHANGE")
                        .font(.caption2.weight(.bold))
                        .tracking(1.4)
                        .foregroundStyle(theme.ember)
                    ForEach(forbidden, id: \.self) { item in
                        Label(item, systemImage: "lock.fill")
                            .font(.caption)
                            .foregroundStyle(theme.secondaryText)
                    }
                }
            }
        }
    }

    private var lockSummary: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading("Protected references", eyebrow: "Locks")
                if draft.references.isEmpty {
                    Text("No reference assets")
                        .foregroundStyle(theme.secondaryText)
                } else {
                    ForEach(draft.references) { reference in
                        HStack {
                            Image(systemName: reference.isLocked ? "lock.fill" : "lock.open")
                                .foregroundStyle(reference.isLocked ? theme.success : theme.secondaryText)
                            VStack(alignment: .leading) {
                                Text(reference.displayName).font(.subheadline.weight(.semibold))
                                Text("\(reference.role.title) · \(reference.lockType.title) · \(reference.lockStrength.title)")
                                    .font(.caption)
                                    .foregroundStyle(theme.secondaryText)
                            }
                            Spacer()
                        }
                    }
                }
            }
        }
    }

    private var privacySummary: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 9) {
                SectionHeading("\(draft.privacyMode.title)", eyebrow: "Privacy")
                Text(draft.privacyMode.detail)
                    .font(.subheadline)
                    .foregroundStyle(theme.secondaryText)
                if draft.privacyMode == .remoteAllowed {
                    Label("This approved request may send prompt and media bindings to a remote provider.", systemImage: "network.badge.shield.half.filled")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(theme.ember)
                }
            }
        }
    }

    @MainActor
    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            _ = try await model.submit(draft)
            dismiss()
            onSubmitted()
        } catch {
            model.notice = AppNotice(style: .error, message: error.localizedDescription)
        }
    }
}

private struct ReviewRow: View {
    @Environment(ForgeTheme.self) private var theme
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.caption)
                .foregroundStyle(theme.secondaryText)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.semibold))
                .multilineTextAlignment(.trailing)
        }
    }
}
