// Seeded Random Number Generator
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
  int(min, max) { return Math.floor(min + this.random() * (max - min + 1)); }
}

// Audio Engine for sound feedback
class AudioEngine {
  constructor() {
    this.enabled = true;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.1;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      this.enabled = false;
    }
  }

  playTone(frequency, duration = 0.1, type = 'sine') {
    if (!this.enabled) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  compare() { this.playTone(800, 0.05); }
  swap() { this.playTone(400, 0.1, 'square'); }
  access() { this.playTone(600, 0.05); }
  complete() { this.playTone(300, 0.3, 'sawtooth'); }
}

// Base Algorithm Class
class Algorithm {
  constructor(canvas, audioEngine, name) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audioEngine;
    this.name = name;
    this.isComplete = false;
    this.stats = {};
    this.highlights = {};
  }

  init(seed, size) { throw new Error('Must implement init()'); }
  step() { throw new Error('Must implement step()'); }
  draw() { throw new Error('Must implement draw()'); }
  
  get finished() { return this.isComplete; }
  
  clear(color = '#0f0f0f') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  finish() {
    this.isComplete = true;
    this.audio.complete();
  }
}

// Sorting Algorithms
class SortingAlgorithm extends Algorithm {
  constructor(canvas, audioEngine, name) {
    super(canvas, audioEngine, name);
    this.array = [];
    this.stats = { comparisons: 0, swaps: 0, accesses: 0, steps: 0 };
  }

  init(seed, size) {
    const rng = new SeededRNG(seed);
    this.array = Array.from({ length: size }, () => rng.int(5, 100));
    this.isComplete = false;
    this.stats = { comparisons: 0, swaps: 0, accesses: 0, steps: 0 };
    this.highlights = {};
  }

  draw() {
    this.clear();
    const { width, height } = this.canvas;
    const barWidth = width / this.array.length;
    const maxValue = Math.max(...this.array);

    for (let i = 0; i < this.array.length; i++) {
      const barHeight = (this.array[i] / maxValue) * (height - 20);
      
      // Default color
      let color = '#4a90e2';
      
      // Apply highlights
      if (this.highlights[i]) {
        color = this.highlights[i];
      }
      
      // Draw bar with gradient
      const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, this.darkenColor(color, 0.3));
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      
      // Add glow for highlighted elements
      if (this.highlights[i]) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 15;
        this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        this.ctx.shadowBlur = 0;
      }
    }
    
    // Clear highlights after drawing
    this.highlights = {};
  }

  darkenColor(color, amount) {
    const colorMap = {
      '#ff6b6b': '#cc5555',
      '#4ecdc4': '#3ba39d',
      '#45b7d1': '#3692a7',
      '#feca57': '#cb9f46',
      '#ff9ff3': '#cc7fc2',
      '#4a90e2': '#3a73b5'
    };
    return colorMap[color] || color;
  }
}

class BubbleSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.i = 0;
    this.j = 0;
    this.n = this.array.length;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.i >= this.n - 1) {
      this.finish();
      return;
    }

    if (this.j >= this.n - 1 - this.i) {
      this.highlights[this.n - 1 - this.i] = '#4ecdc4';
      this.i++;
      this.j = 0;
      return;
    }

    this.highlights[this.j] = '#ff6b6b';
    this.highlights[this.j + 1] = '#ff6b6b';
    
    this.stats.comparisons++;
    this.stats.accesses += 2;
    
    if (this.array[this.j] > this.array[this.j + 1]) {
      [this.array[this.j], this.array[this.j + 1]] = [this.array[this.j + 1], this.array[this.j]];
      this.stats.swaps++;
      this.highlights[this.j] = '#feca57';
      this.highlights[this.j + 1] = '#feca57';
      this.audio.swap();
    } else {
      this.audio.compare();
    }
    
    this.j++;
  }
}

class QuickSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [{low: 0, high: this.array.length - 1}];
    this.currentPivot = -1;
    this.partitionStep = null;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.stack.length === 0) {
      this.finish();
      return;
    }

    const {low, high} = this.stack.pop();
    
    if (low < high) {
      const pivotIndex = this.partition(low, high);
      this.stack.push({low: low, high: pivotIndex - 1});
      this.stack.push({low: pivotIndex + 1, high: high});
      this.highlights[pivotIndex] = '#4ecdc4';
      this.audio.swap();
    }
  }

  partition(low, high) {
    const pivot = this.array[high];
    this.highlights[high] = '#ff9ff3';
    let i = low - 1;

    for (let j = low; j < high; j++) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      this.highlights[j] = '#feca57';
      
      if (this.array[j] < pivot) {
        i++;
        [this.array[i], this.array[j]] = [this.array[j], this.array[i]];
        this.stats.swaps++;
        this.highlights[i] = '#45b7d1';
      }
    }
    
    [this.array[i + 1], this.array[high]] = [this.array[high], this.array[i + 1]];
    this.stats.swaps++;
    return i + 1;
  }
}

class SelectionSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.i = 0;
    this.j = 1;
    this.minIndex = 0;
    this.n = this.array.length;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.i >= this.n - 1) {
      this.finish();
      return;
    }

    if (this.j >= this.n) {
      if (this.minIndex !== this.i) {
        [this.array[this.i], this.array[this.minIndex]] = [this.array[this.minIndex], this.array[this.i]];
        this.stats.swaps++;
        this.audio.swap();
      }
      
      this.highlights[this.i] = '#4ecdc4';
      this.i++;
      this.minIndex = this.i;
      this.j = this.i + 1;
      return;
    }

    this.highlights[this.minIndex] = '#ff6b6b';
    this.highlights[this.j] = '#feca57';
    
    this.stats.comparisons++;
    this.stats.accesses += 2;
    
    if (this.array[this.j] < this.array[this.minIndex]) {
      this.minIndex = this.j;
    }
    
    this.audio.compare();
    this.j++;
  }
}

class InsertionSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.i = 1;
    this.j = 1;
    this.key = 0;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.i >= this.array.length) {
      this.finish();
      return;
    }

    if (this.j === this.i) {
      this.key = this.array[this.i];
      this.highlights[this.i] = '#feca57';
    }

    this.highlights[this.j] = '#ff6b6b';
    this.highlights[this.j - 1] = '#ff6b6b';
    
    this.stats.comparisons++;
    this.stats.accesses += 2;

    if (this.j > 0 && this.array[this.j - 1] > this.key) {
      this.array[this.j] = this.array[this.j - 1];
      this.stats.swaps++;
      this.j--;
      this.audio.swap();
    } else {
      this.array[this.j] = this.key;
      this.highlights[this.j] = '#4ecdc4';
      this.i++;
      this.j = this.i;
      this.audio.compare();
    }
  }
}

class MergeSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [{left: 0, right: this.array.length - 1, phase: 'divide'}];
    this.mergeStack = [];
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.stack.length === 0 && this.mergeStack.length === 0) {
      this.finish();
      return;
    }

    if (this.mergeStack.length > 0) {
      this.performMergeStep();
    } else if (this.stack.length > 0) {
      this.performDivideStep();
    }
  }

  performDivideStep() {
    const {left, right, phase} = this.stack.pop();
    
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      
      if (phase === 'divide') {
        this.stack.push({left, right, phase: 'merge'});
        this.stack.push({left: mid + 1, right, phase: 'divide'});
        this.stack.push({left, right: mid, phase: 'divide'});
      } else if (phase === 'merge') {
        this.mergeStack.push({left, mid, right});
      }
    }
  }

  performMergeStep() {
    const {left, mid, right} = this.mergeStack.pop();
    
    // Highlight the section being merged
    for (let i = left; i <= right; i++) {
      this.highlights[i] = i <= mid ? '#ff6b6b' : '#feca57';
    }
    
    const leftArray = this.array.slice(left, mid + 1);
    const rightArray = this.array.slice(mid + 1, right + 1);
    
    let i = 0, j = 0, k = left;
    
    while (i < leftArray.length && j < rightArray.length) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      
      if (leftArray[i] <= rightArray[j]) {
        this.array[k] = leftArray[i];
        i++;
      } else {
        this.array[k] = rightArray[j];
        j++;
      }
      this.highlights[k] = '#4ecdc4';
      k++;
    }
    
    while (i < leftArray.length) {
      this.array[k] = leftArray[i];
      this.highlights[k] = '#4ecdc4';
      i++;
      k++;
    }
    
    while (j < rightArray.length) {
      this.array[k] = rightArray[j];
      this.highlights[k] = '#4ecdc4';
      j++;
      k++;
    }
    
    this.audio.swap();
  }
}

class HeapSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.n = this.array.length;
    this.phase = 'build';
    this.i = Math.floor(this.n / 2) - 1;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.phase === 'build') {
      if (this.i >= 0) {
        this.heapify(this.n, this.i);
        this.i--;
      } else {
        this.phase = 'sort';
        this.i = this.n - 1;
      }
    } else if (this.phase === 'sort') {
      if (this.i > 0) {
        [this.array[0], this.array[this.i]] = [this.array[this.i], this.array[0]];
        this.stats.swaps++;
        this.highlights[this.i] = '#4ecdc4';
        this.heapify(this.i, 0);
        this.i--;
        this.audio.swap();
      } else {
        this.highlights[0] = '#4ecdc4';
        this.finish();
      }
    }
  }

  heapify(n, i) {
    let largest = i;
    let left = 2 * i + 1;
    let right = 2 * i + 2;

    this.highlights[i] = '#ff6b6b';
    if (left < n) this.highlights[left] = '#feca57';
    if (right < n) this.highlights[right] = '#feca57';

    if (left < n) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      if (this.array[left] > this.array[largest]) {
        largest = left;
      }
    }

    if (right < n) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      if (this.array[right] > this.array[largest]) {
        largest = right;
      }
    }

    if (largest !== i) {
      [this.array[i], this.array[largest]] = [this.array[largest], this.array[i]];
      this.stats.swaps++;
      this.highlights[largest] = '#ff9ff3';
    }
  }
}

// Search Algorithms
class SearchAlgorithm extends Algorithm {
  constructor(canvas, audioEngine, name) {
    super(canvas, audioEngine, name);
    this.array = [];
    this.target = 0;
    this.found = false;
    this.foundIndex = -1;
    this.stats = { comparisons: 0, accesses: 0, steps: 0 };
  }

  init(seed, size) {
    const rng = new SeededRNG(seed);
    this.array = Array.from({ length: size }, (_, i) => i + 1);
    // Shuffle array for unsorted searches
    if (this.name !== 'Binary Search' && this.name !== 'Interpolation Search') {
      for (let i = this.array.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [this.array[i], this.array[j]] = [this.array[j], this.array[i]];
      }
    }
    
    this.target = this.array[rng.int(0, this.array.length - 1)];
    this.found = false;
    this.foundIndex = -1;
    this.isComplete = false;
    this.stats = { comparisons: 0, accesses: 0, steps: 0 };
    this.highlights = {};
  }

  draw() {
    this.clear();
    const { width, height } = this.canvas;
    const barWidth = width / this.array.length;
    const maxValue = Math.max(...this.array);

    // Draw target info
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText(`Target: ${this.target}`, 10, 25);

    for (let i = 0; i < this.array.length; i++) {
      const barHeight = (this.array[i] / maxValue) * (height - 40);
      
      let color = '#4a90e2';
      if (this.found && i === this.foundIndex) {
        color = '#4ecdc4'; // Found
      } else if (this.highlights[i]) {
        color = this.highlights[i];
      }
      
      this.ctx.fillStyle = color;
      this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      
      // Draw value if space allows
      if (barWidth > 20) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.array[i], i * barWidth + barWidth/2, height - 5);
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
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.currentIndex >= this.array.length) {
      this.finish();
      return;
    }

