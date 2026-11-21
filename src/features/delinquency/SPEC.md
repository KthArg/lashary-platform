---
feature: delinquency
dri: pendiente
estado: en_progreso
actualizado: 2026-11-18
historias:
  - id: US-MOR-01
    estado: terminada
    evidencia: "PR de cierre us/US-MOR-01 a main, con 24 piezas apiladas contra la rama de la historia (#765 a #784 y #789 a #792; las piezas 21 a 24 son correcciones de la revisión de la pila). Criterio 1 (detección de las citas cerradas con pago sin registrar): supabase/tests/database/delinquency_detect_unpaid.test.sql y payments_unpaid_charges.test.sql; el cron, en delinquency/http/__tests__/cron-handler.test.ts, application/__tests__/detect-unpaid.test.ts y db/__tests__/detection-repository.test.ts; comprobado a mano en local con el servidor real: el cron genera 3 morosidades por revisar y una segunda corrida genera 0. Criterio 2 (periodo de gracia configurable, de 1 a 90 días y 7 por defecto): delinquency_tables.test.sql, delinquency_set_grace_days.test.sql, application/__tests__/grace-days.test.ts, db/__tests__/settings-repository.test.ts, ui/review/__tests__/review-actions.test.ts y review-view.test.tsx; comprobado a mano en el navegador: guarda 14, deja el evento con el valor anterior y el nuevo y persiste al recargar. Criterio 3 (aviso previo con opción de confirmar o descartar): delinquency_decide_case.test.sql, delinquency_notify_case_detected.test.sql, application/__tests__/decide-case.test.ts, db/__tests__/case-repository.test.ts, ui/review/__tests__/review-view.test.tsx y, en notifications, ui/inbox/__tests__/notice-lines.test.ts, admin-inbox.test.tsx y db/__tests__/inbox-repository.test.ts; comprobado a mano: la administradora ve el aviso en Notificaciones y su enlace lleva a /admin/morosidades. Criterio 4 (el saldo se calcula sumando los asientos, no se guarda a mano): payments_unpaid_charges.test.sql, una cita entra si la suma de todos sus asientos es mayor que cero; la morosidad guarda el saldo que tenía al detectarla y ninguna función lo actualiza. Criterio 5 (estado en el expediente y listado de activas): delinquency_contract.test.sql, delinquency_list_active_cursor.test.sql (el cursor por fecha y clienta no se salta empates), db/__tests__/case-list-repository.test.ts, application/__tests__/load-review.test.ts (avisa cuando hay más de 50), y en clients application/__tests__/list-clients-delinquency.test.ts, ui/admin-clients/__tests__/clients-list-delinquency.test.tsx, get-client-action.test.ts y el layout.test.tsx del perfil. Pasa a US-MOR-03: qué cuenta como pago registrado (ítem 14 de «Criterios trasladados»). Decisiones del PO del 2026-11-08 en docs/process/DEPENDENCIES.md. El cron no está programado: .github/workflows/delinquency-detect.yml solo tiene workflow_dispatch y el schedule se agrega cuando US-MOR-03 esté mergeada y Kenny lo confirme."
  - id: US-MOR-02
    estado: terminada
    evidencia: "PR de cierre us/US-MOR-02 a main, con 12 piezas apiladas contra la rama de la historia (#802 a #812 y #856). Criterio 1 (al intentar agendar, el sistema valida la morosidad): el bloqueo vive en la base, dentro de las funciones de reserva de la clienta: supabase/tests/database/delinquency_booking_block.test.sql, scheduling_book_blocked_by_delinquency.test.sql (técnica) y scheduling_book_package_blocked_by_delinquency.test.sql (paquete); scheduling/application/__tests__/book-appointment.test.ts y book-package-appointment.test.ts, y db/__tests__/delinquency-block-repository.test.ts. Comprobado a mano en el navegador con una clienta de prueba y el servidor real: «Confirmar reserva» muestra el rechazo. Criterio 2 (mensaje claro con motivo, monto y opción de regularizar): ui/booking-confirm/__tests__/perform-booking.test.ts (el texto del PO con el monto de hoy y la fecha de la cita; sin fecha dice «de una cita anterior») y studio-time.test.ts; comprobado a mano: «No pudimos agendar tu cita porque tienes un saldo pendiente de ₡18 000 de tu cita del 13 de septiembre de 2027. Comunícate con el estudio para regularizarlo y poder agendar de nuevo.» La «opción de regularizar» es «comunícate con el estudio» hasta que exista US-MOR-03 (decisión del PO del 2026-11-08). Criterio 3 (al saldarse, la clienta recupera la posibilidad de agendar sola): payments_appointment_balances.test.sql y delinquency_booking_block.test.sql (al saldarse la cita la fila deja de bloquear sin tocar ninguna tabla de morosidad) y scheduling_book_blocked_by_delinquency.test.sql (vuelve a agendar); comprobado a mano: se asienta el pago de la cita en el ledger y la misma clienta reserva, con la morosidad todavía `active`. Hoy no hay forma de registrar un pago desde la app: lo trae US-MOR-03, que cerrará la morosidad (deuda registrada abajo). Criterio 4 (la restricción rige también cuando la administradora agenda por la clienta, y ella puede autorizar la excepción): scheduling_admin_book_appointment.test.sql (bloqueada sin autorización devuelve id nulo y registra; con motivo de al menos 10 caracteres agenda y deja el evento con quién la autorizó, la clienta, la cita y el motivo; la clienta no lo ve); solo función SQL, sin pantalla (decisión del 2026-11-11, deuda registrada abajo). Criterio 5 (todo bloqueo queda registrado): el evento scheduling.booking.blocked_by_delinquency, con las citas que bloquean y su saldo de hoy, probado en scheduling_book_blocked_by_delinquency.test.sql, scheduling_book_package_blocked_by_delinquency.test.sql y scheduling_admin_book_appointment.test.sql; comprobado a mano: cada intento de la clienta y de la administradora deja su evento. Recibido de US-AGE-05 (ítem 7 de «Criterios trasladados»): la validación dentro de scheduling_book_appointment (y de paquete) por la base, SEC-001. Recibido de US-AGE-11 (ítem 11): el indicador «Morosidad activa» en la agenda diaria, con el adaptador real de DelinquentClientsPort: scheduling/db/__tests__/delinquent-clients-repository.test.ts; comprobado a mano: en la agenda del 6 de septiembre de 2027 solo la clienta con morosidad confirmada lleva la etiqueta y la que está por revisar no. Confirmado por el PO (Kenny, 2026-11-11, comunicado por Jose Lorenzo): el mínimo de 10 caracteres del motivo, que la cita que agenda la administradora queda pending_approval y que la pantalla va como historia aparte. Decisiones del PO del 2026-11-08 y de alcance del 2026-11-11 en docs/process/DEPENDENCIES.md."
  - id: US-MOR-03
    estado: terminada
    evidencia: "PR de cierre us/US-MOR-03 a main, con 26 piezas apiladas contra la rama de la historia (#900 a #924, más esta pieza 26 de cierre). Criterio 1 (iniciar el flujo desde el recordatorio o el estado de cuenta): el estado de cuenta /portal/cuenta trae «Cómo pagar» con los datos reales del estudio y el formulario del comprobante (account/ui/statement/__tests__/AccountStatementView.test.tsx y delinquency/ui/regularization/__tests__/RegularizationForm.test.tsx), y el rechazo de la reserva por morosidad lleva a él con «Regularizar mi saldo» (scheduling/ui/booking-confirm/__tests__/perform-booking.test.ts, book-appointment-action.test.ts y BookingConfirmForm.test.tsx); «desde el recordatorio» es la ruta estable /portal/cuenta a la que enlazará US-NOT-04, que depende de esta historia. Criterio 2 (al subir el comprobante, la regularización queda pendiente de aprobación): pgTAP delinquency_submit_regularization.test.sql, delinquency_regularizations.test.sql, delinquency_receipts_bucket.test.sql (tope de 1 MB) y delinquency_regularization_notice.test.sql (el aviso a la bandeja); domain/__tests__/receipt.test.ts y regularization.test.ts, application/__tests__/upload-receipt.test.ts y submit-regularization.test.ts, db/__tests__/regularization-repository.test.ts, receipt-storage.test.ts y case-row.test.ts, ui/regularization/__tests__/perform-regularization.test.ts, y en notifications db/__tests__/inbox-repository.test.ts y ui/inbox/__tests__/notice-lines.test.ts. Criterio 3 (aprobado, la morosidad queda saldada y se libera la restricción): pgTAP delinquency_approve_regularization.test.sql, payments_ledger_payment_kind.test.sql y payments_record_payment.test.sql; application/__tests__/load-regularization-queue.test.ts y review-regularization.test.ts, db/__tests__/regularization-queue-repository.test.ts y regularization-review-repository.test.ts, ui/regularization-review/__tests__/RegularizationQueue.test.tsx, RegularizationDecision.test.tsx y perform-review.test.ts; comprobado de punta a punta en el navegador con el servidor local el 2026-11-18: pago parcial, rechazo con motivo, pago completo aprobado, morosidad settled y la misma reserva de la clienta pasa (capturas en los PR de las piezas 20 y 23). Criterio 4 (la clienta ve en todo momento el estado de su regularización): delinquency_my_account en delinquency_submit_regularization.test.sql, delinquency_reject_regularization.test.sql (motivo de 10 a 500 caracteres) y AccountStatementView.test.tsx (en revisión, aprobado, rechazado con el motivo y saldada). Aislamiento (SEC-002): delinquency_receipts_bucket.test.sql (otra clienta no lee ni escribe en la carpeta ajena) y delinquency_regularizations.test.sql (ninguna clienta lee la tabla). Decisiones del PO del 2026-11-13 y de la clienta (dueña del estudio) del 2026-11-18 en docs/process/DEPENDENCIES.md. Suite sobre la punta de la pila con la base local recién reseteada: pgTAP 111 archivos y 1465 pruebas en verde; vitest 2952 pruebas en verde (la suite de integración booking-pending-limit-package chocó con otra en paralelo y pasa 3 de 3 sola, como en US-MOR-02)."
  - id: US-MOR-04
    estado: no_iniciada
  - id: US-MOR-05
    estado: en_progreso
    falta: "Pieza 1/N: contrato en payments-api.md y delinquency-api.md (payments_record_forgiveness_entry, delinquency_lift_case, delinquency_forgive_case, delinquency_list_active_cases, con saldo vivo vía payments_appointment_balances). Falta: migraciones, dominio/aplicación, UI de /admin/morosidades y pruebas de los 4 criterios"
