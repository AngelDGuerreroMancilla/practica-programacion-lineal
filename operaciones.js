
const BIG = 1e6;
const PRESETS = {
 1:{n1:"Pintura exterior (ton/día)", n2:"Pintura interior (ton/día)", tipo:"max", c:[5,4],
    r:[[6,4,"<=",24],[1,2,"<=",6],[-1,1,"<=",1],[0,1,"<=",2]]},
 2:{n1:"Maíz (lb)", n2:"Soya (lb)", tipo:"min", c:[0.3,0.9],
    r:[[1,1,">=",800],[-0.21,0.3,">=",0],[-0.03,0.01,"<=",0]]}
};
const COLORS=["#0d6efd","#198754","#fd7e14","#6f42c1","#d63384","#20c997","#6c757d","#dc3545"];

function addRow(a="",b="",op="<=",c=""){
  const d=document.createElement("div"); d.className="input-group input-group-sm mb-1";
  d.innerHTML=`<input type="number" step="any" class="form-control" value="${a}"><span class="input-group-text">X +</span>
  <input type="number" step="any" class="form-control" value="${b}"><span class="input-group-text">Y</span>
  <select class="form-select" style="max-width:70px"><option ${op=="<="?"selected":""} value="<=">≤</option><option ${op==">="?"selected":""} value=">=">≥</option><option ${op=="="?"selected":""} value="=">=</option></select>
  <input type="number" step="any" class="form-control" value="${c}"><button class="btn btn-outline-danger" onclick="this.parentNode.remove()">×</button>`;
  document.getElementById("restr").appendChild(d);
}
function cargarObj(p){
  n1.value=p.n1; n2.value=p.n2; tipo.value=p.tipo; c1.value=p.c[0]; c2.value=p.c[1];
  restr.innerHTML=""; p.r.forEach(r=>addRow(...r)); resolver();
}
function cargar(k){ nombreProb.value=""; cargarObj(PRESETS[k]); }

// ---- Problemas propios (se guardan en el navegador con localStorage) ----
let mem={};
function leerGuardados(){
  try{ return JSON.parse(localStorage.getItem("plProblemas")||"{}"); }catch(e){ return mem; }
}
function escribirGuardados(o){
  mem=o; try{ localStorage.setItem("plProblemas",JSON.stringify(o)); }catch(e){}
}
function refrescarLista(sel){
  const o=leerGuardados(), nombres=Object.keys(o);
  misProb.innerHTML=nombres.length?nombres.map(n=>`<option>${n.replace(/</g,"&lt;")}</option>`).join(""):`<option value="">(ninguno guardado)</option>`;
  if(sel&&o[sel]) misProb.value=sel;
}
function formAObj(){
  const r=[...restr.children].map(d=>{const i=d.querySelectorAll("input");return [+i[0].value,+i[1].value,d.querySelector("select").value,+i[2].value];});
  return {n1:n1.value,n2:n2.value,tipo:tipo.value,c:[+c1.value,+c2.value],r};
}
function guardar(){
  const nom=nombreProb.value.trim();
  if(!nom){ alert("Escribe un nombre para tu problema."); return; }
  const o=leerGuardados(); o[nom]=formAObj(); escribirGuardados(o); refrescarLista(nom);
  alert('Problema "'+nom+'" guardado.');
}
function cargarGuardado(){
  const o=leerGuardados(), nom=misProb.value;
  if(o[nom]){ nombreProb.value=nom; cargarObj(o[nom]); }
}
function borrarGuardado(){
  const o=leerGuardados(), nom=misProb.value;
  if(o[nom]&&confirm('¿Eliminar "'+nom+'"?')){ delete o[nom]; escribirGuardados(o); refrescarLista(); }
}
function nuevo(){
  nombreProb.value=""; n1.value=""; n2.value=""; tipo.value="max"; c1.value=""; c2.value="";
  restr.innerHTML=""; addRow(); addRow();
  const cv=document.getElementById("cv"); cv.getContext("2d").clearRect(0,0,cv.width,cv.height);
  salida.innerHTML='<span class="text-muted">Captura tu problema y presiona "Resolver y graficar".</span>';
}
// Recorte de polígono con semiplano a x + b y <= c
function clip(poly,a,b,c){
  const out=[], f=p=>a*p[0]+b*p[1]-c, eps=1e-9;
  for(let i=0;i<poly.length;i++){
    const P=poly[i], Q=poly[(i+1)%poly.length], fp=f(P), fq=f(Q);
    if(fp<=eps) out.push(P);
    if((fp<-eps&&fq>eps)||(fp>eps&&fq<-eps)){
      const t=fp/(fp-fq); out.push([P[0]+t*(Q[0]-P[0]),P[1]+t*(Q[1]-P[1])]);
    }
  }
  return out;
}
function clipRes(poly,r){
  if(r.op=="<=") return clip(poly,r.a,r.b,r.c);
  if(r.op==">=") return clip(poly,-r.a,-r.b,-r.c);
  return clip(clip(poly,r.a,r.b,r.c),-r.a,-r.b,-r.c);
}
function dedup(p){
  const o=[]; p.forEach(q=>{ if(!o.some(r=>Math.hypot(r[0]-q[0],r[1]-q[1])<1e-6*Math.max(1,Math.abs(q[0])))) o.push(q); }); return o;
}
const fmt=v=>(Math.round(v*10000)/10000).toString();

