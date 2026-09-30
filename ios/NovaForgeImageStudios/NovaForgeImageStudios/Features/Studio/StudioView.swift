import Foundation
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers
import UIKit

struct StudioView: View {
    @Environment(AppModel.self) private var model
    @Environment(ForgeTheme.self) private var theme
    @Binding var draft: ProjectDraft
    let onSubmitted: () -> Void

    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var reviewDraft: ProjectDraft?
    @State private var isImporting = false
    @State private var confirmsNewProject = false

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                hero
                promptCard
                presetCard
                referencesCard
                controlsCard
                providerCard
                actionCard
            }
            .padding(.horizontal)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .background(CosmicBackground())
        .navigationTitle("Image Studios")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    if draft.prompt.isEmpty && draft.references.isEmpty {
                        resetDraft()
                    } else {
                        confirmsNewProject = true
                    }
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("New project")
            }
        }
        .confirmationDialog(
            "Start a new project?",
            isPresented: $confirmsNewProject,
            titleVisibility: .visible
        ) {
            Button("Discard unsaved changes", role: .destructive) { resetDraft() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Save the current project first if you want to keep these edits.")
        }
        .sheet(item: $reviewDraft) { selectedDraft in
            GenerationReviewView(draft: selectedDraft, onSubmitted: onSubmitted)
                .environment(model)
                .environment(theme)
        }
        .onChange(of: selectedItems) { _, newItems in
            guard !newItems.isEmpty else { return }
            Task { await importItems(newItems) }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("NOVAFORGE")
                        .font(.caption.weight(.black))
                        .tracking(3.4)
                        .foregroundStyle(theme.electricBlue)
                    Text("Create with control.")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Identity fidelity, composition locks and owner-approved execution in one native workflow.")
                        .font(.subheadline)
                        .foregroundStyle(theme.secondaryText)
                }
                Spacer(minLength: 8)
                ZStack {
                    Circle()
                        .fill(theme.plasmaViolet.opacity(0.34))
                        .frame(width: 62, height: 62)
                        .blur(radius: 8)
                    Image(systemName: "camera.aperture")
                        .font(.system(size: 31, weight: .light))
                        .foregroundStyle(.white)
                }
            }
            HStack(spacing: 8) {
                StatusPill(text: "Owner approval", symbol: "faceid", color: theme.success)
                StatusPill(text: draft.privacyMode.title, symbol: "lock.shield.fill")
            }
        }
        .padding(.top, 10)
    }

    private var promptCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeading(
                    "Creative brief",
                    eyebrow: "01 · Intent",
                    detail: "Describe the final image and the smallest change required."
                )

                TextField("Project name", text: $draft.title)
                    .textFieldStyle(.plain)
                    .font(.headline)
                    .padding(13)
                    .background(theme.elevated.opacity(0.75), in: RoundedRectangle(cornerRadius: 14))

                TextEditor(text: $draft.prompt)
                    .frame(minHeight: 128)
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .background(theme.elevated.opacity(0.75), in: RoundedRectangle(cornerRadius: 14))
                    .overlay(alignment: .topLeading) {
                        if draft.prompt.isEmpty {
                            Text("Example: Keep the locked face and composition exactly. Refine natural skin detail, lighting and wing texture only…")
                                .font(.subheadline)
                                .foregroundStyle(theme.secondaryText.opacity(0.72))
                                .padding(16)
                                .allowsHitTesting(false)
                        }
                    }
            }
        }
    }

    private var presetCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeading(
                    "Workflow preset",
                    eyebrow: "02 · Method",
                    detail: "Presets set the starting operation, quality tier and routing class."
                )
                ScrollView(.horizontal) {
                    HStack(spacing: 10) {
                        ForEach(WorkflowPreset.allCases) { preset in
                            Button {
                                withAnimation(.snappy) { draft.apply(preset) }
                            } label: {
                                VStack(alignment: .leading, spacing: 10) {
                                    Image(systemName: preset.symbol)
                                        .font(.title2)
                                        .foregroundStyle(draft.preset == preset ? .white : theme.electricBlue)
                                    Text(preset.title)
                                        .font(.subheadline.weight(.bold))
                                    Text(preset.subtitle)
                                        .font(.caption2)
                                        .foregroundStyle(draft.preset == preset ? .white.opacity(0.78) : theme.secondaryText)
                                        .lineLimit(2)
                                }
                                .foregroundStyle(.white)
                                .frame(width: 142, height: 112, alignment: .topLeading)
                                .padding(14)
                                .background(
                                    draft.preset == preset
                                        ? theme.plasmaViolet.opacity(0.78)
                                        : theme.elevated.opacity(0.72),
                                    in: RoundedRectangle(cornerRadius: 17)
                                )
                                .overlay {
                                    RoundedRectangle(cornerRadius: 17)
                                        .stroke(
                                            draft.preset == preset ? theme.electricBlue : theme.glassBorder,
                                            lineWidth: draft.preset == preset ? 1.5 : 1
                                        )
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("\(preset.title) preset")
                        }
                    }
                }
                .scrollIndicators(.hidden)
            }
        }
    }

    private var referencesCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    SectionHeading(
                        "Reference roles",
                        eyebrow: "03 · Anchors",
                        detail: "Assign one job to each image. Locked means locked."
                    )
                    Spacer()
                    PhotosPicker(selection: $selectedItems, maxSelectionCount: 10, matching: .images) {
                        Label("Add", systemImage: "photo.badge.plus")
                            .font(.subheadline.weight(.semibold))
                    }
                    .disabled(isImporting)
                }

                if isImporting {
                    ProgressView("Securing references on this device…")
                        .tint(theme.electricBlue)
                }

                if draft.references.isEmpty {
                    ContentUnavailableView {
                        Label("No references yet", systemImage: "photo.stack")
                    } description: {
                        Text("Generate can work without one. Editing workflows require at least one reference.")
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(theme.secondaryText)
                } else {
                    VStack(spacing: 10) {
                        ForEach($draft.references) { $reference in
                            ReferenceRow(reference: $reference) {
                                draft.references.removeAll { $0.id == reference.id }
                            }
                        }
                    }
                }

                Label(
                    "Images stay in protected app storage. Requests send opaque asset IDs, never local file paths.",
                    systemImage: "lock.doc.fill"
                )
                .font(.caption)
                .foregroundStyle(theme.secondaryText)
            }
        }
    }

    private var controlsCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                SectionHeading(
                    "Change contract",
                    eyebrow: "04 · Precision",
                    detail: "Everything outside the requested delta remains preserved in strict mode."
                )

                Picker("Operation", selection: $draft.operation) {
                    ForEach(GenerationOperation.allCases) { operation in
                        Text(operation.title).tag(operation)
                    }
                }

                TextField("Target region or object", text: $draft.requestedTarget)
                    .textFieldStyle(.roundedBorder)
                TextField("Exact transformation", text: $draft.requestedTransformation, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...5)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Forbidden changes")
                        .font(.subheadline.weight(.semibold))
                    TextEditor(text: $draft.forbiddenChangesText)
                        .frame(minHeight: 92)
                        .scrollContentBackground(.hidden)
                        .padding(8)
                        .background(theme.elevated.opacity(0.75), in: RoundedRectangle(cornerRadius: 12))
                }

                Picker("Privacy", selection: $draft.privacyMode) {
                    ForEach(PrivacyMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                Text(draft.privacyMode.detail)
                    .font(.caption)
                    .foregroundStyle(theme.secondaryText)

                HStack {
                    Picker("Quality", selection: $draft.qualityTier) {
                        ForEach(QualityTier.allCases) { tier in Text(tier.title).tag(tier) }
                    }
                    Spacer()
                    Picker("Aspect", selection: $draft.aspectRatio) {
                        ForEach(["Original", "1:1", "4:5", "3:2", "16:9", "9:16"], id: \.self) { ratio in
                            Text(ratio).tag(ratio)
                        }
                    }
                }

                Toggle("Text accuracy required", isOn: $draft.requiresTextAccuracy)
                    .tint(theme.electricBlue)
            }
            .tint(theme.electricBlue)
        }
    }

    private var providerCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeading(
                    "Execution route",
                    eyebrow: "05 · Provider",
                    detail: "Automatic routing removes engines that cannot satisfy the hard locks first."
                )

                Picker("Provider", selection: $draft.provider) {
                    ForEach(ProviderChoice.allCases) { provider in
                        Text(provider.title).tag(provider)
                    }
                }
                .onChange(of: draft.provider) { _, provider in
                    if provider == .automatic { draft.providerRequired = false }
                }

                Toggle("Provider is mandatory", isOn: $draft.providerRequired)
                    .disabled(draft.provider == .automatic)
                    .tint(theme.electricBlue)

                TextField("Preferred model (optional)", text: $draft.preferredModel)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                TextField("Maximum credits before another approval", text: $draft.budgetCreditsText)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.decimalPad)
            }
            .tint(theme.electricBlue)
        }
    }

    private var actionCard: some View {
        GlassCard {
            VStack(spacing: 12) {
                HStack {
                    Label("Nothing runs without owner approval", systemImage: "faceid")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Image(systemName: "checkmark.shield.fill")
                        .foregroundStyle(theme.success)
                }

                Button {
                    Task {
                        do { try await model.saveProject(draft) }
                        catch { show(error) }
                    }
                } label: {
                    Label("Save local project", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                }
                .buttonStyle(.bordered)
                .tint(theme.secondaryText)

                Button {
                    do {
                        _ = try draft.validatedRequest()
                        reviewDraft = draft
                    } catch {
                        show(error)
                    }
                } label: {
                    Label("Review exact request", systemImage: "doc.text.magnifyingglass")
                }
                .buttonStyle(ForgeButtonStyle())
            }
        }
    }

    @MainActor
    private func importItems(_ items: [PhotosPickerItem]) async {
        isImporting = true
        defer {
            isImporting = false
            selectedItems = []
        }

        for (offset, item) in items.enumerated() {
            do {
                guard let data = try await item.loadTransferable(type: Data.self) else {
                    throw ReferenceImportError.emptyData
                }
                let fileExtension = item.supportedContentTypes.first?.preferredFilenameExtension ?? "img"
                let filename = "Reference \(draft.references.count + offset + 1).\(fileExtension)"
                var asset = try await model.importReference(data: data, filename: filename)
                if draft.references.isEmpty {
                    asset.role = .identity
                    asset.lockType = .identity
                }
                draft.references.append(asset)
            } catch {
                show(error)
            }
        }
    }

    private func show(_ error: Error) {
        model.notice = AppNotice(style: .error, message: error.localizedDescription)
    }

    private func resetDraft() {
        var replacement = ProjectDraft.blank
        replacement.privacyMode = model.settings.defaultPrivacyMode
        draft = replacement
    }
}

