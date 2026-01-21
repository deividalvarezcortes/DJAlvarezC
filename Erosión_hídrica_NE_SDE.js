/**
 * Título: Análisis de erosión hídrica (2000-2020) en el NE de Santiago del Estero con modelo RUSLE
 * Autor: Juan José Gaitán, adaptado por Deivid Alvarez
 * Institución: INTA / CONICET
 * Descripción: Script para el monitoreo de erosión hídrica del suelo mediante GEE a nivel nacional (comentado) daptado al NE de Satiago del Estero
 * IMPORTANTE: En caso de requeris usar el código solicitar acceso a los assets previamente por correo.
 */

//**********DEFINICIÓN DEL ÁREA DE ESTUDIO****************************************************************


//var region = ee.FeatureCollection('users/volante/SPIPA/Prov_sinAntartida')

var region = ee.FeatureCollection('users/deividac0405/AREA_DE_INTERES_RUSLE').union().select('union_result');
Map.addLayer(region,{},"Cuenca_NE_SDE");
Map.centerObject(region,8);
print(region, 'Cuenca_NE_SDE');

//var regionA=region.geometry().buffer(100);//-0.00083);
//print(regionA,'Ampliada con buffer');


//**********FACTOR K****************************************************************

//var factor_k = ee.Image('users/gaitanjuanjose/Mapa_K_sisinta')

/*
var factor_k = ee.Image('users/deividac0405/RASTER_FACTOR_K');
Map.addLayer(factor_k,{},"FACTOR K");
Map.centerObject(factor_k,8);
print(factor_k, 'Factor_K');
*/
//******************Factor LS*********************************************************

var DEM = ee.Image("MERIT/Hydro/v1_0_1").select('elv').clip(region);
print(DEM,'DEM');
//Map.addLayer(DEM,{"opacity":1,"bands":["elv"],"min":141,"max":198,"gamma":1.5},"DEM");
Map.addLayer(DEM,{"opacity":1,"bands":["elv"],"min":100,"max":200,"gamma":1.7},"DEM");

//Generación de los mapas de pendientes y orientación de laderas
var slope_deg =  ee.Terrain.slope (DEM);

var slope_aspect =  ee.Terrain.aspect (DEM);
//print(slope_aspect,'Aspecto de pendiente');
var slope_rad = slope_deg.multiply(3.14159).divide(180)// Conversión a radianes
//print(slope_rad,'Pendiente');
Map.addLayer(ee.Image(slope_aspect),{"min":0,"max":360},'Slope Aspect');
Map.addLayer(ee.Image(slope_rad),{"min":0,"max":0.01,"gamma":2.75},'Slope Rad');


//exports.factorLS = function(slope_deg, slope_rad, slope_aspect){
    // Import upstream drainage area (referred to as contributing or accumulated area in soil erosion studies) from:
    // Yamazaki D., D. Ikeshima, J. Sosa, P.D. Bates, G.H. Allen, T.M. Pavelsky.
    // MERITHydro:A high-resolution global hydrography map based on latest topography datasets Water Resources Research,
    // vol.55, pp.5053-5073, 2020
    var contrib_area = ee.Image("MERIT/Hydro/v1_0_1").select('upa').clip(region)
                       .multiply(1000000) // convert to m²
                       .reproject({crs:'EPSG:4326', scale: 30}) // Upsample to 30m to match resolution of AW3D30 DEM.
                       .divide(9) // Divide by 9 to redistribute contributing area from a 90m pixel to a 30m pixel.
                       .clamp(0,4000); // Ignore contributing areas larger than 4000m², typical for soil erosion studies
                                       // For instance: Zhang, Hongming, et al. An improved method for calculating
                                       // slope length (λ) and the LS Parameters of the Revised Universal Soil Loss
                                       // Equation for large watersheds. Geoderma 308 (2020):36-45

    // Calculate the slope direction, either 1 for 4-neighbours, or sqrt(2) for diagonal neighbours.
    var slope_direction = slope_aspect.gt(337.5).and(slope_aspect.lte(360))
                                                .or(slope_aspect.gte(0).and(slope_aspect.lte(22.5))).multiply(1)
                          .add(slope_aspect.gt(22.5).and(slope_aspect.lte(77.5)).multiply(ee.Image(2).sqrt()))
                          .add(slope_aspect.gt(77.5).and(slope_aspect.lte(112.5)).multiply(1))
                          .add(slope_aspect.gt(112.5).and(slope_aspect.lte(157.5)).multiply(ee.Image(2).sqrt()))
                          .add(slope_aspect.gt(157.5).and(slope_aspect.lte(202.5)).multiply(1))
                          .add(slope_aspect.gt(202.5).and(slope_aspect.lte(247.5)).multiply(ee.Image(2).sqrt()))
                          .add(slope_aspect.gt(247.5).and(slope_aspect.lte(292.5)).multiply(1))
                          .add(slope_aspect.gt(292.5).and(slope_aspect.lte(337.5)).multiply(ee.Image(2).sqrt()));

    // Rill to interrill erosion factor beta of the Slope length factor L
    var beta = slope_rad.sin()
               .divide(0.0896)
               .divide(ee.Image(3).multiply(slope_rad.sin().pow(0.8).add(0.56)).abs());
    // Slope exponential factor m related to beta
    var m = beta.divide(beta.add(1));

    // Calculation of the slope length (L) and slope steepness (S) factor following: Desmet, P.; Govers, G.
    // A GIS procedure for automatically calculating the ULSE LS factor on topographically complex landscape units.
    //J. Soil Water Conserv. 1996, 51, 427–433.
    var L = ee.Image(2).multiply(contrib_area) // numerator
            //.add(ee.Image(900)) // The contributing area from MERIT Hydro is already calculated at the outlet,
            // so no need to add the grid cell area
            .divide(ee.Image(2).multiply(30).multiply(slope_direction).multiply(22.13)) // denominator
            .pow(m)
            .multiply(m.add(1));

    // Computing the Slope Steepness factor S from: Renard, K., Foster, G., Weesies, G., McCool, D. & Yoder, D.
    // Predicting Soil Erosion by Water: a Guide to Conservation Planning with
    // the Revised Universal Soil Loss Equation (RUSLE) (USDA-ARS, Washington, 1997).
    var S = ee.Algorithms.If(slope_rad.tan().lt(0.09), // Convert slope in radian to steepness (in %)
                             slope_rad.sin().multiply(10.8).add(0.03), // Mild slope condition < 9 %
                             slope_rad.sin().multiply(16.8).subtract(0.05)); // Steep slope condition >= 9%

