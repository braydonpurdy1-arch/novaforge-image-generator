import Foundation

struct AppSettings: Codable, Equatable, Sendable {
    var endpointText: String
    var defaultPrivacyMode: PrivacyMode
    var keepOriginalReferences: Bool

    static let defaults = AppSettings(
        endpointText: "",
        defaultPrivacyMode: .localOnly,
        keepOriginalReferences: true
    )

    static func load(defaults: UserDefaults = .standard) -> AppSettings {
        guard let data = defaults.data(forKey: storageKey),
              let settings = try? JSONDecoder().decode(AppSettings.self, from: data) else {
            return .defaults
        }
        return settings
    }

    func save(defaults: UserDefaults = .standard) throws {
        let data = try JSONEncoder().encode(self)
        defaults.set(data, forKey: Self.storageKey)
    }

    private static let storageKey = "novaforge.settings.v1"
}

struct ValidatedEndpoint: Equatable, Sendable {
    let baseURL: URL
    let isLocalDevelopment: Bool

    init(_ rawValue: String) throws {
        let clean = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty,
              var components = URLComponents(string: clean),
              let scheme = components.scheme?.lowercased(),
              let host = components.host?.lowercased() else {
            throw EndpointValidationError.invalidURL
        }
        guard components.user == nil, components.password == nil else {
            throw EndpointValidationError.embeddedCredentials
        }

        let localhostHosts = ["localhost", "127.0.0.1", "::1"]
        let isLocal = localhostHosts.contains(host)
        guard scheme == "https" || (scheme == "http" && isLocal) else {
            throw EndpointValidationError.insecureRemoteURL
        }

        var path = components.path
        while path.count > 1 && path.hasSuffix("/") { path.removeLast() }
        components.path = path
        components.query = nil
        components.fragment = nil
        guard let url = components.url else { throw EndpointValidationError.invalidURL }
        baseURL = url
        isLocalDevelopment = isLocal
    }

    func url(path: String) -> URL {
        let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return baseURL.appending(path: cleanPath)
    }
}

enum EndpointValidationError: LocalizedError, Equatable {
    case invalidURL
    case insecureRemoteURL
    case embeddedCredentials

    var errorDescription: String? {
        switch self {
        case .invalidURL: "Enter a complete NovaForge Core URL."
        case .insecureRemoteURL: "Use HTTPS. Plain HTTP is allowed only for localhost development."
        case .embeddedCredentials: "Do not put credentials in the URL. Store the bearer token in Keychain."
        }
    }
}
