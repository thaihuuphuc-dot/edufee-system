import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathText = ({ text }) => {
  if (!text) return null;

  // Split text by block formula $$...$$ and inline formula $...$
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);

  return (
    <span className="math-text-wrapper" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2);
          try {
            const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
            return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <code key={idx}>{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1);
          try {
            const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
            return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <code key={idx}>{part}</code>;
          }
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
};

export default MathText;