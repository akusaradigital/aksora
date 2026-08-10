export function buildWorkspaceUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function withUpdatedWorkspaceParams(
  currentSearch: string,
  update: (params: URLSearchParams) => void,
) {
  const params = new URLSearchParams(currentSearch);
  update(params);
  return params;
}