flags: []
deuda:
  - que: "Tras un pago parcial, el listado de morosidades activas, el expediente y el listado de clientas siguen mostrando el monto de la detección (delinquency_cases.pending, una foto del saldo al detectar) y no el saldo de hoy; la cola de comprobantes y el estado de cuenta de la clienta sí muestran el saldo de hoy. Lo que la deuda original pedía, que la morosidad se cierre al pagarse, lo resolvió US-MOR-03: al aprobarse el pago que deja la cita en cero, la morosidad pasa a settled en la misma transacción"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11; resuelta en parte por US-MOR-03 (2026-11-18), que deja el resto anotado al cerrar"
    costo: "Dueño: Jose Lorenzo. Aprox. 3 h: que delinquency_list_active y delinquency_client_states sumen el saldo de hoy de cada cita (payments_appointment_balances) en lugar de pending, con su pgTAP de un pago parcial"
  - que: "Un aviso a la bandeja por cada morosidad detectada, sin resumen por corrida: la primera corrida sobre un ledger con muchas citas impagas puede poner decenas de avisos de golpe (la bandeja pagina de 20 en 20)"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; el riesgo ya estaba anotado en la sección «Aviso en la bandeja»"
    costo: "Dueño: Jose Lorenzo (delinquency) con notifications. Aprox. 3 h: un aviso resumen por corrida («N morosidades por revisar») en lugar del trigger por fila, o un tope de avisos por corrida, y sus pgTAP. Conviene hacerlo antes de programar el cron"
  - que: "El cron de detección usa la misma cuenta de sistema que el cron de recordatorios (NOTIFICATIONS_CRON_EMAIL y NOTIFICATIONS_CRON_PASSWORD): una sola credencial con permisos de staff para dos tareas, y rotarla o revocarla para una afecta a la otra"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; la reutilización de la cuenta existente está anotada en CI_SECRETS.md"
    costo: "Dueño: Jose Lorenzo con Kenneth (secretos de CI). Aprox. 4 h: una cuenta de sistema por cron, o un rol de base con solo EXECUTE de las funciones del cron, más su alta en CI_SECRETS.md y en el entorno. Antes de programar el schedule"
  - que: "payments_unpaid_charges agrupa todo el ledger en cada página (GROUP BY de payments_ledger_entries por clienta y cita): el corte de fecha y el saldo se aplican después de agrupar, así que ningún índice lo acota y el costo de una corrida crece con el ledger entero, no con lo nuevo (PERF-002)"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; sin medición todavía, PERF-001 pide medir antes de optimizar"
    costo: "Dueño: Jose Lorenzo, a revisar cuando US-MOR-03 empiece a llenar el ledger. Aprox. 4 h: medir con el volumen real (EXPLAIN) y, si hace falta, un índice parcial por (appointment_id) de los cargos o limitar la ventana de cierre, con su pgTAP"
  - que: "No hay pantalla para que la administradora agende por una clienta, ni función para agendar un paquete por ella: solo existe scheduling_admin_book_appointment (técnica suelta), que se usa llamando a la base. La excepción de la morosidad (criterio 4) está construida pero no la puede usar nadie desde el panel"
    aceptada_en: "Decisión de alcance del 2026-11-11 de Jose Lorenzo al arrancar US-MOR-02; el PO (Kenny) aprobó el 2026-11-11 que quede como historia aparte"
    costo: "Dueño: el PO decide la historia. Aprox. 3 a 4 días: una pantalla en el panel (elegir clienta, técnica y horario, con el diálogo de la excepción y su motivo), una función para paquetes con su pgTAP y el diseño de la pantalla, que el backlog no describe"
  - que: "Cada intento bloqueado deja un evento en la bitácora, sin tope ni agrupación: una clienta que insiste, o un reintento automático, llena la bitácora con eventos iguales y la vuelve difícil de revisar (criterio 5)"
    aceptada_en: "US-MOR-02, 2026-11-11: el criterio pide que todo bloqueo quede registrado; no se agrupó para no perder ninguno"
    costo: "Dueño: Jose Lorenzo. Aprox. 2 h: agrupar por clienta y hora (un evento con un contador) o mostrar el resumen en la pantalla de revisión, y su pgTAP. Medir primero cuántos eventos hay (PERF-001)"
  - que: "Los avisos de la regularización (comprobante recibido, aprobado o rechazado) solo llegan por la bandeja de la administradora y por el estado de cuenta de la clienta: falta la implementación por otros canales (WhatsApp y correo), que el PO pidió dejar anotada"
    aceptada_en: "Respuesta del PO (Kenny) del 2026-11-13 a las preguntas de arranque de US-MOR-03"
    costo: "Dueño: US-NOT-04 (recordatorio de pago) y Jose Lorenzo. Aprox. 1 a 2 días: usar el canal de US-NOT-03 (WhatsApp con respaldo por correo) para avisar a la clienta que su comprobante se aprobó o se rechazó, con su motivo, y su pgTAP y pruebas"
  - que: "La detección del tipo de archivo por sus primeros bytes está copiada en tres features: clients (domain/record/record-image.ts), store (domain/product-image.ts) y delinquency (domain/receipt.ts, que además reconoce PDF). Un cambio de firmas o un tipo nuevo hay que hacerlo en las tres"
    aceptada_en: "US-MOR-03, 2026-11-16: moverla a shared tocaba tres features en un PR (INT-002 permite dos); se copió con sus pruebas"
    costo: "Dueño: Jose Lorenzo. Aprox. 2 h: una función genérica de detección por firma en shared/ (sin reglas de negocio, ARCH-007) que las tres usen, conservando sus topes y tipos en cada feature, y sus pruebas"
defectos: []
---

# delinquency

Morosidad: deteccion con gracia y aviso previo (DOM-012), bloqueo, regularizacion, override auditado.

## Qué hace hoy

Hoy: las tablas de morosidades y de configuración, las funciones que detectan, confirman o descartan y cambian la gracia, y las del contrato (sección de US-MOR-01). La pantalla de revisión y el reflejo en `clients` existen, hay una ruta de cron para correr la detección (sin programar) y cada morosidad por revisar deja un aviso en la bandeja de la administradora. Una morosidad confirmada cuya cita todavía debe bloquea la agenda: la reserva de la clienta (técnica o paquete) la rechaza en la base, le dice cuánto debe y de qué cita, y deja el bloqueo registrado; la administradora puede agendar por ella autorizando la excepción con un motivo, y la agenda diaria marca a las clientas con morosidad activa (sección de US-MOR-02).

## Contrato público

El contrato de lo que `delinquency` ofrecerá a `clients` está en [delinquency-api.md](../../../docs/contracts/delinquency-api.md): `delinquency_client_states` y `delinquency_list_active`, con los estados `pending_review`, `active` y `dismissed`, y `delinquency_booking_block`, que dice a `scheduling` si una clienta está bloqueada para agendar, con las citas que debe y su saldo de hoy. Las tres están implementadas (migraciones `20261108000004_delinquency_contract_fns.sql`, `20261108000007_delinquency_list_active_cursor.sql` y `20261110000001_delinquency_booking_block_fn.sql`). El código entra por `index.ts` (ARCH-003).

Lo que `delinquency` necesita de `payments` está en [payments-api.md](../../../docs/contracts/payments-api.md): `payments_client_balance`, `payments_unpaid_charges` y `payments_appointment_balances` (el saldo de hoy por cita).

## US-MOR-01: detección automática de pagos pendientes

Criterios del backlog:

1. El sistema identifica citas cerradas cuyo pago quedó sin registrar y genera una morosidad asociada a la clienta.
2. Existe un periodo de gracia configurable entre el cierre de la cita y la generación de la morosidad.
3. Antes de que una morosidad pase a activa, la administradora recibe un aviso de qué clientas están por quedar
   bloqueadas, con opción de confirmar o descartar.
4. El saldo de la clienta se calcula sumando cargos y pagos registrados; no se guarda como un valor que se
   actualiza a mano.
5. El estado de morosidad se refleja en el expediente y la administradora ve el listado de morosidades activas.

Depende de US-AGE-12 (`terminada`). Reglas: DOM-005 (ledger append-only, saldo derivado), DOM-012 (consecuencias
automáticas aprobadas por el PO), DOM-003 (hora del estudio), ARCH-003/004/005 (fronteras entre features),
SEC-002 y SEC-006 (RLS con su test de aislamiento, datos de la clienta), INT-003 (contratos) y PERF-002 (listados
con tope).

### Lo que ya existe

- El ledger de `payments` (`payments_ledger_entries`, US-AGE-12): asientos `charge` (positivo) y `deposit_credit`
  (negativo), uno por cita y tipo, y `payments_client_balance(cliente)`, que devuelve la suma de los asientos. El
  saldo del criterio 4 ya se deriva así; esta historia lo reusa, no lo reemplaza.
- Todavía no hay un asiento de pago: el registro de pago con comprobante lo porta US-MOR-03. Por eso, hoy toda cita
  cerrada con cargo tiene saldo pendiente.
- `scheduling` ya consume un puerto de morosidad al reservar (`DelinquencyPort`); la regla que lo alimenta es de
  US-MOR-02, que hereda de US-AGE-05 y US-AGE-11 los criterios de bloqueo e indicador.

### Decisiones del PO (DOM-012, Kenny, 2026-11-08)

Comunicadas por Jose Lorenzo; el registro está en `docs/process/DEPENDENCIES.md`.

- **Gracia:** 7 días por defecto, configurable de 1 a 90. El cambio rige solo para las detecciones nuevas.
- **Aviso previo:** la morosidad detectada queda por revisar y la administradora la confirma o la descarta. Texto de la
  pantalla: «Pago sin registrar pasado el plazo de gracia. Confirme si la morosidad procede o descártela si la clienta sí
  pagó.» Una descartada no se vuelve a generar por la misma cita.
- **Pago registrado:** qué cuenta como pago registrado se traslada a US-MOR-03 (ítem 14 de «Criterios trasladados»).
  No hay bandera de encendido: la detección lee el ledger y funciona sola cuando US-MOR-03 registre pagos.
- **Cron:** no se programa todavía (ver «Cron de detección»).
- **Orden de las historias.** El override manual auditado y levantar o perdonar son de US-MOR-05; esta historia solo
  deja la morosidad en un estado que ese override pueda cambiar.

### Tablas y configuración (pieza 4)

- Migración `20261108000001_delinquency_tables.sql`. `delinquency_settings` es una tabla de una sola fila con
  `grace_days` (de 1 a 90, arranca en 7, aprobado por el PO el 2026-11-08). Staff la lee y nadie la escribe directo: la administradora la
  cambia por la función `delinquency_set_grace_days` (pieza 17), que deja bitácora. Cambiar la gracia rige solo para las detecciones nuevas: no toca las morosidades ya generadas. No hay
  bandera de encendido (decisión del PO): la detección lee el ledger y funciona sola cuando US-MOR-03 registre pagos.
