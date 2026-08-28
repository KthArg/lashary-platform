# Interfaz — reglas UI

> **Autoridad:** consistencia visual, tokens, estados de UI y accesibilidad. **Lectores:** quien toque componentes, páginas, estilos o texto visible. **Estado:** vigente. **Actualizado:** 2026-08-27.
> Índice máquina: [rules.yaml](rules.yaml).

## El punto

El trabajo aquí es **consistencia, no creatividad**. DaisyUI ya provee el vocabulario de componentes; el modo de falla es seis devs inventando seis botones levemente distintos, seis escalas de espaciado y seis mensajes de error. Se aplica el design system; no se propone diseño nuevo en cada PR.

### UI-001 — Componentes del design system
**Regla.** Los componentes salen de DaisyUI o del catálogo propio del proyecto. No se arma a mano lo que ya existe (botones, inputs, modales, tablas, badges).
**Racional.** Seis botones levemente distintos producen un producto que se siente roto sin estarlo.
**Cumplimiento.** L4 `/revisar-ui` + L5 review.

### UI-002 — Tokens, no valores arbitrarios
**Regla.** Espaciado, tipografía y color salen de los tokens configurados en Tailwind/DaisyUI. Valores arbitrarios (`mt-[13px]`, `#ff6b81` inline) prohibidos fuera del archivo de tokens.
**Racional.** Cada valor mágico es una decisión de diseño que nadie tomó y nadie puede repetir.
**Cumplimiento.** L1 lint de clases arbitrarias y colores hardcodeados (F4).

### UI-003 — Estados vacío, carga y error
**Regla.** Toda lista y vista de datos implementa sus tres estados: vacío (con acción sugerida), carga y error (con reintento cuando aplique), consistentes con el patrón del catálogo. Explícito en US-CLI-01; aplica a todo listado.
**Racional.** Son exactamente lo que hace que un producto se sienta sin terminar cuando faltan — y lo primero que una clienta ve con datos reales.
**Cumplimiento.** L4 `/estados` + L5 review.

### UI-004 — Accesibilidad básica
**Regla.** Contraste de color suficiente (WCAG AA), foco visible, operable por teclado, todo campo de formulario con label, todo `img` con alt significativo (o vacío si decorativo).
**Racional.** No es opcional ni "avanzado": es la diferencia entre usable y no usable para clientas reales.
**Cumplimiento.** L1 checks automatizables — contraste, labels, alt — (F4); teclado y foco en L4 `/revisar-accesibilidad` + L5.

## Atención particular

- **La agenda diaria de la administradora (US-AGE-11) se usa en un teléfono durante la jornada.** Responsive en los breakpoints acordados no es opcional ahí; es el caso de uso principal.
- Texto visible: siempre externalizado ([DOM-009](ARCHITECTURE.md#dom-009)); nunca inline en JSX.
