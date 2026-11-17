import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ComponentType, type Ref } from 'react'
import { StyleSheet } from 'react-native'
import { WebView as WebViewBase, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview'

// react-native-webview's class typings resolve its props to `never` against React Native 0.88's types; the
// component itself works, so it is typed here through its public props.
const WebView = WebViewBase as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewBase> }>

export interface LeafletMarker {
  id: number
  latitude: number
  longitude: number
  color: string
  title: string
  subtitle: string
}

export interface LeafletRegion {
  latitude: number
  longitude: number
  radiusKm: number
}

export interface LeafletMapHandle {
  flyTo: (region: LeafletRegion) => void
}

interface LeafletMapProps {
  initialRegion: LeafletRegion
  markers: LeafletMarker[]
  userLocation: { latitude: number; longitude: number } | null
  linkLabel: string
  accessibilityLabel: string
  onSelect: (id: number) => void
  onRegionChange: (region: LeafletRegion) => void
}

type MapMessage = { type: 'ready' } | { type: 'select'; id: number } | ({ type: 'region' } & LeafletRegion)

/** Zoom level that shows roughly `radiusKm` around the centre on a phone screen. */
function zoomFor(radiusKm: number): number {
  return Math.max(3, Math.min(17, Math.round(Math.log2(40000 / (radiusKm * 2)))))
}

function buildHtml(region: LeafletRegion, linkLabel: string): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%}.pop b{display:block;font:600 14px sans-serif;color:#0F172A}
.pop span{display:block;font:12px sans-serif;color:#64748B;margin:2px 0}.pop a{font:700 12px sans-serif;color:#B45309;text-decoration:none}</style>
</head><body><div id="map"></div><script>
var send=function(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))};
var map=L.map('map',{zoomControl:false}).setView([${region.latitude},${region.longitude}],${zoomFor(region.radiusKm)});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
attribution:'&copy; OpenStreetMap'}).addTo(map);
var layer=L.layerGroup().addTo(map),me=null,label=${JSON.stringify(linkLabel)};
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
window.setMarkers=function(items){layer.clearLayers();items.forEach(function(i){
var m=L.circleMarker([i.latitude,i.longitude],{radius:9,color:'#fff',weight:2,fillColor:i.color,fillOpacity:1}).addTo(layer);
m.bindPopup('<div class="pop"><b>'+esc(i.title)+'</b><span>'+esc(i.subtitle)+'</span><a href="#" data-id="'+i.id+'">'+esc(label)+' \\u203A</a></div>')})};
window.setUser=function(p){if(me){map.removeLayer(me);me=null}if(p){me=L.circleMarker([p.latitude,p.longitude],{radius:7,color:'#fff',weight:3,fillColor:'#2563EB',fillOpacity:1}).addTo(map)}};
window.flyTo=function(r){map.flyTo([r.latitude,r.longitude],r.zoom,{duration:0.5})};
document.addEventListener('click',function(e){var a=e.target.closest('a[data-id]');if(a){e.preventDefault();send({type:'select',id:Number(a.dataset.id)})}});
map.on('moveend',function(){var c=map.getCenter(),b=map.getBounds();var km=Math.max(1,Math.round(c.distanceTo(b.getNorthEast())/1000));
send({type:'region',latitude:c.lat,longitude:c.lng,radiusKm:km})});
send({type:'ready'});
</script></body></html>`
}

/**
 * Map drawn with Leaflet and OpenStreetMap tiles inside a WebView. It needs no API key, so it is the
 * Android map when the build has no Google Maps key (react-native-maps would close the app there).
 */
export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { initialRegion, markers, userLocation, linkLabel, accessibilityLabel, onSelect, onRegionChange },
  ref,
) {
  const webRef = useRef<WebViewBase>(null)
  const isReady = useRef(false)
  // The page is built once: later changes travel as small scripts, so the map keeps its position and zoom.
  const html = useMemo(() => buildHtml(initialRegion, linkLabel), []) // eslint-disable-line react-hooks/exhaustive-deps
  const latest = useRef({ markers, userLocation })
  latest.current = { markers, userLocation }

  const push = () => {
    if (!isReady.current) return
    const { markers: items, userLocation: me } = latest.current
    webRef.current?.injectJavaScript(`window.setMarkers(${JSON.stringify(items)});window.setUser(${JSON.stringify(me)});true;`)
  }

  useEffect(push, [markers, userLocation])

  useImperativeHandle(ref, () => ({
    flyTo: (region) =>
      webRef.current?.injectJavaScript(`window.flyTo(${JSON.stringify({ ...region, zoom: zoomFor(region.radiusKm) })});true;`),
  }))

  function handleMessage(event: WebViewMessageEvent) {
    let message: MapMessage
    try {
      message = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    if (message.type === 'ready') {
      isReady.current = true
      push()
    } else if (message.type === 'select') {
      onSelect(message.id)
    } else {
      onRegionChange({ latitude: message.latitude, longitude: message.longitude, radiusKm: message.radiusKm })
    }
  }

  return (
    <WebView
      ref={webRef}
      style={StyleSheet.absoluteFill}
      source={{ html, baseUrl: 'https://rentequip.app/' }}
      originWhitelist={['*']}
      onMessage={handleMessage}
      javaScriptEnabled
      accessibilityLabel={accessibilityLabel}
    />
  )
})
