# Contexto del proyecto

Esta es una tienda argentina de colchones y sommiers.

La marca debe sentirse:

- Simple
- Confiable
- Cercana
- Moderna
- Accesible
- Especialista, sin resultar técnica o compleja

La experiencia debe ayudar a una persona que no entiende de colchones a elegir correctamente.

## Fuentes de contexto

Antes de modificar páginas de producto o catálogo:

1. Leer `docs/product-catalog.md`.
2. Leer `design-system/MASTER.md`, si existe.
3. Revisar los componentes y estilos actuales.
4. No inventar información técnica faltante.

## Objetivos UX

- Explicar claramente las diferencias entre líneas.
- Separar tecnología, sensación de confort y nombre comercial.
- Facilitar la comparación entre modelos.
- Priorizar la experiencia mobile.
- Hacer visible precio, cuotas, envío, medida y presentación.
- Reducir ansiedad y sobrecarga de opciones.
- Mantener accesibilidad WCAG AA.

## Reglas de implementación

- Reutilizar componentes existentes.
- No cambiar el stack tecnológico.
- No agregar dependencias sin necesidad.
- Usar tokens para colores, tipografía, bordes, sombras y espaciado.
- Evitar estilos aislados por página.
- Verificar responsive en 375, 768, 1024 y 1440 px.
- Ejecutar lint, tests y build después de cada cambio relevante.
