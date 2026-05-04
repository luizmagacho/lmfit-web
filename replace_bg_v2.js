const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('backgroundColor: "#fff"')) {
    content = content.replace(/backgroundColor:\s*"#fff"/g, 'backgroundColor: "var(--card-bg)"');
    changed = true;
  }
  if (content.includes('backgroundColor: "#ffffff"')) {
    content = content.replace(/backgroundColor:\s*"#ffffff"/g, 'backgroundColor: "var(--card-bg)"');
    changed = true;
  }
  if (content.includes('bg-black/5')) {
    content = content.replace(/\bbg-black\/5\b/g, 'bg-[var(--chart-track)]');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    count++;
  }
});
console.log(`Updated ${count} files.`);
