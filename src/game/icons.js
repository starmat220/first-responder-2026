import L from 'leaflet'

export const ICONS = {
  station:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V5l8-3z" fill="currentColor"/></svg>',
  prison:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2" fill="currentColor"/><rect x="6" y="9" width="2" height="8" fill="#0b1320"/><rect x="11" y="9" width="2" height="8" fill="#0b1320"/><rect x="16" y="9" width="2" height="8" fill="#0b1320"/></svg>',
  incident:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 16H3l9-16z" fill="currentColor"/><rect x="11" y="9" width="2" height="5" fill="#0b1320"/><rect x="11" y="15.5" width="2" height="2" fill="#0b1320"/></svg>',
  vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11l1.5-4h11L19 11v6h-2v-2H7v2H5v-6z" fill="currentColor"/><circle cx="8" cy="15.5" r="1.5" fill="#0b1320"/><circle cx="16" cy="15.5" r="1.5" fill="#0b1320"/></svg>',
  fire_vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="13" height="7" rx="1.5" fill="currentColor"/><rect x="16" y="11" width="5" height="5" rx="1" fill="currentColor"/><rect x="6" y="7" width="6" height="2" rx="1" fill="currentColor"/><circle cx="8" cy="17" r="1.5" fill="#0b1320"/><circle cx="18" cy="17" r="1.5" fill="#0b1320"/><rect x="11.2" y="10.3" width="1.6" height="4.2" fill="#0b1320"/><rect x="9.9" y="11.6" width="4.2" height="1.6" fill="#0b1320"/></svg>',
  ems_vehicle:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="14" height="7" rx="1.5" fill="currentColor"/><rect x="17" y="10.5" width="4" height="5.5" rx="1" fill="currentColor"/><circle cx="8" cy="17" r="1.5" fill="#0b1320"/><circle cx="18" cy="17" r="1.5" fill="#0b1320"/><rect x="9.5" y="10.3" width="1.4" height="4" fill="#0b1320"/><rect x="8.2" y="11.6" width="4" height="1.4" fill="#0b1320"/></svg>',
  placement:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  fire_station:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-7 9 7v10H3z" fill="currentColor"/><path d="M9 20v-5h6v5" fill="#0b1320"/><path d="M12 8.2c-.8 1-.9 1.8-.2 2.6-.7 0-1.3.5-1.3 1.4 0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8c0-.9-.6-1.4-1.3-1.4.5-.7.3-1.4-.8-2.6z" fill="#f59e0b"/></svg>',
  ems_station:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor"/><path d="M12 8v8M8 12h8" stroke="#0b1320" stroke-width="2" stroke-linecap="round"/></svg>',
  tow_yard:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16h9l5-6h2l-1 2h2v2h-3l-3 3H4z" fill="currentColor"/><circle cx="7" cy="18" r="2" fill="#0b1320"/><circle cx="14" cy="18" r="2" fill="#0b1320"/></svg>',
}

export const makeMarkerIcon = (className, iconMarkup) =>
  L.divIcon({
    className: '',
    html: `<div class="marker ${className}">${iconMarkup}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

export const makeLabelIcon = (label) =>
  L.divIcon({
    className: '',
    html: `<div class="zone-label">${label}</div>`,
    iconSize: [0, 0],
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
