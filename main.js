var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
var clickedCoordinate, populationLayer, gPopulation;
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}

var styleBus = new ol.style.Style({
  image: new ol.style.Icon({
    src: 'icons/bus-1.png',
    crossOrigin: 'anonymous'
  })
});

var styleGarbage = new ol.style.Style({
  image: new ol.style.Icon({
    src: 'icons/garbage-truck.png',
    crossOrigin: 'anonymous'
  }),
  text: new ol.style.Text({
    font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
    placement: 'point',
    fill: new ol.style.Fill({
      color: 'rgba(255,255,0,1)'
    })
  })
});

var layerYellow = new ol.style.Style({
  stroke: new ol.style.Stroke({
      color: 'rgba(0,0,0,1)',
      width: 1
  }),
  fill: new ol.style.Fill({
      color: 'rgba(255,255,0,0.3)'
  }),
  text: new ol.style.Text({
    font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
    fill: new ol.style.Fill({
      color: 'blue'
    })
  })
});

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
        crossOrigin: 'anonymous'
    }),
    opacity: 0.5
});

var cunliLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'cunli.json',
    format: new ol.format.GeoJSON()
  }),
  style: function(f) {
    var l = layerYellow.clone();
    l.getText().setText(f.get('TOWNNAME') + f.get('VILLNAME'));
    return l;
  }
});

var busLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'bus.json',
    format: new ol.format.GeoJSON()
  }),
  style: styleBus
});

var garbageLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'routes.json',
    format: new ol.format.GeoJSON()
  }),
  style: styleGarbage
});

var map = new ol.Map({
  layers: [baseLayer, cunliLayer, busLayer, garbageLayer],
  target: 'map',
  controls: ol.control.defaults({
    attributionOptions: {
      collapsible: false
    }
  }),
  view: new ol.View({
    center: ol.proj.fromLonLat([120.301507, 23.124694]),
    zoom: 16
  })
});

var dims = {
  a0: [1189, 841],
  a1: [841, 594],
  a2: [594, 420],
  a3: [420, 297],
  a4: [297, 210],
  a5: [210, 148]
};

var loading = 0;
var loaded = 0;

var exportButton = document.getElementById('export-pdf');

// var width = 4967; // 841 * 150 / 25.4
// var height = 3508; // 594 * 150 / 25.4
var width = 1754; // 297 * 150 / 25.4
var height = 1240; // 210 * 150 / 25.4

map.setSize([width, height]);
map.renderSync();

map.on('singleclick', function(evt) {
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      var p = feature.getProperties();
      console.log(p);
  });
});

exportButton.addEventListener('click', function() {

  exportButton.disabled = true;
  document.body.style.cursor = 'progress';

  map.once('postcompose', function(event) {
    var canvas = event.context.canvas;
    var data = canvas.toDataURL('image/png');
    var pdf = new jsPDF('landscape', undefined, 'a3');
    pdf.addImage(data, 'PNG', 0, 0, 420, 297);
    pdf.save('map.pdf');
    map.renderSync();
    exportButton.disabled = false;
    document.body.style.cursor = 'auto';
  });
  map.renderSync();
}, false);
