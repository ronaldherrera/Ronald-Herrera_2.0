import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ABOUT,
  CONTACT,
  FEATURED_PROJECTS,
  LAB_PROJECTS,
  PAGE_META,
  SOCIAL_LINKS,
} from './src/features/ar-cv/arCvData.js'

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Genera dist/cv/index.html: la misma SPA con metadatos propios (título,
// descripción, Open Graph, canonical, theme-color) y un resumen HTML legible
// sin JavaScript para buscadores y previsualizaciones al compartir.
const arCvStaticPage = () => {
  let outDir = 'dist'
  return {
    name: 'ar-cv-static-page',
    apply: (_, env) => env.command === 'build' || env.isPreview,
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    // `vite preview` replica la regla de public/.htaccess: /cv y /ar-cv -> /cv/index.html
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = req.url.split('?')
        if (/^\/(cv|ar-cv)\/?$/.test(path)) req.url = `/cv/index.html${query ? `?${query}` : ''}`
        next()
      })
    },
    closeBundle() {
      const source = readFileSync(resolve(outDir, 'index.html'), 'utf-8')
      const e = escapeHtml
      const head = [
        `<meta name="description" content="${e(PAGE_META.description)}" />`,
        `<link rel="canonical" href="${e(PAGE_META.canonical)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:locale" content="es_ES" />`,
        `<meta property="og:title" content="${e(PAGE_META.title)}" />`,
        `<meta property="og:description" content="${e(PAGE_META.description)}" />`,
        `<meta property="og:url" content="${e(PAGE_META.canonical)}" />`,
        `<meta property="og:image" content="${e(PAGE_META.image)}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
      ].join('\n    ')

      const list = (items, render) => `<ul>${items.map((item) => `<li>${render(item)}</li>`).join('')}</ul>`
      const noscript = `<noscript>
      <main style="max-width:720px;margin:0 auto;padding:24px;font-family:sans-serif;background:#101010;color:#EAE5CA">
        <h1>${e(CONTACT.name)}</h1>
        <p>${e(CONTACT.tagline)} ${e(CONTACT.role)}.</p>
        <h2>Proyectos</h2>
        ${list(FEATURED_PROJECTS, (p) => `<strong>${e(p.name)}</strong>: ${e(p.description)}`)}
        <h2>Ronald Lab</h2>
        ${list(LAB_PROJECTS, (p) => `<strong>${e(p.name)}</strong>: ${e(p.description)}`)}
        <h2>Sobre mí</h2>
        <p>${e(ABOUT.intro)}</p>
        <h2>Hablemos</h2>
        <p><a href="${e(CONTACT.phoneHref)}">${e(CONTACT.phoneDisplay)}</a> · <a href="${e(CONTACT.emailHref)}">${e(CONTACT.email)}</a> · <a href="${e(CONTACT.web)}">${e(CONTACT.webDisplay)}</a></p>
        ${list(SOCIAL_LINKS, (s) => `<a href="${e(s.href)}">${e(s.label)}</a>`)}
      </main>
    </noscript>`

      const html = source
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${e(PAGE_META.title)}</title>\n    ${head}`)
        .replace(/<meta name="theme-color" content="[^"]*"\s*\/?>/, `<meta name="theme-color" content="${PAGE_META.themeColor}" />`)
        .replace('<div id="root"></div>', `<div id="root"></div>\n    ${noscript}`)

      mkdirSync(resolve(outDir, 'cv'), { recursive: true })
      writeFileSync(resolve(outDir, 'cv', 'index.html'), html)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // `npm run dev:https` sirve por HTTPS (certificado local) para probar la cámara desde el móvil.
  plugins: [react(), mode === 'https' && basicSsl(), arCvStaticPage()].filter(Boolean),
  server: {
    host: true
  }
}))
