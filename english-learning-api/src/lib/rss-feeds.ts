import { XMLParser } from 'fast-xml-parser';

export type FeedCategory = 'news' | 'tech' | 'business';

export interface FeedSource {
  name: string;
  category: FeedCategory;
  url: string;
}

export interface RssFeedItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  category: FeedCategory;
  pubDate: string | null;
}

export const RSS_FEEDS: FeedSource[] = [
  { name: 'BBC News', category: 'news', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'Reuters', category: 'news', url: 'https://www.reutersagency.com/feed/' },
  { name: 'NPR', category: 'news', url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'The Guardian', category: 'news', url: 'https://www.theguardian.com/world/rss' },
  { name: 'TechCrunch', category: 'tech', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', category: 'tech', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', category: 'tech', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Wired', category: 'tech', url: 'https://www.wired.com/feed/rss' },
  { name: 'BBC Business', category: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'HBR', category: 'business', url: 'https://hbr.org/rss/rss.xml' },
];

const ITEMS_PER_FEED = 15;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  items: RssFeedItem[];
  fetchedAt: number;
}

const feedCache = new Map<string, CacheEntry>();

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseRssXml(xml: string, feed: FeedSource): RssFeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const doc = parser.parse(xml);

  // RSS 2.0: rss > channel > item
  const channel = doc?.rss?.channel;
  if (channel) {
    const rawItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    return rawItems.slice(0, ITEMS_PER_FEED).map((item: Record<string, unknown>) => ({
      title: stripHtml(String(item.title || '')),
      url: String(item.link || ''),
      snippet: stripHtml(String(item.description || '')),
      source: feed.name,
      category: feed.category,
      pubDate: item.pubDate ? String(item.pubDate) : null,
    }));
  }

  // Atom: feed > entry
  const atomFeed = doc?.feed;
  if (atomFeed) {
    const rawEntries = Array.isArray(atomFeed.entry) ? atomFeed.entry : atomFeed.entry ? [atomFeed.entry] : [];
    return rawEntries.slice(0, ITEMS_PER_FEED).map((entry: Record<string, unknown>) => {
      let link = '';
      if (typeof entry.link === 'string') {
        link = entry.link;
      } else if (Array.isArray(entry.link)) {
        const alt = (entry.link as Record<string, unknown>[]).find(
          (l) => l['@_rel'] === 'alternate' || !l['@_rel']
        );
        link = String((alt || entry.link[0])?.['@_href'] || '');
      } else if (entry.link && typeof entry.link === 'object') {
        link = String((entry.link as Record<string, unknown>)['@_href'] || '');
      }

      let snippet = '';
      if (entry.summary) {
        snippet = typeof entry.summary === 'string'
          ? entry.summary
          : String((entry.summary as Record<string, unknown>)['#text'] || '');
      } else if (entry.content) {
        snippet = typeof entry.content === 'string'
          ? entry.content
          : String((entry.content as Record<string, unknown>)['#text'] || '');
      }

      return {
        title: stripHtml(String(entry.title && typeof entry.title === 'object'
          ? (entry.title as Record<string, unknown>)['#text'] || ''
          : entry.title || '')),
        url: link,
        snippet: stripHtml(snippet).slice(0, 300),
        source: feed.name,
        category: feed.category,
        pubDate: entry.updated ? String(entry.updated) : entry.published ? String(entry.published) : null,
      };
    });
  }

  return [];
}

async function fetchSingleFeed(feed: FeedSource): Promise<RssFeedItem[]> {
  const cached = feedCache.get(feed.url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.items;
  }

  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnglishLearningBot/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRssXml(xml, feed);
    feedCache.set(feed.url, { items, fetchedAt: Date.now() });
    return items;
  } catch (err) {
    console.error(`Failed to fetch RSS feed ${feed.name}:`, err);
    // Return stale cache on failure
    if (cached) return cached.items;
    return [];
  }
}

export async function fetchAllFeeds(category?: FeedCategory): Promise<RssFeedItem[]> {
  const feeds = category ? RSS_FEEDS.filter((f) => f.category === category) : RSS_FEEDS;
  const results = await Promise.all(feeds.map(fetchSingleFeed));
  const allItems = results.flat();

  // Sort by pubDate descending (items without pubDate go last)
  allItems.sort((a, b) => {
    if (!a.pubDate && !b.pubDate) return 0;
    if (!a.pubDate) return 1;
    if (!b.pubDate) return -1;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  return allItems;
}
