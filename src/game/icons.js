import L from 'leaflet'

export const ICONS = {
  station:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6L3.4 5.2v6.1c0 5.4 3.7 10.4 8.6 11.8 4.9-1.4 8.6-6.4 8.6-11.8V5.2L12 1.6z" fill="currentColor" opacity="0.22"/><path d="M12 2.8l-7 2.9v5.4c0 4.4 2.9 8.5 7 9.8 4.1-1.3 7-5.4 7-9.8V5.7l-7-2.9z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 7.1a2.05 2.05 0 1 1 0 4.1 2.05 2.05 0 0 1 0-4.1zm-3.7 8c.2-2 1.8-3.4 3.7-3.4s3.5 1.4 3.7 3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  prison:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16v15H4z" fill="currentColor" opacity="0.16"/><path d="M4.5 4.5h15v15h-15z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.3v15.4M12 4.3v15.4M16 4.3v15.4" stroke="currentColor" stroke-width="1.2" opacity="0.85"/><path d="M4.2 9h15.6M4.2 14.8h15.6" stroke="currentColor" stroke-width="1" opacity="0.35"/><path d="M10.6 12a1.4 1.4 0 1 1 2.8 0v7.6h-2.8z" fill="currentColor"/></svg>',
  incident:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2L2.3 19a1.1 1.1 0 0 0 .95 1.65h17.5A1.1 1.1 0 0 0 21.7 19L12 2.2z" fill="currentColor" opacity="0.18"/><path d="M12 4.8L4.9 18h14.2L12 4.8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 9.4v4.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15.8" r="1.2" fill="currentColor"/><path d="M8.2 17.9h7.6" stroke="currentColor" stroke-width="1.2" opacity="0.45" stroke-linecap="round"/></svg>',
  vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="currentColor"/></svg>',
  fire_vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 5H4.5c-.8 0-1.5.7-1.5 1.5v11c0 .8.7 1.5 1.5 1.5h15c.8 0 1.5-.7 1.5-1.5v-11c0-.8-.7-1.5-1.5-1.5zM7 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm1-7H6V7h12v2z" fill="currentColor"/></svg>',
  ems_vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8h-3V4H7v4H4v6h3v4h10v-4h3V8zm-9 7H9v-2H7v-2h2V9h2v2h2v2h-2v2z" fill="currentColor"/><path d="M4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-2H4v2z" fill="currentColor" opacity="0.3"/></svg>',
  tow_vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 7.1h7.4c.95 0 1.76.62 2.05 1.49l.52 1.6h1.9l2.32-2.16a1.5 1.5 0 0 1 1.03-.4H21v2h-1.16l-1.97 1.84a1.6 1.6 0 0 1-1.1.43H14.9l.2.64h1.5a2.9 2.9 0 0 1 5.6 1.1h-1.6a1.3 1.3 0 1 0-2.6 0H9.8a2.9 2.9 0 0 1-5.6 0H3V8.3a1.2 1.2 0 0 1 1.2-1.2z" fill="currentColor"/><path d="M6.9 16.4a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1zm12.4 0a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1z" fill="currentColor" opacity="0.35"/></svg>',
  placement:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.3" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.75"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5.5 5.5l2.2 2.2M16.3 16.3l2.2 2.2M18.5 5.5l-2.2 2.2M7.7 16.3l-2.2 2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  fire_station:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 10.1L12 3.2l8.8 6.9v10.7H3.2V10.1z" fill="currentColor" opacity="0.16"/><path d="M4.4 10.7L12 4.8l7.6 5.9v9H4.4v-9z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.1 19.7v-4h5.8v4M8.5 11.2h2.2v2.2H8.5zm4.8 0h2.2v2.2h-2.2z" fill="currentColor"/><path d="M12 9.2c1.1 1 1.8 1.9 1.8 2.8A1.8 1.8 0 1 1 10.2 12c0-.9.7-1.8 1.8-2.8z" fill="currentColor" opacity="0.6"/></svg>',
  ems_station:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.7" y="4.1" width="16.6" height="15.8" rx="2.4" fill="currentColor" opacity="0.16"/><rect x="4.4" y="4.8" width="15.2" height="14.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 8.2v7.6M8.2 12h7.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 7.3h10" stroke="currentColor" stroke-width="1" opacity="0.35" stroke-linecap="round"/></svg>',
  tow_yard:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 6h9.8a2.8 2.8 0 0 1 2.1.95l1.2 1.35h2.4a1.3 1.3 0 0 1 1.3 1.3v4.3h-1.8a2.5 2.5 0 0 1-4.9 0H9.6a2.5 2.5 0 0 1-4.9 0H3V7.2A1.2 1.2 0 0 1 4.2 6z" fill="currentColor" opacity="0.2"/><path d="M4.7 7.1h9.1c.56 0 1.08.24 1.43.67l1.34 1.63h2.1c.44 0 .8.36.8.8v2.6h-1.25a2.8 2.8 0 0 0-5.48 0H10.1a2.8 2.8 0 0 0-5.48 0H4V7.8c0-.38.32-.7.7-.7z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="7.4" cy="15.1" r="1.5" fill="currentColor"/><circle cx="15.8" cy="15.1" r="1.5" fill="currentColor"/><path d="M12.2 10.2l3.4-2.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
}

export const makeMarkerIcon = (className, iconMarkup, size = [40, 40]) =>
  L.divIcon({
    className: '',
    html: `<div class="marker ${className}">${iconMarkup}</div>`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  })

export const makeLabelIcon = (label, size = [0, 0]) =>
  L.divIcon({
    className: '',
    html: `<div class="zone-label">${label}</div>`,
    iconSize: size,
  })

const CUSTOM_ICON_URLS = import.meta.glob('../assets/icons/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const getCustomIconUrl = (filename) =>
  CUSTOM_ICON_URLS[`../assets/icons/${filename}`] || null

export const pickCustomIconUrl = (filenames) => {
  for (const name of filenames) {
    const url = getCustomIconUrl(name)
    if (url) return url
  }
  return null
}
