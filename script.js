/*
  Algorithmic Devious Work — script.js
  Clean modular core with many algorithms, simple palette, battle mode, and reliable finish-state.
*/

// ========================= Utils & Core =========================
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const now = () => performance.now();
const rndSeeded = (seed => {
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  return seed => mulberry32(seed >>> 0);
})();

// Simple palette
const COLORS = {
  bg: '#202020',
  bar: '#999999',
  hi: '#f1c40f', // yellow
  good: '#2ecc71', // green
  bad: '#e74c3c', // red
  info: '#3498db', // blue
  grid: '#2a2a2a',
  wall: '#333333',
  node: '#dddddd',
};

// Audio — subtle blips
const SFX = (() => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0.15; master.connect(ctx.destination);
  function blip(type='sine', f=440, dur=0.06){
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    swap: ()=>blip('triangle', 520, 0.05),
    visit: ()=>blip('sine', 340, 0.04),
    done: ()=>blip('sawtooth', 660, 0.18),
  };
})();

// Data helpers
const Data = {
  array(n, rng){ return Array.from({length:n}, () => 1 + Math.floor(rng()*99)); },
  sortedArray(n, rng){ return Data.array(n, rng).sort((a,b)=>a-b); },
  points(n, rng){ return Array.from({length:n}, () => ({x:rng(), y:rng()})); },
  grid(size, rng){ // weighted grid
    const cells = [];
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) cells.push({x,y,w: 1+Math.floor(rng()*9)});
    return { size, cells };
  },
};

// Draw helpers
function clear(ctx){
  const {width:w, height:h} = ctx.canvas;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0,0,w,h);
}
function drawBars(ctx, arr, hi={}){
  const {width:w, height:h} = ctx.canvas;
  const n = arr.length; const barW = w / n;
  const max = Math.max(...arr, 1);
  for(let i=0;i<n;i++){
    const v = arr[i]/max; const barH = Math.max(2, v * (h-4));
    const x = i*barW;
    ctx.fillStyle = hi[i] || COLORS.bar;
    ctx.fillRect(x+1, h-barH-2, Math.max(1, barW-2), barH);
  }
}
function drawGrid(ctx, grid, visited, pathSet){
  const {width:w, height:h} = ctx.canvas; const N = grid.size; const cell = Math.min(w/N, h/N);
  // base cells colored by weight
  for(const c of grid.cells){
    const l = 26 + c.w*4; // lighter with weight
    ctx.fillStyle = `hsl(0 0% ${l}%)`;
    ctx.fillRect(c.x*cell, c.y*cell, cell-1, cell-1);
  }
  // visited
  if(visited){
    ctx.fillStyle = COLORS.info;
    for(const k of visited){ const [x,y]=k.split(',').map(Number); ctx.fillRect(x*cell+cell*0.25, y*cell+cell*0.25, cell*0.5, cell*0.5); }
  }
  // path
  if(pathSet && pathSet.size){
    ctx.fillStyle = COLORS.good;
    for(const k of pathSet){ const [x,y]=k.split(',').map(Number); ctx.fillRect(x*cell+cell*0.35, y*cell+cell*0.35, cell*0.3, cell*0.3); }
  }
}
function drawPoints(ctx, pts, centers){
  const {width:w, height:h} = ctx.canvas;
  ctx.fillStyle = '#eee';
  for(const p of pts){
    ctx.beginPath(); ctx.arc(p.x*w, p.y*h, 3.5, 0, Math.PI*2); ctx.fillStyle = p.c || '#ddd'; ctx.fill();
  }
  if(centers){
    ctx.strokeStyle = COLORS.hi; ctx.lineWidth = 3;
    for(const c of centers){ ctx.beginPath(); ctx.arc(c.x*w, c.y*h, 7, 0, Math.PI*2); ctx.stroke(); }
  }
}

// Registry
const REGISTRY = [];
function register(spec){ REGISTRY.push(spec); }
function byCategory(cat){ return REGISTRY.filter(a=>a.category===cat); }
function findAlgo(id){ return REGISTRY.find(a=>a.id===id); }

