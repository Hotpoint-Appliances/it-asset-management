<!-- This file is for documenting proposed changes to various logic and UI in the project -->

# Bug Fixes And Improvements

## Skeleton loaders irregularities during page navigation

- For example in the assets page, when routing to a particular asset, the assets skeletons loader shows first after clicking on the asset, before the routing even happens - the loader shows for a moment before routing to the asset page begins. This also happens when you click on the edit button. You can inspect the behaviour of all skeleton loaders in the project to see if the same issue is in other places.

## Sticky dashboard panel sometimes does not show on the asset edit page

- This happens sometimes when you click on the edit button from the assets page - The sticky desktop topbar disappears and space is left at the bottom. - You can explore this irregularity by running a couple tests to see the behaviour.

## Critiques, clarifications, and recommendations

- You can explore the codebase and raise other related bugs and issues.
- Your critiques and recommendations are strongly encouraged.
- Seek any clarifications you might have.
- You can test using a signed in admin session in chrome dev server at `localhost:3000`.
