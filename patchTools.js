import fs from 'fs';

let content = fs.readFileSync('src/components/ToolsManager.jsx', 'utf8');

// 1. Add setPlans to props
content = content.replace(
  /export default function ToolsManager\(\{\s*plans,\s*isAdmin,\s*currentUser,\s*geminiApiKey\s*\}\)/,
  "export default function ToolsManager({ plans, setPlans, isAdmin, currentUser, geminiApiKey })"
);

// 2. Add cdForm states
const stateStr = `const [activeTab, setActiveTab] = useState('dinh_ky');

  const [showCdForm, setShowCdForm] = useState(false);
  const [cdForm, setCdForm] = useState({ title: '', category: 'Sinh hoạt', startDate: '', endDate: '', status: 'Kế hoạch', responsible: '', description: '' });
  const [cdPendingFile, setCdPendingFile] = useState(null);
  const [uploadingCd, setUploadingCd] = useState(false);

  const resetCdForm = () => {
    setCdForm({ title: '', category: 'Sinh hoạt', startDate: '', endDate: '', status: 'Kế hoạch', responsible: '', description: '' });
    setCdPendingFile(null);
  };

  const handleSaveCdPlan = async () => {
    if (!isAdmin) return alert("Tài khoản khách không có quyền thêm mới kế hoạch!");
    if (!cdForm.title) return alert("Vui lòng nhập tên hoạt động!");
    setUploadingCd(true);
    const config = getBranchConfig(currentUser?.username);
    try {
      let attachment = null;
      if (cdPendingFile) {
        const uploadedObj = await uploadFileToDrive(cdPendingFile, '1g3Y-MgyR6kButQGiBrbuI9OFI5pAwTPn', config.apiUrl);
        attachment = { name: uploadedObj.name, fileId: uploadedObj.fileId || uploadedObj.id, viewUrl: uploadedObj.url || uploadedObj.webViewLink };
      } else if (typeof cdResult !== 'undefined' && cdResult) {
        const htmlContent = convertMarkdownToDocHTML(cdResult);
        const header = \`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title></head><body>\`;
        const sourceHTML = header + htmlContent + "</body></html>";
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const response = await fetch(source);
        const blob = await response.blob();
        const file = new File([blob], \`Ke_Hoach_Chuyen_De.doc\`, { type: 'application/msword' });
        const uploadedObj = await uploadFileToDrive(file, '1g3Y-MgyR6kButQGiBrbuI9OFI5pAwTPn', config.apiUrl);
        attachment = { name: \`Ke_Hoach_Chuyen_De.doc\`, fileId: uploadedObj.fileId || uploadedObj.id, viewUrl: uploadedObj.url || uploadedObj.webViewLink };
      }

      if (setPlans) {
        setPlans(prev => [{ ...cdForm, id: Date.now(), attachment }, ...prev]);
      }
      showToast('Đã lưu kế hoạch vào Danh sách!');
      setShowCdForm(false);
      resetCdForm();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setUploadingCd(false);
    }
  };`;

content = content.replace(/const \[activeTab, setActiveTab\] = useState\('dinh_ky'\);/, stateStr);

// 3. Update handleSaveToDrive to add to plans
const handleSaveToDriveStr = `
        const file = new File([docxBlob], \`\${filename}.docx\`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const uploadRes = await uploadFileToDrive(file, folderId, config.apiUrl);
        
        if (setPlans) {
          const fileId = uploadRes.fileId || uploadRes.id;
          const url = uploadRes.url || uploadRes.webViewLink;
          const newPlan = {
            id: Date.now(),
            title: filename.replace(/_/g, ' '),
            category: type === 'ke_hoach' ? 'Khởi nghiệp' : 'Sinh hoạt',
            startDate: \`\${dkYear}-\${dkMonth}-\${dkDate}\`,
            endDate: \`\${dkYear}-\${dkMonth}-\${dkDate}\`,
            status: 'Hoàn thành',
            responsible: dkSecretary || 'BCH Chi đoàn',
            description: \`Văn bản tạo tự động từ Mô-đun Công cụ\`,
            attachment: { name: \`\${filename}.docx\`, fileId: fileId, viewUrl: url }
          };
          setPlans(prev => [newPlan, ...prev]);
        }
        
        showToast(\`Đã lưu \${filename}.docx lên Google Drive và thêm vào Danh sách Kế hoạch!\`);
`;