// ========================= Sorting & Searching =========================
function makeArrayAlgo(name, core){
  return { id: name.toLowerCase().replace(/\s+/g,'-'), name, category:'sort',
    create(){
      let arr=[], hi={}, done=false, stats={steps:0, comps:0, swaps:0}, rng=Math.random;
      return {
        init(seed, size){ rng = rndSeeded(seed); arr = Data.array(size, rng); hi={}; done=false; stats={steps:0, comps:0, swaps:0}; core.init?.(arr, stats); },
        step(){ if(done) return; const ev = core.step(arr, hi, stats); stats.steps++; if(ev==='swap') SFX.swap(); else if(ev==='visit') SFX.visit(); if(core.finished?.(arr, stats)) { done=true; SFX.done(); } },
        draw(ctx){ clear(ctx); drawBars(ctx, arr, hi); },
        get finished(){ return done; },
        get stats(){ return stats; }
      };
    }
  };
}

// Bubble Sort
register(makeArrayAlgo('Bubble Sort', (()=>{
  let i=0, j=0, n=0;
  return {
    init(a){ i=0; j=0; n=a.length; },
    step(a, hi, st){
      hi[j]=COLORS.hi; hi[j+1]=COLORS.hi; st.comps++;
      if(a[j] > a[j+1]){ [a[j],a[j+1]]=[a[j+1],a[j]]; st.swaps++; j++; return 'swap'; }
      j++;
      if(j>=n-1-i){ j=0; i++; if(i>=n-1) return 'done'; }
      return 'visit';
    },
    finished(a){ return i>=n-1; }
  };
})()));

// Insertion Sort
register(makeArrayAlgo('Insertion Sort', (()=>{
  let i=1;
  return {
    init(){ i=1; },
    step(a, hi, st){
      if(i>=a.length) return 'done';
      let j=i; while(j>0){ st.comps++; hi[j]=COLORS.hi; hi[j-1]=COLORS.hi; if(a[j] < a[j-1]){ [a[j],a[j-1]]=[a[j-1],a[j]]; st.swaps++; SFX.swap(); j--; } else break; }
      i++; return 'visit';
    },
    finished(a){ return i>=a.length; }
  };
})()));

// Selection Sort
register(makeArrayAlgo('Selection Sort', (()=>{
  let i=0;
  return {
    init(){ i=0; },
    step(a, hi, st){
      if(i>=a.length-1) return 'done';
      let min=i; for(let k=i+1;k<a.length;k++){ st.comps++; if(a[k]<a[min]) min=k; }
      if(min!==i){ [a[i],a[min]]=[a[min],a[i]]; st.swaps++; }
      i++; return 'swap';
    },
    finished(a){ return i>=a.length-1; }
  };
})()));

// Merge Sort (iterative)
register(makeArrayAlgo('Merge Sort', (()=>{
  let width=1;
  return {
    init(){ width=1; },
    step(a, hi, st){
      const n=a.length; if(width>=n) return 'done';
      for(let i=0;i<n;i+=2*width){
        const mid=Math.min(i+width,n), end=Math.min(i+2*width,n);
        const tmp=[]; let l=i, r=mid;
        while(l<mid && r<end){ st.comps++; tmp.push(a[l]<=a[r]? a[l++]:a[r++]); }
        while(l<mid) tmp.push(a[l++]); while(r<end) tmp.push(a[r++]);
        for(let k=0;k<tmp.length;k++) a[i+k]=tmp[k];
      }
      width*=2; return 'swap';
    },
    finished(a){ return width>=a.length; }
  };
})()));

// Quick Sort (stack)
register(makeArrayAlgo('Quick Sort', (()=>{
  let stack=[];
  function part(a,l,r,st){ const p=a[(l+r>>1)]; let i=l, j=r; while(i<=j){ while(a[i]<p){ i++; st.comps++; } while(a[j]>p){ j--; st.comps++; } if(i<=j){ [a[i],a[j]]=[a[j],a[i]]; st.swaps++; i++; j--; } } return [i,j]; }
  return {
    init(a){ stack=[[0,a.length-1]]; },
    step(a, hi, st){ if(!stack.length) return 'done'; const [l,r]=stack.pop(); if(l>=r) return 'visit'; const [i,j]=part(a,l,r,st); if(l<j) stack.push([l,j]); if(i<r) stack.push([i,r]); return 'swap'; },
    finished(){ return stack.length===0; }
  };
})()));

