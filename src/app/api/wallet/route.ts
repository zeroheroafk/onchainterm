import { NextRequest, NextResponse } from "next/server"

const ETHERSCAN_URL = "https://api.etherscan.io/api"

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Etherscan API key not configured" }, { status: 500 })
  }

  const address = req.nextUrl.searchParams.get("address")
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 })
  }

  try {
    // Fetch balance, transactions, and ERC-20 tokens in parallel
    const [balanceRes, txRes, tokenRes] = await Promise.all([
      fetch(`${ETHERSCAN_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`, { next: { revalidate: 15 } }),
      fetch(`${ETHERSCAN_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc&apikey=${apiKey}`, { next: { revalidate: 30 } }),
      fetch(`${ETHERSCAN_URL}?module=account&action=tokentx&address=${address}&page=1&offset=10&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`, { next: { revalidate: 30 } }),
    ])

    const [balanceData, txData, tokenData] = await Promise.all([
      balanceRes.json(),
      txRes.json(),
      tokenRes.json(),
    ])

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
          method: tx.functionName ? tx.functionName.split("(")[0] : (Number(tx.value) > 0 ? "transfer" : "contract"),
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

    return NextResponse.json({
      address,
      balanceEth,
      transactions,
      recentTokens,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch wallet data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
