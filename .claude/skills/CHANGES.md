<!-- This file is for documenting proposed changes to various logic and UI -->

# Proposed UI Changes and Refinements

- **Scrollbar-gutter-stable** - Remove this scrollbar feature from the login and app shell as a whole. I can see it is still visible but I don't now what's causing it.
- **Client Portal Wrapper** - Render all edit and create modals in a react portal wrapper - portaled to the body.
- **Fixed Layout** - Despite the sticky nature of the desktop sidebar, it is affected by the custom `Select` component when a user opens the select drop-down, e.g when you open the `Select` drop-down in the new asset page, the desktop sidebar and some other components are shifted upwards, breaking the layout of the app shell - My recommendation is to use fixed layout styling for the sidebar and the app shell itself, that way they both stay stationery - but you can advise on this based on your exploration.
- **Loading Skeletons and loading line** - Some components that fetch data have delayed rendering before the data is fetched and the component is displayed - this looks like bad UI/UX for an end-user. Explore the codebase to see which components and areas are affected, and use better patterns e.g. loading skeleton component placeholders before the real data streams in. Similarly, create a top-level loading line component which displayes a loading line at the top - it will be used majorly for in-dashboard next.js rout navigation where the loading line is shown before routing is complete. Explore the codebase to identify areas where we should use loading component skeletons (using animate-pulse), and areas where we should use the loading line component.
- **Desktop sidebar, login page colors, and background color tokens** - There seems to be a huge disconnect in color uniformity between the background color used in the main dashboard content area, and the dashboard sidebar (sidebar background seems to be using the same color as the login page). Ideally, match the color convention uniformity using the main dashboard content background color. You can review the color tokens for this if necessary to improve overall color uniformity.
- **Full browser reload during login and logout instead of using next.js router methods** - Use browser reload in these scenarios. Add a logout overlay component (displayed over everything) during logging out.
- **Custom not-found component** - Create a custom not-found component displayed for not-found pages.
- **Delete icon in `setting/categories` and `settings/locations`** - Delete icon in the named routes is not positioned correctly, the icon background shown on hover touches the surrounding border to the right.
- **Sticky title area and footer in create/edit modals** - Make the modal title area (contains title and close icon) and the footer(contains the action buttons) sticky so that only the content in between in scrollable.

## Clarifications and Recommendations

- Seek clarifications for unclear areas regarding the proposed changes.
- Your recommendations and critics are strongly encouraged.
- You can include found bugs during your exploration to be part of the planned changes (Note that the reports page is currently non-existent since it is part of another future implementation phase, the custom created not-found page will be shown when visiting that route).

## Planning and Execution

- Use Opus model for exploration and planning, and Sonnet model for executing the generated plan.
