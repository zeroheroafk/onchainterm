import { NextResponse } from "next/server"

const ETHERSCAN_URL = "https://api.etherscan.io/api"

export async function GET() {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Etherscan API key not configured" }, { status: 500 })
  }

  try {
    // Fetch gas oracle data from Etherscan
    const res = await fetch(
      `${ETHERSCAN_URL}?module=gastracker&action=gasoracle&apikey=${apiKey}`,
      { next: { revalidate: 15 } } // cache for 15 seconds
    )

    if (!res.ok) {
      throw new Error(`Etherscan API error: ${res.status}`)
    }

    const data = await res.json()

    if (data.status !== "1" || !data.result) {
      throw new Error(data.message || data.result || "Failed to fetch gas data")
    }

    const result = data.result

    return NextResponse.json({
      low: Number(result.SafeGasPrice),
      average: Number(result.ProposeGasPrice),
      high: Number(result.FastGasPrice),
      baseFee: Number(result.suggestBaseFee),
      lastBlock: Number(result.LastBlock),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch gas data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
