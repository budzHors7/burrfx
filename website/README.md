# BurrFx Website

This is the Next.js landing page for BurrFx, a self-hosted MetaTrader 5 trading bot control system. The page markets the bot with bold launch copy, SEO metadata, social preview images, and Remotion-rendered product media.

The main positioning is built around four concrete ideas:

- MT5 signal automation
- risk profiles and trade guardrails
- a FastAPI control bridge
- mobile visibility through the Android mobile companion app, with iOS coming soon

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Better Auth for Google-only sign-in
- Remotion for the animated bot-flow GIF, product MP4s, and posters
- lucide-react for UI icons
- Bun for dependency management

## Local Development

Install dependencies and start the app:

```powershell
bun install
bun dev
```

Open `http://localhost:3000`.

## SEO And Social Images

The site uses App Router metadata in `app/layout.tsx`, plus file-based metadata routes for social preview images:

```text
app/opengraph-image.tsx
app/twitter-image.tsx
app/robots.ts
app/sitemap.ts
```

Set the production URL on Vercel so canonical, sitemap, robots, and social image URLs point at the live domain:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Without that variable, local development defaults to `http://localhost:3000`.

## Better Auth

The landing page sends all `Get BurrFx` CTAs to `/auth`. Sign-in and
registration are Google-only through Better Auth. The dashboard reads the active
Better Auth Google session when one exists, and otherwise shows mock user data
while local OAuth credentials are still being configured.

The app includes:

```text
app/auth/page.tsx
app/login/page.tsx
app/register/page.tsx
app/dashboard/page.tsx
app/_components/site-header.tsx
app/_components/account-menu.tsx
app/lib/auth.ts
app/lib/auth-client.ts
app/api/auth/[...all]/route.ts
```

Required environment variables:

```text
BETTER_AUTH_SECRET=long-random-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The local `.env` can also provide `BETTER_AUTH_API_KEY`; the server config uses
it as a fallback secret for this prototype and to enable the Better Auth
Infrastructure dashboard endpoints under `/api/auth/dash/*`. Prefer
`BETTER_AUTH_SECRET` for production session signing.

Configure this redirect URI in the Google OAuth client:

```text
http://localhost:3000/api/auth/callback/google
```

For production, replace the origin with the deployed domain.

Better Auth is configured in stateless mode for now, so no database migration is
required for the current mock dashboard build.

When a Better Auth session exists, the shared sticky header replaces the
`Get BurrFx` button with the user's Google display name and profile photo. The
account dropdown links to `/dashboard` and includes logout.

## Dashboard Downloads

The dashboard includes a Windows installer download card on the left and
installation instructions on the right. Point the installer button at the
signed BurrFx Windows release asset:

```text
NEXT_PUBLIC_WINDOWS_INSTALLER_URL=https://your-domain.example/downloads/burrfx-windows-installer.exe
```

If the variable is not set, the button uses the local fallback path:

```text
/downloads/burrfx-windows-installer.exe
```

Do not use the fallback in production unless that file exists in `public/downloads/`.


## Android App Link

The deploy section and dashboard include a download button for the Android
companion app. Set this to the published Google Play listing:

```text
NEXT_PUBLIC_ANDROID_APP_URL=https://play.google.com/store/apps/details?id=your.package.name
```

If it is not set, the button falls back to a Google Play search for BurrFx.

## Contact Form

The About page at `/about` includes a contact form powered by a Server Action:

```text
app/about/page.tsx
app/about/actions.ts
```

Set `CONTACT_WEBHOOK_URL` to forward submissions to an email, CRM, or team webhook endpoint. If it is not set, the form validates and shows a local confirmation only.

## Remotion Assets

The landing page uses Remotion-rendered media at:

```text
public/burrfx-bot-flow.gif
public/burrfx-product-showcase.mp4
public/burrfx-product-showcase-poster.png
public/burrfx-mobile-control.mp4
public/burrfx-mobile-control-poster.png
```

Render all video, GIF, and poster assets again after editing Remotion scenes:

```powershell
bun run motion:render
```

Render one asset at a time:

```powershell
bun run motion:render:flow
bun run motion:render:product
bun run motion:render:mobile
bun run motion:poster:product
bun run motion:poster:mobile
```

Preview the composition in Remotion Studio:

```powershell
bun run motion:studio
```

Source files live in `remotion/`.

## Project Files

- `app/page.tsx`: BurrFx landing page content and layout
- `app/globals.css`: global Tailwind theme, page background, and visual helpers
- `app/layout.tsx`: SEO metadata, Open Graph/Twitter metadata, and font setup
- `app/_components/site-footer.tsx`: shared marketing footer
- `app/opengraph-image.tsx`: generated 1200x630 Open Graph image
- `app/twitter-image.tsx`: generated 1200x675 social image
- `app/robots.ts`: robots metadata route
- `app/sitemap.ts`: sitemap metadata route
- `app/about/page.tsx`: About page with contact form
- `app/about/actions.ts`: contact form Server Action
- `app/auth/page.tsx`: Better Auth Google-only auth page
- `app/lib/auth.ts`: Better Auth server configuration with the dashboard plugin
- `app/lib/auth-client.ts`: Better Auth React client with dashboard client plugin
- `app/login/page.tsx`: Google-only sign-in page
- `app/register/page.tsx`: Google-only registration page
- `app/dashboard/page.tsx`: dashboard shell with Better Auth or mock Google user data
- `app/api/auth/[...all]/route.ts`: Better Auth route handler
- `remotion/BurrFxBotFlow.tsx`: animated explainer scene
- `remotion/ProductShowVideos.tsx`: product showcase and mobile control scenes
- `public/burrfx-bot-flow.gif`: generated animated image used by the site
- `public/burrfx-product-showcase.mp4`: generated landscape product video
- `public/burrfx-mobile-control.mp4`: generated vertical product video

## Verification

Use these checks before deployment:

```powershell
bun run lint
bun run build
```

## Deployment

The site is a standard Next.js app and can be deployed on Vercel with the default framework settings. Add `NEXT_PUBLIC_SITE_URL` in Vercel once the production domain is known.

## Trading Risk Note

BurrFx is presented as an automation and control surface. It should not be marketed as a profit guarantee. Automated trading involves market, broker, liquidity, connectivity, and configuration risk.
