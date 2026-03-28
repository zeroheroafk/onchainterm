/**
 * Etherscan API helper — tries v2 first, falls back to v1
 */
export async function etherscanFetch(params: string, revalidate = 15): Promise<Record<string, unknown>> {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) throw new Error("Etherscan API key not configured")

  const urls = [
    `https://api.etherscan.io/v2/api?chainid=1&${params}&apikey=${apiKey}`,
    `https://api.etherscan.io/api?${params}&apikey=${apiKey}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate } })
      if (!res.ok) continue
      const data = await res.json()
      // proxy module returns .result directly without .status
      if (data.result !== undefined) return data
    } catch {
      continue
    }
  }

  throw new Error("Etherscan API unreachable")
}
