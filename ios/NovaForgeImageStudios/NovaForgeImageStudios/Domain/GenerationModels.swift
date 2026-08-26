import Foundation

enum GenerationOperation: String, Codable, CaseIterable, Identifiable, Sendable {
    case generate = "GENERATE"
    case edit = "EDIT"
    case deltaEdit = "DELTA_EDIT"
    case outpaint = "OUTPAINT"
    case inpaint = "INPAINT"
    case upscale = "UPSCALE"
    case restore = "RESTORE"
    case styleTransfer = "STYLE_TRANSFER"
    case imageToVideo = "IMAGE_TO_VIDEO"
    case videoEdit = "VIDEO_EDIT"
    case keyframeTransition = "KEYFRAME_TRANSITION"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .generate: "Generate"
        case .edit: "Edit"
        case .deltaEdit: "Precision edit"
        case .outpaint: "Outpaint"
        case .inpaint: "Inpaint"
        case .upscale: "Upscale"
        case .restore: "Restore"
        case .styleTransfer: "Style transfer"
        case .imageToVideo: "Image to video"
        case .videoEdit: "Video edit"
        case .keyframeTransition: "Keyframe transition"
        }
    }

    var needsReference: Bool { self != .generate }
}

enum ReferenceRole: String, Codable, CaseIterable, Identifiable, Sendable {
    case identity
    case face
    case profile
    case hair
    case expression
    case clothing
    case pose
    case composition
    case scene
    case object

    var id: String { rawValue }
    var title: String { rawValue.capitalized }

    var suggestedLock: ReferenceLockType {
        switch self {
        case .identity: .identity
        case .face, .profile, .hair, .expression: .face
        case .clothing: .clothing
        case .pose: .pose
        case .composition: .composition
        case .scene: .background
        case .object: .object
        }
    }
}

enum ReferenceLockType: String, Codable, CaseIterable, Identifiable, Sendable {
    case identity = "IDENTITY"
    case face = "FACE"
    case pose = "POSE"
    case composition = "COMPOSITION"
    case camera = "CAMERA"
    case background = "BACKGROUND"
    case lighting = "LIGHTING"
    case colorGrade = "COLOR_GRADE"
    case clothing = "CLOTHING"
    case object = "OBJECT"
    case region = "REGION"
    case text = "TEXT"
    case material = "MATERIAL"
    case wingsOrAppendage = "WINGS_OR_APPENDAGE"
    case vehicleBody = "VEHICLE_BODY"
    case custom = "CUSTOM"

    var id: String { rawValue }
    var title: String { rawValue.replacingOccurrences(of: "_", with: " ").capitalized }
}

enum LockStrength: String, Codable, CaseIterable, Identifiable, Sendable {
    case hard = "HARD"
    case soft = "SOFT"

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum PrivacyMode: String, Codable, CaseIterable, Identifiable, Sendable {
    case localOnly = "LOCAL_ONLY"
    case remoteRedacted = "REMOTE_REDACTED"
    case remoteAllowed = "REMOTE_ALLOWED"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .localOnly: "Local only"
        case .remoteRedacted: "Remote, redacted"
        case .remoteAllowed: "Remote allowed"
        }
    }

    var detail: String {
        switch self {
        case .localOnly: "Blocks all remote generation providers."
        case .remoteRedacted: "Removes common sensitive text before remote transport."
        case .remoteAllowed: "Allows the approved request to reach the selected provider."
        }
    }
}

enum QualityTier: String, Codable, CaseIterable, Identifiable, Sendable {
    case draft = "DRAFT"
    case standard = "STANDARD"
    case master = "MASTER"

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

enum TaskClass: String, Codable, Sendable {
    case photorealStill = "PHOTOREAL_STILL"
    case typography = "TYPOGRAPHY"
    case cinematicVideo = "CINEMATIC_VIDEO"
    case outpaint = "OUTPAINT"
    case general = "GENERAL"
}

enum WorkflowPreset: String, Codable, CaseIterable, Identifiable, Sendable {
    case memorialPhotoreal = "MEMORIAL_PHOTOREAL"
    case lockedFaceEdit = "LOCKED_FACE_EDIT"
    case vehicleVisualizer = "VEHICLE_VISUALIZER"
    case posterTypography = "POSTER_TYPOGRAPHY"
    case stillToVideo = "STILL_TO_VIDEO_CINEMATIC"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .memorialPhotoreal: "Memorial"
        case .lockedFaceEdit: "Locked face"
        case .vehicleVisualizer: "Vehicle"
        case .posterTypography: "Poster"
        case .stillToVideo: "Still to video"
        }
    }

    var subtitle: String {
        switch self {
        case .memorialPhotoreal: "Identity-first cinematic realism"
        case .lockedFaceEdit: "Strict precision delta edit"
        case .vehicleVisualizer: "Parts, paint and stance visualisation"
        case .posterTypography: "Layout and text-accuracy workflow"
        case .stillToVideo: "Continuity-preserving motion"
        }
    }

    var symbol: String {
        switch self {
        case .memorialPhotoreal: "sparkles"
        case .lockedFaceEdit: "faceid"
        case .vehicleVisualizer: "car.side.fill"
        case .posterTypography: "text.below.photo.fill"
        case .stillToVideo: "play.rectangle.fill"
        }
    }

    var operation: GenerationOperation {
        switch self {
        case .memorialPhotoreal, .lockedFaceEdit, .vehicleVisualizer, .posterTypography: .deltaEdit
        case .stillToVideo: .imageToVideo
        }
    }

    var qualityTier: QualityTier { .master }

    var taskClass: TaskClass {
        switch self {
        case .memorialPhotoreal, .lockedFaceEdit, .vehicleVisualizer: .photorealStill
        case .posterTypography: .typography
        case .stillToVideo: .cinematicVideo
        }
    }
}

