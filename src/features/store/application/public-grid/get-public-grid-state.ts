import {
  PublicProduct,
  ProductGridState,
  ProductGridStrings,
  toProductCard,
} from '../../domain/product';

export type PublicProductCatalog = {
  listPublicProducts(): Promise<PublicProduct[]>;
};

export function initialProductGridState(): ProductGridState {
  return { kind: 'loading' };
}

export async function getProductGridState(
  catalog: PublicProductCatalog,
  strings: ProductGridStrings,
): Promise<ProductGridState> {
  try {
    const products = await catalog.listPublicProducts();
    const activeProducts = products.filter((product) => product.isActive);

    if (activeProducts.length === 0) {
      return {
        kind: 'empty',
        title: strings.emptyTitle,
        description: strings.emptyDescription,
      };
    }

    return {
      kind: 'ready',
      cards: activeProducts.map(toProductCard),
    };
  } catch {
    return {
      kind: 'error',
      title: strings.errorTitle,
      description: strings.errorDescription,
      retryLabel: strings.retryLabel,
    };
  }
}
