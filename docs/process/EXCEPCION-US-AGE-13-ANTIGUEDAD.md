# Propuesta de excepción de antigüedad para US-AGE-13

Fecha de propuesta: 2026-10-05. Pendiente de aprobación del equipo.

## Justificación y alcance

Las piezas originales de US-AGE-13 conservan commits de entre cuatro y once días.
La actualización con main después de #175 y #189 conserva esa historia y no reinicia
el plazo de INT-001. Las 20 piezas están ordenadas, actualizadas y sus diffs individuales
siguen por debajo de 400 líneas. Se propone permitir su integración fuera del plazo
para cerrar esta pila manteniendo el historial y el resto de las comprobaciones.

El alcance es únicamente INT-001 y estos 13 PRs:
#114, #115, #117, #118, #119, #120, #121, #122, #145, #146, #152, #153 y #154.
El registro fija también la rama de cada PR y admite su base original o la raíz
`us/US-AGE-13`, a la que GitHub puede retargetearlo al integrar la pieza anterior.
Otras piezas y bases de otras historias no quedan cubiertas.

Vencimiento propuesto: final del 12 de octubre de 2026 en Costa Rica;
el instante de corte es `2026-10-13T06:00:00Z`.

## Aprobación y activación

1. El equipo revisa esta justificación, el alcance y la fecha, y registra su aprobación
   en el PR que incorpora este documento y el registro. Se exige revisión externa (INT-005).
2. Un humano integra ese PR en main. Mientras está en borrador o solo en su rama,
   el registro propuesto no concede excepciones.
3. Se actualizan la raíz y las piezas de US-AGE-13 con ese main.
4. Tras el acuerdo se añade `excepcion-proceso` a los 13 PRs afectados.
5. Se comprueba CI y las aprobaciones antes de integrar las piezas en orden.

El check lee `docs/process/excepciones-proceso.csv` únicamente de `origin/main`,
actualizado por CI. Requiere una única entrada que coincida con regla, número de PR,
rama y base; la etiqueta debe estar presente y la fecha vigente.
Los cambios de etiqueta vuelven a ejecutar CI. Quitarla o vencer el plazo restaura
el rechazo por antigüedad. Una entrada añadida solamente en la pieza no la autoriza.

La excepción afecta solo a la edad de la pieza: continúan el límite de 400 líneas,
el máximo de features, las reglas de migraciones, las pruebas y las aprobaciones.
No resuelve el acuerdo sobre historial de #118 ni la aprobación formal de #119.

## Verificación y retiro

`bash scripts/tests/check-process-exception.test.sh` comprueba el check real con
commits antiguos: excepción vigente, etiqueta ausente, otro PR, otra rama, otra base,
registro sin integrar, vencimiento, fecha inválida, exceso de líneas, retarget a la raíz,
número inválido y registro duplicado.
Las mismas pruebas se ejecutan en el job de reglas de CI.

Tras integrar las piezas, retirar las 13 entradas del registro mediante un PR.
Si vence el plazo antes, cualquier ampliación requiere nuevo acuerdo y revisión.
El documento permanece como historial de la decisión; su propuesta no equivale
a que el equipo ya la haya aprobado.
