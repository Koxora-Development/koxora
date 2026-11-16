import type { TableTextRegions } from '@koxora/project';
import { fromPlainText, type RichText } from './rich-text';

type Scalar = number | string | boolean | null;
type Value = Scalar | Scalar[];
type Expression =
  | { kind: 'literal'; value: Scalar }
  | { kind: 'ref'; address: string }
  | { kind: 'range'; start: string; end: string }
  | { kind: 'unary'; op: string; value: Expression }
  | { kind: 'binary'; op: string; left: Expression; right: Expression }
  | { kind: 'call'; name: string; args: Expression[] };
class FormulaFault extends Error {}
const fail = (code: string): never => {
  throw new FormulaFault(code);
};
export function tableColumnName(column: number): string {
  return String.fromCharCode(65 + column);
}
function address(text: string) {
  const match = /^(\$?)([A-Z]+)(\$?)([1-9][0-9]*)$/i.exec(text);
  if (!match) return fail('#REF!');
  const column =
    [...match[2].toUpperCase()].reduce(
      (sum, c) => sum * 26 + c.charCodeAt(0) - 64,
      0,
    ) - 1;
  const row = Number(match[4]) - 1;
  return { row, column, absoluteColumn: match[1], absoluteRow: match[3] };
}
function parse(source: string): Expression {
  const tokens: string[] = [];
  for (let offset = 0; offset < source.length;) {
    if (/\s/.test(source[offset])) {
      offset++;
      continue;
    }
    const token =
      /^(?:"(?:[^"]|"")*"|#REF!|\$?[A-Za-z]+\$?[1-9][0-9]*|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?|[A-Za-z_]+|<=|>=|<>|[+\-*/^%(),;:=<>])/.exec(
        source.slice(offset),
      )?.[0];
    if (!token || tokens.length >= 512) return fail('#ERROR!');
    tokens.push(token);
    offset += token.length;
  }
  let index = 0,
    depth = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const primary = (): Expression => {
    if (++depth > 64) return fail('#LIMIT!');
    let result: Expression;
    const token = take();
    if (!token) return fail('#ERROR!');
    if (token === '(') {
      result = compare();
      if (take() !== ')') return fail('#ERROR!');
    } else if (token === '#REF!') result = { kind: 'ref', address: token };
    else if (token.startsWith('"'))
      result = {
        kind: 'literal',
        value: token.slice(1, -1).replace(/""/g, '"'),
      };
    else if (/^[0-9.]/.test(token))
      result = { kind: 'literal', value: Number(token) };
    else if (/^\$?[A-Za-z]+\$?[1-9][0-9]*$/.test(token)) {
      result = { kind: 'ref', address: token };
      if (peek() === ':') {
        take();
        const end = take();
        if (!end || !/^\$?[A-Za-z]+\$?[1-9][0-9]*$/.test(end))
          return fail('#REF!');
        result = { kind: 'range', start: token, end };
      }
    } else if (/^[A-Za-z_]+$/.test(token)) {
      const name = token.toUpperCase();
      if (['TRUE', 'FALSE', 'WAHR', 'FALSCH'].includes(name))
        result = { kind: 'literal', value: ['TRUE', 'WAHR'].includes(name) };
      else {
        if (take() !== '(') return fail('#NAME?');
        const args: Expression[] = [];
        if (peek() !== ')')
          do {
            args.push(compare());
            if (peek() !== ',' && peek() !== ';') break;
            take();
          } while (index < tokens.length);
        if (take() !== ')') return fail('#ERROR!');
        result = { kind: 'call', name, args };
      }
    } else return fail('#ERROR!');
    if (peek() === '%') {
      take();
      result = { kind: 'unary', op: '%', value: result };
    }
    depth--;
    return result;
  };
  const unary = (): Expression => {
    if (peek() === '+' || peek() === '-') {
      if (++depth > 64) return fail('#LIMIT!');
      const op = take(),
        value = unary();
      depth--;
      return { kind: 'unary', op, value };
    }
    const left = primary();
    if (peek() === '^') {
      take();
      if (++depth > 64) return fail('#LIMIT!');
      const right = unary();
      depth--;
      return { kind: 'binary', op: '^', left, right };
    }
    return left;
  };
  const chain = (next: () => Expression, operators: string[]): Expression => {
    let left = next();
    while (operators.includes(peek()))
      left = { kind: 'binary', op: take(), left, right: next() };
    return left;
  };
  const product = () => chain(unary, ['*', '/']);
  const sum = () => chain(product, ['+', '-']);
  const compare = (): Expression =>
    chain(sum, ['=', '<>', '<', '>', '<=', '>=']);
  const result = compare();
  if (index !== tokens.length) return fail('#ERROR!');
  return result;
}
const scalar = (v: Value): Scalar => (Array.isArray(v) ? fail('#VALUE!') : v);
const numeric = (v: Value): number => {
  const value = scalar(v);
  if (value === null || value === '') return 0;
  if (typeof value === 'boolean') return Number(value);
  if (typeof value !== 'number') return fail('#VALUE!');
  return value;
};
const aliases: Record<string, string> = {
  SUMME: 'SUM',
  MITTELWERT: 'AVERAGE',
  ANZAHL: 'COUNT',
  WENN: 'IF',
  RUNDEN: 'ROUND',
};

