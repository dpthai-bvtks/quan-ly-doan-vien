const fs = require('fs');
const path = 'g:/Other computers/Laptop Thái/PM-DPT/PM-quanlydoanvien/src/components/ToolsManager.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. State
content = content.replace(
  "  const [dkDocNo, setDkDocNo] = useState('01');\n  const [dkDate, setDkDate] = useState",
  "  const [dkDocNoBB, setDkDocNoBB] = useState('01');\n  const [dkDocNoNQ, setDkDocNoNQ] = useState('01');\n  const [dkDocNoBC, setDkDocNoBC] = useState('01');\n  const [dkDate, setDkDate] = useState"
);

// 2. handleSaveToDrive - folder and filename
content = content.replace(
  "      let folderId = '';\n      let filename = '';\n      if (type === 'bao_cao') {\n        folderId = isCS1 ? '1YQrHutAFAcU24-Y8X--k2y_wCmNRWxwZ' : '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';\n        filename = `Bao_Cao_${dkDocNo}_${dkMonth}_${dkYear}`;\n      } else if (type === 'bien_ban') {\n        folderId = isCS1 ? '1BRfEJwq4dFUXHC60oB6UAaAA9iN3hhmp' : '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV';\n        filename = `Bien_Ban_${dkDocNo}_${dkMonth}_${dkYear}`;\n      } else if (type === 'nghi_quyet') {\n        folderId = isCS1 ? '1IvfaxI8UvMbGrlIMVQq4epW-kGz7ORHQ' : '1sbRu-eADECV4MN_uDQ7vwP0LjZ5lqeJu';\n        filename = `Nghi_Quyet_${dkDocNo}_${dkMonth}_${dkYear}`;\n      } else if (type === 'ke_hoach') {",
  "      let folderId = '';\n      let filename = '';\n      let currentDocNo = '';\n      if (type === 'bao_cao') {\n        folderId = isCS1 ? '1YQrHutAFAcU24-Y8X--k2y_wCmNRWxwZ' : '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';\n        currentDocNo = dkDocNoBC;\n        filename = `Bao_Cao_${currentDocNo}_${dkMonth}_${dkYear}`;\n      } else if (type === 'bien_ban') {\n        folderId = isCS1 ? '1BRfEJwq4dFUXHC60oB6UAaAA9iN3hhmp' : '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV';\n        currentDocNo = dkDocNoBB;\n        filename = `Bien_Ban_${currentDocNo}_${dkMonth}_${dkYear}`;\n      } else if (type === 'nghi_quyet') {\n        folderId = isCS1 ? '1IvfaxI8UvMbGrlIMVQq4epW-kGz7ORHQ' : '1sbRu-eADECV4MN_uDQ7vwP0LjZ5lqeJu';\n        currentDocNo = dkDocNoNQ;\n        filename = `Nghi_Quyet_${currentDocNo}_${dkMonth}_${dkYear}`;\n      } else if (type === 'ke_hoach') {"
);

// 3. handleSaveToDrive - docx blob gen
content = content.replace(
  "          docxBlob = await generateDinhKyDocx(type, {\n            branchName, dkDocNo, dkDate, dkMonth, dkYear,\n            results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n            nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n          });",
  "          docxBlob = await generateDinhKyDocx(type, {\n            branchName, dkDocNo: currentDocNo, dkDate, dkMonth, dkYear,\n            results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n            nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n          });"
);

// 4. handleSaveToDrive - plan title
content = content.replace(
  "          let planTitle = filename.replace(/_/g, ' ');\n          if (type === 'bao_cao') planTitle = `Báo cáo số ${dkDocNo}/${dkYear}`;\n          else if (type === 'bien_ban') planTitle = `Biên bản số ${dkDocNo}/${dkYear}`;\n          else if (type === 'nghi_quyet') planTitle = `Nghị quyết số ${dkDocNo}/${dkYear}`;\n          else if (type === 'ke_hoach') planTitle = `Kế hoạch số ${khDocNo}/${khYear}`;\n          else if (type === 'tong_hop') planTitle = `Báo cáo Tổng hợp ${thPeriod}/${thYear}`;",
  "          let planTitle = filename.replace(/_/g, ' ');\n          if (type === 'bao_cao') planTitle = `Báo cáo số ${currentDocNo}/${dkYear}`;\n          else if (type === 'bien_ban') planTitle = `Biên bản số ${currentDocNo}/${dkYear}`;\n          else if (type === 'nghi_quyet') planTitle = `Nghị quyết số ${currentDocNo}/${dkYear}`;\n          else if (type === 'ke_hoach') planTitle = `Kế hoạch số ${khDocNo}/${khYear}`;\n          else if (type === 'tong_hop') planTitle = `Báo cáo Tổng hợp ${thPeriod}/${thYear}`;"
);

