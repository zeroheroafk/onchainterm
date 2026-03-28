import { NextResponse } from "next/server"

// Known exchange/entity labels
const KNOWN_LABELS: Record<string, string> = {
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance 36",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance 16",
  "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": "Binance 17",
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance 7",
  "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance 8",
  "0x5a52e96bacdabb82fd05763e25335261b270efcb": "Binance 12",
  "0xa7efae728d2936e78bda97dc267687568dd593f3": "OKX",
  "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": "OKX 2",
  "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase 1",
  "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase 3",
  "0x1b3cb81e51011b549d78bf720b0d924ac763a7c2": "Coinbase Prime",
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase 10",
  "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken 4",
  "0xae2fc483527b8ef99eb5d9b44875f005ba1fae13": "Kraken 6",
  "0x40b38765696e3d5d8d9d834d8aad4bb6e418e489": "Robinhood",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch Router",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap Router",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Exchange",
  "0x3cd751e6b0078be393132286c442345e68ff0aaa": "Lido",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "Lido stETH",
  "0x00000000219ab540356cbb839cbe05303d7705fa": "ETH2 Deposit",
  "0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a": "Arbitrum Bridge",
  "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf": "Polygon Bridge",
  "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": "Optimism Bridge",
  "0x49048044d57e1c92a77f79988d21fa8faf74e97e": "Base Bridge",
  "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf": "Bybit",
  "0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98": "Bitfinex 1",
  "0x742d35cc6634c0532925a3b844bc9e7595f2bd1e": "Bitfinex 2",
  "0x0716a17fbaee714f1e6ab0f9d59edbc5f09815c0": "Gate.io",
  "0xd24400ae8bfebb18ca49be86258a3c749cf46853": "Gemini 4",
  "0x6262998ced04146fa42253a5c0af90ca02dfd2a3": "Crypto.com",
}

interface BlockTx {
  hash: string
  from: string
  to: string
  value: string
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getLabel(addr: string): string {
  return KNOWN_LABELS[addr.toLowerCase()] || shortenAddress(addr)
}

const ETHERSCAN_BASE = "https://api.etherscan.io/api"

async function etherscanCall(params: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) throw new Error("Etherscan API key not configured")
  const res = await fetch(`${ETHERSCAN_BASE}?${params}&apikey=${apiKey}`, {
    next: { revalidate: 15 },
  })
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    // 1. Get latest block number
    const blockNumData = await etherscanCall("module=proxy&action=eth_blockNumber")
    const latestBlock = parseInt(blockNumData.result as string, 16)

    // 2. Fetch last 15 blocks (~3 min) in batches of 3 to respect rate limits
    const BLOCKS_TO_SCAN = 15
    const BATCH_SIZE = 3
    const blockNumbers = Array.from({ length: BLOCKS_TO_SCAN }, (_, i) => latestBlock - i)

    const allTxs: {
      hash: string
      from: string
      to: string
      value: number
      timestamp: number
      fromLabel: string
      toLabel: string
      block: number
    }[] = []

    for (let i = 0; i < blockNumbers.length; i += BATCH_SIZE) {
      const batch = blockNumbers.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (blockNum) => {
          const hexBlock = "0x" + blockNum.toString(16)
          const data = await etherscanCall(
            `module=proxy&action=eth_getBlockByNumber&tag=${hexBlock}&boolean=true`
          )
          return data.result as {
            transactions: BlockTx[]
            timestamp: string
            number: string
          } | null
        })
      )

      for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) continue
        const block = result.value
        const blockTimestamp = parseInt(block.timestamp, 16) * 1000
        const blkNum = parseInt(block.number, 16)

        for (const tx of block.transactions) {
          const valueWei = parseInt(tx.value, 16)
          const valueEth = valueWei / 1e18
          if (valueEth < 50) continue

          allTxs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to || "Contract Creation",
            value: valueEth,
            timestamp: blockTimestamp,
            fromLabel: getLabel(tx.from),
            toLabel: tx.to ? getLabel(tx.to) : "Contract Creation",
            block: blkNum,
          })
        }
      }
    }

    allTxs.sort((a, b) => b.value - a.value)

    return NextResponse.json({
      transactions: allTxs.slice(0, 30),
      latestBlock,
      blocksScanned: BLOCKS_TO_SCAN,
    })
  } catch (err) {
    console.error("[whales] fatal:", err)
    const message = err instanceof Error ? err.message : "Failed to fetch whale data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
