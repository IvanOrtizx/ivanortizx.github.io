# Super Muffler Inc. - página web

Página estática de una sola sección, en inglés y español, para GitHub Pages.
El formulario guarda los contactos en una hoja de Google (back office) con Google Apps Script.

## Qué hay en cada carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página. Los textos en inglés están aquí. |
| `js/i18n.js` | Los textos en español (misma clave que en `index.html`). |
| `js/config.js` | URL del formulario, horario para el aviso "Abierto ahora" y videos de TikTok/Instagram. |
| `js/main.js` | Idioma, horario en vivo, galería, formulario y carga del 3D. |
| `js/exhaust3d.js` | Escena 3D ya compilada (no se edita a mano). |
| `src/exhaust3d.src.js` | Código fuente del 3D. |
| `apps-script/Code.gs` | Back office: guarda los contactos en Google Sheets y avisa por correo. |
| `privacy.html` | Política de privacidad en inglés y español. |

## 1. Publicar en GitHub Pages (versión de prueba)

1. Crear el repositorio `supermuffler` en la cuenta `IvanOrtizx` y subir todo el contenido de esta carpeta.
2. Settings > Pages > Source: `Deploy from a branch`, rama `main`, carpeta `/ (root)`.
3. Queda en `https://ivanortizx.github.io/supermuffler/` para que Nuri y el taller la revisen.
   La página actual del taller sigue funcionando mientras tanto.

## 2. Back office del formulario (Google Sheets + Apps Script)

1. En la cuenta de Google del taller (o la tuya mientras construyes), crear una hoja de cálculo llamada `Super Muffler - Contactos web`.
2. Extensiones > Apps Script. Borrar lo que haya y pegar `apps-script/Code.gs`. Guardar.
3. Elegir la función `setup` y darle Ejecutar. Autorizar los permisos.
   Se crea la pestaña `Contacts` con encabezados, estados (New, Contacted, Came in, Customer, Not interested, Spam) y colores.
4. Implementar > Nueva implementación > tipo **Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Copiar la URL que termina en `/exec` y pegarla en `js/config.js` en `formEndpoint`. Subir el cambio a GitHub.
6. Probar: llenar el formulario de la página y revisar que aparezca la fila arriba en la hoja.
   También se puede usar el menú **Super Muffler > Send a test contact** dentro de la hoja.

**Aviso por correo (opcional):** en `Code.gs`, poner los correos en `NOTIFY_EMAILS` (separados por coma).
Luego Implementar > Administrar implementaciones > editar (lápiz) > Versión: **Nueva versión** > Implementar.
Así la URL `/exec` no cambia.

**Al transferirle la hoja al taller:** compartirla con la cuenta del taller como propietario. Después, desde esa cuenta,
hacer una implementación nueva (paso 4), porque la app web corre con la cuenta de quien la implementó, y actualizar
`formEndpoint` si la URL cambió.

## 3. Conectar el dominio (solo cuando la página esté aprobada)

En GoDaddy (acceso delegado), en los DNS de `supermufflerinc.com`:

- Registros **A** para `@` (borrar solo los A que apuntan a la plataforma actual y dejar estos cuatro):
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- Registro **CNAME** para `www` -> `ivanortizx.github.io`
- **No tocar** los registros MX ni los TXT del correo del taller.

Luego en GitHub: Settings > Pages > Custom domain: `supermufflerinc.com` > Save.
Cuando aparezca el certificado, activar **Enforce HTTPS**. Recomendado: verificar el dominio en
GitHub (Settings de la cuenta > Pages > Add a domain) para que nadie más lo pueda usar.

## 4. Cambios frecuentes

- **Horario:** cambiar en `js/config.js` (aviso "Abierto ahora"), en la tabla de `index.html`,
  en el pie de página (`footer.hoursText` en ambos idiomas) y en el bloque `openingHoursSpecification` del `<head>`.
- **Calificación de Google (4.8, 133 reseñas):** está escrita a mano en `index.html` y `js/i18n.js`. Actualizarla de vez en cuando.
- **Videos:** agregar el ID de cada video en `js/config.js` > `videos` (hay ejemplos comentados).
- **Fotos de la galería:** van en `img/gallery/` en dos tamaños (`nombre-sm.webp` de 560 px y `nombre.webp` de 1080 px).
- **Logos de marcas:** hoy se muestran como texto. Si el taller consigue los logos oficiales, se reemplazan en la sección `brands`.

## 5. Escena 3D

El carro tipo rayos X se carga después del texto, solo si el navegador tiene WebGL 2. Si no, se muestra
`img/exhaust-poster.webp`. Con "reducir movimiento" activado en el teléfono, se muestra quieta.

Para cambiar el 3D, editar `src/exhaust3d.src.js` y volver a compilar:

```bash
npm install three@0.170.0 esbuild
npx esbuild src/exhaust3d.src.js --bundle --format=esm --minify --outfile=js/exhaust3d.js
```
