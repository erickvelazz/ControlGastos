# MisGastos

¿A dónde se fue la quincena? MisGastos es una app para dejar de preguntártelo.

Es una PWA de finanzas personales pensada para el día a día: registrás un gasto en dos toques, ves en un vistazo cuánto te queda del mes, y le hacés seguimiento de verdad a esas deudas y suscripciones que normalmente se te olvidan hasta que ya es tarde.

Se instala directo desde el navegador (sin App Store ni Play Store), funciona offline y se ve igual de bien en modo oscuro que en modo claro.

## Qué podés hacer

- **Dashboard** con balance del mes, tendencia de ingresos vs. gastos y desglose de gastos por categoría — todo con datos reales, nada de números de relleno.
- **Movimientos**: cargá gastos e ingresos, buscá y filtrá por tipo o categoría.
- **Categorías** propias, con color e ícono, y un vistazo de qué porcentaje de tu gasto se va en cada una.
- **Deudas** con barra de progreso, historial de abonos y la posibilidad de marcar un pago como "bonificación" (esos abonos extra que hacés fuera de tu mensualidad).
- **Suscripciones** con alertas de vencimiento por color, para que ningún cobro te agarre desprevenido.
- **Modo oscuro / claro**, con la preferencia de tu sistema como punto de partida.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth) · TanStack Query · Recharts · React Hook Form + Zod

## Correrlo en local

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run preview  # servir el build localmente
```

Necesitás un archivo `.env.local` en la raíz con las credenciales de tu proyecto de Supabase:

```
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Estado

Proyecto personal en desarrollo activo.
