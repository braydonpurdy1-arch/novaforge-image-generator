import Foundation
import LocalAuthentication

protocol ApprovalAuthorizing: Sendable {
    func authorize(reason: String) async throws
}

struct DeviceOwnerAuthorizer: ApprovalAuthorizing {
    func authorize(reason: String) async throws {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            throw ApprovalError.unavailable(error?.localizedDescription)
        }

        do {
            let approved = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
            guard approved else { throw ApprovalError.denied }
        } catch let error as LAError {
            if error.code == .userCancel || error.code == .appCancel || error.code == .systemCancel {
                throw ApprovalError.cancelled
            }
            throw ApprovalError.denied
        }
    }
}

enum ApprovalError: LocalizedError, Equatable {
    case unavailable(String?)
    case cancelled
    case denied

    var errorDescription: String? {
        switch self {
        case .unavailable(let message): message ?? "Device-owner authentication is unavailable."
        case .cancelled: "Owner approval was cancelled. Nothing was executed."
        case .denied: "Owner approval failed. Nothing was executed."
        }
    }
}
