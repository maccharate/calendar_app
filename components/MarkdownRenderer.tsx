'use client';

import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // コードブロックとその他のテキストを分離
  const parts = content.split(/(```[\s\S]*?```)/g);

  const copyToClipboard = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderInlineMarkdown = (text: string) => {
    // **太字**
    let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // *イタリック*
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // `インラインコード`
    result = result.replace(/`(.+?)`/g, '<code class="inline-code">$1</code>');
    // リンク [text](url)
    result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');

    return result;
  };

  return (
    <div className="markdown-content">
      {parts.map((part, index) => {
        // コードブロック
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const language = lines[0].replace(/```/g, '').trim() || 'text';
          const code = lines.slice(1, -1).join('\n');

          return (
            <div key={index} className="relative my-3 rounded-lg bg-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-700 text-gray-300 text-sm">
                <span>{language}</span>
                <button
                  onClick={() => copyToClipboard(code, index)}
                  className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                >
                  {copiedIndex === index ? 'コピーしました！' : 'コピー'}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-gray-100">{code}</code>
              </pre>
            </div>
          );
        }

        // 通常のテキスト（インラインマークダウン適用）
        const lines = part.split('\n');
        return (
          <div key={index}>
            {lines.map((line, lineIndex) => {
              // 見出し
              if (line.startsWith('### ')) {
                return (
                  <h3 key={lineIndex} className="text-lg font-bold mt-3 mb-2">
                    {line.replace('### ', '')}
                  </h3>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={lineIndex} className="text-xl font-bold mt-4 mb-2">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <h1 key={lineIndex} className="text-2xl font-bold mt-4 mb-3">
                    {line.replace('# ', '')}
                  </h1>
                );
              }

              // リスト
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                  <li
                    key={lineIndex}
                    className="ml-4 list-disc"
                    dangerouslySetInnerHTML={{
                      __html: renderInlineMarkdown(line.trim().replace(/^[-*]\s/, '')),
                    }}
                  />
                );
              }

              // 番号付きリスト
              if (/^\d+\.\s/.test(line.trim())) {
                return (
                  <li
                    key={lineIndex}
                    className="ml-4 list-decimal"
                    dangerouslySetInnerHTML={{
                      __html: renderInlineMarkdown(line.trim().replace(/^\d+\.\s/, '')),
                    }}
                  />
                );
              }

              // 空行
              if (line.trim() === '') {
                return <br key={lineIndex} />;
              }

              // 通常の段落
              return (
                <p
                  key={lineIndex}
                  className="my-1"
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMarkdown(line),
                  }}
                />
              );
            })}
          </div>
        );
      })}

      <style jsx>{`
        :global(.inline-code) {
          background-color: #374151;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
