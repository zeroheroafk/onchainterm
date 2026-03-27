import { NextResponse } from "next/server"

const ETHERSCAN_URL = "https://api.etherscan.io/api"

// Major exchange hot wallets
const EXCHANGES: { name: string; addresses: string[] }[] = [
  { name: "Binance", addresses: ["0x28C6c06298d514Db089934071355E5743bf21d60", "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549"] },
  { name: "Coinbase", addresses: ["0x503828976D22510aad0201ac7EC88293211D23Da", "0xddfAbCdc4D8FfC6d5beaf154f18B778f892A0740"] },
  { name: "Kraken", addresses: ["0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0", "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13"] },
  { name: "OKX", addresses: ["0xA7EFAe728D2936e78BDA97dc267687568dD593f3", "0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b"] },
]

export async function GET() {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Etherscan API key not configured" }, { status: 500 })
  }

  try {
    const exchangeFlows: {
      name: string
      balanceEth: number
      inflow24h: number
      outflow24h: number
      netFlow: number
    }[] = []

    // Fetch balances for each exchange (first address as representative)
    for (const exchange of EXCHANGES) {
      const addr = exchange.addresses[0]

      // Get balance
      const balRes = await fetch(
        `${ETHERSCAN_URL}?module=account&action=balance&address=${addr}&tag=latest&apikey=${apiKey}`,
        { next: { revalidate: 60 } }
      )
      const balData = await balRes.json()
      const balanceEth = balData.status === "1" ? Number(balData.result) / 1e18 : 0

      // Get recent transactions to calculate inflow/outflow
      const txRes = await fetch(
        `${ETHERSCAN_URL}?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`,
        { next: { revalidate: 60 } }
      )
      const txData = await txRes.json()

      let inflow = 0
      let outflow = 0
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400
      const addrLower = addr.toLowerCase()
      const allAddrsLower = exchange.addresses.map(a => a.toLowerCase())

      if (txData.status === "1" && Array.isArray(txData.result)) {
        for (const tx of txData.result) {
          if (Number(tx.timeStamp) < oneDayAgo) continue
          if (tx.isError === "1") continue
          const valueEth = Number(tx.value) / 1e18
          if (valueEth === 0) continue

          if (allAddrsLower.includes(tx.to.toLowerCase()) && !allAddrsLower.includes(tx.from.toLowerCase())) {
            inflow += valueEth
          } else if (allAddrsLower.includes(tx.from.toLowerCase()) && !allAddrsLower.includes(tx.to.toLowerCase())) {
            outflow += valueEth
          }
        }
      }

      exchangeFlows.push({
        name: exchange.name,
        balanceEth,
        inflow24h: inflow,
        outflow24h: outflow,
        netFlow: inflow - outflow,
      })
    }

    const totalNet = exchangeFlows.reduce((s, e) => s + e.netFlow, 0)

    return NextResponse.json({ exchanges: exchangeFlows, totalNetFlow: totalNet })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch exchange flow data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
