/**
 * Types for the module NGINX loads. The implementation is plain JavaScript
 * because njs runs it directly, and njs supports a default export only, which
 * is why everything hangs off one object.
 */
declare const module: {
  /** The `js_set` handler; `request` is the njs HTTP request object. */
  rootLanguage(request: {
    headersIn?: Record<string, string | undefined>;
  }): string;
  negotiate(
    cookie: string | null | undefined,
    acceptLanguage: string | null | undefined,
  ): string;
  constants: {
    supported: string[];
    fallback: string;
    cookieName: string;
  };
};
export default module;
