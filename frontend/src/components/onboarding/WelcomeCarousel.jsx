import React, { useState } from 'react'
import { Dialog, Button, Badge } from '../ui'
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle, ArrowRight } from 'lucide-react'

/**
 * WelcomeCarousel Component
 *
 * Post-signup onboarding carousel (3 steps):
 * 1. Welcome + Free plan features
 * 2. Create first campaign prompt
 * 3. Paid plan feature showcase
 *
 * Usage:
 * const [showWelcome, setShowWelcome] = useState(true);
 * <WelcomeCarousel
 *   open={showWelcome}
 *   onComplete={() => {
 *     setShowWelcome(false);
 *     localStorage.setItem('welcome_carousel_completed', 'true');
 *   }}
 *   onStartTrial={() => navigate('/campaigns/new')}
 *   onViewPlans={() => navigate('/settings?tab=billing')}
 * />
 */
export default function WelcomeCarousel({
  open = true,
  onComplete,
  onStartTrial,
  onViewPlans,
  userName = ''
}) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Welcome to EngageNinja',
      subtitle: 'Your AI-first customer engagement platform',
      content: (
        <div className="space-y-6">
          <p className="text-lg text-[var(--text)]">
            {userName ? `Hi ${userName}!` : 'Get started'} with powerful messaging tools to engage your customers.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-[var(--text)]">Your Free Plan includes:</h4>
            {[
              'Send WhatsApp messages',
              'Send email campaigns',
              'Send SMS messages',
              'Manage up to 100 contacts',
              'Basic campaign analytics'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-[var(--text)]">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      cta: 'Next',
      action: () => setStep(1)
    },
    {
      title: 'Create Your First Campaign',
      subtitle: 'Send your first message in minutes',
      content: (
        <div className="space-y-6">
          <p className="text-lg text-[var(--text)]">
            Campaigns help you send personalized messages to your audience at scale.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-[var(--text)]">You can:</h4>
            {[
              'Choose WhatsApp, Email, or SMS',
              'Select contacts by tags or all',
              'Preview before sending',
              'Track delivery and engagement'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-[var(--text)]">{feature}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-xs text-primary-700 dark:text-primary-300">
              💡 Tip: Start with a small test campaign to see how it works.
            </p>
          </div>
        </div>
      ),
      cta: 'Create Campaign',
      action: onStartTrial
    },
    {
      title: 'Unlock Advanced Features',
      subtitle: 'Scale with Starter, Growth, and Pro plans',
      content: (
        <div className="space-y-6">
          <p className="text-lg text-[var(--text)]">
            As you grow, unlock powerful features to scale your messaging:
          </p>

          <div className="space-y-4">
            {[
              {
                plan: 'Starter',
                price: '$49/mo',
                features: ['Schedule campaigns', 'Workflow automation', '10x more messages', '250 WhatsApp • 10K email • 500 SMS']
              },
              {
                plan: 'Growth',
                price: '$129/mo',
                features: ['Bulk actions', 'Advanced automation', '40x more messages', '1K WhatsApp • 50K email • 2K SMS']
              },
              {
                plan: 'Pro',
                price: '$299/mo',
                features: ['Unlimited everything', 'Priority support', 'API access', '5K WhatsApp • 200K email • 10K SMS']
              }
            ].map((tier, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-[var(--border)] bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-[var(--text)]">{tier.plan}</h5>
                  <span className="text-xs font-bold text-primary-600">{tier.price}</span>
                </div>
                <ul className="text-xs space-y-1">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="text-[var(--text-muted)]">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ),
      cta: 'See Plans',
      action: onViewPlans
    }
  ]

  const currentStep = steps[step]

  const handleClose = () => {
    if (onComplete) onComplete()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title=""
      description=""
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-8 rounded-full transition-colors ${
                  idx === step ? 'bg-primary-600' : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}

            {step < steps.length - 1 ? (
              <Button
                onClick={currentStep.action}
                className="bg-primary-600 hover:bg-primary-700 text-white gap-1"
              >
                {currentStep.cta}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleClose}>
                  Skip
                </Button>
                <Button
                  onClick={currentStep.action}
                  className="bg-primary-600 hover:bg-primary-700 text-white gap-1"
                >
                  {currentStep.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/20">
            <Sparkles className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">{currentStep.title}</h2>
            <p className="text-xs text-[var(--text-muted)]">{currentStep.subtitle}</p>
          </div>
        </div>

        <div>{currentStep.content}</div>
      </div>
    </Dialog>
  )
}
