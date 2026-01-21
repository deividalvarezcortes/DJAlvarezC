/**
 * Título: Cálculo del factor C de la RUSLE en el NE de Santiago del Estero (Ejemplo para el periodo 2000-2001)
 * Autor: Maria Paula Barral y Deivid Alvarez
 * Institución: INTA EEA Quimilí y Unidad Integrada Balcarce
 * Descripción: Script para obtener a partir de una fusión de imágenes sateliatles Landat y Modis clasificación de coberturas a las cuales aplicar índices de protección ante la erosión del suelo
 * IMPORTANTE: En caso de requerir usar el código solicitar acceso a los assets previamente por correo.
 */

//Factor C realizado a partir de la fusión LandSat Modis
// 1 junio 2000 al 31 mayo del 2001

Map.addLayer(area)
var area = ee.FeatureCollection("users/deividac0405/AREA_DE_INTERES_RUSLE")
Map.addLayer(area)
Map.centerObject(area)

var fusion2000_2001 = ee.ImageCollection ('projects/ee-ximesiri1/assets/Modis-Landsat_2000-2001');


print(fusion2000_2001, "fusion2000_2001") 
//var fusion2010_2011 = ee.ImageCollection ('users/ucafiona/Modis-Landsat_2010-2011')

//var fusion2020_2021= ee.ImageCollection('projects/ee-ximesiri22/assets/Modis-Landsat_2020-2021')


// Se realiza un mosaico 
var fusion = fusion2000_2001.mosaic().clip(area)   // Cambiar en la variable fusion las colleciones
print(fusion, "fusion")

//Seleccion de bandas para calulo de NDVI 
var fusion_b1 = fusion.select(["Fit_B1_*.*"])
var fusion_b3 = fusion.select(["Fit_B3_*.*"])
var fusion_b4 = fusion.select(["Fit_B4_*.*"])
var fusion_b7 = fusion.select(["Fit_B7_*.*"])

print(fusion_b1, "fusion_b1")
print(fusion_b3, "fusion_b3")
print(fusion_b4, "fusion_b4")
print(fusion_b7, "fusion_b7")

//Calculo de NDVI
var NDVI =    fusion.normalizedDifference(["Fit_B4","Fit_B3"]).rename("NDVI")
var NDVI_1 =  fusion.normalizedDifference(["Fit_B4_1","Fit_B3_1"]).rename("NDVI")
var NDVI_2 =  fusion.normalizedDifference(["Fit_B4_2","Fit_B3_2"]).rename("NDVI")
var NDVI_3 =  fusion.normalizedDifference(["Fit_B4_3","Fit_B3_3"]).rename("NDVI")
var NDVI_4 =  fusion.normalizedDifference(["Fit_B4_4","Fit_B3_4"]).rename("NDVI")
var NDVI_5 =  fusion.normalizedDifference(["Fit_B4_5","Fit_B3_5"]).rename("NDVI")
var NDVI_6 =  fusion.normalizedDifference(["Fit_B4_6","Fit_B3_6"]).rename("NDVI")
var NDVI_7 =  fusion.normalizedDifference(["Fit_B4_7","Fit_B3_7"]).rename("NDVI")
var NDVI_8 =  fusion.normalizedDifference(["Fit_B4_8","Fit_B3_8"]).rename("NDVI")
var NDVI_9 =  fusion.normalizedDifference(["Fit_B4_9","Fit_B3_9"]).rename("NDVI")
var NDVI_10 = fusion.normalizedDifference(["Fit_B4_10","Fit_B3_10"]).rename("NDVI")
var NDVI_11 = fusion.normalizedDifference(["Fit_B4_11","Fit_B3_11"]).rename("NDVI")
var NDVI_12 = fusion.normalizedDifference(["Fit_B4_12","Fit_B3_12"]).rename("NDVI")
var NDVI_13 = fusion.normalizedDifference(["Fit_B4_13","Fit_B3_13"]).rename("NDVI")
var NDVI_14 = fusion.normalizedDifference(["Fit_B4_14","Fit_B3_14"]).rename("NDVI")
var NDVI_15 = fusion.normalizedDifference(["Fit_B4_15","Fit_B3_15"]).rename("NDVI")
var NDVI_16 = fusion.normalizedDifference(["Fit_B4_16","Fit_B3_16"]).rename("NDVI")
var NDVI_17 = fusion.normalizedDifference(["Fit_B4_17","Fit_B3_17"]).rename("NDVI")
var NDVI_18 = fusion.normalizedDifference(["Fit_B4_18","Fit_B3_18"]).rename("NDVI")
var NDVI_19 = fusion.normalizedDifference(["Fit_B4_19","Fit_B3_19"]).rename("NDVI")
var NDVI_20 = fusion.normalizedDifference(["Fit_B4_20","Fit_B3_20"]).rename("NDVI")
var NDVI_21 = fusion.normalizedDifference(["Fit_B4_21","Fit_B3_21"]).rename("NDVI")
var NDVI_22 = fusion.normalizedDifference(["Fit_B4_22","Fit_B3_22"]).rename("NDVI")
var NDVI_23 = fusion.normalizedDifference(["Fit_B4_23","Fit_B3_23"]).rename("NDVI")
var NDVI_24 = fusion.normalizedDifference(["Fit_B4_24","Fit_B3_24"]).rename("NDVI")
var NDVI_25 = fusion.normalizedDifference(["Fit_B4_25","Fit_B3_25"]).rename("NDVI")
var NDVI_26 = fusion.normalizedDifference(["Fit_B4_26","Fit_B3_26"]).rename("NDVI")
var NDVI_27 = fusion.normalizedDifference(["Fit_B4_27","Fit_B3_27"]).rename("NDVI")
var NDVI_28 = fusion.normalizedDifference(["Fit_B4_28","Fit_B3_28"]).rename("NDVI")

