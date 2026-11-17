# Wankun-Panel
## Estructura (desde 17/11/2026)

`index.html` tiene solo el HTML. Estilos en `css/panel.css`. El JavaScript está dividido por sección en `js/` y se carga en este orden (el orden importa):

core → vete → finanzas → ventas (incluye Top productos) → clientes (incluye Reseñas) → envios → recompras → migracion → marketing → stock → analisis-clientes → hoja-ruta → precios

Para arreglar algo de una sección, alcanza con abrir su archivo. Al cambiar un archivo, subir el `?v=N` de su `<script>` en `index.html` para que el navegador no use la versión vieja.