/** A bounded parser/interpreter; formulas cannot access JavaScript, files or the network. */
export function evaluateTable(value: TableTextRegions): string[][] {
  const cache = new Map<string, Scalar | FormulaFault>(),
    visiting = new Set<string>();
  let budget = 200000;
  const reference = (ref: string): Scalar => {
    const { row, column } = address(ref);
    if (row >= value.cells.length || column >= value.cells[0].length)
      return fail('#REF!');
    return cell(row, column);
  };
  const evaluate = (expr: Expression, depth = 0): Value => {
    if (--budget < 0 || depth > 128) return fail('#LIMIT!');
    const ev = (node: Expression): Value => {
      const result = evaluate(node, depth + 1);
      if (typeof result === 'number' && !Number.isFinite(result))
        return fail('#NUM!');
      return result;
    };
    if (expr.kind === 'literal') return expr.value;
    if (expr.kind === 'ref') return reference(expr.address);
    if (expr.kind === 'range') {
      const a = address(expr.start),
        b = address(expr.end);
      if (
        Math.max(a.row, b.row) >= value.cells.length ||
        Math.max(a.column, b.column) >= value.cells[0].length
      )
        return fail('#REF!');
      const result: Scalar[] = [];
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
        for (
          let c = Math.min(a.column, b.column);
          c <= Math.max(a.column, b.column);
          c++
        )
          result.push(cell(r, c));
      return result;
    }
    if (expr.kind === 'unary') {
      const n = numeric(ev(expr.value));
      return expr.op === '-' ? -n : expr.op === '%' ? n / 100 : n;
    }
    if (expr.kind === 'binary') {
      const a = ev(expr.left),
        b = ev(expr.right);
      if (['=', '<>', '<', '>', '<=', '>='].includes(expr.op)) {
        const x = scalar(a) ?? 0,
          y = scalar(b) ?? 0;
        if (expr.op === '=') return x === y;
        if (expr.op === '<>') return x !== y;
        return expr.op === '<'
          ? x < y
          : expr.op === '>'
            ? x > y
            : expr.op === '<='
              ? x <= y
              : x >= y;
      }
      const x = numeric(a),
        y = numeric(b);
      if (expr.op === '/' && y === 0) return fail('#DIV/0!');
      return expr.op === '+'
        ? x + y
        : expr.op === '-'
          ? x - y
          : expr.op === '*'
            ? x * y
            : expr.op === '/'
              ? x / y
              : x ** y;
    }
    const name = aliases[expr.name] ?? expr.name;
    if (name === 'IF') {
      if (expr.args.length !== 3) return fail('#ERROR!');
      return ev(expr.args[numeric(ev(expr.args[0])) ? 1 : 2]);
    }
    if (name === 'ABS') {
      if (expr.args.length !== 1) return fail('#ERROR!');
      return Math.abs(numeric(ev(expr.args[0])));
    }
    if (name === 'ROUND') {
      if (expr.args.length !== 2) return fail('#ERROR!');
      const n = numeric(ev(expr.args[0])),
        digits = numeric(ev(expr.args[1]));
      if (!Number.isInteger(digits) || Math.abs(digits) > 15)
        return fail('#NUM!');
      return (
        (Math.sign(n) * Math.round(Math.abs(n) * 10 ** digits)) / 10 ** digits
      );
    }
    if (!['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'].includes(name))
      return fail('#NAME?');
    const numbers = expr.args
      .flatMap((arg) => {
        const v = ev(arg);
        return Array.isArray(v) ? v : [v];
      })
      .filter((v): v is number => typeof v === 'number');
    if (name === 'COUNT') return numbers.length;
    if (name === 'AVERAGE' && !numbers.length) return fail('#DIV/0!');
    if (!numbers.length) return 0;
    if (name === 'MIN') return Math.min(...numbers);
    if (name === 'MAX') return Math.max(...numbers);
    const total = numbers.reduce((sum, n) => sum + n, 0);
    return name === 'AVERAGE' ? total / numbers.length : total;
  };
  const cell = (row: number, column: number): Scalar => {
    const key = `${row}:${column}`;
    const cached = cache.get(key);
    if (cached instanceof FormulaFault) throw cached;
    if (cache.has(key)) return cached as Scalar;
    if (visiting.has(key)) return fail('#CYCLE!');
    visiting.add(key);
    try {
      const raw = value.cells[row][column];
      let result: Scalar;
      if (value.formulas && raw.startsWith('='))
        result = scalar(evaluate(parse(raw.slice(1))));
      else if (raw.startsWith("'") && value.formulas) result = raw.slice(1);
      else if (raw.trim() === '') result = null;
      else
        result = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(
          raw.trim(),
        )
          ? Number(raw)
          : raw;
      if (typeof result === 'number' && !Number.isFinite(result))
        return fail('#NUM!');
      cache.set(key, result);
      return result;
    } catch (error) {
      const fault =
        error instanceof FormulaFault ? error : new FormulaFault('#ERROR!');
      cache.set(key, fault);
      throw fault;
    } finally {
      visiting.delete(key);
    }
  };
  return value.cells.map((row, r) =>
    row.map((raw, c) => {
      if (!value.formulas || !raw.startsWith('='))
        return value.formulas && raw.startsWith("'") ? raw.slice(1) : raw;
      try {
        const result = cell(r, c);
        return typeof result === 'number'
          ? String(Number(result.toPrecision(12)))
          : result === null
            ? ''
            : String(result);
      } catch (error) {
        return error instanceof FormulaFault ? error.message : '#ERROR!';
      }
    }),
  );
}

