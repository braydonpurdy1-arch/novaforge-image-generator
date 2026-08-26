import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    private(set) var projects: [ProjectDraft] = []
    private(set) var jobs: [GenerationJob] = []
    private(set) var hasStoredToken = false
    private(set) var isBootstrapped = false
    var settings: AppSettings
    var isBusy = false
    var notice: AppNotice?

    private let projectStore: ProjectStore
    private let assetStore: ReferenceAssetStore
    private let keychain: KeychainStore
    private let authorizer: any ApprovalAuthorizing

    init(
        projectStore: ProjectStore = ProjectStore(),
        assetStore: ReferenceAssetStore = ReferenceAssetStore(),
        keychain: KeychainStore = KeychainStore(),
        authorizer: any ApprovalAuthorizing = DeviceOwnerAuthorizer(),
        settings: AppSettings = .load()
    ) {
        self.projectStore = projectStore
        self.assetStore = assetStore
        self.keychain = keychain
        self.authorizer = authorizer
        self.settings = settings
    }

    func bootstrap() async {
        guard !isBootstrapped else { return }
        async let savedProjects = projectStore.loadProjects()
        async let savedJobs = projectStore.loadJobs()
        let loadedProjects = await savedProjects
        let loadedJobs = await savedJobs
        projects = loadedProjects.sorted { $0.updatedAt > $1.updatedAt }
        jobs = loadedJobs.sorted { $0.updatedAt > $1.updatedAt }
        hasStoredToken = (try? keychain.readAPIToken()) != nil
        isBootstrapped = true
    }

    func importReference(data: Data, filename: String) async throws -> ReferenceAssetDraft {
        try await assetStore.importData(data, filename: filename)
    }

    func saveProject(_ draft: ProjectDraft) async throws {
        var updated = draft
        updated.updatedAt = .now
        if let index = projects.firstIndex(where: { $0.id == updated.id }) {
            projects[index] = updated
        } else {
            projects.append(updated)
        }
        projects.sort { $0.updatedAt > $1.updatedAt }
        try await projectStore.saveProjects(projects)
        notice = AppNotice(style: .success, message: "Project saved locally.")
    }

    func deleteProject(_ project: ProjectDraft) async throws {
        try await authorizer.authorize(reason: "Approve deleting this NovaForge project")
        projects.removeAll { $0.id == project.id }
        try await projectStore.saveProjects(projects)
        if !settings.keepOriginalReferences {
            let retainedPaths = Set(projects.flatMap(\.references).map(\.relativeFilePath))
            for reference in project.references where !retainedPaths.contains(reference.relativeFilePath) {
                try? await assetStore.delete(reference)
            }
        }
        notice = AppNotice(style: .success, message: "Project removed from this device.")
    }

    @discardableResult
    func submit(_ draft: ProjectDraft) async throws -> GenerationJob {
        let payload = try draft.validatedRequest()
        let client = try configuredClient()
        try await authorizer.authorize(
            reason: "Approve this exact NovaForge generation request"
        )

        isBusy = true
        defer { isBusy = false }
        let job = try await client.submit(payload)
        upsert(job)
        do {
            try await projectStore.saveJobs(jobs)
            try await saveProject(draft)
        } catch {
            notice = AppNotice(
                style: .neutral,
                message: "Request submitted, but local tracking could not be fully saved: \(error.localizedDescription)"
            )
            return job
        }
        notice = AppNotice(style: .success, message: "Approved request submitted.")
        return job
    }

    func refreshJobs() async throws {
        guard !jobs.isEmpty else { return }
        let client = try configuredClient()
        isBusy = true
        defer { isBusy = false }

        var refreshed: [GenerationJob] = []
        for job in jobs {
            if job.state.isTerminal {
                refreshed.append(job)
            } else {
                refreshed.append(try await client.job(id: job.jobId))
            }
        }
        jobs = refreshed.sorted { $0.updatedAt > $1.updatedAt }
        try await projectStore.saveJobs(jobs)
    }

    func decideCost(for job: GenerationJob, approved: Bool) async throws {
        let action = approved ? "approve the quoted generation cost" : "reject this generation cost"
        try await authorizer.authorize(reason: "Confirm you want to \(action)")
        let client = try configuredClient()
        isBusy = true
        defer { isBusy = false }
        let updated = try await client.decideCost(jobID: job.jobId, approved: approved)
        upsert(updated)
        do {
            try await projectStore.saveJobs(jobs)
        } catch {
            notice = AppNotice(
                style: .neutral,
                message: "Cost decision completed, but local tracking could not be saved."
            )
            return
        }
        notice = AppNotice(
            style: approved ? .success : .neutral,
            message: approved ? "Cost approved. Generation resumed." : "Cost rejected. Nothing was generated."
        )
    }

    func deleteLocalCache(assetID: String) async throws {
        try await authorizer.authorize(reason: "Approve deleting the local cached asset")
        let client = try configuredClient()
        _ = try await client.deleteLocalCache(assetID: assetID)
        notice = AppNotice(style: .success, message: "Local cache deleted. Remote copies were not changed.")
    }

    func saveConnection(endpointText: String, replacementToken: String) async throws {
        let cleanEndpoint = endpointText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanEndpoint.isEmpty {
            let endpoint = try ValidatedEndpoint(cleanEndpoint)
            let replacement = replacementToken.trimmingCharacters(in: .whitespacesAndNewlines)
            let existingToken = try keychain.readAPIToken()
            if !endpoint.isLocalDevelopment && replacement.isEmpty && existingToken == nil {
                throw APIClientError.missingRemoteToken
            }
        }
        try await authorizer.authorize(reason: "Approve changing NovaForge connection security")

        settings.endpointText = cleanEndpoint
        try settings.save()
        if !replacementToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            try keychain.saveAPIToken(replacementToken)
        }
        hasStoredToken = (try keychain.readAPIToken()) != nil
        notice = AppNotice(style: .success, message: "Connection settings saved securely.")
    }

    func disconnect() async throws {
        try await authorizer.authorize(reason: "Approve disconnecting NovaForge Core")
        try keychain.deleteAPIToken()
        settings.endpointText = ""
        try settings.save()
        hasStoredToken = false
        notice = AppNotice(style: .neutral, message: "NovaForge Core disconnected.")
    }

    func savePreferences() throws {
        try settings.save()
        notice = AppNotice(style: .success, message: "Preferences saved.")
    }

    private func configuredClient() throws -> ImageStudiosAPIClient {
        guard !settings.endpointText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw APIClientError.notConfigured
        }
        let endpoint = try ValidatedEndpoint(settings.endpointText)
        let token = try keychain.readAPIToken()
        if !endpoint.isLocalDevelopment && token == nil {
            throw APIClientError.missingRemoteToken
        }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.waitsForConnectivity = true
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        return ImageStudiosAPIClient(
            endpoint: endpoint,
            token: token,
            session: URLSession(configuration: configuration)
        )
    }

    private func upsert(_ job: GenerationJob) {
        if let index = jobs.firstIndex(where: { $0.id == job.id }) {
            jobs[index] = job
        } else {
            jobs.append(job)
        }
        jobs.sort { $0.updatedAt > $1.updatedAt }
    }
}

struct AppNotice: Identifiable, Equatable {
    enum Style: Equatable { case success, neutral, error }

    let id = UUID()
    let style: Style
    let message: String
}
