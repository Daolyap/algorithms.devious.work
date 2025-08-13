/*
  Algorithmic Devious Work — script.js (Refactored)
  A robust, class-based architecture for better state management, readability, and extensibility.
*/

// ========================= Core Classes =========================

/**
 * Manages audio playback using the Web Audio API.
 * Encapsulates the AudioContext to keep it clean.
 */
class AudioEngine {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.2; // Master volume
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.");
      this.ctx = null;
    }
  }

  // Plays a procedural sound effect.
  _blip(type = 'sine', frequency = 440, duration = 0.05, attack = 0.01) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Public methods for specific sounds
  swap() { this._blip('triangle', 520, 0.05); }
  visit() { this._blip('sine', 340, 0.04); }
  finish() { this._blip('sawtooth', 660, 0.18); }
}

/**
 * Generates seeded random numbers for deterministic results.
 */
class SeededRNG {
  constructor(seed) {
    this.seed = seed;
    this.mulberry32 = this._initialize(seed);
  }
  _initialize(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  random() { return this.mulberry32(); }
}

// ========================= Base Algorithm Class =========================

class Algorithm {
  constructor(canvas, sfx) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = sfx;
    this.isDone = false;
    this.stats = {};
  }

  // Must be implemented by subclasses
  init(seed, size) { throw new Error("init() must be implemented by subclass."); }
  step() { throw new Error("step() must be implemented by subclass."); }
  draw() { throw new Error("draw() must be implemented by subclass."); }
  
  get finished() { return this.isDone; }

  // Helper to clear the canvas
  _clear() {
    this.ctx.fillStyle = '#202020';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// ========================= Sorting & Searching Algorithms =========================

class SortingAlgorithm extends Algorithm {
  constructor(canvas, sfx) {
    super(canvas, sfx);
    this.arr = [];
    this.highlights = {};
    this.stats = { comparisons: 0, swaps: 0, steps: 0 };
  }

  init(seed, size) {
    const rng = new SeededRNG(seed).random;
    this.arr = Array.from({ length: size }, () => 1 + Math.floor(rng() * 99));
    this.isDone = false;
    this.stats = { comparisons: 0, swaps: 0, steps: 0 };
    this.highlights = {};
  }

  draw() {
    this._clear();
    const { width, height } = this.canvas;
    const n = this.arr.length;
    const barWidth = width / n;
    const maxVal = Math.max(...this.arr, 1);

    for (let i = 0; i < n; i++) {
      const barHeight = Math.max(2, (this.arr[i] / maxVal) * (height - 4));
      this.ctx.fillStyle = this.highlights[i] || '#999';
      this.ctx.fillRect(i * barWidth + 1, height - barHeight - 2, Math.max(1, barWidth - 2), barHeight);
    }
    this.highlights = {}; // Reset highlights after drawing
  }
  
  _finish() {
    this.isDone = true;
    this.sfx.finish();
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
    const n = this.arr.length;
    if (this.i >= n - 1) {
      this._finish();
      return;
    }

    this.highlights[this.j] = '#f1c40f';
    this.highlights[this.j + 1] = '#f1c40f';
    this.stats.comparisons++;
    if (this.arr[this.j] > this.arr[this.j + 1]) {
      [this.arr[this.j], this.arr[this.j + 1]] = [this.arr[this.j + 1], this.arr[this.j]];
      this.stats.swaps++;
      this.sfx.swap();
    } else {
      this.sfx.visit();
    }
    
    this.j++;
    if (this.j >= n - 1 - this.i) {
      this.highlights[n-1-this.i] = '#2ecc71'; // Mark as sorted
      this.j = 0;
      this.i++;
    }
  }
}

class QuickSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [[0, this.arr.length - 1]];
  }

  step() {
    if (this.finished) return;
    if (this.stack.length === 0) {
      this._finish();
      return;
    }

    const [low, high] = this.stack.pop();
    if (low < high) {
        const pivotIndex = this._partition(low, high);
        this.stack.push([low, pivotIndex - 1]);
        this.stack.push([pivotIndex + 1, high]);
        this.sfx.swap();
    } else {
        this.sfx.visit();
    }
  }

  _partition(low, high) {
    const pivot = this.arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      this.stats.comparisons++;
      if (this.arr[j] < pivot) {
        i++;
        [this.arr[i], this.arr[j]] = [this.arr[j], this.arr[i]];
        this.stats.swaps++;
      }
    }
    [this.arr[i + 1], this.arr[high]] = [this.arr[high], this.arr[i + 1]];
    this.stats.swaps++;
    return i + 1;
  }
}

