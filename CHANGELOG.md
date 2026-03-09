# Changelog

## 0.9.0 - 2026-03-03

- Added campaign districts, district unlock progression, and claimable milestone rewards.
- Added district-aware incident balancing so response/reward tuning reflects where incidents happen.
- Added weather-linked incident filtering so climate-incompatible calls are avoided.
- Added economy safeguard grants for early-game recovery when funds collapse.
- Expanded playtest reporting with session stats, campaign/build metadata, and downloadable reports.
- Added save migration hardening and backup-first persistence to protect player progress across updates.
- Added release quality scripts and migration/weather tests (`npm test`, `npm run release:playtest`).
- Improved build chunking (`vendor-react`, `vendor-map`) to reduce large single-bundle pressure.
