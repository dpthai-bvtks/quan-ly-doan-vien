import React, { useState } from 'react';
import axios from 'axios';
import { Modal, FI, FS, FT, Btn, Th, Td } from './UI';
import { 
  Upload, FileText, Download, Eye, Loader2, Trash2, 
  Search, Plus, Filter, Calendar, Users, CheckCircle2, 
  BookOpen, Edit3, ArrowUpRight, ArrowDownLeft, AlertCircle 
} from 'lucide-react';

import { getBranchConfig } from '../data/constants';

// Hàm upload file lên Google Drive
async function uploadFileToDrive(file, folderId, apiUrl) {
  if (!apiUrl) {
    throw new Error("Chưa cấu hình Google Apps Script URL cho Chi đoàn này!");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const payload = {
          action: 'upload_file',
          folderId: folderId,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64: base64
        };

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.status === 'success') {
          resolve({ id: data.fileId, name: file.name, webViewLink: data.url });
        } else {
          reject(new Error(data.message || 'Lỗi không xác định'));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsDataURL(file);
  });
}

// Hàm xóa file từ Google Drive
async function deleteFileFromDrive(fileId, apiUrl) {
  if (!apiUrl) return;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'delete_file', fileId })
  });
  const data = await res.json();
  if (data.status === 'error') {
    throw new Error(data.message);
  }
}

