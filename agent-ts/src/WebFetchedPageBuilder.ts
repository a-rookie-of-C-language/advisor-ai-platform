import type { WebFetchedPage } from "./WebFetchedPage.js";
import { WebHtmlParser } from "./WebHtmlParser.js";

export class WebFetchedPageBuilder {
  private readonly htmlParser = new WebHtmlParser();

  build(url: string, html: string, maxContentLength: number): WebFetchedPage | null {
    const title = this.htmlParser.extractTitle(html);
    const content = this.htmlParser.extractText(html).slice(0, maxContentLength);
    if (!content.trim()) {
      return null;
    }
    return {
      url,
      title,
      content,
      source: "web"
    };
  }
}
