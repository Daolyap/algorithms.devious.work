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
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// Enhanced Audio Engine
class AudioEngine {
  constructor() {
    this.enabled = true;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.05;
      this.masterGain.connect(this.audioContext.destination);
      this.activeOscillators = new Set();
    } catch (e) {
      this.enabled = false;
    }
  }

  playTone(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
    if (!this.enabled || this.activeOscillators.size > 10) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);

    this.activeOscillators.add(oscillator);
    oscillator.addEventListener('ended', () => {
      this.activeOscillators.delete(oscillator);
    });
  }

  // Sound effects
  compare() { this.playTone(800, 0.05, 'sine', 0.2); }
  swap() { this.playTone(400, 0.1, 'square', 0.3); }
  access() { this.playTone(600, 0.05, 'triangle', 0.15); }
  complete() { this.playTone(300, 0.3, 'sawtooth', 0.4); }
  found() { this.playTone(1000, 0.2, 'sine', 0.5); }
  push() { this.playTone(500, 0.08, 'square', 0.25); }
  pop() { this.playTone(700, 0.08, 'triangle', 0.25); }
  insert() { this.playTone(650, 0.1, 'sine', 0.3); }
  delete() { this.playTone(350, 0.12, 'sawtooth', 0.3); }

  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }
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
    this.colors = {
      primary: '#4a90e2',
      compare: '#ff6b6b',
      swap: '#feca57',
      sorted: '#4ecdc4',
      current: '#ff9ff3',
      secondary: '#45b7d1',
      background: '#0f0f0f',
      text: '#ffffff'
    };
  }

  init(seed, size) { throw new Error('Must implement init()'); }
  step() { throw new Error('Must implement step()'); }
  draw() { throw new Error('Must implement draw()'); }

  get finished() { return this.isComplete; }

  clear(color = this.colors.background) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  finish() {
    this.isComplete = true;
    this.audio.complete();
  }

  darkenColor(color, amount = 0.3) {
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

  drawGradientBar(x, y, width, height, color) {
    const gradient = this.ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.3));

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, width, height);

    // Add glow effect
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.shadowBlur = 0;
  }
}

// SORTING ALGORITHMS
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
      let color = this.highlights[i] || this.colors.primary;

      this.drawGradientBar(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight,
        color
      );
    }

    this.highlights = {};
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
      this.highlights[this.n - 1 - this.i] = this.colors.sorted;
      this.i++;
      this.j = 0;
      return;
    }

    this.highlights[this.j] = this.colors.compare;
    this.highlights[this.j + 1] = this.colors.compare;

    this.stats.comparisons++;
    this.stats.accesses += 2;

    if (this.array[this.j] > this.array[this.j + 1]) {
      [this.array[this.j], this.array[this.j + 1]] = [this.array[this.j + 1], this.array[this.j]];
      this.stats.swaps++;
      this.highlights[this.j] = this.colors.swap;
      this.highlights[this.j + 1] = this.colors.swap;
      this.audio.swap();
    } else {
      this.audio.compare();
    }

    this.j++;
  }
}

class CocktailSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.start = 0;
    this.end = this.array.length - 1;
    this.swapped = true;
    this.direction = 1; // 1 for forward, -1 for backward
    this.i = 0;
  }

  step() {
    if (this.isComplete || !this.swapped) return;

    this.stats.steps++;

    if (this.start >= this.end) {
      this.finish();
      return;
    }

    this.swapped = false;

    if (this.direction === 1) {
      if (this.i < this.end) {
        this.highlights[this.i] = this.colors.compare;
        this.highlights[this.i + 1] = this.colors.compare;

        this.stats.comparisons++;
        this.stats.accesses += 2;

        if (this.array[this.i] > this.array[this.i + 1]) {
          [this.array[this.i], this.array[this.i + 1]] = [this.array[this.i + 1], this.array[this.i]];
          this.stats.swaps++;
          this.swapped = true;
          this.highlights[this.i] = this.colors.swap;
          this.highlights[this.i + 1] = this.colors.swap;
          this.audio.swap();
        } else {
          this.audio.compare();
        }

        this.i++;
      } else {
        this.end--;
        this.highlights[this.end + 1] = this.colors.sorted;
        this.direction = -1;
        this.i = this.end;
      }
    } else {
      if (this.i > this.start) {
        this.highlights[this.i] = this.colors.compare;
        this.highlights[this.i - 1] = this.colors.compare;

        this.stats.comparisons++;
        this.stats.accesses += 2;

        if (this.array[this.i] < this.array[this.i - 1]) {
          [this.array[this.i], this.array[this.i - 1]] = [this.array[this.i - 1], this.array[this.i]];
          this.stats.swaps++;
          this.swapped = true;
          this.highlights[this.i] = this.colors.swap;
          this.highlights[this.i - 1] = this.colors.swap;
          this.audio.swap();
        } else {
          this.audio.compare();
        }

        this.i--;
      } else {
        this.start++;
        this.highlights[this.start - 1] = this.colors.sorted;
        this.direction = 1;
        this.i = this.start;
      }
    }
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

      this.highlights[this.i] = this.colors.sorted;
      this.i++;
      this.minIndex = this.i;
      this.j = this.i + 1;
      return;
    }

    this.highlights[this.minIndex] = this.colors.compare;
    this.highlights[this.j] = this.colors.swap;

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
      this.highlights[this.i] = this.colors.swap;
    }

    this.highlights[this.j] = this.colors.compare;
    this.highlights[this.j - 1] = this.colors.compare;

    this.stats.comparisons++;
    this.stats.accesses += 2;

    if (this.j > 0 && this.array[this.j - 1] > this.key) {
      this.array[this.j] = this.array[this.j - 1];
      this.stats.swaps++;
      this.j--;
      this.audio.swap();
    } else {
      this.array[this.j] = this.key;
      this.highlights[this.j] = this.colors.sorted;
      this.i++;
      this.j = this.i;
      this.audio.compare();
    }
  }
}

class ShellSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.n = this.array.length;
    this.gap = Math.floor(this.n / 2);
    this.i = this.gap;
    this.temp = 0;
    this.j = 0;
  }

  step() {
    if (this.isComplete) return;

    this.stats.steps++;

    if (this.gap === 0) {
      this.finish();
      return;
    }

    if (this.i >= this.n) {
      this.gap = Math.floor(this.gap / 2);
      this.i = this.gap;
      return;
    }

    this.temp = this.array[this.i];
    this.j = this.i;

    this.highlights[this.i] = this.colors.current;

    while (this.j >= this.gap && this.array[this.j - this.gap] > this.temp) {
      this.highlights[this.j] = this.colors.compare;
      this.highlights[this.j - this.gap] = this.colors.compare;

      this.array[this.j] = this.array[this.j - this.gap];
      this.stats.comparisons++;
      this.stats.accesses += 2;
      this.stats.swaps++;
      this.j -= this.gap;
      this.audio.swap();
    }

    this.array[this.j] = this.temp;
    this.highlights[this.j] = this.colors.sorted;
    this.i++;
    this.audio.compare();
  }
}

class QuickSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.stack = [{low: 0, high: this.array.length - 1}];
    this.currentPivot = -1;
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
      this.highlights[pivotIndex] = this.colors.sorted;
      this.audio.swap();
    }
  }

  partition(low, high) {
    const pivot = this.array[high];
    this.highlights[high] = this.colors.current;
    let i = low - 1;

    for (let j = low; j < high; j++) {
      this.stats.comparisons++;
      this.stats.accesses += 2;
      this.highlights[j] = this.colors.swap;

      if (this.array[j] < pivot) {
        i++;
        [this.array[i], this.array[j]] = [this.array[j], this.array[i]];
        this.stats.swaps++;
        this.highlights[i] = this.colors.secondary;
      }
    }

    [this.array[i + 1], this.array[high]] = [this.array[high], this.array[i + 1]];
    this.stats.swaps++;
    return i + 1;
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

    for (let i = left; i <= right; i++) {
      this.highlights[i] = i <= mid ? this.colors.compare : this.colors.swap;
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
      this.highlights[k] = this.colors.sorted;
      k++;
    }

    while (i < leftArray.length) {
      this.array[k] = leftArray[i];
      this.highlights[k] = this.colors.sorted;
      i++;
      k++;
    }

    while (j < rightArray.length) {
      this.array[k] = rightArray[j];
      this.highlights[k] = this.colors.sorted;
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
        this.highlights[this.i] = this.colors.sorted;
        this.heapify(this.i, 0);
        this.i--;
        this.audio.swap();
      } else {
        this.highlights[0] = this.colors.sorted;
        this.finish();
      }
    }
  }

  heapify(n, i) {
    let largest = i;
    let left = 2 * i + 1;
    let right = 2 * i + 2;

    this.highlights[i] = this.colors.compare;
    if (left < n) this.highlights[left] = this.colors.swap;
    if (right < n) this.highlights[right] = this.colors.swap;

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
      this.highlights[largest] = this.colors.current;
    }
  }
}

class CountingSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.max = Math.max(...this.array);
    this.count = new Array(this.max + 1).fill(0);
    this.output = new Array(this.array.length);
    this.phase = 'count';
    this.i = 0;
  }

  step() {
    if (this.isComplete) return;

    this.stats.steps++;

    if (this.phase === 'count') {
      if (this.i < this.array.length) {
        this.count[this.array[this.i]]++;
        this.highlights[this.i] = this.colors.current;
        this.stats.accesses++;
        this.i++;
        this.audio.access();
      } else {
        this.phase = 'cumulative';
        this.i = 1;
      }
    } else if (this.phase === 'cumulative') {
      if (this.i <= this.max) {
        this.count[this.i] += this.count[this.i - 1];
        this.i++;
      } else {
        this.phase = 'output';
        this.i = this.array.length - 1;
      }
    } else if (this.phase === 'output') {
      if (this.i >= 0) {
        this.output[this.count[this.array[this.i]] - 1] = this.array[this.i];
        this.count[this.array[this.i]]--;
        this.highlights[this.i] = this.colors.swap;
        this.stats.accesses++;
        this.i--;
        this.audio.swap();
      } else {
        this.array = [...this.output];
        this.highlights = {};
        for (let j = 0; j < this.array.length; j++) {
          this.highlights[j] = this.colors.sorted;
        }
        this.finish();
      }
    }
  }
}

