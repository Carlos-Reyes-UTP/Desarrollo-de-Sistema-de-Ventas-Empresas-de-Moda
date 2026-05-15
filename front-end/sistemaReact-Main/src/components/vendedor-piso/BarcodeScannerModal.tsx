import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const REGION_ID = "vendedor-html5qrcode-region";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDecoded: (text: string) => void;
}

export const BarcodeScannerModal = ({
  open,
  onClose,
  onDecoded,
}: BarcodeScannerModalProps) => {
  const onDecodedRef = useRef(onDecoded);
  const onCloseRef = useRef(onClose);
  onDecodedRef.current = onDecoded;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);

    let active = true;
    const scannerRef: { current: import("html5-qrcode").Html5Qrcode | null } = {
      current: null,
    };

    const run = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active) {
          return;
        }
        const html5 = new Html5Qrcode(REGION_ID, false);
        if (!active) {
          return;
        }
        scannerRef.current = html5;
        const w = Math.min(
          280,
          typeof window !== "undefined" ? window.innerWidth - 48 : 260
        );
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: w, height: 160 } },
          (decoded) => {
            const text = decoded.trim();
            if (!text || !active) return;
            active = false;
            onDecodedRef.current(text);
            void html5
              .stop()
              .then(() => html5.clear())
              .catch(() => {});
            onCloseRef.current();
          },
          () => {}
        );
      } catch {
        if (active) {
          onCloseRef.current();
        }
      }
    };

    void run();

    return () => {
      window.removeEventListener("keydown", onKey);
      active = false;
      const h = scannerRef.current;
      scannerRef.current = null;
      if (h) {
        void h.stop().then(() => h.clear()).catch(() => {});
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center animate-fadeIn"
      role="presentation"
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/95 p-5 shadow-xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendedor-scan-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="vendedor-scan-titulo" className="text-sm font-bold uppercase tracking-widest text-gray-900">
            Escanear código
          </h2>
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-xl p-2 text-gray-500 transition-all hover:bg-gray-100 hover:text-black"
            aria-label="Cerrar escáner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div
          id={REGION_ID}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-black/[0.02]"
        />
        <p className="mt-3 text-center text-xs text-gray-500">
          Apunta al código de barras o QR del producto.
        </p>
      </div>
    </div>
  );
};
