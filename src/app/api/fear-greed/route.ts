import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch(
      "https://api.alternative.me/fng/?limit=30&format=json",
      { next: { revalidate: 300 } } // cache 5 min (updates every ~8h)
    )

    if (!res.ok) throw new Error(`Fear & Greed API error: ${res.status}`)

    const data = await res.json()
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response")
    }

    const entries = data.data.map((d: { value: string; value_classification: string; timestamp: string }) => ({
      value: Number(d.value),
      classification: d.value_classification,
      timestamp: Number(d.timestamp) * 1000,
    }))

    return NextResponse.json({ entries })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Fear & Greed data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
