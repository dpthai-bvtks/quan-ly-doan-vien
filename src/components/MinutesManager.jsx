import React, { useState, useEffect, useCallback } from 'react';
import { Modal, FI, FS, Btn, Th, Td } from './UI';
import { getBranchConfig } from '../data/constants';
import { FolderOpen, FileText, Upload, Trash2, Eye, RefreshCw, AlertCircle } from 'lucide-react';

const MINUTES_FOLDERS = {
  'cs1': '1BRfEJwq4dFUXHC60oB6UAaAA9iN3hhmp',
  'cs2': '1-1cfuEFcYXab-GUvnULl7dD5nN4i5LmV'
};

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

async function getFilesFromDrive(folderId, apiUrl) {
  if (!apiUrl) return [];
  const res = await fetch(`${apiUrl}?action=get_files&folderId=${folderId}`);
  const data = await res.json();
  if (data.status === 'error') {
    throw new Error(data.message);
  }
  return data.files || [];
}

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

export default function MinutesManager({ currentUser, isAdmin, selectedBranch }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadBranch, setUploadBranch] = useState('cs1');
  const [customName, setCustomName] = useState('');

  const isSuperAdmin = currentUser?.username === 'admin-bvtks';
  const currentBranch = currentUser?.username === 'bvtks-cs1' ? 'cs1' : 'cs2';

  // Load files based on active configuration
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setFiles([]);
    try {
      // Xác định các chi đoàn cần lấy dữ liệu
      let branchesToFetch = [];
      if (isSuperAdmin) {
        if (selectedBranch === 'all') {
          branchesToFetch = ['cs1', 'cs2'];
        } else {
          branchesToFetch = [selectedBranch];
        }
      } else {
        branchesToFetch = [currentBranch];
      }

      const allFiles = [];
      for (const branch of branchesToFetch) {
        const configKey = branch === 'cs1' ? 'bvtks-cs1' : 'bvtks-cs2';
        const config = getBranchConfig(configKey);
        const folderId = MINUTES_FOLDERS[branch];
        if (config.apiUrl && folderId) {
          try {
            const branchFiles = await getFilesFromDrive(folderId, config.apiUrl);
            // Gắn nhãn chi đoàn cho từng file
            const labeledFiles = branchFiles.map(f => ({
              ...f,
              branch,
              configKey // Cần thiết để biết dùng API nào khi xóa
            }));
            allFiles.push(...labeledFiles);
          } catch (e) {
            console.error(`Lỗi tải file từ chi đoàn ${branch}:`, e);
          }
        }
      }

      // Sắp xếp file theo thời gian tạo mới nhất lên trước
      allFiles.sort((a, b) => b.createdTime - a.createdTime);
      setFiles(allFiles);
    } catch (err) {
      alert("Lỗi tải danh sách biên bản: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedBranch, currentBranch]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async () => {
    if (!isAdmin) {
      alert("Tài khoản khách không có quyền tải biên bản lên!");
      return;
    }
    if (!selectedFile) {
      alert("Vui lòng chọn tệp tin!");
      return;
    }

    setUploading(true);
    try {
      // Xác định chi đoàn lưu trữ
      const targetBranch = isSuperAdmin ? uploadBranch : currentBranch;
      const folderId = MINUTES_FOLDERS[targetBranch];
      const configKey = targetBranch === 'cs1' ? 'bvtks-cs1' : 'bvtks-cs2';
      const config = getBranchConfig(configKey);

      // Nếu có tên tùy chỉnh thì đổi tên file, giữ nguyên extension
      let fileToUpload = selectedFile;
      if (customName.trim()) {
        const ext = selectedFile.name.split('.').pop();
        const cleanName = customName.trim().endsWith(`.${ext}`) ? customName.trim() : `${customName.trim()}.${ext}`;
        fileToUpload = new File([selectedFile], cleanName, { type: selectedFile.type });
      }

      await uploadFileToDrive(fileToUpload, folderId, config.apiUrl);
      alert("🎉 Đã tải lên biên bản họp BCH thành công!");
      setShowUploadModal(false);
      setSelectedFile(null);
      setCustomName('');
      loadFiles();
    } catch (err) {
      alert("Lỗi tải lên: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!isAdmin) {
      alert("Tài khoản khách không có quyền xóa biên bản!");
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa biên bản "${file.name}"?`)) {
      setLoading(true);
      try {
        const config = getBranchConfig(file.configKey);
        await deleteFileFromDrive(file.id, config.apiUrl);
        alert("Đã xóa biên bản thành công!");
        loadFiles();
      } catch (err) {
        alert("Lỗi khi xóa biên bản: " + err.message);
        setLoading(false);
      }
    }
  };

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FolderOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Biên bản họp BCH Chi đoàn</h1>
            <p className="text-xs text-gray-500 mt-0.5">Lưu trữ các văn bản, biên bản họp của Ban Chấp hành Chi đoàn</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFiles}
            disabled={loading}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <Btn onClick={() => {
              setUploadBranch(selectedBranch === 'cs2' ? 'cs2' : 'cs1');
              setShowUploadModal(true);
            }}>
              Tải biên bản lên
            </Btn>
          )}
        </div>
      </div>

      {loading && files.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
          <span className="text-sm font-semibold">Đang đồng bộ dữ liệu với Google Drive...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3">
          <AlertCircle size={40} className="text-gray-300" />
          <div>
            <p className="text-sm font-bold text-gray-500">Chưa có biên bản nào được tải lên</p>
            <p className="text-xs text-gray-400 mt-1">Sử dụng nút "Tải biên bản lên" để bắt đầu lưu trữ tài liệu</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <Th className="text-left">Tên tài liệu / Biên bản</Th>
                <Th className="text-center">Chi đoàn</Th>
                <Th className="text-left">Thời gian tải lên</Th>
                <Th className="text-center">Hành động</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50/50 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-blue-500 shrink-0" />
                      <span className="font-semibold text-gray-700 break-all">{file.name}</span>
                    </div>
                  </Td>
                  <Td className="text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      file.branch === 'cs1' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                    }`}>
                      {file.branch === 'cs1' ? 'Cơ sở 1' : 'Cơ sở 2'}
                    </span>
                  </Td>
                  <Td className="text-gray-500 text-xs">
                    {formatDate(file.createdTime)}
                  </Td>
                  <Td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem tài liệu"
                      >
                        <Eye size={16} />
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUploadModal && (
        <Modal title="Tải lên biên bản họp BCH" onClose={() => { setShowUploadModal(false); setSelectedFile(null); setCustomName(''); }}>
          <div className="space-y-4">
            {isSuperAdmin && (
              <FS
                label="Lưu vào chi đoàn"
                opts={['Cơ sở 1', 'Cơ sở 2']}
                value={uploadBranch === 'cs1' ? 'Cơ sở 1' : 'Cơ sở 2'}
                onChange={e => setUploadBranch(e.target.value === 'Cơ sở 1' ? 'cs1' : 'cs2')}
              />
            )}

            <FI
              label="Tên biên bản hiển thị (Tùy chọn)"
              placeholder="Nhập tên dễ nhớ (ví dụ: Biên bản họp BCH tháng 6)"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Chọn tệp tin biên bản</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50 hover:bg-gray-50 transition-all text-center relative">
                <input
                  type="file"
                  onChange={e => setSelectedFile(e.target.files[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload size={32} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500">Kéo thả hoặc Click để chọn tệp</span>
                  <span className="text-[10px] text-gray-400">Hỗ trợ PDF, Word, Excel, Hình ảnh...</span>
                </div>
              </div>
              {selectedFile && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between text-xs text-green-700 font-semibold">
                  <span className="truncate max-w-[350px]">📎 {selectedFile.name}</span>
                  <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
              <Btn v="s" onClick={() => { setShowUploadModal(false); setSelectedFile(null); setCustomName(''); }}>Hủy</Btn>
              <Btn onClick={handleUpload} disabled={uploading || !selectedFile}>
                {uploading ? '⏳ Đang tải lên Drive...' : '💾 Tải lên'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
