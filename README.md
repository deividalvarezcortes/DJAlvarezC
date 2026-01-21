# Análisis Geoespacial de la Degradación de Tierras por erosión hídrica en Santiago del Estero y Argentina

Este repositorio contiene algoritmos desarrollados en **Google Earth Engine (GEE)** para el monitoreo y análisis de la dinámica de los recursos naturales en la región del Gran Chaco Argentino, desarrollados en el marco de mi investigación doctoral en la **Universidad Nacional de Mar del Plata** en colaboración con **INTA** y **CONICET**.

## 🎯 Objetivo del Proyecto
Generar herramientas de soporte para la **priorización de áreas para la conservación de suelos y restauración ecológica**, mediante el modelado de:
* Erosión hídrica (periodo 2000-2022)
* Dinámica de cambios en el uso del suelo y deforestación

## 🛠️ Tecnologías Utilizadas
* **Google Earth Engine (JavaScript):** Procesamiento de imágenes satelitales (Landsat 7/8, Sentinel-2)
* **R / RStudio:** Análisis estadístico multivariado y validación de modelos
* **QGIS:** Cartografía final y análisis espacial.

## 📄 Descripción del Script Principal
El archivo `Erosión_hídrica_NE_SDE.js` fue desarrollado de forma colaborativa en el marco del Proyecto Estructural P.E. I040 – Diseño e implementación de un sistema nacional de monitoreo de la degradación a distintas escalas, con meta de neutralidad en la degradación de tierras, liderado por el Dr. Juan José Gaitán, en el cual participé, y sobre el que adapté una versión para evaluar la erosión del suelo en el área de estudio de interés. Entre otras cosas este scprit permite:
1. Definir el área de estudio
2. Acceder a imagenes fusionadas Landsat-MODIS elaboradas previamente
3. Filtrado de nubes y composición de mosaicos anuales.
4. Aplicación de índices biofísicos para la detección de degradación.
5. Cálculo de los cinco factores de la ecuación RUSLE
    - R (intensidad de las lluvias)
    - K (erodabilidad de los suelos)
    - C (nivel de protección de las coberturas vegetales)
    - LS (longitud e inclinación de la pendiente/relieve)
6. Generación de capas ráster para su integración en sistemas de información geográfica.

## 🔬 Contexto Científico
Este trabajo contribuye a la meta de **Neutralidad de la Degradación de Tierras (NDT) de Argentina** y aporta datos clave para la gestión sostenible de paisajes productivos y naturales.

---
**Contacto:**
* **Deivid Joan Alvarez Cortes** - [LinkedIn](https://linkedin.com/in/deivid-joan-alvarez-cortes)
* **Correo:** deivid.a.c.0405@gmail.com
