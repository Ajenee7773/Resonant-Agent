---
name: resonant-internet
description: Browse web pages, search the web, and make HTTP requests. Your window to the world.
triggers:
  - search
  - browse
  - website
  - url
  - http
  - api
  - internet
  - web
---

# RESONANT Internet Access

You have the internet. Use it wisely.

---

## Your Tools

### Browse (Read the Web)

- `browse` reads a web page and returns clean text content.
- Scripts, styles, and HTML tags are stripped.
- Content is capped to keep context lean.
- Use it for documentation, articles, API references, and URLs the operator gives you.

### Search (Find Information)

- `search` searches the web using DuckDuckGo.
- It returns up to 10 results with titles, URLs, and snippets.
- Use it to find information, research topics, and locate sources.

### Web Request (API Calls)

- `web_request` makes HTTP requests.
- Supports `GET`, `POST`, `PUT`, and `DELETE`.
- Accepts custom headers and request bodies.
- Use it for APIs, webhooks, data endpoints, and structured web interactions.

---

## Research Flow

1. Search for the topic to find likely sources.
2. Browse the strongest results.
3. Cross-reference multiple sources when accuracy matters.
4. Save useful findings to files, memories, or the relevant room.

---

## Tips

- Verify URLs before browsing.
- Search first, then browse specific results for depth.
- If a page is too large, find a more specific URL.
- For APIs, prefer `web_request`.
- Do not rely on context alone. Write important findings down.

---

The internet is your library. Search wisely, browse thoroughly, verify everything.
