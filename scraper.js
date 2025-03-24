// Add target URLs here
const urls = [
  "https://pricespy.co.nz/product.php?p=5250941", //Sony headphones
  "https://pricespy.co.nz/product.php?p=4290145", //Oakleys
  "https://pricespy.co.nz/product.php?p=6476846", //bosch

  "https://pricespy.co.nz/product.php?p=5082120", //dyson
  "https://pricespy.co.nz/product.php?p=13437587", //samsung
  "https://pricespy.co.nz/product.php?p=14002034", //chemical
];

import puppeteer from "puppeteer-core";
import { configDotenv } from "dotenv";

configDotenv();

const scrollToDiv = async (page, isItemSoldSelector) => {
  try {
    let isItemSoldElementVisible = false;

    while (!isItemSoldElementVisible) {
      //check if item sold element is visible
      isItemSoldElementVisible = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element
          ? element.getBoundingClientRect().top < window.innerHeight
          : false;
      }, isItemSoldSelector);

      if (!isItemSoldElementVisible) {
        //Scroll down by a fixed amount
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight / 2); //adjust scroll amount here
        });

        //wait breifly before scrolling again
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    //Price element now visible
  } catch (error) {
    console.error("Error while scrolling:", error);
  }
};

console.log(process.env.CHROME_EXECUTABLE_PATH);

// Funcion does webscaping
const getPrice = async (url) => {
  // Launch puppeteer
  let browser;
  if (process.env.CHROME_EXECUTABLE_PATH) {
    // Local development
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
    });
  } else if (process.env.BROWSER_WS_ENDPOINT) {
    // Browserless setup
    browser = await puppeteer.connect({
      browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
    });
  } else {
    console.error("No browser setup found");
    return;
  }
  // Open a new page
  const page = await browser.newPage();

  //div selectors
  const isItemSoldSelector = ".Text--q06h0j.gxjLMM.h4text";
  const priceSelector = ".Text--q06h0j.jCOGEL.h3text.StyledPrice-sc-0-4.llGUBQ";

  // Open price spy
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Scroll till element is on screen
    await scrollToDiv(page, isItemSoldSelector);

    // Get page data
    const isItemSoldResult = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.innerText.trim() : null;
    }, isItemSoldSelector);

    //Determine if the item is sold or not
    if (isItemSoldResult.includes("No shop sells this product")) {
      console.log(`Item not sold: ${isItemSoldResult}`);
    } else {
      //If the item is sold, scrape and display the price
      await scrollToDiv(page, priceSelector);

      const price = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.innerText.trim() : null;
      }, priceSelector);

      if (
        isItemSoldResult.includes(
          "No shop with a direct link sells this product"
        )
      ) {
        console.log(`No shop with a direct link sells this product: ${price}`);
      } else {
        console.log(`Price: ${price}`);
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  } finally {
    await browser.close();
  }
};

for (const url of urls) {
  await getPrice(url); // Await each scrape to ensure sequential execution
}
