/*
  Enhanced Algorithm Visualizer with extensive algorithms and features
*/

// ========================= Audio Engine =========================
class AudioEngine {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported");
      this.ctx = null;
    }
  }

  _createTone(type, freq, duration, attack = 0.01, decay = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  compare() { this._createTone('triangle', 800, 0.05); }
  swap() { this._createTone('square', 400, 0.08); }
  access() { this._createTone('sine', 600, 0.04); }
  finish() { this._createTone('sawtooth', 300, 0.3, 0.02, 0.25); }
  error() { this._createTone('sawtooth', 150, 0.15); }
}

// ========================= Utilities =========================
class SeededRNG {
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }
  
  next() {
    this.state = (this.state * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.state / Math.pow(2, 32);
  }
  
  random() { return this.next(); }
  range(min, max) { return min + this.random() * (max - min); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
}

// ========================= Base Algorithm Class =========================
class Algorithm {
  constructor(canvas, sfx, name) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = sfx;
    this.name = name;
    this.isDone = false;
    this.stats = {};
    this.highlights = {};
  }

  init(seed, size) { throw new Error("Must implement init()"); }
  step() { throw new Error("Must implement step()"); }
  draw() { throw new Error("Must implement draw()"); }
  
  get finished() { return this.isDone; }
  
  _clear(color = '#121212') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  _finish() {
    this.isDone = true;
    this.sfx.finish();
  }
}

// ========================= Sorting Algorithms =========================
class SortingAlgorithm extends Algorithm {
  constructor(canvas, sfx, name) {
    super(canvas, sfx, name);
    this.arr = [];
    this.stats = { comparisons: 0, swaps: 0, accesses: 0, steps: 0 };
  }

  init(seed, size) {
    const rng = new SeededRNG(seed);
    this.arr = Array.from({ length: size }, () => rng.int(1, 100));
    this.isDone = false;
    this.stats = { comparisons: 0, swaps: 0, accesses: 0, steps: 0 };
    this.highlights = {};
  }

  draw() {
    this._clear();
    const { width, height } = this.canvas;
    const n = this.arr.length;
    const barWidth = width / n;
    const maxVal = Math.max(...this.arr, 1);

    for (let i = 0; i < n; i++) {
      const barHeight = Math.max(2, (this.arr[i] / maxVal) * (height - 20));
      let color = '#4a4a4a';
      
      if (this.highlights[i]) {
        color = this.highlights[i];
      }
      
      // Gradient effect
      const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, this._darkenColor(color, 0.3));
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(i * barWidth + 1, height - barHeight - 10, Math.max(1, barWidth - 2), barHeight);
      
      // Add glow effect for highlighted bars
      if (this.highlights[i]) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(i * barWidth + 1, height - barHeight - 10, Math.max(1, barWidth - 2), barHeight);
        this.ctx.shadowBlur = 0;
      }
    }
    this.highlights = {};
  }
  
  _darkenColor(color, amount) {
    return color + Math.floor(255 * amount).toString(16).padStart(2, '0');
  }
}

class BubbleSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.i = 0;
    this.j = 0;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;
    
    const n = this.arr.length;
    if (this.i >= n - 1) {
      this._finish();
      return;
    }

    this.highlights[this.j] = '#ff6b6b';
    this.highlights[this.j + 1] = '#ff6b6b';
    
    this.stats.comparisons++;
    this.stats.accesses += 2;
    
    if (this.arr[this.j] > this.arr[this.j + 1]) {
      [this.arr[this.j], this.arr[this.j + 1]] = [this.arr[this.j + 1], this.arr[this.j]];
      this.stats.swaps++;
      this.highlights[this.j] = '#4ecdc4';
      this.highlights[this.j + 1] = '#4ecdc4';
      this.sfx.swap();
    } else {
      this.sfx.compare();
    }

    this.j++;
    if (this.j >= n - 1 - this.i) {
      this.highlights[n - 1 - this.i] = '#45b7d1';
      this.j = 0;
      this.i++;
    }
  }
}

class QuickSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [[0, this.arr.length - 1]];
    this.pivotIndex = -1;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;
    
    if (this.stack.length === 0) {
      this._finish();
      return;
    }

    const [low, high] = this.stack.pop();
    if (low < high) {
      const pi = this._partition(low, high);
      this.stack.push([low, pi - 1]);
      this.stack.push([pi + 1, high]);
      this.pivotIndex = pi;
      this.highlights[pi] = '#45b7d1';
      this.sfx.swap();
    } else {
      this.sfx.access();
    }
  }

  _partition(low, high) {
    const pivot = this.arr[high];
    this.highlights[high] = '#ff9ff3';
    let i = low - 1;

    for (let j = low; j < high; j++) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      this.highlights[j] = '#feca57';
      
      if (this.arr[j] < pivot) {
        i++;
        [this.arr[i], this.arr[j]] = [this.arr[j], this.arr[i]];
        this.stats.swaps++;
        this.highlights[i] = '#48dbfb';
      }
    }
    
    [this.arr[i + 1], this.arr[high]] = [this.arr[high], this.arr[i + 1]];
    this.stats.swaps++;
    return i + 1;
  }
}

class MergeSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [[0, this.arr.length - 1, 'split']];
    this.temp = new Array(this.arr.length);
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;

    if (this.stack.length === 0) {
      this._finish();
      return;
    }

    const [left, right, action] = this.stack.pop();
    
    if (action === 'split') {
      if (left < right) {
        const mid = Math.floor((left + right) / 2);
        this.stack.push([left, right, 'merge']);
        this.stack.push([mid + 1, right, 'split']);
        this.stack.push([left, mid, 'split']);
        this.sfx.access();
      }
    } else if (action === 'merge') {
      const mid = Math.floor((left + right) / 2);
      this._merge(left, mid, right);
      this.sfx.swap();
    }
  }

  _merge(left, mid, right) {
    let i = left, j = mid + 1, k = left;
    
    for (let x = left; x <= right; x++) {
      this.temp[x] = this.arr[x];
      this.highlights[x] = '#54a0ff';
    }

    while (i <= mid && j <= right) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      
      if (this.temp[i] <= this.temp[j]) {
        this.arr[k] = this.temp[i];
        this.highlights[k] = '#5f27cd';
        i++;
      } else {
        this.arr[k] = this.temp[j];
        this.highlights[k] = '#ff9ff3';
        j++;
      }
      k++;
    }

    while (i <= mid) {
      this.arr[k] = this.temp[i];
      this.highlights[k] = '#5f27cd';
      i++; k++;
      this.stats.accesses++;
    }

    while (j <= right) {
      this.arr[k] = this.temp[j];
      this.highlights[k] = '#ff9ff3';
      j++; k++;
      this.stats.accesses++;
    }
  }
}

class HeapSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.heapSize = this.arr.length;
    this.phase = 'build';
    this.i = Math.floor(this.arr.length / 2) - 1;
    this.currentHeapify = [];
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;

    if (this.phase === 'build') {
      if (this.i >= 0) {
        this._heapify(this.i);
        this.i--;
        this.sfx.access();
      } else {
        this.phase = 'sort';
        this.i = this.arr.length - 1;
      }
    } else if (this.phase === 'sort') {
      if (this.i > 0) {
        [this.arr[0], this.arr[this.i]] = [this.arr[this.i], this.arr[0]];
        this.stats.swaps++;
        this.highlights[0] = '#ff6b6b';
        this.highlights[this.i] = '#4ecdc4';
        this.heapSize--;
        this._heapify(0);
        this.i--;
        this.sfx.swap();
      } else {
        this._finish();
      }
    }
  }

  _heapify(i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    this.highlights[i] = '#feca57';

    if (left < this.heapSize) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      this.highlights[left] = '#ff9ff3';
      if (this.arr[left] > this.arr[largest]) largest = left;
    }

    if (right < this.heapSize) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      this.highlights[right] = '#48dbfb';
      if (this.arr[right] > this.arr[largest]) largest = right;
    }

    if (largest !== i) {
      [this.arr[i], this.arr[largest]] = [this.arr[largest], this.arr[i]];
      this.stats.swaps++;
      this.highlights[largest] = '#5f27cd';
      this._heapify(largest);
    }
  }
}

class InsertionSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.i = 1;
    this.j = 1;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;

    if (this.i >= this.arr.length) {
      this._finish();
      return;
    }

    this.highlights[this.j] = '#feca57';
    this.highlights[this.j-1] = '#ff9ff3';
    this.stats.comparisons++;
    this.stats.accesses += 2;

    if (this.j > 0 && this.arr[this.j - 1] > this.arr[this.j]) {
      [this.arr[this.j - 1], this.arr[this.j]] = [this.arr[this.j], this.arr[this.j - 1]];
      this.stats.swaps++;
      this.sfx.swap();
      this.j--;
    } else {
      this.i++;
      this.j = this.i;
      this.sfx.compare();
    }
    
    // Mark sorted portion
    for (let k = 0; k < this.i; k++) {
        this.highlights[k] = '#45b7d1';
    }
  }
}

class SelectionSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.i = 0;
    this.j = 1;
    this.minIndex = 0;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;
    
    const n = this.arr.length;
    if (this.i >= n - 1) {
      this._finish();
      return;
    }

    // Highlight current minimum and the element being compared
    this.highlights[this.minIndex] = '#ff6b6b';
    this.highlights[this.j] = '#feca57';
    
    this.stats.comparisons++;
    this.stats.accesses += 2;

    if (this.arr[this.j] < this.arr[this.minIndex]) {
      this.minIndex = this.j;
    }
    this.sfx.compare();
    this.j++;

    if (this.j >= n) {
      // End of inner loop, perform swap
      [this.arr[this.i], this.arr[this.minIndex]] = [this.arr[this.minIndex], this.arr[this.i]];
      this.stats.swaps++;
      this.highlights[this.i] = '#4ecdc4'; // Mark as swapped
      this.sfx.swap();
      
      this.i++;
      this.minIndex = this.i;
      this.j = this.i + 1;
    }
    
    // Mark sorted portion
    for (let k = 0; k < this.i; k++) {
        this.highlights[k] = '#45b7d1';
    }
  }
}


// ========================= Search Algorithms =========================
class SearchAlgorithm extends Algorithm {
  constructor(canvas, sfx, name) {
    super(canvas, sfx, name);
    this.arr = [];
    this.target = 0;
    this.found = false;
    this.foundIndex = -1;
    this.stats = { comparisons: 0, accesses: 0, steps: 0 };
  }

  init(seed, size) {
    const rng = new SeededRNG(seed);
    this.arr = Array.from({ length: size }, (_, i) => i + 1).sort(() => rng.random() - 0.5);
    this.target = this.arr[rng.int(0, this.arr.length - 1)];
    this.found = false;
    this.foundIndex = -1;
    this.isDone = false;
    this.stats = { comparisons: 0, accesses: 0, steps: 0 };
    this.highlights = {};
  }