    this.highlights[this.currentIndex] = '#feca57';
    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.array[this.currentIndex] === this.target) {
      this.found = true;
      this.foundIndex = this.currentIndex;
      this.finish();
      return;
    }

    this.audio.compare();
    this.currentIndex++;
  }
}

class BinarySearch extends SearchAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.array.sort((a, b) => a - b);
    this.left = 0;
    this.right = this.array.length - 1;
    this.mid = -1;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.left > this.right) {
      this.finish();
      return;
    }

    this.mid = Math.floor((this.left + this.right) / 2);
    
    this.highlights[this.left] = '#ff9ff3';
    this.highlights[this.right] = '#ff9ff3';
    this.highlights[this.mid] = '#feca57';

    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.array[this.mid] === this.target) {
      this.found = true;
      this.foundIndex = this.mid;
      this.finish();
      return;
    }

    if (this.array[this.mid] < this.target) {
      this.left = this.mid + 1;
    } else {
      this.right = this.mid - 1;
    }

    this.audio.compare();
  }
}

class InterpolationSearch extends SearchAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.array.sort((a, b) => a - b);
    this.low = 0;
    this.high = this.array.length - 1;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.low > this.high || this.target < this.array[this.low] || this.target > this.array[this.high]) {
      this.finish();
      return;
    }

    if (this.low === this.high) {
      if (this.array[this.low] === this.target) {
        this.found = true;
        this.foundIndex = this.low;
      }
      this.finish();
      return;
    }

    // Interpolation formula
    const pos = this.low + Math.floor(((this.target - this.array[this.low]) / (this.array[this.high] - this.array[this.low])) * (this.high - this.low));
    
    this.highlights[this.low] = '#ff9ff3';
    this.highlights[this.high] = '#ff9ff3';
    this.highlights[pos] = '#feca57';

    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.array[pos] === this.target) {
      this.found = true;
      this.foundIndex = pos;
      this.finish();
      return;
    }

    if (this.array[pos] < this.target) {
      this.low = pos + 1;
    } else {
      this.high = pos - 1;
    }

    this.audio.compare();
  }
}

class ExponentialSearch extends SearchAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.array.sort((a, b) => a - b);
    this.phase = 'exponential';
    this.bound = 1;
    this.left = 0;
    this.right = 0;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.phase === 'exponential') {
      if (this.bound >= this.array.length || this.array[Math.min(this.bound, this.array.length - 1)] >= this.target) {
        this.left = Math.floor(this.bound / 2);
        this.right = Math.min(this.bound, this.array.length - 1);
        this.phase = 'binary';
        return;
      }
      
      this.highlights[Math.min(this.bound, this.array.length - 1)] = '#feca57';
      this.stats.accesses++;
      this.stats.comparisons++;
      
      this.bound *= 2;
      this.audio.compare();
    } else if (this.phase === 'binary') {
      if (this.left > this.right) {
        this.finish();
        return;
      }

      const mid = Math.floor((this.left + this.right) / 2);
      
      this.highlights[this.left] = '#ff9ff3';
      this.highlights[this.right] = '#ff9ff3';
      this.highlights[mid] = '#feca57';

      this.stats.accesses++;
      this.stats.comparisons++;

      if (this.array[mid] === this.target) {
        this.found = true;
        this.foundIndex = mid;
        this.finish();
        return;
      }

      if (this.array[mid] < this.target) {
        this.left = mid + 1;
      } else {
        this.right = mid - 1;
      }

      this.audio.compare();
    }
  }
}

// Pathfinding Algorithms
class PathfindingAlgorithm extends Algorithm {
  constructor(canvas, audioEngine, name) {
    super(canvas, audioEngine, name);
    this.gridSize = 40;
    this.grid = [];
    this.start = null;
    this.goal = null;
    this.visited = new Set();
    this.path = [];
    this.stats = { nodesVisited: 0, pathLength: 0, steps: 0 };
  }

