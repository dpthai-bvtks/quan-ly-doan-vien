import React, { useState } from 'react';
import { Modal, FI, FS, FT, Btn } from './UI';
import { Sparkles, Calendar, FileText, Download, Briefcase, Activity, Check, Edit3, Save } from 'lucide-react';
import { getBranchConfig } from '../data/constants';

import { saveAs } from 'file-saver';
import { generateDinhKyDocx, exportDocxBlob, generateTongHopDocx } from '../utils/docxGenerator';

// Utility to export HTML to a .docx file
export const exportHTMLToDoc = (htmlContent, filename) => {
  const header = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>`;
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;
  const converted = htmlDocx.asBlob(sourceHTML);
  saveAs(converted, `${filename}.docx`);
};

// Markdown to Word HTML Document generator
const convertMarkdownToDocHTML = (markdownText) => {
  const htmlBody = markdownText
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) return `<h3 style="font-family: 'Times New Roman'; font-size: 13pt; font-weight: bold; margin-top: 10px; margin-bottom: 4px;">${trimmed.replace(/###/g, '').trim()}</h3>`;
      if (trimmed.startsWith('##')) return `<h2 style="font-family: 'Times New Roman'; font-size: 14pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px;">${trimmed.replace(/##/g, '').trim()}</h2>`;
      if (trimmed.startsWith('#')) return `<h1 style="font-family: 'Times New Roman'; font-size: 15pt; font-weight: bold; text-align: center; margin-top: 18px; margin-bottom: 8px;">${trimmed.replace(/#/g, '').trim()}</h1>`;
      if (trimmed.startsWith('-')) return `<li style="font-family: 'Times New Roman'; font-size: 12pt; margin-left: 20px; margin-bottom: 3px;">${trimmed.replace(/^-/g, '').trim()}</li>`;
      if (trimmed.startsWith('*')) return `<li style="font-family: 'Times New Roman'; font-size: 12pt; margin-left: 20px; margin-bottom: 3px;">${trimmed.replace(/^\\*/g, '').trim()}</li>`;
      if (trimmed) return `<p style="font-family: 'Times New Roman'; font-size: 12pt; text-indent: 1.27cm; text-align: justify; line-height: 1.25; margin-bottom: 5px;">${trimmed}</p>`;
      return '<br>';
    })
    .join('');

  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>Document</title></head><body>`;
  const footer = "</body></html>";
  return header + htmlBody + footer;
};

// API upload file to Drive
async function uploadFileToDrive(file, folderId, apiUrl) {
  if (!apiUrl) throw new Error("Chưa cấu hình Google Apps Script URL!");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload_file',
            folderId: folderId,
            name: file.name,
            mimeType: file.type || 'application/msword',
            base64: base64
          })
        });
        const data = await res.json();
        if (data.status === 'success') resolve(data);
        else reject(new Error(data.message || 'Lỗi không xác định'));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsDataURL(file);
  });
}

// API call helper using Gemini API but adapted for these tools
async function callGeminiAPI(prompt, geminiApiKey) {
  const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
  const modelsData = await modelsRes.json();
  if (modelsData.error) throw new Error("Lỗi API Key: " + modelsData.error.message);

  const availableModels = modelsData.models || [];
  const supportedModels = availableModels
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''))
    .sort((a, b) => {
      if (a.includes('flash') && !b.includes('flash')) return -1;
      if (!a.includes('flash') && b.includes('flash')) return 1;
      if (a.includes('pro') && !b.includes('pro')) return -1;
      if (!a.includes('pro') && b.includes('pro')) return 1;
      return 0;
    });

  if (supportedModels.length === 0) {
    throw new Error("Không tìm thấy mô hình AI phù hợp.");
  }

  let lastError = null;
  for (const model of supportedModels) {
    try {
      const parts = [{ text: prompt }];

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      console.warn(`Model ${model} thất bại:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("Tất cả các AI models đều bị lỗi!");
}

