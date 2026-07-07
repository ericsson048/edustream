import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import { preprocessContent } from '../utils/md';

const components: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-2.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => {
    const rest = props as Record<string, unknown>;
    const styleStr = rest.style as string | undefined;
    delete rest.style;
    const style: React.CSSProperties = {};
    if (typeof styleStr === 'string') {
      styleStr.split(';').filter(Boolean).forEach((pair) => {
        const [k, v] = pair.split(':').map((s) => s.trim());
        if (k && v) {
          const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          (style as any)[camel] = v;
        }
      });
    }
    return <img src={src} alt={alt || ''} className="rounded-xl my-4" style={style} {...(rest as any)} />;
  },
  code: ({ className, children, ...rest }) => {
    const isBlock = /language-/.test(className || '');
    if (isBlock) {
      return (
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-sm my-4">
          <code className={className} {...rest}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm" {...rest}>
        {children}
      </code>
    );
  },
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400 my-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-left font-semibold bg-slate-50 dark:bg-slate-800">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 dark:border-slate-700 px-3 py-2">{children}</td>,
  hr: () => <hr className="my-6 border-slate-200 dark:border-slate-700" />,
};

export default function MarkdownRenderer({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {preprocessContent(content)}
      </ReactMarkdown>
    </div>
  );
}