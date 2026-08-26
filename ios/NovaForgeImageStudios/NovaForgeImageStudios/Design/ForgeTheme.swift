import Observation
import SwiftUI

@MainActor
@Observable
final class ForgeTheme {
    let background = Color(red: 0.018, green: 0.024, blue: 0.055)
    let elevated = Color(red: 0.035, green: 0.045, blue: 0.095)
    let glass = Color.white.opacity(0.075)
    let glassBorder = Color.white.opacity(0.14)
    let primaryText = Color.white
    let secondaryText = Color(red: 0.65, green: 0.72, blue: 0.86)
    let electricBlue = Color(red: 0.18, green: 0.68, blue: 1.0)
    let plasmaViolet = Color(red: 0.57, green: 0.27, blue: 1.0)
    let ember = Color(red: 1.0, green: 0.25, blue: 0.31)
    let success = Color(red: 0.21, green: 0.9, blue: 0.69)

    let cornerRadius: CGFloat = 22
    let cardPadding: CGFloat = 18
}

