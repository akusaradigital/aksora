export type SearchScope =
 |"all"
 |"tasks"
 |"bugs"
 |"test-plans"
 |"test-suites"
 |"test-cases"
 |"test-sessions"
 |"meeting-notes"
 |"sprints"
 |"assignees"
 |"users"
 |"deployments"
 |"activity";

export type SearchResult = {
 id: string;
 code: string;
 label: string;
 sublabel: string;
 href: string;
 type: string;
 group: string;
 snippet: string;
 score: number;
 matchedField: string;
};

export type SearchResponse = {
 results?: SearchResult[];
};

export type SearchScopeOption = {
 value: SearchScope;
 label: string;
};

export type SearchResultGroup = {
 group: string;
 items: SearchResult[];
};
