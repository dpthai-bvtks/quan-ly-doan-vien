import React, { useState } from 'react';
import { Modal, FI, FS, FT, Btn } from './UI';
import { Sparkles, Calendar, FileText, Download, Briefcase, Activity, Check, Edit3, Save } from 'lucide-react';
import { getBranchConfig } from '../data/constants';

// Utility to export HTML to a .doc file
export const exportHTMLToDoc = (htmlContent, filename) => {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>Export HTML to Word</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14pt; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Times New Roman', serif; }
  </style>
  </head><body>`;
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;

  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = `${filename}.doc`;
  fileDownload.click();
  document.body.removeChild(fileDownload);
};

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

export default function ToolsManager({ plans, isAdmin, currentUser, geminiApiKey }) {
  const [activeTab, setActiveTab] = useState('dinhky'); // dinhky | tonghop | chiendich | kho

  const [loadingAI, setLoadingAI] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // --- MÔ-ĐUN ĐỊNH KỲ ---
  const [dkDocNo, setDkDocNo] = useState('01');
  const [dkMonth, setDkMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [dkYear, setDkYear] = useState(new Date().getFullYear().toString());
  const [dkResultInput, setDkResultInput] = useState('');
  const [dkNextInput, setDkNextInput] = useState('');
  const [dkResults, setDkResults] = useState({ bao_cao: '', bien_ban: '', nghi_quyet: '' });

  const handleGenerateDk = async () => {
    if (!isAdmin) return alert("Bạn không có quyền thực hiện chức năng này!");
    if (!geminiApiKey) return alert("Vui lòng cấu hình Gemini API Key trong Cài đặt!");
    if (!dkResultInput.trim() && !dkNextInput.trim()) return alert("Vui lòng nhập kết quả đạt được hoặc phương hướng kỳ tới!");

    setLoadingAI(true);
    setDkResults({ bao_cao: '', bien_ban: '', nghi_quyet: '' });

    try {
      const context = `Chi đoàn ${getBranchConfig(currentUser?.username).title.replace(/\n/g, ' ')}`;
      const branchSuffix = currentUser?.username === 'bvtks-cs1' ? 'BCHCS1' : 'BCHCS2';
      
      const basePrompt = `Đơn vị: ${context}\nTháng: ${dkMonth}/${dkYear}
1. KẾT QUẢ ĐẠT ĐƯỢC: \n${dkResultInput}
2. PHƯƠNG HƯỚNG KỲ TỚI: \n${dkNextInput}\n`;

      const pBaoCao = `${basePrompt}Bạn là Bí thư Chi đoàn. Hãy viết BÁO CÁO HOẠT ĐỘNG THÁNG phong cách tổng kết, chi tiết, trang trọng, văn phong chuẩn Đoàn. Định dạng Markdown. Góc trên cùng văn bản phải ghi rõ: Số: ${dkDocNo}-${dkMonth}-${dkYear}-BC/${branchSuffix}.`;
      const pBienBan = `${basePrompt}Bạn là Thư ký Hội nghị Ban Chấp hành Chi đoàn. Hãy lập "Biên bản Hội nghị" tháng này. Ghi nhận trung thực diễn biến, có phần thảo luận, đóng góp ý kiến của các ủy viên và kết luận của chủ tọa. Định dạng chuẩn hành chính gồm: Thời gian, địa điểm, thành phần, nội dung chi tiết. Định dạng Markdown. Góc trên cùng văn bản phải ghi rõ: Số: ${dkDocNo}-${dkMonth}-${dkYear}-BB/${branchSuffix}.`;
      const pNghiQuyet = `${basePrompt}Bạn là Bí thư Chi đoàn. Hãy viết NGHỊ QUYẾT BAN CHẤP HÀNH THÁNG phong cách chỉ đạo, quyết nghị, giao việc cụ thể. Định dạng Markdown. Góc trên cùng văn bản phải ghi rõ: Số: ${dkDocNo}-${dkMonth}-${dkYear}-NQ/${branchSuffix}.`;

      // Parallel calls
      const [resBaoCao, resBienBan, resNghiQuyet] = await Promise.all([
        callGeminiAPI(pBaoCao, geminiApiKey),
        callGeminiAPI(pBienBan, geminiApiKey),
        callGeminiAPI(pNghiQuyet, geminiApiKey)
      ]);

      setDkResults({ bao_cao: resBaoCao, bien_ban: resBienBan, nghi_quyet: resNghiQuyet });
      showToast("Đã tạo xong Bộ ba văn bản tháng!");
    } catch (err) {
      alert("Lỗi AI: " + err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  // --- MÔ-ĐUN TỔNG HỢP ---
  const [thYear, setThYear] = useState(new Date().getFullYear().toString());
  const [thResult, setThResult] = useState('');

  const handleGenerateTh = async () => {
    if (!isAdmin) return alert("Bạn không có quyền thực hiện chức năng này!");
    if (!geminiApiKey) return alert("Vui lòng cấu hình Gemini API Key!");
    setLoadingAI(true);
    setThResult('');

    try {
      // MAP: Lấy kế hoạch trong năm và phân nhóm
      const plansInYear = (plans || []).filter(p => {
        if (!p.startDate) return false;
        return p.startDate.startsWith(thYear) && p.status === 'Hoàn thành';
      });

      if (plansInYear.length === 0) {
         setLoadingAI(false);
         return alert(`Không tìm thấy hoạt động nào đã hoàn thành trong năm ${thYear} trong cơ sở dữ liệu!`);
      }

      const summaryData = plansInYear.map(p => `- ${p.title}: ${p.description}`).join('\n');
      
      // REDUCE
      const context = `Chi đoàn ${getBranchConfig(currentUser?.username).title.replace(/\n/g, ' ')}`;
      const prompt = `Context: Dưới đây là dữ liệu tóm tắt các hoạt động đã hoàn thành của ${context} trong năm ${thYear}:
${summaryData}

Nhiệm vụ: Hãy soạn thảo "Báo cáo Tổng kết công tác Đoàn và phong trào thanh niên năm ${thYear}". Văn bản phải có kết cấu:
I. ĐẶC ĐIỂM TÌNH HÌNH (Thuận lợi, khó khăn tự suy luận dựa trên thực tế).
II. KẾT QUẢ ĐẠT ĐƯỢC (Đánh giá định tính và định lượng dựa trên dữ liệu. Phải chỉ rõ ưu điểm và những mặt còn hạn chế, nguyên nhân).
III. PHƯƠNG HƯỚNG NHIỆM VỤ NĂM TỚI (Các chỉ tiêu cơ bản).

Yêu cầu văn phong trang trọng, khái quát hóa cao, viết theo form chuẩn của Đoàn. Trả về Markdown.`;

      const report = await callGeminiAPI(prompt, geminiApiKey);
      setThResult(report);
      showToast("Đã tổng hợp Báo cáo Tổng kết năm!");
    } catch (err) {
      alert("Lỗi AI: " + err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  // --- MÔ-ĐUN CHIẾN DỊCH ---
  const [cdInput, setCdInput] = useState('');
  const [cdResult, setCdResult] = useState('');

  const handleGenerateCd = async () => {
    if (!isAdmin) return alert("Bạn không có quyền thực hiện chức năng này!");
    if (!geminiApiKey) return alert("Vui lòng cấu hình Gemini API Key!");
    if (!cdInput.trim()) return alert("Vui lòng nhập ý tưởng hoặc chỉ đạo!");
    setLoadingAI(true);
    setCdResult('');

    try {
      const prompt = `Nhiệm vụ: Hãy lập "Kế hoạch tổ chức hoạt động chuyên đề/Công trình thanh niên" dựa trên ý tưởng sau: "${cdInput}".
Bản kế hoạch bắt buộc phải được triển khai theo cấu trúc chuẩn:
1. MỤC ĐÍCH - YÊU CẦU (Tại sao phải làm? Đạt được hiệu quả gì?).
2. NỘI DUNG - HÌNH THỨC (Làm cái gì? Làm ở đâu? Quy mô thế nào?).
3. TIẾN ĐỘ THỰC HIỆN (Chia làm các giai đoạn: Chuẩn bị, Triển khai, Nghiệm thu/Tổng kết kèm mốc thời gian cụ thể).
4. BIỆN PHÁP TỔ CHỨC THỰC HIỆN (Thành lập Ban chỉ đạo, phân công phân đoàn nào chủ trì, phối hợp).
5. DỰ TRÙ KINH PHÍ VÀ CƠ SỞ VẬT CHẤT (Các hạng mục cần chuẩn bị).

Yêu cầu chi tiết, khả thi, văn phong chuẩn hành chính. Trả về định dạng Markdown.`;

      const plan = await callGeminiAPI(prompt, geminiApiKey);
      setCdResult(plan);
      showToast("Đã thiết kế xong Kế hoạch chiến dịch!");
    } catch (err) {
      alert("Lỗi AI: " + err.message);
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
          onClick={() => setActiveTab('chiendich')}
          className={`flex-1 py-3 px-2 min-w-[150px] text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'chiendich' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Sparkles size={18} /> Mô-đun Chiến dịch
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
          <div className="grid grid-cols-3 gap-4 mb-4">
            <FI label="Số văn bản" value={dkDocNo} onChange={e => setDkDocNo(e.target.value)} placeholder="01" />
            <FI label="Tháng" type="number" value={dkMonth} onChange={e => setDkMonth(e.target.value)} />
            <FI label="Năm" type="number" value={dkYear} onChange={e => setDkYear(e.target.value)} />
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
              {loadingAI ? '⏳ Đang xử lý bởi AI...' : '🪄 Tạo Bộ 3 Văn Bản'}
            </Btn>
          </div>

          {(dkResults.bao_cao || dkResults.bien_ban || dkResults.nghi_quyet) && (
            <div className="mt-6 space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-red-700 mb-2">📄 Báo cáo hoạt động</h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{dkResults.bao_cao}</pre>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-blue-700 mb-2">📝 Biên bản sinh hoạt / họp BCH</h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{dkResults.bien_ban}</pre>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-green-700 mb-2">📜 Nghị quyết Ban Chấp hành</h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{dkResults.nghi_quyet}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: TỔNG HỢP */}
      {activeTab === 'tonghop' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Máy tổng hợp Báo cáo Sơ kết / Tổng kết năm</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tính năng này sử dụng kỹ thuật <strong>Map-Reduce</strong>: Tự động quét và gom nhóm các Kế hoạch/Hoạt động có trạng thái "Hoàn thành" trong cơ sở dữ liệu, sau đó sinh báo cáo tổng kết toàn diện.
          </p>
          <div className="max-w-xs mb-4">
            <FI label="Năm cần tổng hợp" type="number" value={thYear} onChange={e => setThYear(e.target.value)} />
          </div>
          <div className="flex justify-start">
            <Btn onClick={handleGenerateTh} disabled={loadingAI}>
               {loadingAI ? '⏳ Đang quét DB & phân tích...' : '🔍 Khởi chạy Map-Reduce'}
            </Btn>
          </div>
          {thResult && (
            <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-3 text-lg">Báo cáo Tổng kết tự động</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{thResult}</pre>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: CHIẾN DỊCH */}
      {activeTab === 'chiendich' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Thiết kế Kế hoạch Chuyên đề & Công trình thanh niên</h2>
          <FT 
            label="Nhập Ý tưởng thô hoặc Chỉ đạo từ cấp trên" 
            placeholder="Ví dụ: Đoàn cấp trên chỉ đạo dọn vệ sinh đón Tết, hoặc muốn làm một công trình thanh niên về số hóa..."
            value={cdInput}
            onChange={e => setCdInput(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <Btn onClick={handleGenerateCd} disabled={loadingAI}>
              {loadingAI ? '⏳ Đang thiết kế kế hoạch...' : '💡 Lên Kế Hoạch Chi Tiết'}
            </Btn>
          </div>
          {cdResult && (
            <div className="mt-6 p-5 bg-green-50 rounded-xl border border-green-100">
              <h3 className="font-bold text-green-800 mb-3 text-lg">Kế hoạch đã được rã chi tiết</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{cdResult}</pre>
            </div>
          )}
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
