import React from 'react'
import { useQuery } from '@keystone-6/core/admin-ui/apollo'
import { POST_IDEA_FEATURE } from './feature-flags'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'
import {
  ListNavItems,
  NavigationContainer,
  NavItem,
} from '@keystone-6/core/admin-ui/components'

export const components = {
  Navigation({ authenticatedItem, lists }: NavigationProps) {
    const { data } = useQuery(POST_IDEA_FEATURE, { skip: !authenticatedItem })
    return (
      <NavigationContainer authenticatedItem={authenticatedItem}>
        <NavItem href="/">Dashboard</NavItem>
        {data?.postIdeaSuggestionsEnabled && (
          <NavItem href="/post-idea-suggestions">報題建議</NavItem>
        )}
        <ListNavItems lists={lists} />
      </NavigationContainer>
    )
  },
}
