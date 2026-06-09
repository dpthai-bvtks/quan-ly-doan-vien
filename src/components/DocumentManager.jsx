import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, File as FileIcon, Download, Eye, Loader2, Trash2, Search, 
  Plus, Edit, BookOpen, FolderOpen, Inbox, Send, RefreshCw, AlertCircle, FileCheck
} from 'lucide-react';
import { Modal, FI, FS, FT, Btn, Th, Td } from './UI';
import { getBranchConfig } from '../data/constants';

export default function DocumentManager({ isAdmin, currentUser, selectedBranch, documents = [], setDocuments }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  // Tab chính: 'REGISTRY' (Sổ lưu) hoặc 'DRIVE' (Kho tệp Drive)
  const [mainTab, setMainTab] = useState('REGISTRY');
  
  // Sub-tab cho Sổ lưu: 'INCOMING' (Công văn đến) hoặc 'OUTGOING' (Công văn đi)
  const [registryTab, setRegistryTab] = useState('INCOMING');
  
  // Sub-tab cho Kho tệp Drive: 'ALL', 'DEN', 'DI'
  const [driveTab, setDriveTab] = useState('ALL');

  // State cho tệp quét Drive (Kho tệp Drive)
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);

  // Modal thêm/sửa Sổ lưu
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Form Fields cho Sổ lưu
  const [docType, setDocType] = useState('incoming'); // 'incoming' | 'outgoing'
  const [documentNo, setDocumentNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [senderOrReceiver, setSenderOrReceiver] = useState('');
  const [refNo, setRefNo] = useState('');
  const [summary, setSummary] = useState('');
  const [signerOrRecipient, setSignerOrRecipient] = useState('');
  const [noteOrDirection, setNoteOrDirection] = useState('');

  // State thông báo & xác nhận
  const [alertState, setAlertState] = useState(null); // { message, type }
  const [deleteConfirmState, setDeleteConfirmState] = useState(null); // doc or null
  const [deleteDriveFile, setDeleteDriveFile] = useState(true);

  const showAlert = (message, type = 'info') => {
    setAlertState({ message, type });
  };

  const fileInputRef = useRef(null);

  const isSuperAdmin = currentUser?.username === 'admin-bvtks';
  const currentBranch = currentUser?.username === 'bvtks-cs1' ? 'cs1' : 'cs2';
  
  // Config của chi đoàn hiện tại
  const config = getBranchConfig(currentUser?.username);
  const API_URL_BRANCH = config.apiUrl;

  // Lấy danh sách file vật lý trên Drive (Kho tệp Drive)
  const fetchDriveFiles = async () => {
    setDriveLoading(true);
    try {
      let branchesToFetch = [];
      if (isSuperAdmin) {
        branchesToFetch = selectedBranch === 'all' ? ['cs1', 'cs2'] : [selectedBranch];
      } else {
        branchesToFetch = [currentBranch];
      }

      const results = [];
      for (const branch of branchesToFetch) {
        const configKey = branch === 'cs1' ? 'bvtks-cs1' : 'bvtks-cs2';
        const brConfig = getBranchConfig(configKey);
        const FOLDER_DEN = brConfig.folderDen;
        const FOLDER_DI = brConfig.folderDi;
        const API_URL = brConfig.apiUrl;

        if (API_URL) {
          if (FOLDER_DEN) {
            try {
              const res1 = await axios.get(`${API_URL}?action=get_files&folderId=${FOLDER_DEN}`);
              if (res1.data.files) {
                res1.data.files.forEach(f => {
                  f.parents = [FOLDER_DEN];
                  f.branch = branch;
                  f.configKey = configKey;
                  f.type = 'incoming';
                });
                results.push(...res1.data.files);
              }
            } catch (err) {
              console.error(`Lỗi tải văn bản đến của ${branch}:`, err);
            }
          }
          if (FOLDER_DI) {
            try {
              const res2 = await axios.get(`${API_URL}?action=get_files&folderId=${FOLDER_DI}`);
              if (res2.data.files) {
                res2.data.files.forEach(f => {
                  f.parents = [FOLDER_DI];
                  f.branch = branch;
                  f.configKey = configKey;
                  f.type = 'outgoing';
                });
                results.push(...res2.data.files);
              }
            } catch (err) {
              console.error(`Lỗi tải văn bản đi của ${branch}:`, err);
            }
          }
        }
      }
      results.sort((a, b) => b.createdTime - a.createdTime);
      setDriveFiles(results);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách file Drive:', error);
    } finally {
      setDriveLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'DRIVE') {
      fetchDriveFiles();
    }
  }, [mainTab, selectedBranch]);

  // Xử lý upload file vật lý trực tiếp từ tệp tin đã chọn
  const uploadAttachment = async (file, type) => {
    const targetBranch = currentBranch; // Chỉ admin chi đoàn mới được upload sổ lưu của mình
    const configKey = targetBranch === 'cs1' ? 'bvtks-cs1' : 'bvtks-cs2';
    const brConfig = getBranchConfig(configKey);
    const folderId = type === 'incoming' ? brConfig.folderDen : brConfig.folderDi;
    const apiUrl = brConfig.apiUrl;

    if (!folderId || !apiUrl) {
      throw new Error("Chưa cấu hình thư mục Google Drive hoặc API URL!");
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

          const res = await axios.post(apiUrl, JSON.stringify(payload), {
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });

          if (res.data.status === 'success') {
            resolve({
              fileId: res.data.fileId,
              name: file.name,
              url: res.data.url
            });
          } else {
            reject(new Error(res.data.message || 'Lỗi không xác định'));
          }
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error("Lỗi đọc file"));
      reader.readAsDataURL(file);
    });
  };

  // Mở modal thêm mới
  const handleOpenAddModal = (type) => {
    setEditingDoc(null);
    setDocType(type);
    setDocumentNo('');
    setDocDate(new Date().toISOString().split('T')[0]);
    setSenderOrReceiver('');
    setRefNo('');
    setSummary('');
    setSignerOrRecipient('');
    setNoteOrDirection('');
    setSelectedFile(null);
    setShowDocModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (doc) => {
    setEditingDoc(doc);
    setDocType(doc.type);
    setDocumentNo(doc.documentNo || '');
    setDocDate(doc.date || '');
    setSenderOrReceiver(doc.senderOrReceiver || '');
    setRefNo(doc.refNo || '');
    setSummary(doc.summary || '');
    setSignerOrRecipient(doc.signerOrRecipient || '');
    setNoteOrDirection(doc.noteOrDirection || '');
    setSelectedFile(null);
    setShowDocModal(true);
  };

  // Lưu Sổ lưu (Thêm mới hoặc cập nhật)
  const handleSaveDoc = async () => {
    if (!isAdmin) {
      showAlert("Tài khoản khách không có quyền sửa đổi Sổ lưu!", "warning");
      return;
    }
    if (!documentNo.trim()) {
      showAlert("Vui lòng điền Số/Ký hiệu văn bản!", "warning");
      return;
    }
    if (!docDate) {
      showAlert("Vui lòng điền ngày tháng!", "warning");
      return;
    }

    setUploading(true);
    try {
      let attachment = editingDoc?.attachment || null;

      // Nếu có chọn file mới thì tải lên Drive trước
      if (selectedFile) {
        attachment = await uploadAttachment(selectedFile, docType);
      }

      const newDoc = {
        id: editingDoc ? editingDoc.id : Date.now(),
        type: docType,
        documentNo,
        date: docDate,
        senderOrReceiver,
        refNo: docType === 'incoming' ? refNo : '',
        summary,
        signerOrRecipient,
        noteOrDirection,
        attachment,
        branch: currentBranch
      };

      let updatedDocs = [];
      if (editingDoc) {
        updatedDocs = documents.map(d => d.id === editingDoc.id ? newDoc : d);
      } else {
        updatedDocs = [newDoc, ...documents];
      }

      setDocuments(updatedDocs);
      showAlert("💾 Đã lưu thông tin công văn thành công!", "success");
      setShowDocModal(false);
      setSelectedFile(null);
    } catch (err) {
      showAlert("Lỗi khi lưu công văn: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Hàm thực thi xóa thực tế
  const executeDelete = async (doc, shouldDeleteDriveFile) => {
    setLoading(true);
    try {
      if (shouldDeleteDriveFile && doc.attachment) {
        const brConfig = getBranchConfig(doc.branch === 'cs1' ? 'bvtks-cs1' : 'bvtks-cs2');
        if (brConfig.apiUrl) {
          await axios.post(brConfig.apiUrl, JSON.stringify({
            action: 'delete_file',
            fileId: doc.attachment.fileId
          }), {
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        }
      }

      const updatedDocs = documents.filter(d => d.id !== doc.id);
      setDocuments(updatedDocs);
      showAlert("🎉 Đã xóa công văn thành công!", "success");
    } catch (err) {
      showAlert("Lỗi xóa công văn: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Xóa Công văn khỏi Sổ lưu (kích hoạt modal xác nhận)
  const handleDeleteDoc = (doc) => {
    if (!isAdmin) {
      showAlert("Tài khoản khách không có quyền xóa!", "warning");
      return;
    }
    setDeleteConfirmState(doc);
    setDeleteDriveFile(true); // mặc định tích chọn xóa tệp trên Drive nếu có
  };

  // Lọc dữ liệu Sổ lưu
  const filteredRegistry = documents.filter(d => {
    // Phân loại (đến/đi)
    const matchesTab = registryTab === 'INCOMING' ? d.type === 'incoming' : d.type === 'outgoing';
    if (!matchesTab) return false;

    // Tìm kiếm
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (d.documentNo || '').toLowerCase().includes(searchLower) ||
      (d.senderOrReceiver || '').toLowerCase().includes(searchLower) ||
      (d.summary || '').toLowerCase().includes(searchLower) ||
      (d.signerOrRecipient || '').toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  // Lọc file của Kho tệp Drive
  const filteredDriveFiles = driveFiles.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const brConfig = getBranchConfig(f.configKey);
    if (driveTab === 'ALL') return true;
    if (driveTab === 'DEN') return f.parents?.includes(brConfig.folderDen);
    if (driveTab === 'DI') return f.parents?.includes(brConfig.folderDi);
    return false;
  });

  return (
    <div className="space-y-6">
      
      {/* Tab Switcher: Sổ lưu công văn vs Kho tệp Drive */}
      <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 max-w-md mx-auto">
        <button 
          onClick={() => setMainTab('REGISTRY')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${mainTab === 'REGISTRY' ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <BookOpen size={16} />
          Sổ lưu Công văn
        </button>
        <button 
          onClick={() => setMainTab('DRIVE')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${mainTab === 'DRIVE' ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FolderOpen size={16} />
          Kho tệp tin Drive
        </button>
      </div>

      {mainTab === 'REGISTRY' ? (
        // ==========================================
        // VIEW: SỔ LƯU CÔNG VĂN
        // ==========================================
        <div className="space-y-6">
          {/* Sub-tab Sổ lưu */}
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <button 
              onClick={() => setRegistryTab('INCOMING')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${registryTab === 'INCOMING' ? 'bg-blue-50 text-blue-700 border border-blue-100 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Inbox size={16} />
              Sổ lưu Công văn ĐẾN
            </button>
            <button 
              onClick={() => setRegistryTab('OUTGOING')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${registryTab === 'OUTGOING' ? 'bg-blue-50 text-blue-700 border border-blue-100 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Send size={16} />
              Sổ lưu Công văn ĐI
            </button>
          </div>

          {/* Thanh công cụ */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative w-full sm:w-85">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm công văn theo số, nơi gửi/nhận, trích yếu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>

            {isAdmin && (
              <Btn onClick={() => handleOpenAddModal(registryTab === 'INCOMING' ? 'incoming' : 'outgoing')}>
                Thêm văn bản lưu sổ
              </Btn>
            )}
          </div>

          {/* Bảng dữ liệu Sổ lưu */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase font-bold">
                    {registryTab === 'INCOMING' ? (
                      <>
                        <Th className="w-[12%]">Số đến</Th>
                        <Th className="w-[12%]">Ngày nhận</Th>
                        <Th className="w-[20%]">Cơ quan gửi</Th>
                        <Th className="w-[15%]">Số/Ký hiệu gốc</Th>
                        <Th>Trích yếu nội dung</Th>
                        <Th className="w-[15%]">Người nhận</Th>
                        <Th className="w-[15%]">Ý kiến chỉ đạo/Xử lý</Th>
                      </>
                    ) : (
                      <>
                        <Th className="w-[15%]">Số/Ký hiệu</Th>
                        <Th className="w-[12%]">Ngày ban hành</Th>
                        <Th className="w-[20%]">Nơi nhận</Th>
                        <Th>Trích yếu nội dung</Th>
                        <Th className="w-[15%]">Người ký</Th>
                        <Th className="w-[15%]">Ghi chú</Th>
                      </>
                    )}
                    <Th className="w-[12%] text-center">Tệp tin</Th>
                    <Th className="w-[10%] text-center">Thao tác</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading && filteredRegistry.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                        Đang đồng bộ dữ liệu sổ công văn...
                      </td>
                    </tr>
                  ) : filteredRegistry.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-16 text-center text-gray-500">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileCheck className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="font-bold text-gray-500 text-sm">Chưa có công văn nào được lưu trong sổ</p>
                        <p className="text-gray-400 text-xs mt-1">Sử dụng nút "Thêm văn bản lưu sổ" để khởi tạo bản ghi</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRegistry.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                        <Td className="font-bold text-gray-800">{doc.documentNo}</Td>
                        <Td className="text-gray-500 text-xs whitespace-nowrap">
                          {doc.date ? new Date(doc.date).toLocaleDateString('vi-VN') : ''}
                        </Td>
                        <Td className="font-semibold text-gray-700">{doc.senderOrReceiver}</Td>
                        {doc.type === 'incoming' && (
                          <Td className="text-gray-500 font-medium">{doc.refNo || '—'}</Td>
                        )}
                        <Td className="text-gray-600 text-xs font-medium max-w-xs truncate" title={doc.summary}>
                          {doc.summary}
                        </Td>
                        <Td className="text-gray-700 text-xs font-semibold">{doc.signerOrRecipient}</Td>
                        <Td className="text-gray-500 text-xs">{doc.noteOrDirection || '—'}</Td>
                        <Td className="text-center">
                          {doc.attachment ? (
                            <div className="flex items-center justify-center gap-1">
                              <a 
                                href={doc.attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-all border border-green-200 cursor-pointer"
                                title={doc.attachment.name}
                              >
                                <Eye size={12} />
                                Xem
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">Không có</span>
                          )}
                        </Td>
                        <Td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => handleOpenEditModal(doc)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Chỉnh sửa bản ghi"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDoc(doc)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa công văn"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // VIEW: KHO TỆP TIN DRIVE
        // ==========================================
        <div className="space-y-6">
          {/* Sub-tab Drive */}
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <button 
              onClick={() => setDriveTab('ALL')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${driveTab === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Tất cả văn bản Drive
            </button>
            <button 
              onClick={() => setDriveTab('DEN')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${driveTab === 'DEN' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Thư mục văn bản ĐẾN
            </button>
            <button 
              onClick={() => setDriveTab('DI')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${driveTab === 'DI' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Thư mục văn bản ĐI
            </button>
          </div>

          {/* Thanh công cụ */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm tệp văn bản trên Drive..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchDriveFiles}
                disabled={driveLoading}
                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                title="Làm mới danh sách Drive"
              >
                <RefreshCw size={18} className={driveLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Bảng Drive */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm font-bold">
                    <th className="px-6 py-4">Tên văn bản</th>
                    <th className="px-6 py-4">Phân loại / Chi đoàn</th>
                    <th className="px-6 py-4">Ngày tạo</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {driveLoading && driveFiles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                        Đang đồng bộ danh sách văn bản với Drive...
                      </td>
                    </tr>
                  ) : filteredDriveFiles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        Chưa có văn bản nào trong thư mục này.
                      </td>
                    </tr>
                  ) : (
                    filteredDriveFiles.map((file) => {
                      const brConfig = getBranchConfig(file.configKey);
                      const isDen = file.parents?.includes(brConfig.folderDen);
                      return (
                        <tr key={file.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <img src={file.iconLink || 'https://ssl.gstatic.com/docs/doclist/images/icon_10_pdf_list.png'} alt="icon" className="w-5 h-5 mr-3 shrink-0" />
                              <span className="font-semibold text-gray-700 truncate max-w-[250px] sm:max-w-md" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isDen ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                              }`}>
                                {isDen ? 'Văn bản đến' : 'Văn bản đi'}
                              </span>
                              {isSuperAdmin && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  file.branch === 'cs1' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                                }`}>
                                  {file.branch === 'cs1' ? 'Cơ sở 1' : 'Cơ sở 2'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {new Date(file.createdTime).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <button 
                              onClick={() => setPreviewFile(file)}
                              className="inline-flex items-center p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Xem trước"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <a 
                              href={file.webViewLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                              title="Tải về / Xem trên Drive"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: THÊM / CẬP NHẬT CÔNG VĂN SỔ LƯU
          ========================================== */}
      {showDocModal && (
        <Modal 
          title={editingDoc ? "Cập nhật thông tin công văn" : `Thêm công văn ${docType === 'incoming' ? 'ĐẾN' : 'ĐI'} mới`}
          onClose={() => setShowDocModal(false)}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            
            <FI 
              label={docType === 'incoming' ? "Số đến (Thứ tự nhận tại chi đoàn)" : "Số/Ký hiệu văn bản (Ví dụ: Số 01/CV-CĐ)"}
              value={documentNo}
              onChange={e => setDocumentNo(e.target.value)}
              placeholder={docType === 'incoming' ? "Ví dụ: 01" : "Ví dụ: Số 01/CV-CĐ"}
            />

            <FI 
              label={docType === 'incoming' ? "Ngày nhận" : "Ngày ban hành"}
              type="date"
              value={docDate}
              onChange={e => setDocDate(e.target.value)}
            />

            <FI 
              label={docType === 'incoming' ? "Cơ quan gửi (Cấp trên, Đoàn xã, v.v.)" : "Nơi nhận (Cấp trên hoặc đơn vị phối hợp)"}
              value={senderOrReceiver}
              onChange={e => setSenderOrReceiver(e.target.value)}
              placeholder={docType === 'incoming' ? "Ví dụ: Đoàn thanh niên cấp trên" : "Ví dụ: Đảng ủy, Đoàn khối"}
            />

            {docType === 'incoming' && (
              <FI 
                label="Số/Ký hiệu văn bản của cấp trên (Nếu có)"
                value={refNo}
                onChange={e => setRefNo(e.target.value)}
                placeholder="Ví dụ: 12-KH/ĐTN"
              />
            )}

            <FT 
              label="Trích yếu nội dung (Tóm tắt ngắn gọn)"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Nhập tóm tắt mục đích công văn..."
            />

            <FI 
              label={docType === 'incoming' ? "Người nhận" : "Người ký (Bí thư/Phó Bí thư)"}
              value={signerOrRecipient}
              onChange={e => setSignerOrRecipient(e.target.value)}
              placeholder={docType === 'incoming' ? "Ví dụ: Nguyễn Văn A" : "Ví dụ: Lê Văn B"}
            />

            <FT 
              label={docType === 'incoming' ? "Ý kiến chỉ đạo / Phương án xử lý" : "Ghi chú"}
              value={noteOrDirection}
              onChange={e => setNoteOrDirection(e.target.value)}
              placeholder={docType === 'incoming' ? "Ví dụ: Lưu hồ sơ, triển khai trước ngày 15/6" : "Ví dụ: Lưu bản gốc, đính kèm biên bản họp"}
            />

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tệp đính kèm (Lưu trữ trên Google Drive)</label>
              
              {editingDoc?.attachment && !selectedFile && (
                <div className="mb-2 p-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center justify-between">
                  <span className="truncate">📎 Đang đính kèm: {editingDoc.attachment.name}</span>
                  <a href={editingDoc.attachment.url} target="_blank" rel="noreferrer" className="underline font-bold ml-2">Xem</a>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-all text-center relative">
                <input
                  type="file"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500">
                    {selectedFile ? `📎 Tệp đã chọn: ${selectedFile.name}` : 'Click hoặc Kéo thả để thay thế/thêm tệp đính kèm'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
              <Btn v="s" onClick={() => setShowDocModal(false)}>Hủy</Btn>
              <Btn onClick={handleSaveDoc} disabled={uploading}>
                {uploading ? '⏳ Đang lưu lên đám mây...' : '💾 Lưu công văn'}
              </Btn>
            </div>

          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL: XEM TRƯỚC VĂN BẢN (PREVIEW)
          ========================================== */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg flex items-center text-gray-800">
                <img src={previewFile.iconLink || 'https://ssl.gstatic.com/docs/doclist/images/icon_10_pdf_list.png'} alt="icon" className="w-5 h-5 mr-2" />
                {previewFile.name}
              </h3>
              <button 
                onClick={() => setPreviewFile(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe 
                src={previewFile.webViewLink.replace('/view', '/preview')} 
                className="w-full h-full border-none"
                title="Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL THÔNG BÁO TỰ CHẾ (ALERT OVERLAY)
          ========================================== */}
      {alertState && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: "fixed", 
            inset: 0, 
            zIndex: 10005, 
            display: "flex", 
            alignItems: "flex-start", 
            justifyContent: "center", 
            padding: "80px 16px 16px 16px", 
            background: "rgba(0,0,0,0.6)", 
            backdropFilter: "blur(4px)" 
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              background: "#fff", 
              borderRadius: 16, 
              padding: 24, 
              width: "100%", 
              maxWidth: 360, 
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              textAlign: "center" 
            }}
          >
            <div 
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                background: alertState.type === 'success' ? '#e8f5e9' :
                            alertState.type === 'error' ? '#ffeef0' :
                            alertState.type === 'warning' ? '#fff3e0' : '#eef2ff',
                color: alertState.type === 'success' ? '#2e7d32' :
                       alertState.type === 'error' ? '#c1121f' :
                       alertState.type === 'warning' ? '#e65100' : '#4f46e5'
              }}
            >
              {alertState.type === 'success' ? (
                <FileCheck size={28} />
              ) : alertState.type === 'error' ? (
                <AlertCircle size={28} />
              ) : alertState.type === 'warning' ? (
                <AlertCircle size={28} />
              ) : (
                <FileIcon size={28} />
              )}
            </div>

            <h3 style={{ margin: "0 0 8px 0", color: "#1a1a2e", fontSize: 16, fontWeight: 700 }}>Thông báo hệ thống</h3>
            <p style={{ margin: "0 0 24px 0", color: "#555", fontSize: 13, fontWeight: 600, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {alertState.message}
            </p>

            <button 
              onClick={() => setAlertState(null)}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)"
              }}
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL XÁC NHẬN XÓA TỰ CHẾ (DELETE CONFIRM OVERLAY)
          ========================================== */}
      {deleteConfirmState && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: "fixed", 
            inset: 0, 
            zIndex: 10005, 
            display: "flex", 
            alignItems: "flex-start", 
            justifyContent: "center", 
            padding: "80px 16px 16px 16px", 
            background: "rgba(0,0,0,0.6)", 
            backdropFilter: "blur(4px)" 
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              background: "#fff", 
              borderRadius: 16, 
              padding: 24, 
              width: "100%", 
              maxWidth: 420, 
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              textAlign: "center" 
            }}
          >
            <div 
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                background: "#ffeef0",
                color: "#c1121f"
              }}
            >
              <Trash2 size={28} />
            </div>

            <h3 style={{ margin: "0 0 8px 0", color: "#1a1a2e", fontSize: 16, fontWeight: 700 }}>Xác nhận xóa công văn</h3>
            <p style={{ margin: "0 0 16px 0", color: "#555", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa công văn <strong style={{ color: "#c1121f" }}>"{deleteConfirmState.documentNo}"</strong> khỏi Sổ lưu không?
            </p>

            {deleteConfirmState.attachment && (
              <div 
                style={{ 
                  width: "100%",
                  boxSizing: "border-box",
                  marginBottom: 20, 
                  padding: 12, 
                  background: "#f9fafb", 
                  borderRadius: 12, 
                  border: "1px solid #f1f5f9", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 10,
                  textAlign: "left"
                }}
              >
                <input 
                  type="checkbox" 
                  id="deleteDriveFileCheckbox"
                  checked={deleteDriveFile} 
                  onChange={(e) => setDeleteDriveFile(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", margin: 0 }}
                />
                <label htmlFor="deleteDriveFileCheckbox" style={{ fontSize: 12, color: "#475569", fontWeight: 700, cursor: "pointer", userSelect: "none", flex: 1 }}>
                  Đồng thời xóa tệp đính kèm trên Google Drive<br/>
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>({deleteConfirmState.attachment.name})</span>
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button 
                onClick={() => setDeleteConfirmState(null)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#f3f4f6",
                  color: "#4b5563",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  const doc = deleteConfirmState;
                  setDeleteConfirmState(null);
                  executeDelete(doc, deleteDriveFile);
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#c1121f",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(193, 18, 31, 0.2)"
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
