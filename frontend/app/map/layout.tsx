import { Navbar } from "@/app/components/NavBar"
import { auth } from "@/auth"

export default async function MapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  return (
    <>
      <Navbar user={session?.user} />
      {children}
    </>
  )
}
