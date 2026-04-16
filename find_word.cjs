const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

const regex = /Configura.{0,5}es/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log("Found:", match[0]);
  for(let i=0; i<match[0].length; i++) {
    console.log(match[0][i], match[0].charCodeAt(i).toString(16));
  }
}
