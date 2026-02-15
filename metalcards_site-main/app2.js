const opentype = require('opentype.js');
const path = require("path");
const fs = require("fs");

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

const fonts = {
  num: opentype.loadSync('media/fonts/card-regular.ttf'),
  ["alex-brush"]: opentype.loadSync('media/fonts/alexbrush-regular.ttf'),
  arabella: opentype.loadSync('media/fonts/arabella-medium.ttf'),
  bodoni: opentype.loadSync('media/fonts/bodoni-bold.ttf'),
  ["candlescript"]: opentype.loadSync('media/fonts/candlescript.ttf'),
  ["castileo"]: opentype.loadSync('media/fonts/castileo.ttf'),
  ["lombardia"]: opentype.loadSync('media/fonts/lombardia.ttf'),
  ["monotype-corsiva"]: opentype.loadSync('media/fonts/monotype-corsiva.ttf'),
  ["porcelain"]: opentype.loadSync('media/fonts/porcelain.ttf'),
  ["postmaster"]: opentype.loadSync('media/fonts/postmaster.ttf'),
  ["racing-catalogue"]: opentype.loadSync('media/fonts/racing-catalogue.ttf'),
  ["resphekt"]: opentype.loadSync('media/fonts/resphekt.ttf'),
  ["gilroy"]: opentype.loadSync('media/fonts/gilroy-400.ttf'),
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
  const svg = texts.map(config => drawInscrInWidthCont(config.text, config.fontName, config.pos)).join('');
  return `<svg viewbox="0 0 ${SVG_VIEWPORT_WIDTH} ${SVG_VIEWPORT_HEIGHT}" fill="#282828" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function drawTextOnSideB(texts=newTextConfigExample, cardNum = "", cardTime = "") {
  const svg = texts.map(config => drawInscrInWidthCont(config.text, config.fontName, config.pos)).join('');
  const cardNumSvg = drawPositionedInscr(cardNum, fonts.num, positionsOnSideB.num, fontHeights.small);
  const cardTimeSvg = drawPositionedInscr(cardTime, fonts.num, positionsOnSideB.time, fontHeights.small);

  return `<svg viewbox="0 0 ${SVG_VIEWPORT_WIDTH} ${SVG_VIEWPORT_HEIGHT}" fill="#282828" xmlns="http://www.w3.org/2000/svg">${svg}${cardNumSvg}${cardTimeSvg}</svg>`;
}

function drawOnSideANew(texts=newTextConfigExample, designFilePath="", ) {
  const svg = loadDesign(designFilePath);
  const viewPort = getViewPort(svg);
  const svgText = texts.map(config => drawInscrInWidthCont(config.text, config.fontName, config.pos, viewPort)).join('');
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
  const svg = fs.readFileSync(path.resolve(__dirname, design)).toString();
  return svg;
}

function drawInscrInWidthCont(text="", fontName="alex-brush", pos={top: 0, left: 0, width: 0}, cont={width: SVG_VIEWPORT_WIDTH, height: SVG_VIEWPORT_HEIGHT}) {
  if (text.length == 0 || pos.width == 0) return "";

  const x1 = pos.left / 100 * cont.width;
  const y1 = pos.top / 100 * cont.height
  const width = pos.width / 100 * cont.width;

  const fontSize = 20;
  const font = fonts[fontName];
  const testPath = font.getPath(text, 0, 0, fontSize);
  const testBox = testPath.getBoundingBox();
  const testCoeff = (testBox.x2 - testBox.x1) / width;

  if (testCoeff == 0) return "";

  const pathWithNormalSize = font.getPath(text, 0, 0, fontSize / testCoeff);
  const normalSizeBox = pathWithNormalSize.getBoundingBox();

  const resultPath = font.getPath(text, x1- normalSizeBox.x1, y1 - normalSizeBox.y1, fontSize / testCoeff);

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

  const resultPath = font.getPath(text, 
    "x1" in pos ? pos["x1"] - normalSizeBox.x1 : pos["x2"] - normalSizeBox.x2,
    "y1" in pos ? pos["y1"] - normalSizeBox.y1 : pos["y2"] - normalSizeBox.y2,
    fontSize / testCoeff);

  const resultSVG = resultPath.toSVG().replace("/>", " class=\"svgdevtextmc\"/>");
  const resultBox = resultPath.getBoundingBox();

  return `<svg viewbox="0 0 ${resultBox.x2} ${resultBox.y2}" fill="#282828" xmlns="http://www.w3.org/2000/svg">${resultSVG}</svg>`;
}




exports.drawTextOnSideA = drawTextOnSideA;
exports.drawTextOnSideB = drawTextOnSideB;
exports.drawOnSideANew = drawOnSideANew;
exports.drawOnSideBNew = drawOnSideBNew;


exports.drawFullInscr = drawFullInscr;


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
};

function drawOnSideBOld(texts = textConfigExample, prod=false) {
  const designSvg = loadDesign("media/images/variants/EmptyDesign.svg");
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

exports.drawOnSideA = drawOnSideAOld;
exports.drawOnSideB = drawOnSideBOld;


