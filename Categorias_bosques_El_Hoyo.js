/**
 * Título: Análisis de coberturas para la estratificación forestal en El Hoyo Norte - Plan Integral Comunitario REDD+ FAO
 * Autor: Deivid Alvarez
 * Institución: INTA - FAO
 * Descripción: Script para hacer una clasificación no supervisada de coberturas forestales que permita definir una grilla de muestreo para inventario forestal conforme a requerimento FAO 
 * IMPORTANTE: En caso de requerir usar el código solicitar acceso a los assets previamente por correo.
 */
// Previamente se carga el área de estudio en mis Assets. 
// Corresponde a una cuenca obtenida de un DEM (30 m de res. esp) descargado del IGN

// Definimos la variable del área mediante el ID del archivo cargado en el Asset
var El_Hoyo_Norte = ee.FeatureCollection('users/deividac0405/EL_HOYO_NORTE_AREA');
print(El_Hoyo_Norte,'Area El Hoyo Norte'); 

Map.addLayer(El_Hoyo_Norte,{},"PIC El Hoyo Norte"); // Mapeamos y butizamos la capa
Map.centerObject(El_Hoyo_Norte,8); // Configuramos el mapeo para que nos centre por defecto el AOI

// Importamos la colección de Mapbiomas - Chaco Colección 4 (fuente: https://chaco.mapbiomas.org/tools/)
var Mapbiomas_EHN = ee.Image('projects/mapbiomas-chaco/public/collection4/mapbiomas_chaco_collection4_integration_v1').clip(El_Hoyo_Norte)
print(Mapbiomas_EHN,'Map Biomas El Hoyo Norte'); // Pedimos que nos muestre la coleccion para ver las bandas con los años disponibles
Map.addLayer(Mapbiomas_EHN,{},"Map Biomas El Hoyo Norte");

/*
// Extraemos la información clasificada de un momento del tiempo de interés (2022)
var mb2022 = Mapbiomas_EHN.select("classification_2022");

// Enmascaramos todos los píxeles que hayan tenido un cambio de clase entre 2000 y 2020
//var mb2000_sinCambio = mb2000.updateMask(mb2000.eq(mb2020));

// Definimos la forma de visualización (paleta de colores) en el mapa
var visMB_EHN = {
  opacity:1,
  min:1,
  max:36,
  palette:["#129912","#1f4423","#006400","#00ff00","#687537","#76a5af","#29eee4","#77a605","#935132",
  "#bbfcac","#45c2a5","#b8af4f","#f1c232","#ffffb2","#ffd966","#f6b26b","#f99f40","#e974ed","#d5a6bd","#c27ba0","#fff3bf",
  "#ea9999","#dd7e6b","#aa0000","#ff99ff","#0000ff","#d5d5e5","#dd497f","#b2ae7c","#af2a2a","#8a2be2","#968c46","#0000ff",
  "#4fd3ff","#645617","#fae1f9"]
};
Map.addLayer(mb2022, visMB_EHN, "Clases de Cobertutras El Hoyo Norte 2022"); 

// Generamos muestras aleatorias (203) estratificadas por clase de uso y cobertura
var muestras_MB_EHN = mb2022.stratifiedSample({
  numPoints: 30,
  region: El_Hoyo_Norte,
  scale: 30,
  geometries: true 
}) 
print(muestras_MB_EHN, "Muestras Estratificadas");
Map.addLayer(muestras_MB_EHN, {size:1}, "Muestras Estratificadas");

*/


////////  Generar un mosaico con el NDVI mediano para el año 2022  ////////////

// Cargamos las imagenes satelitales LANDSAT

var L8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2") // Llamamos a la colección de LANDSAT
.filterBounds(El_Hoyo_Norte) //  Filtramos en función del área
.filterDate('2022-01-01', '2024-01-01') //  Filtramos por el periodo de tiempo de interés 

// Aplicamos la función para filtrar nubes. Filtra pixeles con nubes, sombras u otros artefactos
function maskL8sr(image) {
  var dilatedCloud = (1 << 1) 
  var cloud = (1 << 3)
  var cloudShadow = (1 << 4)
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(dilatedCloud).eq(0).and(
      qa.bitwiseAnd(cloud).eq(0)).and(qa.bitwiseAnd(cloudShadow).eq(0))
  return image.updateMask(mask);
}
// Aplicamos la función para Filtrar la ImageCollection por banda de Calidad. 
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}
L8 = L8.map(maskL8sr).map(applyScaleFactors)
print(L8,'Imagen Landsat 8 EHN'); // Pedimos que nos muestre la coleccion para ver las bandas con los años disponibles
Map.addLayer(L8,{},"Imagen Landsat 8 EHN");

var entrenamiento = L8.aggregate_sample_sd({
  numPoints: 30,
  region: El_Hoyo_Norte,
  scale: 30,
  geometries: true 
  });

var clases = ee.Clusterer.wekaKMeans(5).train(entrenamiento);

var resultado = L8.cluster(clases)

Map.addLayer(resultado.randomVisualizer(), {},'CLASES')
/*
// Calculamos el NDVI
function calcularNDVI(image){
  var ndvi = image.normalizedDifference(["SR_B5", "SR_B4"]).rename("NDVI")
  return image.addBands(ndvi) // Pedimos que nos devuelva la ImageCollection añadiendo una nueva banda que contenga la variable NDVI
}


// Calculamos la mediana del NDVI para el set de imagenes ya filtradas para el periodo de tiempo elegido
var NDVImediano = L8.select("NDVI").median() // Seleccionamos la banda NDVI creada en la línea 71, y con ella calculamos la mediana

//Definimos las opciones de mapeo, la paleta de colores y el título que llevará la capa
Map.addLayer(NDVImediano, {
  min:0, max:1, 
  palette:["blue", "brown", "orange", "yellow", "green", "darkgreen"]
}, "NDVI mediano (2000-2020)")

// Ahora extraemos el NDVImediano calculado con cada uno de los 203 puntos que son las muestras aleatorias
var medianNDVIpormuestra = NDVImediano.reduceRegions({
  collection: muestrasMB2000,
  scale:30,
  reducer: ee.Reducer.first()
})
print(medianNDVIpormuestra, 'Mediana del NDVI por punto')
// Pedimos que nos muestre el mapa de la cuenca al final para poder visualizarlo sobre la imagen de NDVI Mediana generada

// Exportamos en formato tabla CSV el archivo que cruzó los puntos con la mediana del NDVI para el periodo y área de interés
// Cada punto contendrá en sus propiedades el valor de NDVI y la categoría de cobertura Map Biomas que no sufrió cambios en los últimos 20 años

Export.table.toDrive({
  collection: NDVIpormuestra,
  description: 'NDVImed-2000_2020-muestrasMapBiomas',
  fileFormat: 'CSV'
});
*/
