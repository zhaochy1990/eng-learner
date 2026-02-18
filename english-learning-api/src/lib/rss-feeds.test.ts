import { describe, it, expect } from 'vitest';
import { parseRssXml, stripHtml, FeedSource } from './rss-feeds';

const testFeed: FeedSource = {
  name: 'Test Feed',
  category: 'news',
  url: 'https://example.com/feed',
};

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('Tom &amp; Jerry &lt;3&gt;')).toBe('Tom & Jerry <3>');
  });

  it('replaces &nbsp; with space', () => {
    expect(stripHtml('hello&nbsp;world')).toBe('hello world');
  });

  it('collapses multiple whitespace', () => {
    expect(stripHtml('  hello   world  ')).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('parseRssXml', () => {
  it('parses RSS 2.0 format', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Channel</title>
    <item>
      <title>Article One</title>
      <link>https://example.com/article-1</link>
      <description>&lt;p&gt;First article summary&lt;/p&gt;</description>
      <pubDate>Mon, 17 Feb 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/article-2</link>
      <description>Second article summary</description>
      <pubDate>Sun, 16 Feb 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const items = parseRssXml(xml, testFeed);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: 'Article One',
      url: 'https://example.com/article-1',
      snippet: 'First article summary',
      source: 'Test Feed',
      category: 'news',
      pubDate: 'Mon, 17 Feb 2026 12:00:00 GMT',
    });
    expect(items[1].title).toBe('Article Two');
  });

  it('parses Atom format', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <entry>
    <title>Atom Article</title>
    <link rel="alternate" href="https://example.com/atom-1" />
    <summary>Atom summary text</summary>
    <updated>2026-02-17T12:00:00Z</updated>
  </entry>
</feed>`;

    const items = parseRssXml(xml, testFeed);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      title: 'Atom Article',
      url: 'https://example.com/atom-1',
      snippet: 'Atom summary text',
      source: 'Test Feed',
      category: 'news',
      pubDate: '2026-02-17T12:00:00Z',
    });
  });

  it('handles single item (not array)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Only Item</title>
      <link>https://example.com/only</link>
      <description>Only description</description>
    </item>
  </channel>
</rss>`;

    const items = parseRssXml(xml, testFeed);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Only Item');
    expect(items[0].pubDate).toBeNull();
  });

  it('returns empty array for invalid XML', () => {
    const items = parseRssXml('<html><body>Not a feed</body></html>', testFeed);
    expect(items).toEqual([]);
  });

  it('limits items to 15 per feed', () => {
    const itemsXml = Array.from({ length: 20 }, (_, i) =>
      `<item><title>Item ${i}</title><link>https://example.com/${i}</link><description>Desc ${i}</description></item>`
    ).join('');
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>${itemsXml}</channel></rss>`;

    const items = parseRssXml(xml, testFeed);
    expect(items).toHaveLength(15);
  });

  it('handles Atom entry with single link object', () => {
    const xml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Single Link</title>
    <link href="https://example.com/single" />
    <summary>Summary</summary>
    <published>2026-02-15T08:00:00Z</published>
  </entry>
</feed>`;

    const items = parseRssXml(xml, testFeed);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://example.com/single');
    expect(items[0].pubDate).toBe('2026-02-15T08:00:00Z');
  });
});
