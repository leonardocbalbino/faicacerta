import type { TechniquePage, TechniqueRef } from '@faixa-certa/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMessages } from '@/i18n';
import { api, unwrap } from '@/lib/api';

/** Busca e escolhe uma técnica (para requisitos de faixa e relacionadas). */
export function TechniquePicker({
  exclude = [],
  onPick,
  label,
}: {
  exclude?: string[];
  onPick: (technique: TechniqueRef) => void;
  label?: string;
}) {
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const results = useQuery({
    queryKey: ['techniques', 'picker', query],
    queryFn: async () =>
      unwrap<TechniquePage>(
        await api.GET('/v1/admin/techniques', {
          params: { query: { q: query || undefined, limit: 20 } },
        }),
      ),
    enabled: open,
  });
  const items = (results.data?.items ?? []).filter((t) => !exclude.includes(t.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <Plus aria-hidden /> {label ?? m.programs.addTechnique}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder={m.techniques.searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{results.isLoading ? m.common.loading : m.common.noResults}</CommandEmpty>
            <CommandGroup>
              {items.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.id}
                  onSelect={() => {
                    onPick(t);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.japaneseName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.translation}
                    </span>
                  </span>
                  <StatusBadge status={t.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
