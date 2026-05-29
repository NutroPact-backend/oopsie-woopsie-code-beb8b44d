/**
 * Drop-in Wouter API implemented on top of TanStack Router.
 * Aliased as `wouter` in vite.config.ts so existing page/component imports work unchanged.
 */
import {
  Link as TLink,
  useParams as useTParams,
  useLocation as useTLocation,
  useNavigate,
} from "@tanstack/react-router";
import * as React from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  to?: string;
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, to, children, ...rest }, ref) => {
    const target = (href ?? to ?? "/") as string;
    // Use anchor + manual navigation so we can pass arbitrary string paths (including queries)
    // without TanStack's typed-route checking blocking us.
    return (
      <TLink ref={ref} to={target} {...(rest as Record<string, unknown>)}>
        {children as React.ReactNode}
      </TLink>
    );
  },
);
Link.displayName = "WouterLink";

/** Wouter: const [location, navigate] = useLocation();  navigate('/foo') */
export function useLocation(): [string, (to: string) => void] {
  const loc = useTLocation();
  const navigate = useNavigate();
  const go = React.useCallback(
    (to: string) => {
      // Strip hash fragment first, then split path from search
      const [withoutHash] = to.split("#");
      const [path, search] = withoutHash.split("?");
      navigate({
        to: path as string,
        search: search ? Object.fromEntries(new URLSearchParams(search)) : undefined,
      } as Parameters<typeof navigate>[0]);
    },
    [navigate],
  );
  return [loc.pathname, go];
}

/** Wouter: useSearch() -> "foo=bar&baz=1"  (no leading ?) */
export function useSearch(): string {
  const loc = useTLocation();
  return loc.searchStr?.replace(/^\?/, "") ?? "";
}

/** Wouter: useParams<{slug}>() -> { slug } */
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useTParams({ strict: false }) as T;
}

/** Wouter: const [match, params] = useRoute('/blog/:slug') */
export function useRoute<T extends Record<string, string> = Record<string, string>>(
  _pattern: string,
): [boolean, T | null] {
  const params = useTParams({ strict: false }) as T;
  return [params && Object.keys(params).length > 0, params ?? null];
}

export function useRouter() {
  return {};
}
