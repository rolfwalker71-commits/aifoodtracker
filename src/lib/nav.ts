/** Shared active-state for bottom nav and sidebar. */
export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/meals/new") {
    return pathname === "/meals/new" || pathname.startsWith("/meals/new?");
  }
  if (href === "/meals") {
    if (pathname === "/meals") return true;
    if (pathname.startsWith("/meals/new")) return false;
    return pathname.startsWith("/meals/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
