import { AdminPanel } from "@/components/admin/admin-panel"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "OnchainTerm — Admin",
  description: "Admin panel for managing verification requests",
}

export default function AdminPage() {
  return <AdminPanel />
}
