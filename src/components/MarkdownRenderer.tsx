const RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^### (.+)$/gm, (m) => `<h3>${m[1]}</h3>`],
  [/^## (.+)$/gm, (m) => `<h2>${m[1]}</h2>`],
  [/^# (.+)$/gm, (m) => `<h1>${m[1]}</h1>`],
  [/\*\*(.+?)\*\*/g, (m) => `<strong>${m[1]}</strong>`],
  [/\*(.+?)\*/g, (m) => `<em>${m[1]}</em>`],
  [/`([^`]+)`/g, (m) => `<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">${m[1]}</code>`],
  [/```(\w*)\n([\s\S]*?)```/g, (m) => `<pre class="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-sm my-4"><code>${escapeHtml(m[2])}</code></pre>`],
  [/\[([^\]]+)\]\(([^)]+)\)/g, (m) => `<a href="${m[2]}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${m[1]}</a>`],
  [/^- (.+)$/gm, (m) => `<li class="ml-4 list-disc">${inline(m[1])}</li>`],
  [/^(\d+)\. (.+)$/gm, (m) => `<li class="ml-4 list-decimal">${inline(m[2])}</li>`],
  [/^> (.+)$/gm, (m) => `<blockquote class="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400 my-2">${inline(m[1])}</blockquote>`],
];

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text: string): string {
  let result = text;
  for (const [regex, fn] of RULES) {
    if (regex.source.startsWith('^\\*\\*|^\\*|^`|^```')) continue;
    result = result.replace(regex, fn as any);
  }
  return result;
}

function renderMarkdown(md: string): string {
  let html = md;
  for (const [regex, fn] of RULES) {
    html = html.replace(regex, fn as any);
  }
  return html
    .replace(/<li/g, '\n<li')
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li') || trimmed.startsWith('<blockquote')) return trimmed;
      return `<p class="mb-3 leading-relaxed">${inline(trimmed)}</p>`;
    })
    .join('\n');
}

export default function MarkdownRenderer({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div
      className={`prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
