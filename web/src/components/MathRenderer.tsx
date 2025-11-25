import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
}

/**
 * Renders text with LaTeX math expressions
 * Supports:
 * - Inline math: $...$ or \(...\)
 * - Block math: $$...$$ or \[...\]
 */
export default function MathRenderer({ content }: MathRendererProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;

  while (i < content.length) {
    // Check for block math: $$...$$
    if (content.substring(i, i + 2) === '$$') {
      // Add text before the math
      if (i > lastIndex) {
        parts.push(content.substring(lastIndex, i));
      }
      
      // Find closing $$
      const endIndex = content.indexOf('$$', i + 2);
      if (endIndex !== -1) {
        const mathContent = content.substring(i + 2, endIndex).trim();
        try {
          parts.push(
            <BlockMath key={`block-${i}`} math={mathContent} />
          );
        } catch (error) {
          // If KaTeX fails, just show the raw text
          parts.push(`$$${mathContent}$$`);
        }
        lastIndex = endIndex + 2;
        i = endIndex + 2;
        continue;
      }
    }
    
    // Check for inline math: $...$ (but not $$)
    if (content[i] === '$' && content[i + 1] !== '$') {
      // Add text before the math
      if (i > lastIndex) {
        parts.push(content.substring(lastIndex, i));
      }
      
      // Find closing $ (not followed by $)
      let endIndex = content.indexOf('$', i + 1);
      while (endIndex !== -1 && endIndex < content.length - 1 && content[endIndex + 1] === '$') {
        endIndex = content.indexOf('$', endIndex + 2);
      }
      
      if (endIndex !== -1) {
        const mathContent = content.substring(i + 1, endIndex).trim();
        try {
          parts.push(
            <InlineMath key={`inline-${i}`} math={mathContent} />
          );
        } catch (error) {
          // If KaTeX fails, just show the raw text
          parts.push(`$${mathContent}$`);
        }
        lastIndex = endIndex + 1;
        i = endIndex + 1;
        continue;
      }
    }
    
    // Check for LaTeX delimiters: \(...\) and \[...\]
    if (content.substring(i, i + 2) === '\\(') {
      const endIndex = content.indexOf('\\)', i + 2);
      if (endIndex !== -1) {
        if (i > lastIndex) {
          parts.push(content.substring(lastIndex, i));
        }
        const mathContent = content.substring(i + 2, endIndex).trim();
        try {
          parts.push(
            <InlineMath key={`inline-${i}`} math={mathContent} />
          );
        } catch (error) {
          parts.push(`\\(${mathContent}\\)`);
        }
        lastIndex = endIndex + 2;
        i = endIndex + 2;
        continue;
      }
    }
    
    if (content.substring(i, i + 2) === '\\[') {
      const endIndex = content.indexOf('\\]', i + 2);
      if (endIndex !== -1) {
        if (i > lastIndex) {
          parts.push(content.substring(lastIndex, i));
        }
        const mathContent = content.substring(i + 2, endIndex).trim();
        try {
          parts.push(
            <BlockMath key={`block-${i}`} math={mathContent} />
          );
        } catch (error) {
          parts.push(`\\[${mathContent}\\]`);
        }
        lastIndex = endIndex + 2;
        i = endIndex + 2;
        continue;
      }
    }
    
    i++;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return (
    <span className="[&_.katex]:text-gray-200 [&_.katex-display]:my-2">
      {parts}
    </span>
  );
}

