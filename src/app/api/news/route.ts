import { NextResponse } from "next/server"

const CRYPTOPANIC_URL = "https://cryptopanic.com/api/free/v1/posts/"

interface CryptoPanicPost {
  title: string
  url: string
  source: { title: string }
  published_at: string
  currencies?: { code: string }[]
  kind: string
}

export async function GET() {
  try {
    const res = await fetch(
      `${CRYPTOPANIC_URL}?auth_token=free&public=true&kind=news`,
      { next: { revalidate: 120 } } // cache 2 minutes
    )

    if (!res.ok) {
      throw new Error(`CryptoPanic API error: ${res.status}`)
    }

    const data = await res.json()

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Invalid response from CryptoPanic")
    }

    const news = data.results.map((post: CryptoPanicPost) => ({
      title: post.title,
      url: post.url,
      source: post.source.title,
      published_at: post.published_at,
      currencies: post.currencies?.map((c) => c.code) || [],
      kind: post.kind,
    }))

    return NextResponse.json({ news })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch news"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
