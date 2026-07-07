import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import TurndownService from 'turndown';

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function inlineMD(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function sbsMarkdownToHTML(md: string): string {
  const lines = md.split('\n').map((l) => l.trim());
  const blocks: string[] = [];
  let i = 0;
  const isUL = (l: string) => /^[-*+]\s/.test(l);
  const isOL = (l: string) => /^\d+\.\s/.test(l);
  while (i < lines.length) {
    if (!lines[i]) { i++; continue; }
    if (isUL(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && isUL(lines[i])) { items.push(`<li>${inlineMD(lines[i].replace(/^[-*+]\s/, ''))}</li>`); i++; }
      blocks.push(`<ul>${items.join('')}</ul>`);
    } else if (isOL(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && isOL(lines[i])) { items.push(`<li>${inlineMD(lines[i].replace(/^\d+\.\s/, ''))}</li>`); i++; }
      blocks.push(`<ol>${items.join('')}</ol>`);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i] && !isUL(lines[i]) && !isOL(lines[i])) { para.push(inlineMD(lines[i])); i++; }
      blocks.push(`<p>${para.join('<br/>')}</p>`);
    }
  }
  return blocks.join('\n');
}

export function preprocessContent(content: string): string {
  return content.replace(/<!--sbsmd-->([\s\S]*?)<!--\/sbsmd-->/g, (_, md) => sbsMarkdownToHTML(md.trim()));
}

const mdProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);

export async function renderMarkdown(content: string): Promise<string> {
  const preprocessed = preprocessContent(content);
  const result = await mdProcessor.process(preprocessed);
  return String(result);
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
});

turndownService.addRule('inlineHtml', {
  filter: (node) => {
    if (node instanceof HTMLElement && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'A', 'IMG', 'CODE', 'PRE', 'BLOCKQUOTE', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'BR', 'HR'].includes(node.nodeName)) {
      return true;
    }
    return false;
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    return el.outerHTML;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}
