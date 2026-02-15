const express = require("express");
const mysql = require("mysql2");
const drawApp = require("./app2");
const Joi = require("joi");
const bodyParser = require("body-parser");
const { generateApiKey } = require('generate-api-key');
const config = require("./config");

const pool = mysql.createPool({
  connectionLimit: 10,
  host     : '127.0.0.1',
  database : config.database,
  user     : config.user,
  password : config.password,
  port: 3306
}).promise();

const path = require("path");
const fs = require("fs").promises;
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'client_secret_773114925973-qc8gph0nutlj2ui8vme8lhmnmasrp2jc.apps.googleusercontent.com.json');

const ACCEPTED_LANGUAGES = ["ru", "uz"];
const ACCEPTED_SITES = ["design", "benefits", "gallery", "how"];
const KEY_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
const UTM_KEYS = ["utm_content", "utm_medium", "utm_campaign", "utm_source", "utm_term", "utm_referrer", "referrer", "openstat", "from", "gclientid", "_ym_uid", "_ym_counter", "gclid", "yclid", "fbclid"];

//const CLICK_SERVICE_ID = '25426';
//const CLICK_MERCHANT_ID = '17596';

const numberFormat = new Intl.NumberFormat("ru");

const cardColorsToRenderColors = {};
const cardColorsToPrice = {};
const allCardColors = config.cardColors;
const activeCardColors = config.cardColors.filter(color => color.active);

allCardColors.forEach(color => {
  cardColorsToRenderColors[color.name] = color.renderColor;
  cardColorsToPrice[color.name] = color.price;
});

const allCardColorsCSS = allCardColors.map(color => getCardColorCSS(color)).join("\n");
const activeCardColorsCSS = activeCardColors.map(color => getCardColorCSS(color)).join("\n") + `\n .visual__color-container-inner {width: ${activeCardColors.length * 50 / 1920 * 100}vw} \n @media (max-width: 768px) { .visual__color-container-inner {width: ${250 / 450 * 100}vw;} #color-state:checked ~ .visual__color-container-inner {height: ${activeCardColors.length * 26.25 / 450 * 100}vw} }`;

const activeCardColorsNamesJSON = JSON.stringify(activeCardColors.map(color => color.name));
const cardColorsToRenderColorsJSON = JSON.stringify(cardColorsToRenderColors);
const cardColorsToPriceJSON = JSON.stringify(cardColorsToPrice);
const defaultColorNameJSON = JSON.stringify([activeCardColors.find(color => color.default)?.name ?? activeCardColors[0].name]);

const VALIDATION_SCHEMA_FOR_ORDER_DATA = getValidationSchemaForDemo();
const VALIDATION_SCHEMA_FOR_PROMO_ORDER_DATA = getValidationSchemaForPromo();


const PORT = process.env.PORT ?? 3000;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'pug');

app.use(express.static(path.resolve(__dirname, 'static')));
app.use(express.static(path.resolve(__dirname, 'media')));

app.get("/api/getText.svg", (req, res) => {
  try {
    const text = req.query.text;
    const fontName = req.query.font;

    if (!(text && fontName)) throw new Error("Нет данных на входе");

    const svg = drawApp.drawFullInscr(text, fontName);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg).end();
  } catch (error) {
    console.log(error);
    res.status(400).end();
  }
});