export function calculatedCellRichText(
  value: TableTextRegions,
  row: number,
  column: number,
  display: string[][],
  align: 'left' | 'center' | 'right' = 'center',
): RichText {
  const rich = value.cellRichText?.[row]?.[column];
  if (display[row][column] === value.cells[row][column])
    return rich ?? fromPlainText(value.cells[row][column], align);
  const result = fromPlainText(
    display[row][column],
    rich?.paragraphs[0]?.align ?? align,
  );
  if (result.paragraphs[0].runs[0])
    result.paragraphs[0].runs[0].style = {
      ...rich?.paragraphs[0]?.runs[0]?.style,
    };
  return result;
}

/** Structural edits rewrite references, including absolute ones; quoted text is untouched. */
export function rewriteTableFormula(
  source: string,
  axis: 'row' | 'column',
  index: number,
  count: number,
  action: 'insert' | 'delete',
): string {
  if (!source.startsWith('=')) return source;
  const render = (p: ReturnType<typeof address>) =>
    `${p.absoluteColumn}${tableColumnName(p.column)}${p.absoluteRow}${p.row + 1}`;
  const move = (position: number) =>
    action === 'insert'
      ? position + (position >= index ? count : 0)
      : position < index
        ? position
        : position >= index + count
          ? position - count
          : null;
  return source.replace(
    /"(?:[^"]|"")*"|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?|\$?[A-Za-z]+\$?[1-9][0-9]*(?:\s*:\s*\$?[A-Za-z]+\$?[1-9][0-9]*)?/g,
    (token) => {
      if (token.startsWith('"') || /^[0-9.]/.test(token)) return token;
      const parts = token.split(/\s*:\s*/),
        a = address(parts[0]);
      // Do not turn an already-invalid address into a valid reference.
      if (a.row >= 20 || a.column >= 12) return token;
      if (parts.length === 1) {
        const pos = move(a[axis]);
        if (pos === null) return '#REF!';
        a[axis] = pos;
        return render(a);
      }
      const b = address(parts[1]);
      if (b.row >= 20 || b.column >= 12) return token;
      const lower = Math.min(a[axis], b[axis]),
        upper = Math.max(a[axis], b[axis]);
      const surviving = Array.from(
        { length: upper - lower + 1 },
        (_, i) => lower + i,
      )
        .map(move)
        .filter((v): v is number => v !== null);
      if (!surviving.length) return '#REF!';
      const first = Math.min(...surviving),
        last = Math.max(...surviving);
      const forward = a[axis] <= b[axis];
      a[axis] = forward ? first : last;
      b[axis] = forward ? last : first;
      return `${render(a)}:${render(b)}`;
    },
  );
}

/** Relative copy changes only unlocked reference coordinates. */
export function translateTableFormula(
  source: string,
  rowDelta: number,
  columnDelta: number,
): string {
  if (!source.startsWith('=')) return source;
  return source.replace(
    /"(?:[^"]|"")*"|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?|\$?[A-Za-z]+\$?[1-9][0-9]*(?:\s*:\s*\$?[A-Za-z]+\$?[1-9][0-9]*)?/g,
    (token) => {
      if (token.startsWith('"') || /^[0-9.]/.test(token)) return token;
      const translated = token.split(/\s*:\s*/).map((part) => {
        const p = address(part);
        if (p.row >= 20 || p.column >= 12) return '#REF!';
        if (!p.absoluteRow) p.row += rowDelta;
        if (!p.absoluteColumn) p.column += columnDelta;
        if (p.row < 0 || p.column < 0 || p.row >= 20 || p.column >= 12)
          return '#REF!';
        return `${p.absoluteColumn}${tableColumnName(p.column)}${p.absoluteRow}${p.row + 1}`;
      });
      return translated.includes('#REF!') ? '#REF!' : translated.join(':');
    },
  );
}
