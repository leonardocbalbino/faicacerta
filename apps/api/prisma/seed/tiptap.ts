/** Monta um documento Tiptap (ProseMirror JSON) simples a partir de parágrafos e listas. */
type Block = string | { heading: string } | { list: string[] };

export function doc(...blocks: Block[]) {
  return {
    type: 'doc',
    content: blocks.map((b) => {
      if (typeof b === 'string') {
        return { type: 'paragraph', content: [{ type: 'text', text: b }] };
      }
      if ('heading' in b) {
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: b.heading }],
        };
      }
      return {
        type: 'bulletList',
        content: b.list.map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
        })),
      };
    }),
  };
}
