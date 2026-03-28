/**
 * Etherscan API helper — uses V2 endpoint.
 * V2 base: https://api.etherscan.io/v2/api
 * Requires chainid=1 for Ethereum mainnet.
 */
export async function etherscanFetch(params: string, revalidate = 15): Promise<Record<string, unknown>> {
  const apiKey = process.env.ETHERSCAN_API_KEY

  const base = "https://api.etherscan.io/v2/api"
  // Add chainid=1 (Ethereum mainnet) if not already present
  const chainParam = params.includes("chainid=") ? "" : "&chainid=1"
  const keyParam = apiKey ? `&apikey=${apiKey}` : ""
  const url = `${base}?${params}${chainParam}${keyParam}`

  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
  const data = await res.json()

  // Etherscan returns status "0" or message "NOTOK" on errors
  if (data.status === "0" || data.message === "NOTOK") {
    const errMsg = typeof data.result === "string" ? data.result : data.message
    throw new Error(`Etherscan API error: ${errMsg}`)
  }

  if (data.result !== undefined) return data
  throw new Error("Etherscan: unexpected response format")
}