private struct ReferenceRow: View {
    @Environment(ForgeTheme.self) private var theme
    @Binding var reference: ReferenceAssetDraft
    let onRemove: () -> Void
    @State private var image: UIImage?

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Group {
                    if let image {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                    } else {
                        Image(systemName: "photo")
                            .font(.title2)
                            .foregroundStyle(theme.secondaryText)
                    }
                }
                .frame(width: 66, height: 66)
                .background(theme.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 13))
                .clipped()

                VStack(alignment: .leading, spacing: 5) {
                    Text(reference.displayName)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                    Text(ByteCountFormatter.string(fromByteCount: Int64(reference.byteCount), countStyle: .file))
                        .font(.caption2)
                        .foregroundStyle(theme.secondaryText)
                    StatusPill(
                        text: reference.isLocked ? "\(reference.lockStrength.title) lock" : "Unlocked",
                        symbol: reference.isLocked ? "lock.fill" : "lock.open.fill",
                        color: reference.isLocked ? theme.success : theme.secondaryText
                    )
                }
                Spacer()
                Button(role: .destructive, action: onRemove) {
                    Image(systemName: "trash")
                }
                .accessibilityLabel("Remove \(reference.displayName)")
            }

            HStack {
                Picker("Role", selection: roleBinding) {
                    ForEach(ReferenceRole.allCases) { role in Text(role.title).tag(role) }
                }
                Picker("Lock", selection: $reference.lockType) {
                    ForEach(ReferenceLockType.allCases) { lock in Text(lock.title).tag(lock) }
                }
            }
            Toggle("Protect this reference", isOn: $reference.isLocked)
                .tint(theme.electricBlue)
            if reference.isLocked {
                Picker("Strength", selection: $reference.lockStrength) {
                    ForEach(LockStrength.allCases) { strength in Text(strength.title).tag(strength) }
                }
                .pickerStyle(.segmented)
            }
        }
        .padding(13)
        .background(theme.elevated.opacity(0.6), in: RoundedRectangle(cornerRadius: 16))
        .task(id: reference.relativeFilePath) {
            guard let url = ReferenceAssetStore.url(for: reference),
                  let data = try? Data(contentsOf: url) else { return }
            image = UIImage(data: data)
        }
    }

    private var roleBinding: Binding<ReferenceRole> {
        Binding(
            get: { reference.role },
            set: { newRole in
                reference.role = newRole
                reference.lockType = newRole.suggestedLock
            }
        )
    }
}

private struct StudioPreview: View {
    @State private var draft = ProjectDraft.blank
    let model = AppModel()
    let theme = ForgeTheme()

    var body: some View {
        NavigationStack {
            StudioView(draft: $draft, onSubmitted: {})
        }
        .environment(model)
        .environment(theme)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    StudioPreview()
}
