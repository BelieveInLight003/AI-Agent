import 'dotenv/config';
import { z } from 'zod';
import { tool } from 'langchain';

const BOCHA_URL = 'https://api.bochaai.com/v1/web-search';

const bochaSearch = async ({ query, count }) => {
  const apiKey = process.env.BO_CHA_API_KEY?.trim();
  if (!apiKey) {
    return 'web_search failed: missing BO_CHA_API_KEY';
  }

  try {
    const response = await fetch(BOCHA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        freshness: 'noLimit',
        query,
        count,
        summary: true,
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      return `web_search failed: ${response.status} ${raw.slice(0, 500)}`;
    }

    const json = JSON.parse(raw);
    const pages = json.data?.webPages?.value ?? [];
    if (!pages.length) {
      return 'web_search: no results';
    }

    return pages
      .map((page, i) => {
        const title = page.name ?? page.title ?? '';
        const url = page.url ?? '';
        const summary = page.summary ?? page.snippet ?? '';
        return `${i + 1}. ${title}\n${url}\n${summary}`;
      })
      .join('\n\n');
  } catch (err) {
    return `web_search failed: ${err instanceof Error ? err.message : String(err)}`;
  }
};

export const webSearchTool = tool(
  async (input) => {
    const count = input?.count ?? 10;
    return bochaSearch({ query: input.query, count });
  },
  {
    name: 'web_search',
    description: 'Search the web for information',
    schema: z.object({
      query: z.string().describe('The query to search for'),
      count: z
        .number()
        .optional()
        .describe('The number of results to return'),
    }),
  },
);
