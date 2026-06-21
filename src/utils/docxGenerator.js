import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';

const createHeaderTable = (branchName, dkDocNo, dkYear, dkDate, dkMonth, docType) => {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "ĐTN BỆNH VIỆN THAN – KHOÁNG SẢN", font: "Times New Roman", size: 26 })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "BCH CHI ĐOÀN BỆNH VIỆN", font: "Times New Roman", size: 28, bold: true })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "THAN - KHOÁNG SẢN CS2", font: "Times New Roman", size: 28, bold: true })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "─────────", font: "Times New Roman", size: 28 })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Số: ${dkDocNo}/${dkYear}-${docType}/ĐTNCS2`, font: "Times New Roman", size: 28 })]
              }),
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "ĐOÀN TN CỘNG SẢN HỒ CHÍ MINH", font: "Times New Roman", size: 28, bold: true })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "─────────", font: "Times New Roman", size: 28 })]
              }),
              new Paragraph({ text: "" }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Mạo Khê, ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}`, font: "Times New Roman", size: 28, italics: true })]
              }),
            ]
          })
        ]
      })
    ]
  });
};

const createListParagraphs = (textBlock) => {
  return textBlock.split('\n').filter(l => l.trim()).map(line => {
    return new Paragraph({
      text: line.replace(/^-/, '').trim(),
      font: "Times New Roman",
      size: 28,
      bullet: { level: 0 },
      alignment: AlignmentType.JUSTIFIED
    });
  });
};

export const generateDinhKyDocx = async (type, data) => {
  const { branchName, dkDocNo, dkDate, dkMonth, dkYear, results, nextPlan, secretary, nextMonthStr, nextYearStr } = data;
  
  let children = [];

  if (type === 'bao_cao') {
    children = [
      createHeaderTable(branchName, dkDocNo, dkYear, dkDate, dkMonth, "BC"),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "BÁO CÁO", font: "Times New Roman", size: 30, bold: true })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `KẾT QUẢ HOẠT ĐỘNG CÔNG TÁC ĐOÀN VÀ PHONG TRÀO THANH NIÊN THÁNG ${dkMonth} VÀ PHƯƠNG HƯỚNG THÁNG ${nextMonthStr} NĂM ${nextYearStr}`, font: "Times New Roman", size: 28, bold: true })
        ]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Thực hiện Kế hoạch của BCH Đoàn thanh niên Bệnh viện Than - Khoáng sản về công tác đoàn năm ${dkYear}. Được sự quan tâm chỉ đạo trực tiếp của Chi bộ, từ tình hình hoạt động chung của toàn đơn vị. BCH ${branchName} báo cáo:`, font: "Times New Roman", size: 28 })
        ]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: `I. Kết quả hoạt động trong tháng ${dkMonth}/${dkYear}`, font: "Times New Roman", size: 28, bold: true })]
      }),
      ...createListParagraphs(results),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: `II. Kế hoạch hoạt động tháng ${nextMonthStr}/${nextYearStr}`, font: "Times New Roman", size: 28, bold: true })]
      }),
      ...createListParagraphs(nextPlan),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Trên đây là kết quả hoạt động công tác đoàn và phong trào TTN của ${branchName} trong tháng ${dkMonth}/${dkYear} và triển khai phương hướng nhiệm vụ trọng tâm trong tháng ${nextMonthStr}/${nextYearStr}.`, font: "Times New Roman", size: 28 })
        ]
      }),
      new Paragraph({ text: "" }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [] }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TM. BAN CHẤP HÀNH", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bí thư", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đặng Phong Thái", font: "Times New Roman", size: 28, bold: true })] }),
                ]
              })
            ]
          })
        ]
      })
    ];
  } else if (type === 'bien_ban') {
    children = [
      createHeaderTable(branchName, dkDocNo, dkYear, dkDate, dkMonth, "BB"),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "BIÊN BẢN", font: "Times New Roman", size: 30, bold: true })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `HỘI NGHỊ BAN CHẤP HÀNH CHI ĐOÀN THÁNG ${dkMonth}/${dkYear}`, font: "Times New Roman", size: 28, bold: true })
        ]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `- Thời gian: 14h00 ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}`, font: "Times New Roman", size: 28 })] }),
      new Paragraph({ children: [new TextRun({ text: `- Địa điểm: Phòng họp Chi đoàn`, font: "Times New Roman", size: 28 })] }),
      new Paragraph({ children: [new TextRun({ text: `- Thành phần: Các đồng chí trong BCH Chi đoàn`, font: "Times New Roman", size: 28 })] }),
      new Paragraph({ children: [new TextRun({ text: `- Chủ trì: Đồng chí Đặng Phong Thái - Bí thư Chi đoàn`, font: "Times New Roman", size: 28 })] }),
      new Paragraph({ children: [new TextRun({ text: `- Thư ký: Đồng chí ${secretary}`, font: "Times New Roman", size: 28 })] }),
      new Paragraph({ text: "" }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NỘI DUNG HỘI NGHỊ:`, font: "Times New Roman", size: 28, bold: true })] }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `1. Đồng chí Chủ trì đánh giá kết quả hoạt động tháng ${dkMonth}/${dkYear}:`, font: "Times New Roman", size: 28, bold: true })] }),
      ...createListParagraphs(results),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `2. Triển khai phương hướng hoạt động tháng ${nextMonthStr}/${nextYearStr}:`, font: "Times New Roman", size: 28, bold: true })] }),
      ...createListParagraphs(nextPlan),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `3. Thảo luận:`, font: "Times New Roman", size: 28, bold: true })] }),
      new Paragraph({ text: "100% các đồng chí dự họp nhất trí với báo cáo kết quả hoạt động và phương hướng trên.", font: "Times New Roman", size: 28, bullet: { level: 0 } }),
      new Paragraph({ text: "BCH nhất trí phân công nhiệm vụ cụ thể cho từng phân đoàn để triển khai hiệu quả.", font: "Times New Roman", size: 28, bullet: { level: 0 } }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `Hội nghị kết thúc vào 15h00 cùng ngày. Biên bản đã được thông qua tại hội nghị.`, font: "Times New Roman", size: 28 })] }),
      new Paragraph({ text: "" }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "THƯ KÝ", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: secretary, font: "Times New Roman", size: 28, bold: true })] }),
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CHỦ TRÌ", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bí thư", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đặng Phong Thái", font: "Times New Roman", size: 28, bold: true })] }),
                ]
              })
            ]
          })
        ]
      })
    ];
  } else if (type === 'nghi_quyet') {
    children = [
      createHeaderTable(branchName, dkDocNo, dkYear, dkDate, dkMonth, "NQ"),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "NGHỊ QUYẾT", font: "Times New Roman", size: 30, bold: true })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `HỘI NGHỊ BAN CHẤP HÀNH CHI ĐOÀN THÁNG ${dkMonth}/${dkYear}`, font: "Times New Roman", size: 28, bold: true })
        ]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Căn cứ vào kết quả Hội nghị Ban Chấp hành Chi đoàn ngày ${dkDate} tháng ${dkMonth} năm ${dkYear}, Ban Chấp hành Chi đoàn quyết nghị:`, font: "Times New Roman", size: 28 })
        ]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `Điều 1. Nhất trí thông qua báo cáo kết quả hoạt động tháng ${dkMonth}/${dkYear} với các kết quả nổi bật:`, font: "Times New Roman", size: 28, bold: true })] }),
      ...createListParagraphs(results),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `Điều 2. Nhất trí thông qua phương hướng, nhiệm vụ tháng ${nextMonthStr}/${nextYearStr} gồm các nhiệm vụ trọng tâm:`, font: "Times New Roman", size: 28, bold: true })] }),
      ...createListParagraphs(nextPlan),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: `Điều 3. Tổ chức thực hiện:`, font: "Times New Roman", size: 28, bold: true })] }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 },
        children: [
          new TextRun({ text: `Giao cho Bí thư Chi đoàn, các đồng chí ủy viên BCH và các phân đoàn chịu trách nhiệm thi hành Nghị quyết này.`, font: "Times New Roman", size: 28 })
        ]
      }),
      new Paragraph({ text: "" }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [] }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TM. BAN CHẤP HÀNH", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bí thư", font: "Times New Roman", size: 28, bold: true })] }),
                  new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đặng Phong Thái", font: "Times New Roman", size: 28, bold: true })] }),
                ]
              })
            ]
          })
        ]
      })
    ];
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  return await Packer.toBlob(doc);
};

