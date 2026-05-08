document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("main section");
  const links    = document.querySelectorAll(".navMain a");

  // Mostrar sección inicial
  const initialSection = document.getElementById("estrategia");
  if (initialSection) initialSection.classList.add("seccion-activa");

  // Marcar link activo inicial
  const initialLink = document.querySelector('.navMain a[href="#estrategia"]');
  if (initialLink) initialLink.classList.add("activo");

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      // Ocultar todas las secciones
      sections.forEach(function (section) {
        section.classList.remove("seccion-activa");
      });

      // Desmarcar todos los links
      links.forEach(function (l) {
        l.classList.remove("activo");
      });

      // Mostrar la sección target con animación
      const targetId      = link.getAttribute("href").substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("seccion-activa");
        // Re-trigger animation
        targetSection.style.animation = "none";
        targetSection.offsetHeight; // reflow
        targetSection.style.animation = "";
      }

      // Marcar link activo
      link.classList.add("activo");

      // Scroll suave al inicio del contenido
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
});
