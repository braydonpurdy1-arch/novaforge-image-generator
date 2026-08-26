import XCTest
@testable import NovaForgeImageStudios

final class LocalStoreTests: XCTestCase {
    func testProjectsRoundTripDatesAndLocks() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: "novaforge-tests-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = ProjectStore(baseDirectory: directory)
        var project = ProjectDraft.blank
        project.createdAt = Date(timeIntervalSince1970: 1_700_000_000)
        project.updatedAt = Date(timeIntervalSince1970: 1_700_000_000)
        project.title = "Locked master"
        project.prompt = "Preserve everything"
        project.references = [ReferenceAssetDraft(
            displayName: "master.jpg",
            relativeFilePath: "master.jpg",
            role: .identity,
            lockType: .identity,
            lockStrength: .hard,
            isLocked: true,
            byteCount: 99
        )]

        try await store.saveProjects([project])
        let restored = await store.loadProjects()

        XCTAssertEqual(restored, [project])
        XCTAssertEqual(restored.first?.references.first?.lockStrength, .hard)
    }

    func testSettingsNeverPersistTokenField() throws {
        let suiteName = "novaforge.settings.tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let settings = AppSettings(
            endpointText: "https://core.example.com",
            defaultPrivacyMode: .remoteRedacted,
            keepOriginalReferences: true
        )

        try settings.save(defaults: defaults)
        let serialized = String(data: try XCTUnwrap(defaults.data(forKey: "novaforge.settings.v1")), encoding: .utf8)!

        XCTAssertFalse(serialized.lowercased().contains("token"))
        XCTAssertEqual(AppSettings.load(defaults: defaults), settings)
    }

    func testReferenceStoreDeletesOnlyTheExplicitAsset() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: "novaforge-reference-tests-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = ReferenceAssetStore(baseDirectory: directory)
        let first = try await store.importData(Data([1, 2, 3]), filename: "first.jpg")
        let second = try await store.importData(Data([4, 5, 6]), filename: "second.jpg")

        try await store.delete(first)

        let referenceRoot = directory
            .appending(path: "NovaForgeImageStudios", directoryHint: .isDirectory)
            .appending(path: "References", directoryHint: .isDirectory)
        XCTAssertFalse(FileManager.default.fileExists(atPath: referenceRoot.appending(path: first.relativeFilePath).path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: referenceRoot.appending(path: second.relativeFilePath).path))
    }
}