export default function DocumentManager({ isAdmin, currentUser, selectedBranch, documents = [], setDocuments }) {
  // State quản lý bộ lọc
  const [activeTab, setActiveTab] = useState('OUT'); // 'OUT' (Đi) | 'IN' (Đến)
  const [search, setSearch] = useState('');
  
  // State quản lý Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // State Form Văn bản đi
  const [docNumber, setDocNumber] = useState('');
  const [dateIssued, setDateIssued] = useState('');
  const [recipient, setRecipient] = useState('');
  const [summary, setSummary] = useState('');
  const [signer, setSigner] = useState('');
  const [notes, setNotes] = useState('');

  // State Form Văn bản đến
  const [inNumber, setInNumber] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [sender, setSender] = useState('');
  const [docNumberCấpTrên, setDocNumberCấpTrên] = useState('');
  const [receiver, setReceiver] = useState('');
  const [direction, setDirection] = useState('');

  // State chọn chi đoàn (chỉ cho Super Admin xem, tuy nhiên khi upload thì theo tài khoản hiện tại)
  const [uploadBranch, setUploadBranch] = useState('cs1');
  const isSuperAdmin = currentUser?.username === 'admin-bvtks';
  const currentBranch = currentUser?.username === 'bvtks-cs1' ? 'cs1' : 'cs2';

  // Mở modal thêm văn bản mới
  const handleOpenAddModal = () => {
    // Reset form
    setDocNumber('');
    setDateIssued(new Date().toISOString().split('T')[0]);
    setRecipient('');
    setSummary('');
    setSigner('');
    setNotes('');

    setInNumber('');
    setDateReceived(new Date().toISOString().split('T')[0]);
    setSender('');
    setDocNumberCấpTrên('');
    setReceiver('');
    setDirection('');

    setSelectedFile(null);
    setShowAddModal(true);
  };

  // Lưu đăng ký văn bản mới
  const handleSaveDoc = async () => {
    if (!isAdmin) {
      alert("Tài khoản khách không có quyền đăng ký văn bản!");
      return;
    }

    if (activeTab === 'OUT') {
      if (!docNumber.trim() || !recipient.trim() || !summary.trim() || !signer.trim()) {
        alert("Vui lòng điền đầy đủ thông tin bắt buộc của Công văn đi!");
        return;
      }
    } else {
      if (!inNumber.trim() || !sender.trim() || !summary.trim() || !receiver.trim()) {
        alert("Vui lòng điền đầy đủ thông tin bắt buộc của Công văn đến!");
        return;
      }
    }

    setUploading(true);
    try {
      let attachment = null;
      const targetBranch = isSuperAdmin ? uploadBranch : currentBranch;
      const configKey = targetBranch === 'cs1' ? 'bvtks-cs1' : 'bvtks-cs2';
      const config = getBranchConfig(configKey);

      // Upload file nếu có đính kèm
      if (selectedFile) {
        const folderId = activeTab === 'OUT' ? config.folderDi : config.folderDen;
        if (!folderId) {
          throw new Error("Chưa cấu hình ID thư mục Drive cho luồng văn bản này!");
        }
        attachment = await uploadFileToDrive(selectedFile, folderId, config.apiUrl);
      }

      // Tạo object dữ liệu mới
      const newDoc = {
        id: 'doc_' + Date.now(),
        type: activeTab,
        branch: targetBranch,
        configKey,
        createdTime: Date.now(),
        fileId: attachment ? attachment.id : null,
        fileUrl: attachment ? attachment.webViewLink : null,
        fileName: attachment ? attachment.name : null,
        // Dữ liệu đi
        docNumber: activeTab === 'OUT' ? docNumber.trim() : '',
        dateIssued: activeTab === 'OUT' ? dateIssued : '',
        recipient: activeTab === 'OUT' ? recipient.trim() : '',
        signer: activeTab === 'OUT' ? signer.trim() : '',
        notes: activeTab === 'OUT' ? notes.trim() : '',
        // Dữ liệu đến
        inNumber: activeTab === 'IN' ? inNumber.trim() : '',
        dateReceived: activeTab === 'IN' ? dateReceived : '',
        sender: activeTab === 'IN' ? sender.trim() : '',
        docNumberCấpTrên: activeTab === 'IN' ? docNumberCấpTrên.trim() : '',
        receiver: activeTab === 'IN' ? receiver.trim() : '',
        direction: activeTab === 'IN' ? direction.trim() : '',
        summary: summary.trim()
      };

      setDocuments([newDoc, ...documents]);
      alert("🎉 Đã lưu văn bản vào sổ đăng ký thành công!");
      setShowAddModal(false);
    } catch (error) {
      alert("Lỗi khi đăng ký văn bản: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Xem chi tiết văn bản
  const handleViewDetail = (doc) => {
    setSelectedDoc(doc);
    setIsEditing(false);
    
    // Nạp dữ liệu vào form để chỉnh sửa nếu cần
    setDocNumber(doc.docNumber || '');
    setDateIssued(doc.dateIssued || '');
    setRecipient(doc.recipient || '');
    setSummary(doc.summary || '');
    setSigner(doc.signer || '');
    setNotes(doc.notes || '');

    setInNumber(doc.inNumber || '');
    setDateReceived(doc.dateReceived || '');
    setSender(doc.sender || '');
    setDocNumberCấpTrên(doc.docNumberCấpTrên || '');
    setReceiver(doc.receiver || '');
    setDirection(doc.direction || '');

    setShowDetailModal(true);
  };

  // Cập nhật chi tiết văn bản (Sửa)
  const handleUpdateDoc = async () => {
    if (!isAdmin) return;

    const updated = documents.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          summary: summary.trim(),
          docNumber: d.type === 'OUT' ? docNumber.trim() : '',
          dateIssued: d.type === 'OUT' ? dateIssued : '',
          recipient: d.type === 'OUT' ? recipient.trim() : '',
          signer: d.type === 'OUT' ? signer.trim() : '',
          notes: d.type === 'OUT' ? notes.trim() : '',
          inNumber: d.type === 'IN' ? inNumber.trim() : '',
          dateReceived: d.type === 'IN' ? dateReceived : '',
          sender: d.type === 'IN' ? sender.trim() : '',
          docNumberCấpTrên: d.type === 'IN' ? docNumberCấpTrên.trim() : '',
          receiver: d.type === 'IN' ? receiver.trim() : '',
          direction: d.type === 'IN' ? direction.trim() : '',
        };
      }
      return d;
    });

    setDocuments(updated);
    alert("Đã cập nhật thông tin văn bản thành công!");
    setShowDetailModal(false);
  };

  // Xóa văn bản khỏi sổ đăng ký
  const handleDeleteDoc = async (doc) => {
    if (!isAdmin) {
      alert("Tài khoản khách không có quyền xóa văn bản!");
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa văn bản "${doc.summary}" khỏi sổ lưu trữ?`)) {
      try {
        // Nếu có tệp đính kèm trên Google Drive, cố gắng xóa tệp đó
        if (doc.fileId) {
          const config = getBranchConfig(doc.configKey);
          await deleteFileFromDrive(doc.fileId, config.apiUrl);
        }
      } catch (err) {
        console.error("Lỗi xóa file trên Drive:", err);
      }

      setDocuments(documents.filter(d => d.id !== doc.id));
      alert("Đã xóa văn bản khỏi sổ đăng ký!");
      setShowDetailModal(false);
    }
  };

  // Định dạng ngày hiển thị tiếng Việt
  const formatDateStr = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Lọc danh sách hiển thị
  const filteredDocs = documents.filter(d => {
    // Lọc theo loại văn bản (Đến/Đi)
    if (d.type !== activeTab) return false;

    // Lọc theo chi đoàn (Super Admin)
    if (isSuperAdmin && selectedBranch !== 'all' && d.branch !== selectedBranch) {
      return false;
    } else if (!isSuperAdmin && d.branch !== currentBranch) {
      return false;
    }

    // Lọc theo nội dung tìm kiếm
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (d.summary || '').toLowerCase().includes(searchLower) ||
      (d.docNumber || '').toLowerCase().includes(searchLower) ||
      (d.inNumber || '').toLowerCase().includes(searchLower) ||
      (d.recipient || '').toLowerCase().includes(searchLower) ||
      (d.sender || '').toLowerCase().includes(searchLower) ||
      (d.signer || '').toLowerCase().includes(searchLower) ||
      (d.notes || '').toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Tabs chuyển đổi Sổ lưu Công văn */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
        <button 
          onClick={() => { setActiveTab('OUT'); setSearch(''); }}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'OUT' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowUpRight size={18} />
          <span>Sổ lưu Công văn đi</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'OUT' ? 'bg-white text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {documents.filter(d => d.type === 'OUT' && (isSuperAdmin ? (selectedBranch === 'all' || d.branch === selectedBranch) : d.branch === currentBranch)).length}
          </span>
        </button>
        <button 
          onClick={() => { setActiveTab('IN'); setSearch(''); }}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'IN' ? 'bg-red-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowDownLeft size={18} />
          <span>Sổ lưu Công văn đến</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'IN' ? 'bg-white text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {documents.filter(d => d.type === 'IN' && (isSuperAdmin ? (selectedBranch === 'all' || d.branch === selectedBranch) : d.branch === currentBranch)).length}
          </span>
        </button>
      </div>

      {/* Thanh công cụ tìm kiếm và thêm */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder={activeTab === 'OUT' ? "Tìm theo Số/Ký hiệu, trích yếu, nơi nhận..." : "Tìm theo Số đến, cơ quan gửi, trích yếu..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
          />
        </div>

        {isAdmin && (
          <Btn onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} />
            <span>Đăng ký văn bản</span>
          </Btn>
        )}
      </div>

      {/* Danh sách văn bản */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'OUT' ? (
            // Bảng Công văn đi
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th className="text-left w-28">Số / Ký hiệu</Th>
                  <Th className="text-left w-32">Ngày ban hành</Th>
                  <Th className="text-left">Trích yếu nội dung</Th>
                  <Th className="text-left">Nơi nhận</Th>
                  <Th className="text-left">Người ký</Th>
                  {isSuperAdmin && selectedBranch === 'all' && <Th className="text-center w-24">Chi đoàn</Th>}
                  <Th className="text-center w-28">Thao tác</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin && selectedBranch === 'all' ? 7 : 6} className="px-6 py-16 text-center text-gray-400">
                      <div className="bg-gray-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="text-gray-300" size={28} />
                      </div>
                      <p className="font-bold text-gray-500 text-sm">Chưa có công văn đi nào trong sổ đăng ký</p>
                      <p className="text-xs text-gray-400 mt-1">Bấm "Đăng ký văn bản" để tạo hồ sơ lưu trữ mới</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <Td className="font-bold text-gray-900">{doc.docNumber}</Td>
                      <Td className="text-gray-500 text-xs font-semibold">{formatDateStr(doc.dateIssued)}</Td>
                      <Td className="font-medium text-gray-800 break-all max-w-xs">{doc.summary}</Td>
                      <Td className="text-gray-600 text-xs font-semibold">{doc.recipient}</Td>
                      <Td className="text-gray-600 text-xs font-medium">{doc.signer}</Td>
                      {isSuperAdmin && selectedBranch === 'all' && (
                        <Td className="text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.branch === 'cs1' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                          }`}>
                            {doc.branch === 'cs1' ? 'CS1' : 'CS2'}
                          </span>
                        </Td>
                      )}
                      <Td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleViewDetail(doc)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết & Đính kèm"
                          >
                            <Eye size={16} />
                          </button>
                          {doc.fileUrl && (
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                              title="Tải tệp đính kèm"
                            >
                              <Download size={16} />
                            </a>
                          )}
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteDoc(doc)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Xóa công văn"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            // Bảng Công văn đến
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th className="text-left w-20">Số đến</Th>
                  <Th className="text-left w-32">Ngày nhận</Th>
                  <Th className="text-left">Cơ quan gửi</Th>
                  <Th className="text-left">Số ký hiệu cấp trên</Th>
                  <Th className="text-left">Trích yếu nội dung</Th>
                  <Th className="text-left">Người nhận</Th>
                  {isSuperAdmin && selectedBranch === 'all' && <Th className="text-center w-24">Chi đoàn</Th>}
                  <Th className="text-center w-28">Thao tác</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin && selectedBranch === 'all' ? 8 : 7} className="px-6 py-16 text-center text-gray-400">
                      <div className="bg-gray-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="text-gray-300" size={28} />
                      </div>
                      <p className="font-bold text-gray-500 text-sm">Chưa có công văn đến nào trong sổ đăng ký</p>
                      <p className="text-xs text-gray-400 mt-1">Bấm "Đăng ký văn bản" để tạo hồ sơ lưu trữ mới</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <Td className="font-bold text-red-600">#{doc.inNumber}</Td>
                      <Td className="text-gray-500 text-xs font-semibold">{formatDateStr(doc.dateReceived)}</Td>
                      <Td className="text-gray-800 text-xs font-bold">{doc.sender}</Td>
                      <Td className="text-gray-600 text-xs font-medium">{doc.docNumberCấpTrên || '---'}</Td>
                      <Td className="font-medium text-gray-800 break-all max-w-xs">{doc.summary}</Td>
                      <Td className="text-gray-600 text-xs font-medium">{doc.receiver}</Td>
                      {isSuperAdmin && selectedBranch === 'all' && (
                        <Td className="text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.branch === 'cs1' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                          }`}>
                            {doc.branch === 'cs1' ? 'CS1' : 'CS2'}
                          </span>
                        </Td>
                      )}
                      <Td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleViewDetail(doc)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết & Đính kèm"
                          >
                            <Eye size={16} />
                          </button>
                          {doc.fileUrl && (
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                              title="Tải tệp đính kèm"
                            >
                              <Download size={16} />
                            </a>
                          )}
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteDoc(doc)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Xóa công văn"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal đăng ký văn bản mới */}
      {showAddModal && (
        <Modal 
          title={activeTab === 'OUT' ? "Đăng ký Công văn đi (Ban hành)" : "Đăng ký Công văn đến (Nhận về)"} 
          onClose={() => { setShowAddModal(false); setSelectedFile(null); }}
          wide
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Form Văn bản đi */}
              {activeTab === 'OUT' ? (
                <>
                  <FI 
                    label="Số / Ký hiệu văn bản *" 
                    placeholder="Ví dụ: Số 01/CV-CĐ" 
                    value={docNumber} 
                    onChange={e => setDocNumber(e.target.value)} 
                  />
                  <FI 
                    label="Ngày tháng năm ban hành *" 
                    type="date" 
                    value={dateIssued} 
                    onChange={e => setDateIssued(e.target.value)} 
                  />
                  <FI 
                    label="Nơi nhận *" 
                    placeholder="Đoàn cấp trên hoặc đơn vị phối hợp..." 
                    value={recipient} 
                    onChange={e => setRecipient(e.target.value)} 
                  />
                  <FI 
                    label="Người ký *" 
                    placeholder="Bí thư hoặc Phó Bí thư chi đoàn..." 
                    value={signer} 
                    onChange={e => setSigner(e.target.value)} 
                  />
                  <div className="col-span-1 md:col-span-2">
                    <FT 
                      label="Trích yếu nội dung *" 
                      placeholder="Tóm tắt ngắn gọn mục đích công văn..." 
                      value={summary} 
                      onChange={e => setSummary(e.target.value)} 
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <FI 
                      label="Ghi chú" 
                      placeholder="Lưu bản gốc, đính kèm biên bản họp, v.v..." 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                    />
                  </div>
                </>
              ) : (
                // Form Văn bản đến
                <>
                  <FI 
                    label="Số đến (Thứ tự nhận) *" 
                    placeholder="Ví dụ: 08" 
                    value={inNumber} 
                    onChange={e => setInNumber(e.target.value)} 
                  />
                  <FI 
                    label="Ngày nhận văn bản *" 
                    type="date" 
                    value={dateReceived} 
                    onChange={e => setDateReceived(e.target.value)} 
                  />
                  <FI 
                    label="Cơ quan gửi *" 
                    placeholder="Đoàn cấp trên, Bệnh viện, v.v..." 
                    value={sender} 
                    onChange={e => setSender(e.target.value)} 
                  />
                  <FI 
                    label="Số / Ký hiệu của cấp trên" 
                    placeholder="Ví dụ: Số 45-QĐ/ĐTN" 
                    value={docNumberCấpTrên} 
                    onChange={e => setDocNumberCấpTrên(e.target.value)} 
                  />
                  <FI 
                    label="Người nhận *" 
                    placeholder="Ủy viên BCH, Bí thư hoặc Phó Bí thư..." 
                    value={receiver} 
                    onChange={e => setReceiver(e.target.value)} 
                  />
                  <FI 
                    label="Ý kiến chỉ đạo / Hướng xử lý" 
                    placeholder="Lưu trữ, triển khai hành động, hạn nộp..." 
                    value={direction} 
                    onChange={e => setDirection(e.target.value)} 
                  />
                  <div className="col-span-1 md:col-span-2">
                    <FT 
                      label="Trích yếu nội dung *" 
                      placeholder="Tóm tắt nội dung chỉ đạo, thông báo..." 
                      value={summary} 
                      onChange={e => setSummary(e.target.value)} 
                    />
                  </div>
                </>
              )}
            </div>

            {/* Chi đoàn và Đính kèm file */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-100">
              {isSuperAdmin && (
                <FS 
                  label="Lưu vào chi đoàn" 
                  opts={['Cơ sở 1', 'Cơ sở 2']} 
                  value={uploadBranch === 'cs1' ? 'Cơ sở 1' : 'Cơ sở 2'}
                  onChange={e => setUploadBranch(e.target.value === 'Cơ sở 1' ? 'cs1' : 'cs2')}
                />
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Đính kèm bản scan / Tệp văn bản (Tùy chọn)</label>
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-white hover:bg-gray-50 transition-all text-center relative">
                  <input 
                    type="file" 
                    onChange={e => setSelectedFile(e.target.files[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload size={24} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500">Nhấp vào đây để đính kèm tệp văn bản</span>
                  </div>
                </div>
                {selectedFile && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between text-xs text-green-700 font-semibold">
                    <span className="truncate max-w-[320px]">📎 {selectedFile.name}</span>
                    <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
              <Btn v="s" onClick={() => { setShowAddModal(false); setSelectedFile(null); }}>Hủy</Btn>
              <Btn onClick={handleSaveDoc} disabled={uploading}>
                {uploading ? '⏳ Đang đăng ký...' : '💾 Lưu Sổ đăng ký'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal xem chi tiết & chỉnh sửa văn bản */}
      {showDetailModal && selectedDoc && (
        <Modal 
          title={selectedDoc.type === 'OUT' ? `Công văn đi: ${selectedDoc.docNumber}` : `Công văn đến: #${selectedDoc.inNumber}`} 
          onClose={() => setShowDetailModal(false)}
          wide
        >
          <div className="space-y-6">
            {!isEditing ? (
              // Chế độ Xem chi tiết (Chính sách giấy tờ sang trọng)
              <div className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 relative overflow-hidden">
                  {/* Decorative badge */}
                  <div className="absolute top-0 right-0 p-3">
                    <span className={`px-3 py-1 rounded-bl-xl text-xs font-extrabold tracking-wider uppercase ${
                      selectedDoc.type === 'OUT' ? 'bg-orange-50 text-orange-600 border-l border-b border-orange-200' : 'bg-green-50 text-green-600 border-l border-b border-green-200'
                    }`}>
                      {selectedDoc.type === 'OUT' ? 'Văn bản đi' : 'Văn bản đến'}
                    </span>
                  </div>

                  <h4 className="text-lg font-black text-gray-800 border-b pb-3 mb-4 max-w-[85%]">{selectedDoc.summary}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    {selectedDoc.type === 'OUT' ? (
                      <>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Số / Ký hiệu:</span>
                          <span className="font-extrabold text-gray-800">{selectedDoc.docNumber}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Ngày ban hành:</span>
                          <span className="font-semibold text-gray-800">{formatDateStr(selectedDoc.dateIssued)}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Nơi nhận:</span>
                          <span className="font-bold text-red-600">{selectedDoc.recipient}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Người ký ban hành:</span>
                          <span className="font-semibold text-gray-800">{selectedDoc.signer}</span>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <span className="block text-xs font-bold text-gray-400 uppercase">Ghi chú:</span>
                          <span className="font-medium text-gray-700 italic">{selectedDoc.notes || 'Không có ghi chú'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Số thứ tự đến:</span>
                          <span className="font-extrabold text-red-600">#{selectedDoc.inNumber}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Ngày nhận:</span>
                          <span className="font-semibold text-gray-800">{formatDateStr(selectedDoc.dateReceived)}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Cơ quan gửi đến:</span>
                          <span className="font-bold text-gray-800">{selectedDoc.sender}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Số ký hiệu cấp trên:</span>
                          <span className="font-semibold text-gray-800">{selectedDoc.docNumberCấpTrên || 'Không có'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase">Người nhận văn bản:</span>
                          <span className="font-semibold text-gray-800">{selectedDoc.receiver}</span>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <span className="block text-xs font-bold text-gray-400 uppercase text-red-600">Ý kiến chỉ đạo / Hướng xử lý:</span>
                          <span className="font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 block mt-1">
                            💡 {selectedDoc.direction || 'Chưa lập hướng xử lý'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Phần tệp đính kèm */}
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-red-500" size={24} />
                    <div>
                      <span className="block text-xs text-gray-400 font-bold uppercase">Tệp văn bản đính kèm:</span>
                      <span className="text-sm font-semibold text-gray-700 truncate max-w-[280px] sm:max-w-md block">
                        {selectedDoc.fileName || 'Không có bản scan đính kèm'}
                      </span>
                    </div>
                  </div>
                  {selectedDoc.fileUrl && (
                    <div className="flex gap-2">
                      <a 
                        href={selectedDoc.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Download size={14} />
                        <span>Tải về</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* PDF/Word iframe preview if there is an attachment */}
                {selectedDoc.fileUrl && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden h-[350px] bg-white">
                    <iframe 
                      src={selectedDoc.fileUrl.replace('/view', '/preview')} 
                      className="w-full h-full border-none"
                      title="File Preview"
                    />
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                  {isAdmin && (
                    <>
                      <Btn v="d" onClick={() => handleDeleteDoc(selectedDoc)}>Xóa</Btn>
                      <Btn onClick={() => setIsEditing(true)}>Sửa thông tin</Btn>
                    </>
                  )}
                  <Btn v="s" onClick={() => setShowDetailModal(false)}>Đóng</Btn>
                </div>
              </div>
            ) : (
              // Chế độ Chỉnh sửa thông tin
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDoc.type === 'OUT' ? (
                    <>
                      <FI 
                        label="Số / Ký hiệu văn bản *" 
                        value={docNumber} 
                        onChange={e => setDocNumber(e.target.value)} 
                      />
                      <FI 
                        label="Ngày tháng năm ban hành *" 
                        type="date" 
                        value={dateIssued} 
                        onChange={e => setDateIssued(e.target.value)} 
                      />
                      <FI 
                        label="Nơi nhận *" 
                        value={recipient} 
                        onChange={e => setRecipient(e.target.value)} 
                      />
                      <FI 
                        label="Người ký *" 
                        value={signer} 
                        onChange={e => setSigner(e.target.value)} 
                      />
                      <div className="col-span-1 md:col-span-2">
                        <FT 
                          label="Trích yếu nội dung *" 
                          value={summary} 
                          onChange={e => setSummary(e.target.value)} 
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <FI 
                          label="Ghi chú" 
                          value={notes} 
                          onChange={e => setNotes(e.target.value)} 
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <FI 
                        label="Số đến *" 
                        value={inNumber} 
                        onChange={e => setInNumber(e.target.value)} 
                      />
                      <FI 
                        label="Ngày nhận văn bản *" 
                        type="date" 
                        value={dateReceived} 
                        onChange={e => setDateReceived(e.target.value)} 
                      />
                      <FI 
                        label="Cơ quan gửi *" 
                        value={sender} 
                        onChange={e => setSender(e.target.value)} 
                      />
                      <FI 
                        label="Số / Ký hiệu của cấp trên" 
                        value={docNumberCấpTrên} 
                        onChange={e => setDocNumberCấpTrên(e.target.value)} 
                      />
                      <FI 
                        label="Người nhận *" 
                        value={receiver} 
                        onChange={e => setReceiver(e.target.value)} 
                      />
                      <FI 
                        label="Ý kiến chỉ đạo / Hướng xử lý" 
                        value={direction} 
                        onChange={e => setDirection(e.target.value)} 
                      />
                      <div className="col-span-1 md:col-span-2">
                        <FT 
                          label="Trích yếu nội dung *" 
                          value={summary} 
                          onChange={e => setSummary(e.target.value)} 
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                  <Btn v="s" onClick={() => setIsEditing(false)}>Hủy</Btn>
                  <Btn onClick={handleUpdateDoc}>💾 Lưu thay đổi</Btn>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
