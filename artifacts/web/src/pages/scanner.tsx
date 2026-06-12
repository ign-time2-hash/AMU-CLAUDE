import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.js';

function extractLabId(value: string): number | null {
  const match = value.match(/\/lab\/(\d+)/);
  if (match?.[1]) return Number(match[1]);
  if (/^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

export function ScannerPage() {
  const [, setLocation] = useLocation();
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastReadRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    function clearContainer() {
      const container = document.getElementById('amu-fullscreen-qr');
      if (container) container.innerHTML = '';
    }

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;
        clearContainer();
        const scanner = new Html5Qrcode('amu-fullscreen-qr');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            if (decodedText === lastReadRef.current) return;
            lastReadRef.current = decodedText;

            const labId = extractLabId(decodedText);
            if (!labId) {
              toast.error('QR inválido. Use um código de laboratório.');
              lastReadRef.current = null;
              return;
            }

            void scanner.stop().catch(() => undefined);
            if (mounted) setLocation(`/lab/${labId}`);
          },
          () => undefined,
        );

        if (mounted) setIsReady(true);
      } catch {
        if (mounted) setErrorMessage('Não foi possível iniciar a câmera.');
      }
    }

    void startScanner();

    return () => {
      mounted = false;
      void scannerRef.current?.stop().catch(() => undefined);
      scannerRef.current = null;
      clearContainer();
    };
  }, [setLocation]);

  if (errorMessage) {
    return (
      <div className="fixed inset-0 z-30 bg-black flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 mx-4 text-center space-y-3">
          <p className="text-red-600 font-medium">{errorMessage}</p>
          <Button variant="outline" onClick={() => setLocation('/agenda')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 bg-black">
      <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between">
        <span className="bg-black/60 text-white rounded-xl px-3 py-2 text-sm font-medium">
          Scanner de laboratório
        </span>
        <Button variant="outline" size="sm" onClick={() => setLocation('/agenda')}>
          Fechar
        </Button>
      </div>

      <div id="amu-fullscreen-qr" className="h-full w-full" />

      {!isReady && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center">
          <span className="bg-black/60 text-white rounded-xl px-4 py-2 text-sm">
            Iniciando câmera...
          </span>
        </div>
      )}
    </div>
  );
}
