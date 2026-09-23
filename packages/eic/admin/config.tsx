import React from 'react'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'
import {
  ListNavItems,
  NavigationContainer,
  NavItem,
} from '@keystone-6/core/admin-ui/components'

export const components = {
  Navigation({ authenticatedItem, lists }: NavigationProps) {
    return (
      <NavigationContainer authenticatedItem={authenticatedItem}>
        <NavItem href="/">Dashboard</NavItem>
        <NavItem href="/post-idea-suggestions">報題建議</NavItem>
        <ListNavItems lists={lists} />
      </NavigationContainer>
    )
  },
}
