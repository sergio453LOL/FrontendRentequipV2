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
2. En **Settings > Environment Variables** agrega:
   - `VITE_API_URL` = `/api/v1`
   - `VITE_BACKEND_ORIGIN` = `https://44-215-225-249.sslip.io` (la URL que imprime `deploy/deploy-aws.sh`)
   - `VITE_STRIPE_PUBLISHABLE_KEY` = la clave `pk_test_...`

   Vite las inserta al compilar, así que si cambian hay que volver a desplegar (**Redeploy**).
3. Despliega.

`vercel.json` reenvía `/api`, `/demo-images` y `/uploads` al backend en AWS, así que el navegador solo habla
con `<proyecto>.vercel.app`. Eso hace que la web funcione en redes que bloquean `sslip.io`, como la de la
universidad. El backend arma las URLs de las fotos con su propio dominio; con `VITE_BACKEND_ORIGIN`
definido, `services/api.ts` las convierte en rutas del mismo dominio. **Si cambia la IP del backend,
actualiza el destino en `vercel.json` y `VITE_BACKEND_ORIGIN`.**

El resto de rutas van a `index.html`, de modo que recargar `/catalog` o `/reservations` no da 404.
Si `VITE_API_URL` usa `http://`, la consola lo avisa: el navegador bloquearía las peticiones por contenido
mixto.

## Comandos

```bash
npm run build   # tipos + build de producción
npm run lint    # oxlint
```
