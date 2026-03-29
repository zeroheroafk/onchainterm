import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createCache } from "@/lib/api-utils"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// In-memory cache (2 min TTL, stale data served for 10 min as fallback)
const newsCache = createCache<NewsItem[]>(2 * 60 * 1000)
const CACHE_KEY = "news"
const STALE_TTL = 10 * 60 * 1000

interface NewsItem {
  title: string
  url: string
  source: string
  published_at: string
  image?: string | null
  currencies: string[]
}

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

// ── Primary: read from Supabase (populated by edge function cron) ──
async function fetchFromSupabase(): Promise<NewsItem[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data, error } = await supabase
    .from("news_articles")
    .select("title, url, source_name, published_at, image, description")
    .order("published_at", { ascending: false })
    .limit(30)

  if (error) throw new Error(`Supabase: ${error.message}`)
  if (!data || data.length === 0) throw new Error("No articles in database")

  return data.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source_name || "Unknown",
    published_at: a.published_at,
    image: a.image,
    currencies: extractCurrencies(a.title + " " + (a.description || "")),
  }))
}

// ── RSS fallback (if Supabase has no data yet) ──
const RSS_SOURCES = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
]

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
    const cached = newsCache.get(CACHE_KEY)
    if (cached) {
      return NextResponse.json({ news: cached, cached: true })
    }

    let news: NewsItem[] = []

    // Primary: read from Supabase (edge function populates this every 10 min)
    try {
      news = await fetchFromSupabase()
    } catch {
      // Supabase empty or error — fall back to RSS
      news = await fetchFromRSS()
    }

    if (news.length === 0) {
      throw new Error("No news from any source")
    }

    // Sort by date, take top 30
    news.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    news = news.slice(0, 30)

    // Update cache
    newsCache.set(CACHE_KEY, news)

    return NextResponse.json({ news })
  } catch (err) {
    // If we have stale cache, serve it rather than error
    const stale = newsCache.getStale(CACHE_KEY, STALE_TTL)
    if (stale) {
      return NextResponse.json({ news: stale, cached: true })
    }
    const message = err instanceof Error ? err.message : "Failed to fetch news"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
