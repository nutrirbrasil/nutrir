export const COMBO_SECTION_IDS = {
  frango: "combo-frango",
  carne: "combo-carne",
  misto: "combo-misto",
  veg: "combo-vegetariano",
  montar: "combo-montar",
} as const;

export const COMBO_NAV_EVENT = "nutrir:combo-nav";

export const COMBO_MENU_LINKS = [
  { href: `/#${COMBO_SECTION_IDS.frango}`, label: "Frango", sectionId: COMBO_SECTION_IDS.frango },
  { href: `/#${COMBO_SECTION_IDS.carne}`, label: "Carne", sectionId: COMBO_SECTION_IDS.carne },
  { href: `/#${COMBO_SECTION_IDS.misto}`, label: "Misto", sectionId: COMBO_SECTION_IDS.misto },
  {
    href: `/#${COMBO_SECTION_IDS.veg}`,
    label: "Vegetariano",
    sectionId: COMBO_SECTION_IDS.veg,
  },
  {
    href: `/#${COMBO_SECTION_IDS.montar}`,
    label: "Monte seu Combo",
    sectionId: COMBO_SECTION_IDS.montar,
  },
] as const;

export type ComboSectionId = (typeof COMBO_MENU_LINKS)[number]["sectionId"];

export function isCombosHome(pathname: string) {
  return pathname === "/";
}

/** Navegação por âncora — funciona mesmo já estando na home (mesma URL). */
export function navigateToComboSection(sectionId: ComboSectionId) {
  if (typeof window === "undefined") return;

  const hash = `#${sectionId}`;
  if (window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }

  window.dispatchEvent(
    new CustomEvent(COMBO_NAV_EVENT, { detail: { sectionId } })
  );
}

export function isMontarSection(sectionId: string) {
  return sectionId === COMBO_SECTION_IDS.montar;
}
