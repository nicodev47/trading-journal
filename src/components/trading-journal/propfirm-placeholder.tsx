import { Building2 } from 'lucide-react';

export function PropfirmPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-20 text-center">
      <Building2 className="size-8 text-muted-foreground" />
      <p className="font-sans text-base font-semibold">Simulatore Prop Firm in arrivo</p>
      <p className="max-w-md font-sans text-sm text-muted-foreground">
        Qui potrai simulare conti con le regole delle prop firm, seguire le fasi fino al funded e registrare i payout.
      </p>
    </div>
  );
}
