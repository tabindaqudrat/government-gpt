export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Govt-GPT",
  description:
    "A chatbot that answers questions about KP government policies, services.",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Chat",
      href: "/chat",
    },
    

    {
      title: "Acts",
      href: "/bills",
    }
  ],
  links: {
    twitter: "https://twitter.com/codeforpakistan",
    github: "https://github.com/codeforpakistan/Govt-GPT-next",
  },
}