// Heap Sort
register(makeArrayAlgo('Heap Sort', (()=>{
  let n=0, built=false;
  function heapify(a, n, i, st){ let largest=i; const l=2*i+1, r=2*i+2; if(l<n){ st.comps++; if(a[l]>a[largest]) largest=l; } if(r<n){ st.comps++; if(a[r]>a[largest]) largest=r; } if(largest!==i){ [a[i],a[largest]]=[a[largest],a[i]]; st.swaps++; heapify(a,n,largest,st);} }
  return {
    init(a){ n=a.length; built=false; },
    step(a, hi, st){
      if(!built){ for(let i=(n>>1)-1;i>=0;i--) heapify(a,n,i,st); built=true; return 'swap'; }
      if(n<=1) return 'done'; [a[0],a[n-1]]=[a[n-1],a[0]]; st.swaps++; n--; heapify(a,n,0,st); return 'swap';
    },
    finished(){ return built && n<=1; }
  };
})()));

// Shell Sort (Knuth gap)
register(makeArrayAlgo('Shell Sort', (()=>{
  let g=1, i=0;
  return {
    init(a){ g=1; while(g<Math.floor(a.length/3)) g = 3*g + 1; i=g; },
    step(a, hi, st){ if(g<1) return 'done'; if(i>=a.length){ g=Math.floor(g/3); i=g; return 'visit'; }
      let j=i, v=a[i]; while(j>=g && (st.comps++, a[j-g] > v)){ a[j]=a[j-g]; st.swaps++; j-=g; } a[j]=v; i++; return 'swap'; },
    finished(){ return g<1; }
  };
})()));

// Counting Sort (non-negative small range)
register(makeArrayAlgo('Counting Sort', (()=>{
  let done=false;
  return {
    init(){ done=false; },
    step(a, hi, st){ if(done) return 'done'; const k = Math.max(...a)+1; const count=new Array(k).fill(0); for(const v of a){ count[v]++; st.comps++; }
      let idx=0; for(let v=0; v<k; v++){ while(count[v]-->0){ a[idx++]=v; st.swaps++; } }
      done=true; return 'swap'; },
    finished(){ return done; }
  };
})()));

// Radix Sort (LSD base 10)
register(makeArrayAlgo('Radix Sort (LSD)', (()=>{
  let exp=1, max=0;
  return {
    init(a){ exp=1; max=Math.max(...a); },
    step(a, hi, st){ if(exp>max) return 'done'; const buckets=Array.from({length:10},()=>[]); for(const v of a){ const d=Math.floor(v/exp)%10; buckets[d].push(v); st.comps++; }
      let i=0; for(const b of buckets){ for(const v of b){ a[i++]=v; st.swaps++; } }
      exp*=10; return 'swap'; },
    finished(){ return exp>max; }
  };
})()));

// Cocktail Shaker Sort
register(makeArrayAlgo('Cocktail Shaker Sort', (()=>{
  let start=0, end=0, dir=1, n=0;
  return {
    init(a){ start=0; end=a.length-1; dir=1; n=a.length; },
    step(a, hi, st){ if(start>=end) return 'done'; let swapped=false; if(dir===1){ for(let i=start;i<end;i++){ st.comps++; if(a[i]>a[i+1]){ [a[i],a[i+1]]=[a[i+1],a[i]]; st.swaps++; swapped=true; } } end--; dir=-1; } else { for(let i=end;i>start;i--){ st.comps++; if(a[i]<a[i-1]){ [a[i],a[i-1]]=[a[i-1],a[i]]; st.swaps++; swapped=true; } } start++; dir=1; }
      return swapped? 'swap':'visit'; },
    finished(){ return start>=end; }
  };
})()));

