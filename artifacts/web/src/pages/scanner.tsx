import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function ScannerPage() {
  const [, setLocation] = useLocation();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
    scannerRef.current = scanner;
    scanner.render(
      (decodedText) => {
        const match = decodedText.match(/\/lab\/(\d+)/);
        if (match?.[1]) {
          scanner.clear().catch(() => {});
          setLocation(`/lab/${match[1]}`);
        }
      },
      (err) => {
        console.debug('QR scan error:', err);
      },
    );
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [setLocation]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scanner QR</h1>
      <div id="qr-reader" className="w-full max-w-sm mx-auto" />
      <p className="text-center text-sm text-gray-400 mt-4">Aponte a câmera para o QR Code do laboratório</p>
    </div>
  );
}