  init(seed) {
    const rng = new SeededRNG(seed);
    this.grid = [];
    
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = {
          x, y,
          isWall: rng.random() < 0.3,
          isVisited: false,
          isPath: false,
          distance: Infinity,
          parent: null,
          gScore: Infinity,
          fScore: Infinity,
          hScore: 0
        };
      }
    }

    this.start = this.grid[1][1];
    this.goal = this.grid[this.gridSize - 2][this.gridSize - 2];
    this.start.isWall = false;
    this.goal.isWall = false;

    this.visited.clear();
    this.path = [];
    this.isComplete = false;
    this.stats = { nodesVisited: 0, pathLength: 0, steps: 0 };
  }

  draw() {
    this.clear();
    const { width, height } = this.canvas;
    const cellSize = Math.min(width / this.gridSize, height / this.gridSize);

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;

        let color = '#2a2a2a';
        if (cell.isWall) color = '#666';
        if (cell.isVisited) color = '#4ecdc4';
        if (cell.isPath) color = '#feca57';
        if (cell === this.start) color = '#4CAF50';
        if (cell === this.goal) color = '#F44336';

        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, cellSize - 1, cellSize - 1);
      }
    }
  }

  getNeighbors(cell) {
    const neighbors = [];
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    
    for (const [dx, dy] of directions) {
      const newX = cell.x + dx;
      const newY = cell.y + dy;
      
      if (newX >= 0 && newX < this.gridSize && newY >= 0 && newY < this.gridSize) {
        const neighbor = this.grid[newY][newX];
        if (!neighbor.isWall) {
          neighbors.push(neighbor);
        }
      }
    }
    
    return neighbors;
  }

  reconstructPath(endCell) {
    this.path = [];
    let current = endCell;
    
    while (current && current !== this.start) {
      current.isPath = true;
      this.path.unshift(current);
      current = current.parent;
    }
    
    if (this.start) {
      this.start.isPath = true;
    }
    
    this.stats.pathLength = this.path.length;
  }

  manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  euclideanDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }
}

class BFS extends PathfindingAlgorithm {
  init(seed) {
    super.init(seed);
    this.queue = [this.start];
    this.start.isVisited = true;
    this.start.distance = 0;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.queue.length === 0) {
      this.finish();
      return;
    }

    const current = this.queue.shift();
    this.stats.nodesVisited++;

    if (current === this.goal) {
      this.reconstructPath(current);
      this.finish();
      return;
    }

    const neighbors = this.getNeighbors(current);
    for (const neighbor of neighbors) {
      if (!neighbor.isVisited) {
        neighbor.isVisited = true;
        neighbor.parent = current;
        neighbor.distance = current.distance + 1;
        this.queue.push(neighbor);
      }
    }

    this.audio.access();
  }
}

class DFS extends PathfindingAlgorithm {
  init(seed) {
    super.init(seed);
    this.stack = [this.start];
    this.start.isVisited = true;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.stack.length === 0) {
      this.finish();
      return;
    }

    const current = this.stack.pop();
    this.stats.nodesVisited++;

    if (current === this.goal) {
      this.reconstructPath(current);
      this.finish();
      return;
    }

    const neighbors = this.getNeighbors(current);
    for (const neighbor of neighbors) {
      if (!neighbor.isVisited) {
        neighbor.isVisited = true;
        neighbor.parent = current;
        this.stack.push(neighbor);
      }
    }

    this.audio.access();
  }
}

class AStar extends PathfindingAlgorithm {
  init(seed) {
    super.init(seed);
    this.openSet = [this.start];
    this.closedSet = new Set();
    this.start.gScore = 0;
    this.start.fScore = this.manhattanDistance(this.start, this.goal);
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.openSet.length === 0) {
      this.finish();
      return;
    }

    // Find node with lowest fScore
    let current = this.openSet[0];
    let currentIndex = 0;
    
    for (let i = 1; i < this.openSet.length; i++) {
      if (this.openSet[i].fScore < current.fScore) {
        current = this.openSet[i];
        currentIndex = i;
      }
    }