// -------- Searching --------
function makeSearchAlgo(name, core){
  return { id: name.toLowerCase().replace(/\s+/g,'-'), name, category:'search',
    create(){
      let arr=[], target=null, done=false, stats={steps:0, comps:0}, rng=Math.random, hi={};
      return {
        init(seed, size){ rng=rndSeeded(seed); arr = Data.sortedArray(size, rng); target = arr[Math.floor(rng()*arr.length)]; done=false; stats={steps:0, comps:0}; hi={}; core.init?.(arr, target); },
        step(){ if(done) return; const ev = core.step(arr, target, hi, stats); stats.steps++; if(ev==='visit') SFX.visit(); if(core.finished?.()) { done=true; SFX.done(); } },
        draw(ctx){ clear(ctx); drawBars(ctx, arr, hi); },
        get finished(){ return done; },
        get stats(){ return stats; }
      };
    }
  };
}

// Linear Search
register(makeSearchAlgo('Linear Search', (()=>{
  let i=0;
  return {
    init(){ i=0; },
    step(a, t, hi, st){ if(i>=a.length) return 'done'; st.comps++; hi[i] = a[i]===t ? COLORS.good : COLORS.hi; if(a[i]===t) return 'done'; i++; return 'visit'; },
    finished(){ return false; }
  };
})()));

// Binary Search
register(makeSearchAlgo('Binary Search', (()=>{
  let l=0, r=0;
  return {
    init(a){ l=0; r=a.length-1; },
    step(a, t, hi, st){ if(l>r) return 'done'; const m=(l+r>>1); st.comps++; hi[m]=COLORS.hi; if(a[m]===t){ hi[m]=COLORS.good; return 'done'; } if(a[m]<t) l=m+1; else r=m-1; return 'visit'; },
    finished(){ return false; }
  };
})()));

// Jump Search
register(makeSearchAlgo('Jump Search', (()=>{
  let step=0, prev=0, i=0, n=0;
  return {
    init(a){ n=a.length; step=Math.floor(Math.sqrt(n)); prev=0; i=0; },
    step(a,t,hi,st){ if(prev>=n) return 'done'; const blockEnd = Math.min(n-1, prev+step-1); st.comps++; hi[blockEnd]=COLORS.hi; if(a[blockEnd] >= t){ // linear within
        for(i=prev; i<=blockEnd; i++){ st.comps++; hi[i]=COLORS.hi; if(a[i]===t){ hi[i]=COLORS.good; return 'done'; } }
        return 'done';
      } else { prev += step; if(prev>=n) return 'done'; return 'visit'; }
    },
    finished(){ return false; }
  };
})()));

// Interpolation Search
register(makeSearchAlgo('Interpolation Search', (()=>{
  let l=0, r=0;
  return {
    init(a){ l=0; r=a.length-1; },
    step(a,t,hi,st){ if(l>r || a[l]===a[r]) return 'done'; const pos = l + Math.floor((t-a[l])*(r-l)/(a[r]-a[l])); const m=clamp(pos, l, r); st.comps++; hi[m]=COLORS.hi; if(a[m]===t){ hi[m]=COLORS.good; return 'done'; } if(a[m] < t) l=m+1; else r=m-1; return 'visit'; },
    finished(){ return false; }
  };
})()));

// ========================= Graph Algorithms =========================
function key(x,y){ return `${x},${y}`; }
function makeGridAlgo(name, core){
  return { id: name.toLowerCase().replace(/\s+/g,'-'), name, category:'graph',
    create(){
      let grid, start, goal, visited, frontier, cameFrom, done=false, rng=Math.random;
      return {
        init(seed){ rng=rndSeeded(seed); grid = Data.grid(20, rng); start={x:0,y:0}; goal={x:grid.size-1,y:grid.size-1}; visited=new Set(); frontier=[]; cameFrom=new Map(); done=false; core.init?.({grid,start,goal,visited,frontier,cameFrom}); },
        step(){ if(done) return; const ev = core.step({grid,start,goal,visited,frontier,cameFrom}); if(ev==='visit') SFX.visit(); if(core.finished?.({grid,start,goal,visited,frontier,cameFrom})) { done=true; SFX.done(); } },
        draw(ctx){ clear(ctx); const pathSet = (done? reconstructPath(cameFrom, start, goal):null); drawGrid(ctx, grid, visited, pathSet); },
        get finished(){ return done; },
        get stats(){ return { visited: visited.size }; }
      };
    }
  };
}
function reconstructPath(came, start, goal){ const out=new Set(); let cur=goal; const sk=(o)=>key(o.x,o.y); while(cur && sk(cur)!==sk(start)){ const prev = came.get(sk(cur)); if(!prev) break; out.add(sk(cur)); cur=prev; } return out; }

