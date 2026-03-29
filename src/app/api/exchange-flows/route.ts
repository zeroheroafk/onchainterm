import { NextResponse } from "next/server"
import { etherscanFetch } from "@/lib/etherscan"

// Major exchange hot wallets
const EXCHANGES: { name: string; addresses: string[] }[] = [
  { name: "Binance", addresses: ["0x28C6c06298d514Db089934071355E5743bf21d60", "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549"] },
  { name: "Coinbase", addresses: ["0x503828976D22510aad0201ac7EC88293211D23Da", "0xddfAbCdc4D8FfC6d5beaf154f18B778f892A0740"] },
  { name: "Kraken", addresses: ["0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0", "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13"] },
  { name: "OKX", addresses: ["0xA7EFAe728D2936e78BDA97dc267687568dD593f3", "0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b"] },
]

const PER_CALL_TIMEOUT_MS = 5_000
const OVERALL_TIMEOUT_MS = 12_000

/** Wrapper around etherscanFetch that races against AbortSignal.timeout */
async function timedEtherscanFetch(params: string, revalidate = 60): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PER_CALL_TIMEOUT_MS)
  try {
    return await etherscanFetch(params, revalidate)
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Fetch balance + txlist for a single exchange; returns partial data on failure */
async function fetchExchangeFlow(exchange: { name: string; addresses: string[] }) {
  const addr = exchange.addresses[0]
  const allAddrsLower = exchange.addresses.map(a => a.toLowerCase())

  // Fire both calls in parallel instead of sequentially
  const [balResult, txResult] = await Promise.allSettled([
    timedEtherscanFetch(`module=account&action=balance&address=${addr}&tag=latest`),
    timedEtherscanFetch(`module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`),
  ])

  const balanceEth =
    balResult.status === "fulfilled" && balResult.value.status === "1"
      ? Number(balResult.value.result) / 1e18
      : 0

  let inflow = 0
  let outflow = 0

  if (txResult.status === "fulfilled" && txResult.value.status === "1" && Array.isArray(txResult.value.result)) {
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400
    for (const tx of txResult.value.result) {
      if (Number(tx.timeStamp) < oneDayAgo) continue
      if (tx.isError === "1") continue
      const valueEth = Number(tx.value) / 1e18
      if (valueEth === 0) continue

      const toLower = (tx.to ?? "").toLowerCase()
      const fromLower = (tx.from ?? "").toLowerCase()

      if (allAddrsLower.includes(toLower) && !allAddrsLower.includes(fromLower)) {
        inflow += valueEth
      } else if (allAddrsLower.includes(fromLower) && !allAddrsLower.includes(toLower)) {
        outflow += valueEth
      }
    }
  }

  return {
    name: exchange.name,
    balanceEth,
    inflow24h: inflow,
    outflow24h: outflow,
    netFlow: inflow - outflow,
  }
}

export async function GET() {
  try {
    // Fetch all exchanges in parallel with an overall timeout guard
    const results = await Promise.race([
      Promise.allSettled(EXCHANGES.map(fetchExchangeFlow)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Exchange flow data fetch timed out")), OVERALL_TIMEOUT_MS),
      ),
    ])

    const exchangeFlows = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { name: "Unknown", balanceEth: 0, inflow24h: 0, outflow24h: 0, netFlow: 0 },
    )

    const totalNet = exchangeFlows.reduce((s, e) => s + e.netFlow, 0)

    return NextResponse.json({ exchanges: exchangeFlows, totalNetFlow: totalNet })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch exchange flow data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
