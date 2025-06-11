class MarkdownIt {
  render(text = '') {
    let html = String(text);
    // Bold **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    // Inline code `code`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Paragraphs and line breaks
    const paragraphs = html.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>'));
    html = '<p>' + paragraphs.join('</p><p>') + '</p>';

    return html;
  }
}

// Simple DOMPurify replacement for tests and demo usage
const DOMPurify = {
  sanitize(html = '') {
    if (typeof document !== 'undefined') {
      const template = document.createElement('template');
      template.innerHTML = String(html);

      const SHOW_ELEMENT = (typeof NodeFilter !== 'undefined'
        ? NodeFilter.SHOW_ELEMENT
        : 1);
      const walker = document.createTreeWalker(
        template.content,
        SHOW_ELEMENT,
        null,
        false
      );
      let node;
      while ((node = walker.nextNode())) {
        if (node.tagName.toLowerCase() === 'script') {
          node.remove();
          continue;
        }
        Array.from(node.attributes).forEach(attr => {
          const name = attr.name.toLowerCase();
          const value = attr.value.trim().toLowerCase();
          if (name.startsWith('on')) {
            node.removeAttribute(attr.name);
          }
          if (['href', 'src'].includes(name) && value.startsWith('javascript:')) {
            node.removeAttribute(attr.name);
          }
        });
      }
      return template.innerHTML;
    }

    // Fallback: strip script tags with regex if DOM not available
    return String(html).replace(/<script[^>]*>.*?<\/script>/gi, '');
  }
};

if (typeof window !== 'undefined') {
  window.MarkdownIt = MarkdownIt;
  window.DOMPurify = DOMPurify;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MarkdownIt, DOMPurify };
}