// ... other sorting/searching algorithms would follow the same class pattern

// ========================= Graph Algorithms =========================

class GridAlgorithm extends Algorithm {
  constructor(canvas, sfx) {
    super(canvas, sfx);
    this.gridSize = 25;
    this.grid = [];
    this.visited = new Set();
    this.path = new Set();
  }

  init(seed) {
    const rng = new SeededRNG(seed).random;
    this.grid = Array.from({ length: this.gridSize }, () =>
      Array.from({ length: this.gridSize }, () => ({
        weight: 1 + Math.floor(rng() * 9),
      }))
    );
    this.startNode = { x: 0, y: 0 };
    this.goalNode = { x: this.gridSize - 1, y: this.gridSize - 1 };
    this.isDone = false;
    this.visited.clear();
    this.path.clear();
  }

  draw() {
    this._clear();
    const { width, height } = this.canvas;
    const cellSize = Math.min(width / this.gridSize, height / this.gridSize);

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const key = `${x},${y}`;
        const cell = this.grid[y][x];
        const lightness = 26 + cell.weight * 4;
        this.ctx.fillStyle = `hsl(0, 0%, ${lightness}%)`;
        if (this.path.has(key)) {
          this.ctx.fillStyle = '#2ecc71'; // Path color
        } else if (this.visited.has(key)) {
          this.ctx.fillStyle = '#3498db'; // Visited color
        }
        this.ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
}

class Dijkstra extends GridAlgorithm {
    init(seed) {
        super.init(seed);
        this.frontier = [{ ...this.startNode, dist: 0 }]; // Priority queue
        this.cameFrom = new Map();
        this.distances = new Map([[`${this.startNode.x},${this.startNode.y}`, 0]]);
    }

    step() {
        if (this.finished || this.frontier.length === 0) {
            if (!this.finished) this._finish();
            return;
        }

        // Simple (but slow) priority queue: find node with smallest distance
        this.frontier.sort((a, b) => b.dist - a.dist);
        const current = this.frontier.pop();
        const currentKey = `${current.x},${current.y}`;

        if (this.visited.has(currentKey)) {
          this.sfx.visit(); // Visit but already seen
          return;
        }
        this.visited.add(currentKey);
        this.sfx.swap(); // A more significant "processing" sound

        if (current.x === this.goalNode.x && current.y === this.goalNode.y) {
            this._reconstructPath();
            this._finish();
            return;
        }

        const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of neighbors) {
            const nx = current.x + dx, ny = current.y + dy;
            if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                const neighborKey = `${nx},${ny}`;
                const newDist = current.dist + this.grid[ny][nx].weight;
                if (!this.distances.has(neighborKey) || newDist < this.distances.get(neighborKey)) {
                    this.distances.set(neighborKey, newDist);
                    this.cameFrom.set(neighborKey, current);
                    this.frontier.push({ x: nx, y: ny, dist: newDist });
                }
            }
        }
    }
    
    _reconstructPath() {
      let currentKey = `${this.goalNode.x},${this.goalNode.y}`;
      while (currentKey && this.cameFrom.has(currentKey)) {
        this.path.add(currentKey);
        const prev = this.cameFrom.get(currentKey);
        currentKey = `${prev.x},${prev.y}`;
      }
    }
}

// ========================= Machine Learning Algorithms =========================
class KMeans extends Algorithm {
    init(seed, size) {
        const rng = new SeededRNG(seed).random;
        this.k = 5; // Fixed k for simplicity
        this.points = Array.from({ length: size }, () => ({ x: rng(), y: rng(), cluster: -1 }));
        this.centroids = Array.from({ length: this.k }, () => ({ x: rng(), y: rng() }));
        this.isDone = false;
        this.iterations = 0;
        this.sfx.swap();
    }

