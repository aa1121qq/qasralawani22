import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

// ألوان للرسم البياني
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ffb86c", "#5aa9fa", "#fa5a7d", "#16a085"];

function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [visits, setVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLatestReport();
  }, []);

  async function fetchLatestReport() {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length) {
      const report = data[0];
      setData(report.report_data.rows || []);
      setSummary(report.report_data.summary || {});
      setVisits(report.visits || 0);
    }
    setLoading(false);
  }

  // رفع ملف جديد (CSV أو Excel)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          processAndUploadReport(results.data, file.name);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
        processAndUploadReport(jsonData, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("الرجاء رفع ملف CSV أو Excel فقط!");
    }
  };

  // معالجة ورفع التقرير
  async function processAndUploadReport(rows, fileName) {
    setUploading(true);

    let totalSales = 0;
    const orderSources = { "اندرويد": 0, "ايفون": 0, "ويب": 0 };
    const paymentMethods = {};
    const regionOrders = {};

    rows.forEach(row => {
      let total = parseFloat(row["Grand Total (Base)"] || "0");
      if (!isNaN(total)) totalSales += total;

      let type = (row["Order Type"] || "").toLowerCase();
      if (type.includes("android")) orderSources["اندرويد"] += 1;
      else if (type.includes("ios")) orderSources["ايفون"] += 1;
      else orderSources["ويب"] += 1;

      let pay = (row["Payment Method"] || "").toLowerCase();
      let payLabel = "غير معروف";
      if (pay.includes("madfu")) payLabel = "مدفوع";
      else if (pay.includes("credit") || pay.includes("debit") || pay.includes("apple")) payLabel = "بطاقة ائتمانية";
      else if (pay.includes("tamara")) payLabel = "تمارا";
      else if (pay.includes("tabby")) payLabel = "تابي";
      else if (pay) payLabel = row["Payment Method"];
      paymentMethods[payLabel] = (paymentMethods[payLabel] || 0) + 1;

      let region = (row["Region"] || row[" Region"] || "").trim();
      if (region) regionOrders[region] = (regionOrders[region] || 0) + 1;
    });

    const reportSummary = {
      totalSales,
      orderSources,
      paymentMethods,
      regionOrders,
    };

    // رفع البيانات لسوبابيز
    const { error } = await supabase.from("order_reports").insert([
      {
        report_data: { rows, summary: reportSummary },
        visits,
        report_file_name: fileName,
      },
    ]);
    setUploading(false);
    if (error) {
      alert("حدث خطأ أثناء رفع التقرير: " + error.message);
    } else {
      fetchLatestReport();
      alert("تم رفع التقرير بنجاح!");
    }
  }

  // البيانات البيانية
  const orderSourceData = Object.entries(summary.orderSources || {}).map(([name, value]) => ({ name, value }));
  const paymentData = Object.entries(summary.paymentMethods || {}).map(([name, value]) => ({ name, value }));
  const topRegions = Object.entries(summary.regionOrders || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, orders]) => ({ name, orders }));

  // رسم مخصص للنسبة المئوية داخل الدائرة
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#111" fontWeight="bold" fontSize={24} textAnchor="middle" dominantBaseline="middle">
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div style={{ fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl", background: "#fafafa", minHeight: "100vh", padding: "32px" }}>
      <h1 style={{ textAlign: "center", marginBottom: 24 }}>لوحة تقارير الطلبات</h1>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, gap: 12 }}>
        <label>
          <span>عدد الزيارات:</span>
          <input
            type="number"
            min={0}
            value={visits}
            onChange={e => setVisits(Number(e.target.value))}
            style={{ margin: "0 8px", padding: "6px 16px", fontSize: 16, width: 110, borderRadius: 8, border: "1px solid #ddd" }}
          />
        </label>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ marginRight: 16 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <div style={{ background: "white", boxShadow: "0 2px 8px #eee", borderRadius: 20, padding: "18px 32px", fontSize: 30, color: "#16a085", fontWeight: "bold", margin: "0 8px" }}>
          إجمالي المبيعات
          <div style={{ fontSize: 40 }}>{(summary.totalSales || 0).toLocaleString()} ريال</div>
        </div>
      </div>

      {/* الرسومات البيانية */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 30, justifyContent: "center", marginBottom: 40 }}>
        {/* مصدر الطلبات */}
        <div style={{ background: "white", borderRadius: 20, boxShadow: "0 2px 8px #eee", padding: 24 }}>
          <h3 style={{ textAlign: "center" }}>مصدر الطلبات</h3>
          <PieChart width={270} height={230}>
            <Pie
              data={orderSourceData}
              cx="50%"
              cy="50%"
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {orderSourceData.map((entry, index) => (
                <Cell key={`cell-source-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
        {/* طريقة الدفع */}
        <div style={{ background: "white", borderRadius: 20, boxShadow: "0 2px 8px #eee", padding: 24 }}>
          <h3 style={{ textAlign: "center" }}>طريقة الدفع</h3>
          <PieChart width={270} height={230}>
            <Pie
              data={paymentData}
              cx="50%"
              cy="50%"
              outerRadius={90}
              fill="#ffc658"
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {paymentData.map((entry, index) => (
                <Cell key={`cell-pay-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      {/* جدول المدن الأكثر طلبًا */}
      <div style={{
        background: "white", boxShadow: "0 2px 8px #eee", borderRadius: 20, padding: 24,
        maxWidth: 400, margin: "40px auto"
      }}>
        <h3 style={{ textAlign: "center" }}>أكثر 5 مدن طلبًا</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: 18 }}>
          <thead>
            <tr style={{ background: "#f1f1f1" }}>
              <th style={{ padding: 8 }}>الترتيب</th>
              <th style={{ padding: 8 }}>المدينة</th>
              <th style={{ padding: 8 }}>عدد الطلبات</th>
            </tr>
          </thead>
          <tbody>
            {topRegions.map((city, idx) => (
              <tr key={city.name} style={{ borderBottom: "1px solid #f1f1f1" }}>
                <td>{idx + 1}</td>
                <td>{city.name}</td>
                <td>{city.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* تحميل وانتظار */}
      {(loading || uploading) && <div style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
      }}>
        <div style={{ fontSize: 28, color: "#049790" }}>جاري التحميل...</div>
      </div>}
    </div>
  );
}

export default App;
