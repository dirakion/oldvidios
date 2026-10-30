const BASE_SEARCH_URL = "https://archive.org/advancedsearch.php";
let timeoutBusqueda = null;

// Variables globales de control y paginación
let paginaActual = 1;
let queryActual = "";
let esBusquedaTexto = false;
const RESULTADOS_POR_PAGINA = 32; // Límite exacto por bloque

// Consultas configuradas para exprimir la nostalgia de Archive.org
const CATEGORIAS_QUERIES = {
  feature_films: "mediatype:movies AND collection:(feature_films OR classic_tv)",
  silent_films: "mediatype:movies AND (subject:silent OR collection:silent_films)",
  scifi_horror: "mediatype:movies AND (subject:horror OR subject:scifi OR subject:vampire)",
  classic_tv: "mediatype:movies AND collection:classic_tv",
  animation: "mediatype:movies AND (subject:animation OR subject:cartoon OR collection:animationandcartoons)",
  comedy: "mediatype:movies AND (subject:comedy OR subject:slapstick)",
  westerns: "mediatype:movies AND (subject:western OR subject:cowboy)",
  newsreels: "mediatype:movies AND (subject:newsreel OR collection:prelinger)"
};

document.addEventListener("DOMContentLoaded", () => {
  cargarPorCategoria("feature_films", document.querySelector(".category-btn.active"));
});

// Petición automática a la API pública de Internet Archive
async function buscarEnArchive(queryText, esNuevaBusqueda = true, isSearch = false) {
  const grid = document.getElementById("moviesGrid");
  const btnCargarMas = document.getElementById("loadMoreBtn");

  if (esNuevaBusqueda) {
    paginaActual = 1;
    queryActual = queryText;
    esBusquedaTexto = isSearch;
    grid.innerHTML = `<div class="spinner">Buscando joyas clásicas... 🎞️</div>`;
    btnCargarMas.style.display = "none";
  } else {
    btnCargarMas.textContent = "Buscando más clásicos...";
    btnCargarMas.disabled = true;
  }

  const params = new URLSearchParams({
    q: queryActual,
    fl: "identifier,title,year,description,mediatype,publicdate,collection",
    sort: "downloads desc", // Ordenados por popularidad para mostrar los mejores recuerdos primero
    rows: RESULTADOS_POR_PAGINA.toString(),
    page: paginaActual.toString(),
    output: "json"
  });

  try {
    const respuesta = await fetch(`${BASE_SEARCH_URL}?${params.toString()}`);
    const data = await respuesta.json();
    const resultados = data.response.docs || [];
    const totalEncontrados = data.response.numFound || 0;

    renderizarResultados(resultados, esNuevaBusqueda);

    // Control de visualización del botón "Cargar más"
    const cargadosHastaAhora = paginaActual * RESULTADOS_POR_PAGINA;
    if (cargadosHastaAhora < totalEncontrados && resultados.length > 0) {
      btnCargarMas.style.display = "inline-block";
      btnCargarMas.textContent = "➕ Cargar más recuerdos";
      btnCargarMas.disabled = false;
    } else {
      btnCargarMas.style.display = "none";
    }

  } catch (error) {
    console.error("Error al conectar con la API de Archive:", error);
    if (esNuevaBusqueda) {
      grid.innerHTML = `<p class="spinner">No se pudieron cargar los videos en este momento. Inténtalo de nuevo.</p>`;
    } else {
      btnCargarMas.textContent = "Error al cargar. Inténtalo de nuevo.";
      btnCargarMas.disabled = false;
    }
  }
}

// Genera las tarjetas dinámicamente en pantalla
function renderizarResultados(lista, esNuevaBusqueda) {
  const grid = document.getElementById("moviesGrid");

  if (esNuevaBusqueda) {
    grid.innerHTML = "";
  }

  if (lista.length === 0 && esNuevaBusqueda) {
    grid.innerHTML = `<p class="spinner">No se encontraron videos con ese criterio. Prueba otra búsqueda.</p>`;
    return;
  }

  lista.forEach(item => {
    const title = item.title || "Sin título";
    const year = item.year || (item.publicdate ? item.publicdate.substring(0, 4) : "Clásico");
    const id = item.identifier;
    const posterUrl = `https://archive.org/services/img/${id}`;

    const card = document.createElement("div");
    card.className = "movie-card";

    card.onclick = () => reproducir({
      id: id,
      title: title,
      year: year,
      description: item.description || "Sin descripción disponible para este archivo histórico.",
      collection: Array.isArray(item.collection) ? item.collection[0] : (item.collection || "Dominio Público")
    });

    card.innerHTML = `
      <div class="poster-box">
        <span class="badge-year">${year}</span>
        <img src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/15161c/ffffff?text=OldVidios'">
      </div>
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-category">${item.mediatype || "Video"}</div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Función ejecutada por el botón "Cargar más"
function cargarMas() {
  paginaActual++;
  buscarEnArchive(queryActual, false, esBusquedaTexto);
}

// Reproductor limpio superior
function reproducir(item) {
  const wrapper = document.getElementById("playerWrapper");
  const iframe = document.getElementById("mainIframe");
  const title = document.getElementById("playerTitle");
  const meta = document.getElementById("playerMeta");
  const desc = document.getElementById("playerDesc");

  iframe.src = `https://archive.org/embed/${item.id}?autoplay=1`;
  title.textContent = item.title;
  meta.textContent = `${item.year} • Colección: ${item.collection}`;

  // Limpieza de etiquetas HTML que devuelve la API en las descripciones
  const descripcionLimpia = String(item.description).replace(/<[^>]*>?/gm, '');
  desc.textContent = descripcionLimpia.length > 0 ? descripcionLimpia : "Sin descripción disponible.";

  wrapper.style.display = "block";
  wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cerrarReproductor() {
  const wrapper = document.getElementById("playerWrapper");
  const iframe = document.getElementById("mainIframe");
  iframe.src = "";
  wrapper.style.display = "none";
}

// Selector de categorías del menú superior
function cargarPorCategoria(catKey, btn) {
  document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const input = document.getElementById("searchInput");
  if (input) input.value = "";

  document.getElementById("sectionTitle").textContent = `Categoría: ${btn ? btn.textContent.replace(/[\u{1F000}-\u{1F6FF}]/gu, '').trim() : "Clásicos"}`;
  const query = CATEGORIAS_QUERIES[catKey] || CATEGORIAS_QUERIES.feature_films;
  buscarEnArchive(query, true, false);
}

// Buscador inteligente en tiempo real con retraso (debounce)
function manejarBusqueda(event) {
  clearTimeout(timeoutBusqueda);
  const texto = event.target.value.trim();

  if (texto.length === 0) {
    const btnActivo = document.querySelector(".category-btn.active");
    cargarPorCategoria("feature_films", btnActivo);
    return;
  }

  if (texto.length < 3) return;

  timeoutBusqueda = setTimeout(() => {
    document.getElementById("sectionTitle").textContent = `Resultados para: "${texto}"`;
    const query = `mediatype:movies AND (title:(${texto}) OR description:(${texto}))`;
    buscarEnArchive(query, true, true);
  }, 500);
}