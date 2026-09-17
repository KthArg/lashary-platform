# Secretos de GitHub Actions — Jira Sync y Supabase Migrations

> **Autoridad:** de dónde sale cada secreto que usan los workflows `jira-sync.yml` y `supabase-migrate.yml`, dónde se carga y qué verificar antes de disparar. **Lectores:** quien administre el repo en GitHub, Jira o Supabase. **Estado:** vigente. **Actualizado:** 2026-09-16.
> Ningún valor de esta página se pega en el repo, en un PR ni en un log (SEC-004). La service-role key de Supabase **no** interviene en ningún workflow (SEC-003).

## Dónde se cargan

Todos son *Repository secrets*: GitHub → repositorio → **Settings → Secrets and variables → Actions → Repository secrets → New repository secret**. Desde la terminal, con `gh` autenticado:

```sh
gh secret set NOMBRE --body "valor"          # nunca `echo valor | gh secret set`: el \n final entra al secreto
printf '%s' "valor" | gh secret set NOMBRE    # equivalente para valores que no querés dejar en el historial de la shell
gh secret list                                # confirma nombre y fecha; el valor no se puede leer nunca más
```

Un salto de línea, un espacio o basura de copiado rompe `curl` con `exit 3` (URL malformed). Así fallaron los dos primeros runs de Jira Sync: `JIRA_BASE_URL` se pegó desde un enlace renderizado y quedó como `https://<sitio>.atlassian.net](https://<sitio>.atlassian.net` — un link Markdown a medias. Antes de cargar, pegá el valor en la terminal con `printf '%s\n' "<valor>"` y mirá que sea exactamente lo que esperás: sin `](`, sin `/` final, sin espacios.

## Jira Sync

| Secreto | Qué es | Dónde conseguirlo |
|---|---|---|
| `JIRA_BASE_URL` | URL del sitio, con `https://` y sin ruta ni barra final: `https://<sitio>.atlassian.net` | La barra del navegador al abrir el tablero. |
| `JIRA_USER_EMAIL` | Correo de la cuenta Atlassian dueña del token | Atlassian → avatar → *Manage account* → *Email*. |
| `JIRA_API_TOKEN` | Token de API de esa cuenta | <https://id.atlassian.com/manage-profile/security/api-tokens> → *Create API token* (con nombre y vencimiento). Se muestra una sola vez. |
| `JIRA_PROJECT_KEY` (opcional, es **variable**, no secreto) | Key del proyecto (`LAS`, `LSH`…) para acotar la búsqueda | Prefijo de cualquier issue (`LAS-12` → `LAS`). Se carga en *Variables*, no en *Secrets*: `gh variable set JIRA_PROJECT_KEY --body "LAS"`. |

La cuenta del token necesita permiso *Browse projects* y *Transition issues* en el proyecto.

### Qué verificar antes de disparar

1. **Credenciales**, desde tu máquina (reemplazá los valores; no los pegues en ningún archivo):
   ```sh
   export JIRA_BASE_URL=https://<sitio>.atlassian.net JIRA_USER_EMAIL=<correo> JIRA_API_TOKEN=<token>
   curl -sS -u "$JIRA_USER_EMAIL:$JIRA_API_TOKEN" "$JIRA_BASE_URL/rest/api/3/myself" | jq .displayName
   ```
   Debe devolver tu nombre. `401` = token o correo mal; `404` = URL mal.
2. **Nombres de estado del tablero.** El script mapea `no_iniciada → To Do`, `en_progreso → In Progress`, `en_revision → Waiting QA`, `terminada → Done` (`bloqueada` se omite). Los nombres deben coincidir letra por letra:
   ```sh
   curl -sS -u "$JIRA_USER_EMAIL:$JIRA_API_TOKEN" "$JIRA_BASE_URL/rest/api/3/project/<KEY>/statuses" | jq -r '.[].statuses[].name' | sort -u
   ```
   Si difieren, se corrige `map_status` en `scripts/sync-jira.sh`, no el tablero.
3. **El ID de historia está en el summary del issue** (`US-AUTH-01 …`). Es lo único que une el SPEC.md con Jira:
   ```sh
   curl -sS -G -u "$JIRA_USER_EMAIL:$JIRA_API_TOKEN" --data-urlencode 'jql=project = <KEY>' --data-urlencode 'fields=summary' \
     "$JIRA_BASE_URL/rest/api/3/search/jql" | jq -r '.issues[] | "\(.key)\t\(.fields.summary)"'
   ```
4. **Simulación local** (busca y compara, no transiciona):
   ```sh
   JIRA_DRY_RUN=1 bash scripts/sync-jira.sh; echo "exit=$?"
   ```
   Éxito: `✔ Autenticado como …`, una línea por historia y `✔ Sincronización completada` con `exit=0`. `exit=1` es configuración; `exit=2` lista qué historia no pudo transicionar y por qué (normalmente una transición que el workflow de Jira no permite desde el estado actual).
5. **Simulación en GitHub** antes de mergear a `main` (el workflow tiene `workflow_dispatch` con `dry_run`):
   ```sh
   gh workflow run jira-sync.yml --ref <rama> -f dry_run=true
   gh run watch "$(gh run list --workflow=jira-sync.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
   ```

Qué mueve el primer run real: las historias `terminada` a *Done*, las `en_progreso` a *In Progress* y las `en_revision` a *Waiting QA*, según cada `SPEC.md`. El sync es de una vía (repo → Jira) y **solo avanza**: si una tarjeta ya va más adelante en Jira que el `SPEC.md` de `main` (trabajo en ramas sin mergear), se reporta `va adelante en Jira … no se retrocede` y no se toca. Jira nunca cambia el repo (EST-001).

