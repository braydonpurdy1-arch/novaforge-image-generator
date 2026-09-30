import SwiftUI

struct NoticeOverlay: View {
    @Environment(ForgeTheme.self) private var theme
    let notice: AppNotice

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: symbol)
            Text(notice.message)
                .font(.subheadline.weight(.semibold))
            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(14)
        .background(color.opacity(0.92), in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: color.opacity(0.35), radius: 18, y: 8)
        .padding(.horizontal)
        .accessibilityElement(children: .combine)
    }

    private var color: Color {
        switch notice.style {
        case .success: theme.success.opacity(0.88)
        case .neutral: theme.elevated.opacity(0.96)
        case .error: theme.ember.opacity(0.9)
        }
    }

    private var symbol: String {
        switch notice.style {
        case .success: "checkmark.shield.fill"
        case .neutral: "info.circle.fill"
        case .error: "exclamationmark.triangle.fill"
        }
    }
}
