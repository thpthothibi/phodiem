'use strict';
const sizeButton=document.getElementById('largeText');
function setReadingSize(large){document.body.classList.toggle('reading-large',large);sizeButton.setAttribute('aria-pressed',String(large));try{localStorage.setItem('htb.readingSize',large?'large':'normal');}catch{}if(chart)chart.resize();for(const c of subjectCharts)c.resize();}
try{setReadingSize(localStorage.getItem('htb.readingSize')==='large');}catch{}
sizeButton.onclick=()=>setReadingSize(!document.body.classList.contains('reading-large'));
document.getElementById('subjectDetails').addEventListener('toggle',e=>{if(e.target.open)for(const c of subjectCharts)c.resize();});
