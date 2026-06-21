import React, { useState } from 'react';
import { Modal, FI, FS, FT, Btn } from './UI';
import { RED, GREEN, GOLD, NAVY, TEAL, getBranchConfig } from '../data/constants';
import { FileText, Eye, Download, Edit3, Trash2 } from 'lucide-react';

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

export default function PlansManager({ 
  plans, 
  setPlans, 
  isAdmin, 
  geminiApiKey, 
  currentUser
}) {
  const [subTab, setSubTab] = useState('ke_hoach'); // ke_hoach | bien_ban | nghi_quyet | bao_cao
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // file object chưa upload
  const [editingPlan, setEditingPlan] = useState(null); // plan đang sửa
  const [editPendingFile, setEditPendingFile] = useState(null); // file đính kèm mới khi sửa

  const [form, setForm] = useState({
    title: '', category: 'Sinh hoạt', startDate: '', endDate: '',
    status: 'Kế hoạch', responsible: '', description: '', attachment: null
  });

  const cc = { 'Sinh hoạt': RED, 'Tình nguyện': GREEN, 'Khởi nghiệp': GOLD, 'Giáo dục': NAVY, 'Thể thao': TEAL };
  const sc = { 'Hoàn thành': GREEN, 'Đang thực hiện': GOLD, 'Kế hoạch': '#aaa' };

  const getFilteredPlans = () => {
    const filtered = (plans || []).filter(p => {
      const t = (p.title || '').toLowerCase();
      
      const isBaoCao = t.includes('báo cáo') || t.includes('bao_cao') || t.includes('bao cao');
      const isBienBan = t.includes('biên bản') || t.includes('bien_ban') || t.includes('bien ban');
      const isNghiQuyet = t.includes('nghị quyết') || t.includes('nghi_quyet') || t.includes('nghi quyet');

      if (subTab === 'bao_cao') return isBaoCao;
      if (subTab === 'bien_ban') return isBienBan;
      if (subTab === 'nghi_quyet') return isNghiQuyet;
      
      // ke_hoach is everything else
      return !(isBaoCao || isBienBan || isNghiQuyet);
    });
    
    // Sort by startDate descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startDate || 0);
      const dateB = new Date(b.startDate || 0);
      return dateB - dateA;
    });
  };

  const filteredPlans = getFilteredPlans();
  const listTitle = subTab === 'ke_hoach' ? '📋 Kế hoạch hoạt động' 
                  : subTab === 'bien_ban' ? '📋 Biên bản họp' 
                  : subTab === 'nghi_quyet' ? '📋 Nghị quyết' 
                  : '📋 Báo cáo';

  const resetForm = () => {
    setForm({ title: '', category: 'Sinh hoạt', startDate: '', endDate: '', status: 'Kế hoạch', responsible: '', description: '', attachment: null });
    setPendingFile(null);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      alert("Tài khoản khách không có quyền thêm mới!");
      return;
    }
    if (!form.title) return;
    setUploading(true);
    const config = getBranchConfig(currentUser?.username);
    try {
      let attachment = null;
      if (pendingFile) {
        const uploadedObj = await uploadFileToDrive(pendingFile, config.folderKeHoach, config.apiUrl);
        attachment = {
          name: uploadedObj.name,
          fileId: uploadedObj.id,
          viewUrl: uploadedObj.webViewLink,
        };
      }

      const newPlan = { ...form, id: Date.now(), attachment };
      setPlans(prev => [newPlan, ...prev]);
      setShowForm(false);
      resetForm();
    } catch (err) {
      alert('Lỗi tải file lên Drive: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePlan = (id) => {
    if (!isAdmin) return;
    if (window.confirm('Bạn có chắc muốn xóa văn bản này?')) {
      setPlans(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan({ ...plan });
    setEditPendingFile(null);
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan || !editingPlan.title) return;
    setUploading(true);
    const config = getBranchConfig(currentUser?.username);
    try {
      let attachment = editingPlan.attachment;
      if (editPendingFile) {
        const uploadedObj = await uploadFileToDrive(editPendingFile, config.folderKeHoach, config.apiUrl);
        attachment = {
          name: uploadedObj.name,
          fileId: uploadedObj.id,
          viewUrl: uploadedObj.webViewLink,
        };
      }
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...editingPlan, attachment } : p));
      setEditingPlan(null);
      setEditPendingFile(null);
    } catch (err) {
      alert('Lỗi tải file lên Drive: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Selector dạng Menu Tab đẹp mắt */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
        <button
          onClick={() => setSubTab('ke_hoach')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${subTab === 'ke_hoach' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileText size={16} /> Danh sách Kế hoạch
        </button>
        <button
          onClick={() => setSubTab('bien_ban')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${subTab === 'bien_ban' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileText size={16} /> Danh sách Biên bản
        </button>
        <button
          onClick={() => setSubTab('nghi_quyet')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${subTab === 'nghi_quyet' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileText size={16} /> Danh sách Nghị quyết
        </button>
        <button
          onClick={() => setSubTab('bao_cao')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${subTab === 'bao_cao' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <FileText size={16} /> Danh sách Báo cáo
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#1a1a2e' }}>{listTitle}</h2>
          {isAdmin && <Btn onClick={() => setShowForm(true)}>+ Thêm mới</Btn>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filteredPlans.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div style={{ background: cc[p.category] || RED, padding: '14px 18px', color: '#fff', position: 'relative' }}>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{p.category}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4, lineHeight: 1.4, paddingRight: 56 }}>{p.title}</div>
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition-colors cursor-pointer text-white"
                      title="Sửa"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.id)}
                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition-colors cursor-pointer text-white"
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>📅 {p.startDate} → {p.endDate}</div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666', lineHeight: 1.6 }} className="line-clamp-4">{p.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, background: sc[p.status] || '#aaa', color: '#fff', fontSize: 11, fontWeight: 700 }}>{p.status}</span>
                  <span style={{ fontSize: 12, color: '#aaa' }}>👤 {p.responsible}</span>
                </div>
                {p.attachment && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #eee' }}>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>📎</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.attachment.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={p.attachment.viewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '5px 12px', background: '#f0f0f0', color: '#333', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}>👁 Xem</a>
                      <a href={p.attachment.downloadUrl || `https://drive.google.com/uc?export=download&id=${p.attachment.fileId}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '5px 12px', background: '#eef2ff', color: '#4f46e5', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}>⬇ Tải về</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <Modal title="Thêm mục mới" onClose={() => { setShowForm(false); resetForm(); }}>
            <FI label="Tên mục *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nhập tên..." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FI label="Ngày bắt đầu" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              <FI label="Ngày kết thúc" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <FS label="Trạng thái" opts={['Kế hoạch', 'Đang thực hiện', 'Hoàn thành']} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} />
            <FI label="Người phụ trách" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} />
            <FT label="Mô tả" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div style={{ marginBottom: 11 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 }}>Đính kèm tệp tin (Google Drive)</label>
              <div style={{ border: '1.5px dashed #ccc', borderRadius: 8, background: '#fafafa', padding: '10px 14px' }}>
                <input type="file" onChange={e => setPendingFile(e.target.files[0] || null)} style={{ fontSize: 13, width: '100%' }} />
                {pendingFile && <div style={{ marginTop: 6, fontSize: 12, color: '#34A853', fontWeight: 600 }}>✅ Đã chọn: {pendingFile.name}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTop: '1px solid #eee' }}>
              <Btn v="s" onClick={() => { setShowForm(false); resetForm(); }}>Hủy</Btn>
              <Btn onClick={handleSave} disabled={uploading}>{uploading ? '⏳ Đang lưu...' : '💾 Lưu lại'}</Btn>
            </div>
          </Modal>
        )}

        {editingPlan && (
          <Modal title="Sửa thông tin" onClose={() => setEditingPlan(null)}>
            <FI label="Tên mục *" value={editingPlan.title} onChange={e => setEditingPlan({ ...editingPlan, title: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FI label="Ngày bắt đầu" type="date" value={editingPlan.startDate} onChange={e => setEditingPlan({ ...editingPlan, startDate: e.target.value })} />
              <FI label="Ngày kết thúc" type="date" value={editingPlan.endDate} onChange={e => setEditingPlan({ ...editingPlan, endDate: e.target.value })} />
            </div>
            <FS label="Trạng thái" opts={['Kế hoạch', 'Đang thực hiện', 'Hoàn thành']} value={editingPlan.status} onChange={e => setEditingPlan({ ...editingPlan, status: e.target.value })} />
            <FI label="Người phụ trách" value={editingPlan.responsible} onChange={e => setEditingPlan({ ...editingPlan, responsible: e.target.value })} />
            <FT label="Mô tả" value={editingPlan.description} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} />
            
            <div style={{ marginBottom: 11 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 }}>Đính kèm mới (thay thế tệp cũ nếu có)</label>
              <div style={{ border: '1.5px dashed #ccc', borderRadius: 8, background: '#fafafa', padding: '10px 14px' }}>
                <input type="file" onChange={e => setEditPendingFile(e.target.files[0] || null)} style={{ fontSize: 13, width: '100%' }} />
                {editPendingFile && <div style={{ marginTop: 6, fontSize: 12, color: '#34A853', fontWeight: 600 }}>✅ Đã chọn: {editPendingFile.name}</div>}
              </div>
              {editingPlan.attachment && !editPendingFile && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#4f46e5' }}>📎 Tệp hiện tại: {editingPlan.attachment.name}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTop: '1px solid #eee' }}>
              <Btn v="s" onClick={() => setEditingPlan(null)}>Hủy</Btn>
              <Btn onClick={handleUpdatePlan} disabled={uploading}>{uploading ? '⏳ Đang lưu...' : '💾 Cập nhật'}</Btn>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