- `delinquency_cases`: una morosidad por cita (`UNIQUE appointment_id`, así una descartada no se vuelve a generar),
  con `client_id`, el saldo `pending` al detectarla, el `state` (`pending_review`, `active` o `dismissed`) y quién
  y cuándo la decidió. El CHECK obliga a que una morosidad por revisar no traiga decisión y que una activa o
  descartada sí la traiga. `appointment_id` no tiene FK (ARCH-005). Staff solo lee: las morosidades las escriben las
  funciones de las piezas siguientes.
- Prueba: pgTAP `delinquency_tables.test.sql` (la gracia nace en 7 días y nadie la cambia directo,
  ni la administradora; una morosidad por cita; estado y decisión van juntos; staff no inserta directo; la
  clienta no ve ni cambia nada y `anon` no tiene permiso).

### Detección (pieza 5)

- Migración `20261108000002_delinquency_detect_fn.sql`: `delinquency_detect_unpaid()` (`SECURITY DEFINER`, solo
  staff; la clienta y `anon` reciben `42501`). Pide a `payments` las citas cerradas con saldo pendiente al corte `ahora - grace_days` y deja
  una morosidad `pending_review` por cada una, con la clienta y lo que debe; devuelve cuántas generó. No activa
  nada: la revisión es de la administradora (DOM-012).
- Idempotente: `ON CONFLICT (appointment_id) DO NOTHING`, así una cita con morosidad, incluso descartada, no se
  regenera. Lee el ledger por el contrato `payments_unpaid_charges`, no la tabla (ARCH-005), y recorre la lista por
  cursor, de a 200 con un máximo de 50 páginas por corrida, para que las morosidades ya existentes, que siguen
  impagas, no tapen a las citas nuevas (PERF-002).
- Prueba: pgTAP `delinquency_detect_unpaid.test.sql` (genera una por cita impaga pasada
  la gracia, asociada a la clienta; no toca las de dentro de la gracia ni las pagadas; correrla dos veces no duplica;
  una descartada no vuelve; al bajar la gracia entra la de 3 días; una cita nueva se detecta detrás de 210
  morosidades que llenan más de una página; la clienta y `anon` no la corren).
- La llama el cron de detección (sección «Cron de detección»).

### Confirmar y descartar (piezas 6 y 7)

- Migración `20261108000003_delinquency_decide_case_fn.sql`: `delinquency_decide_case(morosidad, decisión)`
  (`SECURITY DEFINER`, solo admin; la clienta y `anon` reciben `42501`). `confirm` deja la morosidad `active` y
  `dismiss` la deja `dismissed`, con quién y cuándo decidió. Solo se decide una morosidad `pending_review`: una ya
  decidida es el error `delinquency_case_already_decided` y una inexistente `delinquency_case_not_found`. El
  evento `delinquency.case.confirmed` o `delinquency.case.dismissed` queda en `audit_events` en la misma
  transacción (DOM-011). Prueba: pgTAP `delinquency_decide_case.test.sql`.
- Dominio (pieza 6): `domain/delinquency-case.ts` (estados y decisiones) y `domain/errors.ts` (errores con guarda de tipo, DOM-006).
- App (pieza 7): `application/decide-case.ts` sobre el puerto `CaseRepository` y `db/case-repository.ts`, que llama a la
  función de la base, traduce `P0002` y `55000` a «no existe» y «ya se decidió», y valida la fila con Zod. La
  acción `decideCaseAction` (`ui/review/actions/`) exige sesión de administradora, valida con Zod y refresca la
  pantalla. Pruebas: `application/__tests__/decide-case.test.ts`, `db/__tests__/case-repository.test.ts` y
  `ui/review/__tests__/review-actions.test.ts`.
- La llama la pantalla de morosidades (sección siguiente).

### Funciones del contrato (pieza 8)

- Migración `20261108000004_delinquency_contract_fns.sql`: `delinquency_client_states(ids)` y
  `delinquency_list_active(tope, después_de)` (la pieza 21 cambia su cursor), las dos del contrato [delinquency-api.md](../../../docs/contracts/delinquency-api.md).
  Son de solo lectura y `SECURITY INVOKER`: la RLS deja ver las filas solo a staff. El estado de una clienta es el
  más relevante: `active` gana a `pending_review` y `dismissed` no se devuelve; el saldo es el de las morosidades de ese
  estado. Más de 200 ids es el error `delinquency_too_many_ids`. El listado de activas va de la más reciente a la más
  antigua, con tope de 100 y paginado por fecha.
- Prueba: pgTAP `delinquency_contract.test.sql` (la activa gana, el saldo se suma por estado, la descartada no sale, el
  tope de ids, el orden y la paginación del listado, y la clienta y `anon` no ven nada).
- Las consumen la pantalla de morosidades, `clients` y la agenda diaria de `scheduling` (US-MOR-02).

### Pantalla de morosidades (piezas 9 a 11)

- Ruta `/admin/morosidades` (`src/app/admin/morosidades/`, con `loading.tsx` y `error.tsx`), solo para administradora, con un
  ítem «Morosidades» en el menú (`auth`, `ADMIN_PORTAL_ROUTES.delinquency`). Muestra dos secciones: **Por revisar**, con lo
  que debe cada clienta y los botones «Confirmar morosidad» y «Descartar», y **Morosidades activas**, con lo que debe y desde
  cuándo. Cada lista tiene tope de 50 (PERF-002); las por revisar van de la más antigua a la más reciente, para decidir primero
  las que llevan más tiempo.
- App: `application/load-review.ts` arma la vista con `CaseListRepository` (`db/case-list-repository.ts`, que lee la tabla
  propia y `delinquency_list_active`) y `ClientNamesPort` (`db/client-names.ts`, que pide el nombre a `clients_display_names`,
  ARCH-005, una sola llamada con las clientas sin repetir). Una clienta sin nombre visible se muestra como «Clienta sin
  nombre». `ui/review/components/CaseDecisionButtons.tsx` llama a `decideCaseAction`, deshabilita los botones mientras guarda y
  muestra el resultado o el motivo del error junto a esa morosidad.
- Estados (UI-003): vacío por sección, carga (`ReviewLoading`) y error con reintento (`ReviewError` y el aviso de lectura).
  Los montos usan `formatMoney` y las fechas `formatStudioDateTime` (DOM-003).
- Pruebas: `application/__tests__/load-review.test.ts`, `db/__tests__/case-list-repository.test.ts` y
  `ui/review/__tests__/review-view.test.tsx` (listas, monto en colones, nombre por defecto, vacío, error y carga, y los botones
  con éxito y con fallo).
- El reflejo en `clients` y el aviso en la bandeja están en sus secciones.

### Morosidad en `clients` (piezas 12 y 13)

- `clients` consume el contrato (`delinquency_client_states`) para la columna «Morosidad» del listado y el encabezado del perfil de
  la clienta, que cubre el reflejo en el expediente del criterio 5. La implementación y sus pruebas están en el SPEC de `clients`
  («Morosidad en el listado y en el perfil»). Si esta feature no responde, `clients` sigue funcionando y muestra «Sin dato».

### Cron de detección (pieza 14)

- Ruta `POST /api/cron/delinquency-detect` (`src/app/api/cron/delinquency-detect/route.ts`). Exige `Authorization: Bearer <CRON_SECRET>` (comparación en tiempo constante, `shared/lib/cron-auth.ts`, que el cron de recordatorios de `notifications` ahora también usa); sin el secreto responde 401 y no toca la base.
- Entra con la misma cuenta de sistema del cron de recordatorios (`NOTIFICATIONS_CRON_EMAIL` y `NOTIFICATIONS_CRON_PASSWORD`, staff): `delinquency_detect_unpaid()` exige staff y no hay otro camino sin sesión. No usa la service-role key (SEC-003/004). No hay variables nuevas.
- Llama a `delinquency_detect_unpaid()` y responde `{ "generated": n }`. No hay bandera de encendido (decisión del PO): corre el ledger y deja lo que corresponde; con nada impago o nada nuevo, `generated` es 0. El cron nunca activa una morosidad: solo deja `pending_review` (DOM-012).
- Fallos: sin cuenta de sistema configurada o si no puede entrar, 503 con ese motivo; si la base falla, 503 con `storage-failed` sin filtrar el mensaje; una excepción inesperada, 500. En todos los casos cierra la sesión de sistema.
- **No está programado.** El repo no tiene programación de crons de la app. Decisión del PO (Kenny, 2026-11-08): `.github/workflows/delinquency-detect.yml` existe con solo `workflow_dispatch`, llama a la ruta con el `CRON_SECRET` como Bearer (secretos `APP_BASE_URL` y `CRON_SECRET`, ver `docs/process/CI_SECRETS.md`), y una corrida diaria basta. **Se activa agregando el `schedule` (ya escrito como comentario en el workflow) cuando US-MOR-03 esté mergeada y Kenny lo confirme**, porque hasta que se puedan registrar pagos toda cita cerrada con cargo parece impaga. Lo programa Jose o Kenneth si lo bloquea. Hasta entonces la detección no corre sola.
- Capas: `application/detect-unpaid.ts` sobre el puerto `DetectionRepository`, `db/detection-repository.ts` (valida que la respuesta sea un entero no negativo) y `http/cron-handler.ts`. Pruebas: `application/__tests__/detect-unpaid.test.ts`, `db/__tests__/detection-repository.test.ts`, `http/__tests__/cron-handler.test.ts` y `shared/lib/__tests__/cron-auth.test.ts`.
- Comprobado a mano en local, de punta a punta con el servidor real: sin secreto y con secreto equivocado, 401; con el secreto correcto y tres citas impagas pasada la gracia, `generated: 3` y tres morosidades `pending_review`; una segunda corrida, `generated: 0`; ninguna quedó `active`.

### Aviso en la bandeja (piezas 15 y 16)

- Contrato: [delinquency-api.md](../../../docs/contracts/delinquency-api.md), «Aviso a la bandeja de la administradora». Migración
  `20261108000005_delinquency_review_notice.sql` (INT-008, una sola): el trigger `delinquency_cases_notify_detected` llama, al insertarse
  una morosidad `pending_review`, a `notifications_record_delinquency_review`. Un aviso por morosidad; una que nace activa no avisa; un
  fallo al registrar el aviso no bloquea la morosidad (queda en el log, igual que en `scheduling`).