// BFS
register(makeGridAlgo('BFS', {
  init({frontier,start,visited}){ frontier.push(start); visited.add(key(start.x,start.y)); },
  step({grid,frontier,visited,cameFrom,goal}){ if(!frontier.length) return 'done'; const cur=frontier.shift(); if(cur.x===goal.x && cur.y===goal.y) return 'done'; const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; for(const [dx,dy] of dirs){ const nx=cur.x+dx, ny=cur.y+dy; if(nx<0||ny<0||nx>=grid.size||ny>=grid.size) continue; const k=key(nx,ny); if(!visited.has(k)){ visited.add(k); cameFrom.set(k,cur); frontier.push({x:nx,y:ny}); return 'visit'; } } },
}));

// DFS
register(makeGridAlgo('DFS', {
  init({frontier,start}){ frontier.push(start); },
  step({grid,frontier,visited,cameFrom,goal}){ if(!frontier.length) return 'done'; const cur=frontier.pop(); const k0=key(cur.x,cur.y); if(visited.has(k0)) return; visited.add(k0); if(cur.x===goal.x && cur.y===goal.y) return 'done'; const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; for(const [dx,dy] of dirs){ const nx=cur.x+dx, ny=cur.y+dy; if(nx<0||ny<0||nx>=grid.size||ny>=grid.size) continue; const k=key(nx,ny); if(!visited.has(k)){ cameFrom.set(k,cur); frontier.push({x:nx,y:ny}); } } return 'visit'; },
}));

// Dijkstra
register(makeGridAlgo("Dijkstra's", {
  init({frontier,start}){ frontier.push({x:start.x,y:start.y,d:0}); },
  step({grid,frontier,visited,cameFrom,goal}){ if(!frontier.length) return 'done'; let idx=0; for(let i=1;i<frontier.length;i++) if(frontier[i].d<frontier[idx].d) idx=i; const cur=frontier.splice(idx,1)[0]; const k0=key(cur.x,cur.y); if(visited.has(k0)) return; visited.add(k0); if(cur.x===goal.x && cur.y===goal.y) return 'done'; const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; for(const [dx,dy] of dirs){ const nx=cur.x+dx, ny=cur.y+dy; if(nx<0||ny<0||nx>=grid.size||ny>=grid.size) continue; const k=key(nx,ny); if(visited.has(k)) continue; const w=grid.cells.find(c=>c.x===nx&&c.y===ny).w; const nd=(cur.d??0)+w; const ex=frontier.find(n=>n.x===nx&&n.y===ny); if(!ex || nd<ex.d){ if(!ex) frontier.push({x:nx,y:ny,d:nd}); else ex.d=nd; cameFrom.set(k,{x:cur.x,y:cur.y}); } } return 'visit'; },
}));

// A*
register(makeGridAlgo('A* Search', {
  init({frontier,start}){ frontier.push({x:start.x,y:start.y,g:0,f:0}); },
  step({grid,frontier,visited,cameFrom,goal}){ if(!frontier.length) return 'done'; let idx=0; for(let i=1;i<frontier.length;i++) if(frontier[i].f<frontier[idx].f) idx=i; const cur=frontier.splice(idx,1)[0]; const k0=key(cur.x,cur.y); if(visited.has(k0)) return; visited.add(k0); if(cur.x===goal.x && cur.y===goal.y) return 'done'; const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; for(const [dx,dy] of dirs){ const nx=cur.x+dx, ny=cur.y+dy; if(nx<0||ny<0||nx>=grid.size||ny>=grid.size) continue; const w=grid.cells.find(c=>c.x===nx&&c.y===ny).w; const g=(cur.g??0)+w; const h=Math.abs(goal.x-nx)+Math.abs(goal.y-ny); const f=g+h; const k=key(nx,ny); const ex=frontier.find(n=>n.x===nx&&n.y===ny); if(!ex || f<ex.f){ if(!ex) frontier.push({x:nx,y:ny,g,f}); else { ex.g=g; ex.f=f; } cameFrom.set(k,{x:cur.x,y:cur.y}); } } return 'visit'; },
}));

