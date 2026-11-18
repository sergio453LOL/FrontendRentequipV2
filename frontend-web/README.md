# RentEquip Web

Aplicación React 19 + TypeScript + Vite + Tailwind para publicar maquinaria, buscarla, reservarla y pagarla.

## Desarrollo local

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:8080/api/v1
npm install
npm run dev
```

## Deployment en GitHub Pages (actual)

La web está publicada en https://sergio453lol.github.io/FrontendRentequipV2/. El workflow
[`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) la compila y publica en cada
push a `main`, con `VITE_API_URL` y `VITE_STRIPE_PUBLISHABLE_KEY` como variables del repositorio
(**Settings > Secrets and variables > Actions > Variables**). Sin `VITE_API_URL` usa
`https://44-215-225-249.sslip.io/api/v1`.

## Deployment en Vercel (alternativa)

1. En Vercel: **Add New > Project**, importa el repositorio y en **Root Directory** elige `frontend-web`.
   El resto lo toma de `vercel.json` (framework Vite, `npm run build`, carpeta `dist`).
2. En **Settings > Environment Variables** agrega `VITE_API_URL` con la URL **HTTPS** del backend
   (la imprime `deploy/deploy-aws.sh`, p. ej. `https://44-215-225-249.sslip.io/api/v1`).
   Vite la inserta al compilar, así que si cambia hay que volver a desplegar (**Redeploy**).
3. Despliega. La URL `https://<proyecto>.vercel.app` ya está permitida por el CORS del backend
   (`https://*.vercel.app`). Para un dominio propio, agrégalo a `CORS_ALLOWED_ORIGINS` en el backend.

`vercel.json` redirige todas las rutas a `index.html`, de modo que recargar `/catalog` o
`/reservations` no da 404. Si `VITE_API_URL` usa `http://`, la consola lo avisa: el navegador
bloquearía las peticiones por contenido mixto.

## Comandos

```bash
npm run build   # tipos + build de producción
npm run lint    # oxlint
```
