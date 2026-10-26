# Bellarium · Reservas

Página pública de reservas + panel privado (agenda, asistencias, clientas, fidelización por WhatsApp y dashboard).

- **Clientas:** `https://TU-URL/` → eligen servicio, día y hora. La hora queda **bloqueada y "Por confirmar"**.
- **Tú:** `https://TU-URL/admin` → entras con tu contraseña, apruebas o rechazas solicitudes (con aviso por WhatsApp en un clic) y ves todo el negocio.

## Publicar en Render (≈10 min)

1. **Sube esta carpeta a GitHub** (repositorio privado): github.com → *New repository* → *uploading an existing file* → arrastra el contenido de la carpeta (sin `node_modules`).
2. En **render.com** → *New* → **Blueprint** → elige ese repositorio → *Apply*.
3. Render te pide `ADMIN_PASSWORD`: escribe una contraseña larga que solo tú sepas.
4. Cuando termine, abre la URL que te da Render. Tu panel está en `/admin`.
5. En **Configuración** del panel: agrega tu **WhatsApp del negocio**, revisa horarios, precios y servicios (HIFU está "A cotizar").

## ⚠ Antes de usarlo con clientas reales

- La **base de datos gratis de Render vence a los 30 días** (con 14 días de gracia y luego se borra). Sube la base de datos y el servicio web a un plan pago desde el panel de Render cuando lo vayas a usar en serio. El servicio gratis, además, se duerme tras 15 min sin visitas.
- Descarga un **respaldo** de vez en cuando: Configuración → *Respaldo completo (JSON)*.
- Dominio propio (ej. reservas.bellarium.cl): Render → tu servicio → *Settings* → *Custom Domains*.

## Cómo funciona por dentro

- `server.js` (Express) + Postgres. La tabla `docs` guarda todo como documentos JSON.
- `POST /api/book` valida servicio, día, horario y cupo **dentro de una transacción con bloqueo**, así dos clientas no pueden tomar la misma hora.
- `/api/public` entrega solo servicios, horario y horas ocupadas (sin nombres ni teléfonos).
- Todo lo demás (`/api/docs/*`) exige sesión de administradora (cookie firmada, 30 días).
- Límites: 10 solicitudes por hora por IP, máx. 3 horas activas por teléfono, campo trampa anti-bots.
- Interfaz: `frontend/` (fuentes) → `python3 frontend/build.py` genera `public/index.html`.

## Desarrollo local

```
npm install
ADMIN_PASSWORD=algo-largo npm start     # sin DATABASE_URL guarda en data.json (solo pruebas)
```