    step() {
        if (this.finished) return;
        let changed = false;

        // Assignment step
        for (const point of this.points) {
            let bestDist = Infinity, newCluster = -1;
            for (let i = 0; i < this.k; i++) {
                const dist = Math.hypot(point.x - this.centroids[i].x, point.y - this.centroids[i].y);
                if (dist < bestDist) {
                    bestDist = dist;
                    newCluster = i;
                }
            }
            if (point.cluster !== newCluster) {
                point.cluster = newCluster;
                changed = true;
            }
        }
        this.sfx.visit();
        
        // Update step
        const sums = Array.from({ length: this.k }, () => ({ x: 0, y: 0, count: 0 }));
        for (const point of this.points) {
            if (point.cluster !== -1) {
                sums[point.cluster].x += point.x;
                sums[point.cluster].y += point.y;
                sums[point.cluster].count++;
            }
        }
        for (let i = 0; i < this.k; i++) {
            if (sums[i].count > 0) {
                this.centroids[i] = { x: sums[i].x / sums[i].count, y: sums[i].y / sums[i].count };
            }
        }
        
        this.iterations++;
        if (!changed || this.iterations > 50) {
            this.isDone = true;
            this.sfx.finish();
        }
    }

    draw() {
        this._clear();
        const { width, height } = this.canvas;
        const colors = ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6'];

        // Draw points
        for (const point of this.points) {
            this.ctx.fillStyle = point.cluster === -1 ? '#777' : colors[point.cluster % colors.length];
            this.ctx.beginPath();
            this.ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw centroids
        for (let i = 0; i < this.k; i++) {
            this.ctx.strokeStyle = colors[i % colors.length];
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.centroids[i].x * width, this.centroids[i].y * height, 8, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
}


// ========================= Main App Controller =========================

const ALGORITHMS = {
  sorting: {
    'bubble-sort': { name: 'Bubble Sort', class: BubbleSort },
    'quick-sort': { name: 'Quick Sort', class: QuickSort },
  },
  graph: {
    'dijkstra': { name: "Dijkstra's", class: Dijkstra },
  },
  ml: {
      'k-means': {name: 'k-Means Clustering', class: KMeans},
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
    };

    this.sfx = new AudioEngine();
    this.simA = null;
    this.simB = null;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.seed = (Math.random() * 1e9) | 0;

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
  }
  
  populateCategories() {
      const categoryMap = { sorting: 'Sorting', graph: 'Graph', ml: 'Machine Learning'};
      this.dom.category.innerHTML = Object.keys(ALGORITHMS)
        .map(key => `<option value="${key}">${categoryMap[key]}</option>`)
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
    this.dom.playPause.textContent = 'Play';
    if (newSeed) {
      this.seed = (Math.random() * 1e9) | 0;
    }
    
    const category = this.dom.category.value;
    const algoId = this.dom.algorithm.value;
    const size = parseInt(this.dom.size.value, 10);
    
    const AlgoClass = ALGORITHMS[category][algoId].class;
    this.simA = new AlgoClass(this.dom.canvasA, this.sfx);
    this.simA.init(this.seed, size);
    
    if (this.dom.main.classList.contains('battle-mode')) {
      const list = ALGORITHMS[category];
      const otherAlgoId = Object.keys(list).find(id => id !== algoId) || algoId;
      const OtherAlgoClass = ALGORITHMS[category][otherAlgoId].class;
      this.simB = new OtherAlgoClass(this.dom.canvasB, this.sfx);
      this.simB.init(this.seed, size);
    } else {
      this.simB = null;
    }
    
    this.drawAll();
  }

  togglePlayPause() {
    this.isRunning = !this.isRunning;
    this.dom.playPause.textContent = this.isRunning ? 'Pause' : 'Play';
  }

  toggleBattleMode() {
    this.dom.main.classList.toggle('battle-mode');
    this.resizeCanvases();
    this.resetSim();
  }
  
  loop(timestamp) {
    const elapsed = timestamp - this.lastFrameTime;
    const speed = parseFloat(this.dom.speed.value);
    // The delay determines how many milliseconds must pass before the next step.
    // Lower delay = faster simulation. speed=1 -> 150ms, speed=4 -> ~10ms
    const stepDelay = 160 - (speed * 37.5);

    if (this.isRunning && elapsed >= stepDelay) {
      this.lastFrameTime = timestamp;

      if (this.simA && !this.simA.finished) this.simA.step();
      if (this.simB && !this.simB.finished) this.simB.step();

      this.drawAll();
      
      const allFinished = (!this.simA || this.simA.finished) && (!this.simB || this.simB.finished);
      if (allFinished) {
        this.isRunning = false;
        this.dom.playPause.textContent = 'Play';
      }
    }
    requestAnimationFrame((t) => this.loop(t));
  }
  
  drawAll() {
    this.simA?.draw();
    this.simB?.draw();
  }
  
  resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [this.dom.canvasA, this.dom.canvasB]) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }
    this.drawAll(); // Redraw after resize
  }
}

// Boot up the application
window.addEventListener('DOMContentLoaded', () => new App());