const fs = require('fs');
const https = require('https');
const http = require('http');

if (process.argv.length < 3) {
    console.error("Usage: node huh.js file.huh")
    console.log("Version 1.0");
    process.exit(1);
}

const filename = process.argv[2];
if (!filename.endsWith('.huh')) {
    console.error("File must be .huh");
    process.exit(1);
}

const lines = fs.readFileSync(filename, 'utf8').split('\n');
const variables = new Map();
let pc = 0;

function error(n, msg) {
    console.error(`\x1b[31mHuh Error (line ${n + 1}): ${msg}\x1b[0m`);
    console.error(`   ${lines[n].trim()}`);
    process.exit(1);
}

function evalMath(expr) {
    expr = expr.trim();
    expr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, name => {
        const val = variables.get(name);
        if (typeof val === 'number') return val;
        error(pc, `Math needs number, got ${name}`);
    });
    try {
        return Function('"use strict";return (' + expr + ')')();
    } catch {
        error(pc, "Bad math");
    }
}

function parseValue(str) {
    str = str.trim();
    if (str.startsWith('$') && str.endsWith('$')) return evalMath(str.slice(1, -1));
    if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
    const n = Number(str);
    if (!isNaN(n)) return n;
    if (variables.has(str)) return variables.get(str);
    error(pc, `Unknown value: ${str}`);
}

function parseList(content) {
    const items = [];
    let cur = '';
    let inStr = false;
    for (const ch of content + ',') {
        if (ch === '"' && (cur === '' || cur.slice(-1) !== '\\')) inStr = !inStr;
        if (!inStr && ch === ',') {
            if (cur.trim() !== '') items.push(parseValue(cur.trim()));
            cur = '';
        } else cur += ch;
    }
    return items;
}

const blockEnd = new Map();
for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('^^') || l.startsWith('==>>=(')) {
        let depth = 1;
        for (let j = i + 1; j < lines.length; j++) {
            const x = lines[j].trim();
            if (x.startsWith('^^') || x.startsWith('==>>=(')) depth++;
            if (x === '==<<') depth--;
            if (depth === 0) {
                blockEnd.set(i, j + 1);
                break;
            }
        }
    }
}

async function run() {
    while (pc < lines.length) {
        const raw = lines[pc];
        const line = raw.trim();
        if (!line || line.startsWith('//')) { pc++; continue; }

        if (line.startsWith('==(') && line.includes(')==(')) {
            const [a, b] = line.split(')==(');
            const name = a.slice(3).trim();
            let val = b.slice(0, -1).trim();
            if (val.startsWith('(') && val.endsWith(')')) {
                variables.set(name, parseList(val.slice(1, -1)));
            } else {
                variables.set(name, parseValue(val));
            }
            pc++;
            continue;
        }

        if (line.startsWith('<<>>(')) {
            console.log(parseValue(line.slice(5, -1).trim()));
            pc++;
            continue;
        }

        if (line.startsWith('&& -g')) {
            const m = line.match(/&& -g\s+"([^"]+)"/);
            if (!m) error(pc, "Bad && -g");
            const url = m[1];
            const client = url.startsWith('https') ? https : http;
            await new Promise(r => client.get(url, res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => { console.log(d); r(); });
            }).on('error', () => r()));
            pc++;
            continue;
        }

        if (line.startsWith('&& -p')) {
            const m = raw.match(/&& -p\s+"([^"]+)"\s*\(\s*(.*)\s*\)/);
            if (!m) error(pc, "Bad && -p");
            const url = m[1];
            let content = m[2].trim();
            let text = "", title = "";
            if (content.startsWith('"')) {
                if (content.includes('",')) {
                    const [a,b] = content.split('",');
                    text = a.slice(1);
                    title = b.trim().slice(0, -1);
                } else text = content.slice(1, -1);
            } else text = String(variables.get(content) ?? "");
            const payload = { content: text || null, embeds: title ? [{title, description: text || " ", color: 0x00ff88}] : null };
            if (!payload.content) delete payload.content;
            if (payload.embeds && payload.embeds.length === 0) delete payload.embeds;
            await new Promise(r => {
                const req = https.request(url, {method:'POST', headers:{'Content-Type':'application/json'}}, () => r());
                req.on('error', () => r());
                req.write(JSON.stringify(payload));
                req.end();
            });
            pc++;
            continue;
        }

        if (line.startsWith('^^') && line.includes(':')) {
            const cond = line.slice(2, line.indexOf(':')).trim();
            const eq = cond.indexOf('=');
            if (eq === -1) error(pc, "if needs =");
            const left = parseValue(cond.slice(0, eq));
            const right = parseValue(cond.slice(eq + 1));
            if (JSON.stringify(left) !== JSON.stringify(right)) {
                pc = blockEnd.get(pc) || pc + 1;
            } else pc++;
            continue;
        }

        if (line.startsWith('==>>=(') && line.endsWith('):')) {
            const inside = line.slice(6, -2).trim();

            let shouldRun = true;

            if (/^\d+$/.test(inside)) {
                const n = Number(inside);
                const key = `__times_${pc}`;
                const count = (variables.get(key) || 0) + 1;
                variables.set(key, count);
                if (count > n) shouldRun = false;
            }

            else if (inside.includes(',')) {
                const [varName, listName] = inside.split(',').map(s => s.trim());
                const list = variables.get(listName);
                if (!Array.isArray(list)) error(pc, "foreach needs a list");
                const key = `__for_${pc}`;
                let idx = variables.get(key) || 0;
                if (idx >= list.length) shouldRun = false;
                else {
                    variables.set(varName, list[idx]);
                    variables.set(key, idx + 1);
                }
            }

            else {
                const parts = inside.split(' ');
                if (parts.length !== 3) error(pc, "bad while condition");
                const [a, op, b] = parts;
                const va = parseValue(a);
                const vb = parseValue(b);
                shouldRun =
                    (op === '<'  && va <  vb) || (op === '>'  && va >  vb) ||
                    (op === '<=' && va <= vb) || (op === '>=' && va >= vb) ||
                    (op === '='  && va === vb) || (op === '!=' && va !== vb);
            }

            if (!shouldRun) {
                pc = blockEnd.get(pc) || pc + 1;
            } else {
                pc++;
            }
            continue;
        }

        if (line === '==<<') {
            for (let j = pc - 1; j >= 0; j--) {
                if (lines[j].trim().startsWith('==>>=(')) {
                    pc = j;
                    break;
                }
            }
            continue;
        }

        if (line === '%%:') {
            pc = blockEnd.get(pc) || pc + 1;
            continue;
        }

        error(pc, "Unknown command");
    }
}

run().catch(e => console.error("Runtime error:", e.message));
