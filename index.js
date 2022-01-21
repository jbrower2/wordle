const fs = require("fs");

const FINAL = JSON.parse(fs.readFileSync("final.json", "utf8"));
const VALID = JSON.parse(fs.readFileSync("valid.json", "utf8"));

for (const arr of [FINAL, VALID]) {
	for (const w of arr) {
		if (!/^[a-z]{5}$/.test(w)) {
			throw new Error(`Invalid dictionary word: ${w}`);
		}
	}
}

function addCount(m, k) {
	m.set(k, (m.get(k) || 0) + 1);
}

class Position {
	bad = [];

	filter(c) {
		if (this.good && this.good !== c) {
			return false;
		}
		if (this.bad && this.bad.includes(c)) {
			return false;
		}
		return true;
	}

	clone() {
		const that = new Position();
		if (this.good) that.good = this.good;
		that.bad.push(...this.bad);
		return that;
	}
}

class State {
	positions = [
		new Position(),
		new Position(),
		new Position(),
		new Position(),
		new Position(),
	];
	minCount = new Map();
	maxCount = new Map();
	final = FINAL;
	valid = VALID;

	addGuess(k, v) {
		if (!(FINAL.includes(k) || VALID.includes(k))) {
			throw new Error(`Invalid word: ${k}`);
		}
		if (!/^[xyg]{5}$/.test(v)) {
			throw new Error(`Invalid result: ${v}`);
		}
		const count = new Map();
		const bad = new Set();
		for (let i = 0; i < 5; i++) {
			const p = this.positions[i];
			const c = k[i];
			const r = v[i];
			switch (r) {
				case "g":
					if (p.good && p.good !== c) {
						throw new Error("Contradiction");
					}
					p.good = c;
					addCount(count, c);
					break;
				case "y":
					if (p.good === c) {
						throw new Error("Contradiction");
					}
					p.bad.push(c);
					addCount(count, c);
					break;
				default:
					if (p.good === c) {
						throw new Error("Contradiction");
					}
					p.bad.push(c);
					bad.add(c);
					break;
			}
		}
		for (const [c, n] of count) {
			this.minCount.set(c, Math.max(this.minCount.get(c) || 0, n));
		}
		for (const c of bad) {
			this.maxCount.set(c, count.get(c) || 0);
		}

		const filter = (w) => {
			const count = new Map();
			for (let i = 0; i < 5; i++) {
				const c = w[i];
				addCount(count, c);

				if (!this.positions[i].filter(c)) {
					return false;
				}
			}

			for (const [c, n] of count) {
				const min = this.minCount.get(c) || 0;
				const max = this.maxCount.get(c) || 5;
				if (n < min || n > max) {
					return false;
				}
			}

			return true;
		};

		this.final = this.final.filter(filter);
		this.valid = this.valid.filter(filter);
	}

	clone() {
		const that = new State();
		that.positions = this.positions.map((p) => p.clone());
		that.minCount = new Map(this.minCount);
		that.maxCount = new Map(this.maxCount);
		that.final = [...this.final];
		that.valid = [...this.valid];
		return that;
	}
}

function simulate(word, guess) {
	const result = [];
	for (let i = 0; i < 5; i++) {
		result[i] = word[i] === guess[i] ? "g" : "x";
	}
	for (let i = 0; i < 5; i++) {
		if (result[i] === "g") continue;
		let found = false;
		for (let j = 0; j < 5; j++) {
			if (i === j || result[j] === "g") continue;
			if (guess[i] === word[j]) {
				found = true;
				break;
			}
		}
		if (found) {
			result[i] = "y";
		}
	}
	return result.join("");
}

const guesses = new Map([
	["arise", "xyxyy"],
	// ["poopy", "xgyxx"],
	// ["rural", "gxxxx"],
]);

let state = new State();
for (const [k, v] of guesses) {
	state.addGuess(k, v);
}

let num = 0;
let bestGuess;
let bestScore = Infinity;
for (const arr of [state.final, state.valid]) {
	for (const g of arr) {
		num++;
		let sum = 0;
		for (const f of state.final) {
			const newState = state.clone();
			newState.addGuess(g, simulate(f, g));
			sum += newState.final.length;
		}
		const avg = sum / state.final.length;
		if (avg < bestScore) {
			bestGuess = g;
			bestScore = avg;
			console.log(
				"improvement:",
				g,
				avg,
				`(${num} / ${state.final.length + state.valid.length})`
			);
		}
	}
}

console.log(state.final);
console.log(state.valid);
console.log(bestGuess, bestScore);