var LS = L.multiply(S);

Map.addLayer(LS,{},"LS", true); 
print(LS, 'Pendiente');


// Aquí me muestra en el visualizador el mapa de LS

/*
//Toma una colección de imagenes fusionadas Landsat-MODIS elaborada previamente y calcula el NDVI. Resolución espacil = 60 metros


var fusion2010 = ee.ImageCollection ('projects/ee-ximesiri1/assets/Modis-Landsat_2000-2001')


var fusion2010_ = fusion2010.mosaic()

var fusion2010_b1 = fusion2010_.select(["Fit_B1_*.*"])
var fusion2010_b3 = fusion2010_.select(["Fit_B3_*.*"])
var fusion2010_b4 = fusion2010_.select(["Fit_B4_*.*"])
var fusion2010_b7 = fusion2010_.select(["Fit_B7_*.*"])

//===========================================================
//                      2010 system:time_start:   1273363200000
//----------------------------------------------------------
var NDVI =    fusion2010_.normalizedDifference(["Fit_B4","Fit_B3"]).rename("NDVI").set({"system:time_start":      959731000000 })
var NDVI_1 =  fusion2010_.normalizedDifference(["Fit_B4_1","Fit_B3_1"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000})
var NDVI_2 =  fusion2010_.normalizedDifference(["Fit_B4_2","Fit_B3_2"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*2})
var NDVI_3 =  fusion2010_.normalizedDifference(["Fit_B4_3","Fit_B3_3"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*3})
var NDVI_4 =  fusion2010_.normalizedDifference(["Fit_B4_4","Fit_B3_4"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*4})
var NDVI_5 =  fusion2010_.normalizedDifference(["Fit_B4_5","Fit_B3_5"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*5})
var NDVI_6 =  fusion2010_.normalizedDifference(["Fit_B4_6","Fit_B3_6"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*6})
var NDVI_7 =  fusion2010_.normalizedDifference(["Fit_B4_7","Fit_B3_7"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*7})
var NDVI_8 =  fusion2010_.normalizedDifference(["Fit_B4_8","Fit_B3_8"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*8})
var NDVI_9 =  fusion2010_.normalizedDifference(["Fit_B4_9","Fit_B3_9"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*9})
var NDVI_10 = fusion2010_.normalizedDifference(["Fit_B4_10","Fit_B3_10"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*10})
var NDVI_11 = fusion2010_.normalizedDifference(["Fit_B4_11","Fit_B3_11"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*11})
var NDVI_12 = fusion2010_.normalizedDifference(["Fit_B4_12","Fit_B3_12"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*12})
var NDVI_13 = fusion2010_.normalizedDifference(["Fit_B4_13","Fit_B3_13"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*13})
var NDVI_14 = fusion2010_.normalizedDifference(["Fit_B4_14","Fit_B3_14"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*14})
var NDVI_15 = fusion2010_.normalizedDifference(["Fit_B4_15","Fit_B3_15"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*15})
var NDVI_16 = fusion2010_.normalizedDifference(["Fit_B4_16","Fit_B3_16"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*16})
var NDVI_17 = fusion2010_.normalizedDifference(["Fit_B4_17","Fit_B3_17"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*17})
var NDVI_18 = fusion2010_.normalizedDifference(["Fit_B4_18","Fit_B3_18"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*18})
var NDVI_19 = fusion2010_.normalizedDifference(["Fit_B4_19","Fit_B3_19"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*19})
var NDVI_20 = fusion2010_.normalizedDifference(["Fit_B4_20","Fit_B3_20"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*20})
var NDVI_21 = fusion2010_.normalizedDifference(["Fit_B4_21","Fit_B3_21"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*21})
var NDVI_22 = fusion2010_.normalizedDifference(["Fit_B4_22","Fit_B3_22"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*22})
var NDVI_23 = fusion2010_.normalizedDifference(["Fit_B4_23","Fit_B3_23"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*23})
var NDVI_24 = fusion2010_.normalizedDifference(["Fit_B4_24","Fit_B3_24"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*24})
var NDVI_25 = fusion2010_.normalizedDifference(["Fit_B4_25","Fit_B3_25"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*25})
var NDVI_26 = fusion2010_.normalizedDifference(["Fit_B4_26","Fit_B3_26"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*26})
var NDVI_27 = fusion2010_.normalizedDifference(["Fit_B4_27","Fit_B3_27"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*27})
var NDVI_28 = fusion2010_.normalizedDifference(["Fit_B4_28","Fit_B3_28"]).rename("NDVI").set({"system:time_start": 959731000000+1382400000*28})

var NDVI2000_2000 = NDVI.addBands(NDVI_1)
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

///Aplica el filtro Savitzky-Golay.a fin de suavizar la serie temporal y reducir con ello el ruido atmosférico y los residuos de la corrección radiométrica.


var NDVI_3sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI'),
      'NIR2': NDVI2000_2000.select('NDVI_1'),
      'NIR3': NDVI2000_2000.select('NDVI_2'),
      'NIR4': NDVI2000_2000.select('NDVI_3'),
      'NIR5': NDVI2000_2000.select('NDVI_4'),
      'NIR6': NDVI2000_2000.select('NDVI_5'),
      'NIR7': NDVI2000_2000.select('NDVI_6'),
    }); 
    
var NDVI_4sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_1'),
      'NIR2': NDVI2000_2000.select('NDVI_2'),
      'NIR3': NDVI2000_2000.select('NDVI_3'),
      'NIR4': NDVI2000_2000.select('NDVI_4'),
      'NIR5': NDVI2000_2000.select('NDVI_5'),
      'NIR6': NDVI2000_2000.select('NDVI_6'),
      'NIR7': NDVI2000_2000.select('NDVI_7'),
    }); 
    
 var NDVI_5sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_2'),
      'NIR2': NDVI2000_2000.select('NDVI_3'),
      'NIR3': NDVI2000_2000.select('NDVI_4'),
      'NIR4': NDVI2000_2000.select('NDVI_5'),
      'NIR5': NDVI2000_2000.select('NDVI_6'),
      'NIR6': NDVI2000_2000.select('NDVI_7'),
      'NIR7': NDVI2000_2000.select('NDVI_8'),
    });    
    
  var NDVI_6sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_3'),
      'NIR2': NDVI2000_2000.select('NDVI_4'),
      'NIR3': NDVI2000_2000.select('NDVI_5'),
      'NIR4': NDVI2000_2000.select('NDVI_6'),
      'NIR5': NDVI2000_2000.select('NDVI_7'),
      'NIR6': NDVI2000_2000.select('NDVI_8'),
      'NIR7': NDVI2000_2000.select('NDVI_9'),
    });    
 
  var NDVI_7sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_4'),
      'NIR2': NDVI2000_2000.select('NDVI_5'),
      'NIR3': NDVI2000_2000.select('NDVI_6'),
      'NIR4': NDVI2000_2000.select('NDVI_7'),
      'NIR5': NDVI2000_2000.select('NDVI_8'),
      'NIR6': NDVI2000_2000.select('NDVI_9'),
      'NIR7': NDVI2000_2000.select('NDVI_10'),
    });  
 
  var NDVI_8sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_5'),
      'NIR2': NDVI2000_2000.select('NDVI_6'),
      'NIR3': NDVI2000_2000.select('NDVI_7'),
      'NIR4': NDVI2000_2000.select('NDVI_8'),
      'NIR5': NDVI2000_2000.select('NDVI_9'),
      'NIR6': NDVI2000_2000.select('NDVI_10'),
      'NIR7': NDVI2000_2000.select('NDVI_11'),
    });  
 
   var NDVI_9sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_6'),
      'NIR2': NDVI2000_2000.select('NDVI_7'),
      'NIR3': NDVI2000_2000.select('NDVI_8'),
      'NIR4': NDVI2000_2000.select('NDVI_9'),
      'NIR5': NDVI2000_2000.select('NDVI_10'),
      'NIR6': NDVI2000_2000.select('NDVI_11'),
      'NIR7': NDVI2000_2000.select('NDVI_12'),
    });  
 
    var NDVI_10sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_7'),
      'NIR2': NDVI2000_2000.select('NDVI_8'),
      'NIR3': NDVI2000_2000.select('NDVI_9'),
      'NIR4': NDVI2000_2000.select('NDVI_10'),
      'NIR5': NDVI2000_2000.select('NDVI_11'),
      'NIR6': NDVI2000_2000.select('NDVI_12'),
      'NIR7': NDVI2000_2000.select('NDVI_13'),
    });  
 
     var NDVI_11sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_8'),
      'NIR2': NDVI2000_2000.select('NDVI_9'),
      'NIR3': NDVI2000_2000.select('NDVI_10'),
      'NIR4': NDVI2000_2000.select('NDVI_11'),
      'NIR5': NDVI2000_2000.select('NDVI_12'),
      'NIR6': NDVI2000_2000.select('NDVI_13'),
      'NIR7': NDVI2000_2000.select('NDVI_14'),
    });  
 
   var NDVI_12sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_9'),
      'NIR2': NDVI2000_2000.select('NDVI_10'),
      'NIR3': NDVI2000_2000.select('NDVI_11'),
      'NIR4': NDVI2000_2000.select('NDVI_12'),
      'NIR5': NDVI2000_2000.select('NDVI_13'),
      'NIR6': NDVI2000_2000.select('NDVI_14'),
      'NIR7': NDVI2000_2000.select('NDVI_15'),
    }); 
 
   var NDVI_13sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_10'),
      'NIR2': NDVI2000_2000.select('NDVI_11'),
      'NIR3': NDVI2000_2000.select('NDVI_12'),
      'NIR4': NDVI2000_2000.select('NDVI_13'),
      'NIR5': NDVI2000_2000.select('NDVI_14'),
      'NIR6': NDVI2000_2000.select('NDVI_15'),
      'NIR7': NDVI2000_2000.select('NDVI_16'),
    }); 
  
   var NDVI_14sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_11'),
      'NIR2': NDVI2000_2000.select('NDVI_12'),
      'NIR3': NDVI2000_2000.select('NDVI_13'),
      'NIR4': NDVI2000_2000.select('NDVI_14'),
      'NIR5': NDVI2000_2000.select('NDVI_15'),
      'NIR6': NDVI2000_2000.select('NDVI_16'),
      'NIR7': NDVI2000_2000.select('NDVI_17'),
    }); 
 
    var NDVI_15sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_12'),
      'NIR2': NDVI2000_2000.select('NDVI_13'),
      'NIR3': NDVI2000_2000.select('NDVI_14'),
      'NIR4': NDVI2000_2000.select('NDVI_15'),
      'NIR5': NDVI2000_2000.select('NDVI_16'),
      'NIR6': NDVI2000_2000.select('NDVI_17'),
      'NIR7': NDVI2000_2000.select('NDVI_18'),
    }); 
 
    var NDVI_16sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_13'),
      'NIR2': NDVI2000_2000.select('NDVI_14'),
      'NIR3': NDVI2000_2000.select('NDVI_15'),
      'NIR4': NDVI2000_2000.select('NDVI_16'),
      'NIR5': NDVI2000_2000.select('NDVI_17'),
      'NIR6': NDVI2000_2000.select('NDVI_18'),
      'NIR7': NDVI2000_2000.select('NDVI_19'),
    }); 
 
    var NDVI_17sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_14'),
      'NIR2': NDVI2000_2000.select('NDVI_15'),
      'NIR3': NDVI2000_2000.select('NDVI_16'),
      'NIR4': NDVI2000_2000.select('NDVI_17'),
      'NIR5': NDVI2000_2000.select('NDVI_18'),
      'NIR6': NDVI2000_2000.select('NDVI_19'),
      'NIR7': NDVI2000_2000.select('NDVI_20'),
    }); 
 
    var NDVI_18sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_15'),
      'NIR2': NDVI2000_2000.select('NDVI_16'),
      'NIR3': NDVI2000_2000.select('NDVI_17'),
      'NIR4': NDVI2000_2000.select('NDVI_18'),
      'NIR5': NDVI2000_2000.select('NDVI_19'),
      'NIR6': NDVI2000_2000.select('NDVI_20'),
      'NIR7': NDVI2000_2000.select('NDVI_21'),
    }); 
 
      var NDVI_19sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_16'),
      'NIR2': NDVI2000_2000.select('NDVI_17'),
      'NIR3': NDVI2000_2000.select('NDVI_18'),
      'NIR4': NDVI2000_2000.select('NDVI_19'),
      'NIR5': NDVI2000_2000.select('NDVI_20'),
      'NIR6': NDVI2000_2000.select('NDVI_21'),
      'NIR7': NDVI2000_2000.select('NDVI_22'),
    });   
    
         var NDVI_20sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_17'),
      'NIR2': NDVI2000_2000.select('NDVI_18'),
      'NIR3': NDVI2000_2000.select('NDVI_19'),
      'NIR4': NDVI2000_2000.select('NDVI_20'),
      'NIR5': NDVI2000_2000.select('NDVI_21'),
      'NIR6': NDVI2000_2000.select('NDVI_22'),
      'NIR7': NDVI2000_2000.select('NDVI_23'),
    });   
    
         var NDVI_21sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_18'),
      'NIR2': NDVI2000_2000.select('NDVI_19'),
      'NIR3': NDVI2000_2000.select('NDVI_20'),
      'NIR4': NDVI2000_2000.select('NDVI_21'),
      'NIR5': NDVI2000_2000.select('NDVI_22'),
      'NIR6': NDVI2000_2000.select('NDVI_23'),
      'NIR7': NDVI2000_2000.select('NDVI_24'),
      
    });     
           var NDVI_22sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_19'),
      'NIR2': NDVI2000_2000.select('NDVI_20'),
      'NIR3': NDVI2000_2000.select('NDVI_21'),
      'NIR4': NDVI2000_2000.select('NDVI_22'),
      'NIR5': NDVI2000_2000.select('NDVI_23'),
      'NIR6': NDVI2000_2000.select('NDVI_24'),
      'NIR7': NDVI2000_2000.select('NDVI_25'),
    });      
    
              var NDVI_23sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_20'),
      'NIR2': NDVI2000_2000.select('NDVI_21'),
      'NIR3': NDVI2000_2000.select('NDVI_22'),
      'NIR4': NDVI2000_2000.select('NDVI_23'),
      'NIR5': NDVI2000_2000.select('NDVI_24'),
      'NIR6': NDVI2000_2000.select('NDVI_25'),
      'NIR7': NDVI2000_2000.select('NDVI_26'),
    });     
    
               var NDVI_24sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_21'),
      'NIR2': NDVI2000_2000.select('NDVI_22'),
      'NIR3': NDVI2000_2000.select('NDVI_23'),
      'NIR4': NDVI2000_2000.select('NDVI_24'),
      'NIR5': NDVI2000_2000.select('NDVI_25'),
      'NIR6': NDVI2000_2000.select('NDVI_26'),
      'NIR7': NDVI2000_2000.select('NDVI_27'),
    });   
    
                var NDVI_25sg = NDVI2000_2000.expression(
    '(-2 * NIR1 + 3 * NIR2 + 6 * NIR3 + 7 * NIR4 + 6 * NIR5 + 3 * NIR6 -2 * NIR7)/21', {
      'NIR1': NDVI2000_2000.select('NDVI_22'),
      'NIR2': NDVI2000_2000.select('NDVI_23'),
      'NIR3': NDVI2000_2000.select('NDVI_24'),
      'NIR4': NDVI2000_2000.select('NDVI_25'),
      'NIR5': NDVI2000_2000.select('NDVI_26'),
      'NIR6': NDVI2000_2000.select('NDVI_27'),
      'NIR7': NDVI2000_2000.select('NDVI_28'),
    });   

//Calcula la media de NDVI para cada estacion
    
var NDVIinv_ = ee.ImageCollection([NDVI_3sg, NDVI_4sg,NDVI_5sg,NDVI_6sg,NDVI_7sg,NDVI_8sg])
var NDVIpri_ = ee.ImageCollection([NDVI_9sg,NDVI_10sg,NDVI_11sg,NDVI_12sg,NDVI_13sg, NDVI_14sg])
var NDVIver_ = ee.ImageCollection([ NDVI_15sg,NDVI_16sg,NDVI_17sg,NDVI_18sg,NDVI_19sg, NDVI_20sg])
var NDVIoto_ = ee.ImageCollection([ NDVI_21sg,NDVI_22sg,NDVI_23sg,NDVI_24sg, NDVI_25sg])

var NDVIinv = NDVIinv_.reduce(ee.Reducer.mean()); 
var NDVIpri = NDVIpri_.reduce(ee.Reducer.mean()); 
var NDVIver = NDVIver_.reduce(ee.Reducer.mean()); 
var NDVIoto = NDVIoto_.reduce(ee.Reducer.mean()); 



//****************************************************INVIERNO**************************************************************************************************************************************************************************************************************************************************


//Calcula el Factor C de invierno

var factor_Cinv_ = NDVIinv.expression(
    'exp(-3.5 * (NIR / (1-NIR )))', {
      'NIR': NDVIinv.select('constant_mean'),
    });   
    
var factor_Cinv = factor_Cinv_
                     .where(factor_Cinv_.gt(1), 0.001) 
                     

/////////////////////////////////////////Factor R INVERNO///////////////////////////////////////////////////////////////////////////////////////////////////////////


//Calcula el R de junio, julio y agosto. Primero calcula la fracción de las ppt q cae como nieve y lo resta de la ppt de ese mes

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-06-01', '2000-06-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-06-01', '2000-06-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIinv.where(NDVIinv.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1)                
var image_ = image.multiply(fraccion_nieve)


//Calcula el R de junio a partir de la PPT
var factor_R_junio = image_ .expression(
    '0.4586* NIR - 2.7893', {
      'NIR': image_.select('Carbon_Soil_RF'),
    }); 
var factor_R_junio1 = factor_R_junio
                     .where(factor_R_junio.lte(0), 0) 
                     
                
                     

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-07-01', '2000-07-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-07-01', '2000-07-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIinv.where(NDVIinv.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1)  
var image2_ = image2.multiply(fraccion_nieve)

                  
var factor_R_julio = image2_ .expression(
    '0.4586* NIR - 2.7893', {
      'NIR': image2_.select('Carbon_Soil_RF'),
    }); 
    
var factor_R_julio1 = factor_R_julio
                     .where(factor_R_julio.lte(0), 0)    
 
 
 
    
var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-08-01', '2000-08-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-08-01', '2000-08-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);    
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIinv.where(NDVIinv.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1)  
var image3_ = image3.multiply(fraccion_nieve)


var factor_R_agosto = image3_.expression(
    '0.4586* NIR - 2.7893', {
      'NIR': image3_.select('Carbon_Soil_RF'),
    }); 

var factor_R_agosto1 = factor_R_agosto
                     .where(factor_R_agosto.lte(0), 0)
                     


//Factor R de invierno  (suma junio, julio y agosto)

var factor_R_inv = factor_R_junio1.add(factor_R_julio1).add (factor_R_agosto1)




////////////////////////////////////Calculo Erosion INVIERNO ////////////////////////////////////////////////////////////////////////////////////////////////////////


var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snow_cover')
                .filter(ee.Filter.date('2000-06-01', '2000-08-31'))
                .reduce(ee.Reducer.mean()).divide(100);
                var valor_1 = NDVIinv.where(NDVIinv.gte(0), 1)                
var nieve = valor_1.subtract(dataset)                
                


var erosion_inv = factor_R_inv.multiply(factor_Cinv).multiply(LS).multiply(factor_k).clip(region).multiply(nieve)

var pot_inv = factor_R_inv.multiply(LS).multiply(factor_k).clip(region)

//Map.addLayer(erosion_inv.clip(region),imageVisParam2,"erosion_invierno_2000_2001", true);    


//****************************************************PRIMAVERA**************************************************************************************************************************************************************************************************************************************************

//Calcula el Factor C de primavera

var factor_Cpri_ = NDVIpri.expression(
    'exp(-3.5 * (NIR / (1-NIR )))', {
      'NIR': NDVIpri.select('constant_mean'),
    });  
    
var factor_Cpri = factor_Cpri_
                     .where(factor_Cpri_.gt(1), 0.001)     


////////////////////////////////////////Factor R PRIMAVERA  ///////////////////////////////////////////////////////////////////////////////////////////////////////////

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-09-01', '2000-09-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-09-01', '2000-09-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIpri.where(NDVIpri.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image4_ = image4.multiply(fraccion_nieve)
var factor_R_sep = image4_.expression(
    '0.7462* NIR - 18.769', {
      'NIR': image4_.select('Carbon_Soil_RF'),
    }); 
var factor_R_sep1 = factor_R_sep
                     .where(factor_R_sep.lte(0), 0)



var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-10-01', '2000-10-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-10-01', '2000-10-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIpri.where(NDVIpri.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image5_ = image5.multiply(fraccion_nieve)
var factor_R_oct = image5_.expression(
    '0.7462* NIR - 18.769', {
      'NIR': image5_.select('Carbon_Soil_RF'),
    }); 
    
var factor_R_oct1 = factor_R_oct
                     .where(factor_R_oct.lte(0), 0)     
    
    

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-11-01', '2000-11-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-11-01', '2000-11-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIpri.where(NDVIpri.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image6_ = image6.multiply(fraccion_nieve)
var factor_R_nov = image6_.expression(
    '0.7462* NIR - 18.769', {
      'NIR': image6_.select('Carbon_Soil_RF'),
    }); 

var factor_R_nov1 = factor_R_nov
                     .where(factor_R_nov.lte(0), 0)
                     
                     

//Factor R de primavera  (suma septiembre, octubre y noviembre)

var factor_R_pri = factor_R_sep1.add(factor_R_oct1).add (factor_R_nov1)





//////////////////////////////////////////////////////Calculo Erosion PRIMAVERA ////////////////////////////////////////////////////////////////////////////////////////////////////////

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snow_cover')
                .filter(ee.Filter.date('2000-09-01', '2000-11-30'))
                .reduce(ee.Reducer.mean()).divide(100);
                var valor_1 = NDVIpri.where(NDVIpri.gte(0), 1)                
var nieve = valor_1.subtract(dataset)                
                

var erosion_pri = factor_R_pri.multiply(factor_Cpri).multiply(LS).multiply(factor_k).clip(region).multiply(nieve)

var pot_pri = factor_R_pri.multiply(LS).multiply(factor_k).clip(region)


    

//****************************************************VERANO**************************************************************************************************************************************************************************************************************************************************

//Calcula el Factor C de Verano

var factor_Cver_ = NDVIver.expression(
    'exp(-3.5 * (NIR / (1-NIR )))', {
      'NIR': NDVIver.select('constant_mean'),
    });      
    
 var factor_Cver = factor_Cver_
                     .where(factor_Cver_.gt(1), 0.001)     
    


////////////////////////////////////////Factor R VERANO///////////////////////////////////////////////////////////////////////////////////////////////////////////


var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2000-12-01', '2000-12-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2000-12-01', '2000-12-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIver.where(NDVIver.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image7_ = image7.multiply(fraccion_nieve)

var factor_R_dic = image7_.expression(
    '0.8823* NIR - 23.068', {
      'NIR': image7_.select('Carbon_Soil_RF'),
    }); 
var factor_R_dic1 = factor_R_dic
                     .where(factor_R_dic.lte(0), 0)   



var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2001-01-01', '2001-01-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2001-01-01', '2001-01-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIver.where(NDVIver.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image8_ = image8.multiply(fraccion_nieve)

var factor_R_ene = image8_.expression(
     '0.8823* NIR - 23.068', {
      'NIR': image8_.select('Carbon_Soil_RF'),
    }); 
var factor_R_ene1 = factor_R_ene
                     .where(factor_R_ene.lte(0), 0)      
    
    
var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2001-02-01', '2001-02-28'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2001-02-01', '2001-02-28'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIver.where(NDVIver.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image9_ = image9.multiply(fraccion_nieve)

var factor_R_feb = image9_.expression(
  '0.8823* NIR - 23.068', {
      'NIR': image9_.select('Carbon_Soil_RF'),
    }); 
var factor_R_feb1 = factor_R_feb
                     .where(factor_R_feb.lte(0), 0)
                
                
                
//Factor R de verano  (suma diciembre, enero y febrero)

var factor_R_ver = factor_R_dic1.add(factor_R_ene1).add (factor_R_feb1);



//////////////////////////////////////////////////////Calculo Erosion VERANO ////////////////////////////////////////////////////////////////////////////////////////////////////////

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snow_cover')
                .filter(ee.Filter.date('2000-12-01', '2001-02-28'))
                .reduce(ee.Reducer.mean()).divide(100);
                var valor_1 = NDVIver.where(NDVIver.gte(0), 1);                
var nieve = valor_1.subtract(dataset);

var erosion_ver = factor_R_ver.multiply(factor_Cver).multiply(LS).multiply(factor_k).clip(region).multiply(nieve);

var pot_ver = factor_R_ver.multiply(LS).multiply(factor_k).clip(region);


//****************************************************OTOÑO*************************************************************************************************************************************************************************************************************************************************

///////////////////////////////////////////Factor C/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Calcula el Factor C de Otoño

var factor_Coto_ = NDVIoto.expression(
    'exp(-3.5 * (NIR / (1-NIR )))', {
      'NIR': NDVIoto.select('constant_mean'),
    });      
    
 var factor_Coto = factor_Coto_
                     .where(factor_Coto_.gt(1), 0.001);  


////////////////////////////////////////Factor R OTOÑO///////////////////////////////////////////////////////////////////////////////////////////////////////////

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2001-03-01', '2001-03-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2001-03-01', '2001-03-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1);
var valor_1 = NDVIoto.where(NDVIoto.gte(0), 1);                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) ;  
var image10_ = image10.multiply(fraccion_nieve);


var factor_R_mar = image10_.expression(
    '0.9229* NIR - 31.775', {
      'NIR': image10_.select('Carbon_Soil_RF'),
    }); 
var factor_R_mar1 = factor_R_mar
                     .where(factor_R_mar.lte(0), 0)     



var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2001-04-01', '2001-04-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2001-04-01', '2001-04-30'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIoto.where(NDVIoto.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image11_ = image11.multiply(fraccion_nieve)

var factor_R_abr = image11_.expression(
   '0.9229* NIR - 31.775', {
      'NIR': image11_.select('Carbon_Soil_RF'),
    }); 
var factor_R_abr1 = factor_R_abr
                     .where(factor_R_abr.lte(0), 0)          
    
    


var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snowfall_sum')
                .filter(ee.Filter.date('2001-05-01', '2001-05-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var dataset1 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('total_precipitation_sum')
                .filter(ee.Filter.date('2001-05-01', '2001-05-31'))
                .reduce(ee.Reducer.mean()).multiply(1000);
var fraccion_nieve1 = dataset.divide(dataset1)
var valor_1 = NDVIoto.where(NDVIoto.gte(0), 1)                
var fraccion_nieve = valor_1.subtract(fraccion_nieve1) 
var image12_ = image12.multiply(fraccion_nieve)

var factor_R_may = image12_.expression(
   '0.9229* NIR - 31.775', {
      'NIR': image12_.select('Carbon_Soil_RF'),
    }); 
var factor_R_may1 = factor_R_may
                     .where(factor_R_may.lte(0), 0)   
                     


//Factor R de otoño (suma marzo, abril y mayo)

var factor_R_oto = factor_R_mar1.add(factor_R_abr1).add (factor_R_may1)


//////////////////////////////////////////////////////Calculo Erosion OTOÑO////////////////////////////////////////////////////////////////////////////////////////////////////////

var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select('snow_cover')
                .filter(ee.Filter.date('2001-03-01', '2001-05-31'))
                .reduce(ee.Reducer.mean()).divide(100);
                var valor_1 = NDVIoto.where(NDVIoto.gte(0), 1)                
var nieve = valor_1.subtract(dataset) 


var erosion_oto = factor_R_oto.multiply(factor_Coto).multiply(LS).multiply(factor_k).clip(region).multiply(nieve)

var pot_oto = factor_R_oto.multiply(LS).multiply(factor_k).clip(region)





//**************************CALCULO EROSION ANUAL***********************************************************************

var erosion_anual_completo_2000_2001 = erosion_inv
.add(erosion_pri)
.add (erosion_ver)
.add (erosion_oto)

var erosion_potencial_2000_2001 = pot_inv
.add(pot_pri)
.add (pot_ver)
.add (pot_oto)



var erosion = ee.Image('users/gaitanjuanjose/erosion_clases')
var cob_verde = ee.Image('users/gaitanjuanjose/Cobertura_Verde_Montanias')


var erosion_potencial_2000_2001_2 = erosion_potencial_2000_2001.updateMask(erosion.lt(10))
var hansen_2016 = ee.Image('UMD/hansen/global_forest_change_2016_v1_4').select('datamask');
var hansen_2016_wbodies = hansen_2016.neq(1).eq(0);
var erosion_potencial_2000_2001_3 = erosion_potencial_2000_2001_2.updateMask(hansen_2016_wbodies);
var erosion_potencial_2000_2001_4 = erosion_potencial_2000_2001_3.where(cob_verde.eq(2), 0) 
var erosion_potencial_2000_2001_5 = erosion_potencial_2000_2001_3.updateMask(erosion_potencial_2000_2001_4.gt(0))

var erosion_anual_completo_2000_2001_2 = erosion_anual_completo_2000_2001.updateMask(erosion.lt(10))
var hansen_2016 = ee.Image('UMD/hansen/global_forest_change_2016_v1_4').select('datamask');
var hansen_2016_wbodies = hansen_2016.neq(1).eq(0);
var erosion_anual_completo_2000_2001_3 = erosion_anual_completo_2000_2001_2.updateMask(hansen_2016_wbodies);
var erosion_anual_completo_2000_2001_4 = erosion_anual_completo_2000_2001_3.where(cob_verde.eq(2), -1) 
var erosion_anual_completo_2000_2001_5 = erosion_anual_completo_2000_2001_3.updateMask(erosion_anual_completo_2000_2001_4.gte(0))


Map.addLayer(erosion_anual_completo_2000_2001_5.clip(region),imageVisParam2,"erosion_anual_completo_2000_2001", true);    
//Map.addLayer(erosion_potencial_2000_2001.clip(region),imageVisParam2,"erosion_potencial_2000_2001", true);   

/*
Export.image.toAsset({
  image: erosion_anual_completo_2000_2001_5,
  description: 'erosion_2000_2001_fusion_landsat_modis',
 maxPixels: 1e13,
  scale: 60,
  region: region1,

});

*/
