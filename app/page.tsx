import Link from 'next/link'

const tools = [
  {
    name: 'YouTube Summarizer',
    href: '/youtube-summarizer',
    icon: '▶',
  },
  {
    name: 'Diff Checker',
    href: '/diff-checker',
    icon: '◆',
  },
  {
    name: 'Translator',
    href: '/translator',
    icon: '⇄',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Toolkit</h1>
          <p className="mt-3 text-foreground/50">
            Personal tools for everyday use.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl transition-all hover:bg-foreground/[0.06] hover:scale-[1.05]"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/10 text-3xl group-hover:bg-foreground/15 transition-colors">
                {tool.icon}
              </span>
              <span className="px-2 text-center text-xs font-bold text-foreground/60 group-hover:text-foreground/90 transition-colors">
                {tool.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
