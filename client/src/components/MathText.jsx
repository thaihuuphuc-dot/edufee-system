import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathText = React.memo(({ text = '', className = '' }) => {
  if (!text) return null;

  // Tách chuỗi theo công thức $$...$$ (display mode) và $...$ (inline mode)
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);

  return (
    <span className={`math-text-wrapper inline-block ${className}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, idx) => {
        // Xử lý công thức khối (Display Mode $$...$$)
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const formula = part.slice(2, -2);
          try {
            const html = katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false
            });
            return (
              <span
                key={idx}
                className="my-2 block overflow-x-auto py-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={idx} className="text-rose-500">{part}</code>;
          }
        }

        // Xử lý công thức dòng (Inline Mode $...$)
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const formula = part.slice(1, -1);
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false
            });
            return (
              <span
                key={idx}
                className="inline-span px-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={idx} className="text-rose-500">{part}</code>;
          }
        }

        // Văn bản thường
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
});

MathText.displayName = 'MathText';

export default MathText;