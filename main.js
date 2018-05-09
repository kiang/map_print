var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });
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
  image: new ol.style.Circle({
    radius: 10,
    fill: new ol.style.Fill({
      color: '#0000CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
});

var styleGarbage = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 10,
    fill: new ol.style.Fill({
      color: '#00CC00'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
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

var cunliSource = new ol.source.Vector({
  url: 'cunli.json',
  format: new ol.format.GeoJSON()
});
var cunliLayer = new ol.layer.Vector({
  source: cunliSource,
  style: function(f) {
    var l = layerYellow.clone();
    l.getText().setText(f.get('TOWNNAME') + f.get('VILLNAME'));
    return l;
  }
});

var cunliList = {};
cunliSource.once('change', function() {
  if(cunliSource.getState() === 'ready') {
    cunliSource.forEachFeature(function(f) {
      var p = f.getProperties();
      f.setId(p.VILLCODE);
      if(!cunliList[p.TOWNNAME]) {
        cunliList[p.TOWNNAME] = {};
      }
      cunliList[p.TOWNNAME][p.VILLCODE] = p.VILLNAME;
    });
    var townOptions = '<option>---</option>';
    for(k in cunliList) {
      townOptions += '<option value="' + k + '">' + k + '</option>';
    }
    $('select#town').html(townOptions);
    $('select#town').change(function() {
      var cunliOptions = '<option>---</option>';
      var selectedTown = $(this).val();
      if(cunliList[selectedTown]) {
        for(k in cunliList[selectedTown]) {
          cunliOptions += '<option value="' + k + '">' + cunliList[selectedTown][k] + '</option>';
        }
      }
      $('select#cunli').html(cunliOptions);
    });
    $('select#cunli').change(function() {
      var selectedCunli = $(this).val();
      var f = cunliSource.getFeatureById(selectedCunli);
      if(f) {
        map.getView().fit(f.getGeometry().getExtent());
      }
    });
  }
})

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

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.301507, 23.124694]),
  zoom: 16
});

var map = new ol.Map({
  layers: [baseLayer, cunliLayer],
  target: 'map',
  controls: ol.control.defaults({
    attributionOptions: {
      collapsible: false
    }
  }),
  view: appView
});
map.addControl(sidebar);

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

//a3
var width = 2480; // 420 * 150 / 25.4
var height = 1754; // 297 * 150 / 25.4

//a4
// var width = 1754; // 297 * 150 / 25.4
// var height = 1240; // 210 * 150 / 25.4

map.setSize([width, height]);
map.renderSync();

map.on('singleclick', function(evt) {
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      //var p = feature.getProperties();
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

var geolocation = new ol.Geolocation({
  projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
  console.log(error.message);
});

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

var changeTriggered = false;
var currentCoordinates;
geolocation.on('change:position', function() {
  currentCoordinates = geolocation.getPosition();
  if(false === changeTriggered) {
    var mapView = map.getView();
    mapView.setCenter(currentCoordinates);
    mapView.setZoom(17);
    changeTriggered = true;


    setTimeout(function() {
      map.forEachFeatureAtPixel(map.getPixelFromCoordinate(currentCoordinates), function (feature, layer) {
        var fid = feature.getId();
        if(fid) {
          var p = feature.getProperties();
          $('select#town').val(p.TOWNNAME).trigger('change');
          $('select#cunli').val(p.VILLCODE);
        }
      });
    }, 300);
  }
  positionFeature.setGeometry(currentCoordinates ? new ol.geom.Point(currentCoordinates) : null);
});

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [positionFeature]
  })
});
