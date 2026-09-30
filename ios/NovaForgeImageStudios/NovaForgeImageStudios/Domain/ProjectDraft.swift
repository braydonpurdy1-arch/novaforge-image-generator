import Foundation

struct ReferenceAssetDraft: Codable, Identifiable, Equatable, Sendable {
    let id: UUID
    var displayName: String
    let relativeFilePath: String
    var role: ReferenceRole
    var lockType: ReferenceLockType
    var lockStrength: LockStrength
    var isLocked: Bool
    let byteCount: Int

    init(
        id: UUID = UUID(),
        displayName: String,
        relativeFilePath: String,
        role: ReferenceRole = .scene,
        lockType: ReferenceLockType = .composition,
        lockStrength: LockStrength = .hard,
        isLocked: Bool = true,
        byteCount: Int
    ) {
        self.id = id
        self.displayName = displayName
        self.relativeFilePath = relativeFilePath
        self.role = role
        self.lockType = lockType
        self.lockStrength = lockStrength
        self.isLocked = isLocked
        self.byteCount = byteCount
    }

    var opaqueURI: String { "novaforge-asset://\(id.uuidString.lowercased())" }
}

struct ProjectDraft: Codable, Identifiable, Equatable, Sendable {
    let id: UUID
    var title: String
    var prompt: String
    var preset: WorkflowPreset
    var operation: GenerationOperation
    var references: [ReferenceAssetDraft]
    var requestedTarget: String
    var requestedTransformation: String
    var forbiddenChangesText: String
    var privacyMode: PrivacyMode
    var qualityTier: QualityTier
    var aspectRatio: String
    var provider: ProviderChoice
    var providerRequired: Bool
    var preferredModel: String
    var budgetCreditsText: String
    var requiresTextAccuracy: Bool
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        title: String = "Untitled project",
        prompt: String = "",
        preset: WorkflowPreset = .lockedFaceEdit,
        operation: GenerationOperation = .deltaEdit,
        references: [ReferenceAssetDraft] = [],
        requestedTarget: String = "Selected subject or region",
        requestedTransformation: String = "",
        forbiddenChangesText: String = "identity drift\ncomposition changes\nwarped anatomy\nplastic skin\nwrong reflections",
        privacyMode: PrivacyMode = .localOnly,
        qualityTier: QualityTier = .master,
        aspectRatio: String = "Original",
        provider: ProviderChoice = .automatic,
        providerRequired: Bool = false,
        preferredModel: String = "",
        budgetCreditsText: String = "",
        requiresTextAccuracy: Bool = false,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.title = title
        self.prompt = prompt
        self.preset = preset
        self.operation = operation
        self.references = references
        self.requestedTarget = requestedTarget
        self.requestedTransformation = requestedTransformation
        self.forbiddenChangesText = forbiddenChangesText
        self.privacyMode = privacyMode
        self.qualityTier = qualityTier
        self.aspectRatio = aspectRatio
        self.provider = provider
        self.providerRequired = providerRequired
        self.preferredModel = preferredModel
        self.budgetCreditsText = budgetCreditsText
        self.requiresTextAccuracy = requiresTextAccuracy
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    static var blank: ProjectDraft { ProjectDraft() }

    mutating func apply(_ preset: WorkflowPreset) {
        self.preset = preset
        operation = preset.operation
        qualityTier = preset.qualityTier
        requiresTextAccuracy = preset == .posterTypography

        if preset == .stillToVideo {
            provider = .higgsfield
        }
    }

    func validatedRequest() throws -> GenerationRequestPayload {
        let cleanPrompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanPrompt.isEmpty else { throw DraftValidationError.missingPrompt }
        guard !operation.needsReference || !references.isEmpty else {
            throw DraftValidationError.missingReference
        }
        guard privacyMode != .localOnly || provider == .automatic else {
            throw DraftValidationError.remoteProviderBlocked
        }

        let cleanTransformation = requestedTransformation.trimmingCharacters(in: .whitespacesAndNewlines)
        let requestedChanges: [RequestedChangePayload]
        if cleanTransformation.isEmpty {
            requestedChanges = []
        } else {
            requestedChanges = [RequestedChangePayload(
                target: requestedTarget.trimmingCharacters(in: .whitespacesAndNewlines),
                transformation: cleanTransformation,
                acceptableVariance: operation == .deltaEdit ? 0.05 : 0.15,
                geometryMayChange: operation != .deltaEdit,
                colorMayChange: true,
                lightingMayChange: true,
                textureMayChange: true
            )]
        }

        let sources = references.map {
            SourceAssetPayload(id: $0.id.uuidString, uri: $0.opaqueURI, roles: [$0.role], hash: nil)
        }
        let locks = references.filter(\.isLocked).map {
            ReferenceLockPayload(
                lockId: "lock-\($0.id.uuidString.lowercased())",
                assetId: $0.id.uuidString,
                type: $0.lockType,
                scope: $0.role.rawValue,
                description: "Preserve \($0.role.title.lowercased()) from \($0.displayName)",
                strength: $0.lockStrength
            )
        }

        let forbidden = forbiddenChangesText
            .split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let compiledPrompt: String
        if forbidden.isEmpty {
            compiledPrompt = cleanPrompt
        } else {
            compiledPrompt = cleanPrompt + "\n\nMUST NOT CHANGE:\n" + forbidden.map { "- \($0)" }.joined(separator: "\n")
        }

        return GenerationRequestPayload(
            requestId: "ios-\(UUID().uuidString.lowercased())",
            intent: preset.rawValue,
            operation: operation,
            prompt: compiledPrompt,
            sourceAssets: sources,
            explicitLocks: locks,
            requestedChanges: requestedChanges,
            privacyMode: privacyMode,
            outputRequirements: OutputRequirementsPayload(
                aspectRatio: aspectRatio == "Original" ? nil : aspectRatio,
                width: nil,
                height: nil,
                qualityTier: qualityTier,
                requiresTextAccuracy: requiresTextAccuracy,
                requiresVideo: preset == .stillToVideo,
                budgetCredits: Double(budgetCreditsText)
            ),
            preferredProvider: provider.apiValue,
            preferredModel: preferredModel.nilIfBlank,
            providerRequired: provider == .automatic ? nil : providerRequired,
            taskClass: preset.taskClass
        )
    }
}

enum DraftValidationError: LocalizedError, Equatable {
    case missingPrompt
    case missingReference
    case remoteProviderBlocked

    var errorDescription: String? {
        switch self {
        case .missingPrompt: "Describe what NovaForge should create or change."
        case .missingReference: "This workflow needs at least one reference image."
        case .remoteProviderBlocked: "Local-only privacy cannot require a remote provider."
        }
    }
}

private extension String {
    var nilIfBlank: String? {
        let clean = trimmingCharacters(in: .whitespacesAndNewlines)
        return clean.isEmpty ? nil : clean
    }
}
