import fs from "fs";
import path from "path";
const file = path.resolve(process.cwd(), "src/pages/Admin/POS/POSPage.jsx");
const s = fs.readFileSync(file, "utf8");
const counts = { "(": 0, ")": 0, "{": 0, "}": 0, "[": 0, "]": 0 };
for (const ch of s) {
  if (counts.hasOwnProperty(ch)) counts[ch]++;
}
console.log("counts", counts);
// Find the first position where braces go negative
let stack = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === "{") stack.push(i);
  else if (ch === "}") {
    if (stack.length === 0) {
      console.log(
        "Unmatched } at index",
        i,
        "line",
        s.slice(0, i).split("\n").length
      );
      break;
    }
    stack.pop();
  }
}
if (stack.length > 0) {
  console.log(
    "Unmatched { at index",
    stack[stack.length - 1],
    "line",
    s.slice(0, stack[stack.length - 1]).split("\n").length
  );
}
