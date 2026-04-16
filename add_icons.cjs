const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add imports
const newImports = ['FolderOpen', 'Key', 'ArrowLeft', 'ArrowRight', 'Camera', 'Copy', 'Save', 'Code'];
const importRegex = /(import \{[^}]+)(Eye, Cpu)(\n\} from 'lucide-react';)/;
code = code.replace(importRegex, (match, p1, p2, p3) => {
    return p1 + p2 + ', ' + newImports.join(', ') + p3;
});

// 2. Add iconMap entries
const newMapEntries = `
  'folder-open': FolderOpen,
  'exclamation-triangle': AlertTriangle,
  'key': Key,
  'times': X,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'edit-alt': Edit,
  'camera': Camera,
  'copy': Copy,
  'save': Save,
  'calendar-alt': Calendar,
  'envelope': Mail,
  'loader': Loader2,
  'file-text': FileText,
  'code': Code,
`;

const mapRegex = /('cpu': Cpu,)([\s]*};)/;
code = code.replace(mapRegex, (match, p1, p2) => {
    return p1 + newMapEntries + p2;
});

fs.writeFileSync('App.tsx', code, 'utf8');
console.log("App.tsx mapped new icons.");
