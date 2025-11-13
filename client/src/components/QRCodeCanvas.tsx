import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
}

export default function QRCodeCanvas({ value, size = 220 }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    QRCode.toCanvas(
      canvas,
      value,
      {
        width: size,
        margin: 4,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      },
      (error) => {
        if (error) {
          console.error("Failed to render QR code", error);
        }
      }
    );
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