// 5. handleGenerateDk - Báo cáo số
content = content.replace(
  "        Số: ${dkDocNo}/${dkYear}-BC/${docSuffix}",
  "        Số: ${dkDocNoBC}/${dkYear}-BC/${docSuffix}"
);

// 6. handleGenerateDk - Biên bản số
content = content.replace(
  "        Số: ${dkDocNo}/${dkYear}-BB/${docSuffix}",
  "        Số: ${dkDocNoBB}/${dkYear}-BB/${docSuffix}"
);

// 7. handleGenerateDk - Nghị quyết số
content = content.replace(
  "        Số: ${dkDocNo}/${dkYear}-NQ/${docSuffix}",
  "        Số: ${dkDocNoNQ}/${dkYear}-NQ/${docSuffix}"
);

// 8. UI form
content = content.replace(
  "          <div className=\"grid grid-cols-2 md:grid-cols-5 gap-4 mb-4\">\n            <FI label=\"Số văn bản\" value={dkDocNo} onChange={e => setDkDocNo(e.target.value)} placeholder=\"01\" />\n            <FI label=\"Ngày\" type=\"number\" value={dkDate} onChange={e => setDkDate(e.target.value)} />\n            <FI label=\"Tháng\" type=\"number\" value={dkMonth} onChange={e => setDkMonth(e.target.value)} />\n            <FI label=\"Năm\" type=\"number\" value={dkYear} onChange={e => setDkYear(e.target.value)} />\n            <FI label=\"Thư ký\" value={dkSecretary} onChange={e => setDkSecretary(e.target.value)} placeholder=\"Tên thư ký...\" />\n          </div>",
  "          <div className=\"grid grid-cols-3 md:grid-cols-3 gap-4 mb-4\">\n            <FI label=\"Số Biên bản\" value={dkDocNoBB} onChange={e => setDkDocNoBB(e.target.value)} placeholder=\"01\" />\n            <FI label=\"Số Nghị quyết\" value={dkDocNoNQ} onChange={e => setDkDocNoNQ(e.target.value)} placeholder=\"01\" />\n            <FI label=\"Số Báo cáo\" value={dkDocNoBC} onChange={e => setDkDocNoBC(e.target.value)} placeholder=\"01\" />\n          </div>\n          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-4\">\n            <FI label=\"Ngày\" type=\"number\" value={dkDate} onChange={e => setDkDate(e.target.value)} />\n            <FI label=\"Tháng\" type=\"number\" value={dkMonth} onChange={e => setDkMonth(e.target.value)} />\n            <FI label=\"Năm\" type=\"number\" value={dkYear} onChange={e => setDkYear(e.target.value)} />\n            <FI label=\"Thư ký\" value={dkSecretary} onChange={e => setDkSecretary(e.target.value)} placeholder=\"Tên thư ký...\" />\n          </div>"
);

// 9. Báo cáo manual download
content = content.replace(
  "                      const blob = await generateDinhKyDocx('bao_cao', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,\n                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n                      });\n                      exportDocxBlob(blob, `Bao_Cao_${dkDocNo}_${dkMonth}_${dkYear}`);",
  "                      const blob = await generateDinhKyDocx('bao_cao', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo: dkDocNoBC, dkDate, dkMonth, dkYear,\n                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n                      });\n                      exportDocxBlob(blob, `Bao_Cao_${dkDocNoBC}_${dkMonth}_${dkYear}`);"
);

// 10. Biên bản manual download
content = content.replace(
  "                      const blob = await generateDinhKyDocx('bien_ban', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,\n                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n                      });\n                      exportDocxBlob(blob, `Bien_Ban_${dkDocNo}_${dkMonth}_${dkYear}`);",
  "                      const blob = await generateDinhKyDocx('bien_ban', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo: dkDocNoBB, dkDate, dkMonth, dkYear,\n                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n                      });\n                      exportDocxBlob(blob, `Bien_Ban_${dkDocNoBB}_${dkMonth}_${dkYear}`);"
);

// 11. Nghị quyết manual download
content = content.replace(
  "                      const blob = await generateDinhKyDocx('nghi_quyet', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,\n                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n                      });\n                      exportDocxBlob(blob, `Nghi_Quyet_${dkDocNo}_${dkMonth}_${dkYear}`);",
  "                      const blob = await generateDinhKyDocx('nghi_quyet', {\n                        isCS1: currentUser?.username === 'bvtks-cs1',\n                        branchName: config.title, dkDocNo: dkDocNoNQ, dkDate, dkMonth, dkYear,\n                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,\n                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr\n                      });\n                      exportDocxBlob(blob, `Nghi_Quyet_${dkDocNoNQ}_${dkMonth}_${dkYear}`);"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ToolsManager.jsx successfully!');
