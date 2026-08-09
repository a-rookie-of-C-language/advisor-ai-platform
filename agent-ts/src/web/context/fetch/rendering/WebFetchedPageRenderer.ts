import type { WebFetchedPage } from "../../../fetch/model/WebFetchedPage.js";

export class WebFetchedPageRenderer {
  render(pages: WebFetchedPage[]): string {
    return pages
      .map((page, index) => {
        const title = page.title ? `Title: ${page.title}\n` : "";
        return `${index + 1}. URL: ${page.url}\n${title}Content: ${page.content}`;
      })
      .join("\n\n");
  }
}
