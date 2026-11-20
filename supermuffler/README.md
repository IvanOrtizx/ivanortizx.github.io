# Super Muffler Inc. - página web

Página estática de una sola sección, en inglés y español, para GitHub Pages.
Cada contacto del formulario le llega al taller por correo, con el servicio gratuito Web3Forms.

## Qué hay en cada carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página. Los textos en inglés están aquí. |
| `js/i18n.js` | Los textos en español (misma clave que en `index.html`). |
| `js/config.js` | Clave del formulario (Web3Forms), horario para el aviso "Abierto ahora" y videos de TikTok/Instagram. |
| `js/main.js` | Idioma, horario en vivo, galería, formulario y carga del 3D. |
| `js/exhaust3d.js` | Escena 3D ya compilada (no se edita a mano). |
| `src/exhaust3d.src.js` | Código fuente del 3D. |
| `privacy.html` | Política de privacidad en inglés y español. |

## 1. Publicar en GitHub Pages (versión de prueba)

1. Crear el repositorio `supermuffler` en la cuenta `IvanOrtizx` y subir todo el contenido de esta carpeta.
2. Settings > Pages > Source: `Deploy from a branch`, rama `main`, carpeta `/ (root)`.
3. Queda en `https://ivanortizx.github.io/supermuffler/` para que Nuri y el taller la revisen.
   La página actual del taller sigue funcionando mientras tanto.

## 2. Formulario: que los contactos lleguen al correo

1. Entrar a https://web3forms.com, escribir el correo del taller (o el tuyo para probar) y pedir la clave (access key). Llega a ese correo.
2. Pegar la clave en `js/config.js`, en `web3formsKey`. Subir el cambio a GitHub.
3. Probar: llenar el formulario. Llega un correo con el asunto "New website contact: nombre (servicio)".
   Si la persona dejó su correo, basta con darle "Responder" para escribirle.
4. La primera vez puede llegar a Spam: marcarlo como "No es spam".

Plan gratis: 250 envíos al mes. Para cambiar el correo que recibe los contactos, se saca una clave nueva con ese correo y se reemplaza en `js/config.js`.

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
