const fs = require('fs');

let content = fs.readFileSync('src/components/ToolsManager.jsx', 'utf8');

// 1. Replace imports
content = content.replace(
  "import htmlDocx from 'html-docx-js/dist/html-docx';",
  "import { generateDinhKyDocx, exportDocxBlob } from '../utils/docxGenerator';"
);

// 2. Replace exportHTMLToDoc usages
content = content.replace(
  /exportHTMLToDoc\(dkResults\.bao_cao,\s*`Bao_Cao_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`\);/g,
  `const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
                      const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
                      const config = getBranchConfig(currentUser?.username);
                      const blob = await generateDinhKyDocx('bao_cao', {
                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,
                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
                      });
                      exportDocxBlob(blob, \`Bao_Cao_\${dkDocNo}_\${dkMonth}_\${dkYear}\`);`
);

content = content.replace(
  /exportHTMLToDoc\(dkResults\.bien_ban,\s*`Bien_Ban_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`\);/g,
  `const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
                      const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
                      const config = getBranchConfig(currentUser?.username);
                      const blob = await generateDinhKyDocx('bien_ban', {
                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,
                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
                      });
                      exportDocxBlob(blob, \`Bien_Ban_\${dkDocNo}_\${dkMonth}_\${dkYear}\`);`
);

content = content.replace(
  /exportHTMLToDoc\(dkResults\.nghi_quyet,\s*`Nghi_Quyet_\$\{dkDocNo\}_\$\{dkMonth\}_\$\{dkYear\}`\);/g,
  `const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
                      const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
                      const config = getBranchConfig(currentUser?.username);
                      const blob = await generateDinhKyDocx('nghi_quyet', {
                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,
                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
                      });
                      exportDocxBlob(blob, \`Nghi_Quyet_\${dkDocNo}_\${dkMonth}_\${dkYear}\`);`
);

// Add async to onclicks
content = content.replace(/<button onClick=\{\(\) => \{[\s\n]*const nextMonth = dkMonth/g, '<button onClick={async () => {\nconst nextMonth = dkMonth');

// 3. Update handleSaveToDrive
content = content.replace(
  /const handleSaveToDrive = async \(content, type\) => \{[\s\S]*?showToast\(`Đã lưu \$\{filename\} lên Google Drive!`\);/,
  `const handleSaveToDrive = async (content, type) => {
    try {
      const config = getBranchConfig(currentUser?.username);
      let folderId = '';
      let filename = '';
      if (type === 'bao_cao') {
        folderId = '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';
        filename = \`Bao_Cao_\${dkDocNo}_\${dkMonth}_\${dkYear}\`;
      } else if (type === 'bien_ban') {
        folderId = '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV';
        filename = \`Bien_Ban_\${dkDocNo}_\${dkMonth}_\${dkYear}\`;
      } else if (type === 'nghi_quyet') {
        folderId = '1sbRu-eADECV4MN_uDQ7vwP0LjZ5lqeJu';
        filename = \`Nghi_Quyet_\${dkDocNo}_\${dkMonth}_\${dkYear}\`;
      } else if (type === 'ke_hoach') {
        folderId = '1g3Y-MgyR6kButQGiBrbuI9OFI5pAwTPn';
        filename = \`Ke_Hoach_Chuyen_De\`;
      }

      setLoadingDrive(prev => ({ ...prev, [type]: true }));

      // Mô-đun Định kỳ uses docx generator
      if (['bao_cao', 'bien_ban', 'nghi_quyet'].includes(type)) {
        const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
        const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
        const branchName = config.title;

        const docxBlob = await generateDinhKyDocx(type, {
          branchName, dkDocNo, dkDate, dkMonth, dkYear,
          results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
          nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
        });

        const file = new File([docxBlob], \`\${filename}.docx\`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        await uploadFileToDrive(file, folderId, config.apiUrl);
        showToast(\`Đã lưu \${filename}.docx lên Google Drive thành công!\`);
        setLoadingDrive(prev => ({ ...prev, [type]: false }));
        return;
      }

      // If content already contains HTML tags (like from Dinh Ky), do not convert
      const finalHTML = content.includes('<table') ? content : convertMarkdownToDocHTML(content);
      
      const header = \`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>\`;
      const sourceHTML = header + finalHTML + "</body></html>";
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const response = await fetch(source);
      const blob = await response.blob();
      const file = new File([blob], \`\${filename}.doc\`, { type: 'application/msword' });

      await uploadFileToDrive(file, folderId, config.apiUrl);
      showToast(\`Đã lưu \${filename}.doc lên Google Drive!\`);`
);

fs.writeFileSync('src/components/ToolsManager.jsx', content);
