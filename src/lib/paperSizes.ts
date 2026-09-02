import type { PaperSizeId } from "../types";

export type PaperSizeDefinition = {
  id: PaperSizeId;
  name: string;
  alternateName?: string;
  widthMm: number;
  heightMm: number;
  dimensions: string;
  metricDimensions: string;
};

export const PAPER_SIZES: PaperSizeDefinition[] = [
  {
    id: "a4",
    name: "A4",
    widthMm: 210,
    heightMm: 297,
    dimensions: "210 × 297 mm",
    metricDimensions: "8.27 × 11.69 in",
  },
  {
    id: "letter",
    name: "Letter",
    alternateName: "Short bond",
    widthMm: 215.9,
    heightMm: 279.4,
    dimensions: "8.5 × 11 in",
    metricDimensions: "215.9 × 279.4 mm",
  },
  {
    id: "long",
    name: "Long Bond",
    widthMm: 215.9,
    heightMm: 330.2,
    dimensions: "8.5 × 13 in",
    metricDimensions: "215.9 × 330.2 mm",
  },
  {
    id: "legal",
    name: "Legal",
    widthMm: 215.9,
    heightMm: 355.6,
    dimensions: "8.5 × 14 in",
    metricDimensions: "215.9 × 355.6 mm",
  },
];

export function getPaperSize(id: PaperSizeId) {
  return PAPER_SIZES.find((paperSize) => paperSize.id === id) || PAPER_SIZES[0];
}
