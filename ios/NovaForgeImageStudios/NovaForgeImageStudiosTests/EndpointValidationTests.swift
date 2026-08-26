import XCTest
@testable import NovaForgeImageStudios

final class EndpointValidationTests: XCTestCase {
    func testHTTPSRemoteEndpointIsAllowed() throws {
        let endpoint = try ValidatedEndpoint("https://core.novaforgestudios.com/")
        XCTAssertEqual(endpoint.baseURL.absoluteString, "https://core.novaforgestudios.com/")
    }

    func testHTTPIsAllowedOnlyForLocalhost() throws {
        XCTAssertNoThrow(try ValidatedEndpoint("http://127.0.0.1:8787"))
        XCTAssertThrowsError(try ValidatedEndpoint("http://192.168.1.20:8787")) { error in
            XCTAssertEqual(error as? EndpointValidationError, .insecureRemoteURL)
        }
    }

    func testPathConstructionPreservesBasePath() throws {
        let endpoint = try ValidatedEndpoint("https://example.com/core/")
        XCTAssertEqual(
            endpoint.url(path: "/v1/jobs/job_1").absoluteString,
            "https://example.com/core/v1/jobs/job_1"
        )
    }
}

