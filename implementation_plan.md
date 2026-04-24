# Rediseño de la Home: Perfil Híbrido UX/UI & Front-end

Este plan detalla la reestructuración y mejora del copy de la página principal (Home) para transmitir claramente tu perfil híbrido (Diseñador UX/UI + Front-end), enfocándose en la resolución de problemas reales y el pensamiento de producto.

## Cambios Propuestos

### Componentes Actualizados y Nuevos

#### [MODIFY] `src/components/Hero.jsx`
- **Cambio:** Actualizar el titular y subtítulo para hacerlos más directos y potentes, evitando textos genéricos.
- **Copy:** 
  - Titular: "Diseño y construyo productos digitales que funcionan de verdad." (o variante impactante)
  - Subtítulo: "Híbrido entre diseño UX/UI y Front-end. Creo interfaces que no solo se ven bien: se usan, convierten y resuelven problemas de negocio."
  - CTAs: "VER PROYECTOS" y "CONTACTAR".

#### [NEW] `src/components/Positioning.jsx` (Reemplaza la idea de `Quote.jsx`)
- **Objetivo:** Un bloque conciso tras el Hero que ancle tu posicionamiento.
- **Copy:** Explicar qué haces (pensamiento de producto), cómo trabajas (enfoque práctico) y qué te diferencia (capacidad de ejecutar). "Pienso como diseñador, construyo como desarrollador."

#### [MODIFY] `src/components/ValueProposition.jsx`
- **Cambio:** Transformar este bloque en "QUÉ PUEDO APORTAR".
- **Items:**
  1. **Diseño enfocado al uso real:** Interfaces intuitivas sin fricciones.
  2. **Desarrollo Front-end funcional:** Del diseño a código limpio y escalable.
  3. **Visión de Producto:** Alineando necesidades del usuario con objetivos de negocio.
  4. **Resolución de problemas:** Detección de cuellos de botella y mejora continua.

#### [NEW] `src/components/PortfolioTransition.jsx`
- **Objetivo:** Pequeña franja de texto antes de los proyectos.
- **Copy:** "No son solo diseños. Son soluciones a problemas reales."

#### [MODIFY] `src/components/AboutMe.jsx`
- **Cambio:** Resumir y hacer el texto más humano, eliminando clichés ("me apasiona").
- **Enfoque:** Contar brevemente el background, mostrar curiosidad por construir cosas útiles y tener una mentalidad de mejora continua. Mantener la foto.

#### [NEW] `src/components/FinalCTA.jsx`
- **Objetivo:** Bloque de cierre en la Home para invitar al contacto.
- **Copy:** "¿Buscas a alguien que no solo diseñe, sino que sea capaz de construirlo?" o "Si te interesa mi enfoque pragmático para tu próximo proyecto..."
- **CTA:** Botón claro a "HABLEMOS" o "CONTACTAR".

#### [MODIFY] `src/pages/Home.jsx`
- **Cambio:** Reordenar e importar los nuevos componentes para que la estructura sea:
  1. Hero
  2. Positioning
  3. ValueProposition (Qué puedo aportar)
  4. PortfolioTransition
  5. Projects (Sin tocar su código interno)
  6. AboutMe
  7. FinalCTA

### Archivos Eliminados
#### [DELETE] `src/components/Quote.jsx`
#### [DELETE] `src/components/Quote.css`

## Plan de Verificación
- Revisar que la Home cargue correctamente con el servidor de desarrollo `npm run dev`.
- Comprobar que los textos suenan naturales, directos y cumplen con el posicionamiento híbrido.
- Verificar en responsivo (Mobile-first) que los nuevos bloques mantienen el estilo minimalista, moderno y con espacios adecuados.
- Asegurar que la sección de Proyectos se mantiene intacta.