- La bandeja nació para avisos de una cita; el de morosidad lleva lo que debe la clienta. `notifications_admin_inbox` suma
  `pending_amount`, `service_name` y `starts_at` pasan a ser opcionales y la combinación válida de columnas queda fijada por tipo
  (restricción `notifications_admin_inbox_fields_by_kind`).
- Prueba: pgTAP `delinquency_notify_case_detected.test.sql` (el aviso con la clienta y lo que debe, una activa no avisa, la detección
  real deja uno por morosidad y una segunda corrida no repite, la clienta no ve ni registra, un fallo del aviso no bloquea y la tabla
  exige las columnas de cada tipo).
- Pieza 15: la base de datos. Pieza 16: `notifications` dibuja el aviso en la bandeja de la administradora («{clienta} tiene un pago sin
  registrar por revisar», lo que debe y un enlace a `/admin/morosidades`); el detalle está en el SPEC de `notifications`.
- Comprobado a mano en local, con el servidor real y un navegador: el cron genera 3 morosidades y deja 3 avisos; la segunda corrida no repite; la administradora ve «3 sin leer» en Notificaciones, cada aviso con la clienta y lo que debe, y el enlace «Revisar morosidades» cierra el panel y lleva a `/admin/morosidades`, donde están las 3 por revisar.
- **Volumen conocido:** como hay un aviso por morosidad, la primera corrida con pagos reales (cuando US-MOR-03 exista) puede dejar muchos
  de una vez. La bandeja pagina de 20 en 20; si se vuelve un problema, un aviso resumen por corrida es un cambio posterior.

### Periodo de gracia configurable (piezas 17 a 19)

- Criterio 2: la administradora cambia el periodo de gracia, de 1 a 90 días (aprobado por el PO, 2026-11-08); rige solo para las
  detecciones nuevas y no toca las morosidades ya generadas. La tabla `delinquency_settings` no se escribe directo, ni siquiera la
  administradora: la única vía es la función de esta pieza.
- Migración `20261108000006_delinquency_set_grace_days_fn.sql`: `delinquency_set_grace_days(días)` (`SECURITY DEFINER`, solo admin; la
  clienta y `anon` reciben `42501`). Fuera de 1 a 90 es `22023`. Cada cambio deja el evento `delinquency.settings.grace_days_changed`
  en `audit_events`, en la misma transacción, con el valor anterior y el nuevo (DOM-011); poner el mismo valor no cambia nada ni deja
  evento. Devuelve el valor que quedó.
- Prueba: pgTAP `delinquency_set_grace_days.test.sql` (cambia y devuelve el valor, deja el evento con quién, anterior y nuevo, el mismo
  valor no deja evento, los límites 1 y 90 y los rechazos de 0 y 91, una morosidad ya generada no cambia, y la clienta y `anon` no la
  llaman).
- App (pieza 18): `domain/grace-days.ts` (el rango 1 a 90 y su guarda), `domain/errors.ts` (`InvalidGraceDays`),
  `application/grace-days.ts` sobre el puerto `SettingsRepository` y `db/settings-repository.ts`, que lee la fila única, llama a la
  función de la base y traduce `22023` a «gracia inválida». Un valor fuera de rango no llega a la base: se rechaza antes (la base lo
  vuelve a exigir). Pruebas: `application/__tests__/grace-days.test.ts` y `db/__tests__/settings-repository.test.ts`.
- Pantalla (pieza 19): una sección «Periodo de gracia» al final de `/admin/morosidades`, con la explicación de que rige solo para las
  detecciones nuevas y un campo numérico de 1 a 90 con su botón «Guardar» (`ui/review/components/GraceDaysForm.tsx`). La acción
  `setGraceDaysAction` exige sesión de administradora, valida con Zod (entero de 1 a 90), llama al caso de uso y refresca la pantalla;
  un fallo de la base se dice sin mostrar su texto interno. `review-service` lee la gracia junto con la vista y, si no se pudo leer,
  la pantalla sigue y esa sección dice que no está disponible, sin un formulario con un valor inventado. Pruebas:
  `ui/review/__tests__/review-actions.test.ts` y `review-view.test.tsx`.
- Pieza 17: la base de datos. Pieza 18: dominio, aplicación y repositorio. Pieza 19: la acción y el formulario en la pantalla.

### Correcciones de la revisión (piezas 21 a 24)

La revisión de la pila encontró cuatro cosas medias, ninguna bloqueante. Se corrigen en piezas nuevas sobre la pila, sin reescribir las ya publicadas.