app.get("/api/getDesignsCategory", (req, res) => {
  pool
    .query("SELECT * FROM `design_categories`")
    .then(([rows]) => {
      res.status(200).json({
        data: rows
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).end();
    });
});

app.get("/api/getDesigns", (req, res) => {
  const categoryID = req.query["category"];
  pool
    .query("SELECT * FROM `designs`" + (categoryID ? " WHERE categoryID IS NULL OR categoryID=?" : "") + " ORDER BY id ASC", 
      categoryID ? [categoryID] : [])
    .then(([rows]) => {
      res.status(200).json({
        data: rows
      })
    })
    .catch(err => {
      console.log(err);
      res.status(500).end();
    })
});

app.post("/api/orders/previewPromoOrder", async (req, res) => {
  if (!req.body) {
    res.status(400).json({message: "Неправильные данные"});
  } else {
    try {
      const data = req.body;
      const validationErrors = VALIDATION_SCHEMA_FOR_PROMO_ORDER_DATA.validate(data).error

      if (!!validationErrors)
        throw new Error(validationErrors.message);

      await checkPausedTimePromo();

      pool.query("SELECT p.*, d.folderName FROM promo p JOIN designs d WHERE p.designID = d.id AND p.promoID=? AND p.promoPaused=0", [req.body.promoID])
        .then(([rows]) => {
          if (rows.length == 0) throw new Error("Такой акции нет");
          const promo = rows[0];
          const sideA = drawApp.drawTextOnSideA(data.cardAData);
          const sideB = drawApp.drawTextOnSideB(data.cardBData, data.cardNum, data.cardTime);

          res.status(200).json({ 
            forPreview: {
              sideA: sideA,
              sideB: sideB, 
              color: promo.color,
              logoDeactive: data.logoDeactive,
              bigChip: data.bigChip,
              render: `/renders/${promo.folderName}/${cardColorsToRenderColors[promo.color]}/${promo.designID}`,
            },
            forOrder: data
          });
        })
        .catch(err => {
          console.log(err);
          res.status(400).json({message: "Неправильные данные"});
        });
    } catch (error) {
      console.log(error);
      res.status(400).json({message: "Неправильные данные"});
    }
  }
});

app.post("/api/orders/createPromoOrder", async (req, res) => {
  if (!req.body) {
    res.status(400).json({message: "Неправильные данные"});
  } else {
    try {
      const name = req.body["name"];
      const phone = req.body["phone"];
      const data = req.body["order"];
      const utm = req.body["query"];
      const validationErrors = VALIDATION_SCHEMA_FOR_PROMO_ORDER_DATA.validate(data).error;

      if (!!validationErrors)
        throw new Error(validationErrors.message);
      if (name.length == 0 || phone.length == 0)
        throw new Error("Пустые данные")

      await checkPausedTimePromo();

      pool.query("SELECT p.*, d.folderName FROM promo p JOIN designs d WHERE p.designID = d.id AND p.promoID=? AND p.promoPaused=0", [data.promoID])
        .then(([rows]) => {
          if (rows.length == 0) throw new Error("Такой акции нет");
          const promo = rows[0];
         
          let amount = Math.round(promo.promoPrice) * 100;
          let amountText = Math.round(promo.promoPrice);
          let amountForBase = Math.round(promo.promoPrice) * 1.0;
    
          if (data.logoDeactive) {
            amount += 5000000;
            amountForBase += 50000.0;
            amountText += 50000;
          }
    
          if (data.delivery == "delivery") {
            amount += 5000000;
            amountForBase += 50000.00;
            amountText += 50000;
          }
    
          const order_key = generateApiKey({method: "string", min: 16, max: 32, pool: KEY_POOL});
          const manage_key = generateApiKey({method: "string", min: 16, max: 32, pool: KEY_POOL});
    
          const order_data = {
            "cardAData": data["cardAData"].filter(item => item.text.length > 0), 
            "cardBData": data["cardBData"].filter(item => item.text.length > 0), 
            "cardNum": data["cardNum"], 
            "cardTime": data["cardTime"]
          };
    
          const createTime = new Date();
    
          let year = createTime.getFullYear();
          let month = createTime.getMonth() + 1;
          let day = createTime.getDate();
    
          let hours = createTime.getHours();
          let minutes = createTime.getMinutes();
          let seconds = createTime.getSeconds();

          month = month < 10 ? `0${month}` : month;
          day = day < 10 ? `0${day}` : day;

          hours = hours < 10 ? `0${hours}` : hours;
          minutes = minutes < 10 ? `0${minutes}` : minutes;
          seconds = seconds < 10 ? `0${seconds}` : seconds;

          pool
            .execute("INSERT INTO `orders` (`amount`, `state`, `name`, `phone`, `email`, `order-data`, `design`, `promo`, `color`, `logoDeactive`, `bigChip`, `delivery`, `order-key`, `manage-key`, `create-time`) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [
              amountForBase, 1, name, phone, "", JSON.stringify(order_data), promo["designID"], promo["promoName"], promo["color"], 
              data["logoDeactive"], data["bigChip"], data["delivery"], order_key, manage_key, 
              `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
            ])
            .then(([resultSetHeader]) => {
              const orderId = resultSetHeader.insertId;
              const returnURL = `https://metalcards.uz/orders/${orderId}/${order_key}/showDataNew/`;
              const paymeLinkRu = `https://checkout.paycom.uz/` + Buffer.from(`m=658596b25c8188fb6e90a542;ac.order_id=${orderId};ac.name=${name};ac.phone=${phone};ac.email=Пустой;a=${amount};l=ru;c=${returnURL};ct=1500`).toString("base64");
              const paymeLinkUz = `https://checkout.paycom.uz/` + Buffer.from(`m=658596b25c8188fb6e90a542;ac.order_id=${orderId};ac.name=${name};ac.phone=${phone};ac.email=Пустой;a=${amount};l=uz;c=${returnURL};ct=1500`).toString("base64");

              const cacheLink = data.delivery == "delivery" ? "" : `/orders/${resultSetHeader.insertId}/${order_key}/cachePay/`;

              res.status(200).json({
                id: orderId,
                amount: amount,
                amountText: numberFormat.format(amountText),
                paymeLinkRu: paymeLinkRu,
                paymeLinkUz: paymeLinkUz,
                cacheLink: cacheLink
              });
              /*
              pool.execute("INSERT INTO `payments` (`product_id`, `status`, `total`, `amount`, `delivery`, `tax`, `description`, `token`, `merchant_trans_id`) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                [orderId, "waiting", amountForBase, amountForBase, 0, 0, "", "", "" + orderId])
                .then(([resultSetHeader]) => {
                  const clickLink = `https://my.click.uz/services/pay?service_id=${CLICK_SERVICE_ID}&merchant_id=${CLICK_MERCHANT_ID}&amount=${amountForBase.toFixed(2)}&transaction_param=${orderId}&return_url=${returnURL}`;

                  res.status(200).json({ 
                    id: orderId,
                    amount: amount,
                    amountText: numberFormat.format(amountText),
                    paymeLinkRu: paymeLinkRu,
                    paymeLinkUz: paymeLinkUz,
                    clickLink: clickLink,
                    cacheLink: cacheLink
                  });
                })
                .catch(err => {
                  console.log(err);
                  res.status(400).json({message: "Неправильные данные"});
                });

               */
              
              pool.execute("INSERT INTO `orders_utm` (`order_id`, " + UTM_KEYS.map(key => ("`" + key + "`")).join(", ") + ") VALUES(?, "+ UTM_KEYS.map(key => "?").join(", ") + ")",
                [orderId, ...UTM_KEYS.map(key => utm[key] || "")])
            })
            .catch(err => {
              console.log(err);
              res.status(400).json({message: "Неправильные данные"});
            });
        })
        .catch(err => {
          console.log(err);
          res.status(400).json({message: "Неправильные данные"});
        });

      
      // authorize().then(auth => {
      //   createUTM(auth, [UTM_KEYS.map(key => utm[key] || "")])
      // }).catch(console.error);

    } catch (error) {
      console.log(error);
      res.status(400).json({message: "Неправильные данные"});
    }
  }
});

