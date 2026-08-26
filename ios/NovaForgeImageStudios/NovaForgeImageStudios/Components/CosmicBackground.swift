import SwiftUI

struct CosmicBackground: View {
    @Environment(ForgeTheme.self) private var theme

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                theme.background

                Circle()
                    .fill(theme.plasmaViolet.opacity(0.26))
                    .frame(width: proxy.size.width * 0.95)
                    .blur(radius: 95)
                    .offset(x: proxy.size.width * 0.38, y: -proxy.size.height * 0.35)

                Circle()
                    .fill(theme.electricBlue.opacity(0.2))
                    .frame(width: proxy.size.width * 0.82)
                    .blur(radius: 105)
                    .offset(x: -proxy.size.width * 0.42, y: proxy.size.height * 0.25)

                ForEach(0..<54, id: \.self) { index in
                    let point = starPoint(index: index, size: proxy.size)
                    Circle()
                        .fill(Color.white.opacity(index.isMultiple(of: 5) ? 0.78 : 0.34))
                        .frame(width: index.isMultiple(of: 7) ? 2.2 : 1.1)
                        .position(point)
                }
            }
            .ignoresSafeArea()
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func starPoint(index: Int, size: CGSize) -> CGPoint {
        let xSeed = (index * 73 + 19) % 997
        let ySeed = (index * 47 + 31) % 991
        return CGPoint(
            x: CGFloat(xSeed) / 997 * size.width,
            y: CGFloat(ySeed) / 991 * size.height
        )
    }
}

