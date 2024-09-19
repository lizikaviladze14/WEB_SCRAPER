# Capital City Scraper

This project is a web scraper built with Puppeteer and TypeScript that extracts detailed information about the capital cities of European countries from Wikipedia.

### Features
- Scrapes a list of European countries and their capital cities.
- Retrieves detailed information for each capital city, including:
  - Area (in square kilometers)
  - Population
  - Country flag icon
- Uses **Puppeteer** for browser automation and page navigation.
- Outputs the scraped data as an array of city detail objects.


### How It Works

The scraper:

1. Navigates to a Wikipedia page listing European countries.
2. Extracts each country's name and its capital city's details.
3. Visits each capital city's Wikipedia page and scrapes information like area, population, and the flag icon URL.
4. Outputs the scraped data as an array of city detail objects, making it suitable for further processing or storage.

#### Note:

- The `{ headless: false }` property in the code allows the scraper to **open a visible browser window** while scraping. This is useful for debugging or visually following the scraping process.
- For a **background process without opening the browser**, you can set `{ headless: true }`.

## How to Run

```
npm install
ts-node index.ts
```



<img width="1276" alt="Screenshot 2024-09-19 at 15 16 46" src="https://github.com/user-attachments/assets/04413bf1-a111-4561-9b46-e99ba577b4ff">
