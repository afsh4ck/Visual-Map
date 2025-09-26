import createMiddleware from 'next-intl/middleware';
 
export const locales = ['en', 'es'] as const;
export const localePrefix = 'always';
 
export default createMiddleware({
  defaultLocale: 'es',
  locales,
  localePrefix
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    '/',
    '/(en|es)/:path*',
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
