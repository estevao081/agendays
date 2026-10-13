import { useMemo } from 'react';
import { create } from 'qrcode';

interface QrCodeProps {
  /** Conteúdo codificado (normalmente uma URL). */
  value: string;
  /** Descrição acessível do que o QR Code abre. */
  label: string;
  /** Tamanho em px (o SVG escala; o padrão é bom para impressão em A4). */
  size?: number;
  className?: string;
}

/** Zona de silêncio (em módulos) exigida pela especificação para leitura confiável. */
const QUIET_ZONE = 4;

/**
 * QR Code em SVG, gerado de forma síncrona a partir da matriz de módulos.
 * Sempre preto sobre branco (independe do tema) para garantir contraste na leitura/impressão.
 */
export function QrCode({ value, label, size = 176, className = '' }: QrCodeProps) {
  const { path, total } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    const count = modules.size;
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (modules.get(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { path: d, total: count + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
