import React from 'react'
import MarketingShell from '../components/layout/MarketingShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge
} from '../components/ui'
import { BookOpen, Video, Globe } from 'lucide-react'

const posts = [
  { title: 'WhatsApp Marketing 101', tag: 'Guide' },
  { title: 'Resend Uplift Playbook', tag: 'Playbook' },
  { title: 'API Quickstart', tag: 'Developers' },
]

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <section className="space-y-3 pt-6">
        <Badge variant="primary" className="inline-flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Resources
        </Badge>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-[var(--text)] leading-tight">Guides, webinars, and docs that teach WhatsApp + Email mastery.</h1>
          <p className="text-lg text-[var(--text-muted)] max-w-3xl">
            Learn how to launch campaigns, prove uplift, and integrate with our APIs. We bundle playbooks, deep dives, and demo recordings for every team type.
          </p>
        </div>
      </section>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post.title} variant="glass" className="h-full">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs uppercase">{post.tag}</Badge>
                <div className="flex-1 h-px bg-[var(--border)]"></div>
              </div>
              <h3 className="text-[var(--text)] font-semibold text-lg">{post.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">Coming soon</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-10 space-y-4">
        <Card variant="glass">
          <CardHeader className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary-500" />
            <CardTitle className="text-xl">Webinars & case studies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
            <p>Register for upcoming sessions to see how teams prove uplift with real WhatsApp + Email sequences.</p>
            <p>Download templates, playbooks, and API pattern notes to accelerate your automation.</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary-500" />
            <CardTitle className="text-xl">Community support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--text-muted)]">
            <p>Join the EngageNinja workspace community on Slack for live feedback, templates, and launch recipes.</p>
            <p>Reach out for custom playbooks that match your workflows.</p>
          </CardContent>
        </Card>
      </section>
    </MarketingShell>
  )
}
