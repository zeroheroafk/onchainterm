import { NextRequest, NextResponse } from "next/server"
import { etherscanFetch } from "@/lib/etherscan"

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60_000
const TIMEOUT_MS = 8_000

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 })
  }

  // Check cache
  const cached = cache.get(address)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    // Fetch balance, transactions, and ERC-20 tokens in parallel with timeout
    const fetchAll = Promise.all([
      etherscanFetch(`module=account&action=balance&address=${address}&tag=latest`, 15),
      etherscanFetch(`module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc`, 30),
      etherscanFetch(`module=account&action=tokentx&address=${address}&page=1&offset=10&startblock=0&endblock=99999999&sort=desc`, 30),
    ])

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
    )

    const [balanceData, txData, tokenData] = await Promise.race([fetchAll, timeout])

    // ETH balance
    const balanceWei = balanceData.status === "1" ? balanceData.result : "0"
    const balanceEth = Number(balanceWei) / 1e18

    // Recent transactions
    const transactions = (txData.status === "1" && Array.isArray(txData.result))
      ? txData.result.map((tx: Record<string, string>) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          fromLabel: shortenAddress(tx.from),
          toLabel: shortenAddress(tx.to),
          value: Number(tx.value) / 1e18,
          timestamp: Number(tx.timeStamp) * 1000,
          isError: tx.isError === "1",
          method: tx.functionName?.split("(")[0] ?? (Number(tx.value) > 0 ? "transfer" : "contract"),
        }))
      : []

    // Recent token transfers - aggregate unique tokens
    const tokenMap = new Map<string, { symbol: string; name: string; balance: number; decimals: number }>()
    if (tokenData.status === "1" && Array.isArray(tokenData.result)) {
      for (const t of tokenData.result) {
        const key = t.contractAddress.toLowerCase()
        if (!tokenMap.has(key)) {
          tokenMap.set(key, {
            symbol: t.tokenSymbol,
            name: t.tokenName,
            balance: 0,
            decimals: Number(t.tokenDecimal),
          })
        }
      }
    }

    const recentTokens = Array.from(tokenMap.values()).slice(0, 10)

    const responseData = {
      address,
      balanceEth,
      transactions,
      recentTokens,
    }

    // Populate cache
    cache.set(address, { data: responseData, timestamp: Date.now() })

    return NextResponse.json(responseData)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch wallet data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
