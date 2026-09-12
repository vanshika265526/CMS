import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Generate a comprehensive PDF report for the currently viewed attendance list.
 */
export const generateAttendancePDF = (studentsData: any[], filters: any) => {
  const doc = new jsPDF();

  // Institution Header
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // slate-900
  doc.text("NgCMS Institutional Report", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Official Attendance & Compliance Ledger", 14, 30);
  
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
  doc.text(`Applied Filters - Batch: ${filters.batchId || 'All'} | Subject: ${filters.subjectId || 'All'}`, 14, 40);

  // Table Body
  const tableColumn = ["#", "Student ID", "Name", "Total", "Present", "Absent/Leave", "Att %"];
  const tableRows: any[] = [];

  studentsData.forEach((student, index) => {
    const studentData = [
      index + 1,
      student.studentId || student.uniqueStudentId || "N/A",
      student.personalInfo?.name || "Unknown",
      student.totalClasses || 0,
      student.present || 0,
      (student.absent || 0) + (student.leave || 0),
      `${(student.percentage || 0).toFixed(1)}%`
    ];
    tableRows.push(studentData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`NgCMS_Attendance_Report_${Date.now()}.pdf`);
};

/**
 * Generate a 4-sheet Excel File (Subject-wise, Student-wise, Summary)
 * Note: Some sheets are approximations based on the provided aggregate Student data.
 */
export const generateAttendanceExcel = (studentsData: any[], globalOverview: any) => {
  const wb = XLSX.utils.book_new();

  // 1. Student-wise Sheet
  const studentSheetData = studentsData.map(s => ({
    "Student ID": s.studentId || s.uniqueStudentId,
    "Full Name": s.personalInfo?.name,
    "Roll Number": s.academicInfo?.rollNumber || "N/A",
    "Total Scheduled": s.totalClasses || 0,
    "Total Present": s.present || 0,
    "Total Absent": s.absent || 0,
    "Total Leave": s.leave || 0,
    "Attendance %": (s.percentage || 0).toFixed(2) + "%"
  }));
  const wsStudent = XLSX.utils.json_to_sheet(studentSheetData);
  XLSX.utils.book_append_sheet(wb, wsStudent, "Student-Wise");

  // 2. Shortages (Under 75%)
  const shortagesData = studentSheetData.filter(s => parseFloat(s["Attendance %"]) < 75);
  const wsShortages = XLSX.utils.json_to_sheet(shortagesData);
  XLSX.utils.book_append_sheet(wb, wsShortages, "Shortage List (<75%)");

  // 3. Summary Statistics
  const summaryData = [
    { Metric: "Total Processed Matrix Records", Value: globalOverview?.totalRecords || 0 },
    { Metric: "Institutional Average Present", Value: globalOverview?.stats?.presentPercentage + "%" || "N/A" },
    { Metric: "Institutional Average Absent", Value: globalOverview?.stats?.absentPercentage + "%" || "N/A" },
    { Metric: "Total Critical Shortages (<75%)", Value: shortagesData.length },
    { Metric: "Report Generation Date", Value: new Date().toLocaleDateString() }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  
  // Auto-size columns for Summary
  wsSummary["!cols"] = [{ wch: 40 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Institutional Summary");

  // 4. Daily Logs (Placeholder sheet as true Daily requires a massive separate API call)
  const wsDaily = XLSX.utils.json_to_sheet([{ "Note": "Daily breakdown requires specifying a specific day from the timeline view." }]);
  XLSX.utils.book_append_sheet(wb, wsDaily, "Daily Logs");

  // Trigger Download
  XLSX.writeFile(wb, `NgCMS_Compliance_Matrix_${Date.now()}.xlsx`);
};
