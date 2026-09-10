// Tope duro de la lectura de clientas. No es paginacion (PERF-002): la paginacion real, con
// filtros y busqueda, es US-CLI-01. Hasta entonces el limite evita que la pantalla intente
// traerse la tabla entera el dia que el estudio tenga cinco mil clientas.
export const CLIENTS_LIST_LIMIT = 100

// Columnas del expediente que esta pantalla necesita. Se nombran una por una en vez de `select('*')`
// porque clients_profiles ya guarda dato que la lista no muestra (SEC-006).
export const CLIENTS_LIST_COLUMNS = 'id, full_name, phone, email, notes'
