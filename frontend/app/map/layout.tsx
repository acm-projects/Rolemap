import { AuthenticatedNavbar } from "@/app/components/AuthenticatedNavbar"

export default function MapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AuthenticatedNavbar />
      {children}
    </>
  )
}