app.post("/api/orders/previewOrder", (req, res) => {
  if (!req.body) {
    res.status(400).json({message: "Неправильные данные"});
  } else {
    try {
      const data = req.body;
      const validationErrors = VALIDATION_SCHEMA_FOR_ORDER_DATA.validate(data).error

      if (!!validationErrors)
        throw new Error(validationErrors.message);

      pool.query("SELECT * FROM `designs` WHERE id=? LIMIT 1", [data.design])
        .then(([rows]) => {
          const designData = rows[0];
          const sideA = drawApp.drawTextOnSideA(data.cardAData);
          const sideB = drawApp.drawTextOnSideB(data.cardBData, data.cardNum, data.cardTime);

          res.status(200).json({ 
            forPreview: {
              sideA: sideA,
              sideB: sideB, 
              color: data.color,
              logoDeactive: data.logoDeactive,
              bigChip: data.bigChip,
              render: `/renders/${designData.folderName}/${cardColorsToRenderColors[data.color]}/${data.design}`,
            },
            forOrder: data
          });
        })
        .catch(error => {
          console.log(error);
          res.status(400).json({message: "Неправильные данные"});
        })
    } catch (error) {
      console.log(error);
      res.status(400).json({message: "Неправильные данные"});
    }
  }
});

app.post("/api/orders/createOrder", (req, res) => {
  if (!req.body) {
    res.status(400).json({message: "Неправильные данные"});
  } else {
    try {
      const name = req.body["name"];
      const phone = req.body["phone"];
      const data = req.body["order"];
      const utm = req.body["query"];
      const validationErrors = VALIDATION_SCHEMA_FOR_ORDER_DATA.validate(data).error;

      if (!!validationErrors)
        throw new Error(validationErrors.message);
      if (name.length == 0 || phone.length == 0)
        throw new Error("Пустые данные")

      let amountForBase = cardColorsToPrice[data.color];
      let amount = amountForBase * 100;
      let amountText = Math.round(amountForBase);

      if (data.logoDeactive) {
        amount += 5000000;
        amountForBase += 50000.0;
        amountText += 50000;
      }

      if (data.delivery == "delivery") {
        amount += 5000000;
        amountForBase += 50000.00;
        amountText += 50000;
      }

      const order_key = generateApiKey({method: "string", min: 16, max: 32, pool: KEY_POOL});
      const manage_key = generateApiKey({method: "string", min: 16, max: 32, pool: KEY_POOL});

      const order_data = {
        "cardAData": data["cardAData"].filter(item => item.text.length > 0), 
        "cardBData": data["cardBData"].filter(item => item.text.length > 0), 
        "cardNum": data["cardNum"], 
        "cardTime": data["cardTime"]
      };

      const createTime = new Date();

      let year = createTime.getFullYear();
      let month = createTime.getMonth() + 1;
      let day = createTime.getDate();

      let hours = createTime.getHours();
      let minutes = createTime.getMinutes();
      let seconds = createTime.getSeconds();

      month = month < 10 ? `0${month}` : month;
      day = day < 10 ? `0${day}` : day;

      hours = hours < 10 ? `0${hours}` : hours;
      minutes = minutes < 10 ? `0${minutes}` : minutes;
      seconds = seconds < 10 ? `0${seconds}` : seconds;

      pool
        .execute("INSERT INTO `orders` (`amount`, `state`, `name`, `phone`, `email`, `order-data`, `design`, `color`, `logoDeactive`, `bigChip`, `delivery`, `order-key`, `manage-key`, `create-time`) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [
          amountForBase, 1, name, phone, "", JSON.stringify(order_data), data["design"], data["color"], 
          data["logoDeactive"], data["bigChip"], data["delivery"], order_key, manage_key, 
          `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        ])
        .then(([resultSetHeader]) => {
          const orderId = resultSetHeader.insertId;
          const returnURL = `https://metalcards.uz/orders/${orderId}/${order_key}/showDataNew/`;
          const paymeLinkRu = `https://checkout.paycom.uz/` + Buffer.from(`m=658596b25c8188fb6e90a542;ac.order_id=${orderId};ac.name=${name};ac.phone=${phone};ac.email=Пустой;a=${amount};l=ru;c=${returnURL};ct=1500`).toString("base64");
          const paymeLinkUz = `https://checkout.paycom.uz/` + Buffer.from(`m=658596b25c8188fb6e90a542;ac.order_id=${orderId};ac.name=${name};ac.phone=${phone};ac.email=Пустой;a=${amount};l=uz;c=${returnURL};ct=1500`).toString("base64");

          const cacheLink = data.delivery == "delivery" ? "" : `/orders/${resultSetHeader.insertId}/${order_key}/cachePay/`;

          res.status(200).json({
            id: orderId,
            amount: amount,
            amountText: numberFormat.format(amountText),
            paymeLinkRu: paymeLinkRu,
            paymeLinkUz: paymeLinkUz,
            cacheLink: cacheLink
          });

          /*
          pool.execute("INSERT INTO `payments` (`product_id`, `status`, `total`, `amount`, `delivery`, `tax`, `description`, `token`, `merchant_trans_id`) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [orderId, "waiting", amountForBase, amountForBase, 0, 0, "", "", "" + orderId])
            .then(([resultSetHeader]) => {
              const clickLink = `https://my.click.uz/services/pay?service_id=${CLICK_SERVICE_ID}&merchant_id=${CLICK_MERCHANT_ID}&amount=${amountForBase.toFixed(2)}&transaction_param=${orderId}&return_url=${returnURL}`;

              res.status(200).json({ 
                id: orderId,
                amount: amount,
                amountText: numberFormat.format(amountText),
                paymeLinkRu: paymeLinkRu,
                paymeLinkUz: paymeLinkUz,
                clickLink: clickLink,
                cacheLink: cacheLink
              });
            })
            .catch(err => {
              console.log(err);
            res.status(400).json({message: "Неправильные данные"});
            });

           */
          
          pool.execute("INSERT INTO `orders_utm` (`order_id`, " + UTM_KEYS.map(key => ("`" + key + "`")).join(", ") + ") VALUES(?, "+ UTM_KEYS.map(key => "?").join(", ") + ")",
            [orderId, ...UTM_KEYS.map(key => utm[key] || "")])
        })
        .catch(err => {
          console.log(err);
          res.status(400).json({message: "Неправильные данные"});
        });
      
      // authorize().then(auth => {
      //   createUTM(auth, [UTM_KEYS.map(key => utm[key] || "")])
      // }).catch(console.error);

    } catch (error) {
      console.log(error);
      res.status(400).json({message: "Неправильные данные"});
    }
  }
});

