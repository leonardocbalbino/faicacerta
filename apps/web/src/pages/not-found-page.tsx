import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';

export function NotFoundPage() {
  const m = useMessages();
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">{m.common.noResults}</h1>
      <Button asChild variant="outline">
        <Link to="/">{m.common.back}</Link>
      </Button>
    </div>
  );
}
