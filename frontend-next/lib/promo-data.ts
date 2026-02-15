import { findDesignById, getDesigns } from "@/lib/design-data";

export type Promo = {
  promoID: number;
  promoURI: string;
  promoPrice: number;
  designID: number;
  color: string;
  folderName: string;
};

const baseDesign = findDesignById(1001) ?? getDesigns().find((design) => design.folderName !== "empty") ?? getDesigns()[0];

const promos: Promo[] = [
  {
    promoID: 1,
    promoURI: "demo",
    promoPrice: 199000,
    designID: baseDesign.id,
    color: "black-gold-mat",
    folderName: baseDesign.folderName,
  },
  {
    promoID: 2,
    promoURI: "premium",
    promoPrice: 249000,
    designID: baseDesign.id,
    color: "black-gold-rib",
    folderName: baseDesign.folderName,
  },
];

export function getPromoByUri(uri: string): Promo | undefined {
  return promos.find((promo) => promo.promoURI === uri);
}

export function getPromoById(id: number): Promo | undefined {
  return promos.find((promo) => promo.promoID === id);
}
