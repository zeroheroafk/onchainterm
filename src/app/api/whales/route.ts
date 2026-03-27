import { NextResponse } from "next/server"

const ETHERSCAN_URL = "https://api.etherscan.io/api"

// Known whale/exchange wallets to monitor
const WHALE_WALLETS: { address: string; label: string }[] = [
  { address: "0x28C6c06298d514Db089934071355E5743bf21d60", label: "Binance 14" },
  { address: "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549", label: "Binance 36" },
  { address: "0xDFd5293D8e347dFe59E90eFd55b2956a1343963d", label: "Binance 16" },
  { address: "0x56Eddb7aa87536c09CCc2793473599fD21A8b17F", label: "Binance 17" },
  { address: "0xA7EFAe728D2936e78BDA97dc267687568dD593f3", label: "OKX" },
  { address: "0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b", label: "OKX 2" },
  { address: "0x503828976D22510aad0201ac7EC88293211D23Da", label: "Coinbase 1" },
  { address: "0xddfAbCdc4D8FfC6d5beaf154f18B778f892A0740", label: "Coinbase 3" },
  { address: "0x1B3cB81E51011b549d78bf720b0d924ac763A7C2", label: "Coinbase Prime" },
  { address: "0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0", label: "Kraken 4" },
  { address: "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13", label: "Kraken 6" },
  { address: "0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489", label: "Robinhood" },
  { address: "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", label: "Binance 7" },
]

interface EtherscanTx {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  isError: string
  functionName: string
}

export async function GET() {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Etherscan API key not configured" }, { status: 500 })
  }

  try {
    // Pick 4 random wallets to check (to stay within rate limits)
    const shuffled = [...WHALE_WALLETS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 4)

    const allTxs: {
      hash: string
      from: string
      to: string
      value: number
      timestamp: number
      fromLabel: string
      toLabel: string
    }[] = []

    const labelMap = new Map(WHALE_WALLETS.map(w => [w.address.toLowerCase(), w.label]))

    // Fetch recent transactions from selected wallets
    const results = await Promise.allSettled(
      selected.map(async (wallet) => {
        const url = `${ETHERSCAN_URL}?module=account&action=txlist&address=${wallet.address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`
        const res = await fetch(url, { next: { revalidate: 30 } })
        if (!res.ok) return []
        const data = await res.json()
        if (data.status !== "1" || !data.result) return []
        return data.result as EtherscanTx[]
      })
    )

    for (const result of results) {
      if (result.status !== "fulfilled") continue
      for (const tx of result.value) {
        if (tx.isError === "1") continue
        const valueEth = Number(tx.value) / 1e18
        if (valueEth < 100) continue // Only show transfers >= 100 ETH

        allTxs.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: valueEth,
          timestamp: Number(tx.timeStamp) * 1000,
          fromLabel: labelMap.get(tx.from.toLowerCase()) || shortenAddress(tx.from),
          toLabel: labelMap.get(tx.to.toLowerCase()) || shortenAddress(tx.to),
        })
      }
    }

    // Sort by timestamp descending and limit to 20
    allTxs.sort((a, b) => b.timestamp - a.timestamp)
    const top = allTxs.slice(0, 20)

    return NextResponse.json({ transactions: top })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch whale data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
