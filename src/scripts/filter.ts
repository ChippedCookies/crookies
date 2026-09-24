import { FILTERS, isVisible, parseShopHash, serializeShopHash, type Filter } from './filter-logic';

const catalog = document.querySelector<HTMLElement>('[data-catalog]');

function isFilter(value: string | undefined): value is Filter {
  return (FILTERS as readonly (string | undefined)[]).includes(value);
}

if (catalog) {
  const tabs = catalog.querySelectorAll<HTMLButtonElement>('[data-filter-tab]');
  const items = catalog.querySelectorAll<HTMLElement>('[data-category]');
  const emptyState = catalog.querySelector<HTMLElement>('[data-empty-state]');

  const apply = (filter: Filter, updateHash: boolean): void => {
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.filterTab === filter)));

    let visibleCount = 0;
    items.forEach((item) => {
      const show = isVisible(item.dataset.category ?? '', filter);
      item.hidden = !show;
      if (show) {
        visibleCount += 1;
        item.classList.add('is-visible');
      }
    });
    if (emptyState) emptyState.hidden = visibleCount > 0;

    if (updateHash) history.replaceState(null, '', serializeShopHash(filter));
  };

  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filterTab;
      if (isFilter(filter)) apply(filter, true);
    }),
  );

  window.addEventListener('hashchange', () => apply(parseShopHash(location.hash), false));

  if (location.hash.startsWith('#shop=')) apply(parseShopHash(location.hash), false);
}