app.use("/orders/:id/:key/showData/", (req, res) => {
  pool.query("SELECT * FROM `orders_old` WHERE `id`=? AND `order-key`=?", [req.params.id, req.params.key])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      const data = JSON.parse(rows[0]["order-data"]);
      rows[0]["orderData"] = data;
      rows[0]["orderKey"] = rows[0]["order-key"]

      const order = rows[0];

      res.render("orders/showData", order);
    })
    .catch((err) => {
      console.log(err);

      res.status(400);
    })
});

app.use("/orders/:id/:key/showDataNew/", (req, res) => {
  pool.query("SELECT * FROM `orders` WHERE `id`=? AND `order-key`=?", [req.params.id, req.params.key])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      const order = rows[0];
      order["order-data"] = JSON.parse(order["order-data"]);
      const sideA = drawApp.drawTextOnSideA(order["order-data"].cardAData);
      const sideB = drawApp.drawTextOnSideB(order["order-data"].cardBData, order["order-data"].cardNum, order["order-data"].cardTime);

      const color = allCardColors.find(color => color.name === order["color"]);

      // const createTime = order["create-time"];

      // let year = createTime.getFullYear();
      // let month = createTime.getMonth() + 1;
      // let day = createTime.getDate();

      // let hours = createTime.getHours();
      // let minutes = createTime.getMinutes();
      // let seconds = createTime.getSeconds();

      // month = month < 10 ? `0${month}` : month;
      // day = day < 10 ? `0${day}` : day;

      // hours = hours < 10 ? `0${hours}` : hours;
      // minutes = minutes < 10 ? `0${minutes}` : minutes;
      // seconds = seconds < 10 ? `0${seconds}` : seconds;

      // order["create-time"] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      pool.query("SELECT * FROM `designs` WHERE id=? LIMIT 1", [order.design])
        .then(([rows]) => {
          const designData = rows[0];
          const render = `/renders/${designData.folderName}/${cardColorsToRenderColors[order.color]}/${order.design}`;
          res.render("orders/showDataNew", {
            order, 
            sideA, 
            sideB, 
            render,
            color: color,
            colorCSS: `
              .preview-card_${color.name} {
                background: ${color.cardBack};
              }

              .preview-card_${color.name} .fillable, 
              .preview-card_${color.name} .svgdevtextmc {
                fill: ${color.fillColor};
              }

              .preview-card_${color.name} .strokable {
                stroke: ${color.fillColor};
              }

              .preview-card_${color.name} .preview-card-logo {
                background-image: url(${color.logoImg});
              }
            `
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(400).end();
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).end();
    })
});

app.get("/orders/:id/:key/cachePay/", (req, res) => {
  pool.query("SELECT * FROM `orders` WHERE `id`=? AND `order-key`=? AND `state`=?", [req.params.id, req.params.key, 1])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      return pool.execute("UPDATE `orders` SET `state`=6 WHERE `id`=? AND `order-key`=?", [req.params.id, req.params.key])
    })
    .then(() => {
      res.redirect(`/orders/${req.params.id}/${req.params.key}/showDataNew/`);
    })
    .catch((err) => {
      console.log(err);

      res.status(400);
    })
});

