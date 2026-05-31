import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        guard let wv = webView else { return }
        let scrollView = wv.scrollView

        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.delaysContentTouches = false

        // Dark theme default — updated dynamically when web posts its --bg value
        scrollView.backgroundColor = UIColor(hex: "#090714")

        // Inject JS: read --bg from CSS custom property and notify native on
        // initial load and every time the <html> class attribute changes (theme switch)
        let js = """
        (function() {
          function sendBg() {
            try {
              var bg = getComputedStyle(document.documentElement)
                         .getPropertyValue('--bg').trim();
              window.webkit.messageHandlers.cosmoBg.postMessage(bg || '#090714');
            } catch(e) {}
          }
          new MutationObserver(sendBg).observe(
            document.documentElement,
            { attributes: true, attributeFilter: ['class'] }
          );
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', sendBg);
          } else {
            sendBg();
          }
        })();
        """
        let script = WKUserScript(
            source: js,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        let controller = wv.configuration.userContentController
        controller.addUserScript(script)

        // Weakly-held handler to avoid WKUserContentController retain cycle
        let handler = BgMessageHandler { [weak scrollView] hex in
            scrollView?.backgroundColor = UIColor(hex: hex)
        }
        controller.add(handler, name: "cosmoBg")
    }
}

// MARK: - WKScriptMessageHandler (weak proxy)

private final class BgMessageHandler: NSObject, WKScriptMessageHandler {
    private let onMessage: (String) -> Void
    init(_ handler: @escaping (String) -> Void) { self.onMessage = handler }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let hex = message.body as? String else { return }
        DispatchQueue.main.async { self.onMessage(hex) }
    }
}

// MARK: - UIColor hex initializer

extension UIColor {
    convenience init(hex: String) {
        let h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
                   .replacingOccurrences(of: "#", with: "")
        if h.count == 6, let v = UInt64(h, radix: 16) {
            self.init(
                red:   CGFloat((v >> 16) & 0xFF) / 255,
                green: CGFloat((v >>  8) & 0xFF) / 255,
                blue:  CGFloat( v        & 0xFF) / 255,
                alpha: 1
            )
        } else {
            // Fallback: Cosmohype dark bg
            self.init(red: 0.035, green: 0.027, blue: 0.078, alpha: 1)
        }
    }
}
