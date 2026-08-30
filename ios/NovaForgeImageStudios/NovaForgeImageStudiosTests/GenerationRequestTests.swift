import XCTest
@testable import NovaForgeImageStudios

final class GenerationRequestTests: XCTestCase {
    func testLockedReferenceCompilesToOpaqueSourceAndHardLock() throws {
        let reference = ReferenceAssetDraft(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
            displayName: "face.jpg",
            relativeFilePath: "private/device/path.jpg",
            role: .face,
            lockType: .face,
            lockStrength: .hard,
            isLocked: true,
            byteCount: 42
        )
        var draft = ProjectDraft.blank
        draft.prompt = "Refine skin texture only"
        draft.requestedTransformation = "Natural skin detail"
        draft.references = [reference]

        let request = try draft.validatedRequest()

        XCTAssertEqual(request.sourceAssets.first?.uri, "novaforge-asset://11111111-1111-1111-1111-111111111111")
        XCTAssertFalse(request.sourceAssets.first!.uri.contains("private/device"))
        XCTAssertEqual(request.explicitLocks.first?.type, .face)
        XCTAssertEqual(request.explicitLocks.first?.strength, .hard)
        XCTAssertTrue(request.prompt.contains("MUST NOT CHANGE"))
        XCTAssertTrue(request.prompt.contains("identity drift"))
    }

    func testEditFailsWithoutReference() {
        var draft = ProjectDraft.blank
        draft.prompt = "Edit this image"

        XCTAssertThrowsError(try draft.validatedRequest()) { error in
            XCTAssertEqual(error as? DraftValidationError, .missingReference)
        }
    }

    func testLocalOnlyCannotRequireRemoteProvider() {
        var draft = ProjectDraft.blank
        draft.operation = .generate
        draft.prompt = "Create a nebula"
        draft.privacyMode = .localOnly
        draft.provider = .seedream

        XCTAssertThrowsError(try draft.validatedRequest()) { error in
            XCTAssertEqual(error as? DraftValidationError, .remoteProviderBlocked)
        }
    }

    func testPresetAppliesOperationAndTaskClass() throws {
        var draft = ProjectDraft.blank
        draft.apply(.stillToVideo)
        draft.prompt = "Animate the stars subtly"
        draft.references = [ReferenceAssetDraft(
            displayName: "scene.png",
            relativeFilePath: "scene.png",
            byteCount: 1
        )]
        draft.privacyMode = .remoteRedacted

        let request = try draft.validatedRequest()
        XCTAssertEqual(request.operation, .imageToVideo)
        XCTAssertEqual(request.taskClass, .cinematicVideo)
        XCTAssertTrue(request.outputRequirements.requiresVideo)
    }
}
