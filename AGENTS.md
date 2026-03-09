# Repository Guidelines

## Project Structure & Module Organization
The active app lives in `src/` and is bundled with Vite.
- `src/main.jsx`: React entry point.
- `src/App.jsx`: main game shell and orchestration.
- `src/components/`: UI panels and controls (`Topbar.jsx`, `FleetPanel.jsx`, etc.).
- `src/game/`: game-domain logic (constants, routing, staffing, speed, cases).
- `src/config/`: static gameplay config (incident priorities/types).
- `src/assets/`: icons and static media.
- `public/`: static files served as-is.

The `__first_responder/` tree is legacy/reference material; prefer adding new work in `src/` unless a task explicitly targets legacy code.

## Build, Test, and Development Commands
Run from repository root:
- `npm install`: install dependencies.
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: create production bundle in `dist/`.
- `npm run preview`: serve the built bundle locally.
- `npm run lint`: run ESLint across the project.

## Coding Style & Naming Conventions
- Follow existing style: ES modules, JSX, single quotes, no semicolons.
- Use 2-space indentation and keep component props one-per-line when long.
- Components/hooks: `PascalCase` for components, `camelCase` for functions/vars, `UPPER_SNAKE_CASE` for constants.
- Keep domain logic in `src/game/` and UI behavior in `src/components/`.
- Linting is defined in `eslint.config.js` (`eslint`, `react-hooks`, `react-refresh`).

## Testing Guidelines
There is currently no root test runner configured (no `npm test` script).
Before opening a PR:
- Run `npm run lint`.
- Run `npm run build` to catch compile-time issues.
- Perform a manual smoke test in `npm run dev` (map load, dispatch flow, station/prison actions).

## Commit & Pull Request Guidelines
This workspace snapshot does not include `.git` history, so use this convention going forward:
- Commit format: `type(scope): short description` (example: `feat(dispatch): add prison transfer cooldown`).
- Keep commits focused and atomic.
- PRs should include: purpose summary, behavior changes, verification steps, and screenshots/GIFs for UI updates.
- Link related issue IDs when available.
