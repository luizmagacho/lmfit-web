function parseBrl(val) {
  const d = val.replace(/\D/g, "");
  return d ? parseInt(d, 10) / 100 : 0;
}
function formatBrlInput(num) {
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let num = 0;
console.log("Start:", formatBrlInput(num));
let t1 = formatBrlInput(num) + "1";
num = parseBrl(t1);
console.log("Typed 1:", formatBrlInput(num));
let t2 = formatBrlInput(num) + "2";
num = parseBrl(t2);
console.log("Typed 2:", formatBrlInput(num));
let t3 = formatBrlInput(num) + "3";
num = parseBrl(t3);
console.log("Typed 3:", formatBrlInput(num));