// ========================= Machine Learning =========================
// k-Means
register({ id:'k-means', name:'k-Means Clustering', category:'ml',
  create(){
    let points=[], k=3, centers=[], assign=[], done=false, rng=Math.random, iter=0;
    return {
      init(seed, size){ rng=rndSeeded(seed); points=Data.points(size, rng); k = clamp(Math.round(Math.sqrt(size/12)), 2, 8); centers = Array.from({length:k},()=>({x:rng(),y:rng()})); assign = new Array(points.length).fill(-1); done=false; iter=0; },
      step(){ if(done) return; let changed=false; // assign
        for(let i=0;i<points.length;i++){ let bi=0, bd=Infinity; for(let c=0;c<centers.length;c++){ const dx=points[i].x-centers[c].x, dy=points[i].y-centers[c].y; const d=dx*dx+dy*dy; if(d<bd){ bd=d; bi=c; } } if(assign[i]!==bi){ assign[i]=bi; changed=true; SFX.visit(); } }
        // update
        const sums=Array.from({length:k},()=>({x:0,y:0,n:0})); for(let i=0;i<points.length;i++){ const a=assign[i]; sums[a].x+=points[i].x; sums[a].y+=points[i].y; sums[a].n++; }
        for(let c=0;c<k;c++){ if(sums[c].n>0){ centers[c].x=sums[c].x/sums[c].n; centers[c].y=sums[c].y/sums[c].n; } }
        iter++; if(!changed || iter>60){ done=true; SFX.done(); } },
      draw(ctx){ clear(ctx); const palette=i=>[COLORS.info, COLORS.good, COLORS.hi, '#bbbbbb', '#7f8c8d', '#9b59b6', '#e67e22', '#1abc9c'][i%8]; const pts = points.map((p,i)=>({...p, c: assign[i]===-1? '#ddd' : palette(assign[i])})); drawPoints(ctx, pts, centers.map((c)=>({...c})) ); },
      get finished(){ return done; },
      get stats(){ return { k, iterations: iter }; }
    };
  }
});

// Perceptron (2D line separation)
register({ id:'perceptron', name:'Perceptron (Linear Classifier)', category:'ml',
  create(){
    let points=[], labels=[], w=[Math.random(), Math.random()], b=0, done=false, rng=Math.random, iter=0;
    function sign(z){ return z>=0?1:-1; }
    return {
      init(seed, size){ rng=rndSeeded(seed); points=Data.points(size, rng); // create a random line for labels
        const a=rng()*2-1, c=rng()*2-1; labels = points.map(p => (p.y > a*p.x + c*0.2 ? 1 : -1)); w=[rng()*2-1, rng()*2-1]; b=0; done=false; iter=0; },
      step(){ if(done) return; let errs=0; const lr=0.1; for(let i=0;i<points.length;i++){ const p=points[i]; const y=labels[i]; const yhat = sign(w[0]*p.x + w[1]*p.y + b); if(yhat!==y){ errs++; w[0]+=lr*y*p.x; w[1]+=lr*y*p.y; b+=lr*y; SFX.swap(); } else { SFX.visit(); } } iter++; if(errs===0 || iter>40){ done=true; SFX.done(); } },
      draw(ctx){ clear(ctx); // draw points by label
        drawPoints(ctx, points.map((p,i)=>({...p, c: labels[i]===1? COLORS.good : COLORS.bad}))); // decision boundary
        const {width:wid, height:hei}=ctx.canvas; const x1=0, y1=-(w[0]*(0)+b)/w[1]; const x2=1, y2=-(w[0]*(1)+b)/w[1];
        ctx.strokeStyle = COLORS.info; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x1*wid, y1*hei); ctx.lineTo(x2*wid, y2*hei); ctx.stroke(); },
      get finished(){ return done; },
      get stats(){ return { iterations: iter }; }
    };
  }
});

// ========================= App Runner (single & battle) =========================
const UI = {
  category: document.getElementById('categorySelect'),
  algorithm: document.getElementById('algorithmSelect'),
  speed: document.getElementById('speedSlider'),
  size: document.getElementById('sizeSlider'),
  playPause: document.getElementById('playPauseBtn'),
  reset: document.getElementById('resetBtn'),
  battleBtn: document.getElementById('battleModeBtn'),
  canvasA: document.getElementById('canvas'),
  canvasB: document.getElementById('canvasBattle'),
};

