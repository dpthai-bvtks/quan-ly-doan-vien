import React from 'react';
import { Btn, SectionDivider } from './UI';

export default function Settings({ geminiApiKey, setGeminiApiKey, syncStatus }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: "#1a1a2e" }}>⚙️ Cài đặt hệ thống</h2>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Tùy chỉnh hệ thống và quản lý dữ liệu</p>
      </div>

      <div style={{ maxWidth: 720 }}>

        {/* CSDL API Status Card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 18 }}>
          <SectionDivider label="Kết nối Cơ sở dữ liệu đám mây" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#00b4d8,#0077b6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 }}>☁️</div>
              <div>
                <div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 15 }}>Hệ thống Google Apps Script API</div>
                <div style={{ fontSize: 12, color: syncStatus.includes('Lỗi') ? '#dc2626' : '#0077b6', fontWeight: 600, marginTop: 2 }}>
                  Trạng thái: {syncStatus}
                </div>
              </div>
            </div>
            <button
                onClick={() => window.location.reload()}
                style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "#e0f2fe", color: "#0284c7", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >
                Đồng bộ lại
            </button>
          </div>
        </div>

        {/* CSDL API Status Card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 18 }}>
          <SectionDivider label="Kết nối Cơ sở dữ liệu đám mây" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#00b4d8,#0077b6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 }}>☁️</div>
              <div>
                <div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 15 }}>Hệ thống Google Apps Script API</div>
                <div style={{ fontSize: 12, color: syncStatus.includes('Lỗi') ? '#dc2626' : '#0077b6', fontWeight: 600, marginTop: 2 }}>
                  Trạng thái: {syncStatus}
                </div>
              </div>
            </div>
            <button
                onClick={() => window.location.reload()}
                style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "#e0f2fe", color: "#0284c7", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >
                Đồng bộ lại
            </button>
          </div>
        </div>

        {/* AI & Gemini API Key */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 18 }}>
          <SectionDivider label="Cấu hình Trí tuệ Nhân tạo (Google Gemini)" />
          <div style={{ paddingTop: 14 }}>
            <div style={{ fontWeight: 600, color: "#1a1a2e", fontSize: 15, marginBottom: 4 }}>Khóa truy cập API (API Key)</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
              Dùng để AI tự động soạn thảo bộ câu hỏi trắc nghiệm. Lấy miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>aistudio.google.com</a>.
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <input 
                type="password" 
                value={geminiApiKey} 
                onChange={e => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem('geminiApiKey', e.target.value);
                }}
                placeholder="Nhập AIzaSy..." 
                style={{ flex: 1, padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, outline: "none", fontSize: 14 }}
              />
              <button 
                onClick={() => {
                  if (geminiApiKey) {
                    alert("Đã lưu API Key vào trình duyệt!");
                  } else {
                    alert("Vui lòng nhập API Key.");
                  }
                }}
                style={{ padding: "0 20px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#333" }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 18 }}>
          <SectionDivider label="Quản lý Dữ liệu" />
          {[
            { label: "Sao lưu dữ liệu (Export)", desc: "Tải xuống toàn bộ dữ liệu hiện tại về máy tính", btn: "Tải xuống bản sao lưu", v: "s" },
            { label: "Phục hồi dữ liệu (Import)", desc: "Khôi phục hệ thống từ file sao lưu trước đó", btn: "Chọn file sao lưu", v: "s" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{item.desc}</div>
              </div>
              <Btn v={item.v} onClick={() => alert("Tính năng đang được phát triển!")}>{item.btn}</Btn>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
            <div>
              <div style={{ fontWeight: 700, color: "#c1121f", fontSize: 14 }}>Khôi phục cài đặt gốc</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Xóa trắng toàn bộ dữ liệu. Thao tác này không thể hoàn tác!</div>
            </div>
            <Btn v="d" onClick={() => window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu không?")}>Xóa dữ liệu</Btn>
          </div>
        </div>

        {/* System Info */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <SectionDivider label="Thông tin hệ thống" />
          <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Phiên bản", "v1.0.0"],
              ["Nhà phát triển", "Antigravity AI"],
              ["Đơn vị sử dụng", "Chi đoàn Trung tâm y tế Than khu vực Mạo Khê"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f9f9f9" }}>
                <span style={{ color: "#999" }}>{k}</span>
                <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