    // Remove current from openSet
    this.openSet.splice(currentIndex, 1);
    this.closedSet.add(current);
    current.isVisited = true;
    this.stats.nodesVisited++;

    if (current === this.goal) {
      this.reconstructPath(current);
      this.finish();
      return;
    }

    const neighbors = this.getNeighbors(current);
    for (const neighbor of neighbors) {
      if (this.closedSet.has(neighbor)) continue;

      const tentativeGScore = current.gScore + 1;

      if (!this.openSet.includes(neighbor)) {
        this.openSet.push(neighbor);
      } else if (tentativeGScore >= neighbor.gScore) {
        continue;
      }

      neighbor.parent = current;
      neighbor.gScore = tentativeGScore;
      neighbor.fScore = neighbor.gScore + this.manhattanDistance(neighbor, this.goal);
    }

    this.audio.access();
  }
}

class Dijkstra extends PathfindingAlgorithm {
  init(seed) {
    super.init(seed);
    this.unvisited = [];
    
    // Initialize all nodes
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (!this.grid[y][x].isWall) {
          this.unvisited.push(this.grid[y][x]);
        }
      }
    }
    
    this.start.distance = 0;
  }

  step() {
    if (this.isComplete) return;
    
    this.stats.steps++;
    
    if (this.unvisited.length === 0) {
      this.finish();
      return;
    }

    // Find unvisited node with minimum distance
    let current = null;
    let minDistance = Infinity;
    let currentIndex = -1;
    
    for (let i = 0; i < this.unvisited.length; i++) {
      if (this.unvisited[i].distance < minDistance) {
        minDistance = this.unvisited[i].distance;
        current = this.unvisited[i];
        currentIndex = i;
      }
    }

    if (current === null || current.distance === Infinity) {
      this.finish();
      return;
    }

    // Remove current from unvisited
    this.unvisited.splice(currentIndex, 1);
    current.isVisited = true;
    this.stats.nodesVisited++;

    if (current === this.goal) {
      this.reconstructPath(current);
      this.finish();
      return;
    }

    const neighbors = this.getNeighbors(current);
    for (const neighbor of neighbors) {
      if (!neighbor.isVisited) {
        const alt = current.distance + 1;
        if (alt < neighbor.distance) {
          neighbor.distance = alt;
          neighbor.parent = current;
        }
      }
    }

    this.audio.access();
  }
}

// Algorithm Registry
const ALGORITHMS = {
  sorting: {
    'bubble-sort': { name: 'Bubble Sort', class: BubbleSort, desc: 'O(n²) - Simple comparison-based sort' },
    'selection-sort': { name: 'Selection Sort', class: SelectionSort, desc: 'O(n²) - Finds minimum element repeatedly' },
    'insertion-sort': { name: 'Insertion Sort', class: InsertionSort, desc: 'O(n²) - Builds sorted array one element at a time' },
    'quick-sort': { name: 'Quick Sort', class: QuickSort, desc: 'O(n log n) - Efficient divide-and-conquer sort' },
    'merge-sort': { name: 'Merge Sort', class: MergeSort, desc: 'O(n log n) - Stable divide-and-conquer sort' },
    'heap-sort': { name: 'Heap Sort', class: HeapSort, desc: 'O(n log n) - Uses binary heap data structure' }
  },
  searching: {
    'linear-search': { name: 'Linear Search', class: LinearSearch, desc: 'O(n) - Sequential search through array' },
    'binary-search': { name: 'Binary Search', class: BinarySearch, desc: 'O(log n) - Efficient search on sorted array' },
    'interpolation-search': { name: 'Interpolation Search', class: InterpolationSearch, desc: 'O(log log n) - Improved binary search for uniform data' },
    'exponential-search': { name: 'Exponential Search', class: ExponentialSearch, desc: 'O(log n) - Finds range then binary search' }
  },
  pathfinding: {
    'bfs': { name: 'Breadth-First Search', class: BFS, desc: 'Explores all neighbors before going deeper' },
    'dfs': { name: 'Depth-First Search', class: DFS, desc: 'Explores as far as possible before backtracking' },
    'astar': { name: 'A* Search', class: AStar, desc: 'Uses heuristic to find optimal path efficiently' },
    'dijkstra': { name: 'Dijkstra Algorithm', class: Dijkstra, desc: 'Finds shortest path with guaranteed optimality' }
  }
};

