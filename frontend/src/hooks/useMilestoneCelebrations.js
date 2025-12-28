import { useEffect } from 'react'
import { toast } from '../components/ui'
import { useAuth } from '../context/AuthContext'

/**
 * Hook to track and celebrate user milestones
 *
 * Monitors user activity (campaigns, contacts, messages) and shows
 * celebratory toast notifications at key milestones.
 *
 * Milestones:
 * - First campaign sent
 * - 5, 10, 25, 50 campaigns sent
 * - 50, 100, 500 contacts added
 * - 500, 1000, 5000 messages sent
 *
 * Usage:
 * const { checkMilestone } = useMilestoneCelebrations();
 * useEffect(() => {
 *   checkMilestone('campaigns', totalCampaigns);
 * }, [totalCampaigns]);
 */
export function useMilestoneCelebrations() {
  const { activeTenant } = useAuth()

  const MILESTONES = {
    campaigns: [1, 5, 10, 25, 50],
    contacts: [50, 100, 500],
    messages: [500, 1000, 5000]
  }

  const MILESTONE_MESSAGES = {
    campaigns: {
      1: { title: '🚀 First Campaign Sent!', description: 'You\'re off to a great start. Keep the momentum going!' },
      5: { title: '🎯 5 Campaigns Down!', description: 'You\'re building a solid track record.' },
      10: { title: '⚡ 10 Campaigns Mastered!', description: 'Pro users automate workflows at this stage.' },
      25: { title: '🌟 25 Campaigns Complete!', description: 'Your messaging strategy is taking shape.' },
      50: { title: '🏆 50 Campaigns Achievement!', description: 'You\'re a messaging power user.' }
    },
    contacts: {
      50: { title: '👥 50 Contacts!', description: 'Your audience is growing.' },
      100: { title: '📈 100 Contacts Reached!', description: 'Your growth is accelerating.' },
      500: { title: '🌍 500 Contacts!', description: 'Consider pro features for advanced segmentation.' }
    },
    messages: {
      500: { title: '📱 500 Messages Sent!', description: 'Your campaigns are having impact.' },
      1000: { title: '🎉 1000 Messages!', description: 'You\'re scaling your reach.' },
      5000: { title: '🚀 5000 Messages!', description: 'Enterprise users start here. Ready to upgrade?' }
    }
  }

  const getStorageKey = (type, milestone) => {
    return `milestone_${activeTenant}_${type}_${milestone}`
  }

  const isMilestoneAchieved = (type, milestone) => {
    return localStorage.getItem(getStorageKey(type, milestone)) === 'true'
  }

  const markMilestoneAchieved = (type, milestone) => {
    localStorage.setItem(getStorageKey(type, milestone), 'true')
  }

  const checkMilestone = (type, currentValue) => {
    if (!activeTenant || !MILESTONES[type]) return

    MILESTONES[type].forEach(milestone => {
      // Only trigger if value just reached or exceeded milestone
      if (currentValue >= milestone && !isMilestoneAchieved(type, milestone)) {
        markMilestoneAchieved(type, milestone)
        const message = MILESTONE_MESSAGES[type]?.[milestone]

        if (message) {
          toast({
            title: message.title,
            description: message.description,
            variant: 'success'
          })
        }
      }
    })
  }

  return { checkMilestone }
}