## Supabase Migrations

| Secreto | Qué es | Dónde conseguirlo |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token personal de la Management API (autoriza al CLI a hablar con tu organización) | <https://supabase.com/dashboard/account/tokens> → *Generate new token*. Se muestra una sola vez. Pertenece a una cuenta, no al proyecto: usá una cuenta con rol *Owner* o *Admin* de la organización. |
| `SUPABASE_PROJECT_ID` | El **ref** del proyecto remoto: 20 caracteres alfanuméricos | Dashboard → *Project Settings → General → Project ID*, o la URL `https://supabase.com/dashboard/project/<ref>`. **No** es el `project_id = "lashary-platform"` de `supabase/config.toml` (ese es el nombre del stack local). |
| `SUPABASE_DB_PASSWORD` | Contraseña de Postgres del proyecto (`db push` se conecta a la base, no solo a la API) | Dashboard → *Project Settings → Database → Database password*. Si nadie la conserva, *Reset database password* ahí mismo y cargá la nueva. |

### Qué verificar antes de disparar

Todo esto se hace **desde tu máquina, con tu usuario**, nunca desde un agente de IA ni desde CI (SEC-003, `.agents/AGENTS.md`).

1. **Token y ref**:
   ```sh
   export SUPABASE_ACCESS_TOKEN=<token>
   supabase projects list          # el ref que aparece en REFERENCE ID es SUPABASE_PROJECT_ID
   ```
2. **Vincular y comparar historial** (escribe solo en `supabase/.temp/`, que está ignorado por git):
   ```sh
   export SUPABASE_DB_PASSWORD=<password>
   supabase link --project-ref <ref>     # dos comandos separados, uno por línea
   supabase migration list               # sin flags: compara contra el proyecto vinculado
   ```
   La tabla muestra cada versión en *Local* (las 5 de `supabase/migrations/`) y en *Remote*. Tres escenarios:
   - **Remote vacío y el proyecto sin tablas** → nada más que hacer; el primer `db push` aplica todo en orden.
   - **Remote vacío pero ya hay tablas** (`clients_profiles`, roles, políticas… creadas a mano o desde el SQL editor) → `db push` fallaría con "already exists". Marcá como aplicadas solo las versiones cuyo contenido ya está en la base: `supabase migration repair --status applied <version> --linked` (una por una, confirmando en el SQL editor). Nunca se edita ni borra una migración (INT-008).
   - **Remote con versiones que no existen en el repo** → hablalo con el equipo antes; la salida es `migration repair --status reverted <version>` para las huérfanas.
3. **Ensayo sin tocar la base**:
   ```sh
   supabase db push --dry-run
   ```
   Debe listar exactamente las migraciones pendientes o decir `Remote database is up to date.`
4. **Simulación en GitHub** desde la rama del fix (mismo `dry_run`):
   ```sh
   gh workflow run supabase-migrate.yml --ref <rama> -f dry_run=true
   gh run watch "$(gh run list --workflow=supabase-migrate.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
   ```
   Éxito: `Finished supabase link.`, la tabla de `migration list` y el `--dry-run` sin errores. Recién entonces, `-f dry_run=false` o el merge a `main`.

Cosas que hacen fallar el run aunque los secretos estén bien:

- `SUPABASE_PROJECT_ID` con el nombre del proyecto en vez del ref → `link` falla con *Not Found*.
- Token de una cuenta sin acceso a la organización → `link` falla con *Your account does not have the necessary privileges to access this endpoint*. Se vio en local con un token viejo del CLI; se resolvió con `supabase login` desde la cuenta correcta. El secreto `SUPABASE_ACCESS_TOKEN` tiene que venir de esa misma cuenta (o de otra con rol *Owner*/*Admin* de la organización). Comprobalo antes de cargarlo: `SUPABASE_ACCESS_TOKEN=<token> supabase projects list` debe mostrar el proyecto.
- `Connecting to remote database... connection reset by peer` hacia `aws-0-<region>.pooler.supabase.com:5432` → `link` ya pasó (la API responde); lo que no llega es la conexión Postgres. Tres causas, en este orden: (1) sin `-p`/`SUPABASE_DB_PASSWORD` el CLI intenta un rol de login temporal por el pooler — repetí el comando con la contraseña exportada; (2) la red donde estás bloquea el puerto 5432 (`nc -vz aws-0-us-east-1.pooler.supabase.com 5432` debe decir *succeeded*; probá desde otra red — los runners de GitHub no tienen ese bloqueo); (3) proyecto pausado. Los WARN `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` que aparecen junto a estos comandos vienen de `supabase/config.toml` y no rompen nada.
- `20260901000001_seed_superadmin.sql` crea un índice único parcial: si la base remota ya tiene dos superadmins, esa migración falla; revisá `clients_profiles`/roles antes.
- El proyecto remoto **pausado** (plan free tras inactividad): restauralo desde el dashboard antes.

## Después del merge

Con los secretos cargados y la simulación verde, el push a `main` dispara `Supabase Migrations` (cuando cambia `supabase/migrations/**` o el propio workflow) y `Jira Sync` (cuando cambia un `SPEC.md`, el backlog, el script o el workflow). Se revisan con `gh run list --limit 5`; un run rojo se lee con `gh run view <id> --log-failed`.

Rotación: cualquier token que se filtre en un log o en un chat se revoca en su origen (Atlassian / Supabase) y se vuelve a cargar con `gh secret set`; el valor viejo deja de servir en ese momento.