- Pieza 21 (#789): el cursor del listado de activas. `delinquency_list_active` paginaba solo por `since` (`since < p_after`), que se salta a todas las clientas que empatan con la última de la página, y las morosidades de una misma corrida de detección comparten la marca de tiempo. La migración `20261108000007_delinquency_list_active_cursor.sql` cambia la firma a `(p_limit, p_after_since, p_after_client_id)` y pagina por el par `(since, client_id)`, como `payments_unpaid_charges`. Prueba: pgTAP `delinquency_list_active_cursor.test.sql`, con tres clientas de la misma marca paginadas de a dos.

- Pieza 22 (#790): la pantalla ya no calla lo que queda fuera. Cada lista trae hasta su tope (50 por revisar, 50 activas); `loadReview` pide una fila más y, si llega, `ReviewView` trae `moreToReview` o `moreActive` y la pantalla dice «Hay más morosidades por revisar. Se muestran las 50 más antiguas…» o «Hay más morosidades activas. Se muestran las 50 más recientes.». La lista de por revisar va de la más antigua a la más reciente con desempate por id, así que al decidir las primeras aparecen las demás. El repositorio llama a la función con la firma nueva. Pruebas: `application/__tests__/load-review.test.ts`, `db/__tests__/case-list-repository.test.ts` y `ui/review/__tests__/review-view.test.tsx`. Paginar con «ver más» queda fuera: con el cursor de la pieza 21 el contrato ya lo permite cuando haga falta.

- Pieza 23 (#791): los componentes de la pantalla pasan a una carpeta por componente, como en el resto del repo (`ui/review/components/<Nombre>/` con `.tsx`, `.styles.ts`, `.types.ts` cuando hay props e `index.ts`), sin cambiar su comportamiento. `ReviewBody` sale de `ReviewView.tsx` a su carpeta, el `Feedback` que estaba copiado en `CaseDecisionButtons` y `GraceDaysForm` pasa a un solo componente, `FeedbackMessage`, y el `review.styles.ts` único se reparte en los estilos de cada componente. `ReviewPage`, que no tiene props ni estilos, y `ReviewLoading`, que no tiene props, no llevan los archivos vacíos. Las pruebas no cambian: pasan igual por los `index.ts`.

- Pieza 24 (#792): la deuda real que solo estaba en prosa queda registrada en el front-matter (`deuda`), con su costo y su dueño: la morosidad no se cierra ni actualiza el monto al pagarse (US-MOR-03), un aviso por morosidad sin resumen por corrida, la cuenta de sistema compartida con el cron de recordatorios y el escaneo completo del ledger por página. La salida de `supabase test db` sobre la punta de la pila está en el PR de la pieza 24 y en el de cierre (90 archivos, 1210 pruebas). Piden revisión humana las migraciones 2, 3, 5 y 6 (detección, decidir, aviso y gracia), que traen las funciones `SECURITY DEFINER` que nadie más ha leído.

### Qué no hace todavía

US-MOR-01 está terminada. El cron existe pero no está programado: ninguna fila se genera sola hasta que se agregue su `schedule`. Qué cuenta como pago registrado y el registro de pagos los trajo US-MOR-03: un pago es un asiento del ledger que asienta la administradora al aprobar un comprobante. Regularizar (US-MOR-03) está hecho; el histórico (US-MOR-04) y levantar o perdonar (US-MOR-05) no. Bloquear la agenda (US-MOR-02) está hecho y se describe en su sección.

## US-MOR-02: bloqueo de agenda por morosidad

Criterios del backlog:

1. Al intentar agendar, el sistema valida si la clienta tiene morosidad activa.
2. Si la tiene, se muestra un mensaje claro con el motivo, el monto y la opción de regularizar.
3. Una vez saldada la morosidad, la clienta recupera automáticamente la posibilidad de agendar.
4. La restricción se aplica también cuando la administradora agenda en nombre de la clienta, pero ella puede autorizar
   la excepción en el momento.
5. Todo bloqueo aplicado queda registrado, para poder revisar si el sistema está bloqueando clientas por error.

Recibe además de US-AGE-11 (ítem 11 de «Criterios trasladados») el indicador «Morosidad activa» en la agenda diaria, y de
US-AGE-05 (ítem 7) la validación dentro de las funciones de reserva.

Reglas: SEC-001 y SEC-002 (el bloqueo vive en la base, con RLS y su test de aislamiento), DOM-011 (el registro del bloqueo en
la misma transacción), DOM-012 (solo `active` bloquea; consecuencias automáticas aprobadas por el PO), ARCH-003/005 (otras
features piden por funciones del contrato), INT-003 (contrato primero), INT-008 (una migración por cambio, hacia adelante).

### Qué hace

- **Quién está bloqueada.** `delinquency_booking_block(client_id)` (migración `20261110000001_delinquency_booking_block_fn.sql`,
  contrato en [delinquency-api.md](../../../docs/contracts/delinquency-api.md)) devuelve las morosidades que bloquean a la
  clienta, la más antigua primero, con el saldo **de hoy**, que lee de `payments_appointment_balances` (migración
  `20261110000000_payments_appointment_balances_fn.sql`, contrato de `payments`), no la foto de la detección. Bloquea una
  morosidad `active` cuya cita todavía debe; `pending_review`, `dismissed` y una `active` ya saldada no bloquean. Al saldarse la
  cita la fila sale sola, sin tocar ninguna tabla de morosidad (criterio 3). Es `SECURITY DEFINER` porque la clienta no puede
  leer la tabla de morosidades ni el ledger; responde solo a la propia clienta y al personal, a cualquier otra sesión vacío y
  sin error, y `anon` no tiene `EXECUTE`. Mira como máximo las 200 morosidades activas más antiguas de la clienta. La llaman
  las tres funciones de reserva y el adaptador de la aplicación. Pruebas: pgTAP `delinquency_booking_block.test.sql` (9) y
  `payments_appointment_balances.test.sql` (9).
- **La reserva de la clienta rechaza a la bloqueada.** `scheduling_book_appointment` (migración
  `20261110000002_scheduling_book_appointment_blocks_delinquent.sql`) y `scheduling_book_package_appointment`
  (`20261110000003_scheduling_book_package_appointment_blocks_delinquent.sql`) preguntan a `delinquency_booking_block` justo
  después de resolver quién es la clienta, antes que el solape. Si está bloqueada, devuelven la fila con `id` nulo y dejan el
  evento `scheduling.booking.blocked_by_delinquency` en la bitácora, en la misma transacción (criterios 1 y 5). El evento
  tiene como entidad a la clienta y como actor a la sesión que intentó agendar, y su `payload` trae las citas que bloquean con
  su saldo de hoy (`blockingAppointments`), el recurso, la hora pedida y el servicio (técnica o paquete). Cada intento deja su
  evento. Lo escribe la función auxiliar `scheduling_booking_blocked_by_delinquency`, `SECURITY DEFINER` y sin `EXECUTE` para
  nadie, así que una clienta no puede falsear eventos. Pruebas: pgTAP `scheduling_book_blocked_by_delinquency.test.sql` (10)
  y `scheduling_book_package_blocked_by_delinquency.test.sql` (6).
- **La administradora agenda por la clienta y autoriza la excepción** (criterio 4; agendar en nombre de una clienta es una
  cláusula de esta historia, ADR-0007). `scheduling_admin_book_appointment(clienta, recurso, hora, técnica, primera vez,
  precio esperado, autorizar excepción, motivo)` (migración `20261110000004_scheduling_admin_book_appointment_fn.sql`). Solo
  la llama una administradora (otra sesión recibe `scheduling_not_authorized`, 42501); la clienta la da el parámetro y la cita
  nace igual que la de la clienta, `pending_approval`. Con la clienta bloqueada y sin autorización devuelve la fila con `id`
  nulo y registra el bloqueo con la administradora como actor. Con `p_authorize_exception = true` exige un motivo de al menos
  10 caracteres sin contar espacios (`scheduling_exception_reason_required`, 22023), agenda y deja
  `scheduling.booking.block_exception_authorized` en la misma transacción: actor la administradora, entidad la cita creada, y
  en el `payload` la clienta, el motivo y las citas que bloqueaban con su saldo. La clienta no lo ve: la bitácora solo la lee
  el personal. Si la clienta no estaba bloqueada, la autorización no hace nada. La validación de la franja es una copia de la
  de la reserva de la clienta; `scheduling_slot_validation_parity.test.sql` compara las tres reservas ante las mismas franjas
  inválidas (la deuda está en el SPEC de `scheduling`). Prueba: pgTAP `scheduling_admin_book_appointment.test.sql` (14).
- **La aplicación explica el rechazo** (criterio 2). `bookAppointment` y `bookPackageAppointment` reservan y, solo si la base
  rechaza como espacio no disponible, preguntan al puerto `DelinquencyPort.activeBlock()` si fue por morosidad. Si hay
  bloqueo devuelven `SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY` con la cita, el monto y la fecha; si la pregunta falla o no
  hay bloqueo, queda el rechazo original. Una reserva que sale bien o falla por otra causa no hace la pregunta. El evento de
  solape `scheduling.appointment_overlap_rejected` lo emite el caso de uso solo cuando la base devolvió vacío y
  `activeBlock()` dice que no hay bloqueo: un bloqueo no se cuenta como solape. El adaptador real,
  `createSupabaseDelinquencyPort` (`scheduling/db/delinquency-block-repository.ts`), pregunta a `clients_current_profile_id`
  quién es la clienta, a `delinquency_booking_block` si está bloqueada y lee la fecha de esa cita en `scheduling_appointments`;
  sin perfil de clienta devuelve «sin bloqueo» sin consultar, sin fecha el bloqueo sale sin ella, y un fallo de la base es un
  `StorageFailed`, nunca «sin bloqueo». Los ids se validan con `guid()`, no con `uuid()`, porque Postgres acepta cualquier
  uuid. `ui/booking-confirm/services/booking-service.ts` lo usa; `noDelinquencyYet` queda solo para las pruebas. El mensaje es
  el texto del PO: «No pudimos agendar tu cita porque tienes un saldo pendiente de ₡{monto} de tu cita del {fecha}.
  Comunícate con el estudio para regularizarlo y poder agendar de nuevo.», con el saldo de hoy en colones y la fecha en la
  zona del estudio (`formatStudioDate`, `shared/studio-time.ts`); sin fecha dice «de una cita anterior». Pruebas:
  `scheduling/application/__tests__/book-appointment.test.ts` y `book-package-appointment.test.ts` (incluye que un bloqueo no
  emite el evento de solape y un solape real sí), `scheduling/db/__tests__/delinquency-block-repository.test.ts`,
  `ui/booking-confirm/__tests__/perform-booking.test.ts` y `shared/__tests__/studio-time.test.ts`.
- **La agenda diaria indica la morosidad** (recibido de US-AGE-11). `DelinquentClientsPort` usa
  `createSupabaseDelinquentClientsPort` (`scheduling/db/delinquent-clients-repository.ts`): una sola llamada por día a
  `delinquency_client_states` con las clientas que la agenda pinta (como mucho 100); solo `active` marca «Morosidad activa»,
  no `pending_review` (DOM-012). Si la consulta falla, la agenda sale igual, sin etiquetas y con su aviso. Prueba:
  `scheduling/db/__tests__/delinquent-clients-repository.test.ts`.

### Decisiones de diseño

- **El bloqueo es de la base de datos.** La clienta llama a las funciones de reserva directo por PostgREST; un chequeo solo en
  TypeScript se saltaría. `scheduling` no lee tablas de `delinquency` (ARCH-005): le pregunta por una función del contrato.
- **Un bloqueo se registra sin lanzar excepción.** Una excepción revierte la transacción y se llevaría el registro (como ya
  resolvió `scheduling_alerts` con el solape). Por eso la reserva bloqueada devuelve la fila con `id` nulo, el mismo camino del
  solape, y deja el evento en la misma transacción (DOM-011). La aplicación distingue el bloqueo del solape preguntando a
  `delinquency_booking_block`, de solo lectura. El bloqueo se revisa antes que el solape: si ocurren los dos gana el bloqueo, y
  si el bloqueo se levantó entre las dos llamadas la clienta ve «el espacio no está disponible» y puede reintentar.
- **Solo `active` bloquea** (garantía 3 del contrato). `pending_review` y `dismissed` no tienen ninguna consecuencia.
- **Recuperar el acceso es derivado, no una acción.** La clienta está bloqueada mientras tenga una morosidad `active` cuya
  cita todavía tenga saldo en el ledger, calculado en el momento. Cuando el saldo de la cita llega a cero el acceso vuelve
  solo, sin tocar ninguna tabla de morosidad.
- **La excepción de la administradora** es un parámetro explícito de la llamada: solo una administradora la puede usar,
  exige confirmación y un motivo, y deja su propio evento. La clienta no puede autorizarse a sí misma ni ve esa autorización.
- **No se asume una sola persona donde no haga falta.** El bloqueo es por clienta, no por persona ni por recurso, y la
  excepción registra el id de quien la autorizó, no «la» administradora.

### Decisiones del PO (DOM-012, Kenny)

Comunicadas por Jose Lorenzo; el registro está en `docs/process/DEPENDENCIES.md`.

- **«Saldada»** (2026-11-08): la clienta recupera el acceso cuando el saldo de la cita que originó la morosidad llega a cero
  en el ledger, sin acción manual.
- **Solo bloquea una morosidad confirmada** (`active`), no una por revisar ni una descartada (2026-11-08).
- **«Opción de regularizar»** (criterio 2, 2026-11-08): el mensaje dice que se comunique con el estudio; se cambia cuando
  exista US-MOR-03. Hecho en US-MOR-03 (pieza 23): el texto del PO se mantiene y la alerta suma el enlace «Regularizar mi
  saldo» al estado de cuenta (`/portal/cuenta`).
- **Texto a la clienta** (2026-11-08): el de «La aplicación explica el rechazo». Kenny lo escribió en minúsculas al
  mensajear; se usa con mayúscula inicial de oración, sin cambiar las palabras.
- **Excepción de la administradora** (2026-11-08 y 2026-11-11): confirmación explícita y motivo obligatorio de al menos 10
  caracteres; queda en la bitácora con quién la autorizó, la clienta y la cita, y la clienta no lo ve. La cita que agenda la
  administradora queda `pending_approval`, igual que la de la clienta.
- **Alcance** (2026-11-11): esta historia entrega la función de la administradora y no su pantalla, que va como historia
  aparte.

### Qué no hace

- No hay pantalla para que la administradora agende por una clienta, ni función para agendar un paquete por ella: la
  excepción existe en la base y se usa llamando a `scheduling_admin_book_appointment` (deuda registrada arriba).
- No registra pagos ni cierra la morosidad: es de US-MOR-03, que ya lo hace (al aprobar el pago que salda la cita, la morosidad pasa a `settled`; queda la deuda del monto tras un pago parcial, registrada arriba). Hoy el saldo de una cita solo baja si alguien asienta el pago en
  el ledger, y la morosidad sigue `active` con el monto de la detección (deuda registrada arriba). Por eso, mientras tanto, la
  agenda diaria puede marcar «Morosidad activa» a una clienta que ya saldó y que sí puede agendar: el indicador mira el estado
  y el bloqueo, además, el saldo.
- Levantar o perdonar una morosidad a mano es de US-MOR-05.
- Cada intento bloqueado deja su evento, sin tope ni agrupación (deuda registrada arriba).
- La validación de franja está copiada en las tres funciones de reserva (deuda en el SPEC de `scheduling`).
- Varias personas atendiendo a la misma hora: el PO decidió terminar bien la base de un estudio de una persona y tratarlo
  después como historia o cambio posterior.

## US-MOR-03: regularizar la deuda desde la plataforma

Criterios del backlog:

1. La clienta puede iniciar el flujo desde el recordatorio o desde su estado de cuenta.
2. Al completar el flujo simulado o subir el comprobante, la morosidad pasa a estado «pendiente de aprobación».
3. Una vez aprobado por la administradora, la morosidad se marca como saldada y se libera la restricción.
4. La clienta ve en todo momento en qué estado está su regularización.

Porta además, sin historia propia (ADR-0007): el **registro de pago con comprobante** (DOM-008, que reutilizará US-SHOP-02) y la **vista de estado de cuenta** de la clienta (que comparte con US-CLI-06). Recibe de US-MOR-01 (ítem 14 de «Criterios trasladados») qué cuenta como pago registrado: cada pago es un asiento del ledger, append-only (DOM-005), que baja el saldo de la cita; esos asientos son los que la detección de US-MOR-01 y el acceso de US-MOR-02 ya leen, así que aprobar un pago devuelve el acceso solo.

Depende de US-MOR-02, ya en `main` (#875, 2026-11-16): el bloqueo de la agenda mira el saldo de la cita, así que aprobar un pago devuelve el acceso sin otra acción.

Reglas: DOM-005 (el pago es un asiento nuevo, nunca un UPDATE), DOM-008 (el comprobante se valida por su contenido en el servidor), DOM-011 (aprobar y asentar en la misma transacción), DOM-012 (solo una morosidad confirmada se regulariza), SEC-001, SEC-002 y SEC-006 (el comprobante es privado, con RLS y su prueba de aislamiento), ARCH-003/005 (otras features piden por funciones del contrato), INT-003 (contrato primero), INT-008 (una migración por pieza, hacia adelante).

### Diseño propuesto

- **Dueña: `delinquency`.** La solicitud de regularización cuelga de una morosidad (`delinquency_cases`), así que vive en `delinquency` y llama a `payments` para asentar el pago. La dirección de la dependencia se mantiene: `delinquency` ya lee de `payments`; `payments` no llama a `delinquency`.
- **Una solicitud es:** la morosidad, el monto que dice haber pagado, la referencia, el comprobante y su estado: `pending_approval` (la clienta la envió), `approved` (la administradora la aprobó), `rejected` (con motivo) o `replaced` (la clienta mandó otro comprobante mientras esta seguía pendiente; lectura provisional de la decisión 5).
- **Aprobar asienta el pago en la misma transacción** (DOM-011): una función `SECURITY DEFINER` solo para la administradora llama a la función de `payments` que escribe un asiento nuevo, de tipo pago y negativo, deja el evento en la bitácora y, si la cita queda saldada, la morosidad pasa a `settled` («saldada»). La clienta recupera el acceso porque el saldo de la cita llega a cero (US-MOR-02), no porque nadie se lo devuelva.
- **El ledger admite más de un pago por cita.** Hoy tiene un índice único por (cita, tipo) para que un cargo no se duplique; un pago parcial exige varios asientos de pago por la misma cita, así que ese índice se acota a los tipos que sí son únicos.
- **El comprobante es un archivo privado** en un bucket nuevo de Supabase Storage, validado en el servidor por sus primeros bytes y su tamaño, no por la extensión (DOM-008). Solo la dueña de la solicitud y la administradora lo ven, por URL firmada de corta vida.
- **El estado de cuenta** es la pantalla `/portal/cuenta` de la clienta (feature `account`, hoy sin código): su saldo, sus morosidades confirmadas, y el estado de su regularización (sin enviar, pendiente, aprobada o rechazada con el motivo), con el formulario para enviar el comprobante.
- **La administradora** ve las solicitudes por aprobar en una pantalla nueva, con el comprobante, y las aprueba o las rechaza con motivo. Cuando llega un comprobante nuevo, le avisa su bandeja (`notifications`).
- **«Desde el recordatorio»:** el recordatorio de pago es US-NOT-04, que depende de esta historia. Aquí queda una ruta estable para regularizar a la que ese recordatorio enlazará.

### Decisiones del PO (Kenny, 2026-11-13)

Comunicadas por Jose Lorenzo; el registro está en `docs/process/DEPENDENCIES.md`.

1. **Pagos parciales: sí, incluso pagos pequeños («micropagos»).** El monto va de 1 colón hasta el saldo de la cita, y el bloqueo sigue hasta que el saldo llegue a cero.
2. **Solo comprobante, por el momento.** No hay botón de pago ni pasarela: el sistema no mueve dinero (DOM-005).
3. **Dónde paga la clienta:** por ahora un **texto genérico de relleno** («placeholder») con la cuenta y las instrucciones; cuando el estudio tenga la información real, se actualiza en los mensajes de la pantalla. El estudio la entregó el 2026-11-18 (comunicada por Jose Lorenzo): solo SINPE Móvil, al 6128-4259 a nombre de Aracelly Obregon Morras; el mismo número es su WhatsApp y el correo es lasharybeautystudio@gmail.com. Está en el estado de cuenta (SPEC de `account`).
4. **Comprobante: imágenes y PDF**, con un límite de entre 3 y 5 MB. Kenny pidió verificar cuál es el peso promedio de un comprobante antes de fijarlo; mientras tanto pidió usar 5 MB. Como Vercel acepta como mucho 4,5 MB por petición, se usó **4 MB**. **Cambiado el 2026-11-18 con la clienta (dueña del estudio): el tope es 1 MB**, porque un comprobante de SINPE o del banco no pesa más; puede ser foto del teléfono o PDF (pieza 24, migración `20261117100000_delinquency_receipts_1mb.sql`).
5. **Rechazo:** la administradora **debe dar un motivo** (de al menos 10 caracteres, decidido con la clienta el 2026-11-18), y la clienta puede **reemplazar** el comprobante que ya envió por uno nuevo. Reenviar reemplaza la solicitud vigente de esa morosidad (queda una sola a la vez) y el historial se conserva en la base; **confirmado con la clienta (dueña del estudio) el 2026-11-18**: queda así, «por si se equivoca», y después de un rechazo también puede mandar otro.
6. **Monto aprobado:** la administradora puede aprobar un monto distinto del que declaró la clienta, y la pantalla debe dejar en claro que **hay que verificar el comprobante y no confiar a ciegas en el monto de la clienta**. Quedan los dos montos en la bitácora.
7. **Avisos:** a la administradora le avisa su bandeja cuando llega un comprobante; la clienta se entera en su estado de cuenta. Kenny pidió **dejar anotado que falta la implementación por otros canales** (WhatsApp y correo): queda registrado como deuda de esta historia.
8. **Alcance:** solo se regularizan las morosidades confirmadas (`active`).

### Contratos

- [payments-api.md](../../../docs/contracts/payments-api.md), «Registro de pago»: el asiento `payment` (negativo, varios por cita), el índice único acotado a `charge` y `deposit_credit`, y `payments_record_payment`, que solo llama la aprobación de `delinquency` y no deja pagar más que el saldo de la cita.
- [delinquency-api.md](../../../docs/contracts/delinquency-api.md), «Regularización»: el estado `settled`, los estados de una solicitud, `delinquency_my_account()` para la vista de estado de cuenta de `account`, el bucket privado `delinquency-receipts`, lo que `delinquency` pide a `payments` y el aviso `notifications_record_regularization_submitted`.
- La vista de estado de cuenta muestra como total lo que la clienta debe en morosidades confirmadas (la suma de `pending`), no el saldo completo del ledger: las citas recién cerradas dentro de la gracia todavía no son morosidad.

### Base de datos

- **Pagos en el ledger** (de `payments`; detalle en su SPEC): el asiento `payment`, varios por cita, y `payments_record_payment`, que no deja pagar más que el saldo de la cita y que nadie con sesión llama directo.
- **Estado `settled` y solicitudes** (migración `20261117040000_delinquency_regularizations.sql`): `delinquency_cases` admite `settled` con su `settled_at` y conserva la decisión de cuando se confirmó. `delinquency_regularizations` guarda la morosidad, la clienta, lo declarado, la referencia opcional y la ruta del comprobante; cada estado exige sus campos (aprobada: monto y asiento de pago; rechazada: motivo no vacío; pendiente y reemplazada: nada de la revisión) y hay como mucho una pendiente por morosidad. Solo staff lee; nadie con sesión escribe: enviar, aprobar y rechazar son funciones `SECURITY DEFINER`. `CASE_STATES` del dominio incluye `settled`. Pruebas: pgTAP `delinquency_regularizations.test.sql` (16: los estados, una pendiente por morosidad, el contrato no devuelve una saldada, y que ni la clienta dueña ni otra clienta lean la tabla) y `db/__tests__/case-row.test.ts`.
- **Bucket de comprobantes** (migración `20261117050000_delinquency_receipts_bucket.sql`): `delinquency-receipts`, privado, imagen (JPEG, PNG, WebP) o PDF; nació con tope de 4 MB y desde la pieza 24 (migración `20261117100000_delinquency_receipts_1mb.sql`) es de 1 MB. Cada clienta escribe y lee solo en su carpeta (`<client_id>/...`, por `clients_current_profile_id`) y el personal lee todas; sin políticas de UPDATE ni DELETE. El bucket es la segunda barrera: el tipo real lo decide la aplicación por los primeros bytes (DOM-008), porque una clienta con sesión puede subir directo a Storage. Prueba: pgTAP `delinquency_receipts_bucket.test.sql` (12: privado, tope y tipos, su carpeta sí y la ajena no, otra clienta no ve el comprobante, el personal ve todos, y sin políticas de cambio ni borrado).
- **La clienta envía y consulta** (migración `20261117060000_delinquency_submit_regularization_fn.sql`): `delinquency_submit_regularization(morosidad, declarado, referencia, comprobante)` responde solo por la clienta de la sesión (otra sesión, `delinquency_not_a_client`). Exige una morosidad `active` propia (ajena, inexistente o en otro estado es la misma respuesta, `delinquency_case_not_regularizable`, para no revelar si existe) cuya cita todavía deba, lo declarado entre 1 y el saldo de hoy, y el comprobante subido en su carpeta y sin usar en otra solicitud. Si había una pendiente, queda `replaced`. Deja `delinquency.regularization.submitted` en la bitácora, con un lock por morosidad. `delinquency_my_account()` devuelve las morosidades `active` que todavía deben y las `settled` de los últimos 30 días, con el saldo de hoy y la solicitud más reciente. Prueba: pgTAP `delinquency_submit_regularization.test.sql` (20).
- **La administradora aprueba** (migración `20261117070000_delinquency_approve_regularization_fn.sql`): `delinquency_approve_regularization(solicitud, monto aprobado)` exige administradora, una solicitud pendiente y su morosidad `active`, y un monto de 1 hasta el saldo de hoy, que puede ser distinto del declarado. En una transacción asienta el pago por `payments_record_payment`, marca la solicitud aprobada con el monto, el asiento y quién la revisó, y si la cita queda en cero pasa la morosidad a `settled`; con eso la cita deja de bloquear la agenda. Un pago parcial deja la morosidad `active`. Deja `delinquency.regularization.approved` con lo declarado, lo aprobado y el saldo antes y después, y devuelve el estado de la morosidad. Prueba: pgTAP `delinquency_approve_regularization.test.sql` (15).
- **La administradora rechaza** (migración `20261117080000_delinquency_reject_regularization_fn.sql`): `delinquency_reject_regularization(solicitud, motivo)` exige administradora, una solicitud pendiente y un motivo de 10 a 500 caracteres, sin contar los espacios de los extremos (el mínimo, desde la pieza 25: migración `20261117110000_delinquency_rejection_reason_min.sql`). No toca el ledger ni la morosidad, que sigue `active` y bloqueando; la clienta ve el motivo en su estado de cuenta y puede enviar otra solicitud. Deja `delinquency.regularization.rejected` con el motivo. Prueba: pgTAP `delinquency_reject_regularization.test.sql` (11).

### Aplicación

- **Validar y subir el comprobante** (DOM-008): `domain/receipt.ts` decide el tipo por los primeros bytes (JPEG, PNG, WebP o PDF; un RIFF que no es WebP no entra) y rechaza un archivo vacío o de más de 1 MB, sin mirar el nombre ni lo que declara el navegador. `application/upload-receipt.ts` valida antes de preguntar nada a la base, así que un archivo inválido no llega a Storage; pregunta quién es la clienta de la sesión (`CurrentClientPort`, por `clients_current_profile_id`) y sube a su carpeta con el tipo real por `ReceiptStorage` (`db/receipt-storage.ts`, con la sesión de la clienta y sin reemplazar). Devuelve la ruta que guarda la solicitud. Pruebas: `domain/__tests__/receipt.test.ts`, `application/__tests__/upload-receipt.test.ts` y `db/__tests__/receipt-storage.test.ts`.
- **El dominio de la regularización y su repositorio**: `domain/regularization.ts` (estados de una solicitud, la entrada del estado de cuenta y lo que se revisa sin la base: monto entero positivo y referencia de hasta 100 caracteres). `db/regularization-repository.ts` llama a `delinquency_submit_regularization` y `delinquency_my_account`, traduce cada mensaje de la base a su motivo (`RegularizationRefused`) y valida las filas con Zod. Pruebas: `domain/__tests__/regularization.test.ts` y `db/__tests__/regularization-repository.test.ts`.
- **Enviar la regularización y leer el estado de cuenta**: `application/submit-regularization.ts`. `submitRegularization` revisa sin la base el monto y la referencia antes de subir el comprobante, para no dejar archivos por un formulario mal llenado; después sube por `uploadReceipt` y registra la solicitud por `RegularizationRepository`. Si la base la rechaza después de subir, el archivo queda en la carpeta sin usarse (el bucket no permite borrar). `loadMyAccount` devuelve las morosidades del estado de cuenta y el total que debe en las activas. Prueba: `application/__tests__/submit-regularization.test.ts`.
- **La acción de la clienta** (`ui/regularization/`): `submitRegularizationAction` (firma de `useActionState`) lee el formulario y llama a `regularizationService`, que arma todo con la sesión de la clienta (nunca la service-role key). `utils/perform-regularization.ts` exige sesión de clienta, valida el formulario con Zod (morosidad, monto entero positivo, referencia), rechaza un archivo vacío o de más de 1 MB antes de leerlo, y traduce cada rechazo a un mensaje para la clienta. `regularizationService.loadMyAccount` sale por `index.ts` para la pantalla de `account`; la acción la usa el formulario de esta feature. `next.config.js` deja el cuerpo de las server actions en 4,5 MB, lo máximo que acepta Vercel, para que un archivo de más de 1 MB llegue a la aplicación y la clienta reciba el mensaje del tope y no un error genérico. Prueba: `ui/regularization/__tests__/perform-regularization.test.ts`.
- **El formulario del comprobante** (`ui/regularization/components/RegularizationForm`, componente de cliente que sale por `index.ts`): monto entre 1 y lo que debe la cita, referencia opcional y archivo (el `accept` ofrece foto o PDF; el tipo real lo decide el servidor). Al elegir un archivo de más de 1 MB, el campo se marca inválido en el navegador con el mismo mensaje del servidor, y el formulario no se envía. Usa `submitRegularizationAction` con `useActionState`, anuncia el resultado (`status` o `alert`) y, si hay un comprobante en revisión, avisa que enviar otro lo reemplaza. Vive aquí, y no en `account`, porque el registro de pago con comprobante es de esta feature. Prueba: `ui/regularization/__tests__/RegularizationForm.test.tsx`.
- **El estado de cuenta de la clienta** (feature `account`, `/portal/cuenta`): muestra el total, cada morosidad con el estado de su comprobante y `RegularizationForm`. Detalle y pruebas en el SPEC de `account`.
- **La cola de comprobantes de la administradora** (lectura): `application/load-regularization-queue.ts` trae las solicitudes pendientes, de la más antigua a la más nueva y con tope de 50 (avisa si hay más), cada una con el nombre de la clienta (`clients_display_names`, ARCH-005), lo que debe hoy la cita y un enlace firmado de 5 minutos al comprobante. Si el enlace no se puede firmar, la solicitud se muestra igual, sin enlace. `db/regularization-queue-repository.ts` lee la tabla con la morosidad embebida y pide los saldos de una vez (`payments_appointment_balances`), con la sesión de la administradora (la RLS solo deja a staff); `receiptLinks` firma los enlaces con la política del bucket. Comprobado contra el Supabase local con una administradora: la cola, el saldo de hoy y el enlace que descarga el PDF. Pruebas: `application/__tests__/load-regularization-queue.test.ts`, `db/__tests__/regularization-queue-repository.test.ts` y `db/__tests__/receipt-storage.test.ts`.
- **La cola en la pantalla de morosidades** (`ui/regularization-review/`): la sección «Comprobantes por revisar» va primero en `/admin/morosidades` (`ReviewView` la recibe por el hueco `queue`; `ReviewPage` la carga en paralelo con lo de US-MOR-01). Cada tarjeta muestra la clienta, lo que declara, lo que debe hoy, cuándo lo envió, la referencia y «Ver comprobante», que abre el enlace firmado en otra pestaña con un nombre que dice de quién es (UI-004); sin enlace lo dice. Arriba de la lista, el aviso del PO: verificar el comprobante y no confiar en el monto que declara la clienta. Estados: vacío, «hay más» y error con reintento (UI-003). Comprobado con el servidor local y una administradora de prueba, en escritorio y teléfono; el enlace descarga el PDF. Prueba: `ui/regularization-review/__tests__/RegularizationQueue.test.tsx`.
- **Aprobar y rechazar** (aplicación): `application/review-regularization.ts` revisa sin la base lo que se puede (monto aprobado entero positivo; motivo de 10 a 500 caracteres, sin espacios sobrantes; el campo del formulario repite los dos límites con `minLength` y `maxLength`) y llama a `RegularizationReviewRepository`. `db/regularization-review-repository.ts` llama a `delinquency_approve_regularization` y `delinquency_reject_regularization` con la sesión de la administradora y traduce cada mensaje de la base a su motivo (`ReviewRefused`): solicitud inexistente, ya revisada, monto inválido o motivo vacío. Aprobar devuelve el estado en que queda la morosidad (`active` o `settled`). Pruebas: `application/__tests__/review-regularization.test.ts` y `db/__tests__/regularization-review-repository.test.ts`.

- **Las acciones de aprobar y rechazar** (`ui/regularization-review/actions/`): `approveRegularizationAction` y `rejectRegularizationAction` exigen sesión de administradora, validan el formulario (`utils/perform-review.ts`: solicitud, monto entero positivo, motivo), dicen si la morosidad quedó saldada o sigue activa, traducen cada rechazo a un mensaje y recargan la pantalla. Prueba: `ui/regularization-review/__tests__/perform-review.test.ts`.
- **Aprobar y rechazar en la cola**: cada tarjeta trae `RegularizationDecision`, con dos formularios: aprobar, con el monto que la administradora verificó en el comprobante (empieza vacío a propósito, con lo declarado y lo que debe hoy como referencia, para no aprobar el monto de la clienta sin mirar), y rechazar, con un motivo obligatorio que la clienta verá. Al recargar, la solicitud sale de la cola y su tarjeta desaparece: por eso el resultado bueno se anuncia arriba de la cola (`QueueFeedback`, que sigue montado), y un error queda en la tarjeta. Comprobado de punta a punta con el servidor local: pago parcial, rechazo con motivo y pago final que salda la morosidad. Prueba: `ui/regularization-review/__tests__/RegularizationDecision.test.tsx`.
- **Desde el rechazo de la reserva** (pieza 23, `scheduling`): cuando la reserva se rechaza por morosidad, la alerta con el texto del PO trae el enlace «Regularizar mi saldo» a `/portal/cuenta`, donde está el formulario del comprobante (criterio 1). El texto del PO no cambia: cambiarlo es decisión de Kenny. Pruebas: `scheduling/ui/booking-confirm/__tests__/perform-booking.test.ts`, `book-appointment-action.test.ts` y `BookingConfirmForm.test.tsx`.
- **Aviso a la bandeja** (migración `20261117090000_delinquency_regularization_notice.sql`): al llegar una solicitud pendiente, el trigger `delinquency_regularizations_notify_submitted` pide el nombre a `clients_display_names` y registra el aviso en la bandeja de la administradora (detalle en el SPEC de `notifications`). Si el aviso falla, la solicitud se crea igual y el fallo queda en el log. La clienta no recibe aviso. Prueba: pgTAP `delinquency_regularization_notice.test.sql` (8).

### Pendiente de verificar

Nada. Las cuatro preguntas abiertas se resolvieron el 2026-11-18 con la clienta (dueña del estudio): el tope de 1 MB, reemplazar el comprobante como está, el motivo del rechazo de al menos 10 caracteres y los datos de pago reales (`docs/process/DEPENDENCIES.md`).

### Piezas previstas

Pueden cambiar con las respuestas del PO. Una migración por pieza (INT-008).

1. Arranque en docs (esta sección).
2. Contratos: lo que `payments` ofrece a `delinquency` (registrar un pago), lo que `delinquency` guarda y expone (solicitudes, `settled`) y la vista de estado de cuenta.
3. Base de `payments`: el ledger admite varios asientos de pago por cita.
4. Base de `payments`: `payments_record_payment` (sin `EXECUTE` para nadie: solo la llaman funciones `SECURITY DEFINER`).
5. Base de `delinquency`: el estado `settled` y la tabla de solicitudes de regularización, con RLS.
6. Base: el bucket privado de comprobantes y sus políticas.
7. Base de `delinquency`: la clienta envía una solicitud (valida que la morosidad sea suya y esté `active`, el monto contra el saldo, y una pendiente a la vez).
8. Base de `delinquency`: la administradora aprueba (asienta el pago, cierra la morosidad si queda saldada y deja la bitácora).
9. Base de `delinquency`: la administradora rechaza con motivo.
10. Aplicación: validar el comprobante por su contenido (DOM-008) y subirlo.
11. Aplicación: el dominio de la regularización y su repositorio (enviar y leer el estado de cuenta).
12. Aplicación: los casos de uso de la clienta para enviar la solicitud y leer su estado de cuenta.
13. La acción de la clienta que envía el comprobante y el servicio que lee su estado de cuenta.
14. El formulario del comprobante (componente de `delinquency`).
15. Pantalla: el estado de cuenta de la clienta en `/portal/cuenta` (feature `account`).
16. Aplicación: la lectura de la cola de comprobantes por revisar.
17. Pantalla: la cola de comprobantes en `/admin/morosidades`.
18. Aplicación: aprobar y rechazar.
19. Aplicación: las acciones de aprobar y rechazar.
20. Pantalla: aprobar y rechazar en la cola.
21. Aviso a la bandeja de la administradora cuando llega un comprobante.
22. Los datos reales de pago del estudio en el estado de cuenta (feature `account`).
23. El rechazo de la reserva por morosidad lleva a regularizar el saldo (feature `scheduling`).
24. El tope del comprobante baja a 1 MB (migración del bucket).
25. El motivo del rechazo lleva al menos 10 caracteres (migración de la función de rechazo).
26. Cierre: evidencia y estado.

(Eran 16; la aplicación de la clienta se partió en dominio y repositorio, casos de uso, la acción aparte de la pantalla, y la lectura de la cola aparte de su pantalla, para no pasar las ~400 líneas, INT-002.)

## US-MOR-05: levantar o perdonar una morosidad manualmente

Criterios del backlog:

1. Puedo levantar el bloqueo de un cliente sin necesidad de registrar un pago.
2. Puedo condonar total o parcialmente una morosidad indicando el motivo.
3. Toda excepción queda registrada en la bitácora de auditoría con fecha, monto y motivo.
4. Una excepción no borra el historial: la morosidad original permanece visible con su estado de condonada.

Depende de US-MOR-01 (`terminada`), único prerrequisito en `docs/process/DEPENDENCIES.md`. Reglas: DOM-005
(ledger append-only), DOM-006 (errores tipados, ADR-0008), DOM-011 (bitácora en la misma transacción), ARCH-005
(cross-feature con `payments`), INT-003 (contrato primero), SEC-001/002 (RLS + aislamiento), PERF-002, UI-003.

### Decisiones de diseño (2026-11-18, Kenny — PO)

Auditoría del 2026-11-18 sobre la primera versión de esta historia (hallazgos A3 y A4): el diseño original validaba
condonar contra el `pending` guardado al detectar (una foto), no contra lo que la cita debe hoy, y cerraba el caso con
cualquier condonación —aunque fuera parcial—, perdiendo el resto sin aviso. Kenny decidió:

- **Condonar valida contra el saldo vivo de la cita** (`payments_appointment_balances`, ya existe desde US-MOR-02), no
  contra la foto de `delinquency_cases.pending`. Corrige A3: con pagos parciales de US-MOR-03 ya no se puede condonar más
  de lo que realmente queda.
- **Condonar parcialmente no cierra el caso.** La morosidad sigue `active` con lo condonado hasta ahora en
  `exception_amount` (acumulado, se puede condonar más de una vez); solo pasa a `forgiven` cuando el saldo vivo llega a
  cero, sola o combinada con pagos de US-MOR-03. Corrige A4: ya no se pierde silenciosamente el resto del saldo, ni la
  regla depende del índice único que la pila de US-MOR-03 iba a cambiar.
- Consecuencia: `forgiveness_credit` deja de ser único por cita en el ledger (una cita puede condonarse más de una vez
  mientras siga debiendo); la protección que antes se apoyaba en un índice único ya no hace falta.

### Coordinación de migraciones con otras pilas abiertas (2026-11-18)

Las migraciones de esta historia (`payments_record_forgiveness_entry_fn`, `delinquency_lift_and_forgive_case_fn`)
reescriben el mismo `CHECK` de `kind`/signo de `payments_ledger_entries` y el mismo `CHECK` de estado de
`delinquency_cases` que la pila de US-MOR-03 (#902 a #924, Jose Lorenzo/MachineJALS), con listas distintas: la que se
aplique última borra los valores de la otra. US-MOR-03 también acota el índice único `(appointment_id, kind)` a
`charge`/`deposit_credit`. Para no chocar: las dos migraciones de esta historia usan fecha `20261120` (posterior a las
7 migraciones de la pila de US-MOR-03, que termina en `20261118000001`, y a la de US-AGE-08, `20261116000000`, con la
que solo coincidía el prefijo) y el `CHECK` de `kind` queda como la unión de ambas listas
(`charge`, `deposit_credit`, `payment`, `forgiveness_credit`), asumiendo que la pila de US-MOR-03 aplica primero por
número de versión. Si esa pila renombra sus migraciones más adelante, este supuesto hay que revisarlo.

**Seguimiento (2026-11-21):** US-MOR-03 se mergeó a `main` el 2026-11-20 (#943) antes que esta historia, confirmando
el supuesto de arriba. Pero el `CHECK` de `kind` no era el único que había que unir: `delinquency_cases_state_check`
y `delinquency_cases_decision_matches_state` también los reescribe US-MOR-03 (agregando `settled`, migración
`20261117040000_delinquency_regularizations.sql`) y esta historia los pisaba sin `settled` — hallazgo N1 de la
auditoría de Kenny, corregido en la pieza 3 (ver abajo). La lección: «unir con lo que deja la pila que entra
primero» aplica a **todo** `CHECK` que dos historias reescriban juntas, no solo al que se identificó primero.

### Pieza 1 — contrato

`docs/contracts/payments-api.md` (nueva función `payments_record_forgiveness_entry`, nuevo asiento
`forgiveness_credit`, no único por cita) y `docs/contracts/delinquency-api.md` (estados nuevos `lifted`/`forgiven`,
funciones `delinquency_lift_case`, `delinquency_forgive_case` y `delinquency_list_active_cases` —esta última con
saldo vivo vía `payments_appointment_balances`, no la foto—), antes de cualquier migración (INT-003). Sin código
todavía: la implementación sigue en las piezas siguientes.

### Pieza 2 — migración en `payments`

Nuevo asiento `forgiveness_credit` en `payments_ledger_entries` (CHECK ampliado como la unión con lo que deja
US-MOR-03) y `payments_record_forgiveness_entry` (`20261120000000_payments_record_forgiveness_entry_fn.sql`),
`SECURITY INVOKER` con `EXECUTE` revocado de `authenticated` y `anon` — mismo patrón que
`payments_record_close_entries`. A diferencia del diseño original, `forgiveness_credit` **no** es único por
cita (como `payment` de US-MOR-03): condonar parcial no cierra el caso (decisión de Kenny, ver arriba), así
que puede condonarse más de una vez hasta saldar. pgTAP `payments_record_forgiveness_entry.test.sql`.

### Pieza 3 — migración en `delinquency`

`delinquency_cases` admite `lifted`/`forgiven` (CHECK ampliado) con `exception_reason`/`exception_amount`,
que nunca tocan el `pending` original (criterio 4). `delinquency_lift_case` y `delinquency_forgive_case`
(`20261120000001_delinquency_lift_and_forgive_case_fn.sql`, `SECURITY DEFINER`, solo admin, solo sobre
`active`) escriben `decided_at`/`decided_by` y el evento en `audit_events` con fecha, monto y motivo
(criterio 3, DOM-011); `delinquency_forgive_case` valida y descuenta contra el **saldo vivo**
(`payments_appointment_balances`, A3) y deja el caso `active` si queda saldo (condonación parcial, A4) o
`forgiven` si se satura — puede llamarse más de una vez sobre el mismo caso. `delinquency_list_active_cases`
da el detalle por caso (saldo vivo + `exception_amount`) que `delinquency_list_active` (US-MOR-01) no tiene,
al agregar por clienta y mostrar la foto.

**N1 de la auditoría del 2026-11-21 (confirmado contra `main` ya con US-MOR-03 mergeada):** los 4 `CHECK` que
reescribe esta migración (`delinquency_cases_state_check`, `delinquency_cases_decision_matches_state`,
`delinquency_cases_exception_reason_by_state`, `delinquency_cases_exception_amount_by_state`) van ahora
como unión con `settled`, el estado que agregó US-MOR-03. `settled` se trata igual que `active` en los dos
últimos: no exige ni prohíbe `exception_reason`/`exception_amount`, así que una condonación parcial seguida
de un pago que termina de saldar la cita (`delinquency_approve_regularization`, que no toca esas columnas)
no pierde lo ya condonado. Sin este cambio, cualquier aprobación que dejara una cita en cero violaba el
`CHECK` de estado y la de excepción por estado, sin importar el monto.

B4 corregido: la validación de motivo vacío usa `!~ '\S'` en vez de `btrim()`, que no detectaba un motivo de
solo salto de línea o tabulador. Sin pgTAP todavía: pieza siguiente.

### Pieza 4 — pgTAP de levantar y condonar

Pruebas de la pieza anterior. `delinquency_lift_and_forgive_case.test.sql` (37 casos: levantar, condonar
total y parcial sin cerrar el caso, acumulado de condonaciones en `exception_amount`, no borra historial,
rechazos por estado/monto contra el saldo vivo (A3, no la foto)/motivo vacío o solo espacio en blanco
(B4)/caso inexistente, aislamiento clienta/anon — este repo no distingue un rol "staff" de "admin", así que
el aislamiento se prueba igual que el resto de las funciones de la feature). `delinquency_list_active_cases.
test.sql` (7 casos: una fila por caso, saldo vivo distinto de la foto, orden, cursor, aislamiento).
`delinquency_lift_unblocks_booking.test.sql` (2 casos: criterio 1 demostrado contra `delinquency_booking_
block` de US-MOR-02 — M1 de la auditoría —, no solo contra el estado en la tabla). Suite completa: `npx
supabase test db`, 117 archivos, 1543 pruebas, PASS.

**pgTAP de N1 (auditoría del 2026-11-21), agregado a `delinquency_lift_and_forgive_case.test.sql`:** condona
6000 de un cargo de 10000 (queda `active` con `exception_amount = 6000`), envía y aprueba una
regularización de US-MOR-03 por los 4000 restantes (`delinquency_submit_regularization` +
`delinquency_approve_regularization`), y comprueba con `lives_ok` que aprobar ya no viola ningún `CHECK`
(antes de la pieza 3, moría con `23514` en `delinquency_cases_exception_amount_by_state` apenas intentaba
dejar la fila en `settled`) y con `is()` que la morosidad queda `settled` conservando el `exception_amount`
y el `exception_reason` de la condonación parcial. Confirmado manualmente que esta prueba detecta la
regresión: revertir a mano el `CHECK` sin `settled` en la base local hace que `lives_ok` falle con el mismo
error `23514` del hallazgo, y que el estado se quede en `active` en vez de `settled`.
