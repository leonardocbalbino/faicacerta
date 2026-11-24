import type { RichText } from '@faixa-certa/shared';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { cn } from '@/lib/utils';

const EMPTY: RichText = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Editor de texto rico (Tiptap). O valor é o JSON do documento. */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  id,
  'aria-labelledby': labelledBy,
}: {
  value: RichText | null | undefined;
  onChange: (doc: RichText) => void;
  placeholder?: string;
  id?: string;
  'aria-labelledby'?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: (value ?? EMPTY) as JSONContent,
    editorProps: {
      attributes: {
        class: 'rich-text min-h-48 px-3 py-2',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichText),
  });

  // Atualiza quando o valor muda de fora (ex.: restaurar versão).
  useEffect(() => {
    if (!editor || !value) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value as JSONContent, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="rounded-md border bg-card focus-within:ring-2 focus-within:ring-ring/50">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const m = useMessages();
  const items: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    run: () => void;
    disabled?: boolean;
  }[] = [
    {
      icon: Bold,
      label: m.editor.bold,
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: m.editor.italic,
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: Heading2,
      label: m.editor.heading,
      active: editor.isActive('heading', { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: List,
      label: m.editor.bulletList,
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: m.editor.orderedList,
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: Quote,
      label: m.editor.quote,
      active: editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: Undo2,
      label: m.editor.undo,
      run: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
    },
    {
      icon: Redo2,
      label: m.editor.redo,
      run: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().redo(),
    },
  ];
  return (
    <div className="flex flex-wrap gap-0.5 border-b p-1" role="toolbar">
      {items.map(({ icon: Icon, label, active, run, disabled }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8', active && 'bg-accent text-accent-foreground')}
          aria-label={label}
          aria-pressed={active}
          title={label}
          onClick={run}
          disabled={disabled}
        >
          <Icon aria-hidden />
        </Button>
      ))}
    </div>
  );
}
