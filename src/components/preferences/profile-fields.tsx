import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getShareIdentity } from '@/components/trading-journal/share-card-parts';
import { MAX_NAME_LENGTH } from '@/lib/preferences';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PHOTO_SIZE = 256;

const resizeToSquare = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('decode'));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const canvas = document.createElement('canvas');

        canvas.width = PHOTO_SIZE;
        canvas.height = PHOTO_SIZE;

        const context = canvas.getContext('2d');

        if (!context) return reject(new Error('canvas'));

        context.drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          PHOTO_SIZE,
          PHOTO_SIZE
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export function ProfileAvatar({
  name,
  photo,
  className = 'size-20 text-2xl',
  fallbackInitials = 'EJ',
}: {
  name: string;
  photo: string | null;
  className?: string;
  fallbackInitials?: string;
}) {
  const initials = getShareIdentity(name)?.initials ?? fallbackInitials;

  return photo ? (
    <img
      src={photo}
      alt=""
      className={`${className} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-white`}
    >
      {initials}
    </div>
  );
}

interface ProfileFieldsProps {
  name: string;
  photo: string | null;
  onChange: (patch: { name?: string; photo?: string | null }) => void;
  autoFocus?: boolean;
  fallbackInitials?: string;
}

export function ProfileFields({ name, photo, onChange, autoFocus, fallbackInitials }: ProfileFieldsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Scegli un file immagine.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('L\'immagine supera 5 MB.');
      return;
    }

    try {
      onChange({ photo: await resizeToSquare(file) });
      setError('');
    } catch {
      setError('Non riesco a leggere questa immagine.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <ProfileAvatar name={name} photo={photo} fallbackInitials={fallbackInitials} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInput.current?.click()}
          >
            <Camera className="size-4" />
            {photo ? 'Cambia foto' : 'Carica foto'}
          </Button>
          {photo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => onChange({ photo: null })}
            >
              <X className="size-4" />
              Rimuovi
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>
      {error && <p className="-mt-3 text-xs font-medium text-loss">{error}</p>}

      <div className="grid gap-2">
        <Label htmlFor="profile-name">Nome</Label>
        <Input
          id="profile-name"
          autoFocus={autoFocus}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Es. Mario Rossi oppure il tuo username"
          value={name}
          onChange={event => onChange({ name: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Con nome e cognome mostriamo le iniziali; con una sola parola la usiamo come username.
        </p>
      </div>
    </div>
  );
}