app.get("/orders/:id/:key/sideANew.svg", (req, res) => {
  pool.query("SELECT * FROM `orders` WHERE `id`=? AND `manage-key`=?", [req.params.id, req.params.key])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      const data = JSON.parse(rows[0]["order-data"]);
      const design = rows[0].design;

      pool.query("SELECT * FROM `designs` WHERE id=? LIMIT 1", [design])
      .then(([rows]) => {
        const designData = rows[0];
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(drawApp.drawOnSideANew(data.cardAData, `origs/${designData.folderName}/${design}.svg`)).end();
      })
      .catch(error => {
        console.log(error);
        res.status(400).end();
      })
      
    })
    .catch((err) => {
      console.log(err);

      res.status(400).end();
    })
});

app.get("/orders/:id/:key/sideBNew.svg", (req, res) => {
  pool.query("SELECT * FROM `orders` WHERE `id`=? AND `manage-key`=?", [req.params.id, req.params.key])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      const data = JSON.parse(rows[0]["order-data"]);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(drawApp.drawOnSideBNew(data.cardBData, data.cardNum, data.cardTime)).end();
    })
    .catch((err) => {
      console.log(err);

      res.status(400);
    })
});

app.get("/orders/:id/:key/sideA.svg", (req, res) => {
  pool.query("SELECT * FROM `orders_old` WHERE `id`=? AND `order-key`=?", [req.params.id, req.params.key])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      const data = JSON.parse(rows[0]["order-data"]);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(drawApp.drawOnSideA(data.design, data.cardAData, true));
    })
    .catch((err) => {
      console.log(err);

      res.status(400);
    })
});

