export const I18N = {
  en: {
    members: "MEMBERS",
    tracks: "TRACKS",
    services: "SERVICES",
    merch: "MERCH",
    showcase: "SHOWCASE",
    releases: "RELEASES",
    noTracks: "No tracks for this member.",
    releasesSoon: "coming soon",
    tgServices: "WRITE ON TELEGRAM",
    tgMerch: "write on telegram",
    sizesLabel: "available in",

    m_members: "members",
    m_services: "services",
    m_merch: "merch",
    m_releases: "releases",
  },
  ru: {
    members: "УЧАСТНИКИ",
    tracks: "ТРЕКИ",
    services: "УСЛУГИ",
    merch: "МЕРЧ",
    showcase: "СТУДИЯ",
    releases: "РЕЛИЗЫ",
    noTracks: "У этого участника нет треков.",
    releasesSoon: "скоро",
    tgServices: "НАПИСАТЬ В ТЕЛЕГРАМ",
    tgMerch: "написать в телеграм",
    sizesLabel: "доступно в размерах",
    m_members: "участники",
    m_services: "услуги",
    m_merch: "мерч",
    m_releases: "релизы",
  },
};

import { getCookie } from "./theme.js";

export function t(key) {
  const lang = getCookie("lang") || "en";
  return I18N[lang]?.[key] ?? I18N.en[key] ?? key;
}
