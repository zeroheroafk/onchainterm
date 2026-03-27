import { NextResponse } from "next/server"

const NEWS_SOURCES = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
  },
  {
    name: "Decrypt",
    url: "https://decrypt.co/feed",
  },
]

const CRYPTO_TAGS = ["BTC", "BITCOIN", "ETH", "ETHEREUM", "SOL", "SOLANA", "XRP", "RIPPLE", "BNB", "ADA", "CARDANO", "DOGE", "DOGECOIN", "DOT", "POLKADOT", "AVAX", "AVALANCHE", "MATIC", "POLYGON", "LINK", "CHAINLINK", "UNI", "UNISWAP", "ATOM", "COSMOS", "LTC", "LITECOIN", "NEAR", "APT", "APTOS", "ARB", "ARBITRUM", "OP", "OPTIMISM", "SUI", "TRX", "TRON", "SHIB", "PEPE", "DEFI", "NFT", "LAYER 2", "L2", "STABLECOIN", "MEMECOIN"]

function extractCurrencies(text: string): string[] {
  const upper = text.toUpperCase()
  const found = new Set<string>()
  const symbolMap: Record<string, string> = {
    BITCOIN: "BTC", ETHEREUM: "ETH", SOLANA: "SOL", RIPPLE: "XRP",
    CARDANO: "ADA", DOGECOIN: "DOGE", POLKADOT: "DOT", AVALANCHE: "AVAX",
    POLYGON: "MATIC", CHAINLINK: "LINK", UNISWAP: "UNI", COSMOS: "ATOM",
    LITECOIN: "LTC", APTOS: "APT", ARBITRUM: "ARB", OPTIMISM: "OP", TRON: "TRX",
  }
  for (const tag of CRYPTO_TAGS) {
    if (upper.includes(tag)) {
      found.add(symbolMap[tag] || tag)
    }
  }
  return Array.from(found).slice(0, 5)
}

function parseRssItems(xml: string, sourceName: string) {
  const items: Array<{
    title: string
    url: string
    source: string
    published_at: string
    currencies: string[]
  }> = []

  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || block.match(/<title>(.*?)<\/title>/)?.[1]
      || ""
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]
      || block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/)?.[1]
      || ""
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
      || block.match(/<dc:date>(.*?)<\/dc:date>/)?.[1]
      || ""
    const description = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      || block.match(/<description>(.*?)<\/description>/)?.[1]
      || ""

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: link.trim(),
        source: sourceName,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        currencies: extractCurrencies(title + " " + description),
      })
    }
  }

  return items
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      NEWS_SOURCES.map(async (source) => {
        const res = await fetch(source.url, {
          next: { revalidate: 60 },
          headers: { "User-Agent": "OnchainTerm/1.0" },
        })
        if (!res.ok) throw new Error(`${source.name}: ${res.status}`)
        const xml = await res.text()
        return parseRssItems(xml, source.name)
      })
    )

    const allNews = results
      .filter((r): r is PromiseFulfilledResult<ReturnType<typeof parseRssItems>> => r.status === "fulfilled")
      .flatMap(r => r.value)

    if (allNews.length === 0) {
      throw new Error("No news from any source")
    }

    // Sort by date descending, take top 30
    allNews.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    const news = allNews.slice(0, 30)

    return NextResponse.json({ news })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch news"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
