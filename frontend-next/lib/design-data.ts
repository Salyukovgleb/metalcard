import fs from "node:fs";
import path from "node:path";

export type DesignCategory = {
  id: number;
  design_name: string;
  design_name_uz: string;
  folderName: string;
  aliases?: string[];
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
  {
    id: 7,
    design_name: "Дизайны карт",
    design_name_uz: "Karta dizaynlari",
    folderName: "7_card_designs",
    aliases: ["Card Designs"],
  },
  { id: 8, design_name: "Бренды", design_name_uz: "Brendlar", folderName: "8_brands" },
  { id: 9, design_name: "Космос", design_name_uz: "Kosmos", folderName: "9_cosmos" },
  { id: 10, design_name: "Животные", design_name_uz: "Hayvonlar", folderName: "10_animals" },
  { id: 11, design_name: "Гороскоп", design_name_uz: "Munajjimlar bashorati", folderName: "11_horoscope" },
  {
    id: 12,
    design_name: "Мультфильмы",
    design_name_uz: "Multfilmlar",
    folderName: "12_cartoons",
    aliases: ["Cartoons"],
  },
  {
    id: 13,
    design_name: "Узоры",
    design_name_uz: "Naqshlar",
    folderName: "13_pattern",
    aliases: ["Pattern", "Patterns"],
  },
  { id: 14, design_name: "Игры", design_name_uz: "O'yinlar", folderName: "14_games", aliases: ["Games"] },
  {
    id: 15,
    design_name: "Кино и музыка",
    design_name_uz: "Kino va musiqa",
    folderName: "15_movie_music",
    aliases: ["Movie & Music", "Movie and Music", "Movie Music"],
  },
  { id: 16, design_name: "Аниме", design_name_uz: "Anime", folderName: "16_anime", aliases: ["Anime"] },
];

let cachedDesigns: Design[] | null = null;

function resolveOrigsRoot(): string {
  return path.resolve(process.cwd(), "origs");
}

export function getDesignCategories(): DesignCategory[] {
  return categoryMap;
}

export function getDesignCategoryByKey(key: string | null | undefined): DesignCategory | null {
  const normalized = (key ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return (
    categoryMap.find((category) => {
      if (category.folderName.toLowerCase() === normalized) {
        return true;
      }
      return (category.aliases ?? []).some((alias) => alias.trim().toLowerCase() === normalized);
    }) ?? null
  );
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
