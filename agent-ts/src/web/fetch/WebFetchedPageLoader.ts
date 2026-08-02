import type { WebFetchClient } from "./WebFetchClient.js";
import type { WebFetchedPage } from "./WebFetchedPage.js";

export class WebFetchedPageLoader {
  async load(webFetchClient: WebFetchClient, urls: string[]): Promise<WebFetchedPage[]> {
    return (await Promise.all(urls.slice(0, 3).map((url) => webFetchClient.fetchPage(url)))).filter(
      (page): page is WebFetchedPage => page !== null
    );
  }
}
