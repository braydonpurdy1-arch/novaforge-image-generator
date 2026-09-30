import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme

    @State private var endpointText = ""
    @State private var replacementToken = ""

    var body: some View {
        @Bindable var model = model

        ScrollView {
            VStack(spacing: 16) {
                connectionCard
                securityCard

                GlassCard {
                    VStack(alignment: .leading, spacing: 14) {
                        SectionHeading("Defaults", eyebrow: "Preferences")
                        Picker("Privacy mode", selection: $model.settings.defaultPrivacyMode) {
                            ForEach(PrivacyMode.allCases) { mode in Text(mode.title).tag(mode) }
                        }
                        Toggle("Keep original reference files", isOn: $model.settings.keepOriginalReferences)
                            .tint(theme.electricBlue)
                        Button("Save preferences") {
                            do { try model.savePreferences() }
                            catch { show(error) }
                        }
                        .buttonStyle(.bordered)
                    }
                    .tint(theme.electricBlue)
                }

                aboutCard
            }
            .padding()
            .padding(.bottom, 24)
        }
        .background(CosmicBackground())
        .navigationTitle("Settings")
        .onAppear {
            endpointText = model.settings.endpointText
        }
    }

    private var connectionCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    SectionHeading(
                        "NovaForge Core",
                        eyebrow: "Connection",
                        detail: "The native app is local-first. Provider credentials remain on the trusted server."
                    )
                    Spacer()
                    StatusPill(
                        text: endpointText.isEmpty ? "Offline" : "Configured",
                        symbol: endpointText.isEmpty ? "bolt.slash.fill" : "network.badge.shield.half.filled",
                        color: endpointText.isEmpty ? theme.secondaryText : theme.success
                    )
                }

                TextField("https://core.novaforge…", text: $endpointText)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                    .autocorrectionDisabled()

                SecureField(
                    model.hasStoredToken ? "Token stored — enter only to replace" : "Bearer token (optional)",
                    text: $replacementToken
                )
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

                Button {
                    Task {
                        do {
                            try await model.saveConnection(
                                endpointText: endpointText,
                                replacementToken: replacementToken
                            )
                            replacementToken = ""
                        } catch { show(error) }
                    }
                } label: {
                    Label("Authenticate and save connection", systemImage: "lock.shield")
                }
                .buttonStyle(ForgeButtonStyle())

                if !model.settings.endpointText.isEmpty || model.hasStoredToken {
                    Button("Authenticate and disconnect", role: .destructive) {
                        Task {
                            do {
                                try await model.disconnect()
                                endpointText = ""
                                replacementToken = ""
                            } catch { show(error) }
                        }
                    }
                    .font(.subheadline.weight(.semibold))
                }
            }
        }
    }

    private var securityCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 13) {
                SectionHeading("Fail-closed controls", eyebrow: "Security")
                SecurityRow(symbol: "faceid", title: "Owner approval", value: "Always on")
                SecurityRow(symbol: "key.fill", title: "API token", value: "Keychain only")
                SecurityRow(symbol: "lock.doc.fill", title: "Reference paths", value: "Never transmitted")
                SecurityRow(symbol: "arrow.triangle.2.circlepath", title: "Provider fallback", value: "Blocked when required")
                SecurityRow(symbol: "creditcard.fill", title: "Over-budget cost", value: "Separate approval")
            }
        }
    }

    private var aboutCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                SectionHeading("NovaForge Image Studios", eyebrow: "About")
                Text("Native iOS client · Version 0.1.0")
                    .font(.subheadline.weight(.semibold))
                Text("Refinement over reinterpretation. Providers execute; NovaForge owns locks, routing, approval, quality control and provenance.")
                    .font(.caption)
                    .foregroundStyle(theme.secondaryText)
            }
        }
    }

    private func show(_ error: Error) {
        model.notice = AppNotice(style: .error, message: error.localizedDescription)
    }
}

private struct SecurityRow: View {
    @Environment(ForgeTheme.self) private var theme
    let symbol: String
    let title: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: symbol)
                .frame(width: 24)
                .foregroundStyle(theme.electricBlue)
            Text(title)
            Spacer()
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(theme.success)
        }
        .font(.subheadline)
    }
}
