import XCTest
@testable import NovaForgeImageStudios

@MainActor
final class ApprovalGateTests: XCTestCase {
    func testDeniedOwnerAuthenticationLeavesProjectIntact() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: "novaforge-approval-tests-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }

        let projectStore = ProjectStore(baseDirectory: directory)
        let model = AppModel(
            projectStore: projectStore,
            assetStore: ReferenceAssetStore(baseDirectory: directory),
            authorizer: DenyingAuthorizer(),
            settings: .defaults
        )
        await model.bootstrap()
        var project = ProjectDraft.blank
        project.title = "Must survive"
        try await model.saveProject(project)

        do {
            try await model.deleteProject(project)
            XCTFail("Deletion must fail without owner approval")
        } catch {
            XCTAssertEqual(error as? ApprovalError, .denied)
        }

        XCTAssertEqual(model.projects.map(\.id), [project.id])
        let persistedProjects = await projectStore.loadProjects()
        XCTAssertEqual(persistedProjects.map(\.id), [project.id])
    }
}

private struct DenyingAuthorizer: ApprovalAuthorizing {
    func authorize(reason: String) async throws {
        throw ApprovalError.denied
    }
}