// Main Application Class
class AlgorithmVisualizer {
  constructor() {
    this.initializeDOM();
    this.audioEngine = new AudioEngine();
    this.algorithmA = null;
    this.algorithmB = null;
    this.isPlaying = false;
    this.animationId = null;
    this.lastStepTime = 0;
    this.seed = Date.now();

    this.setupEventListeners();
    this.populateControls();
    this.resizeCanvases();
    this.resetAlgorithms();
    this.startAnimationLoop();
  }

  initializeDOM() {
    this.elements = {
      categorySelect: document.getElementById('categorySelect'),
      algorithmSelect: document.getElementById('algorithmSelect'),
      speedSlider: document.getElementById('speedSlider'),
      speedValue: document.getElementById('speedValue'),
      sizeSlider: document.getElementById('sizeSlider'),
      sizeValue: document.getElementById('sizeValue'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      resetBtn: document.getElementById('resetBtn'),
      battleModeBtn: document.getElementById('battleModeBtn'),
      canvasA: document.getElementById('canvas'),
      canvasB: document.getElementById('canvasBattle'),
      main: document.querySelector('main'),
      statsA: document.getElementById('statsA'),
      statsB: document.getElementById('statsB'),
      algoInfoA: document.getElementById('algoInfoA'),
      algoInfoB: document.getElementById('algoInfoB')
    };
  }

  setupEventListeners() {
    this.elements.categorySelect.addEventListener('change', () => {
      this.populateAlgorithms();
      this.resetAlgorithms();
    });

    this.elements.algorithmSelect.addEventListener('change', () => {
      this.resetAlgorithms();
    });

    this.elements.speedSlider.addEventListener('input', (e) => {
      const speed = parseFloat(e.target.value);
      if (speed < 0.1) {
        this.elements.speedValue.textContent = `${(speed * 1000).toFixed(0)}ms`;
      } else {
        this.elements.speedValue.textContent = `${speed.toFixed(2)}x`;
      }
    });

    this.elements.sizeSlider.addEventListener('input', (e) => {
      this.elements.sizeValue.textContent = e.target.value;
      this.resetAlgorithms();
    });

    this.elements.playPauseBtn.addEventListener('click', () => {
      this.togglePlayPause();
    });

    this.elements.resetBtn.addEventListener('click', () => {
      this.resetAlgorithms(true);
    });

    this.elements.battleModeBtn.addEventListener('click', () => {
      this.toggleBattleMode();
    });

    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'KeyR':
          e.preventDefault();
          this.resetAlgorithms(true);
          break;
        case 'KeyB':
          e.preventDefault();
          this.toggleBattleMode();
          break;
      }
    });

    window.addEventListener('resize', () => {
      this.resizeCanvases();
    });
  }

  populateControls() {
    this.elements.categorySelect.innerHTML = Object.keys(ALGORITHMS)
      .map(key => `<option value="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</option>`)
      .join('');

    this.populateAlgorithms();
  }

  populateAlgorithms() {
    const category = this.elements.categorySelect.value;
    const algorithms = ALGORITHMS[category] || {};
    
    this.elements.algorithmSelect.innerHTML = Object.entries(algorithms)
      .map(([key, {name}]) => `<option value="${key}">${name}</option>`)
      .join('');
  }

  resizeCanvases() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    [this.elements.canvasA, this.elements.canvasB].forEach(canvas => {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(devicePixelRatio, devicePixelRatio);
      
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    });

    if (this.algorithmA) this.algorithmA.draw();
    if (this.algorithmB) this.algorithmB.draw();
  }

  resetAlgorithms(newSeed = false) {
    this.isPlaying = false;
    this.elements.playPauseBtn.textContent = '▶ Play';
    
    if (newSeed) {
      this.seed = Date.now();
    }

    const category = this.elements.categorySelect.value;
    const algorithmKey = this.elements.algorithmSelect.value;
    const size = parseInt(this.elements.sizeSlider.value);

    if (!ALGORITHMS[category] || !ALGORITHMS[category][algorithmKey]) {
      return;
    }

    const AlgorithmClass = ALGORITHMS[category][algorithmKey].class;
    const algorithmInfo = ALGORITHMS[category][algorithmKey];

    this.algorithmA = new AlgorithmClass(this.elements.canvasA, this.audioEngine, algorithmInfo.name);
    this.algorithmA.init(this.seed, size);

    this.elements.algoInfoA.textContent = `${algorithmInfo.name} - ${algorithmInfo.desc}`;

    if (this.elements.main.classList.contains('battle-mode')) {
      const algorithmKeys = Object.keys(ALGORITHMS[category]);
      const otherKey = algorithmKeys.find(key => key !== algorithmKey) || algorithmKeys[0];
      const OtherAlgorithmClass = ALGORITHMS[category][otherKey].class;
      const otherInfo = ALGORITHMS[category][otherKey];

      this.algorithmB = new OtherAlgorithmClass(this.elements.canvasB, this.audioEngine, otherInfo.name);
      this.algorithmB.init(this.seed, size);
      this.elements.algoInfoB.textContent = `${otherInfo.name} - ${otherInfo.desc}`;
    } else {
      this.algorithmB = null;
      this.elements.algoInfoB.textContent = '';
      this.elements.statsB.innerHTML = '';
    }

    this.drawAlgorithms();
    this.updateStats();
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    this.elements.playPauseBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
    
    if (this.isPlaying) {
      this.lastStepTime = performance.now();
    }
  }

  toggleBattleMode() {
    this.elements.main.classList.toggle('battle-mode');
    const isBattleMode = this.elements.main.classList.contains('battle-mode');
    this.elements.battleModeBtn.textContent = isBattleMode ? '🎯 Single Mode' : '⚔ Battle Mode';
    
    this.resizeCanvases();
    this.resetAlgorithms();
  }

  drawAlgorithms() {
    if (this.algorithmA) this.algorithmA.draw();
    if (this.algorithmB) this.algorithmB.draw();
  }

  updateStats() {
    if (this.algorithmA) {
      this.elements.statsA.innerHTML = Object.entries(this.algorithmA.stats)
        .map(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `<div><strong>${formattedKey}:</strong> ${value}</div>`;
        })
        .join('');
    }

    if (this.algorithmB) {
      this.elements.statsB.innerHTML = Object.entries(this.algorithmB.stats)
        .map(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `<div><strong>${formattedKey}:</strong> ${value}</div>`;
        })
        .join('');
    }
  }

  startAnimationLoop() {
    const animate = (currentTime) => {
      const speed = parseFloat(this.elements.speedSlider.value);
      let stepInterval;
      
      if (speed < 0.1) {
        // Very slow speeds - use millisecond intervals
        stepInterval = speed * 10000; // Convert to proper millisecond range
      } else {
        // Normal speeds
        stepInterval = Math.max(10, 200 / speed);
      }

      if (this.isPlaying && currentTime - this.lastStepTime >= stepInterval) {
        let hasActiveAlgorithm = false;

        if (this.algorithmA && !this.algorithmA.finished) {
          this.algorithmA.step();
          hasActiveAlgorithm = true;
        }

        if (this.algorithmB && !this.algorithmB.finished) {
          this.algorithmB.step();
          hasActiveAlgorithm = true;
        }

        if (hasActiveAlgorithm) {
          this.drawAlgorithms();
          this.updateStats();
          this.lastStepTime = currentTime;
        } else {
          this.isPlaying = false;
          this.elements.playPauseBtn.textContent = '▶ Play';
        }
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate(0);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AlgorithmVisualizer();
});