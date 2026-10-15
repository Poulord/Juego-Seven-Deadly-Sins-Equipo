# Origin Forge — Seven Deadly Sins: Origin

Aplicación web en español para **planificar, guardar y comparar equipos de hasta cuatro héroes**. Permite preparar configuraciones de armas, armaduras, accesorios y grabados, consultar sus aportes y estudiar los ataques combinados del grupo.

## Funcionalidades

- Selección de héroes SR y SSR, con búsqueda, filtros y estilos de combate.
- Configuración individual de armas compatibles, armaduras, accesorios y armadura ligada.
- Selección de encantamientos, atributos aleatorios, pasivas, talentos y grabados según los datos disponibles.
- Resumen del equipo, aportes de equipamiento por héroe, bonificaciones de conjunto y ataques combinados compatibles.
- Guardado, edición, duplicación, eliminación y favoritos de formaciones independientes.
- Filtros de formaciones y comparación de hasta tres equipos, con exportación en JSON.
- Consulta de habilidades, maestría, potencial y trascendencia.
- Interfaz inspirada en el juego, con retratos, imágenes de armas, transiciones y partículas. Adaptada a móvil y a la preferencia de movimiento reducido.

El catálogo es de solo lectura. Cada formación conserva su propia configuración: reutilizar una pieza o modificar un equipo no altera los demás planes ni las características del catálogo.

## Requisitos y ejecución

Requiere **Node.js 24** y npm. Desde la carpeta del proyecto:

```sh
npm ci
npm run dev
```

Abre la dirección que muestra Vite en la terminal. La aplicación principal está en `/`.

Para descargar la versión integrada antes de arrancar:

```sh
git switch main
git pull --ff-only
npm ci
npm run dev
```

`git pull` descarga el código; `npm ci` instala sus dependencias. **No hace falta crear un commit para ejecutar o actualizar la aplicación.** Si el servidor ya estaba abierto, detenlo y arráncalo de nuevo después de actualizar.

## Configuración de Supabase

Copia `.env.example` a `.env` y configura las variables públicas del proyecto:

```dotenv
VITE_SUPABASE_URL=https://<referencia-del-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clave-publicable>
```

El archivo `.env` está ignorado por Git. Las variables `VITE_*` se incluyen en el navegador: utiliza exclusivamente la clave publicable, nunca una clave secreta o `service_role`.

- **Con Supabase:** la aplicación consulta el catálogo remoto y las cuentas guardan sus formaciones privadas en la base de datos. Se comprueba que la versión del catálogo coincida con la incluida en la aplicación.
- **Sin configuración:** utiliza el catálogo incluido en el proyecto y guarda las formaciones en el navegador mediante `localStorage`.

Los planes locales no se transfieren automáticamente a una cuenta. El almacenamiento local se comparte entre quienes usen el mismo perfil del navegador.

Para el registro y la confirmación por correo, configura en Supabase Auth la **Site URL** y las **Redirect URLs** del dominio de la aplicación y del entorno local, normalmente `http://127.0.0.1:5173`.

## Catálogo y base de datos

El catálogo actual contiene 28 héroes, 84 estilos de arma, 170 armas, 281 armaduras, 73 accesorios y 24 conjuntos. También incluye habilidades, ataques combinados, grabados, encantamientos y datos de progresión.

| Tablas | Función |
| --- | --- |
| `game_*` | Catálogo compartido, con lectura pública y escritura reservada a administración. |
| `game_imports` | Versión, huella y estado de las cargas del catálogo. |
| `party_plans` | Configuraciones privadas de formaciones, vinculadas a su propietario. |
| `teams`, `catalog_entries` | Compatibilidad con planes manuales anteriores, accesibles en `/?legacy=1`. |

Las políticas RLS protegen las operaciones de cada propietario y la inmutabilidad del catálogo para los usuarios. Las relaciones y los campos de búsqueda cuentan con índices para las consultas del editor.

### Preparar y verificar el catálogo

```sh
npm run catalog:prepare
npm run catalog:verify
```

`catalog:prepare` requiere el archivo local `supabase/7dsorigin.db`. Lo abre en modo de solo lectura, comprueba integridad y claves foráneas, y genera el catálogo de consulta, las fichas de héroes y los lotes SQL de importación. **No sube datos automáticamente.**

El archivo SQLite y los lotes de `supabase/import/` están ignorados por Git y no son necesarios para arrancar la web con el catálogo ya generado.

Para preparar una base vacía, aplica las migraciones de `supabase/migrations/` en orden y después los lotes del manifiesto generado, deteniéndote ante cualquier error. Las actualizaciones de un catálogo en uso deben validarse en un entorno de pruebas antes de promover una nueva versión.

`catalog:verify` utiliza la configuración pública de `.env` para contrastar los recuentos y la versión del catálogo, así como las restricciones de acceso anónimo. Guarda el informe en `output/supabase-verification.json`.

### Comprobación periódica

GitHub Actions ejecuta diariamente una comprobación de Supabase mediante tres consultas pequeñas de solo lectura al catálogo. También puede ejecutarse manualmente:

```sh
node scripts/supabase-keepalive.mjs
```

La configuración y el funcionamiento están documentados en [Mantenimiento de Supabase](docs/supabase-keepalive.md). Esta actividad periódica no garantiza disponibilidad permanente: depende de la ejecución de GitHub Actions y de las condiciones del plan de Supabase.

## Alcance de las estadísticas

La aplicación muestra **aportes del equipamiento por héroe**. El catálogo disponible todavía no contiene las estadísticas base de cada personaje por nivel ni todas las fórmulas de combate, por lo que no se presentan como estadísticas finales o poder de combate del equipo.

Las bonificaciones de conjunto se detectan por número de piezas y muestran sus condiciones. Los efectos condicionales, la maestría, el potencial y la trascendencia pueden consultarse, pero no se incorporan automáticamente al cálculo. Tampoco se suman porcentajes entre héroes ni se interpolan niveles intermedios sin datos validados.

## Pruebas

```sh
# Dominio, migraciones y políticas de acceso
npm test

# Comprobación periódica de Supabase
node --test tests/supabase-keepalive.test.mjs

# TypeScript y compilación de producción
npm run build

# Flujos completos en navegador
npx playwright install chromium
npm run test:e2e
```

Las pruebas cubren compatibilidad de piezas, unidades y rangos, independencia de las formaciones, conjuntos, ataques combinados y aislamiento entre propietarios. Los flujos de navegador comprueban la creación y edición del equipo, el guardado, la recarga y la vista móvil. GitHub Actions ejecuta las comprobaciones configuradas en el repositorio.

## Tecnologías y despliegue

React, TypeScript y Vite para la interfaz; Supabase Auth y PostgreSQL para cuentas y persistencia; Vitest, PGlite y Playwright para las pruebas.

Para desplegar en Vercel, selecciona Vite, utiliza `npm run build` como comando de compilación y `dist` como directorio de salida. Configura las dos variables públicas de Supabase y las URL de autenticación del dominio final. El despliegue y la confirmación real por correo deben verificarse en ese entorno.

## Próximas mejoras

- Incorporar estadísticas base y reglas de combate verificadas para ampliar el resumen del equipo.
- Ampliar las imágenes de equipamiento y la presentación visual.
- Añadir importación mediante capturas y reconocimiento de texto, con revisión antes de guardar.

Proyecto de fans sin afiliación a Netmarble. Los personajes y las imágenes pertenecen a sus respectivos titulares.
