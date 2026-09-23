import { gql } from '@keystone-6/core/admin-ui/apollo'

// Fetch runtime flags from the server; never import server environment config
// into the Admin UI bundle, which is shared by dev and production.
export const POST_IDEA_FEATURE = gql`
  query PostIdeaFeature {
    postIdeaSuggestionsEnabled
  }
`
