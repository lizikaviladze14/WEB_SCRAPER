import puppeteer, { Browser, Page } from 'puppeteer';

interface Country {
  countryName: string
  countryUrl: string
}

interface City {
  cityName: string
  cityUrl: string
  country?: string
}

interface CityDetails {
  name: string
  url: string
  country?: string
  area?: string
  population?: string
  flagIconPath?: string
}

export class CapitalCityScraper {
  private browser: Browser | null = null
  private page: Page | null = null
  private readonly startUrl = "https://en.wikipedia.org/wiki/List_of_European_countries_by_area"

  constructor() {}

  async init(): Promise<void> {
    if (this.browser === null) {
      this.browser = await puppeteer.launch({ headless: false })
    }
    if (this.page === null) {
      this.page = await this.browser.newPage()
    }
    await this.page.goto(this.startUrl)
  }

  async scrapeCountries(): Promise<CityDetails[]> {
    if (this.page === null) {
      throw new Error('Page is not initialized.')
    }

    const citiesDetailsList: CityDetails[] = []

    // get the european countries list
    const countries = await this.page.evaluate(() => {
      const countriesList: Country[] = []
      const countries = document.querySelectorAll('table.wikitable tbody tr td:nth-child(2) > a')
      countries.forEach((url) => {
        const countryName = (url as HTMLAnchorElement).innerText
        const countryUrl = (url as HTMLAnchorElement).href
        countriesList.push({ countryName, countryUrl })
      })
      return countriesList
    })

    // loop through countries and go to the country page
    for (const country of countries) {
      await this.page.goto(country.countryUrl)

      // scrape the capital city for each country
      const capitalCity = await this.page.evaluate(() => {
        // capital city url and name
        const capitalCityLink = Array.from(document.querySelectorAll('.infobox.ib-country.vcard tr'))
        .filter((tr): tr is HTMLTableRowElement => tr.textContent?.includes('Capital') ?? false)      // filter for the row containing 'Capital'
        .map(tr => tr.querySelector('.infobox-data a'))                                               // look for the <a> tag inside that row
        .find(link => link !== null) as HTMLAnchorElement | null                                      // find the first valid link (if any)

        if (capitalCityLink) {
          return {
            cityName: capitalCityLink.innerText,
            cityUrl: capitalCityLink.href,
          }
        }
        return null
      })

      if (capitalCity) {
        const cityDetails = await this.scrapeCityDetails(capitalCity, country)
        if (cityDetails) {
          citiesDetailsList.push(...cityDetails)
        }
      }
    }

    return citiesDetailsList
  }

  async scrapeCityDetails(capitalCity: City, country: Country): Promise<CityDetails[] | null> {
    if (this.page === null) {
      throw new Error('Page is not initialized.')
    }
    const citiesDetailsList: CityDetails[] = []
    if (capitalCity) {
      // scrape the details for each capital city
      await this.page.goto(capitalCity.cityUrl)

      const capitalCityDetails = await this.page.evaluate(() => {
        const flagIcon = document.querySelector('.infobox.ib-settlement.vcard .infobox-full-data.maptable a img.mw-file-element')
        const flagIconPath = (flagIcon as HTMLImageElement)?.src

        // get numerical values based on a label (like "Area", "Population")
        const getValueByLabel = (label: string, regex: RegExp): string | undefined => {
          // get all rows with the header (th) containing the specified label (like: "Area" or "Population")
          const rows: HTMLTableRowElement[] = Array.from(document.querySelectorAll('.mergedtoprow th'))
            .filter((th): th is HTMLTableCellElement => th.textContent?.includes(label) ?? false) // filter th elements by label
            .map(th => th.parentElement as HTMLTableRowElement) // get the parent row (tr) of the filtered th elements
            .reduce((acc: HTMLTableRowElement[], row: HTMLTableRowElement) => {
              const nextRows: HTMLTableRowElement[] = []
              let currentRow = row.nextElementSibling as HTMLTableRowElement | null
              // accumulate rows until a new "mergedtoprow" class is encountered
              while (currentRow && !currentRow.classList.contains('mergedtoprow')) {
                nextRows.push(currentRow) // add rows following the specified label row until a new mergedtoprow is found
                currentRow = currentRow.nextElementSibling as HTMLTableRowElement | null
              }
              return acc.concat(row, nextRows) // return all rows (label row + following rows)
            }, [])

          // from the accumulated rows find td elements with values matching the specified regex
          const values: HTMLTableCellElement[] = rows
            .map(row => Array.from(row.querySelectorAll('td'))) // extract all td elements from each row
            .flat() // flatten the array (to have a single list of all td elements)
            .filter((td): td is HTMLTableCellElement => {
              const text = td.textContent?.trim() || ''
              return regex.test(text) // filter td elements based on the provided regex
            })

          // if any values are found, clean up the text and parse the number (removing commas)
          const valueText = values.length > 0 ? values[0].textContent?.trim() || '' : ''
          const value = valueText ? parseFloat(valueText.replace(/,/g, '')) : undefined

          return value?.toString()
        }

        // get Area
        const getArea = (): string | undefined => {
          // define regex to match area values like '100 km2'
          const areaRegex = /^[0-9,.]+\s+km2.*$/
          return getValueByLabel('Area', areaRegex)
        }
        const area = getArea()

        // get Population
        const getPopulation = (): string | undefined => {
          // define regex to match population values like '1,000,000' (with optional parentheses)
          const populationRegex = /^[0-9,.]+(\s+\(.*\))?$/
          return getValueByLabel('Population', populationRegex)
        }
        const population = getPopulation()

        return {
          flagIconPath,
          area,
          population
        }
      })

      if (capitalCityDetails) {
        citiesDetailsList.push({
          name: capitalCity.cityName,
          url: capitalCity.cityUrl,
          country: country.countryName,
          area: capitalCityDetails.area,
          population: capitalCityDetails.population,
          flagIconPath: capitalCityDetails.flagIconPath,
        })
      }
    }

    return citiesDetailsList.length > 0 ? citiesDetailsList : null
  }

  async close(): Promise<void> {
    if (this.browser !== null) {
      await this.browser.close()
    }
  }
}

(async () => {
  const scraper = new CapitalCityScraper()
  await scraper.init()
  const cityDetails = await scraper.scrapeCountries()
  console.log('Capital Cities: ', cityDetails)
  await scraper.close()
})()