export const generateTongHopDocx = async (data) => {
  const { branchName, thDocNo, thDate, thMonth, thYear, results, nextPlan, secretary, thPeriod, nextPeriodStr } = data;
  
  const children = [
    createHeaderTable(branchName, thDocNo, thYear, thDate, thMonth, "BC"),
    new Paragraph({ text: "" }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "BÁO CÁO", font: "Times New Roman", size: 30, bold: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `KẾT QUẢ HOẠT ĐỘNG CÔNG TÁC ĐOÀN VÀ PHONG TRÀO THANH NIÊN ${thPeriod.toUpperCase()} VÀ PHƯƠNG HƯỚNG ${nextPeriodStr.toUpperCase()}`, font: "Times New Roman", size: 28, bold: true })
      ]
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      children: [
        new TextRun({ text: `Thực hiện Kế hoạch của BCH Đoàn thanh niên Bệnh viện Than - Khoáng sản về công tác đoàn năm ${thYear}. Được sự quan tâm chỉ đạo trực tiếp của Chi bộ, từ tình hình hoạt động chung của toàn đơn vị. BCH ${branchName} báo cáo:`, font: "Times New Roman", size: 28 })
      ]
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: `I. Kết quả hoạt động trong ${thPeriod}`, font: "Times New Roman", size: 28, bold: true })]
    }),
    ...createListParagraphs(results),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: `II. Phương hướng, nhiệm vụ ${nextPeriodStr}`, font: "Times New Roman", size: 28, bold: true })]
    }),
    ...createListParagraphs(nextPlan),
    new Paragraph({ text: "" }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      children: [
        new TextRun({ text: `Trên đây là kết quả hoạt động công tác đoàn và phong trào TTN của ${branchName} trong ${thPeriod} và triển khai phương hướng nhiệm vụ trọng tâm trong ${nextPeriodStr}.`, font: "Times New Roman", size: 28 })
      ]
    }),
    new Paragraph({ text: "" }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [] }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TM. BAN CHẤP HÀNH", font: "Times New Roman", size: 28, bold: true })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bí thư", font: "Times New Roman", size: 28, bold: true })] }),
                new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Đặng Phong Thái", font: "Times New Roman", size: 28, bold: true })] }),
              ]
            })
          ]
        })
      ]
    })
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  return await Packer.toBlob(doc);
};

export const exportDocxBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