export default function ToolsManager({ plans, setPlans, isAdmin, currentUser, geminiApiKey }) {
  const [activeTab, setActiveTab] = useState('dinhky'); // dinhky | tonghop | kho

  const [thDocNo, setThDocNo] = useState('02');
  const [thDate, setThDate] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [thMonth, setThMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [thYear, setThYear] = useState(new Date().getFullYear().toString());
  const [thSecretary, setThSecretary] = useState('');
  const [thPeriod, setThPeriod] = useState('Quý I');
  const [thNextPeriod, setThNextPeriod] = useState('Quý II');
  const [thResultInput, setThResultInput] = useState('');
  const [thNextInput, setThNextInput] = useState('');

  const [dkDocNo, setDkDocNo] = useState('01');
  const [dkDate, setDkDate] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [dkMonth, setDkMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [dkYear, setDkYear] = useState(new Date().getFullYear().toString());
  const [dkSecretary, setDkSecretary] = useState('');
  const [dkResultInput, setDkResultInput] = useState('');
  const [dkNextInput, setDkNextInput] = useState('');
  const [dkResults, setDkResults] = useState({ bao_cao: '', bien_ban: '', nghi_quyet: '' });

  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState({});
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveToDrive = async (content, type) => {
    try {
      const config = getBranchConfig(currentUser?.username);
      let folderId = '';
      let filename = '';
      if (type === 'bao_cao') {
        folderId = '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';
        filename = `Bao_Cao_${dkDocNo}_${dkMonth}_${dkYear}`;
      } else if (type === 'bien_ban') {
        folderId = '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV';
        filename = `Bien_Ban_${dkDocNo}_${dkMonth}_${dkYear}`;
      } else if (type === 'nghi_quyet') {
        folderId = '1sbRu-eADECV4MN_uDQ7vwP0LjZ5lqeJu';
        filename = `Nghi_Quyet_${dkDocNo}_${dkMonth}_${dkYear}`;
      } else if (type === 'ke_hoach') {
        folderId = '1g3Y-MgyR6kButQGiBrbuI9OFI5pAwTPn';
        filename = `Ke_Hoach_Chuyen_De`;
      } else if (type === 'tong_hop') {
        folderId = '1uPciReR36oYs_8bdvRke8PbjJf0YL9HY';
        filename = `Bao_Cao_Tong_Hop_${thPeriod.replace(/ /g, '_')}_${thYear}`;
      }

      setLoadingDrive(prev => ({ ...prev, [type]: true }));

      // Mô-đun Định kỳ uses docx generator
      if (['bao_cao', 'bien_ban', 'nghi_quyet', 'tong_hop'].includes(type)) {
        const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
        const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
        const branchName = config.title;

        let docxBlob;
        if (type === 'tong_hop') {
          docxBlob = await generateTongHopDocx({
            branchName, thDocNo, thDate, thMonth, thYear,
            results: thResultInput, nextPlan: thNextInput, secretary: thSecretary,
            thPeriod, nextPeriodStr: thNextPeriod
          });
        } else {
          docxBlob = await generateDinhKyDocx(type, {
            branchName, dkDocNo, dkDate, dkMonth, dkYear,
            results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
            nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
          });
        }

        
        const file = new File([docxBlob], `${filename}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const uploadRes = await uploadFileToDrive(file, folderId, config.apiUrl);
        
        if (setPlans) {
          const fileId = uploadRes.fileId || uploadRes.id;
          const url = uploadRes.url || uploadRes.webViewLink;
          const newPlan = {
            id: Date.now(),
            title: filename.replace(/_/g, ' '),
            category: type === 'ke_hoach' ? 'Khởi nghiệp' : 'Sinh hoạt',
            startDate: `${dkYear}-${dkMonth}-${dkDate}`,
            endDate: `${dkYear}-${dkMonth}-${dkDate}`,
            status: 'Hoàn thành',
            responsible: dkSecretary || 'BCH Chi đoàn',
            description: type === 'bao_cao' ? dkResultInput : `Văn bản tạo tự động từ Mô-đun Công cụ`,
            attachment: { name: `${filename}.docx`, fileId: fileId, viewUrl: url }
          };
          setPlans(prev => [newPlan, ...prev]);
        }
        
        showToast(`Đã lưu ${filename}.docx lên Google Drive và thêm vào Danh sách Kế hoạch!`);

        setLoadingDrive(prev => ({ ...prev, [type]: false }));
        return;
      }

      // If content already contains HTML tags (like from Dinh Ky), do not convert
      const finalHTML = content.includes('<table') ? content : convertMarkdownToDocHTML(content);
      
      const header = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>`;
      const sourceHTML = header + finalHTML + "</body></html>";
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const response = await fetch(source);
      const blob = await response.blob();
      const file = new File([blob], `${filename}.doc`, { type: 'application/msword' });

      await uploadFileToDrive(file, folderId, config.apiUrl);
      showToast(`Đã lưu ${filename}.doc lên Google Drive!`);
    } catch (err) {
      alert("Lỗi lưu Drive: " + err.message);
    } finally {
      setLoadingDrive(prev => ({ ...prev, [type]: false }));
    }
  };

  // --- MÔ-ĐUN ĐỊNH KỲ ---

  const handleGenerateDk = async () => {
    if (!isAdmin) return alert("Bạn không có quyền thực hiện chức năng này!");
    if (!geminiApiKey) return alert("Vui lòng cấu hình Gemini API Key trong Cài đặt!");
    if (!dkResultInput.trim() && !dkNextInput.trim()) return alert("Vui lòng nhập kết quả đạt được hoặc phương hướng kỳ tới!");

    setLoadingAI(true);
    setDkResults({ bao_cao: '', bien_ban: '', nghi_quyet: '' });

    try {
      const config = getBranchConfig(currentUser?.username);
      const branchName = config.title;
      const tMonth = parseInt(dkMonth, 10);
      const tYear = parseInt(dkYear, 10);
      let nextMonth = tMonth + 1;
      let nextYear = tYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      const nextMonthStr = nextMonth.toString().padStart(2, '0');
      const branchSuffix = currentUser?.username === 'bvtks-cs1' ? 'BCHCS1' : 'BCHCS2';

      const resultsFormatted = dkResultInput.split('\n').filter(line => line.trim()).map(line => `<li style="margin-bottom: 6px;">${line.trim().replace(/^-/, '').trim()}</li>`).join('\n');
      const nextFormatted = dkNextInput.split('\n').filter(line => line.trim()).map(line => `<li style="margin-bottom: 6px;">${line.trim().replace(/^-/, '').trim()}</li>`).join('\n');
      const secName = dkSecretary.trim() || '.......................';

      // 1. Báo cáo
      const resBaoCao = `
<div style="font-family: 'Times New Roman', serif; font-size: 14pt;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Times New Roman', serif; font-size: 14pt; margin-bottom: 20px;">
    <tr>
      <td width="50%" align="center" valign="top">
        <span style="font-size: 13pt;">ĐTN BỆNH VIỆN THAN – KHOÁNG SẢN</span><br/>
        <strong>BCH CHI ĐOÀN BỆNH VIỆN</strong><br/>
        <strong>THAN - KHOÁNG SẢN CS2</strong><br/>
        <hr width="40%" size="1" color="black" noshade style="margin-top: 5px; margin-bottom: 5px;" />
        Số: ${dkDocNo}/${dkYear}-BC/ĐTNCS2
      </td>
      <td width="50%" align="center" valign="top">
        <strong>ĐOÀN TN CỘNG SẢN HỒ CHÍ MINH</strong><br/>
        <hr width="40%" size="1" color="black" noshade style="margin-top: 5px; margin-bottom: 5px;" />
        <br/>
        <em>Mạo Khê, ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}</em>
      </td>
    </tr>
  </table>

  <p align="center" style="font-weight: bold; font-size: 15pt; margin-top: 20px; font-family: 'Times New Roman', serif;">
    BÁO CÁO<br/>
    KẾT QUẢ HOẠT ĐỘNG CÔNG TÁC ĐOÀN VÀ PHONG TRÀO THANH NIÊN THÁNG ${dkMonth} VÀ PHƯƠNG HƯỚNG THÁNG ${nextMonthStr} NĂM ${nextYear}
  </p>

  <p align="justify" style="text-indent: 40px; margin-bottom: 10px; font-family: 'Times New Roman', serif;">
    Thực hiện Kế hoạch của BCH Đoàn thanh niên Bệnh viện Than - Khoáng sản về công tác đoàn năm ${dkYear}. Được sự quan tâm chỉ đạo trực tiếp của Chi bộ, từ tình hình hoạt động chung của toàn đơn vị. BCH ${branchName} báo cáo:
  </p>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">I. Kết quả hoạt động trong tháng ${dkMonth}/${dkYear}</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    ${resultsFormatted}
  </ul>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">II. Kế hoạch hoạt động ${nextMonthStr}/${nextYear}</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    ${nextFormatted}
  </ul>

  <p align="justify" style="text-indent: 40px; margin-bottom: 20px; font-family: 'Times New Roman', serif;">
    Trên đây là kết quả hoạt động công tác đoàn và phong trào TTN của ${branchName} trong tháng ${dkMonth}/${dkYear} và triển khai phương hướng nhiệm vụ trọng tâm trong tháng ${nextMonthStr}/${nextYear}.
  </p>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Times New Roman', serif; font-size: 14pt; margin-top: 30px;">
    <tr>
      <td width="50%"></td>
      <td width="50%" align="center" valign="top">
        <strong>TM. BAN CHẤP HÀNH</strong><br/>
        <strong>Bí thư</strong><br/>
        <br/><br/><br/><br/>
        <strong>Đặng Phong Thái</strong>
      </td>
    </tr>
  </table>
</div>`;

      // 2. Biên bản
      const resBienBan = `
<div style="font-family: 'Times New Roman', serif; font-size: 14pt;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Times New Roman', serif; font-size: 14pt; margin-bottom: 20px;">
    <tr>
      <td width="50%" align="center" valign="top">
        <span style="font-size: 13pt;">ĐTN BỆNH VIỆN THAN – KHOÁNG SẢN</span><br/>
        <strong>BCH CHI ĐOÀN BỆNH VIỆN</strong><br/>
        <strong>THAN - KHOÁNG SẢN CS2</strong><br/>
        <hr width="40%" size="1" color="black" noshade style="margin-top: 5px; margin-bottom: 5px;" />
        Số: ${dkDocNo}/${dkYear}-BB/ĐTNCS2
      </td>
      <td width="50%" align="center" valign="top">
        <strong>ĐOÀN TN CỘNG SẢN HỒ CHÍ MINH</strong><br/>
        <hr width="40%" size="1" color="black" noshade style="margin-top: 5px; margin-bottom: 5px;" />
        <br/>
        <em>Mạo Khê, ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}</em>
      </td>
    </tr>
  </table>

  <p align="center" style="font-weight: bold; font-size: 15pt; margin-top: 20px; font-family: 'Times New Roman', serif;">
    BIÊN BẢN<br/>
    HỘI NGHỊ BAN CHẤP HÀNH CHI ĐOÀN THÁNG ${dkMonth}/${dkYear}
  </p>

  <p style="margin-bottom: 10px; font-family: 'Times New Roman', serif;">
    - Thời gian: 14h00 ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}<br/>
    - Địa điểm: Phòng họp Chi đoàn<br/>
    - Thành phần: Các đồng chí trong BCH Chi đoàn<br/>
    - Chủ trì: Đồng chí Đặng Phong Thái - Bí thư Chi đoàn<br/>
    - Thư ký: Đồng chí ${secName}
  </p>

  <p align="center" style="font-weight: bold; font-size: 14pt; margin-bottom: 10px; font-family: 'Times New Roman', serif;">NỘI DUNG HỘI NGHỊ:</p>
  
  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">1. Đồng chí Chủ trì đánh giá kết quả hoạt động tháng ${dkMonth}/${dkYear}:</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    ${resultsFormatted}
  </ul>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">2. Triển khai phương hướng hoạt động tháng ${nextMonthStr}/${nextYear}:</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    ${nextFormatted}
  </ul>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">3. Thảo luận:</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    <li style="margin-bottom: 6px;">100% các đồng chí dự họp nhất trí với báo cáo kết quả hoạt động và phương hướng trên.</li>
    <li style="margin-bottom: 6px;">BCH nhất trí phân công nhiệm vụ cụ thể cho từng phân đoàn để triển khai hiệu quả.</li>
  </ul>

  <p style="margin-top: 10px; margin-bottom: 20px; font-family: 'Times New Roman', serif;">
    Hội nghị kết thúc vào 15h00 cùng ngày. Biên bản đã được thông qua tại hội nghị.
  </p>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Times New Roman', serif; font-size: 14pt; margin-top: 30px;">
    <tr>
      <td width="50%" align="center" valign="top">
        <strong>THƯ KÝ</strong><br/>
        <br/><br/><br/><br/>
        <strong>${secName}</strong>
      </td>
      <td width="50%" align="center" valign="top">
        <strong>CHỦ TRÌ</strong><br/>
        <strong>Bí thư</strong><br/>
        <br/><br/><br/><br/>
        <strong>Đặng Phong Thái</strong>
      </td>
    </tr>
  </table>
</div>`;

      // 3. Nghị quyết
      const resNghiQuyet = `
<div style="font-family: 'Times New Roman', serif; font-size: 14pt;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Times New Roman', serif; font-size: 14pt; margin-bottom: 20px;">
    <tr>
      <td width="50%" align="center" valign="top">
        <span style="font-size: 13pt;">ĐTN BỆNH VIỆN THAN – KHOÁNG SẢN</span><br/>
        <strong>BCH CHI ĐOÀN BỆNH VIỆN</strong><br/>
        <strong>THAN - KHOÁNG SẢN CS2</strong><br/>
        <hr width="40%" size="1" color="black" noshade style="margin-top: 5px; margin-bottom: 5px;" />
        Số: ${dkDocNo}/${dkYear}-NQ/ĐTNCS2
      </td>
      <td width="50%" align="center" valign="top">
        <strong>ĐOÀN TN CỘNG SẢN HỒ CHÍ MINH</strong><br/>
        <hr width="40%" size="1" color="black" noshade style="margin-top: 5px; margin-bottom: 5px;" />
        <br/>
        <em>Mạo Khê, ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}</em>
      </td>
    </tr>
  </table>

  <p align="center" style="font-weight: bold; font-size: 15pt; margin-top: 20px; font-family: 'Times New Roman', serif;">
    NGHỊ QUYẾT<br/>
    HỘI NGHỊ BAN CHẤP HÀNH CHI ĐOÀN THÁNG ${dkMonth}/${dkYear}
  </p>

  <p align="justify" style="text-indent: 40px; margin-bottom: 10px; font-family: 'Times New Roman', serif;">
    Căn cứ vào kết quả Hội nghị Ban Chấp hành Chi đoàn ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}, Ban Chấp hành Chi đoàn quyết nghị:
  </p>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">Điều 1. Nhất trí thông qua báo cáo kết quả hoạt động tháng ${dkMonth}/${dkYear} với các kết quả nổi bật:</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    ${resultsFormatted}
  </ul>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">Điều 2. Nhất trí thông qua phương hướng, nhiệm vụ tháng ${nextMonthStr}/${nextYear} gồm các nhiệm vụ trọng tâm:</p>
  <ul style="margin-top: 0; padding-left: 40px; text-align: justify; font-family: 'Times New Roman', serif;">
    ${nextFormatted}
  </ul>

  <p style="font-weight: bold; font-size: 14pt; margin-bottom: 5px; font-family: 'Times New Roman', serif;">Điều 3. Tổ chức thực hiện:</p>
  <p align="justify" style="text-indent: 40px; margin-bottom: 20px; font-family: 'Times New Roman', serif;">
    Giao cho Bí thư Chi đoàn, các đồng chí ủy viên BCH và các phân đoàn chịu trách nhiệm thi hành Nghị quyết này.
  </p>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-family: 'Times New Roman', serif; font-size: 14pt; margin-top: 30px;">
    <tr>
      <td width="50%"></td>
      <td width="50%" align="center" valign="top">
        <strong>TM. BAN CHẤP HÀNH</strong><br/>
        <strong>Bí thư</strong><br/>
        <br/><br/><br/><br/>
        <strong>Đặng Phong Thái</strong>
      </td>
    </tr>
  </table>
</div>`;

      setDkResults({ bao_cao: resBaoCao, bien_ban: resBienBan, nghi_quyet: resNghiQuyet });
      showToast("Đã tạo xong Bộ ba văn bản tháng (Tạo tự động, không dùng AI)!");
    } catch (err) {
      alert("Lỗi tạo văn bản: " + err.message);
    } finally {
      setLoadingAI(false);
    }
  };


  // --- KHO BIỂU MẪU SỐ ---
  const downloadForm = (formType) => {
    let content = "";
    let title = "";
    
    if (formType === 'daihoi') {
      title = "Ho_So_Dai_Hoi_Chi_Doan";
      content = `
        <h1 style="text-align:center;">HỒ SƠ ĐẠI HỘI CHI ĐOÀN</h1>
        <hr>
        <h2>1. Báo cáo chính trị của BCH đương nhiệm tại Đại hội</h2>
        <p>[Điền nội dung báo cáo chính trị tại đây...]</p>
        <h2>2. Bản kiểm điểm của BCH đương nhiệm</h2>
        <p>[Điền bản kiểm điểm tại đây...]</p>
        <h2>3. Đề án nhân sự BCH nhiệm kỳ mới</h2>
        <p>[Cơ cấu, số lượng, tiêu chuẩn...]</p>
        <h2>4. Mẫu Biên bản kiểm phiếu</h2>
        <p>[Biên bản bầu cử BCH, Bí thư...]</p>
        <h2>5. Nghị quyết Đại hội Chi đoàn</h2>
        <p>[Nội dung nghị quyết...]</p>
        <h2>6. Tờ trình đề nghị Đoàn cấp trên chuẩn y</h2>
        <p>[Nội dung tờ trình...]</p>
      `;
    } else if (formType === 'vaodang') {
      title = "Ho_So_Xay_Dung_Dang";
      content = `
        <h1 style="text-align:center;">HỒ SƠ THAM GIA XÂY DỰNG ĐẢNG</h1>
        <hr>
        <h2>1. Danh sách theo dõi Đoàn viên ưu tú</h2>
        <p>[Trích xuất từ Webapp...]</p>
        <h2>2. Biên bản họp xét giới thiệu Đoàn viên ưu tú vào Đảng</h2>
        <p>[Đạt trên 2/3 số phiếu tán thành...]</p>
        <h2>3. Nghị quyết giới thiệu Đoàn viên ưu tú vào Đảng của BCH Chi đoàn</h2>
        <p>[Ký đóng dấu gửi Đảng ủy/Chi bộ...]</p>
      `;
    } else if (formType === 'khenthuong') {
      title = "Ho_So_Khen_Thuong_Ky_Luat";
      content = `
        <h1 style="text-align:center;">HỒ SƠ KHEN THƯỞNG & KỶ LUẬT</h1>
        <hr>
        <h2>Phần A: Khen thưởng</h2>
        <h3>1. Tờ trình đề nghị khen thưởng</h3>
        <p>[Nội dung tờ trình...]</p>
        <h3>2. Báo cáo thành tích cá nhân/tập thể</h3>
        <p>[Khai báo chi tiết thành tích...]</p>
        
        <h2>Phần B: Kỷ luật</h2>
        <h3>1. Biên bản họp kiểm điểm đoàn viên vi phạm</h3>
        <p>[Nội dung biên bản...]</p>
        <h3>2. Tờ trình đề nghị hình thức kỷ luật gửi Đoàn cấp trên</h3>
        <p>[Nội dung tờ trình...]</p>
      `;
    }
    exportHTMLToDoc(content, title);
    showToast(`Đã tải xuống biểu mẫu: ${title}.doc`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase className="text-red-600" /> Công cụ Hỗ trợ & Trí tuệ Nhân tạo
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tự động hóa tác vụ văn thư hành chính, lập kế hoạch và tổng hợp dữ liệu</p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg z-50 text-sm font-bold flex items-center gap-2 animate-fade-in-up">
          <Check size={18} /> {toast}
        </div>
      )}

      {/* TABS MENU */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('dinhky')}
          className={`flex-1 py-3 px-2 min-w-[150px] text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'dinhky' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Calendar size={18} /> Mô-đun Định kỳ
        </button>
        <button
          onClick={() => setActiveTab('tonghop')}
          className={`flex-1 py-3 px-2 min-w-[150px] text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'tonghop' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Activity size={18} /> Mô-đun Tổng hợp
        </button>
        <button
          onClick={() => setActiveTab('kho')}
          className={`flex-1 py-3 px-2 min-w-[150px] text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'kho' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileText size={18} /> Kho Biểu mẫu Số
        </button>
      </div>

      {/* CONTENT: ĐỊNH KỲ */}
      {activeTab === 'dinhky' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Bộ ba văn bản tháng (Biên bản - Nghị quyết - Báo cáo)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <FI label="Số văn bản" value={dkDocNo} onChange={e => setDkDocNo(e.target.value)} placeholder="01" />
            <FI label="Ngày" type="number" value={dkDate} onChange={e => setDkDate(e.target.value)} />
            <FI label="Tháng" type="number" value={dkMonth} onChange={e => setDkMonth(e.target.value)} />
            <FI label="Năm" type="number" value={dkYear} onChange={e => setDkYear(e.target.value)} />
            <FI label="Thư ký" value={dkSecretary} onChange={e => setDkSecretary(e.target.value)} placeholder="Tên thư ký..." />
          </div>
          <div className="space-y-4">
            <FT 
              label="1. KẾT QUẢ ĐẠT ĐƯỢC (Ý CHÍNH)" 
              placeholder="Điền các kết quả trong kỳ, mỗi ý một dòng. Ví dụ:\nDuy trì vận chuyển bình oxy\nTổ chức ra quân vệ sinh đón Tết âm lịch"
              value={dkResultInput}
              onChange={e => setDkResultInput(e.target.value)}
            />
            <FT 
              label="2. PHƯƠNG HƯỚNG KỲ TỚI (Ý CHÍNH)" 
              placeholder="Điền các hoạt động kế hoạch kỳ tới, mỗi ý một dòng. Ví dụ:\nTổ chức tặng quà trực Tết\nHội thao ngày Thầy thuốc VN 27/2"
              value={dkNextInput}
              onChange={e => setDkNextInput(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Btn onClick={handleGenerateDk} disabled={loadingAI}>
              {loadingAI ? '⏳ Đang xử lý...' : '🪄 Tạo Bộ 3 Văn Bản (Mẫu Chuẩn)'}
            </Btn>
          </div>

          {(dkResults.bao_cao || dkResults.bien_ban || dkResults.nghi_quyet) && (
            <div className="mt-6 space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-red-700">📄 Báo cáo hoạt động</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
                      const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
                      const config = getBranchConfig(currentUser?.username);
                      const blob = await generateDinhKyDocx('bao_cao', {
                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,
                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
                      });
                      exportDocxBlob(blob, `Bao_Cao_${dkDocNo}_${dkMonth}_${dkYear}`);
                    }} className="text-xs flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-bold">
                      <Download size={14} /> Tải Word (.docx)
                    </button>
                    <button onClick={() => handleSaveToDrive(dkResults.bao_cao, 'bao_cao')} disabled={loadingDrive['bao_cao']} className="text-xs flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition font-bold">
                      <Save size={14} /> {loadingDrive['bao_cao'] ? 'Đang lưu...' : 'Lưu lên Drive'}
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-300 rounded overflow-auto max-h-[500px]" dangerouslySetInnerHTML={{ __html: dkResults.bao_cao }} />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-blue-700">📝 Biên bản sinh hoạt / họp BCH</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
                      const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
                      const config = getBranchConfig(currentUser?.username);
                      const blob = await generateDinhKyDocx('bien_ban', {
                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,
                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
                      });
                      exportDocxBlob(blob, `Bien_Ban_${dkDocNo}_${dkMonth}_${dkYear}`);
                    }} className="text-xs flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-bold">
                      <Download size={14} /> Tải Word (.docx)
                    </button>
                    <button onClick={() => handleSaveToDrive(dkResults.bien_ban, 'bien_ban')} disabled={loadingDrive['bien_ban']} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition font-bold">
                      <Save size={14} /> {loadingDrive['bien_ban'] ? 'Đang lưu...' : 'Lưu lên Drive'}
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-300 rounded overflow-auto max-h-[500px]" dangerouslySetInnerHTML={{ __html: dkResults.bien_ban }} />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-green-700">📜 Nghị quyết Ban Chấp hành</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
const nextMonth = dkMonth === '12' ? 1 : parseInt(dkMonth, 10) + 1;
                      const nextYearStr = dkMonth === '12' ? (parseInt(dkYear, 10) + 1).toString() : dkYear;
                      const config = getBranchConfig(currentUser?.username);
                      const blob = await generateDinhKyDocx('nghi_quyet', {
                        branchName: config.title, dkDocNo, dkDate, dkMonth, dkYear,
                        results: dkResultInput, nextPlan: dkNextInput, secretary: dkSecretary,
                        nextMonthStr: nextMonth.toString().padStart(2, '0'), nextYearStr
                      });
                      exportDocxBlob(blob, `Nghi_Quyet_${dkDocNo}_${dkMonth}_${dkYear}`);
                    }} className="text-xs flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-bold">
                      <Download size={14} /> Tải Word (.docx)
                    </button>
                    <button onClick={() => handleSaveToDrive(dkResults.nghi_quyet, 'nghi_quyet')} disabled={loadingDrive['nghi_quyet']} className="text-xs flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition font-bold">
                      <Save size={14} /> {loadingDrive['nghi_quyet'] ? 'Đang lưu...' : 'Lưu lên Drive'}
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-white border border-gray-300 rounded overflow-auto max-h-[500px]" dangerouslySetInnerHTML={{ __html: dkResults.nghi_quyet }} />
              </div>
            </div>
          )}
        </div>
      )}
      {/* CONTENT: TỔNG HỢP */}
      {activeTab === 'tonghop' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-bold text-gray-800">Soạn Báo cáo Tổng kết Định kỳ (Quý/6 tháng/Năm)</h2>
            <button 
              onClick={() => {
                let targetMonths = [];
                if (thPeriod === 'Quý I') targetMonths = [1, 2, 3];
                else if (thPeriod === 'Quý II') targetMonths = [4, 5, 6];
                else if (thPeriod === 'Quý III') targetMonths = [7, 8, 9];
                else if (thPeriod === 'Quý IV') targetMonths = [10, 11, 12];
                else if (thPeriod === '6 tháng đầu năm') targetMonths = [1, 2, 3, 4, 5, 6];
                else if (thPeriod === '6 tháng cuối năm') targetMonths = [7, 8, 9, 10, 11, 12];
                else if (thPeriod === 'Cả năm') targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

                const reports = (plans || []).filter(p => {
                  const isReport = p.title.toLowerCase().includes('bao cao') && !p.title.toLowerCase().includes('tong hop');
                  const d = new Date(p.startDate);
                  const m = d.getMonth() + 1;
                  const y = d.getFullYear().toString();
                  return isReport && y === thYear && targetMonths.includes(m);
                });

                if (reports.length === 0) {
                  alert(`Không tìm thấy Báo cáo tháng nào trong ${thPeriod} năm ${thYear}!`);
                  return;
                }

                reports.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                const combined = reports.map(r => {
                  const monthStr = new Date(r.startDate).getMonth() + 1;
                  let desc = r.description || '';
                  if (desc === 'Văn bản tạo tự động từ Mô-đun Công cụ') desc = '(Không có dữ liệu văn bản chi tiết)';
                  return `* Kết quả tháng ${monthStr}:\n${desc}`;
                }).join('\n\n');

                setThResultInput(combined);
                showToast(`Đã gộp thành công ${reports.length} báo cáo tháng vào Kết quả nổi bật!`);
              }}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-lg transition flex items-center gap-1"
            >
              <Activity size={14} /> Tự động lấy dữ liệu từ Báo cáo cũ
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FS label="Kỳ báo cáo" opts={['Quý I', 'Quý II', 'Quý III', 'Quý IV', '6 tháng đầu năm', '6 tháng cuối năm', 'Cả năm']} value={thPeriod} onChange={e => setThPeriod(e.target.value)} />
                <FS label="Phương hướng kỳ tới" opts={['Quý I', 'Quý II', 'Quý III', 'Quý IV', '6 tháng đầu năm', '6 tháng cuối năm', 'Cả năm']} value={thNextPeriod} onChange={e => setThNextPeriod(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FI label="Số văn bản" placeholder="Ví dụ: 08" value={thDocNo} onChange={e => setThDocNo(e.target.value)} />
                <FI label="Năm" placeholder="Năm thực hiện" value={thYear} onChange={e => setThYear(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FI label="Ngày ban hành" placeholder="Ngày" value={thDate} onChange={e => setThDate(e.target.value)} />
                <FI label="Tháng ban hành" placeholder="Tháng" value={thMonth} onChange={e => setThMonth(e.target.value)} />
              </div>
              <FI label="Thư ký / Người soạn" placeholder="Họ và tên" value={thSecretary} onChange={e => setThSecretary(e.target.value)} />
            </div>
            <div className="space-y-4">
              <FT label="Kết quả nổi bật (gạch đầu dòng)" placeholder="- Ý 1...&#10;- Ý 2..." value={thResultInput} onChange={e => setThResultInput(e.target.value)} rows={4} />
              <FT label="Phương hướng trọng tâm (gạch đầu dòng)" placeholder="- Ý 1...&#10;- Ý 2..." value={thNextInput} onChange={e => setThNextInput(e.target.value)} rows={4} />
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <button 
              onClick={async () => {
                const config = getBranchConfig(currentUser?.username);
                const docxBlob = await generateTongHopDocx({
                  branchName: config.title, thDocNo, thDate, thMonth, thYear,
                  results: thResultInput, nextPlan: thNextInput, secretary: thSecretary,
                  thPeriod, nextPeriodStr: thNextPeriod
                });
                exportDocxBlob(docxBlob, `Bao_Cao_Tong_Hop_${thPeriod.replace(/ /g, '_')}_${thYear}`);
              }}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
              <Download size={20} /> Tải xuống Word (.docx)
            </button>
            <button 
              onClick={() => handleSaveToDrive(null, 'tong_hop')} disabled={loadingDrive['tong_hop']}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-70">
              <Save size={20} /> {loadingDrive['tong_hop'] ? 'Đang lưu lên Drive...' : 'Lưu Báo cáo lên Drive'}
            </button>
          </div>
        </div>
      )}

      {/* CONTENT: KHO BIỂU MẪU */}
      {activeTab === 'kho' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Kho Biểu mẫu Số (Template Cố định)</h2>
          <p className="text-sm text-gray-600 mb-6">
            Dành cho các bộ hồ sơ mang tính pháp lý cao, sử dụng các form chuẩn hành chính có thể tải xuống file Word để chỉnh sửa thêm.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Đại hội */}
            <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 text-red-600 p-3 rounded-lg"><Briefcase size={24} /></div>
                <h3 className="font-bold text-gray-800">Đại hội Chi đoàn</h3>
              </div>
              <ul className="text-xs text-gray-600 space-y-2 mb-5 list-disc pl-4">
                <li>Báo cáo chính trị BCH</li>
                <li>Bản kiểm điểm BCH</li>
                <li>Đề án nhân sự nhiệm kỳ mới</li>
                <li>Biên bản bầu cử</li>
                <li>Nghị quyết Đại hội</li>
              </ul>
              <button 
                onClick={() => downloadForm('daihoi')}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Download size={16} /> Tải Mẫu Word
              </button>
            </div>

            {/* Vào Đảng */}
            <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg"><Edit3 size={24} /></div>
                <h3 className="font-bold text-gray-800">Xây dựng Đảng</h3>
              </div>
              <ul className="text-xs text-gray-600 space-y-2 mb-5 list-disc pl-4">
                <li>Danh sách theo dõi ĐVƯT</li>
                <li>Biên bản họp xét giới thiệu ĐVƯT</li>
                <li>Nghị quyết giới thiệu ĐVƯT vào Đảng của BCH</li>
              </ul>
              <button 
                onClick={() => downloadForm('vaodang')}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Download size={16} /> Tải Mẫu Word
              </button>
            </div>

            {/* Khen thưởng */}
            <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg"><Check size={24} /></div>
                <h3 className="font-bold text-gray-800">Khen thưởng & Kỷ luật</h3>
              </div>
              <ul className="text-xs text-gray-600 space-y-2 mb-5 list-disc pl-4">
                <li>Tờ trình đề nghị khen thưởng</li>
                <li>Báo cáo thành tích</li>
                <li>Biên bản họp kiểm điểm</li>
                <li>Tờ trình kỷ luật</li>
              </ul>
              <button 
                onClick={() => downloadForm('khenthuong')}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Download size={16} /> Tải Mẫu Word
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
