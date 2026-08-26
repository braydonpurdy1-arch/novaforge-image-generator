import Foundation

actor ProjectStore {
    private let projectsURL: URL
    private let jobsURL: URL

    init(baseDirectory: URL? = nil) {
        let root = baseDirectory ?? Self.applicationSupportDirectory()
        projectsURL = root.appending(path: "projects-v1.json")
        jobsURL = root.appending(path: "jobs-v1.json")
    }

    func loadProjects() -> [ProjectDraft] {
        load([ProjectDraft].self, from: projectsURL) ?? []
    }

    func saveProjects(_ projects: [ProjectDraft]) throws {
        try save(projects, to: projectsURL)
    }

    func loadJobs() -> [GenerationJob] {
        load([GenerationJob].self, from: jobsURL) ?? []
    }

    func saveJobs(_ jobs: [GenerationJob]) throws {
        try save(jobs, to: jobsURL)
    }

    private func load<Value: Decodable>(_ type: Value.Type, from url: URL) -> Value? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder.persistenceDecoder.decode(type, from: data)
    }

    private func save<Value: Encodable>(_ value: Value, to url: URL) throws {
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        let data = try JSONEncoder.persistenceEncoder.encode(value)
        try data.write(to: url, options: [.atomic, .completeFileProtection])
    }

    private static func applicationSupportDirectory() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return base.appending(path: "NovaForgeImageStudios", directoryHint: .isDirectory)
    }
}

actor ReferenceAssetStore {
    private let root: URL

    init(baseDirectory: URL? = nil) {
        let base = baseDirectory ?? FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first!
        root = base
            .appending(path: "NovaForgeImageStudios", directoryHint: .isDirectory)
            .appending(path: "References", directoryHint: .isDirectory)
    }

    func importData(_ data: Data, filename: String) throws -> ReferenceAssetDraft {
        guard !data.isEmpty else { throw ReferenceImportError.emptyData }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)

        let id = UUID()
        let safeExtension = URL(fileURLWithPath: filename).pathExtension.lowercased()
        let ext = safeExtension.isEmpty ? "img" : safeExtension
        let storedFilename = "\(id.uuidString.lowercased()).\(ext)"
        let url = root.appending(path: storedFilename)
        try data.write(to: url, options: [.atomic, .completeFileProtection])

        return ReferenceAssetDraft(
            id: id,
            displayName: filename,
            relativeFilePath: storedFilename,
            role: .scene,
            lockType: .composition,
            lockStrength: .hard,
            isLocked: true,
            byteCount: data.count
        )
    }

    nonisolated static func url(for asset: ReferenceAssetDraft) -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return base
            .appending(path: "NovaForgeImageStudios", directoryHint: .isDirectory)
            .appending(path: "References", directoryHint: .isDirectory)
            .appending(path: asset.relativeFilePath)
    }
}

enum ReferenceImportError: LocalizedError {
    case emptyData

    var errorDescription: String? { "The selected image did not contain readable data." }
}

private extension JSONEncoder {
    static var persistenceEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }
}

private extension JSONDecoder {
    static var persistenceDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
