# Engineering rules

Read the work item, these rules and the acceptance criteria before editing. Confirm the branch, the current diff and which layers the change touches.

- Use one issue, one scoped branch from `dev` and one PR targeting `dev` per delivery. Keep `main` for releases. Use scoped Conventional Commits and write PR titles, descriptions and technical comments in English. Release and merge decisions belong to maintainers.
- Keep LangGraph and insurance rules on the server. API handlers validate untrusted input, call the graph and map errors to `{error: {code, message}}`. No browser imports from internal Python modules. Authorization, precedence and source selection belong to the backend.
- Organize the React frontend in `src/app`, `src/features/<feature>` and `src/shared`. Use strict TypeScript, `@/` imports, named function components, interfaces for props and explicit exports. Avoid cross-feature imports, inline component definitions, unnecessary React memoization and effects for derived state.
- Aim for up to 200 lines per component, 300 per new module and 500 added product lines per change. For a larger cohesive change, record the reason and request an independent review. The pre-existing CLI is measured separately when refactored.
- Use design tokens, Mexican Spanish, keyboard access, visible focus, AA contrast, 44 px touch targets and reduced-motion support. Keep visual evidence outside Git and label the fixture, viewport and tested revision.
- Pin dependencies. Keep secrets, real policy data, credentials and raw chat out of the repository, logs and web storage. Trace only safe metadata. Validate on the server and use security headers. Require tests for changes in access, policy selection or other consequential rules.
- Run format, lint, types, architecture, build, backend tests and critical Playwright flows before pushing. Include exact evidence and limitations. Keep hooks enabled. A public demo release from a review branch requires explicit authorization.

The initial Python CLI is the baseline. BMS V2 and HeyDuck conventions are applied to this repository's own stack, contracts and synthetic domain.
