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

    func delete(_ asset: ReferenceAssetDraft) throws {
        let url = try Self.validatedURL(root: root, relativePath: asset.relativeFilePath)
        guard FileManager.default.fileExists(atPath: url.path) else { return }
        try FileManager.default.removeItem(at: url)
    }

    static func url(for asset: ReferenceAssetDraft) -> URL? {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let root = base
            .appending(path: "NovaForgeImageStudios", directoryHint: .isDirectory)
            .appending(path: "References", directoryHint: .isDirectory)
        return try? validatedURL(root: root, relativePath: asset.relativeFilePath)
    }

    private static func validatedURL(root: URL, relativePath: String) throws -> URL {
        guard !relativePath.isEmpty,
              relativePath == URL(fileURLWithPath: relativePath).lastPathComponent,
              !relativePath.contains("/"),
              !relativePath.contains("\\") else {
            throw ReferenceImportError.invalidStoredPath
        }
        return root.appending(path: relativePath)
    }
}

enum ReferenceImportError: LocalizedError {
    case emptyData
    case invalidStoredPath

    var errorDescription: String? {
        switch self {
        case .emptyData: "The selected image did not contain readable data."
        case .invalidStoredPath: "The stored reference path was invalid and was blocked."
        }
    }
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
