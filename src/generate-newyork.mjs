import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
// Full outline by Bea.miau, CC0; only the clean vector contour is embedded.
const source=fs.readFileSync(path.join(dir,'references/liberty-outline.svg'),'utf8');
const outline=source.match(/<path\b[^>]*\bd="([^"]+)"/)[1];
const out=[`<svg class="newyork-model liberty-panorama" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 550" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
<defs>
<path id="liberty-contour" d="${outline}"/>
<clipPath id="liberty-clip"><use href="#liberty-contour"/></clipPath>
<linearGradient id="liberty-copper" x2="1" y2=".2"><stop stop-color="#bdd0b6"/><stop offset=".48" stop-color="#9cbeaa"/><stop offset="1" stop-color="#5f9490"/></linearGradient>
<pattern id="liberty-etch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 5 0" stroke="#315d62" stroke-width=".45" opacity=".24"/></pattern>
<pattern id="liberty-sea" width="180" height="52" patternUnits="userSpaceOnUse"><g fill="none" stroke="#426f76" stroke-linecap="round" stroke-width=".7"><path d="M2 5q17-3 34 0t28 0m32 0h31m12 0h28M19 15h43m16 0q22-3 44 0m24 0h32M-7 26q24-3 48 0m12 0h27m21 0q17-3 34 0m23 0h23M5 39h27m21 0q20-3 40 0m19 0h45M15 49h43m32 0h27m20 0h36"/></g></pattern>
</defs>`];
// Very light engraved cloud bands leave the monument's silhouette clear.
out.push('<g fill="none" stroke="#748f86" stroke-width=".65" opacity=".18">');
for(let i=0;i<7;i++)out.push(`<path d="M40 ${160+i*4}q30-15 64-4q31-30 62-10q30-12 70 9m-125 12q42-4 85 1m730 ${-28+i*1.2}q30-23 58-8q32-27 70-5q40-15 89 11m-64 12h112"/>`);
out.push('</g>');
// Harbor water reaches the architecture on both sides; no street or traffic remains.
out.push('<g class="liberty-water"><path d="M-200 463Q240 452 700 462T1600 460V550H-200Z" fill="#c3d4c6" opacity=".28"/><path class="liberty-ripples liberty-ripples--fast" d="M-420 463H1820V550H-420Z" fill="url(#liberty-sea)" opacity=".72"/><path class="liberty-ripples liberty-ripples--faster" d="M-420 463H1820V550H-420Z" fill="url(#liberty-sea)" opacity=".24"/></g>');
// Low island with a seawall, trees, a lawn and the angular footprint of the fort.
out.push('<g stroke="#527579" stroke-width=".8" stroke-linejoin="round">');
out.push('<path d="M250 478 365 466 432 452 559 450 630 436 770 438 865 451 978 459 1134 480 1027 496 385 496Z" fill="#c4cdb5"/>');
out.push('<path d="m250 478 135 18h642l107-16v12l-104 16H383l-133-17Z" fill="#e6ddc3"/>');
out.push('<path d="M276 488 387 501h640l76-12M390 498v8m46-8v9m54-9v10m54-10v10m54-10v10m54-10v10m54-10v10m54-10v10m54-10v10m54-10v10m54-10v10m54-10v9" fill="none" stroke-width=".55"/>');
for(const [x,y,s] of [[404,451,1],[448,447,.85],[494,449,.75],[884,453,.8],[925,456,.9],[979,466,.8]]){
 out.push(`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-18 5q-12-8-5-17q-3-14 11-16q7-17 20-7q18-2 19 14q12 10 1 20Z" fill="#a4bda6"/><path d="M0 8v-26m0 15-12-8m12 2 12-10" fill="none"/></g>`);
}
out.push('<path d="m534 478 34-21 43 5 24-21 52 5 45-10 39 23 47-2 36 25-67 5-27 13-66-7-55 6-27-14Z" fill="#ddd2b5"/><path d="m551 478 61-6 25-20 50 4 44-9 39 22 45-2 22 13-53 1-27 12-64-7-54 5-28-15Z" fill="url(#liberty-etch)"/>');
out.push('</g>');
// The monument is one editable vector group, using the verified full-height contour.
out.push('<g class="liberty-monument" transform="translate(557 15) scale(.52)" stroke="#315d62" stroke-width="1.5" stroke-linejoin="round">');
out.push('<use href="#liberty-contour" fill="url(#liberty-copper)"/>');
out.push('<g clip-path="url(#liberty-clip)">');
out.push('<path d="M0 515H517V888H0Z" fill="#e4d9bd"/><path d="M0 515H517V888H0Z" fill="url(#liberty-etch)"/>');
// The pedestal's cornices, recessed panels and masonry courses.
out.push('<g fill="none"><path d="M172 538h190m-190 8h190m-189 14h190m-189 12h190M177 654h184m-190 17h195m-194 8h196M164 739h211m-218 15h226M114 806h307m-390 35h471m-470 11h471"/>');
for(let y=590;y<730;y+=22){out.push(`<path d="M175 ${y}h194" stroke-width=".6"/>`);for(let x=175+((y/22)%2)*18;x<370;x+=37)out.push(`<path d="M${x} ${y}v22" stroke-width=".4"/>`)}
out.push('<path d="M204 588h131v60H204Zm10 8h111v45H214ZM201 689h138v38H201Z"/><path d="M219 650v-24q0-22 17-22t17 22v24m18 0v-24q0-22 17-22t17 22v24"/>');
out.push('</g>');
// Copper shading and flowing robe folds stay clipped to the real silhouette.
out.push('<g fill="none" stroke-linecap="round">');
out.push('<path d="M237 212q10 42 34 70q-30 74-38 150l-9 65m50-210q-13 92-8 201m19-169q18 73 13 149m-58-115q-9 83-20 114m30-112q-16 70-10 121m48-84 20 78m-42-271q-15 28-27 50m41-41 16 74m-56-84q20 35 54 35m-44-24q26 35 49 24m-83-32q10-13 24-21M222 120l5 46 11 24m-24-63 3 45m1-91 8 16m-13-33h23m-23 5h22M253 170q8-12 21-10q13 6 11 21m-25-4h5m12 0h5m-11-2-2 12 6 2m-12 7q8 4 14-1m-20-30q-7 25 0 39m26-37 5 35M259 152q13-9 26 0" stroke-width="1.8"/>');
out.push('<path d="m312 256 27 17-18 33-25-16Z" fill="#b9cbb3" stroke-width="1.6"/><path d="m316 263 16 10m-20-2 15 9m-20-1 16 9M297 284q5 12 15 15m18-26 10 5m-10-1 7 5m-10 0 7 5" stroke-width="1"/>');
for(let i=0;i<13;i++)out.push(`<path d="M${239+i*3.8} ${308+i*5}q${-15+i} 70 ${-17+i*.9} ${153-i*4}" opacity=".35" stroke-width=".7"/>`);
out.push('</g>');
out.push('<path d="m202 42 16-24 10 8-3 20-8 8-14-3Z" fill="#c6ac67" stroke="#9b8147"/><g class="torch-flame"><path d="M208 48q-12-9-4-20 2-9 11-20 1 13 10 16 8 9-2 21l-6 5Z" fill="#e8c56e" stroke="#9b8147" stroke-width="1.5"/><path d="M214 44q-5-7-1-13l4-10 5 12q3 7-3 12Z" fill="#fff0bd" stroke="#fff0bd" stroke-width="1"/></g>');
out.push('</g></g>');
// Reflections are sparse and broken, as in the Petersburg engraving.
out.push('<g fill="none" stroke="#638d86" stroke-width=".7" opacity=".6"><path d="M653 511h91m-102 7h108m-94 6h70m-47 6h60m-76 7h92m-63 6h47"/></g></svg>');
fs.writeFileSync(path.join(dir,'newyork.svg'),out.join('\n'));
console.log('Statue of Liberty, pedestal, island and harbor engraving built.');