app.get("/orders/:id/:key/sideB.svg", (req, res) => {
  pool.query("SELECT * FROM `orders_old` WHERE `id`=? AND `order-key`=?", [req.params.id, req.params.key])
    .then(([rows]) => {
      if (rows.length == 0) throw new Error("Нет таких заказов");

      const data = JSON.parse(rows[0]["order-data"]);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(drawApp.drawOnSideB(data.cardBData, true)).end();;
    })
    .catch((err) => {
      console.log(err);

      res.status(400);
    })
});

app.use("/design/:promo/:locale", async (req, res) => {
  if (!ACCEPTED_LANGUAGES.includes(req.params.locale)) {
    res.redirect("/design/" + req.params.promo + "/");
  } else {
    let query = "";

    if (Object.keys(req.query).length != 0) {
      query = "?" + serialize(req.query)
    }

    await checkPausedTimePromo();

    pool.query("SELECT p.*, d.folderName FROM promo p JOIN designs d WHERE p.designID = d.id AND p.promoURI=? AND p.promoPaused=0", [req.params.promo])
      .then(([rows]) => {
        if (rows.length == 0) throw new Error("Такой акции нет");
        const promo = rows[0];
        const cardColor = allCardColors.find(color => color.name === promo.color)
        res.render("design-promo/" + req.params.locale, {
          query: query, 
          promo: promo, 
          cardColorsToRenderColors: cardColorsToRenderColors, 
          cardColors: [cardColor],
          cardColorsCSS: getCardColorCSS(cardColor),

          activeCardColorsNamesJSON: JSON.stringify([promo.color]),
          cardColorsToRenderColorsJSON: cardColorsToRenderColorsJSON,
          cardColorsToPriceJSON: cardColorsToPriceJSON,
          defaultColorNameJSON: JSON.stringify([promo.color])
        });
      })
      .catch(err => {
        console.log(err);
        res.status(404).end();
      });
  }
});

