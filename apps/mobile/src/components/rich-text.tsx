import type { RichText as RichTextDoc } from '@faixa-certa/shared';
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { Text } from './ui';

/** Nó do documento Tiptap (ProseMirror JSON) salvo pelo CMS. */
interface Node {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
  content?: Node[];
}

/** Renderiza o texto rico do CMS: parágrafos, títulos, listas, citações, negrito e itálico. */
export function RichText({ doc }: { doc: RichTextDoc | null }) {
  const blocks = (doc?.content ?? []) as Node[];
  if (blocks.length === 0) return null;
  return <View style={styles.doc}>{blocks.map((b, i) => renderBlock(b, i))}</View>;
}

function renderBlock(node: Node, key: number | string, ordered?: number): ReactNode {
  switch (node.type) {
    case 'heading': {
      const level = Number(node.attrs?.level ?? 2);
      return (
        <Text key={key} variant="display" size={level <= 2 ? 20 : 17}>
          {renderInline(node.content)}
        </Text>
      );
    }
    case 'bulletList':
    case 'orderedList':
      return (
        <View key={key} style={styles.list}>
          {(node.content ?? []).map((item, i) =>
            renderBlock(item, i, node.type === 'orderedList' ? i + 1 : undefined),
          )}
        </View>
      );
    case 'listItem':
      return (
        <View key={key} style={styles.listItem}>
          <Text style={styles.bullet}>{ordered ? `${ordered}.` : '•'}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            {(node.content ?? []).map((c, i) => renderBlock(c, i))}
          </View>
        </View>
      );
    case 'blockquote':
      return (
        <View key={key} style={styles.quote}>
          {(node.content ?? []).map((c, i) => renderBlock(c, i))}
        </View>
      );
    case 'horizontalRule':
      return <View key={key} style={styles.rule} />;
    case 'paragraph':
    default:
      if (!node.content?.length) return null;
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInline(node.content)}
        </Text>
      );
  }
}

function renderInline(nodes: Node[] | undefined): ReactNode {
  return (nodes ?? []).map((n, i) => {
    if (n.type === 'hardBreak') return '\n';
    if (n.type !== 'text') return <Fragment key={i}>{renderInline(n.content)}</Fragment>;
    const marks = new Set((n.marks ?? []).map((m) => m.type));
    return (
      <Text
        key={i}
        style={[
          marks.has('bold') && { fontFamily: fonts.bold },
          marks.has('italic') && { fontStyle: 'italic' },
          marks.has('underline') && { textDecorationLine: 'underline' },
        ]}
      >
        {n.text}
      </Text>
    );
  });
}

const styles = StyleSheet.create({
  doc: { gap: 12 },
  paragraph: { fontSize: 15, lineHeight: 23 },
  list: { gap: 8 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { color: colors.lime, fontFamily: fonts.bold, minWidth: 16 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.lime, paddingLeft: 12, gap: 8 },
  rule: { height: 1, backgroundColor: colors.border },
});
