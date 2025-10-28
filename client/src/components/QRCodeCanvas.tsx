import { useEffect, useRef } from "react";
import { createQrMatrix } from "@/lib/qr";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
}

export default function QRCodeCanvas({ value, size = 220 }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!value) {
      return;
    }

    try {
      const matrix = createQrMatrix(value);
      const moduleCount = matrix.length;
      const pixelsPerModule = Math.floor(size / moduleCount);
      const quietZone = pixelsPerModule * 2;
      const canvasSize = moduleCount * pixelsPerModule + quietZone * 2;

      canvas.width = canvasSize;
      canvas.height = canvasSize;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvasSize, canvasSize);
      context.fillStyle = "#0f172a";

      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (!matrix[r]![c]) continue;
          const x = quietZone + c * pixelsPerModule;
          const y = quietZone + r * pixelsPerModule;
          context.fillRect(x, y, pixelsPerModule, pixelsPerModule);
        }
      }
    } catch (error) {
      console.error("Failed to render QR code", error);
    }
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
