<?php
$fc = array(
  'type' => 'FeatureCollection',
  'features' => array(),
);
foreach(glob('/home/kiang/public_html/tainan_base/scripts/bus_json/*.json') AS $jsonFile) {
  $json = json_decode(file_get_contents($jsonFile), true);
  $p = pathinfo($jsonFile);
  foreach($json['features'] AS $f) {
    if($f['geometry']['type'] === 'Point') {
      $f['properties']['line'] = $p['filename'];
      $fc['features'][] = $f;
    }
  }
}

file_put_contents(dirname(__DIR__) . '/bus.json', json_encode($fc));
