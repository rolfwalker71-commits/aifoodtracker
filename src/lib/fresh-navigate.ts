type FreshRouter = {
  replace: (href: string) => void;
  refresh: () => void;
};

/**
 * Navigate to a route and force a fresh RSC render so create/update/delete
 * results show up immediately (avoids stale client router cache).
 */
export function navigateFresh(router: FreshRouter, href: string) {
  router.replace(href);
  router.refresh();
}
