import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        guard let scrollView = webView?.scrollView else { return }
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        // Cosmohype dark background (#090714) — prevents flash on bounce overscroll
        scrollView.backgroundColor = UIColor(red: 0.035, green: 0.027, blue: 0.078, alpha: 1.0)
    }
}
