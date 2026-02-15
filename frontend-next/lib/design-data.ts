import fs from "node:fs";
import path from "node:path";

export type DesignCategory = {
  id: number;
  design_name: string;
  design_name_uz: string;
  folderName: string;
};

export type Design = {
  id: number;
  folderName: string;
  categoryID: number | null;
};

const categoryMap: DesignCategory[] = [
  { id: 1, design_name: "Патриот", design_name_uz: "Patriot", folderName: "1_patriot" },
  { id: 2, design_name: "Крипто", design_name_uz: "Kripto", folderName: "2_crypto" },
  { id: 3, design_name: "Деньги", design_name_uz: "Pul", folderName: "3_money" },
  { id: 4, design_name: "Эксклюзив", design_name_uz: "Eksklyuziv", folderName: "4_exclusive" },
  { id: 5, design_name: "Спорт", design_name_uz: "Sport", folderName: "5_sport" },
  { id: 6, design_name: "Авто", design_name_uz: "Avto", folderName: "6_cars" },
  { id: 7, design_name: "Card Designs", design_name_uz: "Card Designs", folderName: "7_card_designs" },
  { id: 8, design_name: "Бренды", design_name_uz: "Brendlar", folderName: "8_brands" },
  { id: 9, design_name: "Космос", design_name_uz: "Kosmos", folderName: "9_cosmos" },
  { id: 10, design_name: "Животные", design_name_uz: "Hayvonlar", folderName: "10_animals" },
  { id: 11, design_name: "Гороскоп", design_name_uz: "Goroskop", folderName: "11_horoscope" },
  { id: 12, design_name: "Cartoons", design_name_uz: "Cartoons", folderName: "12_cartoons" },
  { id: 13, design_name: "Pattern", design_name_uz: "Pattern", folderName: "13_pattern" },
  { id: 14, design_name: "Games", design_name_uz: "Games", folderName: "14_games" },
  { id: 15, design_name: "Movie & Music", design_name_uz: "Movie & Music", folderName: "15_movie_music" },
  { id: 16, design_name: "Anime", design_name_uz: "Anime", folderName: "16_anime" },
];

let cachedDesigns: Design[] | null = null;

function resolveOrigsRoot(): string {
  const local = path.resolve(process.cwd(), "origs");
  if (fs.existsSync(local)) {
    return local;
  }

  return path.resolve(process.cwd(), "../metalcards_site-main/origs");
}

export function getDesignCategories(): DesignCategory[] {
  return categoryMap;
}

export function getDesigns(categoryId?: number): Design[] {
  if (!cachedDesigns) {
    const origsRoot = resolveOrigsRoot();
    const designs: Design[] = [{ id: 1, folderName: "empty", categoryID: null }];

    for (const category of categoryMap) {
      const categoryDir = path.join(origsRoot, category.folderName);
      if (!fs.existsSync(categoryDir)) {
        continue;
      }

      const files = fs.readdirSync(categoryDir).filter((file) => file.endsWith(".svg"));
      for (const file of files) {
        const parsed = Number.parseInt(file.replace(".svg", ""), 10);
        if (!Number.isNaN(parsed)) {
          designs.push({ id: parsed, folderName: category.folderName, categoryID: category.id });
        }
      }
    }

    cachedDesigns = designs.sort((a, b) => a.id - b.id);
  }

  if (typeof categoryId === "undefined" || Number.isNaN(categoryId)) {
    return cachedDesigns;
  }

  return cachedDesigns.filter((design) => design.categoryID === null || design.categoryID === categoryId);
}

export function findDesignById(id: number): Design | undefined {
  return getDesigns().find((design) => design.id === id);
}
