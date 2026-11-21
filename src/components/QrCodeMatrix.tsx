import React, { useMemo } from 'react';

interface QrCodeMatrixProps {
  value: string;
  size?: number;
}

export const QrCodeMatrix: React.FC<QrCodeMatrixProps> = ({
  value,
  size = 176,
}) => {
  // Deterministic 21x21 QR-style matrix with 3 finder patterns
  const matrix = useMemo(() => {
    const dim = 21;
    const grid: boolean[][] = Array.from({ length: dim }, () =>
      Array(dim).fill(false)
    );

    const drawFinder = (startR: number, startC: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[startR + r][startC + c] = isBorder || isCenter;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, dim - 7);
    drawFinder(dim - 7, 0);

    // Timing patterns
    for (let i = 8; i < dim - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Seed hash from value
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= dim - 8;
        const inBottomLeft = r >= dim - 8 && c < 8;
        const isTiming = r === 6 || c === 6;
        if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

        hash ^= r * 31 + c * 17;
        hash = Math.imul(hash, 16777619);
        grid[r][c] = (Math.abs(hash) % 10) > 4;
      }
    }
    return grid;
  }, [value]);

  const dim = matrix.length;
  const cell = size / dim;

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
      {matrix.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell + 0.35}
              y={r * cell + 0.35}
              width={Math.max(cell - 0.7, 1)}
              height={Math.max(cell - 0.7, 1)}
              rx={1}
              fill="#16202C"
            />
          ) : null
        )
      )}
    </svg>
  );
};