function resolver(){
  const nm1=n1.value||"X", nm2=n2.value||"Y", t=tipo.value, C1=+c1.value, C2=+c2.value;
  const R=[...restr.children].map(d=>{const i=d.querySelectorAll("input"),s=d.querySelector("select");
    return {a:+i[0].value,b:+i[1].value,op:s.value,c:+i[2].value};});
  // región factible (caja grande para detectar no acotada)
  let poly=[[0,0],[BIG,0],[BIG,BIG],[0,BIG]];
  R.forEach(r=>{poly=clipRes(poly,r)});
  poly=dedup(poly);
  const sal=document.getElementById("salida");
  let html=`<h6>1. Variables</h6><p>X = ${nm1}<br>Y = ${nm2}</p>
  <h6>2. Función objetivo</h6><p>${t=="max"?"Maximizar":"Minimizar"} Z = ${C1}X + ${C2}Y</p>
  <h6>3. Restricciones</h6><p>${R.map(r=>`${r.a}X + ${r.b}Y ${r.op=="<="?"≤":r.op==">="?"≥":"="} ${r.c}`).join("<br>")}<br>X, Y ≥ 0</p>`;
  if(poly.length<1){ sal.innerHTML=html+`<div class="alert alert-danger">No existe región factible (problema infactible).</div>`; dibujar(R,[],null,10,10,C1,C2); return; }
  const Z=p=>C1*p[0]+C2*p[1];
  let best=poly[0];
  poly.forEach(p=>{ if(t=="max"?Z(p)>Z(best)+1e-9:Z(p)<Z(best)-1e-9) best=p; });
  const unb=best[0]>BIG*0.99||best[1]>BIG*0.99;
  const fin=poly.filter(p=>p[0]<BIG/10&&p[1]<BIG/10);
  const xm=Math.max(1,...fin.map(p=>p[0]))*1.25, ym=Math.max(1,...fin.map(p=>p[1]))*1.25;
  dibujar(R,poly,unb?null:best,xm,ym,C1,C2);
  html+=`<h6>4-5. Vértices de la región factible</h6><table class="table table-sm table-bordered w-auto"><thead><tr><th>X</th><th>Y</th><th>Z</th></tr></thead><tbody>`+
    fin.map(p=>`<tr class="${p===best?"table-success":""}"><td>${fmt(p[0])}</td><td>${fmt(p[1])}</td><td>${fmt(Z(p))}</td></tr>`).join("")+`</tbody></table>`;
  html+=`<h6>6. Solución</h6>`;
  html+= unb ? `<div class="alert alert-warning">La región es no acotada y Z mejora indefinidamente: no hay solución óptima finita.</div>` :
   `<div class="alert alert-success mb-0">X (${nm1}) = <b>${fmt(best[0])}</b><br>Y (${nm2}) = <b>${fmt(best[1])}</b><br>Z ${t=="max"?"máxima":"mínima"} = <b>${fmt(Z(best))}</b></div>`;
  sal.innerHTML=html;
}