  draw() {
    this._clear();
    const { width, height } = this.canvas;
    const n = this.arr.length;
    const barWidth = width / n;
    const maxVal = Math.max(...this.arr, 1);

    // Draw target indicator
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Target: ${this.target}`, 10, 25);

    for (let i = 0; i < n; i++) {
      const barHeight = Math.max(2, (this.arr[i] / maxVal) * (height - 40));
      let color = '#4a4a4a';
      
      if (this.highlights[i]) {
        color = this.highlights[i];
      } else if (this.found && i === this.foundIndex) {
        color = '#00ff00';
      }
      
      this.ctx.fillStyle = color;
      this.ctx.fillRect(i * barWidth + 1, height - barHeight - 10, Math.max(1, barWidth - 2), barHeight);
      
      // Draw value on bar if space allows
      if (barWidth > 15) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.arr[i], i * barWidth + barWidth/2, height - 5);
      }
    }
    this.highlights = {};
  }
}

class LinearSearch extends SearchAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.currentIndex = 0;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;

    if (this.currentIndex >= this.arr.length) {
      this._finish();
      return;
    }

    this.highlights[this.currentIndex] = '#feca57';
    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.arr[this.currentIndex] === this.target) {
      this.found = true;
      this.foundIndex = this.currentIndex;
      this.highlights[this.currentIndex] = '#00ff00';
      this.sfx.finish();
      this._finish();
      return;
    }

    this.sfx.compare();
    this.currentIndex++;
  }
}

class BinarySearch extends SearchAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.arr.sort((a, b) => a - b); // Binary search needs sorted array
    this.left = 0;
    this.right = this.arr.length - 1;
    this.mid = -1;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;

    if (this.left > this.right) {
      this._finish();
      return;
    }

    this.mid = Math.floor((this.left + this.right) / 2);
    this.highlights[this.left] = '#ff9ff3';
    this.highlights[this.right] = '#48dbfb';
    this.highlights[this.mid] = '#feca57';

    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.arr[this.mid] === this.target) {
      this.found = true;
      this.foundIndex = this.mid;
      this.highlights[this.mid] = '#00ff00';
      this.sfx.finish();
      this._finish();
      return;
    }

    if (this.arr[this.mid] < this.target) {
      this.left = this.mid + 1;
    } else {
      this.right = this.mid - 1;
    }

    this.sfx.compare();
  }
}

// ========================= Graph Algorithms =========================
class GraphAlgorithm extends Algorithm {
  constructor(canvas, sfx, name) {
    super(canvas, sfx, name);
    this.gridSize = 30;
    this.grid = [];
    this.visited = new Set();
    this.path = new Set();
    this.stats = { nodesVisited: 0, pathLength: 0, steps: 0 };
  }

  init(seed) {
    const rng = new SeededRNG(seed);
    this.grid = Array.from({ length: this.gridSize }, () =>
      Array.from({ length: this.gridSize }, () => ({
        type: rng.random() < 0.25 ? 'wall' : 'empty'
      }))
    );

    this.start = { x: 1, y: 1 };
    this.goal = { x: this.gridSize - 2, y: this.gridSize - 2 };
    
    this.grid[this.start.y][this.start.x].type = 'empty';
    this.grid[this.goal.y][this.goal.x].type = 'empty';
    
    this.visited.clear();
    this.path.clear();
    this.isDone = false;
    this.stats = { nodesVisited: 0, pathLength: 0, steps: 0 };
  }

  draw() {
    this._clear();
    const { width, height } = this.canvas;
    const cellSize = Math.min(width / this.gridSize, height / this.gridSize);

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const key = `${x},${y}`;
        
        let color = '#2a2a2a';
        if (cell.type === 'wall') color = '#444';
        if (this.visited.has(key)) color = '#4ecdc4';
        if (this.path.has(key)) color = '#ffd700';
        if (x === this.start.x && y === this.start.y) color = '#00ff00';
        if (x === this.goal.x && y === this.goal.y) color = '#ff0000';


        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);

        if (this.path.has(key) || (x === this.start.x && y === this.start.y) || (x === this.goal.x && y === this.goal.y)) {
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 8;
          this.ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
          this.ctx.shadowBlur = 0;
        }
      }
    }
  }
}

class Dijkstra extends GraphAlgorithm {
  init(seed) {
    super.init(seed);
    this.frontier = [{ x: this.start.x, y: this.start.y, dist: 0 }];
    this.cameFrom = new Map();
    this.distances = new Map([[`${this.start.x},${this.start.y}`, 0]]);
  }

  step() {
    if (this.finished || this.frontier.length === 0) {
      if (!this.finished) this._finish();
      return;
    }

    this.stats.steps++;
    this.frontier.sort((a, b) => b.dist - a.dist);
    const current = this.frontier.pop();
    const currentKey = `${current.x},${current.y}`;

    if (this.visited.has(currentKey)) {
      this.sfx.access();
      return;
    }

    this.visited.add(currentKey);
    this.stats.nodesVisited++;
    this.sfx.compare();

    if (current.x === this.goal.x && current.y === this.goal.y) {
      this._reconstructPath();
      this._finish();
      return;
    }

    const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      
      if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && 
          this.grid[ny][nx].type !== 'wall') {
        const neighborKey = `${nx},${ny}`;
        const newDist = current.dist + 1;
        
        if (!this.distances.has(neighborKey) || newDist < this.distances.get(neighborKey)) {
          this.distances.set(neighborKey, newDist);
          this.cameFrom.set(neighborKey, current);
          this.frontier.push({ x: nx, y: ny, dist: newDist });
        }
      }
    }
  }

  _reconstructPath() {
    let currentKey = `${this.goal.x},${this.goal.y}`;
    while (currentKey && this.cameFrom.has(currentKey)) {
      this.path.add(currentKey);
      const prev = this.cameFrom.get(currentKey);
      currentKey = `${prev.x},${prev.y}`;
      this.stats.pathLength++;
    }
    this.path.add(`${this.start.x},${this.start.y}`);
  }
}

class AStar extends GraphAlgorithm {
  init(seed) {
    super.init(seed);
    this.openSet = [{ x: this.start.x, y: this.start.y, f: 0, g: 0, h: 0 }];
    this.closedSet = new Set();
    this.cameFrom = new Map();
  }

  step() {
    if (this.finished || this.openSet.length === 0) {
      if (!this.finished) this._finish();
      return;
    }

    this.stats.steps++;
    this.openSet.sort((a, b) => b.f - a.f);
    const current = this.openSet.pop();
    const currentKey = `${current.x},${current.y}`;

    this.closedSet.add(currentKey);
    this.visited.add(currentKey);
    this.stats.nodesVisited++;
    this.sfx.compare();

    if (current.x === this.goal.x && current.y === this.goal.y) {
      this._reconstructPath();
      this._finish();
      return;
    }

    const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const neighborKey = `${nx},${ny}`;

      if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize && 
          this.grid[ny][nx].type !== 'wall' && !this.closedSet.has(neighborKey)) {
        
        const g = current.g + 1;
        const h = Math.abs(nx - this.goal.x) + Math.abs(ny - this.goal.y);
        const f = g + h;

        const existing = this.openSet.find(node => node.x === nx && node.y === ny);
        if (!existing || g < existing.g) {
          if (existing) {
            existing.g = g;
            existing.f = f;
          } else {
            this.openSet.push({ x: nx, y: ny, f, g, h });
          }
          this.cameFrom.set(neighborKey, current);
        }
      }
    }
  }

  _reconstructPath() {
    let currentKey = `${this.goal.x},${this.goal.y}`;
    while (currentKey && this.cameFrom.has(currentKey)) {
      this.path.add(currentKey);
      const prev = this.cameFrom.get(currentKey);
      currentKey = `${prev.x},${prev.y}`;
      this.stats.pathLength++;
    }
    this.path.add(`${this.start.x},${this.start.y}`);
  }
}

class BFS extends GraphAlgorithm {
    init(seed) {
        super.init(seed);
        this.frontier = [{ x: this.start.x, y: this.start.y }];
        this.cameFrom = new Map();
        this.visited.add(`${this.start.x},${this.start.y}`);
    }

    step() {
        if (this.finished || this.frontier.length === 0) {
            if (!this.finished) this._finish();
            return;
        }

        this.stats.steps++;
        const current = this.frontier.shift(); // Queue behavior
        const currentKey = `${current.x},${current.y}`;
        this.stats.nodesVisited++;
        this.sfx.access();

        if (current.x === this.goal.x && current.y === this.goal.y) {
            this._reconstructPath();
            this._finish();
            return;
        }

        const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of neighbors) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const neighborKey = `${nx},${ny}`;

            if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize &&
                this.grid[ny][nx].type !== 'wall' && !this.visited.has(neighborKey)) {
                
                this.visited.add(neighborKey);
                this.cameFrom.set(neighborKey, current);
                this.frontier.push({ x: nx, y: ny });
            }
        }
    }

    _reconstructPath() {
      let currentKey = `${this.goal.x},${this.goal.y}`;
      while (currentKey && this.cameFrom.has(currentKey)) {
        this.path.add(currentKey);
        const prev = this.cameFrom.get(currentKey);
        currentKey = `${prev.x},${prev.y}`;
        this.stats.pathLength++;
      }
      this.path.add(`${this.start.x},${this.start.y}`);
    }
}

class DFS extends GraphAlgorithm {
    init(seed) {
        super.init(seed);
        this.frontier = [{ x: this.start.x, y: this.start.y }]; // Stack behavior
        this.cameFrom = new Map();
    }

    step() {
        if (this.finished || this.frontier.length === 0) {
            if (!this.finished) this._finish();
            return;
        }

        this.stats.steps++;
        const current = this.frontier.pop(); // Stack behavior
        const currentKey = `${current.x},${current.y}`;
        
        if (this.visited.has(currentKey)) {
            return; // Skip already visited nodes
        }

        this.visited.add(currentKey);
        this.stats.nodesVisited++;
        this.sfx.access();

        if (current.x === this.goal.x && current.y === this.goal.y) {
            this._reconstructPath();
            this._finish();
            return;
        }

        const neighbors = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // Reverse order for more natural visualization
        for (const [dx, dy] of neighbors) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const neighborKey = `${nx},${ny}`;

            if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize &&
                this.grid[ny][nx].type !== 'wall' && !this.visited.has(neighborKey)) {
                
                this.cameFrom.set(neighborKey, current);
                this.frontier.push({ x: nx, y: ny });
            }
        }
    }

    _reconstructPath() {
      let currentKey = `${this.goal.x},${this.goal.y}`;
      while (currentKey && this.cameFrom.has(currentKey)) {
        this.path.add(currentKey);
        const prev = this.cameFrom.get(currentKey);
        currentKey = `${prev.x},${prev.y}`;
        this.stats.pathLength++;
      }
      this.path.add(`${this.start.x},${this.start.y}`);
    }
}


// ========================= Tree Algorithms =========================
class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.x = 0;
    this.y = 0;
    this.visited = false;
  }
}

class TreeAlgorithm extends Algorithm {
  constructor(canvas, sfx, name) {
    super(canvas, sfx, name);
    this.root = null;
    this.nodes = [];
    this.currentNode = null;
    this.traversalOrder = [];
    this.stats = { nodesVisited: 0, steps: 0 };
  }

  init(seed, size) {
    const rng = new SeededRNG(seed);
    const values = Array.from({ length: Math.min(size, 31) }, () => rng.int(1, 99));
    
    this.root = null;
    this.nodes = [];
    this.traversalOrder = [];
    
    // Build BST
    for (const value of values) {
      this.root = this._insertNode(this.root, value);
    }
    
    this._calculatePositions();
    this.isDone = false;
    this.stats = { nodesVisited: 0, steps: 0 };
  }

  _insertNode(root, value) {
    if (!root) {
      const node = new TreeNode(value);
      this.nodes.push(node);
      return node;
    }
    
    if (value < root.value) {
      root.left = this._insertNode(root.left, value);
    } else if (value > root.value) {
      root.right = this._insertNode(root.right, value);
    }
    return root;
  }

  _calculatePositions() {
    if (!this.root) return;
    
    const levels = [];
    const queue = [{ node: this.root, level: 0, position: 0 }];
    
    while (queue.length > 0) {
      const { node, level, position } = queue.shift();
      
      if (!levels[level]) levels[level] = [];
      levels[level].push({ node, position });
      
      if (node.left) queue.push({ node: node.left, level: level + 1, position: position * 2 });
      if (node.right) queue.push({ node: node.right, level: level + 1, position: position * 2 + 1 });
    }

    const { width, height } = this.canvas;
    const levelHeight = height / (levels.length + 1);
    
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const levelWidth = width / (Math.pow(2, i) + 1);
      
      level.forEach(({ node, position }, index) => {
        node.x = (position + 1) * levelWidth;
        node.y = (i + 1) * levelHeight;
      });
    }
  }

  draw() {
    this._clear();
    
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this._drawEdges(this.root);
    
    for (const node of this.nodes) {
      let color = '#4a4a4a';
      if (node === this.currentNode) color = '#feca57';
      if (node.visited) color = '#4ecdc4';
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#fff';
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.value, node.x, node.y + 5);
    }
  }

  _drawEdges(node) {
    if (!node) return;
    
    if (node.left) {
      this.ctx.beginPath();
      this.ctx.moveTo(node.x, node.y);
      this.ctx.lineTo(node.left.x, node.left.y);
      this.ctx.stroke();
      this._drawEdges(node.left);
    }
    
    if (node.right) {
      this.ctx.beginPath();
      this.ctx.moveTo(node.x, node.y);
      this.ctx.lineTo(node.right.x, node.right.y);
      this.ctx.stroke();
      this._drawEdges(node.right);
    }
  }
}

class InOrderTraversal extends TreeAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [];
    this.currentNode = this.root;
  }

  step() {
    if (this.finished) return;
    this.stats.steps++;

    if (!this.currentNode && this.stack.length === 0) {
      this._finish();
      return;
    }

    if (this.currentNode) {
      this.stack.push(this.currentNode);
      this.currentNode = this.currentNode.left;
      this.sfx.access();
    } else {
      this.currentNode = this.stack.pop();
      this.currentNode.visited = true;
      this.traversalOrder.push(this.currentNode.value);
      this.stats.nodesVisited++;
      this.sfx.compare();
      this.currentNode = this.currentNode.right;
    }
  }
}

class PreOrderTraversal extends TreeAlgorithm {
    init(seed, size) {
        super.init(seed, size);
        this.stack = this.root ? [this.root] : [];
    }

    step() {
        if (this.finished) return;
        this.stats.steps++;

        if (this.stack.length === 0) {
            this._finish();
            return;
        }

        this.currentNode = this.stack.pop();
        this.currentNode.visited = true;
        this.traversalOrder.push(this.currentNode.value);
        this.stats.nodesVisited++;
        this.sfx.compare();

        if (this.currentNode.right) {
            this.stack.push(this.currentNode.right);
            this.sfx.access();
        }
        if (this.currentNode.left) {
            this.stack.push(this.currentNode.left);
            this.sfx.access();
        }
    }
}

class PostOrderTraversal extends TreeAlgorithm {
    init(seed, size) {
        super.init(seed, size);
        this.stack1 = this.root ? [this.root] : [];
        this.stack2 = [];
        this.phase = 'traverse';
    }

    step() {
        if (this.finished) return;
        this.stats.steps++;
        
        if (this.phase === 'traverse') {
            if (this.stack1.length > 0) {
                this.currentNode = this.stack1.pop();
                this.stack2.push(this.currentNode);
                this.sfx.access();
                
                if (this.currentNode.left) this.stack1.push(this.currentNode.left);
                if (this.currentNode.right) this.stack1.push(this.currentNode.right);
            } else {
                this.phase = 'visit';
            }
        } else if (this.phase === 'visit') {
            if (this.stack2.length > 0) {
                this.currentNode = this.stack2.pop();
                this.currentNode.visited = true;
                this.traversalOrder.push(this.currentNode.value);
                this.stats.nodesVisited++;
                this.sfx.compare();
            } else {
                this._finish();
            }
        }
    }
}


// ========================= Main Application =========================
const ALGORITHMS = {
  sorting: {
    'bubble-sort': { name: 'Bubble Sort', class: BubbleSort, desc: 'O(n²) - Simple comparison sort' },
    'selection-sort': { name: 'Selection Sort', class: SelectionSort, desc: 'O(n²) - In-place comparison sort' },
    'insertion-sort': { name: 'Insertion Sort', class: InsertionSort, desc: 'O(n²) - Efficient for small/sorted data' },
    'quick-sort': { name: 'Quick Sort', class: QuickSort, desc: 'O(n log n) average - Divide and conquer' },
    'merge-sort': { name: 'Merge Sort', class: MergeSort, desc: 'O(n log n) - Stable divide and conquer' },
    'heap-sort': { name: 'Heap Sort', class: HeapSort, desc: 'O(n log n) - Selection-based using heap' }
  },
  searching: {
    'linear-search': { name: 'Linear Search', class: LinearSearch, desc: 'O(n) - Sequential search' },
    'binary-search': { name: 'Binary Search', class: BinarySearch, desc: 'O(log n) - For sorted arrays' }
  },
  graph: {
    'bfs': { name: 'Breadth-First Search', class: BFS, desc: 'Level-order graph traversal' },
    'dfs': { name: 'Depth-First Search', class: DFS, desc: 'Explores as far as possible' },
    'dijkstra': { name: "Dijkstra's Algorithm", class: Dijkstra, desc: 'Shortest path for weighted graphs' },
    'a-star': { name: 'A* Search', class: AStar, desc: 'Heuristic-based shortest path' }
  },
  tree: {
    'inorder-traversal': { name: 'In-Order Traversal', class: InOrderTraversal, desc: 'Left-Root-Right (sorted for BST)' },
    'preorder-traversal': { name: 'Pre-Order Traversal', class: PreOrderTraversal, desc: 'Root-Left-Right traversal' },
    'postorder-traversal': { name: 'Post-Order Traversal', class: PostOrderTraversal, desc: 'Left-Right-Root traversal' }
  }
};

class App {
  constructor() {
    this.dom = {
      category: document.getElementById('categorySelect'),
      algorithm: document.getElementById('algorithmSelect'),
      speed: document.getElementById('speedSlider'),
      size: document.getElementById('sizeSlider'),
      playPause: document.getElementById('playPauseBtn'),
      reset: document.getElementById('resetBtn'),
      battle: document.getElementById('battleModeBtn'),
      canvasA: document.getElementById('canvas'),
      canvasB: document.getElementById('canvasBattle'),
      main: document.querySelector('main'),
      statsA: document.getElementById('statsA'),
      statsB: document.getElementById('statsB'),
      algoInfoA: document.getElementById('algoInfoA'),
      algoInfoB: document.getElementById('algoInfoB')
    };

    this.sfx = new AudioEngine();
    this.simA = null;
    this.simB = null;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.seed = Date.now();

    this._setupEventListeners();
    this.populateCategories();
    this.updateAlgorithmList();
    this.resetSim();
    this.resizeCanvases();
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  _setupEventListeners() {
    this.dom.category.addEventListener('change', () => {
      this.updateAlgorithmList();
      this.resetSim();
    });
    
    this.dom.algorithm.addEventListener('change', () => this.resetSim());
    this.dom.size.addEventListener('input', () => this.resetSim());
    this.dom.playPause.addEventListener('click', () => this.togglePlayPause());
    this.dom.reset.addEventListener('click', () => this.resetSim(true));
    this.dom.battle.addEventListener('click', () => this.toggleBattleMode());
    window.addEventListener('resize', () => this.resizeCanvases());
    
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'KeyR':
          e.preventDefault();
          this.resetSim(true);
          break;
        case 'KeyB':
          e.preventDefault();
          this.toggleBattleMode();
          break;
      }
    });
  }
  
  populateCategories() {
    const categoryMap = { 
      sorting: '📊 Sorting', 
      searching: '🔍 Searching',
      graph: '🗺️ Pathfinding', 
      tree: '🌳 Tree Traversal'
    };
    
    this.dom.category.innerHTML = Object.keys(ALGORITHMS)
      .map(key => `<option value="${key}">${categoryMap[key] || key}</option>`)
      .join('');
  }
  
  updateAlgorithmList() {
    const category = this.dom.category.value;
    const list = ALGORITHMS[category];
    this.dom.algorithm.innerHTML = Object.entries(list)
      .map(([id, {name}]) => `<option value="${id}">${name}</option>`)
      .join('');
  }

  resetSim(newSeed = false) {
    this.isRunning = false;
    this.dom.playPause.innerHTML = '▶ Play';
    
    if (newSeed) {
      this.seed = Date.now();
    }
    
    const category = this.dom.category.value;
    const algoId = this.dom.algorithm.value;
    const size = parseInt(this.dom.size.value, 10);
    
    const AlgoClass = ALGORITHMS[category][algoId].class;
    const algoInfo = ALGORITHMS[category][algoId];
    
    this.simA = new AlgoClass(this.dom.canvasA, this.sfx, algoInfo.name);
    this.simA.init(this.seed, size);
    
    this.dom.algoInfoA.textContent = `${algoInfo.name} - ${algoInfo.desc}`;
    
    if (this.dom.main.classList.contains('battle-mode')) {
      const list = ALGORITHMS[category];
      const algoIds = Object.keys(list);
      const otherAlgoId = algoIds.find(id => id !== algoId) || algoIds[1] || algoId;
      const OtherAlgoClass = ALGORITHMS[category][otherAlgoId].class;
      const otherAlgoInfo = ALGORITHMS[category][otherAlgoId];
      
      this.simB = new OtherAlgoClass(this.dom.canvasB, this.sfx, otherAlgoInfo.name);
      this.simB.init(this.seed, size);
      this.dom.algoInfoB.textContent = `${otherAlgoInfo.name} - ${otherAlgoInfo.desc}`;
    } else {
      this.simB = null;
      this.dom.algoInfoB.textContent = '';
      this.dom.statsB.innerHTML = '';
    }
    
    this.drawAll();
    this.updateStats();
  }

  togglePlayPause() {
    this.isRunning = !this.isRunning;
    this.dom.playPause.innerHTML = this.isRunning ? '⏸ Pause' : '▶ Play';
  }

  toggleBattleMode() {
    this.dom.main.classList.toggle('battle-mode');
    this.dom.battle.innerHTML = this.dom.main.classList.contains('battle-mode') ? '👁️ Single Mode' : '⚔ Battle Mode';
    this.resizeCanvases();
    this.resetSim();
  }
  
  loop(timestamp) {
    const elapsed = timestamp - this.lastFrameTime;
    const speed = parseFloat(this.dom.speed.value);
    const stepDelay = Math.max(10, 200 - (speed * 35));

    if (this.isRunning && elapsed >= stepDelay) {
      this.lastFrameTime = timestamp;

      let stepped = false;
      if (this.simA && !this.simA.finished) {
        this.simA.step();
        stepped = true;
      }
      
      if (this.simB && !this.simB.finished) {
        this.simB.step();
        stepped = true;
      }

      if (stepped) {
        this.drawAll();
        this.updateStats();
      }
      
      const allFinished = (!this.simA || this.simA.finished) && (!this.simB || this.simB.finished);
      if (allFinished) {
        this.isRunning = false;
        this.dom.playPause.innerHTML = '▶ Play';
      }
    }
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  drawAll() {
    if (this.simA) this.simA.draw();
    if (this.simB) this.simB.draw();
  }
  
  updateStats() {
    if (this.simA) {
      this.dom.statsA.innerHTML = Object.entries(this.simA.stats)
        .map(([key, value]) => `<div>${key}: ${value}</div>`)
        .join('');
    }
    
    if (this.simB) {
      this.dom.statsB.innerHTML = Object.entries(this.simB.stats)
        .map(([key, value]) => `<div>${key}: ${value}</div>`)
        .join('');
    }
  }
  
  resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    
    for (const canvas of [this.dom.canvasA, this.dom.canvasB]) {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }
    
    if (this.simA && this.simA._calculatePositions) {
      this.simA._calculatePositions();
    }
    if (this.simB && this.simB._calculatePositions) {
      this.simB._calculatePositions();
    }
    
    this.drawAll();
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new App();
});