# CRM UI

Aplicación Angular organizada por funcionalidad, con componentes standalone.

## Estructura

- `src/app/core/layout/`: estructura principal de la aplicación, header y sidebar. Cada componente agrupa su TypeScript, HTML y CSS.
- `src/app/core/pages/`: páginas generales de la aplicación, como la página de acceso denegado.
- `src/app/features/<feature>/`: cada funcionalidad tiene su archivo `<feature>.routes.ts` y una carpeta `pages/`.
- `src/app/features/<feature>/pages/<page>/`: componente de página y su template HTML externo, con el mismo nombre base.
- `src/app/app.routes.ts`: composición de las rutas de la aplicación.
- `src/styles.css`: estilos globales y variables visuales compartidas.

Usar nombres de carpetas y archivos en kebab-case. Los componentes específicos de una funcionalidad deben vivir dentro de ella; crear una carpeta `shared/` cuando existan elementos reutilizables entre funcionalidades.

## Desarrollo

- `npm start`: servidor de desarrollo.
- `npm run build`: compilación de producción.
- `npm test -- --watch=false`: pruebas de navegación y layout.

## Formato

- `npm run format`: formatea el código con Prettier.
- `npm run format:check`: verifica el formato sin modificar archivos.

La configuración está en `.prettierrc`. HTML usa el parser de Angular y `singleAttributePerLine: true`: cuando una etiqueta tiene más de un atributo, cada atributo se coloca en una línea independiente.

El workspace recomienda la extensión **Prettier - Code formatter** y configura el formato al guardar en VS Code. Es necesario tener instalada esa extensión para el formato automático del editor; los comandos npm funcionan con la dependencia local.