var NDVI_fusion = NDVI.addBands(NDVI_1)
.addBands(NDVI_2)
.addBands(NDVI_3)
.addBands(NDVI_4)
.addBands(NDVI_5)
.addBands(NDVI_6)
.addBands(NDVI_7)
.addBands(NDVI_8)
.addBands(NDVI_9)
.addBands(NDVI_10)
.addBands(NDVI_11)
.addBands(NDVI_12)
.addBands(NDVI_13)
.addBands(NDVI_14)
.addBands(NDVI_15)
.addBands(NDVI_16)
.addBands(NDVI_17)
.addBands(NDVI_18)
.addBands(NDVI_19)
.addBands(NDVI_20)
.addBands(NDVI_21)
.addBands(NDVI_22)
.addBands(NDVI_23)
.addBands(NDVI_24)
.addBands(NDVI_25)
.addBands(NDVI_26)
.addBands(NDVI_27)
.addBands(NDVI_28)

print(NDVI_fusion, "NDVI_fusion")

var NDVI_mean = NDVI_fusion.reduce(ee.Reducer.mean()); 
print(NDVI_mean, "NDVI_mean")

//Map.addLayer(NDVI_mean)


//Van der Knijff et al. (1999)
// C=exp (-alpha * (NDVI/beta - NDVI)
//en el paper usan alpha 2 y beta 1

//En invierno en vegetación natural (bosques y pasturas) la ecuación da valores poco confiables porque 
//el NDVI no es bueno para predecir la cobertura, principalmente porque confunde vegetacion muerta o 
//no verde con suelo desnudo. En erosión importa si el suelo esta cubierto, no si está verde o no. 
//Da valores muy altos por eso en estos casos se asume un valor maximo de 0.01  para bosques 
//y 0.05 para pastizales --> Juan Gaitán pone 0.001.

var factorC = NDVI_mean.expression(
    'exp(-2 * (NDVI / (1-NDVI )))', {
      'NDVI': NDVI_mean.select('mean'),
    });   
    
var factorC_anual = factorC
                     .where(factorC.gt(1), 0.001) // valor de 0.001 --FAO

//Map.addLayer(factorC_anual)


// var factorC = NDVI_mean.expression(
//     'exp(-3.5 * (NIR / (1-NIR )))', {
//       'NIR': NDVI_mean.select('constant_mean'),
//     });   
    
// var factorC_anual = factorC
//                     .where(factorC.gt(1), 0.001) // valor de 0.001 --FAO

// Export.image.toDrive({
//   image: factorC_anual,
//   description: "factorC_00_01",
//   region: area, 
//   scale:50 ,
//   fileFormat: 'GeoTIFF',
//   maxPixels: 1e13
// });

// Export.image.toDrive({
//   image: factorC,
//   description: "factorC_00_01",
//   region: area, 
//   scale:50 ,
//   fileFormat: 'GeoTIFF',
//   maxPixels: 1e13
// });

