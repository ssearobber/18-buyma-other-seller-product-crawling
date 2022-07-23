const puppeteer = require('puppeteer');
const dayjs = require('dayjs');

const OtherSellerProduct = require('../models/otherSellerProduct');
const OtherSeller = require('../models/otherSeller');

// buyma 데이터 크롤링
async function buyma() {
  const userId = process.env.USER_ID || userId;
  let browser = {};
  let page = {};

  try {
    //otherSeller테이블에서 데이터 취득
    console.log('otherSeller테이블의 다른판매자ID데이터 취득시작.');
    let otherSellerResult = [];
    try {
      otherSellerResult = await OtherSeller.findAll({ attributes: ['buyma_user_id'] });
    } catch (e) {
      console.log('otherSeller select all error', e);
    }
    console.log('otherSeller테이블의 다른판매자ID데이터 취득종료.');

    for (let i = 0; i < otherSellerResult.length; i++) {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          // '--window-size=1920,1080',
          // '--disable-notifications',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

      // 라이프스타일 전상품을 크롤링 할 경우
      if (otherSellerResult[i].buyma_user_id == '000001') {
        // 전체 상품 리스트로 취득
        let isDataInThePage = true;
        let pageNum = 1;
        let today = dayjs().format('YYYY/MM/DD');
        let totalProducts = [];
        let products = [];
        let isDuplicationBuymaItemId = true;
        while (isDataInThePage) {
          console.log(`https://www.buyma.com/r/-C1004_${pageNum}/에 이동`);

          page = await browser.newPage();
          // await page.setViewport({
          //   width: 1480,
          //   height: 1080,
          // });
          await page.setDefaultNavigationTimeout(0);
          let response = await page.goto(`https://www.buyma.com/r/-C1004_${pageNum}/`, {
            waitUntil: 'networkidle0',
            // timeout: 30000,
          });
          if (!response) {
            throw 'Failed to load page!';
          }

          await page.waitForTimeout(20000); // 없으면 크롤링 안됨

          // buyma 상품 list 페이지의 마지막페이지 확인후, 첫번째 페이지로 돌아왔을때 중복 체크
          console.log('데이터 중복 체크 시작.');
          let buymaItemId = await page.evaluate(() => {
            let buymaItemId = document.querySelector('ul li[item-id]').getAttribute('item-id');
            return buymaItemId;
          });
          isDuplicationBuymaItemId = false;
          if (totalProducts.length > 0) {
            for (let j = 0; j < totalProducts.length; j++) {
              if (totalProducts[j].buymaProductId == buymaItemId) {
                isDuplicationBuymaItemId = true;
                break;
              }
            }
          }
          console.log('데이터 중복 체크 종료.');

          if (!isDuplicationBuymaItemId) {
            // 데이터 크롤링
            console.log('데이터 크롤링 시작.');
            products = await page.evaluate((today) => {
              let tags = document.querySelectorAll('ul li[item-id]');
              let products = [];
              tags.forEach((t) => {
                products.push({
                  buymaProductId: t && t.querySelector('.product_img').getAttribute('syo_id'),
                  buymaProductName: t && t.querySelector('.product_img').getAttribute('syo_name'),
                  category: t && t.querySelector('.product_img').getAttribute('category'),
                  today,
                  link:
                    t &&
                    'https://www.buyma.com' +
                      t.querySelector('.product_Action').getAttribute('item-url'),
                });
              });
              return products;
            }, today);

            totalProducts.push(...products);
            pageNum++;

            await page.close();
          } else {
            isDataInThePage = false;
            await browser.close();
            console.log('데이터 크롤링 종료.');

            console.log('otherSellerProduct테이블의 데이터 upsert시작.');
            for (let product of totalProducts) {
              if (product.buymaProductId) {
                try {
                  await OtherSellerProduct.upsert({
                    other_seller_id: otherSellerResult[i].buyma_user_id,
                    buyma_product_id: product.buymaProductId,
                    buyma_product_name: product.buymaProductName,
                    category: product.category,
                    create_id: 'crawling',
                    date_created: today,
                    update_id: 'crawling',
                    last_updated: today,
                  });
                } catch (e) {
                  console.log('upsert error', e);
                }
              }
            }
            console.log('otherSellerProduct테이블의 데이터 upsert종료.');
          }
        }
      } else {
        // 해당 유져 상품 크롤링 할 경우

        // 전체 상품 리스트로 취득
        let isDataInThePage = true;
        let pageNum = 1;
        let today = dayjs().format('YYYY/MM/DD');
        let totalProducts = [];
        let products = [];
        let isDuplicationBuymaItemId = true;
        while (isDataInThePage) {
          console.log(
            `https://www.buyma.com/r/-B${otherSellerResult[i].buyma_user_id}_${pageNum}/에 이동`,
          );

          page = await browser.newPage();
          // await page.setViewport({
          //   width: 1480,
          //   height: 1080,
          // });
          await page.setDefaultNavigationTimeout(0);
          let response = await page.goto(
            `https://www.buyma.com/r/-B${otherSellerResult[i].buyma_user_id}_${pageNum}/`,
            {
              waitUntil: 'networkidle0',
              // timeout: 30000,
            },
          );
          if (!response) {
            throw 'Failed to load page!';
          }

          await page.waitForTimeout(30000); // 없으면 크롤링 안됨

          // buyma 상품 list 페이지의 마지막페이지 확인후, 첫번째 페이지로 돌아왔을때 중복 체크
          console.log('데이터 중복 체크 시작.');
          let buymaItemId = await page.evaluate(() => {
            let buymaItemId = document.querySelector('ul li[item-id]').getAttribute('item-id');
            return buymaItemId;
          });
          isDuplicationBuymaItemId = false;
          if (totalProducts.length > 0) {
            for (let j = 0; j < totalProducts.length; j++) {
              if (totalProducts[j].buymaProductId == buymaItemId) {
                isDuplicationBuymaItemId = true;
                break;
              }
            }
          }
          console.log('데이터 중복 체크 종료.');

          if (!isDuplicationBuymaItemId) {
            // 데이터 크롤링
            console.log('데이터 크롤링 시작.');
            products = await page.evaluate((today) => {
              let tags = document.querySelectorAll('ul li[item-id]');
              let products = [];
              tags.forEach((t) => {
                products.push({
                  buymaProductId: t && t.querySelector('.product_img').getAttribute('syo_id'),
                  buymaProductName: t && t.querySelector('.product_img').getAttribute('syo_name'),
                  category: t && t.querySelector('.product_img').getAttribute('category'),
                  today,
                  link:
                    t &&
                    'https://www.buyma.com' +
                      t.querySelector('.product_Action').getAttribute('item-url'),
                });
              });
              return products;
            }, today);

            totalProducts.push(...products);
            pageNum++;

            await page.close();
          } else {
            isDataInThePage = false;
            await browser.close();
            console.log('데이터 크롤링 종료.');

            console.log('otherSellerProduct테이블의 데이터 upsert시작.');
            for (let product of totalProducts) {
              if (product.buymaProductId) {
                try {
                  await OtherSellerProduct.upsert({
                    other_seller_id: otherSellerResult[i].buyma_user_id,
                    buyma_product_id: product.buymaProductId,
                    buyma_product_name: product.buymaProductName,
                    category: product.category,
                    create_id: 'crawling',
                    date_created: today,
                    update_id: 'crawling',
                    last_updated: today,
                  });
                } catch (e) {
                  console.log('upsert error', e);
                }
              }
            }
            console.log('otherSellerProduct테이블의 데이터 upsert종료.');
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
    await page.close();
    await browser.close();
  }
}

module.exports.buyma = buyma;
