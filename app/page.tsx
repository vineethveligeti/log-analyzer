"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page
    router.push("/login")
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Shield className="h-12 w-12 text-purple-600" />
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <div className="text-center">
              <p className="font-medium">HDFS Log Analyzer</p>
              <p className="text-sm text-gray-600">Redirecting to login...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
