# Custom Icons

Drop custom PNG icons in this folder to replace default unit or incident icons.

Suggested naming:
- unit-patrol.png
- unit-traffic.png
- unit-supervisor.png
- unit-engine.png
- unit-fire.png
- unit-ambulance.png
- unit-ems.png
- unit-tow_truck.png
- unit-tow.png
- station-police.png
- station-fire.png
- station-ems.png
- station-tow.png
- station-prison.png
- incident-default.png
- incident-priority-1.png
- incident-priority-2.png
- incident-priority-3.png

Optional status variants (for animated enroute/return visuals):
- unit-fire-red.png / unit-fire-blue.png / unit-fire-return.png
- unit-ems-red.png / unit-ems-blue.png / unit-ems-return.png
- unit-tow-red.png / unit-tow-blue.png / unit-tow-return.png

Notes:
- Keep icons square (24x24 or 32x32 works well).
- Unit lookup falls back from unit-specific files to department files (for example: `unit-engine.png` -> `unit-fire.png`).
