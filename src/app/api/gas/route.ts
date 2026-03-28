import { NextResponse } from "next/server"
import { etherscanFetch } from "@/lib/etherscan"

export async function GET() {
  try {
    const data = await etherscanFetch("module=gastracker&action=gasoracle", 15)

    if (data.status !== "1" || !data.result) {
      console.error("[gas] Etherscan full response:", JSON.stringify(data))
      throw new Error((data.result as string) || (data.message as string) || "Etherscan returned no gas data")
    }

    const result = data.result as Record<string, string>

    return NextResponse.json({
      low: Number(result.SafeGasPrice),
      average: Number(result.ProposeGasPrice),
      high: Number(result.FastGasPrice),
      baseFee: Number(result.suggestBaseFee),
      lastBlock: Number(result.LastBlock),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch gas data"
    console.error("[gas]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