enum ProviderChoice: String, Codable, CaseIterable, Identifiable, Sendable {
    case automatic
    case seedream
    case geminiImage = "gemini-image"
    case openAIImage = "openai-image"
    case flux
    case higgsfield

    var id: String { rawValue }

    var title: String {
        switch self {
        case .automatic: "Automatic"
        case .seedream: "Seedream"
        case .geminiImage: "Gemini Image"
        case .openAIImage: "OpenAI Image"
        case .flux: "FLUX"
        case .higgsfield: "Higgsfield"
        }
    }

    var apiValue: String? { self == .automatic ? nil : rawValue }
}

struct SourceAssetPayload: Codable, Equatable, Sendable {
    let id: String
    let uri: String
    let roles: [ReferenceRole]
    let hash: String?
}

struct ReferenceLockPayload: Codable, Equatable, Sendable {
    let lockId: String
    let assetId: String
    let type: ReferenceLockType
    let scope: String
    let description: String
    let strength: LockStrength
}

struct RequestedChangePayload: Codable, Equatable, Sendable {
    let target: String
    let transformation: String
    let acceptableVariance: Double
    let geometryMayChange: Bool
    let colorMayChange: Bool
    let lightingMayChange: Bool
    let textureMayChange: Bool
}

struct OutputRequirementsPayload: Codable, Equatable, Sendable {
    let aspectRatio: String?
    let width: Int?
    let height: Int?
    let qualityTier: QualityTier
    let requiresTextAccuracy: Bool
    let requiresVideo: Bool
    let budgetCredits: Double?
}

struct GenerationRequestPayload: Codable, Equatable, Sendable {
    let requestId: String
    let intent: String
    let operation: GenerationOperation
    let prompt: String
    let sourceAssets: [SourceAssetPayload]
    let explicitLocks: [ReferenceLockPayload]
    let requestedChanges: [RequestedChangePayload]
    let privacyMode: PrivacyMode
    let outputRequirements: OutputRequirementsPayload
    let preferredProvider: String?
    let preferredModel: String?
    let providerRequired: Bool?
    let taskClass: TaskClass
}

enum JobState: String, Codable, CaseIterable, Sendable {
    case queued = "QUEUED"
    case preflight = "PREFLIGHT"
    case waitingApproval = "WAITING_APPROVAL"
    case running = "RUNNING"
    case qualityControl = "QC"
    case completed = "COMPLETED"
    case failed = "FAILED"

    var title: String {
        switch self {
        case .queued: "Queued"
        case .preflight: "Preflight"
        case .waitingApproval: "Approval needed"
        case .running: "Generating"
        case .qualityControl: "Quality control"
        case .completed: "Completed"
        case .failed: "Failed"
        }
    }

    var isTerminal: Bool { self == .completed || self == .failed }
}

struct CostDecision: Codable, Equatable, Sendable {
    let requiresApproval: Bool?
    let estimatedCredits: Double?
    let budgetCredits: Double?
}

struct GenerationJob: Codable, Identifiable, Equatable, Sendable {
    let jobId: String
    let requestId: String
    let state: JobState
    let createdAt: String
    let updatedAt: String
    let providerId: String?
    let model: String?
    let outcomeStatus: String?
    let assetIds: [String]?
    let reasons: [String]?
    let costDecision: CostDecision?
    let providerRetention: String?
    let failureReason: String?

    var id: String { jobId }
}

struct CachedAssetResponse: Codable, Equatable, Sendable {
    let assetId: String
    let localAvailable: Bool
}

