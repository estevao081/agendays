import { useRef } from 'react';
import { Camera } from 'lucide-react';

interface AvatarUploaderProps {
  avatarUrl: string;
  onChange: (dataUrl: string) => void;
}

/**
 * Upload mockado: converte a imagem escolhida em data URL só para preview
 * local nesta sessão. Nenhum arquivo é enviado a lugar nenhum — no futuro,
 * este handler pode ser trocado por um upload real para storage/API.
 */
export function AvatarUploader({ avatarUrl, onChange }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <img
          src={avatarUrl}
          alt="Foto de perfil"
          className="size-20 rounded-full border border-ink-100 object-cover bg-ink-100"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Alterar foto"
          className="absolute -bottom-2 -right-2 flex size-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow hover:bg-emerald-500"
        >
          <Camera className="size-4" />
        </button>
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-700 hover:underline"
        >
          Alterar foto
        </button>
        <p className="text-xs text-ink-400">PNG ou JPG, recomendado 1:1.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
