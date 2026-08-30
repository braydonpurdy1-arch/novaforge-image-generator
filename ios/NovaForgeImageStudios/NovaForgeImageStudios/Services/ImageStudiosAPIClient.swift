import Foundation

protocol ImageStudiosAPI: Sendable {
    func submit(_ request: GenerationRequestPayload) async throws -> GenerationJob
    func job(id: String) async throws -> GenerationJob
    func decideCost(jobID: String, approved: Bool) async throws -> GenerationJob
    func deleteLocalCache(assetID: String) async throws -> CachedAssetResponse
}

final class ImageStudiosAPIClient: ImageStudiosAPI, @unchecked Sendable {
    private let endpoint: ValidatedEndpoint
    private let token: String?
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(endpoint: ValidatedEndpoint, token: String?, session: URLSession = .shared) {
        self.endpoint = endpoint
        self.token = token?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.session = session
        encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        decoder = JSONDecoder()
    }

    func submit(_ request: GenerationRequestPayload) async throws -> GenerationJob {
        try await send(path: "/v1/generations", method: "POST", body: request)
    }

    func job(id: String) async throws -> GenerationJob {
        try await send(path: "/v1/jobs/\(pathComponent(id))", method: "GET", body: Optional<EmptyBody>.none)
    }

    func decideCost(jobID: String, approved: Bool) async throws -> GenerationJob {
        try await send(
            path: "/v1/jobs/\(pathComponent(jobID))/approve-cost",
            method: "POST",
            body: ApprovalBody(approved: approved)
        )
    }

    func deleteLocalCache(assetID: String) async throws -> CachedAssetResponse {
        try await send(
            path: "/v1/assets/\(pathComponent(assetID))/cache",
            method: "DELETE",
            body: Optional<EmptyBody>.none
        )
    }

    private func send<Response: Decodable, Body: Encodable>(
        path: String,
        method: String,
        body: Body?
    ) async throws -> Response {
        var request = URLRequest(url: endpoint.url(path: path))
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try encoder.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIClientError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let code = (try? decoder.decode(ServerError.self, from: data).error) ?? "HTTP_\(http.statusCode)"
            throw APIClientError.server(status: http.statusCode, code: code)
        }

        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIClientError.invalidPayload
        }
    }

    private func pathComponent(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }
}

private struct ApprovalBody: Codable { let approved: Bool }
private struct EmptyBody: Codable {}
private struct ServerError: Codable { let error: String }

enum APIClientError: LocalizedError, Equatable {
    case notConfigured
    case missingRemoteToken
    case invalidResponse
    case invalidPayload
    case server(status: Int, code: String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: "Connect a NovaForge Core endpoint in Settings first."
        case .missingRemoteToken: "A remote NovaForge Core endpoint requires a Keychain bearer token."
        case .invalidResponse: "NovaForge Core returned an invalid response."
        case .invalidPayload: "NovaForge Core returned data this app could not read."
        case .server(_, let code): "NovaForge Core refused the request: \(code)."
        }
    }
}
