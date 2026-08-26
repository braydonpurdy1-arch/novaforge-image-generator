import SwiftUI

struct GlassCard<Content: View>: View {
    @Environment(ForgeTheme.self) private var theme
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(theme.cardPadding)
            .background(.ultraThinMaterial.opacity(0.72), in: RoundedRectangle(cornerRadius: theme.cornerRadius))
            .background(theme.glass, in: RoundedRectangle(cornerRadius: theme.cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: theme.cornerRadius)
                    .stroke(theme.glassBorder, lineWidth: 1)
            }
    }
}

struct SectionHeading: View {
    @Environment(ForgeTheme.self) private var theme
    let eyebrow: String
    let title: String
    let detail: String?

    init(_ title: String, eyebrow: String, detail: String? = nil) {
        self.eyebrow = eyebrow
        self.title = title
        self.detail = detail
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(eyebrow.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(1.8)
                .foregroundStyle(theme.electricBlue)
            Text(title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(theme.primaryText)
            if let detail {
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(theme.secondaryText)
            }
        }
    }
}

struct ForgeButtonStyle: ButtonStyle {
    @Environment(ForgeTheme.self) private var theme
    var destructive = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background {
                LinearGradient(
                    colors: destructive
                        ? [theme.ember, theme.plasmaViolet]
                        : [theme.electricBlue, theme.plasmaViolet],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .opacity(configuration.isPressed ? 0.72 : 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
    }
}

struct StatusPill: View {
    @Environment(ForgeTheme.self) private var theme
    let text: String
    var symbol: String?
    var color: Color?

    var body: some View {
        HStack(spacing: 6) {
            if let symbol { Image(systemName: symbol) }
            Text(text)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(color ?? theme.electricBlue)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background((color ?? theme.electricBlue).opacity(0.13), in: Capsule())
        .overlay { Capsule().stroke((color ?? theme.electricBlue).opacity(0.25)) }
    }
}

