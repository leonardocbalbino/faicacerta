import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n';

/** Lista simples de frases (pontos-chave, erros comuns). */
export function StringListEditor({
  value,
  onChange,
  id,
  max = 20,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  max?: number;
}) {
  const m = useMessages();
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text || value.length >= max) return;
    onChange([...value, text]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((item, i) => (
            <li
              key={`${i}-${item}`}
              className="flex items-start gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"
            >
              <span className="flex-1">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`${m.common.remove}: ${item}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={m.techniques.itemPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          maxLength={300}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim() || value.length >= max}
        >
          <Plus aria-hidden /> {m.techniques.addItem}
        </Button>
      </div>
    </div>
  );
}
