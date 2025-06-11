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

if (typeof window !== 'undefined') {
  window.MarkdownIt = MarkdownIt;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownIt;
}
