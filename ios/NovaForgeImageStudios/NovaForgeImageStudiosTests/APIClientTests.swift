import Foundation
import XCTest
@testable import NovaForgeImageStudios

final class APIClientTests: XCTestCase {
    override func tearDown() {
        StubURLProtocol.handler = nil
        super.tearDown()
    }

    func testSubmitUsesBearerHeaderAndDecodesOpaqueJob() async throws {
        let response = """
        {
          "jobId":"job_123",
          "requestId":"request_123",
          "state":"QUEUED",
          "createdAt":"2026-08-27T00:00:00.000Z",
          "updatedAt":"2026-08-27T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        StubURLProtocol.handler = { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer top-secret")
            XCTAssertEqual(request.httpMethod, "POST")
            let body = try XCTUnwrap(request.httpBody.flatMap { String(data: $0, encoding: .utf8) })
            XCTAssertFalse(body.contains("/Users/"))
            XCTAssertTrue(body.contains("novaforge-asset"))
            return (HTTPURLResponse(
                url: request.url!,
                statusCode: 202,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!, response)
        }

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        let client = ImageStudiosAPIClient(
            endpoint: try ValidatedEndpoint("https://core.example.com"),
            token: "top-secret",
            session: URLSession(configuration: configuration)
        )
        let request = GenerationRequestPayload(
            requestId: "request_123",
            intent: "test",
            operation: .edit,
            prompt: "Refine only",
            sourceAssets: [SourceAssetPayload(
                id: "asset_1",
                uri: "novaforge-asset://asset_1",
                roles: [.scene],
                hash: nil
            )],
            explicitLocks: [],
            requestedChanges: [],
            privacyMode: .remoteRedacted,
            outputRequirements: OutputRequirementsPayload(
                aspectRatio: nil,
                width: nil,
                height: nil,
                qualityTier: .master,
                requiresTextAccuracy: false,
                requiresVideo: false,
                budgetCredits: nil
            ),
            preferredProvider: nil,
            preferredModel: nil,
            providerRequired: nil,
            taskClass: .general
        )

        let job = try await client.submit(request)
        XCTAssertEqual(job.jobId, "job_123")
        XCTAssertEqual(job.state, .queued)
    }

    func testServerErrorDoesNotExposeResponseBody() async throws {
        StubURLProtocol.handler = { request in
            let data = #"{"error":"MODEL_UNAVAILABLE:required-model","secret":"must-not-leak"}"#.data(using: .utf8)!
            return (HTTPURLResponse(url: request.url!, statusCode: 409, httpVersion: nil, headerFields: nil)!, data)
        }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        let client = ImageStudiosAPIClient(
            endpoint: try ValidatedEndpoint("https://core.example.com"),
            token: nil,
            session: URLSession(configuration: configuration)
        )

        do {
            _ = try await client.job(id: "job_1")
            XCTFail("Expected a server error")
        } catch let error as APIClientError {
            XCTAssertEqual(error, .server(status: 409, code: "MODEL_UNAVAILABLE:required-model"))
            XCTAssertFalse(error.localizedDescription.contains("must-not-leak"))
        }
    }
}

private final class StubURLProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.handler else {
            client?.urlProtocol(self, didFailWithError: APIClientError.invalidResponse)
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

