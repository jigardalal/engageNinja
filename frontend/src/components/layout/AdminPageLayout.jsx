import React from 'react'
import AppShell from './AppShell'
import PageHeader from './PageHeader'

const AdminPageLayout = ({
  shellTitle,
  shellSubtitle,
  hero = {},
  children
}) => {
  const {
    icon,
    title = shellTitle,
    description,
    helper,
    actions
  } = hero

  return (
    <AppShell title={shellTitle} subtitle={shellSubtitle} hideTitleBlock>
      <PageHeader
        icon={icon}
        title={title}
        description={description}
        helper={helper}
        actions={actions}
      />
      <div className="mt-6 space-y-6">
        {children}
      </div>
    </AppShell>
  )
}

export default AdminPageLayout
