import { NextResponse } from "next/server"

export const revalidate = 300

export async function GET() {
  try {
    const [statsRes, addressesRes] = await Promise.all([
      fetch("https://api.blockchain.info/stats", { next: { revalidate: 300 } }),
      fetch(
        "https://api.blockchain.info/charts/n-unique-addresses?timespan=1days&format=json",
        { next: { revalidate: 300 } }
      ),
    ])

    if (!statsRes.ok) throw new Error("Failed to fetch blockchain stats")
    if (!addressesRes.ok) throw new Error("Failed to fetch active addresses")

    const stats = await statsRes.json()
    const addressesData = await addressesRes.json()

    const activeAddresses =
      addressesData.values && addressesData.values.length > 0
        ? addressesData.values[addressesData.values.length - 1].y
        : 0

    return NextResponse.json({
      hashRate: stats.hash_rate ?? 0,
      difficulty: stats.difficulty ?? 0,
      transactionsPerDay: stats.n_tx ?? 0,
      activeAddresses,
      avgBlockTime: stats.minutes_between_blocks ?? 0,
      mempoolSize: stats.mempool_size ?? 0,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch on-chain data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
