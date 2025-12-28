/**
 * Conversion Copy Constants
 *
 * Centralized messaging for consistency across all upgrade prompts.
 * Used by components to maintain consistent tone and value propositions.
 *
 * Structure organized by feature and audience tier.
 */

export const CONVERSION_COPY = {
  // Usage alert messages at different thresholds
  usageAlerts: {
    70: {
      whatsapp: {
        title: '📈 You\'re scaling fast!',
        message: 'You\'ve used 70% of your WhatsApp messages. Growing this fast? Upgrade for 10x more capacity.',
        cta: 'Upgrade Plan'
      },
      email: {
        title: '📈 You\'re scaling fast!',
        message: 'You\'ve used 70% of your email quota. More campaigns needed? Upgrade for 20x more messages.',
        cta: 'Upgrade Plan'
      },
      sms: {
        title: '📈 Great momentum!',
        message: 'You\'ve used 70% of your SMS limit. Upgrade for 10x more reach.',
        cta: 'Upgrade Plan'
      }
    },
    80: {
      whatsapp: {
        title: '⚠️ Getting close to your limit',
        message: 'You\'re at 80% of your WhatsApp capacity. Upgrade now to avoid running out.',
        cta: 'See Plans'
      },
      email: {
        title: '⚠️ Getting close to your limit',
        message: 'You\'re at 80% of your email quota. Upgrade to keep your campaigns flowing.',
        cta: 'See Plans'
      },
      sms: {
        title: '⚠️ Getting close to your limit',
        message: 'You\'re at 80% of your SMS quota. Upgrade to continue reaching customers.',
        cta: 'See Plans'
      }
    },
    90: {
      whatsapp: {
        title: '🚨 Almost out of messages!',
        message: 'You\'re at 90% of your WhatsApp limit. Upgrade immediately to avoid interruptions.',
        cta: 'Upgrade Now'
      },
      email: {
        title: '🚨 Almost out of messages!',
        message: 'You\'re at 90% of your email quota. Upgrade now to keep sending.',
        cta: 'Upgrade Now'
      },
      sms: {
        title: '🚨 Almost out of messages!',
        message: 'You\'re at 90% of your SMS limit. Upgrade now to continue.',
        cta: 'Upgrade Now'
      }
    }
  },

  // Feature lock messages
  featureLocks: {
    scheduledSending: {
      title: 'Schedule Sends',
      benefits: [
        'Schedule campaigns to send at optimal times',
        'Set up recurring sends for regular campaigns',
        'Automate your messaging workflow'
      ],
      upgradeMessage: 'Scheduled sending is a Starter feature. Upgrade to schedule your campaigns.'
    },
    bulkActions: {
      title: 'Bulk Campaign Actions',
      benefits: [
        'Archive multiple campaigns at once',
        'Manage campaigns more efficiently',
        'Advanced campaign controls'
      ],
      upgradeMessage: 'Bulk actions require a Growth plan. Upgrade to manage campaigns in bulk.'
    },
    resendToNonReaders: {
      title: 'Resend to Non-Readers',
      benefits: [
        'Target contacts who didn\'t read your message',
        'Improve engagement with smart resends',
        'Boost read rates by up to 40%'
      ],
      upgradeMessage: 'Resend workflows are available on Starter and above.'
    },
    apiAccess: {
      title: 'API Access',
      benefits: [
        'Integrate EngageNinja with your tools',
        'Build custom automations',
        'Access real-time analytics'
      ],
      upgradeMessage: 'API access is a Pro feature. Upgrade to integrate with your workflow.'
    }
  },

  // Milestone celebration messages
  milestones: {
    campaigns: {
      1: {
        title: '🚀 First Campaign Sent!',
        description: 'You\'ve launched your first campaign. Welcome to EngageNinja!'
      },
      5: {
        title: '🎯 5 Campaigns Down!',
        description: 'You\'re building momentum. Keep it up!'
      },
      10: {
        title: '⚡ 10 Campaigns Mastered!',
        description: 'Pro users automate workflows at this stage. Ready to level up?'
      },
      25: {
        title: '🌟 25 Campaigns Complete!',
        description: 'Your messaging strategy is taking shape.'
      },
      50: {
        title: '🏆 50 Campaigns Achievement!',
        description: 'You\'re a messaging power user. Consider Pro features.'
      }
    },
    contacts: {
      50: {
        title: '👥 50 Contacts!',
        description: 'Your audience is growing. Great start!'
      },
      100: {
        title: '📈 100 Contacts Reached!',
        description: 'Your network is expanding.'
      },
      500: {
        title: '🌍 500 Contacts!',
        description: 'Consider advanced features for better segmentation.'
      }
    },
    messages: {
      500: {
        title: '📱 500 Messages Sent!',
        description: 'Your campaigns are making an impact.'
      },
      1000: {
        title: '🎉 1000 Messages!',
        description: 'You\'re scaling your reach.'
      },
      5000: {
        title: '🚀 5000 Messages!',
        description: 'Enterprise users start here. Ready to upgrade?'
      }
    }
  },

  // Plan-specific messaging
  plans: {
    free: {
      tagline: 'Get started with the essentials',
      benefits: [
        'Send WhatsApp, email, and SMS',
        'Up to 100 contacts',
        'Basic campaign analytics',
        'Perfect for testing'
      ]
    },
    starter: {
      tagline: 'Scale your messaging',
      benefits: [
        '250 WhatsApp • 10K email • 500 SMS per month',
        'Schedule campaigns',
        'Basic automation',
        'Up to 500 contacts',
        'Up to 2 team members'
      ]
    },
    growth: {
      tagline: 'Grow with confidence',
      benefits: [
        '1K WhatsApp • 50K email • 2K SMS per month',
        'Advanced automation',
        'Bulk campaign actions',
        'Up to 2,500 contacts',
        'Up to 5 team members'
      ]
    },
    pro: {
      tagline: 'Go unlimited',
      benefits: [
        '5K WhatsApp • 200K email • 10K SMS per month',
        'API access',
        'Priority support',
        'Unlimited contacts',
        'Unlimited team members'
      ]
    }
  },

  // CTA button variations (for A/B testing)
  ctaVariants: {
    conservative: [
      'See Plans',
      'Learn More',
      'Compare Plans',
      'Maybe Later'
    ],
    aggressive: [
      'Upgrade Now',
      'Get More',
      'Unlock Premium',
      'Try Pro Free'
    ],
    benefit: [
      'Send More Messages',
      'Scale Your Reach',
      'Automate Faster',
      'Unlock Features'
    ]
  },

  // Email trigger messages
  emailTriggers: {
    usage80: {
      subject: 'You\'re approaching your usage limit',
      preheader: 'Don\'t run out of messages next month',
      title: 'Growing Fast? Your Usage is at 80%',
      message: 'You\'re scaling well! At your current pace, you\'ll exceed your plan limits next month.',
      cta: 'Explore Premium Plans'
    },
    usage95: {
      subject: '🚨 Urgent: You\'re almost out of messages',
      preheader: 'Upgrade now to keep sending',
      title: 'Critical: You\'re at 95% of Your Limit',
      message: 'You\'re about to run out of messages. Upgrade immediately to avoid interruptions.',
      cta: 'Upgrade Now'
    },
    milestone5: {
      subject: '🎯 Congrats on 5 campaigns!',
      preheader: 'And why you should upgrade next',
      title: 'You\'ve Sent 5 Campaigns!',
      message: 'Awesome! You\'re finding product-market fit. Now is the perfect time to automate with Starter.',
      cta: 'View Starter Plan'
    },
    featureLockAttempt: {
      subject: 'Ready to schedule your campaigns?',
      preheader: 'It\'s a game-changer',
      title: 'Tried Scheduled Sending?',
      message: 'You attempted to use a Pro feature. Scheduling campaigns is available on Starter and up.',
      cta: 'Upgrade to Starter'
    }
  }
};

/**
 * Get copy for a specific context
 * @param {string} context - The context (e.g., 'usageAlerts.70.whatsapp')
 * @returns {object} - The copy object
 */
export function getCopy(context) {
  const keys = context.split('.');
  let value = CONVERSION_COPY;

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}

/**
 * Get random CTA button text for A/B testing
 * @param {string} variant - 'conservative', 'aggressive', or 'benefit'
 * @returns {string} - Random CTA text from variant
 */
export function getRandomCTA(variant = 'conservative') {
  const ctaList = CONVERSION_COPY.ctaVariants[variant] || CONVERSION_COPY.ctaVariants.conservative;
  return ctaList[Math.floor(Math.random() * ctaList.length)];
}