class RadixSort extends SortingAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.max = Math.max(...this.array);
    this.exp = 1;
    this.phase = 'sort';
  }

  step() {
    if (this.isComplete) return;

    this.stats.steps++;

    if (Math.floor(this.max / this.exp) > 0) {
      this.countingSortByDigit();
      this.exp *= 10;
      this.audio.swap();
    } else {
      for (let i = 0; i < this.array.length; i++) {
        this.highlights[i] = this.colors.sorted;
      }
      this.finish();
    }
  }

  countingSortByDigit() {
    const output = new Array(this.array.length);
    const count = new Array(10).fill(0);

    for (let i = 0; i < this.array.length; i++) {
      count[Math.floor(this.array[i] / this.exp) % 10]++;
      this.highlights[i] = this.colors.current;
      this.stats.accesses++;
    }

    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1];
    }

    for (let i = this.array.length - 1; i >= 0; i--) {
      output[count[Math.floor(this.array[i] / this.exp) % 10] - 1] = this.array[i];
      count[Math.floor(this.array[i] / this.exp) % 10]--;
      this.highlights[i] = this.colors.swap;
      this.stats.swaps++;
    }

    this.array = [...output];
  }
}

// SEARCH ALGORITHMS
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

    if (this.name !== 'Binary Search' && this.name !== 'Interpolation Search') {
      this.array = rng.shuffle(this.array);
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

    this.ctx.fillStyle = this.colors.compare;
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText(`Target: ${this.target}`, 10, 25);

    for (let i = 0; i < this.array.length; i++) {
      const barHeight = (this.array[i] / maxValue) * (height - 40);

      let color = this.colors.primary;
      if (this.found && i === this.foundIndex) {
        color = this.colors.sorted;
      } else if (this.highlights[i]) {
        color = this.highlights[i];
      }

      this.drawGradientBar(i * barWidth, height - barHeight, barWidth - 1, barHeight, color);

      if (barWidth > 20) {
        this.ctx.fillStyle = this.colors.text;
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

    this.highlights[this.currentIndex] = this.colors.swap;
    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.array[this.currentIndex] === this.target) {
      this.found = true;
      this.foundIndex = this.currentIndex;
      this.audio.found();
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

    this.highlights[this.left] = this.colors.current;
    this.highlights[this.right] = this.colors.current;
    this.highlights[this.mid] = this.colors.swap;

    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.array[this.mid] === this.target) {
      this.found = true;
      this.foundIndex = this.mid;
      this.audio.found();
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

class JumpSearch extends SearchAlgorithm {
  init(seed, size) {
    super.init(seed, size);
    this.array.sort((a, b) => a - b);
    this.step_size = Math.floor(Math.sqrt(this.array.length));
    this.prev = 0;
    this.curr = 0;
    this.phase = 'jump';
  }

  step() {
    if (this.isComplete) return;

    this.stats.steps++;

    if (this.phase === 'jump') {
      this.curr = Math.min(this.prev + this.step_size, this.array.length) - 1;

      this.highlights[this.curr] = this.colors.swap;
      this.stats.accesses++;
      this.stats.comparisons++;

      if (this.array[this.curr] < this.target) {
        this.prev = this.curr + 1;
        if (this.prev >= this.array.length) {
          this.finish();
          return;
        }
        this.audio.compare();
      } else {
        this.phase = 'linear';
        this.curr = this.prev;
      }
    } else if (this.phase === 'linear') {
      if (this.curr <= Math.min(this.prev + this.step_size - 1, this.array.length - 1)) {
        this.highlights[this.curr] = this.colors.current;
        this.stats.accesses++;
        this.stats.comparisons++;

        if (this.array[this.curr] === this.target) {
          this.found = true;
          this.foundIndex = this.curr;
          this.audio.found();
          this.finish();
          return;
        }

        this.curr++;
        this.audio.compare();
      } else {
        this.finish();
      }
    }
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
        this.audio.found();
      }
      this.finish();
      return;
    }

    const pos = this.low + Math.floor(((this.target - this.array[this.low]) / (this.array[this.high] - this.array[this.low])) * (this.high - this.low));

    this.highlights[this.low] = this.colors.current;
    this.highlights[this.high] = this.colors.current;
    this.highlights[pos] = this.colors.swap;

    this.stats.accesses++;
    this.stats.comparisons++;

    if (this.array[pos] === this.target) {
      this.found = true;
      this.foundIndex = pos;
      this.audio.found();
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

      this.highlights[Math.min(this.bound, this.array.length - 1)] = this.colors.swap;
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

      this.highlights[this.left] = this.colors.current;
      this.highlights[this.right] = this.colors.current;
      this.highlights[mid] = this.colors.swap;

      this.stats.accesses++;
      this.stats.comparisons++;

      if (this.array[mid] === this.target) {
        this.found = true;
        this.foundIndex = mid;
        this.audio.found();
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

// DATA STRUCTURE VISUALIZATIONS
class StackVisualization extends Algorithm {
  constructor(canvas, audioEngine, name) {
    super(canvas, audioEngine, name);
    this.stack = [];
    this.operations = [];
    this.currentOp = 0;
    this.stats = { pushes: 0, pops: 0, operations: 0 };
    this.maxSize = 20;
  }

  init(seed, size = 15) {
    const rng = new SeededRNG(seed);
    this.stack = [];
    this.operations = [];
    this.currentOp = 0;
    this.stats = { pushes: 0, pops: 0, operations: 0 };

    // Generate a sequence of push/pop operations
    for (let i = 0; i < size; i++) {
      if (this.stack.length === 0 || (this.stack.length < this.maxSize && rng.random() > 0.3)) {
        this.operations.push({ type: 'push', value: rng.int(1, 99) });
      } else {
        this.operations.push({ type: 'pop' });
      }
    }

    this.isComplete = false;
    this.highlights = {};
  }

  step() {
    if (this.isComplete || this.currentOp >= this.operations.length) return;

    this.stats.operations++;
    const op = this.operations[this.currentOp];

    if (op.type === 'push' && this.stack.length < this.maxSize) {
      this.stack.push(op.value);
      this.stats.pushes++;
      this.highlights[this.stack.length - 1] = this.colors.swap;
      this.audio.push();
    } else if (op.type === 'pop' && this.stack.length > 0) {
      this.highlights[this.stack.length - 1] = this.colors.compare;
      this.stack.pop();
      this.stats.pops++;
      this.audio.pop();
    }

    this.currentOp++;

    if (this.currentOp >= this.operations.length) {
      this.finish();
    }
  }

  draw() {
    this.clear();
    const { width, height } = this.canvas;
    const elementHeight = 30;
    const elementWidth = 80;
    const startX = width / 2 - elementWidth / 2;
    const startY = height - 50;

    // Draw stack base
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fillRect(startX - 10, startY, elementWidth + 20, 5);

    // Draw stack elements
    for (let i = 0; i < this.stack.length; i++) {
      const y = startY - (i + 1) * elementHeight;
      let color = this.highlights[i] || this.colors.secondary;

      this.drawGradientBar(startX, y, elementWidth, elementHeight - 2, color);

      // Draw value text
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.stack[i], startX + elementWidth/2, y + elementHeight/2 + 5);
    }

    // Draw operation info
    if (this.currentOp < this.operations.length) {
      const op = this.operations[this.currentOp];
      this.ctx.fillStyle = this.colors.swap;
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Next: ${op.type.toUpperCase()}${op.value ? ` ${op.value}` : ''}`, 10, 25);
    }

    this.highlights = {};
  }
}

class QueueVisualization extends Algorithm {
  constructor(canvas, audioEngine, name) {
    super(canvas, audioEngine, name);
    this.queue = [];
    this.operations = [];
    this.currentOp = 0;
    this.stats = { enqueues: 0, dequeues: 0, operations: 0 };
    this.maxSize = 15;
  }

  init(seed, size = 15) {
    const rng = new SeededRNG(seed);
    this.queue = [];
    this.operations = [];
    this.currentOp = 0;
    this.stats = { enqueues: 0, dequeues: 0, operations: 0 };

    for (let i = 0; i < size; i++) {
      if (this.queue.length === 0 || (this.queue.length < this.maxSize && rng.random() > 0.3)) {
        this.operations.push({ type: 'enqueue', value: rng.int(1, 99) });
      } else {
        this.operations.push({ type: 'dequeue' });
      }
    }

    this.isComplete = false;
    this.highlights = {};
  }

  step() {
    if (this.isComplete || this.currentOp >= this.operations.length) return;

    this.stats.operations++;
    const op = this.operations[this.currentOp];

    if (op.type === 'enqueue' && this.queue.length < this.maxSize) {
      this.queue.push(op.value);
      this.stats.enqueues++;
      this.highlights[this.queue.length - 1] = this.colors.swap;
      this.audio.push();
    } else if (op.type === 'dequeue' && this.queue.length > 0) {
      this.highlights[0] = this.colors.compare;
      this.queue.shift();
      this.stats.dequeues++;
      this.audio.pop();
    }

    this.currentOp++;

    if (this.currentOp >= this.operations.length) {
      this.finish();
    }
  }

  draw() {
    this.clear();
    const { width, height } = this.canvas;
    const elementWidth = 60;
    const elementHeight = 40;
    const startY = height / 2 - elementHeight / 2;
    const spacing = 5;
    const totalWidth = this.queue.length * (elementWidth + spacing);
    const startX = Math.max(10, (width - totalWidth) / 2);

    // Draw queue elements
    for (let i = 0; i < this.queue.length; i++) {
      const x = startX + i * (elementWidth + spacing);
      let color = this.highlights[i] || this.colors.secondary;

      if (i === 0) color = this.colors.compare; // Front
      if (i === this.queue.length - 1) color = this.colors.current; // Rear

      this.drawGradientBar(x, startY, elementWidth, elementHeight, color);

      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.queue[i], x + elementWidth/2, startY + elementHeight/2 + 5);
    }

    // Draw front/rear labels
    if (this.queue.length > 0) {
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('FRONT', startX + elementWidth/2, startY - 10);
      if (this.queue.length > 1) {
        const rearX = startX + (this.queue.length - 1) * (elementWidth + spacing);
        this.ctx.fillText('REAR', rearX + elementWidth/2, startY - 10);
      }
    }

    // Draw operation info
    if (this.currentOp < this.operations.length) {
      const op = this.operations[this.currentOp];
      this.ctx.fillStyle = this.colors.swap;
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Next: ${op.type.toUpperCase()}${op.value ? ` ${op.value}` : ''}`, 10, 25);
    }

    this.highlights = {};
  }
}

// PATHFINDING ALGORITHMS (Enhanced)
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
          isWall: rng.random() < 0.25, // Reduced wall density
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

    // Ensure there's always a path by creating corridors
    this.ensurePath(rng);

    this.visited.clear();
    this.path = [];
    this.isComplete = false;
    this.stats = { nodesVisited: 0, pathLength: 0, steps: 0 };
  }

  ensurePath(rng) {
    // Create random corridors to ensure connectivity
    for (let i = 0; i < 5; i++) {
      const startX = rng.int(1, this.gridSize - 2);
      const startY = rng.int(1, this.gridSize - 2);
      const length = rng.int(5, 15);
      const direction = rng.int(0, 3); // 0: right, 1: down, 2: left, 3: up

      let x = startX, y = startY;
      for (let j = 0; j < length; j++) {
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
          this.grid[y][x].isWall = false;
        }

        switch (direction) {
          case 0: x++; break;
          case 1: y++; break;
          case 2: x--; break;
          case 3: y--; break;
        }
      }
    }
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
        if (cell.isVisited) color = this.colors.sorted;
        if (cell.isPath) color = this.colors.swap;
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

    let current = this.openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < this.openSet.length; i++) {
      if (this.openSet[i].fScore < current.fScore) {
        current = this.openSet[i];
        currentIndex = i;
      }
    }

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
    'bubble-sort': {
      name: 'Bubble Sort',
      class: BubbleSort,
      desc: 'O(n²) - Simple comparison-based sort with adjacent swaps',
      complexity: { time: 'O(n²)', space: 'O(1)' }
    },
    'cocktail-sort': {
      name: 'Cocktail Sort',
      class: CocktailSort,
      desc: 'O(n²) - Bidirectional bubble sort, also known as Shaker Sort',
      complexity: { time: 'O(n²)', space: 'O(1)' }
    },
    'selection-sort': {
      name: 'Selection Sort',
      class: SelectionSort,
      desc: 'O(n²) - Finds minimum element and places it in correct position',
      complexity: { time: 'O(n²)', space: 'O(1)' }
    },
    'insertion-sort': {
      name: 'Insertion Sort',
      class: InsertionSort,
      desc: 'O(n²) - Builds sorted array one element at a time',
      complexity: { time: 'O(n²)', space: 'O(1)' }
    },
    'shell-sort': {
      name: 'Shell Sort',
      class: ShellSort,
      desc: 'O(n³/²) - Improved insertion sort using gap sequences',
      complexity: { time: 'O(n³/²)', space: 'O(1)' }
    },
    'quick-sort': {
      name: 'Quick Sort',
      class: QuickSort,
      desc: 'O(n log n) - Efficient divide-and-conquer partitioning sort',
      complexity: { time: 'O(n log n)', space: 'O(log n)' }
    },
    'merge-sort': {
      name: 'Merge Sort',
      class: MergeSort,
      desc: 'O(n log n) - Stable divide-and-conquer sort with guaranteed performance',
      complexity: { time: 'O(n log n)', space: 'O(n)' }
    },
    'heap-sort': {
      name: 'Heap Sort',
      class: HeapSort,
      desc: 'O(n log n) - Uses binary heap data structure for sorting',
      complexity: { time: 'O(n log n)', space: 'O(1)' }
    },
    'counting-sort': {
      name: 'Counting Sort',
      class: CountingSort,
      desc: 'O(n+k) - Non-comparison sort using frequency counting',
      complexity: { time: 'O(n+k)', space: 'O(k)' }
    },
    'radix-sort': {
      name: 'Radix Sort',
      class: RadixSort,
      desc: 'O(d×(n+k)) - Non-comparison sort processing digits',
      complexity: { time: 'O(d×(n+k))', space: 'O(n+k)' }
    }
  },
  searching: {
    'linear-search': {
      name: 'Linear Search',
      class: LinearSearch,
      desc: 'O(n) - Sequential search through unsorted data',
      complexity: { time: 'O(n)', space: 'O(1)' }
    },
    'binary-search': {
      name: 'Binary Search',
      class: BinarySearch,
      desc: 'O(log n) - Efficient search on sorted arrays using divide-and-conquer',
      complexity: { time: 'O(log n)', space: 'O(1)' }
    },
    'jump-search': {
      name: 'Jump Search',
      class: JumpSearch,
      desc: 'O(√n) - Block-based search with optimal jump size',
      complexity: { time: 'O(√n)', space: 'O(1)' }
    },
    'interpolation-search': {
      name: 'Interpolation Search',
      class: InterpolationSearch,
      desc: 'O(log log n) - Improved binary search using value-based position estimation',
      complexity: { time: 'O(log log n)', space: 'O(1)' }
    },
    'exponential-search': {
      name: 'Exponential Search',
      class: ExponentialSearch,
      desc: 'O(log n) - Finds range exponentially then applies binary search',
      complexity: { time: 'O(log n)', space: 'O(1)' }
    }
  },
  'data-structures': {
    'stack': {
      name: 'Stack Operations',
      class: StackVisualization,
      desc: 'LIFO - Last In First Out data structure with push/pop operations',
      complexity: { time: 'O(1)', space: 'O(n)' }
    },
    'queue': {
      name: 'Queue Operations',
      class: QueueVisualization,
      desc: 'FIFO - First In First Out data structure with enqueue/dequeue operations',
      complexity: { time: 'O(1)', space: 'O(n)' }
    }
  },
  pathfinding: {
    'bfs': {
      name: 'Breadth-First Search',
      class: BFS,
      desc: 'Explores neighbors level by level, guarantees shortest path',
      complexity: { time: 'O(V+E)', space: 'O(V)' }
    },
    'dfs': {
      name: 'Depth-First Search',
      class: DFS,
      desc: 'Explores as far as possible before backtracking',
      complexity: { time: 'O(V+E)', space: 'O(V)' }
    },
    'astar': {
      name: 'A* Search',
      class: AStar,
      desc: 'Heuristic search algorithm that finds optimal path efficiently',
      complexity: { time: 'O(E)', space: 'O(V)' }
    },
    'dijkstra': {
      name: 'Dijkstra Algorithm',
      class: Dijkstra,
      desc: 'Finds shortest path with guaranteed optimality using distance relaxation',
      complexity: { time: 'O(V²)', space: 'O(V)' }
    }
  }
};

