# Comprobación diaria de Supabase

El workflow `Supabase daily health check` hace tres consultas REST de solo lectura cada día a las 08:17 UTC. Funciona en GitHub, aunque la web no tenga visitas y el ordenador esté apagado. Una frecuencia diaria es más prudente que cada dos días: Supabase indica que normalmente bastan algunas solicitudes de usuario al día durante la última semana.

Lee un registro de `game_imports`, `game_personajes` y `game_armas`, con columnas limitadas y sin caché. Verifica que la versión esté lista y que cada consulta devuelva datos. No toca planes privados, no escribe registros ni envía correos. Utiliza únicamente la clave publicable, ya destinada al cliente web. La URL y la clave están en `supabase/healthcheck.json`; se pueden sustituir mediante `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.

Cada solicitud tiene un límite de 15 segundos y hasta tres intentos en fallos transitorios. Un fallo definitivo termina la ejecución con error visible en Actions; las notificaciones dependen de las preferencias de GitHub del propietario.

## Activación

El horario se activa cuando el workflow llega a la rama predeterminada `main`. Las ejecuciones por push/PR sirven para probarlo antes de fusionar y no activan el calendario de esa rama. Después se puede ejecutar manualmente desde Actions → Supabase daily health check → Run workflow.

```sh
node --test tests/supabase-keepalive.test.mjs
node scripts/supabase-keepalive.mjs
```

El workflow es independiente del PR del editor visual: consulta las tablas ya importadas en Supabase, sin necesitar desplegar la web ni instalar dependencias npm.

## Límites

El plan gratuito puede suspender proyectos con poca actividad durante siete días. Estas consultas generan actividad real, pero no garantizan disponibilidad permanente ni reanudan un proyecto que ya esté pausado. Supabase garantiza excluir la pausa por inactividad en los planes de pago; el script no modifica la suscripción.

GitHub puede retrasar ejecuciones y, en repositorios públicos, desactivar los workflows programados tras 60 días sin actividad en el repositorio. Revisar Actions si el proyecto pasa una temporada sin cambios y reactivar el workflow si fuera necesario. No se crean commits artificiales para ocultar la inactividad.

Referencias: [pausas de Supabase](https://supabase.com/docs/guides/platform/free-project-pausing), [programación de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
