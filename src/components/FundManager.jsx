import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Download, Grid3X3, BookOpen, Image, ExternalLink, Loader2, User, CheckCircle2, XCircle } from 'lucide-react';
import { Btn, Td, Th } from './UI';
import * as XLSX from 'xlsx';
import { getBranchConfig } from '../data/constants';

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const CURRENT_YEAR = new Date().getFullYear();

/* ─── Alert Portal ─── */
function AlertPortal({ alert, onClose }) {
  if (!alert) return null;
  const colorMap = { success: '#16a34a', error: '#dc2626', warning: '#d97706' };
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10005,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '80px 16px 16px', backgroundColor: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 400, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
        animation: 'scaleUp 0.18s ease'
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          {alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : '⚠️'}
        </div>
        <p style={{ color: colorMap[alert.type] || '#333', fontWeight: 600, fontSize: 15, marginBottom: 20 }}>
          {alert.message}
        </p>
        <button onClick={onClose} autoFocus style={{
          background: colorMap[alert.type] || '#555', color: '#fff', border: 'none',
          padding: '10px 32px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14
        }}>Đồng ý</button>
      </div>
    </div>,
    document.body
  );
}

/* ─── Confirm Portal ─── */
function ConfirmPortal({ confirm, onOk, onCancel }) {
  if (!confirm) return null;
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10005,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '80px 16px 16px', backgroundColor: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center'
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <p style={{ color: '#374151', fontWeight: 600, fontSize: 15, marginBottom: 24 }}>{confirm.message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '10px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14,
            border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151'
          }}>Hủy</button>
          <button onClick={onOk} style={{
            padding: '10px 28px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14,
            background: '#dc2626', color: '#fff', border: 'none'
          }}>Xóa</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════
   SUB-TAB 1: BẢNG LƯỚI ĐOÀN PHÍ