async function checkPausedTimePromo() {
  const [promo] = await pool.execute("SELECT * FROM `promo` WHERE `promoPaused`=0 AND `promoTime` != \"\"");

  const promoMayPaused = promo.filter(promo => {
    const promoTime = Date.parse(promo.promoTime);
    const promoDiff = Date.now() - (isNaN(promoTime) ? 0 : promoTime);
    return promoDiff > 0;
  });

  if (promoMayPaused.length != 0) await pool.execute("UPDATE `promo` SET `promoPaused`=1 WHERE `promoID` IN (" + promoMayPaused.map(promo => promo.promoID).join(", ") + ")");
}

app.use("/design/:promo/", (req, res, next) => {
  if (ACCEPTED_LANGUAGES.includes(req.params.promo)) {
    next();
  } else {
    const lang = req.acceptsLanguages(ACCEPTED_LANGUAGES);
    let query = "";

    if (Object.keys(req.query).length != 0) {
      query = "?" + serialize(req.query)
    }

    if (lang) {
      res.redirect("/design/" + req.params.promo + "/" + lang + "/" + query);
    } else {
      res.redirect("/design/" + req.params.promo + "/ru/" + query);
    }
  }
});

app.use("/:site/:locale", (req, res, next) => {
  let query = "";

  if (Object.keys(req.query).length != 0) {
    query = "?" + serialize(req.query)
  }

  if (!ACCEPTED_SITES.includes(req.params.site) || !ACCEPTED_LANGUAGES.includes(req.params.locale))
    next();
  else {
    if (req.params.site === "design") {
      pool
        .query("SELECT * FROM `design_categories`")
        .then(([rows]) => {
          res.render(req.params.site + "/" + req.params.locale, {
            query: query, 
            categories: rows, 
            cardColors: activeCardColors, 
            cardColorsCSS: activeCardColorsCSS,
            activeCardColorsNamesJSON: activeCardColorsNamesJSON,
            cardColorsToRenderColorsJSON: cardColorsToRenderColorsJSON,
            cardColorsToPriceJSON: cardColorsToPriceJSON,
            defaultColorNameJSON: defaultColorNameJSON
          });
        })
    } else {
      res.render(req.params.site + "/" + req.params.locale, {query: query});
    }
  }
});

app.use("/:site/", (req, res, next) => {
  if (!ACCEPTED_SITES.includes(req.params.site))
    next();
  else {
    const lang = req.acceptsLanguages(ACCEPTED_LANGUAGES);
    let query = "";

    if (Object.keys(req.query).length != 0) {
      query = "?" + serialize(req.query)
    }

    if (lang) {
      res.redirect("/" + req.params.site + "/" + lang + "/" + query);
    } else {
      res.redirect("/" + req.params.site + "/" + query);
    }
  }
});

app.use("/:locale/", (req, res, next) => {
  let query = "";

  if (Object.keys(req.query).length != 0) {
    query = "?" + serialize(req.query)
  }

  if (!ACCEPTED_LANGUAGES.includes(req.params.locale))
    next();
  else
    res.render(req.params.locale, {query: query});
});

app.use("/", (req, res) => {
  const lang = req.acceptsLanguages(ACCEPTED_LANGUAGES);
  let query = "";

  if (Object.keys(req.query).length != 0) {
    query = "?" + serialize(req.query)
  }

  if (lang) {
    res.redirect("/" + lang + "/" + query);
  } else {
    res.redirect("/ru/" + query);
  }
});


