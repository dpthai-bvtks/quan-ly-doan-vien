const fs = require('fs');
const path = 'g:/Other computers/Laptop Thái/PM-DPT/PM-quanlydoanvien/src/components/ToolsManager.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. State
content = content.replace(
  /const \[dkDocNo, setDkDocNo\] = useState\('01'\);/g,
  `const [dkDocNoBB, setDkDocNoBB] = useState('01');\n  const [dkDocNoNQ, setDkDocNoNQ] = useState('01');\n  const [dkDocNoBC, setDkDocNoBC] = useState('01');`
);

// 2. handleSaveToDrive - folder and filename
content = content.replace(
  /let folderId = '';[\s\S]*?if \(type === 'bao_cao'\) \{[\s\S]*?folderId = isCS1 \? '1YQrHutAFAcU24-Y8X--k2y_wCmNRWxwZ' : '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';[\s\S]*?filename = `Bao_Cao_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`;[\s\S]*?\} else if \(type === 'bien_ban'\) \{[\s\S]*?folderId = isCS1 \? '1BRfEJwq4dFUXHC60oB6UAaAA9iN3hhmp' : '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV';[\s\S]*?filename = `Bien_Ban_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`;[\s\S]*?\} else if \(type === 'nghi_quyet'\) \{[\s\S]*?folderId = isCS1 \? '1IvfaxI8UvMbGrlIMVQq4epW-kGz7ORHQ' : '1sbRu-eADECV4MN_uDQ7vwP0LjZ5lqeJu';[\s\S]*?filename = `Nghi_Quyet_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`;[\s\S]*?\} else if \(type === 'ke_hoach'\) \{/g,
  `let folderId = '';\n      let filename = '';\n      let currentDocNo = '';\n      if (type === 'bao_cao') {\n        folderId = isCS1 ? '1YQrHutAFAcU24-Y8X--k2y_wCmNRWxwZ' : '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';\n        currentDocNo = dkDocNoBC;\n        filename = \`Bao_Cao_\${currentDocNo}_\${dkMonth}_\${dkYear}\`;\n      } else if (type === 'bien_ban') {\n        folderId = isCS1 ? '1BRfEJwq4dFUXHC60oB6UAaAA9iN3hhmp' : '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV';\n        currentDocNo = dkDocNoBB;\n        filename = \`Bien_Ban_\${currentDocNo}_\${dkMonth}_\${dkYear}\`;\n      } else if (type === 'nghi_quyet') {\n        folderId = isCS1 ? '1IvfaxI8UvMbGrlIMVQq4epW-kGz7ORHQ' : '1sbRu-eADECV4MN_uDQ7vwP0LjZ5lqeJu';\n        currentDocNo = dkDocNoNQ;\n        filename = \`Nghi_Quyet_\${currentDocNo}_\${dkMonth}_\${dkYear}\`;\n      } else if (type === 'ke_hoach') {`
);

// 3. handleSaveToDrive - docx blob gen
content = content.replace(
  /branchName, dkDocNo, dkDate, dkMonth, dkYear,/g,
  `branchName, dkDocNo: currentDocNo, dkDate, dkMonth, dkYear,`
);

// 4. handleSaveToDrive - plan title
content = content.replace(
  /if \(type === 'bao_cao'\) planTitle = `Báo cáo số \$\{dkDocNo\}\/\$\{dkYear\}`;[\s\S]*?else if \(type === 'bien_ban'\) planTitle = `Biên bản số \$\{dkDocNo\}\/\$\{dkYear\}`;[\s\S]*?else if \(type === 'nghi_quyet'\) planTitle = `Nghị quyết số \$\{dkDocNo\}\/\$\{dkYear\}`;/g,
  `if (type === 'bao_cao') planTitle = \`Báo cáo số \${currentDocNo}/\${dkYear}\`;\n          else if (type === 'bien_ban') planTitle = \`Biên bản số \${currentDocNo}/\${dkYear}\`;\n          else if (type === 'nghi_quyet') planTitle = \`Nghị quyết số \${currentDocNo}/\${dkYear}\`;`
);

// 5. handleGenerateDk - Báo cáo số
content = content.replace(
  /Số: \$\{dkDocNo\}\/\$\{dkYear\}-BC\/\$\{docSuffix\}/g,
  `Số: \${dkDocNoBC}/\${dkYear}-BC/\${docSuffix}`
);

// 6. handleGenerateDk - Biên bản số
content = content.replace(
  /Số: \$\{dkDocNo\}\/\$\{dkYear\}-BB\/\$\{docSuffix\}/g,
  `Số: \${dkDocNoBB}/\${dkYear}-BB/\${docSuffix}`
);

// 7. handleGenerateDk - Nghị quyết số
content = content.replace(
  /Số: \$\{dkDocNo\}\/\$\{dkYear\}-NQ\/\$\{docSuffix\}/g,
  `Số: \${dkDocNoNQ}/\${dkYear}-NQ/\${docSuffix}`
);

// 8. Báo cáo manual download
content = content.replace(
  /generateDinhKyDocx\('bao_cao', \{[\s\S]*?branchName: config.title, dkDocNo, dkDate/g,
  `generateDinhKyDocx('bao_cao', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo: dkDocNoBC, dkDate`
);
content = content.replace(
  /exportDocxBlob\(blob, `Bao_Cao_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`\);/g,
  `exportDocxBlob(blob, \`Bao_Cao_\${dkDocNoBC}_\${dkMonth}_\${dkYear}\`);`
);

// 9. Biên bản manual download
content = content.replace(
  /generateDinhKyDocx\('bien_ban', \{[\s\S]*?branchName: config.title, dkDocNo, dkDate/g,
  `generateDinhKyDocx('bien_ban', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo: dkDocNoBB, dkDate`
);
content = content.replace(
  /exportDocxBlob\(blob, `Bien_Ban_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`\);/g,
  `exportDocxBlob(blob, \`Bien_Ban_\${dkDocNoBB}_\${dkMonth}_\${dkYear}\`);`
);

// 10. Nghị quyết manual download
content = content.replace(
  /generateDinhKyDocx\('nghi_quyet', \{[\s\S]*?branchName: config.title, dkDocNo, dkDate/g,
  `generateDinhKyDocx('nghi_quyet', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo: dkDocNoNQ, dkDate`
);
content = content.replace(
  /exportDocxBlob\(blob, `Nghi_Quyet_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`\);/g,
  `exportDocxBlob(blob, \`Nghi_Quyet_\${dkDocNoNQ}_\${dkMonth}_\${dkYear}\`);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ToolsManager.jsx successfully via Node Regex!');
