import Foundation
import Security

struct KeychainStore: Sendable {
    private let service = "com.novaforgestudios.imagestudios"

    func saveAPICredential(token: String, endpointScope: String) throws {
        let clean = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else {
            try deleteAPICredential()
            return
        }

        let data = try JSONEncoder().encode(StoredAPICredential(
            token: clean,
            endpointScope: endpointScope
        ))
        let baseQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "novaforge-api-credential-v1"
        ]
        SecItemDelete(baseQuery as CFDictionary)

        var insertQuery = baseQuery
        insertQuery[kSecValueData as String] = data
        insertQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(insertQuery as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.unhandled(status) }
    }

    func readAPICredential() throws -> StoredAPICredential? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "novaforge-api-credential-v1",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess,
              let data = result as? Data else {
            throw KeychainError.unhandled(status)
        }
        do {
            return try JSONDecoder().decode(StoredAPICredential.self, from: data)
        } catch {
            throw KeychainError.invalidCredential
        }
    }

    func deleteAPICredential() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "novaforge-api-credential-v1"
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandled(status)
        }
    }
}

struct StoredAPICredential: Codable, Equatable, Sendable {
    let token: String
    let endpointScope: String
}

enum KeychainError: LocalizedError {
    case unhandled(OSStatus)
    case invalidCredential

    var errorDescription: String? {
        switch self {
        case .unhandled(let status): "Secure storage failed (\(status))."
        case .invalidCredential: "The stored NovaForge credential was invalid and was blocked."
        }
    }
}