function dibujar(R,poly,best,xm,ym,C1,C2){
  const cv=document.getElementById("cv"), g=cv.getContext("2d"), W=cv.width, H=cv.height, m=55;
  g.clearRect(0,0,W,H);
  const X=x=>m+x/xm*(W-2*m), Y=y=>H-m-y/ym*(H-2*m);
  const step=v=>{const e=Math.pow(10,Math.floor(Math.log10(v/5))),f=v/5/e;return (f<1.5?1:f<3.5?2:f<7.5?5:10)*e;};
  // cuadrícula y ejes
  g.font="11px sans-serif"; g.fillStyle="#555"; g.strokeStyle="#e5e5e5"; g.lineWidth=1;
  for(let v=0;v<=xm;v+=step(xm)){g.beginPath();g.moveTo(X(v),Y(0));g.lineTo(X(v),Y(ym));g.stroke();g.fillText(fmt(v),X(v)-8,Y(0)+15);}
  for(let v=0;v<=ym;v+=step(ym)){g.beginPath();g.moveTo(X(0),Y(v));g.lineTo(X(xm),Y(v));g.stroke();g.fillText(fmt(v),X(0)-35,Y(v)+4);}
  g.strokeStyle="#000"; g.lineWidth=1.5; g.beginPath();g.moveTo(X(0),Y(ym));g.lineTo(X(0),Y(0));g.lineTo(X(xm),Y(0));g.stroke();
  g.fillStyle="#000"; g.font="bold 12px sans-serif"; g.fillText("X",X(xm)-15,Y(0)+32); g.fillText("Y",X(0)-45,Y(ym)+5);
  // área factible recortada a la vista
  if(poly.length){
    let v=[[0,0],[xm,0],[xm,ym],[0,ym]]; // recorte: polígono factible contra ventana
    let p=poly.map(q=>[Math.min(q[0],xm),Math.min(q[1],ym)]);
    // usar recorte exacto: recortar la ventana con cada restricción
    R.forEach(r=>{v=clipRes(v,r)});
    if(v.length>2){
      g.fillStyle="rgba(25,135,84,0.30)"; g.strokeStyle="rgba(25,135,84,0.9)"; g.lineWidth=2;
      g.beginPath(); v.forEach((q,i)=>i?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1]))); g.closePath(); g.fill(); g.stroke();
    }
  }
  // rectas de restricciones
  R.forEach((r,i)=>{
    const pts=[];
    if(Math.abs(r.b)>1e-12){ [0,xm].forEach(x=>{const y=(r.c-r.a*x)/r.b; if(y>=-1e-9&&y<=ym+1e-9)pts.push([x,y]);}); }
    if(Math.abs(r.a)>1e-12){ [0,ym].forEach(y=>{const x=(r.c-r.b*y)/r.a; if(x>=-1e-9&&x<=xm+1e-9)pts.push([x,y]);}); }
    const u=dedup(pts); if(u.length<2) return;
    g.strokeStyle=COLORS[i%COLORS.length]; g.lineWidth=2; g.beginPath(); g.moveTo(X(u[0][0]),Y(u[0][1])); g.lineTo(X(u[1][0]),Y(u[1][1])); g.stroke();
    g.fillStyle=g.strokeStyle; g.font="bold 12px sans-serif"; g.fillText("R"+(i+1),X(u[1][0])+4,Y(u[1][1])-4);
  });
  // línea de nivel de la función objetivo en el óptimo
  if(best&&(C1||C2)){
    const z=C1*best[0]+C2*best[1], pts=[];
    if(Math.abs(C2)>1e-12)[0,xm].forEach(x=>{const y=(z-C1*x)/C2; if(y>=0&&y<=ym)pts.push([x,y]);});
    if(Math.abs(C1)>1e-12)[0,ym].forEach(y=>{const x=(z-C2*y)/C1; if(x>=0&&x<=xm)pts.push([x,y]);});
    const u=dedup(pts); if(u.length>=2){g.setLineDash([6,5]);g.strokeStyle="#dc3545";g.lineWidth=1.5;g.beginPath();g.moveTo(X(u[0][0]),Y(u[0][1]));g.lineTo(X(u[1][0]),Y(u[1][1]));g.stroke();g.setLineDash([]);}
  }
  // puntos (vértices)
  poly.filter(p=>p[0]<BIG/10&&p[1]<BIG/10).forEach(p=>{
    const opt=best&&p===best;
    g.fillStyle=opt?"#dc3545":"#000"; g.beginPath(); g.arc(X(p[0]),Y(p[1]),opt?7:4,0,7); g.fill();
    g.font=(opt?"bold ":"")+"11px sans-serif"; g.fillText(`(${fmt(p[0])}, ${fmt(p[1])})`,X(p[0])+8,Y(p[1])-8);
  });
}
refrescarLista();
cargar(1);