content = content.replace(
  /const file = new File\(\[docxBlob\], `\$\{filename\}\.docx`.*?await uploadFileToDrive\(file, folderId, config\.apiUrl\);\s*showToast\(`Đã lưu \$\{filename\}\.docx lên Google Drive thành công!`\);/s,
  handleSaveToDriveStr
);

const handleSaveToDriveStr2 = `
      const file = new File([blob], \`\${filename}.doc\`, { type: 'application/msword' });
      const uploadRes = await uploadFileToDrive(file, folderId, config.apiUrl);
      
      if (setPlans) {
        const fileId = uploadRes.fileId || uploadRes.id;
        const url = uploadRes.url || uploadRes.webViewLink;
        const newPlan = {
          id: Date.now(),
          title: filename.replace(/_/g, ' '),
          category: type === 'ke_hoach' ? 'Khởi nghiệp' : 'Sinh hoạt',
          startDate: \`\${dkYear}-\${dkMonth}-\${dkDate}\`,
          endDate: \`\${dkYear}-\${dkMonth}-\${dkDate}\`,
          status: 'Hoàn thành',
          responsible: dkSecretary || 'BCH Chi đoàn',
          description: \`Văn bản tạo tự động từ Mô-đun Công cụ\`,
          attachment: { name: \`\${filename}.doc\`, fileId: fileId, viewUrl: url }
        };
        setPlans(prev => [newPlan, ...prev]);
      }

      showToast(\`Đã lưu \${filename}.doc lên Google Drive và thêm vào Danh sách Kế hoạch!\`);
    } catch (err) {
      alert("Lỗi lưu Drive: " + err.message);
    } finally {
      setLoadingDrive(prev => ({ ...prev, [type]: false }));
    }
  };`;

content = content.replace(
  /const file = new File\(\[blob\], `\$\{filename\}\.doc`.*?await uploadFileToDrive\(file, folderId, config\.apiUrl\);\s*showToast\(`Đã lưu \$\{filename\}\.doc lên Google Drive thành công!`\);/s,
  handleSaveToDriveStr2
);

// 4. Update chiendich button
content = content.replace(
  /<button onClick=\{\(\) => handleSaveToDrive\(cdResult, 'ke_hoach'\)\} disabled=\{loadingDrive\['ke_hoach'\]\}.*?<\/button>/s,
  `<button onClick={() => setShowCdForm(true)} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition font-bold">
                    <Check size={14} /> Thêm vào Kế hoạch
                  </button>`
);

// 5. Add Modal
const modalStr = `
      {showCdForm && (
        <Modal title="Thêm kế hoạch mới" onClose={() => { setShowCdForm(false); resetCdForm(); }}>
          <FI label="Tên hoạt động *" value={cdForm.title} onChange={e => setCdForm({ ...cdForm, title: e.target.value })} placeholder="Nhập tên hoạt động..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FI label="Ngày bắt đầu" type="date" value={cdForm.startDate} onChange={e => setCdForm({ ...cdForm, startDate: e.target.value })} />
            <FI label="Ngày kết thúc" type="date" value={cdForm.endDate} onChange={e => setCdForm({ ...cdForm, endDate: e.target.value })} />
          </div>
          <FS label="Trạng thái" opts={['Kế hoạch', 'Đang thực hiện', 'Hoàn thành']} value={cdForm.status} onChange={e => setCdForm({ ...cdForm, status: e.target.value })} />
          <FI label="Người phụ trách" value={cdForm.responsible} onChange={e => setCdForm({ ...cdForm, responsible: e.target.value })} />
          <FT label="Mô tả" value={cdForm.description} onChange={e => setCdForm({ ...cdForm, description: e.target.value })} />
          <div style={{ marginBottom: 11 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4 }}>Đính kèm tệp tin (Google Drive)</label>
            <div style={{ border: '1.5px dashed #ccc', borderRadius: 8, background: '#fafafa', padding: '10px 14px' }}>
              <input type="file" onChange={e => setCdPendingFile(e.target.files[0] || null)} style={{ fontSize: 13, width: '100%' }} />
              {cdPendingFile ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#34A853', fontWeight: 600 }}>✅ Đã chọn: {cdPendingFile.name}</div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>💡 Bỏ trống để AI tự động đính kèm file Word vừa tạo</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTop: '1px solid #eee' }}>
            <Btn v="s" onClick={() => { setShowCdForm(false); resetCdForm(); }}>Hủy</Btn>
            <Btn onClick={handleSaveCdPlan} disabled={uploadingCd}>{uploadingCd ? '⏳ Đang lưu...' : '💾 Lưu kế hoạch'}</Btn>
          </div>
        </Modal>
      )}`;

content = content.replace(/{\/\* CONTENT: KHO BIỂU MẪU \*\//, modalStr + '\n\n      {/* CONTENT: KHO BIỂU MẪU */');

fs.writeFileSync('src/components/ToolsManager.jsx', content);