═══════════════════════════════════════ */
function DoanPhiGrid({ members, doanPhi, setDoanPhi, isAdmin }) {
  const [year, setYear] = useState(CURRENT_YEAR);

  const isInactive = m => m.trangThai && m.trangThai !== 'active' && m.trangThai !== 'chuyen_den';

  const displayMembers = members.filter(m => {
    if (!isInactive(m)) return true;
    if (m.ngayBienDong) {
      const bdYear = new Date(m.ngayBienDong).getFullYear();
      if (bdYear >= year) return true;
    } else {
      return true;
    }
    return false;
  });

  const isMonthDisabled = (member, month) => {
    if (!isInactive(member)) return false;
    if (!member.ngayBienDong) return false;
    const bdDate = new Date(member.ngayBienDong);
    const bdYear = bdDate.getFullYear();
    const bdMonth = bdDate.getMonth() + 1;
    if (year > bdYear) return true;
    if (year === bdYear && month > bdMonth) return true;
    return false;
  };

  const getPaid = (memberId, month) => {
    const rec = doanPhi.find(d => d.memberId === memberId && d.year === year);
    return rec ? !!rec.months[String(month)] : false;
  };

  const togglePaid = (member, month) => {
    if (!isAdmin) return;
    if (isMonthDisabled(member, month)) return;
    const memberId = member.id;
    setDoanPhi(prev => {
      const existing = prev.find(d => d.memberId === memberId && d.year === year);
      if (existing) {
        return prev.map(d =>
          d.memberId === memberId && d.year === year
            ? { ...d, months: { ...d.months, [String(month)]: !d.months[String(month)] } }
            : d
        );
      } else {
        const months = {};
        for (let m = 1; m <= 12; m++) months[String(m)] = false;
        months[String(month)] = true;
        return [...prev, { memberId, year, months }];
      }
    });
  };

  const setAllMonth = (month, val) => {
    if (!isAdmin) return;
    setDoanPhi(prev => {
      const updated = [...prev];
      displayMembers.forEach(member => {
        if (isMonthDisabled(member, month)) return;
        const idx = updated.findIndex(d => d.memberId === member.id && d.year === year);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], months: { ...updated[idx].months, [String(month)]: val } };
        } else {
          const months = {};
          for (let m = 1; m <= 12; m++) months[String(m)] = false;
          months[String(month)] = val;
          updated.push({ memberId: member.id, year, months });
        }
      });
      return updated;
    });
  };

  const getMonthStats = (month) => {
    const validMembers = displayMembers.filter(m => !isMonthDisabled(m, month));
    const paid = validMembers.filter(m => getPaid(m.id, month)).length;
    return { paid, total: validMembers.length };
  };

  const getMemberStats = (member) => {
    const rec = doanPhi.find(d => d.memberId === member.id && d.year === year);
    let count = 0;
    if (rec) {
      for (let m = 1; m <= 12; m++) {
        if (!isMonthDisabled(member, m) && rec.months[String(m)]) count++;
      }
    }
    const validCount = MONTHS.filter((_, i) => !isMonthDisabled(member, i + 1)).length;
    return { paidCount: count, validCount };
  };

  let totalPaid = 0;
  let totalCells = 0;
  displayMembers.forEach(m => {
    for (let mo = 1; mo <= 12; mo++) {
      if (!isMonthDisabled(m, mo)) {
        totalCells++;
        if (getPaid(m.id, mo)) totalPaid++;
      }
    }
  });

  const exportExcel = () => {
    const wsData = [
      [`BẢNG THEO DÕI ĐOÀN PHÍ NĂM ${year}`],
      [],
      ['STT', 'Họ và Tên', 'Khoa/Phòng', ...MONTHS.map((_, i) => `Tháng ${i + 1}`), 'Số tháng đóng', 'Tỷ lệ']
    ];
    displayMembers.forEach((m, idx) => {
      const months = MONTHS.map((_, i) => {
        if (isMonthDisabled(m, i + 1)) return '-';
        return getPaid(m.id, i + 1) ? '✔' : '';
      });
      const validCount = MONTHS.filter((_, i) => !isMonthDisabled(m, i + 1)).length;
      const paid = months.filter(v => v === '✔').length;
      const pct = validCount > 0 ? Math.round(paid / validCount * 100) : 0;
      wsData.push([idx + 1, m.hoTen, m.toDoan || '', ...months, `${paid}/${validCount}`, `${pct}%`]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, `Doan_Phi_${year}`);
    XLSX.writeFile(wb, `theo_doi_doan_phi_${year}.xlsx`);
  };

  return (
    <div>
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-600">Năm:</label>
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none bg-white shadow-sm"
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="flex items-center gap-4 ml-2 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-emerald-500 inline-block"></span>
              <span className="text-gray-500">Đã đóng</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-red-400 inline-block"></span>
              <span className="text-gray-500">Chưa đóng</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100">
            {totalPaid}/{totalCells} ô đã đóng ({totalCells > 0 ? Math.round(totalPaid / totalCells * 100) : 0}%)
          </div>
          <Btn v="s" onClick={exportExcel}>
            <Download size={16} /> Xuất Excel
          </Btn>
        </div>
      </div>

      {/* Grid table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 900, width: '100%' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #c8102e 0%, #1a237e 100%)' }}>
                <th style={{ ...stickyCol, color: '#fff', fontSize: 12, fontWeight: 700, padding: '12px 16px', textAlign: 'left', width: 40, minWidth: 40 }}>STT</th>
                <th style={{ ...stickyCol, left: 40, color: '#fff', fontSize: 12, fontWeight: 700, padding: '12px 16px', textAlign: 'left', minWidth: 180 }}>Họ và Tên</th>
                {MONTHS.map((mo, idx) => {
                  const { paid, total } = getMonthStats(idx + 1);
                  const allPaid = paid === total && total > 0;
                  return (
                    <th key={mo} style={{ padding: '8px 6px', textAlign: 'center', minWidth: 68 }}>
                      <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{mo}</div>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                          onClick={() => setAllMonth(idx + 1, true)}
                          disabled={!isAdmin}
                          title="Đánh dấu tất cả đã đóng"
                          style={{
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
                            padding: '2px 5px', cursor: isAdmin ? 'pointer' : 'default',
                            color: '#fff', fontSize: 10, fontWeight: 600, opacity: isAdmin ? 1 : 0.5
                          }}
                        >✓ Tất cả</button>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>{paid}/{total}</div>
                    </th>
                  );
                })}
                <th style={{ padding: '12px 12px', color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', minWidth: 80 }}>
                  Đã đóng
                </th>
              </tr>
            </thead>
            <tbody>
              {displayMembers.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontStyle: 'italic', fontSize: 14 }}>
                    Chưa có đoàn viên nào
                  </td>
                </tr>
              ) : (
                displayMembers.map((member, idx) => {
                  const { paidCount, validCount } = getMemberStats(member);
                  const allPaid = validCount > 0 && paidCount === validCount;
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ ...stickyCol, padding: '10px 16px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ ...stickyCol, left: 40, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                        <div>{member.hoTen}</div>
                        {member.toDoan && <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{member.toDoan}</div>}
                      </td>
                      {MONTHS.map((_, mIdx) => {
                        const month = mIdx + 1;
                        const disabled = isMonthDisabled(member, month);
                        const paid = getPaid(member.id, month);
                        return (
                          <td key={month} style={{ padding: '6px', textAlign: 'center' }}>
                            {disabled ? (
                              <div style={{ width: 44, height: 36, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8, border: '1px dashed #d1d5db' }}>
                                <span style={{ fontSize: 18, color: '#9ca3af' }}>-</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => togglePaid(member, month)}
                                disabled={!isAdmin}
                                title={paid ? `Tháng ${month}: Đã đóng — click để hủy` : `Tháng ${month}: Chưa đóng — click để đánh dấu`}
                                style={{
                                  width: 44, height: 36, borderRadius: 8, border: 'none',
                                  background: paid ? '#10b981' : '#fca5a5',
                                  cursor: isAdmin ? 'pointer' : 'default',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                                  transition: 'all 0.15s',
                                  boxShadow: paid ? '0 2px 6px rgba(16,185,129,0.35)' : '0 1px 3px rgba(252,165,165,0.4)',
                                  transform: 'scale(1)',
                                }}
                                onMouseEnter={e => { if (isAdmin) e.currentTarget.style.transform = 'scale(1.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                              >
                                {paid
                                  ? <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>5.000đ</span>
                                  : <XCircle size={16} color="#fff" opacity={0.7} />
                                }
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 12, fontWeight: 700,
                          background: allPaid ? '#d1fae5' : paidCount >= (validCount / 2) ? '#fef9c3' : '#fee2e2',
                          color: allPaid ? '#065f46' : paidCount >= (validCount / 2) ? '#92400e' : '#991b1b',
                        }}>
                          {paidCount}/{validCount}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          💡 Click vào ô để toggle trạng thái đóng đoàn phí. Click "✓ Tất cả" để đánh dấu đã đóng cho cả cột tháng.
        </p>
      )}
    </div>
  );
}

const stickyCol = {
  position: 'sticky', left: 0, zIndex: 2,
  background: 'inherit',
  borderRight: '1px solid #e5e7eb',
};

/* ═══════════════════════════════════════
   SUB-TAB 2: NHẬT KÝ THU-CHI
═══════════════════════════════════════ */
function ThuChiLedger({ funds, setFunds, doanPhi, isAdmin, isSuperAdmin, currentUser }) {
  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    type: 'thu', amount: '', description: '', performer: '',
    receiptUrl: '', receiptFileId: '', receiptName: '',
  };
  const [showForm, setShowForm] = useState(false);
  const [newFund, setNewFund] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const fileRef = useRef();

  const showAlert = (message, type = 'success') => setAlert({ message, type });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const config = getBranchConfig(currentUser?.username);
    if (!config.apiUrl) { showAlert('Chưa cấu hình API URL', 'error'); return; }
    setUploading(true);
    try {
      const folderId = config.folderDi || config.folderKeHoach || config.folderDen;
      if (!folderId) throw new Error('Chưa cấu hình thư mục lưu trữ');
      const base64 = await fileToBase64(file);
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'upload_file', folderId, base64: base64.split(',')[1], name: file.name, mimeType: file.type }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNewFund(f => ({ ...f, receiptUrl: data.url, receiptFileId: data.fileId, receiptName: file.name }));
        showAlert('Tải ảnh hóa đơn lên Drive thành công!', 'success');
      } else throw new Error(data.message);
    } catch (err) {
      showAlert('Lỗi tải ảnh: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newFund.amount || !newFund.description) return;
    const nextId = funds.length > 0 ? Math.max(...funds.map(f => f.id)) + 1 : 1;
    const added = { ...newFund, id: nextId, amount: parseInt(newFund.amount, 10) };
    setFunds([...funds, added]);
    setShowForm(false);
    setNewFund(emptyForm);
    showAlert('Đã thêm giao dịch thành công!', 'success');
  };

  const handleDelete = (fund) => {
    setConfirmDel({
      message: `Xóa giao dịch "${fund.description}" (${fund.type === 'thu' ? '+' : '-'}${fund.amount?.toLocaleString()} đ)?`,
      fund,
    });
  };

  const doDelete = () => {
    setFunds(funds.filter(f => f.id !== confirmDel.fund.id));
    setConfirmDel(null);
    showAlert('Đã xóa giao dịch.', 'warning');
  };

  const autoFunds = [];
  const years = [...new Set((doanPhi || []).map(d => d.year))];
  
  years.forEach(year => {
    for (let month = 1; month <= 12; month++) {
      let count = 0;
      (doanPhi || []).forEach(d => {
        if (d.year === year && d.months[String(month)]) {
          count++;
        }
      });
      if (count > 0) {
        autoFunds.push({
          id: `auto-thu-${year}-${month}`,
          date: `${year}-${month.toString().padStart(2, '0')}-28`,
          type: 'thu',
          amount: count * 5000,
          description: `Thu đoàn phí tháng ${month} năm ${year} (${count} ĐV x 5.000đ)`,
          performer: 'Hệ thống tự động',
          isAuto: true
        });
        autoFunds.push({
          id: `auto-chi-${year}-${month}`,
          date: `${year}-${month.toString().padStart(2, '0')}-28`,
          type: 'chi',
          amount: Math.round((count * 5000) / 3),
          description: `Nộp cho đoàn cấp trên tháng ${month} năm ${year} (1/3 đoàn phí)`,
          performer: 'Hệ thống tự động',
          isAuto: true
        });
      }
    }
  });

  const combinedFunds = [...funds, ...autoFunds];
  const sortedFunds = combinedFunds.sort((a, b) => new Date(a.date) - new Date(b.date));
  let currentBalance = 0;
  const fundsWithBalance = sortedFunds.map(f => {
    currentBalance += f.type === 'thu' ? f.amount : -f.amount;
    return { ...f, balance: currentBalance };
  }).reverse();

  const totalIncome = combinedFunds.filter(f => f.type === 'thu').reduce((s, f) => s + f.amount, 0);
  const totalExpense = combinedFunds.filter(f => f.type === 'chi').reduce((s, f) => s + f.amount, 0);

  const handleExportExcel = () => {
    const wsData = [
      ['NHẬT KÝ THU CHI QUỸ ĐOÀN'],
      [`Tổng thu: ${totalIncome.toLocaleString()} đ | Tổng chi: ${totalExpense.toLocaleString()} đ | Tồn quỹ: ${currentBalance.toLocaleString()} đ`],
      [],
      ['STT', 'Ngày', 'Loại', 'Nội dung', 'Người thực hiện', 'Số tiền (đ)', 'Tồn quỹ lũy kế (đ)', 'Hóa đơn'],
    ];
    [...fundsWithBalance].reverse().forEach((f, idx) => {
      wsData.push([
        idx + 1,
        new Date(f.date).toLocaleDateString('vi-VN'),
        f.type === 'thu' ? 'Thu' : 'Chi',
        f.description,
        f.performer || '',
        f.amount,
        f.balance,
        f.receiptUrl || '',
      ]);
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), 'Thu_Chi_Quy');
    XLSX.writeFile(wb, 'nhat_ky_thu_chi_quy.xlsx');
  };

  return (
    <div>
      <AlertPortal alert={alert} onClose={() => setAlert(null)} />
      <ConfirmPortal confirm={confirmDel} onOk={doDelete} onCancel={() => setConfirmDel(null)} />

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {[
          { label: 'Tồn quỹ hiện tại', val: currentBalance, icon: Wallet, color: 'blue', sign: '' },
          ...(!isSuperAdmin ? [
            { label: 'Tổng thu', val: totalIncome, icon: TrendingUp, color: 'green', sign: '+' },
            { label: 'Tổng chi', val: totalExpense, icon: TrendingDown, color: 'red', sign: '-' },
          ] : []),
        ].map(({ label, val, icon: Icon, color, sign }) => (
          <div key={label} className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 card-hover`}>
            <div className={`w-12 h-12 rounded-full bg-${color}-50 flex items-center justify-center text-${color}-600`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className={`text-xl font-bold ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-gray-800'}`}>
                {sign}{val.toLocaleString()} đ
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      {!isSuperAdmin && (
        <div className="flex gap-2 mb-5">
          <Btn v="s" onClick={handleExportExcel}><Download size={16} /> Xuất Excel</Btn>
          {isAdmin && (
            <Btn onClick={() => { setShowForm(!showForm); setNewFund(emptyForm); }}>
              <Plus size={16} /> Thêm giao dịch
            </Btn>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && isAdmin && !isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-md mb-5 animate-fade-in-down">
          <h3 className="font-bold text-gray-800 mb-4 text-base">Thêm giao dịch mới</h3>
          <form onSubmit={handleAdd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Ngày tháng</label>
                <input type="date" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  value={newFund.date} onChange={e => setNewFund({ ...newFund, date: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Loại giao dịch</label>
                <select className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 bg-white"
                  value={newFund.type} onChange={e => setNewFund({ ...newFund, type: e.target.value })}>
                  <option value="thu">📈 Khoản Thu</option>
                  <option value="chi">📉 Khoản Chi</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Số tiền (VNĐ)</label>
                <input type="number" min="0" placeholder="Ví dụ: 500000"
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  value={newFund.amount} onChange={e => setNewFund({ ...newFund, amount: e.target.value })} required />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Nội dung chi tiết</label>
                <input type="text" placeholder="Ghi rõ nội dung thu/chi..."
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  value={newFund.description} onChange={e => setNewFund({ ...newFund, description: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
                  <User size={12} /> Người thực hiện
                </label>
                <input type="text" placeholder="Tên người thu/chi..."
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  value={newFund.performer} onChange={e => setNewFund({ ...newFund, performer: e.target.value })} />
              </div>
            </div>

            {/* File upload */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
                <Image size={12} /> Ảnh hóa đơn / Chứng từ
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-500 hover:text-blue-600">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
                  {uploading ? 'Đang tải lên...' : 'Chọn ảnh'}
                </button>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                {newFund.receiptName && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} /> {newFund.receiptName}
                    {newFund.receiptUrl && (
                      <a href={newFund.receiptUrl} target="_blank" rel="noreferrer"
                        className="ml-1 text-blue-500 hover:underline flex items-center gap-0.5">
                        <ExternalLink size={12} /> Xem
                      </a>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm shadow-sm">
                Lưu giao dịch
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions table */}
      {!isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th>Ngày</Th>
                  <Th>Loại</Th>
                  <Th>Nội dung</Th>
                  <Th>Người thực hiện</Th>
                  <Th>Số tiền</Th>
                  <Th>Quỹ còn lại</Th>
                  <Th>HĐ</Th>
                  {isAdmin && <Th>Xóa</Th>}
                </tr>
              </thead>
              <tbody>
                {fundsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="text-center p-10 text-gray-400 italic text-sm">
                      Chưa có giao dịch nào
                    </td>
                  </tr>
                ) : fundsWithBalance.map(fund => (
                  <tr key={fund.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${fund.isAuto ? 'bg-amber-50/20' : ''}`}>
                    <Td>{new Date(fund.date).toLocaleDateString('vi-VN')}</Td>
                    <Td>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${fund.type === 'thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {fund.type === 'thu' ? '↑ Thu' : '↓ Chi'}
                      </span>
                    </Td>
                    <Td><span className="text-sm">{fund.description}</span></Td>
                    <Td>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {fund.performer ? <><User size={11} />{fund.performer}</> : <span className="italic text-gray-300">—</span>}
                      </span>
                    </Td>
                    <Td>
                      <span className={`font-bold text-sm ${fund.type === 'thu' ? 'text-green-600' : 'text-red-600'}`}>
                        {fund.type === 'thu' ? '+' : '-'}{fund.amount?.toLocaleString()} đ
                      </span>
                    </Td>
                    <Td><span className="font-bold text-gray-800 text-sm">{fund.balance?.toLocaleString()} đ</span></Td>
                    <Td>
                      {fund.receiptUrl ? (
                        <a href={fund.receiptUrl} target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:text-blue-700 flex items-center justify-center" title="Xem hóa đơn">
                          <Image size={16} />
                        </a>
                      ) : <span className="text-gray-300 text-center block">—</span>}
                    </Td>
                    {isAdmin && (
                      <Td>
                        {!fund.isAuto && (
                          <button onClick={() => handleDelete(fund)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa giao dịch">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════ */
export default function FundManager({ funds, setFunds, doanPhi, setDoanPhi, members, isAdmin, isSuperAdmin, currentUser }) {
  const [subTab, setSubTab] = useState('doanphi');

  const safeMembers = members || [];
  const safeDoanPhi = doanPhi || [];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Theo dõi Đoàn phí & Tài chính</h2>
          <p className="text-gray-500 text-sm mt-1">Quản lý đoàn phí và nhật ký thu chi quỹ chi đoàn</p>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {[
          { id: 'doanphi', label: 'Đoàn phí', icon: Grid3X3, desc: 'Theo dõi 12 tháng' },
          { id: 'thuchi', label: 'Thu-Chi Quỹ', icon: BookOpen, desc: 'Nhật ký quỹ đoàn' },
        ].map(tab => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#c8102e' : '#6b7280',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}>
              <Icon size={16} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{tab.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {subTab === 'doanphi'
        ? <DoanPhiGrid members={safeMembers} doanPhi={safeDoanPhi} setDoanPhi={setDoanPhi} isAdmin={isAdmin} />
        : <ThuChiLedger funds={funds} setFunds={setFunds} doanPhi={safeDoanPhi} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} currentUser={currentUser} />
      }
    </div>
  );
}
