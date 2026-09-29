import { MapPin, Phone, MessageCircle, AtSign } from 'lucide-react';

interface ProfilePreviewCardProps {
  avatarUrl: string;
  name: string;
  businessName: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram?: string;
}

export function ProfilePreviewCard({
  avatarUrl,
  name,
  businessName,
  description,
  address,
  phone,
  whatsapp,
  instagram,
}: ProfilePreviewCardProps) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-ink-100 bg-white shadow-sm shadow-ink-950/5">
      <div className="h-20 bg-gradient-to-br from-emerald-600 to-emerald-700" />
      <div className="px-5 pb-5">
        <img
          src={avatarUrl}
          alt={businessName || name}
          className="-mt-10 size-20 rounded-full border-4 border-white object-cover bg-ink-100"
        />
        <div className="mt-3 space-y-0.5">
          <p className="font-display text-lg font-semibold leading-tight text-ink-900">
            {businessName || 'Nome do estabelecimento'}
          </p>
          <p className="text-sm text-ink-500">{name || 'Seu nome'}</p>
        </div>

        {description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{description}</p>
        )}

        <div className="mt-4 space-y-2 border-t border-ink-100 pt-3 text-sm text-ink-500">
          {address && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-ink-400" />
              <span className="truncate">{address}</span>
            </p>
          )}
          {phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-ink-400" />
              {phone}
            </p>
          )}
          {whatsapp && (
            <p className="flex items-center gap-2">
              <MessageCircle className="size-4 shrink-0 text-emerald-600" />
              WhatsApp disponível
            </p>
          )}
          {instagram && (
            <p className="flex items-center gap-2">
              <AtSign className="size-4 shrink-0 text-ink-400" />
              {instagram}
            </p>
          )}
        </div>

        <div className="mt-4 rounded-[var(--radius-chip)] bg-amber-500 py-2.5 text-center text-sm font-semibold text-ink-950">
          Agendar horário
        </div>
      </div>
    </div>
  );
}
