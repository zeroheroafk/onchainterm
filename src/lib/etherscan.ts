/**
 * Etherscan API helper — uses v1 endpoint.
 * Works without API key (rate-limited to 1 req/5s) or with key (5 req/s).
 */
export async function etherscanFetch(params: string, revalidate = 15): Promise<Record<string, unknown>> {
  const apiKey = process.env.ETHERSCAN_API_KEY

  // Build URL — works without API key at a lower rate limit
  const url = apiKey
    ? `https://api.etherscan.io/api?${params}&apikey=${apiKey}`
    : `https://api.etherscan.io/api?${params}`

  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
  const data = await res.json()

  // Etherscan returns status "0" or message "NOTOK" on errors (invalid key, rate limit, etc.)
  if (data.status === "0" || data.message === "NOTOK") {
    const errMsg = typeof data.result === "string" ? data.result : data.message
    // If API key is invalid, retry without it
    if (apiKey && (errMsg.includes("Invalid API") || errMsg === "NOTOK")) {
      console.warn("[etherscan] API key invalid, retrying without key")
      const fallbackUrl = `https://api.etherscan.io/api?${params}`
      const fallbackRes = await fetch(fallbackUrl, { next: { revalidate } })
      if (!fallbackRes.ok) throw new Error(`Etherscan HTTP ${fallbackRes.status}`)
      const fallbackData = await fallbackRes.json()
      if (fallbackData.status === "0" || fallbackData.message === "NOTOK") {
        throw new Error(`Etherscan API error: ${fallbackData.result || fallbackData.message}`)
      }
      return fallbackData
    }
    throw new Error(`Etherscan API error: ${errMsg}`)
  }

  if (data.result !== undefined) return data
  throw new Error("Etherscan: unexpected response format")
}
