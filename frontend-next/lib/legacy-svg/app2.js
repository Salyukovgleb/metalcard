const opentype = require('opentype.js');
const path = require("path");
const fs = require("fs");

// Text style used in generated SVGs
const SVG_TEXT_CSS = `
<style type="text/css">
  .svgdevtextmc{fill:#373435;}
</style>
`;

const PROD_RECT = `<rect x="0" y="0" width="238.1" height="150.2" fill="none"/>`

const SVG_VIEWPORT_WIDTH = 238.1;
const SVG_VIEWPORT_HEIGHT = 150.2;

const fontHeights = {
  ["big-plus"]: 20.10411224,
  big: 15.0766672,
  medium: 12.06133376,
  small: 7.0849
}

// Fonts are expected in ./fonts relative to this file.
// Шрифты скачиваются автоматически через scripts/download_fonts.py из Google Fonts.
// Все шрифты соответствуют UI названиям из design.html и design_mobile.html.
const fonts = {
  num: opentype.loadSync(path.join(__dirname, 'fonts', 'card-regular.ttf')),              // Card -> IBM Plex Mono
  ["alex-brush"]: opentype.loadSync(path.join(__dirname, 'fonts', 'alexbrush-regular.ttf')), // Alex Brush
  arabella: opentype.loadSync(path.join(__dirname, 'fonts', 'arabella-medium.ttf')),         // Arabella -> Allura
  bodoni: opentype.loadSync(path.join(__dirname, 'fonts', 'bodoni-regular.ttf')),           // Bodoni -> Bodoni Moda (regular weight to match preview CSS)
  ["candlescript"]: opentype.loadSync(path.join(__dirname, 'fonts', 'candlescript.ttf')),    // Candlescript -> Great Vibes
  ["castileo"]: opentype.loadSync(path.join(__dirname, 'fonts', 'castileo.ttf')),            // Castileo -> Cinzel Decorative
  ["lombardia"]: opentype.loadSync(path.join(__dirname, 'fonts', 'lombardia.ttf')),          // Lombardia -> Cormorant Upright
  ["monotype-corsiva"]: opentype.loadSync(path.join(__dirname, 'fonts', 'monotype-corsiva.ttf')), // Monotype Corsiva -> Dancing Script
  ["porcelain"]: opentype.loadSync(path.join(__dirname, 'fonts', 'porcelain.ttf')),          // Porcelain -> Satisfy
  ["postmaster"]: opentype.loadSync(path.join(__dirname, 'fonts', 'postmaster.ttf')),        // Postmaster -> Alegreya SC
  ["racing-catalogue"]: opentype.loadSync(path.join(__dirname, 'fonts', 'racing-catalogue.ttf')), // Racing Catalogue -> Racing Sans One
  ["resphekt"]: opentype.loadSync(path.join(__dirname, 'fonts', 'resphekt.ttf')),            // Resphekt -> Marck Script
  ["gilroy"]: opentype.loadSync(path.join(__dirname, 'fonts', 'gilroy-400.ttf')),            // Gilroy -> Inter
}

const positionsOnSideA = {
  ["left-top"] : {
    x1: SVG_VIEWPORT_WIDTH * 0.1,
    y1: SVG_VIEWPORT_HEIGHT * 0.1
  },
  ["right-top"] : {
    x2: SVG_VIEWPORT_WIDTH * 0.9,
    y1: SVG_VIEWPORT_HEIGHT * 0.1
  },
  ["left-bottom"] : {
    x1: SVG_VIEWPORT_WIDTH * 0.1,
    y2: SVG_VIEWPORT_HEIGHT * 0.9
  },
  ["right-bottom"] : {
    x2: SVG_VIEWPORT_WIDTH * 0.9,
    y2: SVG_VIEWPORT_HEIGHT * 0.9
  },
  ["center-bottom"] : {
    y2: SVG_VIEWPORT_HEIGHT * 0.9
  }
}

