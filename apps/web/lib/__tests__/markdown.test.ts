import { describe, expect, it } from 'vitest';

import { markdownToHtml, renderMarkdown } from '@/lib/markdown';

describe('markdownToHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('');
  });

  it('renders headings', () => {
    expect(markdownToHtml('# Title')).toBe('<h1>Title</h1>');
    expect(markdownToHtml('### Sub')).toBe('<h3>Sub</h3>');
  });

  it('renders bold and italic', () => {
    expect(markdownToHtml('**bold**')).toBe('<p><strong>bold</strong></p>');
    expect(markdownToHtml('_italic_')).toBe('<p><em>italic</em></p>');
    expect(markdownToHtml('a *mid* b')).toBe('<p>a <em>mid</em> b</p>');
  });

  it('renders inline code and fenced code blocks', () => {
    expect(markdownToHtml('`x = 1`')).toBe('<p><code>x = 1</code></p>');
    expect(markdownToHtml('```js\nconst a = 1;\n```')).toBe(
      '<pre><code class="language-js">const a = 1;</code></pre>'
    );
  });

  it('does not treat markdown inside code fences as markdown', () => {
    const html = markdownToHtml('```\n**not bold**\n```');
    expect(html).toBe('<pre><code>**not bold**</code></pre>');
  });

  it('renders links with safe rel/target', () => {
    expect(markdownToHtml('[hunty](https://hunty.app)')).toBe(
      '<p><a href="https://hunty.app" target="_blank" rel="noopener noreferrer">hunty</a></p>'
    );
  });

  it('renders unordered and ordered lists', () => {
    expect(markdownToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
    expect(markdownToHtml('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>');
  });

  it('renders blockquotes', () => {
    expect(markdownToHtml('> quoted')).toBe('<blockquote>quoted</blockquote>');
  });

  it('resolves ipfs:// image URIs to a gateway URL', () => {
    const html = markdownToHtml('![pic](ipfs://QmAbc123)');
    expect(html).toContain('<img');
    expect(html).toContain('/ipfs/QmAbc123');
    expect(html).not.toContain('ipfs://');
  });

  it('separates paragraphs on blank lines and keeps single newlines as breaks', () => {
    expect(markdownToHtml('a\nb')).toBe('<p>a<br />b</p>');
    expect(markdownToHtml('a\n\nb')).toBe('<p>a</p>\n<p>b</p>');
  });
});

describe('markdown security', () => {
  it('escapes raw HTML in the source', () => {
    const html = markdownToHtml('<b>hi</b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>hi</b>');
  });

  it('drops javascript: link URLs', () => {
    const html = markdownToHtml('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<a');
  });

  it('does not emit a script tag from an image onerror payload', () => {
    const html = markdownToHtml('![x](https://e.com/x.png"onerror="alert(1))');
    // The quote in the URL is escaped, so no attribute breakout is possible.
    expect(html).not.toContain('onerror="alert(1)"');
  });

  it('renderMarkdown produces no live script/handler markup for a hostile payload', () => {
    const payload = [
      '# Title <script>alert(1)</script>',
      '',
      '[x](javascript:alert(2))',
      '',
      '<img src=x onerror=alert(3)>',
    ].join('\n');
    const html = renderMarkdown(payload).toLowerCase();
    // No live script element and no javascript: URL survives.
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    // The raw <img onerror> is escaped to inert text, not a live element.
    expect(html).not.toContain('<img src=x onerror');
    expect(html).toContain('&lt;img');
  });
});
