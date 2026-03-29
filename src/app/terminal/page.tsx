import { TerminalPageClient } from "@/components/terminal-page-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "OnchainTerm — Terminal",
  description: "Real-time cryptocurrency market intelligence terminal",
}

export default function TerminalPage() {
  return <TerminalPageClient />
}