const App = (()=>{
  let ctxA, ctxB, ctrlA=null, ctrlB=null, running=false, last=0, seed=(Math.random()*1e9)|0, doneChimed=false;

  function resize(){ const dpr = Math.max(1, Math.floor(window.devicePixelRatio||1)); for(const c of [UI.canvasA, UI.canvasB]){ if(!c) continue; const rect = c.getBoundingClientRect(); const w = Math.max(600, window.innerWidth - 60); const h = Math.max(360, Math.floor(window.innerHeight*0.65)); c.style.width = (UI.canvasB.style.display==='none' ? w+'px' : (w/2-16)+'px'); c.style.height = h+'px'; c.width = Math.floor(parseFloat(c.style.width)*dpr); c.height = Math.floor(h*dpr); const ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); } ctxA=UI.canvasA.getContext('2d'); if(UI.canvasB.style.display!=='none') ctxB=UI.canvasB.getContext('2d'); }

  function populate(){
    const CATS = [ ['sort','Searching & Sorting'], ['search','Searching'], ['graph','Graph Algorithms'], ['ml','Machine Learning'] ];
    UI.category.innerHTML=''; for(const [id,label] of CATS){ const o=document.createElement('option'); o.value=id; o.textContent=label; UI.category.appendChild(o); }
    updateAlgoList();
  }
  function updateAlgoList(){ UI.algorithm.innerHTML=''; const list = byCategory(UI.category.value); for(const a of list){ const o=document.createElement('option'); o.value=a.id; o.textContent=a.name; UI.algorithm.appendChild(o);} }

  function createControllers(){ const spec = findAlgo(UI.algorithm.value) || byCategory(UI.category.value)[0]; if(!spec) return; const size = parseInt(UI.size.value,10); ctrlA = spec.create(); ctrlA.init(seed, size); if(UI.canvasB.style.display!=='none'){ // battle mode pick alternative
      const list = byCategory(UI.category.value); const alt = list.find(a=>a.id!==spec.id) || spec; ctrlB = alt.create(); ctrlB.init(seed, size); } else ctrlB=null; doneChimed=false; }

  function loop(ts){ if(!running){ last=ts; return requestAnimationFrame(loop); } const dt = clamp((ts-last)/1000 * parseFloat(UI.speed.value), 0, .25); last=ts; if(ctrlA && !ctrlA.finished) ctrlA.step(dt); if(ctrlB && !ctrlB.finished) ctrlB.step(dt);
    ctrlA?.draw(ctxA); if(ctrlB){ ctrlB.draw(ctxB); }
    if((ctrlA?.finished??true) && (!ctrlB || (ctrlB?.finished??true))){ if(!doneChimed){ doneChimed=true; /* SFX.done() fires from controllers */ } running=false; UI.playPause.textContent='Play'; }
    requestAnimationFrame(loop);
  }

  function playPause(){ running = !running; UI.playPause.textContent = running? 'Pause':'Play'; if(running) requestAnimationFrame(loop); }
  function reset(){ seed = (Math.random()*1e9)|0; createControllers(); if(!running){ ctrlA?.draw(ctxA); ctrlB?.draw(ctxB); } }
  function toggleBattle(){ const active = UI.canvasB.style.display !== 'none'; if(active){ UI.canvasB.style.display='none'; } else { UI.canvasB.style.display='block'; } resize(); createControllers(); }

  function init(){ resize(); populate(); createControllers(); ctrlA.draw(ctxA); window.addEventListener('resize', resize);
    UI.category.addEventListener('change', ()=>{ updateAlgoList(); createControllers(); });
    UI.algorithm.addEventListener('change', ()=>{ createControllers(); });
    UI.size.addEventListener('input', ()=>{ createControllers(); });
    UI.playPause.addEventListener('click', playPause);
    UI.reset.addEventListener('click', reset);
    UI.battleBtn.addEventListener('click', toggleBattle);
    requestAnimationFrame(loop);
  }
  return { init };
})();

// Boot
window.addEventListener('DOMContentLoaded', ()=> App.init());
