import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrCodeMatrixProps {
  value: string;
  size?: number;
}

export const QrCodeMatrix: React.FC<QrCodeMatrixProps> = ({
  value,
  size = 176,
}) => {
  const { dim, data } = useMemo(() => {
    try {
      const qr = QRCode.create(value || 'RTRW', {
        errorCorrectionLevel: 'M',
      });
      return {
        dim: qr.modules.size,
        data: qr.modules.data,
      };
    } catch {
      return { dim: 21, data: new Uint8Array(21 * 21) };
    }
  }, [value]);

  const quietZone = 2;
  const totalModules = dim + quietZone * 2;
  const cell = size / totalModules;

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (data[r * dim + c]) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={(c + quietZone) * cell}
            y={(r + quietZone) * cell}
            width={cell + 0.08}
            height={cell + 0.08}
            fill="#16202C"
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Kode QR untuk ${value}`}
      className="block rounded-lg"
    >
      <rect width={size} height={size} fill="#FFFFFF" rx={8} />
      {rects}
    </svg>
  );
};
