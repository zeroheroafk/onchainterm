import { NextResponse } from "next/server"

const GNEWS_API_KEY = process.env.GNEWS_API_KEY
const GNEWS_URL = "https://gnews.io/api/v4/search"

// In-memory cache to minimize API calls (target: <150 req/day)
let cachedNews: NewsItem[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 3 * 60 * 1000 // 3 minutes (~480 req/day)

interface NewsItem {
  title: string
  url: string
  source: string
  published_at: string
  currencies: string[]
}

// ── RSS fallback sources ──
const RSS_SOURCES = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
]

const CRYPTO_TAGS = ["BTC", "BITCOIN", "ETH", "ETHEREUM", "SOL", "SOLANA", "XRP", "RIPPLE", "BNB", "ADA", "CARDANO", "DOGE", "DOGECOIN", "DOT", "POLKADOT", "AVAX", "AVALANCHE", "MATIC", "POLYGON", "LINK", "CHAINLINK", "UNI", "UNISWAP", "ATOM", "COSMOS", "LTC", "LITECOIN", "NEAR", "APT", "APTOS", "ARB", "ARBITRUM", "OP", "OPTIMISM", "SUI", "TRX", "TRON", "SHIB", "PEPE", "DEFI", "NFT"]

const SYMBOL_MAP: Record<string, string> = {
  BITCOIN: "BTC", ETHEREUM: "ETH", SOLANA: "SOL", RIPPLE: "XRP",
  CARDANO: "ADA", DOGECOIN: "DOGE", POLKADOT: "DOT", AVALANCHE: "AVAX",
  POLYGON: "MATIC", CHAINLINK: "LINK", UNISWAP: "UNI", COSMOS: "ATOM",
  LITECOIN: "LTC", APTOS: "APT", ARBITRUM: "ARB", OPTIMISM: "OP", TRON: "TRX",
}

function extractCurrencies(text: string): string[] {
  const upper = text.toUpperCase()
  const found = new Set<string>()
  for (const tag of CRYPTO_TAGS) {
    if (upper.includes(tag)) found.add(SYMBOL_MAP[tag] || tag)
  }
  return Array.from(found).slice(0, 5)
}

// ── GNews fetch ──
async function fetchFromGNews(): Promise<NewsItem[]> {
  if (!GNEWS_API_KEY) throw new Error("No GNews API key")

  const params = new URLSearchParams({
    q: "crypto OR bitcoin OR ethereum OR blockchain",
    lang: "en",
    max: "30",
    apikey: GNEWS_API_KEY,
  })

  const res = await fetch(`${GNEWS_URL}?${params}`)
  if (!res.ok) throw new Error(`GNews: ${res.status}`)

  const data = await res.json()
  if (!data.articles || !Array.isArray(data.articles)) {
    throw new Error("Invalid GNews response")
  }

  return data.articles.map((a: { title: string; url: string; source: { name: string }; publishedAt: string; description?: string }) => ({
    title: a.title,
    url: a.url,
    source: a.source.name,
    published_at: a.publishedAt,
    currencies: extractCurrencies(a.title + " " + (a.description || "")),
  }))
}

// ── RSS fallback ──
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/")
}

function parseRssItems(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || block.match(/<title>(.*?)<\/title>/)?.[1] || ""
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]
      || block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/)?.[1] || ""
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
      || block.match(/<dc:date>(.*?)<\/dc:date>/)?.[1] || ""
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      || block.match(/<description>(.*?)<\/description>/)?.[1] || ""
    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: link.trim(),
        source: sourceName,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        currencies: extractCurrencies(title + " " + desc),
      })
    }
  }
  return items
}

async function fetchFromRSS(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const res = await fetch(src.url, { headers: { "User-Agent": "OnchainTerm/1.0" } })
      if (!res.ok) throw new Error(`${src.name}: ${res.status}`)
      return parseRssItems(await res.text(), src.name)
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap(r => r.value)
}

// ── Main handler ──
export async function GET() {
  try {
    // Return cached data if fresh
    if (cachedNews && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ news: cachedNews, cached: true })
    }

    let news: NewsItem[] = []

    // Try GNews first (if key available)
    try {
      news = await fetchFromGNews()
    } catch {
      // GNews failed or no key — fall back to RSS
      news = await fetchFromRSS()
    }

    if (news.length === 0) {
      throw new Error("No news from any source")
    }

    // Sort by date, take top 30
    news.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    news = news.slice(0, 30)

    // Update cache
    cachedNews = news
    cacheTimestamp = Date.now()

    return NextResponse.json({ news })
  } catch (err) {
    // If we have stale cache, serve it rather than error
    if (cachedNews) {
      return NextResponse.json({ news: cachedNews, cached: true })
    }
    const message = err instanceof Error ? err.message : "Failed to fetch news"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