// Enhanced Main Application Class
class AlgorithmVisualizer {
  constructor() {
    this.showLoadingScreen();
    this.initializeDOM();
    this.audioEngine = new AudioEngine();
    this.algorithmA = null;
    this.algorithmB = null;
    this.isPlaying = false;
    this.animationId = null;
    this.lastStepTime = 0;
    this.seed = Date.now();
    this.settings = {
      showComplexity: true,
      enableSound: true,
      darkMode: true,
      showKeyboardShortcuts: false,
      highContrast: false,
      volume: 30
    };

    this.setupEventListeners();
    this.populateControls();
    this.resizeCanvases();
    this.resetAlgorithms();
    this.startAnimationLoop();
    this.hideLoadingScreen();
  }

  initializeDOM() {
    this.elements = {
      // Loading
      loadingScreen: document.getElementById('loadingScreen'),

      // Main controls
      categorySelect: document.getElementById('categorySelect'),
      algorithmSelect: document.getElementById('algorithmSelect'),
      speedSlider: document.getElementById('speedSlider'),
      speedValue: document.getElementById('speedValue'),
      sizeSlider: document.getElementById('sizeSlider'),
      sizeValue: document.getElementById('sizeValue'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      resetBtn: document.getElementById('resetBtn'),
      battleModeBtn: document.getElementById('battleModeBtn'),

      // Settings and help
      settingsBtn: document.getElementById('settingsBtn'),
      helpBtn: document.getElementById('helpBtn'),
      fullscreenBtn: document.getElementById('fullscreenBtn'),

      // Canvases and main content
      canvasA: document.getElementById('canvas'),
      canvasB: document.getElementById('canvasBattle'),
      main: document.querySelector('.main-content'),

      // Stats and info
      statsA: document.getElementById('statsA'),
      statsB: document.getElementById('statsB'),
      algoInfoA: document.getElementById('algoInfoA'),
      algoInfoB: document.getElementById('algoInfoB'),
      performanceA: document.getElementById('performanceA'),
      performanceB: document.getElementById('performanceB'),

      // Modal panels
      keyboardShortcuts: document.getElementById('keyboardShortcuts'),
      settingsPanel: document.getElementById('settingsPanel'),
      helpPanel: document.getElementById('helpPanel'),
      backdrop: document.getElementById('backdrop'),

      // Settings controls
      showComplexity: document.getElementById('showComplexity'),
      enableSound: document.getElementById('enableSound'),
      showKeyboardShortcutsCheck: document.getElementById('showKeyboardShortcuts'),
      highContrast: document.getElementById('highContrast'),
      volumeSlider: document.getElementById('volumeSlider'),
      volumeValue: document.getElementById('volumeValue'),
      resetSettings: document.getElementById('resetSettings'),
      closeSettings: document.getElementById('closeSettings'),
      closeHelp: document.getElementById('closeHelp')
    };
  }

  setupEventListeners() {
    // Main controls
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

    // Settings and help buttons
    this.elements.settingsBtn.addEventListener('click', () => {
      this.showModal('settings');
    });

    this.elements.helpBtn.addEventListener('click', () => {
      this.showModal('help');
    });

    this.elements.fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Modal controls
    this.elements.backdrop.addEventListener('click', () => {
      this.hideModal();
    });

    this.elements.closeSettings.addEventListener('click', () => {
      this.hideModal();
    });

    this.elements.closeHelp.addEventListener('click', () => {
      this.hideModal();
    });

    // Settings controls
    this.elements.showComplexity.addEventListener('change', (e) => {
      this.settings.showComplexity = e.target.checked;
      this.resetAlgorithms();
    });

    this.elements.enableSound.addEventListener('change', (e) => {
      this.settings.enableSound = e.target.checked;
      this.audioEngine.setVolume(e.target.checked ? this.settings.volume / 100 * 0.05 : 0);
    });

    this.elements.showKeyboardShortcutsCheck.addEventListener('change', (e) => {
      this.settings.showKeyboardShortcuts = e.target.checked;
      this.toggleKeyboardShortcuts();
    });

    this.elements.highContrast.addEventListener('change', (e) => {
      this.settings.highContrast = e.target.checked;
      document.body.classList.toggle('high-contrast', e.target.checked);
    });

    this.elements.volumeSlider.addEventListener('input', (e) => {
      this.settings.volume = parseInt(e.target.value);
      this.elements.volumeValue.textContent = `${this.settings.volume}%`;
      if (this.settings.enableSound) {
        this.audioEngine.setVolume(this.settings.volume / 100 * 0.05);
      }
    });

    this.elements.resetSettings.addEventListener('click', () => {
      this.resetSettingsToDefaults();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

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
        case 'KeyM':
          e.preventDefault();
          this.toggleSound();
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'KeyH':
          e.preventDefault();
          this.showModal('help');
          break;
        case 'Escape':
          e.preventDefault();
          this.hideModal();
          break;
      }
    });

    window.addEventListener('resize', () => {
      this.resizeCanvases();
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target === this.elements.backdrop) {
        this.hideModal();
      }
    });
  }

  populateControls() {
    const categoryOptions = Object.keys(ALGORITHMS).map(key => {
      const displayName = key.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return `<option value="${key}">${displayName}</option>`;
    }).join('');

    this.elements.categorySelect.innerHTML = categoryOptions;
    this.populateAlgorithms();
  }

  populateAlgorithms() {
    const category = this.elements.categorySelect.value;
    const algorithms = ALGORITHMS[category] || {};

    const algorithmOptions = Object.entries(algorithms).map(([key, {name}]) =>
      `<option value="${key}">${name}</option>`
    ).join('');

    this.elements.algorithmSelect.innerHTML = algorithmOptions;
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
    const btnIcon = this.elements.playPauseBtn.querySelector('.btn-icon');
    const btnText = this.elements.playPauseBtn.querySelector('.btn-text');
    btnIcon.textContent = '▶';
    btnText.textContent = 'Play';

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

    const complexityInfo = this.settings.showComplexity ?
      ` | Time: ${algorithmInfo.complexity.time} Space: ${algorithmInfo.complexity.space}` : '';
    this.elements.algoInfoA.textContent = `${algorithmInfo.name} - ${algorithmInfo.desc}${complexityInfo}`;

    if (this.elements.main.classList.contains('battle-mode')) {
      const algorithmKeys = Object.keys(ALGORITHMS[category]);
      const otherKey = algorithmKeys.find(key => key !== algorithmKey) || algorithmKeys[0];
      const OtherAlgorithmClass = ALGORITHMS[category][otherKey].class;
      const otherInfo = ALGORITHMS[category][otherKey];

      this.algorithmB = new OtherAlgorithmClass(this.elements.canvasB, this.audioEngine, otherInfo.name);
      this.algorithmB.init(this.seed, size);

      const otherComplexityInfo = this.settings.showComplexity ?
        ` | Time: ${otherInfo.complexity.time} Space: ${otherInfo.complexity.space}` : '';
      this.elements.algoInfoB.textContent = `${otherInfo.name} - ${otherInfo.desc}${otherComplexityInfo}`;
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
    const btnIcon = this.elements.playPauseBtn.querySelector('.btn-icon');
    const btnText = this.elements.playPauseBtn.querySelector('.btn-text');

    if (this.isPlaying) {
      btnIcon.textContent = '⏸';
      btnText.textContent = 'Pause';
      this.lastStepTime = performance.now();
    } else {
      btnIcon.textContent = '▶';
      btnText.textContent = 'Play';
    }
  }

  toggleBattleMode() {
    this.elements.main.classList.toggle('battle-mode');
    const isBattleMode = this.elements.main.classList.contains('battle-mode');
    const btnIcon = this.elements.battleModeBtn.querySelector('.btn-icon');
    const btnText = this.elements.battleModeBtn.querySelector('.btn-text');

    if (isBattleMode) {
      btnIcon.textContent = '🎯';
      btnText.textContent = 'Single Mode';
    } else {
      btnIcon.textContent = '⚔';
      btnText.textContent = 'Battle Mode';
    }

    this.resizeCanvases();
    this.resetAlgorithms();
  }

  toggleSound() {
    this.settings.enableSound = !this.settings.enableSound;
    this.audioEngine.setVolume(this.settings.enableSound ? 0.05 : 0);
  }

  drawAlgorithms() {
    if (this.algorithmA) this.algorithmA.draw();
    if (this.algorithmB) this.algorithmB.draw();
  }

  updateStats() {
    const formatStats = (stats) => {
      return Object.entries(stats)
        .map(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          return `<div><strong>${formattedKey}:</strong> <span class="stat-value">${value.toLocaleString()}</span></div>`;
        })
        .join('');
    };

    if (this.algorithmA) {
      this.elements.statsA.innerHTML = formatStats(this.algorithmA.stats);
      this.updatePerformanceIndicator(this.algorithmA, this.elements.performanceA);
    }

    if (this.algorithmB) {
      this.elements.statsB.innerHTML = formatStats(this.algorithmB.stats);
      this.updatePerformanceIndicator(this.algorithmB, this.elements.performanceB);
    }
  }

  startAnimationLoop() {
    const animate = (currentTime) => {
      const speed = parseFloat(this.elements.speedSlider.value);
      let stepInterval;

      if (speed < 0.1) {
        stepInterval = speed * 10000;
      } else {
        stepInterval = Math.max(5, 200 / speed);
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
          const btnIcon = this.elements.playPauseBtn.querySelector('.btn-icon');
          const btnText = this.elements.playPauseBtn.querySelector('.btn-text');
          btnIcon.textContent = '▶';
          btnText.textContent = 'Play';
        }
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate(0);
  }

  // Loading screen methods
  showLoadingScreen() {
    if (this.elements && this.elements.loadingScreen) {
      this.elements.loadingScreen.classList.remove('hidden');
    }
  }

  hideLoadingScreen() {
    setTimeout(() => {
      if (this.elements && this.elements.loadingScreen) {
        this.elements.loadingScreen.classList.add('hidden');
      }
    }, 1000);
  }

  // Modal management
  showModal(type) {
    this.hideModal(); // Hide any open modals first

    let modalElement;
    switch (type) {
      case 'settings':
        modalElement = this.elements.settingsPanel;
        break;
      case 'help':
        modalElement = this.elements.helpPanel;
        break;
      case 'shortcuts':
        modalElement = this.elements.keyboardShortcuts;
        break;
    }

    if (modalElement) {
      this.elements.backdrop.classList.add('visible');
      modalElement.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
  }

  hideModal() {
    this.elements.backdrop.classList.remove('visible');
    this.elements.settingsPanel.classList.remove('visible');
    this.elements.helpPanel.classList.remove('visible');
    this.elements.keyboardShortcuts.classList.remove('visible');
    document.body.style.overflow = 'auto';
  }

  // Settings management
  resetSettingsToDefaults() {
    this.settings = {
      showComplexity: true,
      enableSound: true,
      darkMode: true,
      showKeyboardShortcuts: false,
      highContrast: false,
      volume: 30
    };

    this.updateSettingsUI();
    this.audioEngine.setVolume(this.settings.volume / 100 * 0.05);
    document.body.classList.remove('high-contrast');
    this.resetAlgorithms();
  }

  updateSettingsUI() {
    this.elements.showComplexity.checked = this.settings.showComplexity;
    this.elements.enableSound.checked = this.settings.enableSound;
    this.elements.showKeyboardShortcutsCheck.checked = this.settings.showKeyboardShortcuts;
    this.elements.highContrast.checked = this.settings.highContrast;
    this.elements.volumeSlider.value = this.settings.volume;
    this.elements.volumeValue.textContent = `${this.settings.volume}%`;
  }

  toggleKeyboardShortcuts() {
    if (this.settings.showKeyboardShortcuts) {
      this.showModal('shortcuts');
    } else {
      this.hideModal();
    }
  }

  // Fullscreen toggle
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Performance indicator update
  updatePerformanceIndicator(algorithm, element) {
    if (!element) return;

    const performanceFill = element.querySelector('.performance-fill');
    if (!performanceFill) return;

    // Calculate performance based on algorithm efficiency
    let efficiency = 0;
    if (algorithm && algorithm.stats) {
      const totalOps = algorithm.stats.comparisons + algorithm.stats.swaps + algorithm.stats.accesses;
      const arraySize = algorithm.array ? algorithm.array.length : 100;

      // Rough efficiency calculation (lower is better)
      const opsPerElement = totalOps / arraySize;
      efficiency = Math.max(0, Math.min(100, 100 - (opsPerElement * 2)));
    }

    performanceFill.style.width = `${efficiency}%`;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  new AlgorithmVisualizer();
});