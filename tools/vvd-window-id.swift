// Prints the CGWindowID of the Vega Virtual Device window (empty if not running).
import CoreGraphics
let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] ?? []
for w in list where (w[kCGWindowName as String] as? String) == "Vega Virtual Device" {
  if let b = w[kCGWindowBounds as String] as? [String: Any], (b["Width"] as? Double ?? 0) > 200 {
    print(w[kCGWindowNumber as String]!)
    break
  }
}
