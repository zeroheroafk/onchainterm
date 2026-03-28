/**
 * Etherscan API helper — uses v1 endpoint
 */
export async function etherscanFetch(params: string, revalidate = 15): Promise<Record<string, unknown>> {
  const apiKey = process.env.ETHERSCAN_API_KEY
  if (!apiKey) throw new Error("Etherscan API key not configured")

  const url = `https://api.etherscan.io/api?${params}&apikey=${apiKey}`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
  const data = await res.json()
  if (data.result !== undefined) return data
  throw new Error("Etherscan: unexpected response format")
}