app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`)
});

function getValidationSchemaForPromo() {
  return Joi.object({
    promoID: Joi.number().required(),
    logoDeactive: Joi.bool().required(),
    delivery: Joi.string().valid("pickup", "delivery", "delivery-yandex").required(),
    bigChip: Joi.bool().required(),
    cardAData: Joi.array().items(Joi.object({
      text: Joi.string().min(0).required(),
      fontName: Joi.string().required(),
      pos: Joi.object({
        top:  Joi.number().required(),
        left: Joi.number().required(),
        width: Joi.number().required()
      }) 
    })).min(0).required(),
    cardBData: Joi.array().items(Joi.object({
      text: Joi.string().min(0).required(),
      fontName: Joi.string().required(),
      pos: Joi.object({
        top:  Joi.number().required(),
        left: Joi.number().required(),
        width: Joi.number().required()
      }) 
    })).min(0).required(),
    cardNum: Joi.string().min(0).required(),
    cardTime: Joi.string().min(0).required()
  });
}

function getValidationSchemaForDemo() {
  return Joi.object({
    design: Joi.number().required(),
    color: Joi.string().valid(...activeCardColors.map(color => color.name)).required(),
    logoDeactive: Joi.bool().required(),
    delivery: Joi.string().valid("pickup", "delivery", "delivery-yandex").required(),
    bigChip: Joi.bool().required(),
    cardAData: Joi.array().items(Joi.object({
      text: Joi.string().min(0).required(),
      fontName: Joi.string().required(),
      pos: Joi.object({
        top:  Joi.number().required(),
        left: Joi.number().required(),
        width: Joi.number().required()
      }) 
    })).min(0).required(),
    cardBData: Joi.array().items(Joi.object({
      text: Joi.string().min(0).required(),
      fontName: Joi.string().required(),
      pos: Joi.object({
        top:  Joi.number().required(),
        left: Joi.number().required(),
        width: Joi.number().required()
      }) 
    })).min(0).required(),
    cardNum: Joi.string().min(0).required(),
    cardTime: Joi.string().min(0).required()
  });
}

function serialize(obj) {
  var str = [];
  for (var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

function getCardColorCSS(color = config.cardColors[0]) {
  return `
    .visual #${color.name}-card-label .visual__color-label-color,
    #${color.name}-card:checked ~ .visual .visual__color-container-state-btn-color {
      background: ${color.labelBack};
    }

    #${color.name}-card:checked ~ .visual #${color.name}-card-label::after {
      opacity: 1;
    }

    #${color.name}-card:checked ~ .visual #${color.name}-card-state {
      display: inline-block;
    }

    .visual .visual__card_${color.name} .visual__card-side-a,
    .visual .visual__card_${color.name} .visual__card-side-b,
    .buy-pop__inner .preview .preview-card_${color.name} {
      color: ${color.textColor};
      background: ${color.cardBack};
    }

    .visual .visual__card_${color.name} .visual__card-side-a .fillable,
    .visual .visual__card_${color.name} .visual__card-side-a .svgdevtextmc,
    .visual .visual__card_${color.name} .visual__card-side-b .fillable,
    .visual .visual__card_${color.name} .visual__card-side-b .svgdevtextmc,
    .buy-pop__inner .preview .preview-card_${color.name} .fillable,
    .buy-pop__inner .preview .preview-card_${color.name} .svgdevtextmc {
      fill: ${color.fillColor};
    }

    .visual .visual__card_${color.name} .visual__card-side-a .strokable,
    .visual .visual__card_${color.name} .visual__card-side-b .strokable,
    .buy-pop__inner .preview .preview-card_${color.name} .strokable {
      stroke: ${color.fillColor};
    }

    .visual .visual__card_${color.name} .visual__card-side-b-logo,
    .buy-pop__inner .preview .preview-card_${color.name} .preview-card-logo {
      background-image: url(${color.logoImg});
    }
  `
}

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function createUTM(auth, values) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: '1vzubVo2HDsLzlmLdEfmbDy104hVlmGQTHUH9s2ECp4A',
    range: 'A1:O1',
    valueInputOption: "RAW",
    resource: {values}
  });
}