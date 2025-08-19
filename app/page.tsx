import Link from "next/link"
import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Book, LucideBook, LandmarkIcon, MessageSquare, Info, ScaleIcon } from 'lucide-react'

export default function IndexPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="relative mb-8 h-[400px] overflow-hidden rounded-lg sm:h-[300px]">
        <div className="absolute inset-0">
          <img
            src="SC-b6-1.jpg"
            alt="Supreme Court of Pakistan"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-background/90" />
        </div>
        <div className="relative z-10 flex h-full max-w-[980px] flex-col justify-center p-4 sm:p-6">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-4xl">
            Welcome to Government GPT <br className="hidden sm:inline" />
            Your Digital Assistant for Government Policies
          </h1>
          <p className="mt-4 max-w-[700px] text-base text-muted-foreground sm:text-lg">
            Get instant, accurate answers to your government-related queries based on official policies and regulations.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/chat"
          className={buttonVariants({ 
            variant: "default",
            size: "lg",
            className: "w-full sm:w-auto"
          })}
        >
          <MessageSquare className="mr-2 size-6" />
          Start Chatting
        </Link>
        
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Book className="mr-2 size-5" />
              Instant Query Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Get quick and accurate answers to your government-related queries, making information easily accessible.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScaleIcon className="mr-2 size-5" />
              Guidelines & Documents Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Browse essential guidelines and official documents to stay informed about policies and procedures.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LandmarkIcon className="mr-2 size-5" />
              Laws & Policy Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Get precise and up-to-date details on government rules, regulations, and compliance requirements based on official documents.</p>
          </CardContent>
        </Card>
      </div>

    </section>
  )
}