const positionsOnSideB = {
  ["left-bottom"] : {
    x1: SVG_VIEWPORT_WIDTH * 0.0471,
    y2: SVG_VIEWPORT_HEIGHT * 0.9
  },
  ["right-bottom"] : {
    x2: SVG_VIEWPORT_WIDTH * 0.9529,
    y2: SVG_VIEWPORT_HEIGHT * 0.9
  },
  ["under-num"] : {
    x1: SVG_VIEWPORT_WIDTH * 0.0471,
    y1: SVG_VIEWPORT_HEIGHT * 0.7
  },
  ["num"] : {
    x1: SVG_VIEWPORT_WIDTH * 0.0471,
    y1: SVG_VIEWPORT_HEIGHT * 0.6
  },
  ["time"] : {
    x2: SVG_VIEWPORT_WIDTH * 0.8,
    y1: SVG_VIEWPORT_HEIGHT * 0.6
  }
}

const newTextConfigExample = [{fontName: "", text: "", pos: {top: 0, left: 0, width: 0}}];

function drawTextOnSideA(texts=newTextConfigExample) {
  const cont = {width: SVG_VIEWPORT_WIDTH, height: SVG_VIEWPORT_HEIGHT};
  const svg = texts.map(config => {
    const baseSize = config.size || config.fontSize || null;
    return drawInscrInWidthCont(config.text, config.fontName, config.pos, cont, baseSize);
  }).join('');
  return `<svg viewBox="0 0 ${SVG_VIEWPORT_WIDTH} ${SVG_VIEWPORT_HEIGHT}" fill="#000000" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function drawTextOnSideB(texts=newTextConfigExample, cardNum = "", cardTime = "") {
  const cont = {width: SVG_VIEWPORT_WIDTH, height: SVG_VIEWPORT_HEIGHT};
  const svg = texts.map(config => {
    // Skip if text is empty or missing
    const text = String(config.text || "").trim();
    if (!text || text.length === 0) {
      return "";
    }
    // Ensure pos object exists and has required properties
    let pos = config.pos || {};
    if (!pos || typeof pos !== 'object') {
      pos = { top: 0, left: 0, width: 100 }; // Default position if missing
    }
    // Fix width if 0 or missing (use default to allow rendering)
    if (!pos.width || pos.width === 0) {
      pos = { ...pos, width: 100 };
    }
    const baseSize = config.size || config.fontSize || null;
    const fontName = config.fontName || "alex-brush";
    return drawInscrInWidthCont(text, fontName, pos, cont, baseSize);
  }).join('');
  const cardNumSvg = drawPositionedInscr(cardNum, fonts.num, positionsOnSideB.num, fontHeights.small);
  const cardTimeSvg = drawPositionedInscr(cardTime, fonts.num, positionsOnSideB.time, fontHeights.small);

  return `<svg viewBox="0 0 ${SVG_VIEWPORT_WIDTH} ${SVG_VIEWPORT_HEIGHT}" fill="#000000" xmlns="http://www.w3.org/2000/svg">${svg}${cardNumSvg}${cardTimeSvg}</svg>`;
}

function drawOnSideANew(texts=newTextConfigExample, designFilePath="") {
  const svg = loadDesign(designFilePath);
  const viewPort = getViewPort(svg);
  const svgText = texts.map(config => {
    const baseSize = config.size || config.fontSize || null;
    return drawInscrInWidthCont(config.text, config.fontName, config.pos, viewPort, baseSize);
  }).join('');
  return svg.replace("</svg>", svgText + `<rect x="0" y="0" width="${viewPort.width}" height="${viewPort.height}" fill="none"/>` + "</svg>");
}

function drawOnSideBNew(texts=newTextConfigExample, cardNum = "", cardTime = "") {
  return drawTextOnSideB(texts, cardNum, cardTime).replace("</svg>", `<rect x="0" y="0" width="238.1" height="150.2" fill="none"/>` + "</svg>");
}

function getViewPort(svg = "") {
  const matchArr = svg.match(/view[Bb]ox="[\d.]+ [\d.]+ [\d.]+ [\d.]+"/);
  const match = (matchArr != null ? matchArr[0] : "viewBox=\"0 0 238.1 150.2\"").split(" ");
  return {width: Number.parseFloat(match[match.length - 2]), height: Number.parseFloat(match[match.length - 1])};
}

function loadDesign(design) {
  // If design is an absolute path, use it directly; otherwise resolve relative to __dirname
  const designPath = path.isAbsolute(design) ? design : path.resolve(__dirname, design);
  const svg = fs.readFileSync(designPath).toString();
  return svg;
}

function drawInscrInWidthCont(text="", fontName="alex-brush", pos={top: 0, left: 0, width: 0}, cont={width: SVG_VIEWPORT_WIDTH, height: SVG_VIEWPORT_HEIGHT}, baseFontSize=null) {
  if (text.length == 0 || pos.width == 0) return "";

  const x1 = pos.left / 100 * cont.width;
  const y1 = pos.top / 100 * cont.height;
  const width = pos.width / 100 * cont.width;

  // Use base font size from user (if provided), otherwise use default 20
  // Convert from preview pixels to SVG mm: preview is ~856px wide, SVG is 238.1mm
  // Ratio: 238.1 / 856 ≈ 0.278 mm per px
  let targetFontSize = 20; // Default base size in SVG units (mm)
  if (baseFontSize !== null && baseFontSize > 0) {
    // Convert from preview px to SVG mm
    const previewWidthPx = 856.0;
    const pxToMmRatio = cont.width / previewWidthPx;
    // Remove correction factor to match exact preview size
    targetFontSize = baseFontSize * pxToMmRatio;
  }
  
  const font = fonts[fontName];
  if (!font) {
    // Font not found, skip this text
    return "";
  }
  
  // Calculate text width with target font size
  const testPath = font.getPath(text, 0, 0, targetFontSize);
  const testBox = testPath.getBoundingBox();
  const textWidth = testBox.x2 - testBox.x1;
  const textHeight = testBox.y2 - testBox.y1;

  // If text fits in width, use target size; otherwise scale down to fit
  let fontSize = targetFontSize;
  if (textWidth > width && width > 0) {
    // Scale down to fit width
    fontSize = targetFontSize * (width / textWidth);
  }

  // Create final path with calculated font size
  const finalPath = font.getPath(text, 0, 0, fontSize);
  const finalBox = finalPath.getBoundingBox();

  // Position text at specified coordinates (adjust for baseline)
  const resultPath = font.getPath(text, x1 - finalBox.x1, y1 - finalBox.y1, fontSize);

  return resultPath.toSVG().replace("/>", " class=\"svgdevtextmc\"/>");
}

function drawFullInscr(text = "", fontName = "alex-brush", pos = {x1: 0, y1: 0}, fontSize = 20) {
  const font = fonts[fontName];
  const testPath = font.getPath(text, 0, 0, fontSize);
  const testBox = testPath.getBoundingBox();
  const testCoeff = (testBox.y2 - testBox.y1) / fontSize;

  if (testCoeff == 0) return "";

  const pathWithNormalSize = font.getPath(text, 0, 0, fontSize / testCoeff);
  const normalSizeBox = pathWithNormalSize.getBoundingBox();

  const resultPath = font.getPath(
    text,
    "x1" in pos ? pos["x1"] - normalSizeBox.x1 : pos["x2"] - normalSizeBox.x2,
    "y1" in pos ? pos["y1"] - normalSizeBox.y1 : pos["y2"] - normalSizeBox.y2,
    fontSize / testCoeff
  );

  const resultSVG = resultPath.toSVG().replace('/>', ' class="svgdevtextmc"/>');
  const resultBox = resultPath.getBoundingBox();

  return `<svg viewBox="0 0 ${resultBox.x2} ${resultBox.y2}" fill="#000000" xmlns="http://www.w3.org/2000/svg">${resultSVG}</svg>`;
}

const textConfigExample = [{fontName: "", fontSize: "", pos: "left-top", text: ""}];

function drawOnSideAOld(design = "", texts = textConfigExample, prod=false) {
  const designSvg = loadDesign("media" + design);
  const textsSvg = texts.map(({fontName, fontSize, pos, text})  => {
    if (pos != "center-bottom")
      return drawPositionedInscr(text, fonts[fontName], positionsOnSideA[pos], fontHeights[fontSize]);
    else 
      return drawCenterdedInscr(text, fonts[fontName], positionsOnSideA[pos], fontHeights[fontSize]);
  }).join("\n");

  return designSvg.replace("</svg>", `${SVG_TEXT_CSS}\n<g>\n${textsSvg}\n</g>\n${prod ? PROD_RECT : ""}\n</svg>`);
}

function drawOnSideBOld(texts = textConfigExample, prod=false) {
  const designSvg = loadDesign("media/images/variants/Empty.svg");
  const textsSvg = texts.map(({fontName, fontSize, pos, text}) => 
    drawPositionedInscr(text, fonts[fontName], positionsOnSideB[pos], fontHeights[fontSize]))
    .join("\n");

  return designSvg.replace("</svg>", `${SVG_TEXT_CSS}\n<g>\n${textsSvg}\n</g>\n${prod ? PROD_RECT : ""}\n</svg>`);
}

function drawPositionedInscr(text = "", font = fonts.num, pos = {x1: 0, y1: 0}, fontSize = 20) {
  const testPath = font.getPath(text, 0, 0, fontSize);
  const testBox = testPath.getBoundingBox();
  const testCoeff = (testBox.y2 - testBox.y1) / fontSize;

  if (testCoeff == 0) return "";

  const pathWithNormalSize = font.getPath(text, 0, 0, fontSize / testCoeff);
  const normalSizeBox = pathWithNormalSize.getBoundingBox();

  const resultPath = font.getPath(text, 
    "x1" in pos ? pos["x1"] - normalSizeBox.x1 : pos["x2"] - normalSizeBox.x2,
    "y1" in pos ? pos["y1"] - normalSizeBox.y1 : pos["y2"] - normalSizeBox.y2,
    fontSize / testCoeff);

  return resultPath.toSVG().replace("/>", " class=\"svgdevtextmc\"/>");
}

function drawCenterdedInscr(text = "", font = fonts.num, pos = {y1: 0}, fontSize = 20) {
  const testPath = font.getPath(text, 0, 0, fontSize);
  const testBox = testPath.getBoundingBox();
  const testCoeff = (testBox.y2 - testBox.y1) / fontSize;

  if (testCoeff == 0) return "";

  const pathWithNormalSize = font.getPath(text, 0, 0, fontSize / testCoeff);
  const normalSizeBox = pathWithNormalSize.getBoundingBox();
  const normalSizeBoxWidth = normalSizeBox.x2 - normalSizeBox.x1;
  const x1 = (SVG_VIEWPORT_WIDTH - normalSizeBoxWidth) / 2;

  const resultPath = font.getPath(text, 
    x1 - normalSizeBox.x1,
    "y1" in pos ? pos["y1"] - normalSizeBox.y1 : pos["y2"] - normalSizeBox.y2,
    fontSize / testCoeff);

  return resultPath.toSVG().replace("/>", " class=\"svgdevtextmc\"/>");
}

exports.drawTextOnSideA = drawTextOnSideA;
exports.drawTextOnSideB = drawTextOnSideB;
exports.drawOnSideANew = drawOnSideANew;
exports.drawOnSideBNew = drawOnSideBNew;
exports.drawFullInscr = drawFullInscr;
exports.drawOnSideA = drawOnSideAOld;
exports.drawOnSideB = drawOnSideBOld;

