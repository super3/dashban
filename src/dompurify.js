function sanitize(html) {
  if (!html) return '';
  // Remove script tags
  html = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  return html;
}

const DOMPurify = { sanitize };

if (typeof window !== 'undefined') {
  window.DOMPurify = DOMPurify;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMPurify;
}
